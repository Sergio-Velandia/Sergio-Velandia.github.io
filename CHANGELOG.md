# Changelog

Todos los cambios visibles del hub se registran aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [Sin publicar]

## [0.3.0] - 2026-11-19

Rediseño: el hub es un flujo de n8n que se ejecuta con el scroll.

### Añadido
- **El flujo `hola-soy-sergio`**: un disparador, **Moss Nexus** como nodo principal con la etiqueta «MI FUERTE», un Switch hacia Moss, Moss Taste y el portafolio, un Merge y «Hablemos». Un paquete con estela recorre las aristas y cada nodo se enciende con su check al recibirlo.
- **Panel de salida** de cada nodo, al estilo de n8n: título, texto, JSON con versión y estado, y una vista previa del sitio. Nexus muestra sus cifras: 13 plantillas, 9 probadas en n8n, versión 1.2.0.
- Barra de estado del editor: «Ejecutando… n/8 nodos» y, al final, «✓ Ejecución exitosa · 8 nodos, 0 errores».
- La cámara del lienzo sigue al nodo que se ejecuta y, al final, muestra el flujo completo en escritorio.
- Cada paso se detiene en su panel, y Nexus tiene la pausa más larga. Al soltar el scroll, se ajusta al paso más cercano.
- Anillo de «ejecutándose» que avanza con el scroll, y rótulos «1 item» o «3 items» en cada arista ejecutada, con cuentas que cuadran con los paneles.
- Los nodos son enlaces a su paso. Con el teclado, el grafo es una sola parada y se recorre con las flechas, Inicio y Fin.
- El paso queda en la URL (`#moss-nexus`, `#moss`…) y un enlace con ese ancla abre directamente el paso.
- Botón «▶ Ejecutar flujo», que recorre el flujo solo y se detiene si tocas algo, y botón para copiar el correo.
- En celular, el grafo es vertical y se lee a tamaño real. En pantallas bajas, la vista previa cede su sitio a un botón.
- Herramientas que se corren a mano, en `_herramientas/`: `capturas` vuelve a tomar las vistas previas, `datos` compara cada cifra con su fuente y `grafo` reescribe los SVG del flujo.

### Cambiado
- Titular y descripción de la página: «Sergio Velandia · Automatización con n8n».
- El movimiento usa GSAP 3.15.1 y ScrollTrigger, alojados en el repo y sin CDN.
- `assets/hub.css` queda solo para los 404 (el de la raíz y el del portafolio).

### Eliminado
- La escena 3D con three.js (`assets/escena.js`) y su carga desde CDN.

### Se conserva
- La tarjeta para compartir (Open Graph y Twitter), el `CNAME`, el `robots.txt`, el `sitemap.xml`, el 404 propio y las rutas de los cuatro proyectos.

## [0.2.0] - 2026-11-06

### Añadido
- Escena 3D dirigida por scroll con three.js: los puntos forman SV, se deshacen en una esfera que gira y se rompen en cuatro constelaciones, una detrás de cada enlace.

## [0.1.0] - 2026-11-06

### Añadido
- Portada en HTML y CSS, sin JavaScript, que reemplaza la redirección de la raíz al portafolio.
- Página 404 propia con salida al inicio y a los cuatro proyectos.
- Tarjeta para compartir, favicon, `sitemap.xml` y el sitemap del hub en `robots.txt`.

[Sin publicar]: https://github.com/Sergio-Velandia/Sergio-Velandia.github.io/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Sergio-Velandia/Sergio-Velandia.github.io/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Sergio-Velandia/Sergio-Velandia.github.io/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Sergio-Velandia/Sergio-Velandia.github.io/releases/tag/v0.1.0
