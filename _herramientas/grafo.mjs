// Escribe los dos SVG del flujo (horizontal para escritorio, vertical para celular) dentro de index.html.
//
//   npm --prefix _herramientas run grafo
//
// No es un paso de build: el resultado queda escrito en index.html y la página se publica tal cual.
// Se corre solo al cambiar la forma del grafo. Los SVG salen ya "ejecutados" (todos los nodos con su
// check y todas las aristas encendidas): así se ven sin JavaScript y con movimiento reducido.
import { readFile, writeFile } from "node:fs/promises"

const INDEX = new URL("../index.html", import.meta.url)

// Las cifras que aparecen en los nodos llevan data-dato: `npm run datos` las compara con su fuente.
const NODOS = [
  { id: "t", etiqueta: "Cuando llegas", sub: "Webhook", icono: "rayo", at: 0, paso: "hola", aria: "Cuando llegas, el disparador del flujo. Ver su salida" },
  { id: "nx", etiqueta: "Moss Nexus", sub: "13 plantillas", dato: "nexus.plantillas", subFmt: (v) => `${v} plantillas`, icono: "n8n", at: 1, paso: "moss-nexus", estrella: true, aria: "Moss Nexus, mi fuerte. Ver su salida" },
  { id: "sw", etiqueta: "Switch", sub: "3 rutas", icono: "reparte", at: 1.5, paso: "moss", aria: "Switch: reparte hacia Moss, Moss Taste y el portafolio. Ir a la primera ruta" },
  { id: "mo", etiqueta: "Moss", sub: "v1.20.0", dato: "moss.version", subFmt: (v) => `v${v}`, icono: "hoja", at: 2, paso: "moss", aria: "Moss. Ver su salida" },
  { id: "ta", etiqueta: "Moss Taste", sub: "v1.1.1", dato: "taste.version", subFmt: (v) => `v${v}`, icono: "olla", at: 3, paso: "moss-taste", aria: "Moss Taste. Ver su salida" },
  { id: "pf", etiqueta: "Portafolio", sub: "v1.2.3", dato: "portafolio.version", subFmt: (v) => `v${v}`, icono: "sv", at: 4, paso: "portafolio", aria: "Portafolio. Ver su salida" },
  { id: "mg", etiqueta: "Merge", sub: "Une 3 ramas", icono: "une", at: 4.5, paso: "hablemos", aria: "Merge: une las tres ramas. Ir al final del flujo" },
  { id: "em", etiqueta: "Hablemos", sub: "Correo", icono: "sobre", at: 5, paso: "hablemos", aria: "Hablemos, el contacto. Ver su salida" },
]

// Aristas con los ítems que lleva cada una, como los muestra n8n después de ejecutar.
// Las cuentas cuadran con los paneles: Nexus saca 3 ítems (los tres destinos), el Switch manda
// uno a cada rama y el Merge vuelve a juntar 3.
const ARISTAS = [
  ["t", "nx", 1], ["nx", "sw", 3], ["sw", "mo", 1], ["sw", "ta", 1], ["sw", "pf", 1],
  ["mo", "mg", 1], ["ta", "mg", 1], ["pf", "mg", 1], ["mg", "em", 3],
]

const TAM = { normal: [104, 72], estrella: [176, 108] }

const GEOMETRIAS = {
  horizontal: {
    ancho: 1200, alto: 450,
    pos: { t: [80, 215], nx: [300, 215], sw: [525, 215], mo: [735, 80], ta: [735, 215], pf: [735, 350], mg: [940, 215], em: [1120, 215] },
  },
  vertical: {
    ancho: 400, alto: 1110,
    pos: { t: [200, 60], nx: [200, 250], sw: [200, 440], mo: [70, 660], ta: [200, 660], pf: [330, 660], mg: [200, 850], em: [200, 1010] },
  },
}

const r = (n) => Math.round(n * 10) / 10

function arista(geo, de, a, vertical) {
  const [x1c, y1c] = geo.pos[de], [x2c, y2c] = geo.pos[a]
  const A = NODOS.find((n) => n.id === de), Bn = NODOS.find((n) => n.id === a)
  const [wa, ha] = A.estrella ? TAM.estrella : TAM.normal
  const [wb, hb] = Bn.estrella ? TAM.estrella : TAM.normal
  if (!vertical) {
    const x1 = x1c + wa / 2, y1 = y1c, x2 = x2c - wb / 2, y2 = y2c, mx = (x1 + x2) / 2
    return { d: `M${r(x1)},${r(y1)} C${r(mx)},${r(y1)} ${r(mx)},${r(y2)} ${r(x2)},${r(y2)}`, medio: [(x1 + x2) / 2, (y1 + y2) / 2 - 12], ancla: "middle" }
  }
  // En vertical las etiquetas van bajo cada nodo: la arista sale por debajo de ellas.
  const x1 = x1c, y1 = y1c + ha / 2 + 52, x2 = x2c, y2 = y2c - hb / 2 - (Bn.estrella ? 18 : 6), my = (y1 + y2) / 2
  return { d: `M${r(x1)},${r(y1)} C${r(x1)},${r(my)} ${r(x2)},${r(my)} ${r(x2)},${r(y2)}`, medio: [(x1 + x2) / 2 + 8, my + 4], ancla: "start" }
}

function nodo(n, geo, prefijo) {
  const [w, h] = n.estrella ? TAM.estrella : TAM.normal
  const [cx, cy] = geo.pos[n.id]
  const x0 = r(cx - w / 2), y0 = r(cy - h / 2)
  const tamIcono = n.estrella ? 40 : 30
  let icono
  if (n.icono === "n8n") icono = `<text class="icono-texto icono-texto--grande" x="${w / 2}" y="${h / 2 + 9}" text-anchor="middle">n8n</text>`
  else if (n.icono === "sv") icono = `<text class="icono-texto" x="${w / 2}" y="${h / 2 + 7}" text-anchor="middle">SV</text>`
  else icono = `<use class="icono" href="#i-${n.icono}" x="${(w - tamIcono) / 2}" y="${(h - tamIcono) / 2}" width="${tamIcono}" height="${tamIcono}"/>`
  const sub = n.dato
    ? `<text class="sub" x="${w / 2}" y="${h + 44}" text-anchor="middle" data-dato="${n.dato}" data-formato="${n.subFmt("{v}")}">${n.sub}</text>`
    : `<text class="sub" x="${w / 2}" y="${h + 44}" text-anchor="middle">${n.sub}</text>`
  const etiquetaEstrella = n.estrella
    ? `<rect class="cinta" x="${w / 2 - 44}" y="-13" width="88" height="24" rx="12"/><text class="cinta-texto" x="${w / 2}" y="3.5" text-anchor="middle">MI FUERTE</text>`
    : ""
  return `<a class="nodo on${n.estrella ? " nodo--estrella" : ""}" href="#${n.paso}" data-id="${n.id}" data-at="${n.at}" data-cx="${cx}" data-cy="${cy}" data-w="${w}" data-h="${h}" aria-label="${n.aria}" id="${prefijo}-${n.id}">
        <g transform="translate(${x0},${y0})">
          <rect class="caja" width="${w}" height="${h}" rx="14"/>
          <rect class="corre" width="${w}" height="${h}" rx="14" pathLength="100"/>
          <rect class="foco" x="-7" y="-7" width="${w + 14}" height="${h + 14}" rx="19"/>
          ${icono}
          <text class="etiqueta" x="${w / 2}" y="${h + 24}" text-anchor="middle">${n.etiqueta}</text>
          ${sub}
          ${etiquetaEstrella}
          <g class="check" transform="translate(${w - 4},${n.estrella ? 16 : -4})"><circle r="11"/><path d="M-4.5,0 L-1.2,3.4 L4.6,-3.4"/></g>
        </g>
      </a>`
}

function svg(nombre) {
  const geo = GEOMETRIAS[nombre], vertical = nombre === "vertical", p = vertical ? "gv" : "gh"
  const aristas = ARISTAS.map(([de, a, items]) => ({ de, a, items, ...arista(geo, de, a, vertical) }))
  const lineas = aristas.map((e) => `<path class="arista" d="${e.d}"/>`).join("\n        ")
  const encendidas = aristas.map((e) => `<path class="arista-on" data-arista="${e.de}>${e.a}" d="${e.d}"/>`).join("\n        ")
  const items = aristas.map((e) => `<text class="items" data-arista="${e.de}>${e.a}" x="${r(e.medio[0])}" y="${r(e.medio[1])}" text-anchor="${e.ancla}">${e.items} ${e.items === 1 ? "item" : "items"}</text>`).join("\n        ")
  return `<svg class="grafo grafo--${nombre}" viewBox="0 0 ${geo.ancho} ${geo.alto}" data-ancho="${geo.ancho}" data-alto="${geo.alto}" role="group" aria-labelledby="${p}-titulo" aria-describedby="${p}-desc">
      <title id="${p}-titulo">Flujo de n8n: hola-soy-sergio</title>
      <desc id="${p}-desc">Un disparador, «Cuando llegas», lleva a Moss Nexus, mi fuerte. Un Switch reparte hacia Moss, Moss Taste y el portafolio; las tres ramas se unen en un Merge y el flujo termina en «Hablemos», el contacto. Cada nodo es un enlace a su panel.</desc>
      <g class="aristas">
        ${lineas}
        ${encendidas}
      </g>
      <g class="rotulos">
        ${items}
      </g>
      <g class="paquetes"></g>
      <g class="nodos">
      ${NODOS.map((n) => nodo(n, geo, p)).join("\n      ")}
      </g>
    </svg>`
}

let html = await readFile(INDEX, "utf8")
for (const nombre of Object.keys(GEOMETRIAS)) {
  const abre = `<!-- grafo:${nombre} -->`, cierra = `<!-- /grafo:${nombre} -->`
  const i = html.indexOf(abre), j = html.indexOf(cierra)
  if (i < 0 || j < 0) throw new Error(`Faltan los marcadores ${abre} … ${cierra} en index.html`)
  html = html.slice(0, i + abre.length) + "\n    " + svg(nombre) + "\n    " + html.slice(j)
}
await writeFile(INDEX, html)
console.log("Grafos escritos en index.html")
