# sergio-velandia.github.io

Página de recepción de **[sergio-velandia.dev](https://sergio-velandia.dev)**. Dice quién soy y
reparte hacia mis cuatro proyectos. No tiene backend, ni cuentas, ni formulario.

## A dónde lleva

| | |
|---|---|
| [Portafolio](https://sergio-velandia.dev/mi-portafolio/) | Quién soy y qué he construido |
| [Moss](https://sergio-velandia.dev/Moss/) | Componentes, bitácora y rutas de aprendizaje |
| [Moss Nexus](https://sergio-velandia.dev/Moss-Nexus/) | Flujos de n8n listos para copiar |
| [Moss Taste](https://sergio-velandia.dev/Moss-Taste/) | Recetario con cálculo de porciones y costo |

## Cómo está hecho

HTML y CSS planos, sin build ni framework. La escena 3D usa three.js desde CDN y es una capa
opcional: si no carga, si el navegador no tiene WebGL o si hay `prefers-reduced-motion`, la página
funciona igual y se lee entera.

Para verlo en local hay que servir la carpeta con cualquier servidor estático, por ejemplo
`npx serve`. Abierto directamente, `index.html` no carga el CSS ni las fuentes, porque usa rutas
absolutas.

## Ojo al tocar este repo

Es el **repo de usuario**: sirve la raíz del dominio y es donde vive el `CNAME`.

- No borres ni edites el `CNAME`: sin él se cae el dominio completo, con los cuatro proyectos dentro.
- No crees carpetas llamadas `Moss`, `Moss-Nexus`, `Moss-Taste` ni `mi-portafolio`: esas rutas las
  sirven sus propios repos.
- El `404.html` de aquí atiende las rutas equivocadas de la raíz. Dentro de `/mi-portafolio/`, `/Moss/`,
  `/Moss-Nexus/` y `/Moss-Taste/` responde el 404 de cada proyecto.

## Notas técnicas

- `robots.txt` se amplía, no se reescribe: declara los sitemaps de todos los sitios.
- `404.html` usa rutas absolutas porque se sirve desde cualquier profundidad.
- Todo lo que esté en este repo se publica: los documentos de trabajo no van aquí.

### Tokens

Oro y grafito, los del portafolio; el hub no inventa color propio. Viven en `assets/hub.css`.

| Token | Valor | Uso | Contraste sobre su fondo |
|---|---|---|---|
| `--bg-base` | `#0a0a09` | Fondo, y texto sobre oro | 8,85:1 sobre oro |
| `--text-primary` | `#f5f2ec` | Texto principal | 17,73:1 |
| `--text-secondary` | `#a8a49a` | Texto de apoyo | 7,96:1 |
| `--accent` | `#c9a96e` | Portafolio y barrido | 8,85:1 |

Fuentes autoalojadas: Syne 800 y DM Sans 400/500, ambas con licencia SIL OFL (`assets/fonts/`).

### Movimiento

Un solo gesto: al pasar el cursor o enfocar, una copia en oro de la fila se revela con `clip-path`
(280 ms al entrar, 170 ms al salir). Con `prefers-reduced-motion` pasa a un fundido de 150 ms.

### Escena 3D

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

## Licencia

MIT para el código. Los textos, las imágenes y la marca personal no están cubiertos, y las fuentes de
`assets/fonts/` tienen su propia licencia SIL OFL. Ver [LICENSE](LICENSE).
