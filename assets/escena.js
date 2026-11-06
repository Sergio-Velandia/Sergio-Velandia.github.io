/* Hub · capa de espectáculo.
   Es lo único que activa el modo capítulos, y se carga en el <head> para hacerlo antes del primer
   pintado. Si este archivo no llega o tiene un error, la clase nunca se pone y la capa base queda
   intacta. Si falla después de arrancar, se desmonta y la página vuelve a la base.

   El scroll solo mueve números entre 0 y 1: el procesador no toca ninguna partícula al desplazarse.
   Un solo requestAnimationFrame, y el scroll se lee en un escuchador, nunca dentro del bucle. */
(function () {
  "use strict";

  var raiz = document.documentElement;
  var reducido = matchMedia("(prefers-reduced-motion: reduce)");
  var conAltura = matchMedia("(min-height: 35rem)"); /* la misma condición que hub.css */
  var ancho = matchMedia("(min-width: 62rem)");

  /* Con movimiento reducido no se crea el contexto WebGL ni se descarga three.js. */
  if (reducido.matches || !conAltura.matches) return;

  raiz.classList.add("con-escena");

  var THREE_CDN = [
    "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js",
    "https://unpkg.com/three@0.159.0/build/three.min.js"
  ];
  var THREE_SRI = "sha384-Lwojr+0fOVR25P8bdL6E0T2dv0q0ZT4Yy2Ia1dGOz6b5jLSzWZkdqlw0cKTQYKzT";
  var ESPERA_MAXIMA = 8000;

  var DISTANCIA = 10;
  var FOV = 40;
  var SEGUIDOR = 0.075; /* el peso de la cámara: 7,5 % por cuadro a 60 Hz */
  var MILISEGUNDOS_LETRA = 1800;
  var GIRO = 3.1;
  var COLOR = [0.788, 0.663, 0.431]; /* --accent */

  var el = {};
  var montada = true; /* hasta que se desmonte por un fallo o por movimiento reducido */
  var activa = false; /* el modo capítulos cabe en la ventana actual */
  var escena = null;
  var rafId = 0;
  var maxScroll = 1;
  var objetivo = 0;
  var actual = 0;
  var cursorX = 0;
  var cursorY = 0;
  var camaraX = 0;
  var camaraY = 0;
  var ultimoT = 0;
  var hayQueDibujar = true;
  var escritos = {};
  var temporizador = 0;
  var cargaPedida = false;

  function limitar(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function tramo(x, a, b) {
    return limitar((x - a) / (b - a));
  }
  function suave(x) {
    return x * x * (3 - 2 * x);
  }
  /* Generador con semilla: las constelaciones salen iguales en cada visita. */
  function azar(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Capas de texto ---------- */

  function escribir(nodo, clave, opacidad, desplazamiento) {
    var valor = opacidad.toFixed(3);
    if (escritos[clave] === valor) return;
    escritos[clave] = valor;
    nodo.style.opacity = valor;
    nodo.style.pointerEvents = opacidad > 0.5 ? "auto" : "none";
    if (desplazamiento) nodo.style.transform = "translateY(" + ((1 - opacidad) * desplazamiento).toFixed(1) + "px)";
  }

  function aplicarCapas(p) {
    escribir(el.nombre, "n", 1 - tramo(p, 0.08, 0.22), -14);
    escribir(el.quien, "q", tramo(p, 0.26, 0.38) * (1 - tramo(p, 0.54, 0.66)), 14);
    var tres = tramo(p, 0.7, 0.84);
    escribir(el.destinos, "d", tres, 0); /* sin desplazamiento: las constelaciones salen de su rectángulo */
    escribir(el.pie, "p", tres, 0);
  }

  function limpiarCapas() {
    [el.nombre, el.quien, el.destinos, el.pie].forEach(function (n) {
      n.style.opacity = "";
      n.style.transform = "";
      n.style.pointerEvents = "";
    });
    escritos = {};
  }

  /* ---------- Scroll, cursor y teclado ---------- */

  function medirScroll() {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  }

  function alDesplazar() {
    objetivo = limitar(window.scrollY / maxScroll);
  }

  function alMoverCursor(e) {
    cursorX = (e.clientX / innerWidth - 0.5) * 2;
    cursorY = (e.clientY / innerHeight - 0.5) * 2;
  }

  function irA(fraccion) {
    window.scrollTo({ top: fraccion * maxScroll, behavior: "instant" });
    objetivo = fraccion;
  }

  /* Cualquier enlace se alcanza con tabulador desde cualquier punto: el foco trae su capítulo. */
  function alEnfocar(e) {
    if (!activa || !e.target.closest) return;
    if (e.target.closest(".destinos, .pie")) {
      if (objetivo < 0.9) irA(1);
    } else if (e.target.closest(".seguir")) {
      if (objetivo > 0.08) irA(0);
    }
  }

  function alSaltar(e) {
    if (!activa) return;
    e.preventDefault();
    irA(1);
    var primero = el.destinos.querySelector("a");
    if (primero) primero.focus({ preventScroll: true });
  }

  /* ---------- Escena ---------- */

  function muestrearLetra() {
    var w = 1024;
    var h = 512;
    var lienzo = document.createElement("canvas");
    lienzo.width = w;
    lienzo.height = h;
    var c = lienzo.getContext("2d", { willReadFrequently: true });
    c.font = '800 320px "Syne", "Arial Black", sans-serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText("SV", w / 2, h / 2);
    var datos = c.getImageData(0, 0, w, h).data;
    var xs = [];
    var ys = [];
    var minX = w;
    var maxX = 0;
    var minY = h;
    var maxY = 0;
    for (var y = 0; y < h; y += 2) {
      for (var x = 0; x < w; x += 2) {
        if (datos[(y * w + x) * 4 + 3] > 128) {
          xs.push(x);
          ys.push(y);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!xs.length) throw new Error("La letra no produjo puntos");
    return {
      xs: xs,
      ys: ys,
      anchoPx: maxX - minX,
      centroX: (minX + maxX) / 2,
      centroY: (minY + maxY) / 2,
      aspecto: (maxY - minY) / (maxX - minX)
    };
  }

  function crearEscena(THREE) {
    var movil = innerWidth < 768 || matchMedia("(pointer: coarse)").matches;
    var N = movil ? 11000 : 32000;
    var topePixeles = movil ? 1.3 : 1.5;

    /* failIfMajorPerformanceCaveat: si el navegador pintaría por software, esto lanza un error
       y la página se queda en la capa base. */
    var renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: true
    });
    renderer.setClearColor(0x0a0a09, 1);
    var pixeles = Math.min(window.devicePixelRatio || 1, topePixeles);
    renderer.setPixelRatio(pixeles);

    var lienzo = renderer.domElement;
    lienzo.className = "escena";
    lienzo.setAttribute("aria-hidden", "true");
    lienzo.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      desmontar(true);
    });
    document.body.insertBefore(lienzo, document.body.firstChild);

    var camara = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    camara.position.z = DISTANCIA;

    var letra = muestrearLetra();
    var rnd = azar(20261106);
    var pos = new Float32Array(N * 3);
    var disperso = new Float32Array(N * 3);
    var esfera = new Float32Array(N * 3);
    var grupo = new Float32Array(N * 3);
    var semilla = new Float32Array(N);

    for (var i = 0; i < N; i++) {
      var j = Math.floor(rnd() * letra.xs.length);
      pos[i * 3] = (letra.xs[j] + (rnd() - 0.5) * 2 - letra.centroX) / letra.anchoPx;
      pos[i * 3 + 1] = -(letra.ys[j] + (rnd() - 0.5) * 2 - letra.centroY) / letra.anchoPx;
      pos[i * 3 + 2] = (rnd() - 0.5) * 0.09; /* grosor en Z: al girar no se ve como calcomanía */

      disperso[i * 3] = (rnd() - 0.5) * 20;
      disperso[i * 3 + 1] = (rnd() - 0.5) * 12;
      disperso[i * 3 + 2] = -6 + rnd() * 9;

      /* Fibonacci: con ángulos al azar los puntos se amontonan en los polos. */
      var k = i + 0.5;
      var fi = Math.acos(1 - (2 * k) / N);
      var te = Math.PI * (1 + Math.sqrt(5)) * k;
      esfera[i * 3] = Math.sin(fi) * Math.cos(te);
      esfera[i * 3 + 1] = Math.cos(fi);
      esfera[i * 3 + 2] = Math.sin(fi) * Math.sin(te);

      semilla[i] = rnd();
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aDisperso", new THREE.BufferAttribute(disperso, 3));
    geo.setAttribute("aEsfera", new THREE.BufferAttribute(esfera, 3));
    geo.setAttribute("aGrupo", new THREE.BufferAttribute(grupo, 3));
    geo.setAttribute("aSemilla", new THREE.BufferAttribute(semilla, 1));

    var u = {
      uLetra: { value: 0 },
      uEsfera: { value: 0 },
      uGrupo: { value: 0 },
      uGiro: { value: 0 },
      uEscL: { value: 1 },
      uEscE: { value: 1 },
      uCentroL: { value: new THREE.Vector3() },
      uCentroE: { value: new THREE.Vector3() },
      uTam: { value: movil ? 2.1 : 2.7 },
      uPR: { value: pixeles },
      uColor: { value: new THREE.Vector3(COLOR[0], COLOR[1], COLOR[2]) }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: u,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: [
        "attribute vec3 aDisperso;",
        "attribute vec3 aEsfera;",
        "attribute vec3 aGrupo;",
        "attribute float aSemilla;",
        "uniform float uLetra, uEsfera, uGrupo, uGiro, uEscL, uEscE, uTam, uPR;",
        "uniform vec3 uCentroL, uCentroE;",
        "varying float vAlfa;",
        "void main() {",
        "  vec3 p = mix(aDisperso, position * uEscL, uLetra);",
        "  p = mix(p, aEsfera * uEscE, uEsfera);",
        /* El giro va antes del último mix: las constelaciones aterrizan sin rotar sobre su enlace. */
        "  float c = cos(uGiro); float s = sin(uGiro);",
        "  p = vec3(c * p.x + s * p.z, p.y, c * p.z - s * p.x);",
        "  p += mix(uCentroL * uLetra, uCentroE, uEsfera);",
        "  p = mix(p, aGrupo, uGrupo);",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = uTam * uPR * (10.0 / -mv.z) * (0.7 + aSemilla * 0.6);",
        "  vAlfa = mix(0.16, 0.62, uLetra) * mix(1.0, 0.85, uGrupo) * (0.55 + aSemilla * 0.45);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 uColor;",
        "varying float vAlfa;",
        "void main() {",
        "  float a = smoothstep(0.5, 0.06, length(gl_PointCoord - 0.5)) * vAlfa;",
        "  if (a < 0.01) discard;",
        "  gl_FragColor = vec4(uColor, a);",
        "}"
      ].join("\n")
    });

    var puntos = new THREE.Points(geo, material);
    puntos.frustumCulled = false;
    var mundo = new THREE.Scene();
    mundo.add(puntos);

    /* Reparto entre los cuatro destinos: el portafolio, que es el principal, se lleva más. */
    var reparto = [];
    for (var r = 0; r < N; r++) {
      var v = rnd();
      reparto.push(v < 0.34 ? 0 : v < 0.56 ? 1 : v < 0.78 ? 2 : 3);
    }
    var anclas = [0, 1, 2, 3].map(function (fila) {
      var a = azar(4000 + fila * 97);
      var lista = [];
      for (var n = 0; n < 11; n++) lista.push([0.04 + a() * 0.92, 0.1 + a() * 0.8, 0.5 + a() * 0.9]);
      return lista;
    });

    /* Los destinos salen del rectángulo real de cada enlace, convertido a coordenadas de mundo.
       Los puntos esquivan los rectángulos del texto: así el contraste no depende de la escena.
       Solo se ejecuta al montar y al redimensionar, nunca al desplazarse. */
    function medirDestinos(alto, ancho_, porPx) {
      var filas = [].slice.call(el.destinos.querySelectorAll("li"));
      var rango = document.createRange();
      var cajas = filas.map(function (fila) {
        var textos = [];
        [].forEach.call(fila.querySelectorAll(".capa:not(.capa--oro) > span"), function (span) {
          rango.selectNodeContents(span);
          [].forEach.call(rango.getClientRects(), function (q) {
            textos.push([q.left - 8, q.top - 6, q.right + 8, q.bottom + 6]);
          });
        });
        return { r: fila.getBoundingClientRect(), textos: textos };
      });
      var gen = azar(777);

      function sobreTexto(x, y, textos) {
        for (var t = 0; t < textos.length; t++) {
          var q = textos[t];
          if (x > q[0] && x < q[2] && y > q[1] && y < q[3]) return true;
        }
        return false;
      }

      for (var i = 0; i < N; i++) {
        var f = reparto[i];
        var caja = cajas[f] || cajas[0];
        var w = caja.r.width;
        var h = caja.r.height;
        var x = 0;
        var y = 0;
        var libre = false;
        for (var intento = 0; intento < 12 && !libre; intento++) {
          var a = anclas[f][Math.floor(gen() * 11)];
          var g1 = gen() + gen() + gen() - 1.5;
          var g2 = gen() + gen() + gen() - 1.5;
          x = caja.r.left + (a[0] + g1 * 0.04 * a[2]) * w;
          y = caja.r.top + (a[1] + g2 * 0.24 * a[2]) * h;
          libre = y > caja.r.top && y < caja.r.bottom && !sobreTexto(x, y, caja.textos);
        }
        if (!libre) {
          /* Sin hueco: al margen derecho de la fila, que nunca lleva texto encima del todo. */
          x = caja.r.right - gen() * 10;
          y = caja.r.top + gen() * h;
        }
        grupo[i * 3] = (x - ancho_ / 2) * porPx;
        grupo[i * 3 + 1] = (alto / 2 - y) * porPx;
        grupo[i * 3 + 2] = (gen() - 0.5) * 0.2;
      }
      geo.attributes.aGrupo.needsUpdate = true;
    }

    function ajustar() {
      var W = innerWidth;
      var H = lienzo.clientHeight || innerHeight;
      renderer.setSize(W, H, false);
      camara.aspect = W / H;
      camara.updateProjectionMatrix();

      var porPx = (2 * Math.tan((FOV * Math.PI) / 360) * DISTANCIA) / H;
      var libre = el.nombre.getBoundingClientRect().top;
      var anchoLetra = Math.min(W * (ancho.matches ? 0.56 : 0.84), (libre * 0.72) / letra.aspecto);
      u.uEscL.value = anchoLetra * porPx;
      u.uCentroL.value.set(0, (H / 2 - libre * 0.5) * porPx, 0);

      if (ancho.matches) {
        u.uEscE.value = Math.min(W * 0.22, H * 0.36) * porPx;
        u.uCentroE.value.set(W * 0.22 * porPx, 0, 0);
      } else {
        var tope = el.quien.getBoundingClientRect().top;
        u.uEscE.value = Math.min(W * 0.42, tope * 0.42) * porPx;
        u.uCentroE.value.set(0, (H / 2 - tope * 0.5) * porPx, 0);
      }
      medirDestinos(H, W, porPx);
    }

    /* Calidad: se baja tras dos ventanas seguidas por debajo de 25 cuadros por segundo.
       No se vuelve a subir: oscilar se nota más que el problema. */
    var acumulado = 0;
    var cuadros = 0;
    var lentas = 0;
    var visibles = N;
    raiz.dataset.calidad = pixeles + "/" + visibles;

    function medirCalidad(dt) {
      if (dt > 250) return;
      acumulado += dt;
      if (++cuadros < 30) return;
      lentas = acumulado / cuadros > 40 ? lentas + 1 : 0;
      acumulado = 0;
      cuadros = 0;
      if (lentas < 2) return;
      lentas = 0;
      if (pixeles > 1) {
        pixeles = Math.max(1, pixeles - 0.25);
        renderer.setPixelRatio(pixeles);
        u.uPR.value = pixeles;
        ajustar();
      } else if (visibles > 6000) {
        /* Los puntos están barajados: mostrar menos no deja huecos en la forma. */
        visibles = Math.max(6000, Math.floor(visibles * 0.7));
        geo.setDrawRange(0, visibles);
      }
      raiz.dataset.calidad = pixeles + "/" + visibles;
    }

    return {
      ajustar: ajustar,
      medirCalidad: medirCalidad,
      dibujar: function (p, letraT, cx, cy) {
        u.uLetra.value = suave(letraT);
        u.uEsfera.value = suave(tramo(p, 0.18, 0.44));
        /* Aterrizan justo cuando los enlaces quedan visibles (0,84): ningún punto en vuelo bajo el texto. */
        u.uGrupo.value = suave(tramo(p, 0.62, 0.84));
        u.uGiro.value = p * GIRO; /* el giro es el scroll: nada gira por su cuenta */
        var libre = 1 - u.uGrupo.value;
        camara.position.x = cx * 0.22 * libre;
        camara.position.y = -cy * 0.14 * libre;
        camara.lookAt(0, 0, 0);
        renderer.render(mundo, camara);
      },
      destruir: function () {
        geo.dispose();
        material.dispose();
        renderer.dispose();
        if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo);
      }
    };
  }

  /* ---------- El único bucle ---------- */

  var inicioLetra = 0;

  function cuadro(t) {
    rafId = 0;
    if (!montada) return;
    try {
      var dt = ultimoT ? t - ultimoT : 16.7;
      ultimoT = t;
      var k = 1 - Math.pow(1 - SEGUIDOR, Math.min(dt, 100) / 16.67);

      if (activa) aplicarCapas(objetivo);

      if (escena && activa) {
        var antes = actual;
        var antesX = camaraX;
        var antesY = camaraY;
        actual += (objetivo - actual) * k;
        camaraX += (cursorX - camaraX) * k;
        camaraY += (cursorY - camaraY) * k;
        var letraT = limitar((t - inicioLetra) / MILISEGUNDOS_LETRA);
        /* En reposo no se dibuja: la escena solo cambia si algo la mueve. */
        var cambio =
          hayQueDibujar ||
          letraT < 1 ||
          Math.abs(actual - antes) > 0.00002 ||
          Math.abs(camaraX - antesX) > 0.0002 ||
          Math.abs(camaraY - antesY) > 0.0002;
        if (cambio) {
          escena.dibujar(actual, letraT, camaraX, camaraY);
          escena.medirCalidad(dt);
          hayQueDibujar = false;
        }
      }
    } catch (error) {
      desmontar(true);
      return;
    }
    rafId = requestAnimationFrame(cuadro);
  }

  function arrancarBucle() {
    if (!rafId && montada && !document.hidden) {
      ultimoT = 0;
      rafId = requestAnimationFrame(cuadro);
    }
  }

  function alCambiarVisibilidad() {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      arrancarBucle();
    }
  }

  /* ---------- Montaje ---------- */

  /* El modo capítulos solo se mantiene si todo cabe en una pantalla; si no, capa base. */
  function evaluar() {
    if (!montada) return;
    raiz.classList.add("con-escena");
    var pieAlto = el.pie.offsetHeight;
    raiz.style.setProperty("--alto-pie", pieAlto + "px");
    var lista = el.destinos.querySelector("ul");
    var cabe =
      conAltura.matches &&
      lista.scrollHeight <= lista.clientHeight + 1 &&
      el.nombre.offsetHeight < innerHeight * 0.72 &&
      el.quien.lastElementChild.getBoundingClientRect().bottom - el.quien.firstElementChild.getBoundingClientRect().top < innerHeight * 0.72;
    if (!cabe) raiz.classList.remove("con-escena");
    if (activa && !cabe) limpiarCapas();
    activa = cabe;
    if (activa) {
      medirScroll();
      alDesplazar();
      if (escena) {
        escena.ajustar();
        hayQueDibujar = true;
      }
      if (!cargaPedida && el.listo) {
        cargaPedida = true;
        cargarThree(0);
      }
    }
  }

  function alRedimensionar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(evaluar, 150);
  }

  function desmontar(avisar) {
    if (!montada) return;
    montada = false;
    activa = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    raiz.classList.remove("con-escena");
    raiz.style.removeProperty("--alto-pie");
    if (el.nombre) limpiarCapas();
    if (escena) {
      try {
        escena.destruir();
      } catch (e) {
        /* la página sigue en pie aunque limpiar falle */
      }
      escena = null;
    }
    if (avisar && el.aviso) el.aviso.hidden = false;
  }

  function montarEscena() {
    if (!montada) return;
    try {
      escena = crearEscena(window.THREE);
      if (activa) escena.ajustar();
      inicioLetra = performance.now();
      actual = objetivo;
      hayQueDibujar = true;
    } catch (error) {
      desmontar(true);
    }
  }

  function cargarThree(indice) {
    if (!montada) return;
    if (indice >= THREE_CDN.length) {
      desmontar(true);
      return;
    }
    var limite = setTimeout(function () {
      desmontar(true);
    }, ESPERA_MAXIMA);
    var script = document.createElement("script");
    script.src = THREE_CDN[indice];
    script.integrity = THREE_SRI;
    script.crossOrigin = "anonymous";
    script.onload = function () {
      clearTimeout(limite);
      /* La letra se dibuja con Syne: se espera la fuente, sin colgarse si no llega. */
      var fuente = document.fonts && document.fonts.load ? document.fonts.load('800 320px "Syne"') : Promise.resolve();
      fuente.then(montarEscena, montarEscena);
    };
    script.onerror = function () {
      clearTimeout(limite);
      cargarThree(indice + 1);
    };
    document.head.appendChild(script);
  }

  function iniciar() {
    el.nombre = document.querySelector(".nombre");
    el.quien = document.querySelector(".quien");
    el.destinos = document.querySelector(".destinos");
    el.pie = document.querySelector(".pie");
    el.aviso = document.querySelector(".aviso");
    if (!el.nombre || !el.quien || !el.destinos || !el.pie) {
      raiz.classList.remove("con-escena");
      montada = false;
      return;
    }
    try {
      evaluar();
      addEventListener("scroll", alDesplazar, { passive: true });
      addEventListener("resize", alRedimensionar, { passive: true });
      if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", alMoverCursor, { passive: true });
      document.addEventListener("focusin", alEnfocar);
      document.addEventListener("visibilitychange", alCambiarVisibilidad);
      var saltar = document.querySelector(".seguir a");
      if (saltar) saltar.addEventListener("click", alSaltar);
      /* Si la persona activa la preferencia con la página abierta, se apaga sin avisar. */
      reducido.addEventListener("change", function () {
        if (reducido.matches) desmontar(false);
      });
      if (activa && location.hash === "#destinos") irA(1);
      if (activa) aplicarCapas(objetivo);
      arrancarBucle();
      el.listo = true;
      evaluar();
    } catch (error) {
      desmontar(true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
