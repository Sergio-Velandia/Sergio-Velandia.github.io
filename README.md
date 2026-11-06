# Sergio-Velandia.github.io

Página de recepción de [sergio-velandia.dev](https://sergio-velandia.dev/): quién soy y cuatro enlaces
a los proyectos. HTML y CSS planos, sin build ni framework, porque esta página está delante de las
otras cuatro y tiene que ser la más difícil de romper del dominio.

## Lo que no se puede romper

- **No tocar `CNAME`.** Sin él se cae el dominio entero, con los cuatro proyectos dentro.
- **Ninguna carpeta llamada** `Moss`, `Moss-Nexus`, `Moss-Taste` ni `mi-portafolio`: esas rutas las
  sirve GitHub Pages desde sus propios repos.
- **`robots.txt` se amplía, no se reescribe:** declara los sitemaps de todos los sitios.
- **Rutas absolutas en `404.html`:** se sirve desde cualquier profundidad.
- **Todo lo que esté en este repo se publica.** Los documentos de trabajo no van aquí.

## Tokens

Oro y grafito, los del portafolio; el hub no inventa color propio. Viven en `assets/hub.css`.

| Token | Valor | Uso | Contraste sobre su fondo |
|---|---|---|---|
| `--bg-base` | `#0a0a09` | Fondo, y texto sobre oro | 8,85:1 sobre oro |
| `--text-primary` | `#f5f2ec` | Texto principal | 17,73:1 |
| `--text-secondary` | `#a8a49a` | Texto de apoyo | 7,96:1 |
| `--accent` | `#c9a96e` | Portafolio y barrido | 8,85:1 |

Fuentes autoalojadas: Syne 800 y DM Sans 400/500, ambas con licencia SIL OFL (`assets/fonts/`).

## Movimiento

Un solo gesto: al pasar el cursor o enfocar, una copia en oro de la fila se revela con `clip-path`
(280 ms al entrar, 170 ms al salir). Con `prefers-reduced-motion` pasa a un fundido de 150 ms.

## Escena 3D

`assets/escena.js` es lo único que activa los capítulos dirigidos por scroll. Se carga en el `<head>`
para hacerlo antes del primer pintado. Sin esa clase, la página es la capa base de arriba.

| Situación | Qué se ve |
|---|---|
| Sin JavaScript, `escena.js` caído o con error | Capa base |
| `prefers-reduced-motion` | Capa base, sin contexto WebGL ni descarga de three.js |
| Ventana baja o contenido que no cabe en una pantalla | Capa base, sin descargar three.js |
| three.js no carga, no pasa el SRI o tarda más de 8 s | Capa base con un aviso discreto |
| Sin GPU (pintado por software) o contexto WebGL perdido | Capa base con un aviso discreto |

three.js va fijado en `0.159.0`, el último con un archivo único para `<script>`, con integridad SRI;
si jsDelivr falla se intenta unpkg. Para actualizarlo hay que recalcular el hash en `escena.js`.

El guion está en fracciones de scroll: la esfera entre 0,18 y 0,44, las constelaciones entre 0,62 y
0,84. El giro se aplica en el sombreador antes del último `mix`, para que las constelaciones
aterricen sin rotar sobre su enlace, y esquivan los rectángulos del texto para no afectar el contraste.
