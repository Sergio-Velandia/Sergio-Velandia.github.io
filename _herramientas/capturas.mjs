// Vistas previas del hub: una captura de escritorio de cada sitio, en WebP y a dos tamaños.
//
//   npm --prefix _herramientas install     (la primera vez)
//   npm --prefix _herramientas run capturas
//
// Usa el Chrome o el Edge instalados en el equipo (playwright-core no descarga navegadores).
// Se captura con movimiento reducido: así las pantallas de entrada de los sitios no salen en la foto.
import { chromium } from "playwright-core"
import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const SITIOS = [
  { slug: "moss-nexus", url: "https://sergio-velandia.dev/Moss-Nexus/" },
  { slug: "moss", url: "https://sergio-velandia.dev/Moss/" },
  { slug: "moss-taste", url: "https://sergio-velandia.dev/Moss-Taste/" },
  { slug: "portafolio", url: "https://sergio-velandia.dev/mi-portafolio/" },
]
const ANCHOS = [640, 1280]
const destino = new URL("../assets/previews/", import.meta.url)

async function abrirNavegador() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true })
    } catch {
      // probar el siguiente
    }
  }
  throw new Error("No encontré Chrome ni Edge instalados.")
}

await mkdir(destino, { recursive: true })
const navegador = await abrirNavegador()
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "es-CO" })

for (const sitio of SITIOS) {
  const pagina = await contexto.newPage()
  const respuesta = await pagina.goto(sitio.url, { waitUntil: "networkidle" })
  if (!respuesta || respuesta.status() !== 200) throw new Error(`${sitio.url} respondió ${respuesta?.status()}`)
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.waitForTimeout(3500)
  const png = await pagina.screenshot({ type: "png" })
  for (const ancho of ANCHOS) {
    const archivo = new URL(`${sitio.slug}-${ancho}.webp`, destino)
    const info = await sharp(png).resize({ width: ancho }).webp({ quality: 78, effort: 6 }).toFile(fileURLToPath(archivo))
    console.log(`${sitio.slug}-${ancho}.webp`.padEnd(24), `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`)
  }
  await pagina.close()
}
await navegador.close()
