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

Para verlo en local basta con abrir `index.html`, o servir la carpeta con cualquier servidor
estático.

## Ojo al tocar este repo

Es el **repo de usuario**: sirve la raíz del dominio y es donde vive el `CNAME`.

- No borres ni edites el `CNAME`: sin él se cae el dominio completo, con los cuatro proyectos dentro.
- No crees carpetas llamadas `Moss`, `Moss-Nexus`, `Moss-Taste` ni `mi-portafolio`: esas rutas las
  sirven sus propios repos.
- El `404.html` de aquí atiende cualquier ruta equivocada de todo el dominio, no solo de esta página.

## Licencia

MIT. Ver [LICENSE](LICENSE).
