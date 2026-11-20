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

La portada es un flujo de n8n que se ejecuta mientras haces scroll: un disparador, Moss Nexus como
nodo principal, un Switch hacia los otros tres proyectos, un Merge y el contacto. A la derecha, el
panel de salida de cada nodo.

HTML, CSS y JavaScript planos, sin build ni framework. GitHub Pages publica la rama tal cual: un
paso de compilación obligaría a cambiar el origen de Pages a mano y pondría en riesgo la raíz del
dominio, de la que cuelgan los cuatro proyectos. El movimiento usa GSAP y ScrollTrigger, alojados en
el repo. Sin JavaScript o con `prefers-reduced-motion`, la página se lee entera con el flujo ya
ejecutado.

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

- `assets/hub.css` es ahora solo el estilo de los 404: lo cargan el de la raíz y el del portafolio.
  La portada usa `assets/flujo.css`.

### Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Todo el contenido, y los dos SVG del flujo ya ejecutados (horizontal y vertical) |
| `assets/flujo.css` | Capa base apilada y, con `.flujo-activo`, la escena fijada |
| `assets/flujo.js` | El scroll ejecuta el flujo; copiar el correo |
| `assets/vendor/gsap/` | GSAP 3.15.1 y ScrollTrigger |
| `assets/previews/` | Capturas de los cuatro sitios en WebP |
| `_herramientas/` | Scripts que se corren a mano; no forman parte de la página |

### Cuándo se ve qué

Un `<script>` corto en el `<head>` pone `.flujo-activo` antes del primer pintado. Sin esa clase, la
página es la capa base: el flujo ejecutado y los paneles apilados.

| Situación | Qué se ve |
|---|---|
| Sin JavaScript | Capa base |
| `prefers-reduced-motion` | Capa base, y GSAP ni se usa |
| Ventana de menos de 560 px de alto | Capa base |
| GSAP o `flujo.js` no cargan, fallan o tardan más de 5 s | Capa base |

### Herramientas

Se instalan una vez con `npm --prefix _herramientas install` y usan el Chrome o el Edge del equipo.

| Comando | Qué hace |
|---|---|
| `npm --prefix _herramientas run capturas` | Vuelve a tomar las vistas previas de los cuatro sitios |
| `npm --prefix _herramientas run datos` | Compara cada versión, estado y cifra de Nexus con su fuente; falla si alguna no cuadra |
| `npm --prefix _herramientas run grafo` | Reescribe los dos SVG del flujo en `index.html` a partir de `grafo.mjs` |

Las cifras no se actualizan solas: cuando un proyecto publique una versión, `datos` lo señala y se
corrige a mano en `index.html` (y en `grafo.mjs` si la cifra va en un nodo).

### Movimiento

- Cada paso se detiene en su panel, y Nexus tiene la pausa más larga. Al soltar el scroll, se ajusta
  al paso más cercano.
- La cámara del lienzo sigue al nodo que se ejecuta; en celular el grafo es vertical y se lee a
  tamaño real.
- El anillo de «ejecutándose» avanza con el scroll, no con el reloj: si el scroll se detiene, el anillo
  también.
- Los nodos son enlaces a su paso; con el teclado, el grafo es una sola parada y se recorre con las
  flechas.
- En reposo no se dibuja nada.

### Colores

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--fondo` / `--panel` | `#0b0d12` / `#13161e` | Fondo y paneles | — |
| `--texto` | `#f0ede8` | Texto principal | 15,49:1 sobre `--panel` |
| `--texto-2` | `#a3a6af` | Texto de apoyo y nodos pendientes | 7,43:1 sobre `--panel` (6,85:1 dentro de un nodo) |
| `--n8n` | `#ea4b71` | Botón principal y «MI FUERTE» | Texto `#0b0d12` encima: 5,32:1 (blanco daba 3,66:1) |
| `--oro` / `--oro-2` | `#c9a96e` / `#e6c78f` | Aristas ejecutadas y cifras | — |
| `--ok` | `#6fcf97` | Nodos ejecutados | — |

Fuentes autoalojadas: Syne 800 para el titular, DM Sans para el texto y JetBrains Mono para el JSON.

## Licencia

MIT para el código. Los textos, las imágenes y la marca personal no están cubiertos. Las fuentes de
`assets/fonts/` tienen su propia licencia SIL OFL, y GSAP (`assets/vendor/gsap/`) la suya, estándar y
sin costo. Ver [LICENSE](LICENSE).
