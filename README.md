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
