// Comprueba que cada cifra del hub coincide con su fuente. No cambia nada: si algo no cuadra,
// lo dice y termina con error, y el dato se corrige a mano en index.html (y en grafo.mjs si va en un nodo).
//
//   npm --prefix _herramientas run datos
//
// Los elementos con data-dato="clave" son los que se comparan. data-formato indica cómo se escribe
// el valor en la página ({v} es el valor).
import { readFile } from "node:fs/promises"

const RAW = "https://raw.githubusercontent.com/Sergio-Velandia"
const API = "https://api.github.com/repos/Sergio-Velandia"
const texto = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url} → ${r.status}`); return r.text() }
const json = async (url) => JSON.parse(await texto(url))
const primero = (s, re, que) => { const m = s.match(re); if (!m) throw new Error(`No encontré ${que}`); return m[1].trim() }

async function plantillasNexus() {
  const carpetas = (await json(`${API}/Moss-Nexus/contents/src/data/templates?ref=main`)).filter((x) => x.type === "dir")
  let probadas = 0
  for (const c of carpetas) {
    const meta = await json(`${RAW}/Moss-Nexus/main/src/data/templates/${c.name}/meta.json`)
    if (meta.probado) probadas++
  }
  return { plantillas: carpetas.length, probadas }
}

const nexus = await plantillasNexus()
const fuentes = {
  "nexus.plantillas": { valor: nexus.plantillas, de: "Moss-Nexus: carpetas en src/data/templates/" },
  "nexus.probadas": { valor: nexus.probadas, de: "Moss-Nexus: meta.json con el campo «probado»" },
  "nexus.version": { valor: (await json(`${RAW}/Moss-Nexus/main/package.json`)).version, de: "Moss-Nexus: package.json" },
  "moss.version": { valor: (await json(`${RAW}/Moss/main/package.json`)).version, de: "Moss: package.json" },
  "moss.estado": { valor: primero(await texto(`${RAW}/Moss/main/README.md`), /\*\*Estado:\*\*\s*([^·\n]+)/, "el estado en el README de Moss").toLowerCase(), de: "Moss: README («Estado:»)" },
  "taste.version": { valor: (await json(`${RAW}/Moss-Taste/main/package.json`)).version, de: "Moss-Taste: package.json" },
  // El README de Moss Taste no declara estado: la fuente es su ficha en Moss.
  "taste.estado": { valor: primero(await texto(`${RAW}/Moss/main/content/projects/moss-taste.md`), /^status:\s*(.+)$/m, "status en la ficha de Moss Taste"), de: "Moss: content/projects/moss-taste.md (status)" },
  "portafolio.version": { valor: (await json(`${RAW}/mi-portafolio/main/package.json`)).version, de: "mi-portafolio: package.json" },
  "portafolio.estado": { valor: primero(await texto(`${RAW}/mi-portafolio/main/README.md`), /\|\s*\*\*[\d.]+\*\*\s*\|\s*([^|]+)\|/, "la tabla de estado del portafolio").toLowerCase(), de: "mi-portafolio: README (tabla de estado)" },
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8")
const decodificar = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&")
const usos = [...html.matchAll(/data-dato="([^"]+)"(?:[^>]*?data-formato="([^"]*)")?[^>]*>([^<]*)</g)]

let fallos = 0
const filas = []
for (const [, clave, formato, enPagina] of usos) {
  const f = fuentes[clave]
  if (!f) { fallos++; filas.push([clave, "—", "sin fuente definida", enPagina, "✗"]); continue }
  const esperado = decodificar(formato || "{v}").replace("{v}", String(f.valor))
  const ok = enPagina.trim() === esperado
  if (!ok) fallos++
  filas.push([clave, String(f.valor), f.de, enPagina.trim(), ok ? "✓" : `✗ (debería ser ${esperado})`])
}
for (const clave of Object.keys(fuentes)) if (!usos.some((u) => u[1] === clave)) filas.push([clave, String(fuentes[clave].valor), fuentes[clave].de, "(no se usa)", "·"])

const ancho = [20, 12, 48, 20]
for (const fila of filas) console.log(fila.map((c, i) => (i < 4 ? c.padEnd(ancho[i]) : c)).join(" "))
console.log(fallos ? `\n${fallos} dato(s) no cuadran con su fuente.` : `\nLos ${usos.length} datos de la página cuadran con su fuente.`)
process.exit(fallos ? 1 : 0)
