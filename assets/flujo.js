/* Hub · el flujo de n8n que se ejecuta con el scroll.
   Mejora progresiva: el HTML ya trae el flujo ejecutado y todos los paneles. Este archivo solo
   actúa si el <head> puso .flujo-activo (hay movimiento permitido y altura suficiente) y GSAP cargó.
   Un solo bucle: el ticker de GSAP. Las medidas de geometría se toman al montar y al redimensionar,
   nunca dentro del bucle. */
(function () {
  "use strict";

  var raiz = document.documentElement;
  window.__flujo = true;

  /* ---------- Copiar el correo: funciona con o sin escena ---------- */
  var avisoCopia = document.querySelector(".aviso-copia");
  [].forEach.call(document.querySelectorAll("[data-copiar]"), function (boton) {
    boton.hidden = false;
    boton.addEventListener("click", function () {
      var correo = boton.getAttribute("data-copiar");
      var listo = function (ok) {
        if (avisoCopia) avisoCopia.textContent = ok ? "Correo copiado: " + correo : "Copia este correo: " + correo;
        boton.textContent = ok ? "✓ Copiado" : correo;
        setTimeout(function () { boton.textContent = "Copiar correo"; }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(correo).then(function () { listo(true); }, function () { listo(false); });
      else listo(false);
    });
  });

  if (!raiz.classList.contains("flujo-activo")) return;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  if (!gsap || !ST) { raiz.classList.remove("flujo-activo"); return; }

  /* ---------- Guion ---------- */

  // Cada paso k (1…5) ejecuta sus etapas en serie; dentro de una etapa, las aristas van en paralelo.
  var PASOS = [null, [["t>nx"]], [["nx>sw"], ["sw>mo"]], [["sw>ta"]], [["sw>pf"]], [["mo>mg", "ta>mg", "pf>mg"], ["mg>em"]]];
  var ULTIMO = 5;
  var IDS_PASO = ["hola", "moss-nexus", "moss", "moss-taste", "portafolio", "hablemos"];
  var NODOS_PASO = { hola: 0, "moss-nexus": 1, moss: 2, "moss-taste": 3, portafolio: 4, hablemos: 5 };
  // Progreso del scroll (u) → progreso del flujo (p). Las mesetas son las pausas en cada panel;
  // Nexus tiene la más larga.
  var CURVA = [[0, 0], [0.04, 0], [0.12, 1], [0.3, 1], [0.4, 2], [0.5, 2], [0.58, 3], [0.66, 3], [0.74, 4], [0.82, 4], [0.92, 5], [1, 5]];
  var PAUSAS = [0, 0.21, 0.45, 0.62, 0.78, 0.96]; // centro de cada meseta: ahí se ajusta el snap
  // Por dónde va la cámara: el nodo que se está ejecutando.
  var FOCOS = [[0, "t"], [1, "nx"], [1.5, "sw"], [2, "mo"], [3, "ta"], [4, "pf"], [4.5, "mg"], [5, "em"]];

  function limitar(x, a, b) { return x < a ? a : x > b ? b : x; }
  function suave(x) { x = limitar(x, 0, 1); return x * x * (3 - 2 * x); }
  function mezcla(a, b, t) { return a + (b - a) * t; }
  function curva(u) {
    for (var i = 1; i < CURVA.length; i++) {
      if (u <= CURVA[i][0]) return mezcla(CURVA[i - 1][1], CURVA[i][1], suave((u - CURVA[i - 1][0]) / (CURVA[i][0] - CURVA[i - 1][0])));
    }
    return ULTIMO;
  }

  /* ---------- Modelo de cada grafo (se mide una vez) ---------- */

  var NS = "http://www.w3.org/2000/svg";
  var MUESTRAS = 48;

  function crearModelo(svg) {
    var m = { svg: svg, ancho: +svg.dataset.ancho, alto: +svg.dataset.alto, nodos: {}, orden: [], aristas: {}, paquetes: [], vertical: svg.classList.contains("grafo--vertical"), cache: {} };
    [].forEach.call(svg.querySelectorAll(".nodo"), function (a) {
      var n = { el: a, id: a.dataset.id, at: +a.dataset.at, cx: +a.dataset.cx, cy: +a.dataset.cy, corre: a.querySelector(".corre"), entra: [] };
      m.nodos[n.id] = n;
      m.orden.push(n);
    });
    [].forEach.call(svg.querySelectorAll(".arista-on"), function (ruta) {
      var clave = ruta.dataset.arista;
      // Cada arista es una sola curva Bézier: sus puntos salen de la fórmula, sin medir el DOM.
      // El trazo usa pathLength="1", así que tampoco hace falta su largo.
      m.aristas[clave] = { ruta: ruta, puntos: muestrearCurva(ruta.getAttribute("d")), items: svg.querySelector('.items[data-arista="' + clave + '"]') };
      m.nodos[clave.split(">")[1]].entra.push(clave);
    });
    var capa = svg.querySelector(".paquetes");
    for (var k = 0; k < 3; k++) {
      var g = document.createElementNS(NS, "g");
      g.setAttribute("opacity", "0");
      var estela = [0.18, 0.32, 0.5, 0.7].map(function (o, i) {
        var c = document.createElementNS(NS, "circle");
        c.setAttribute("r", String(3 + i * 0.6));
        c.setAttribute("class", "paquete");
        c.setAttribute("opacity", String(o));
        g.appendChild(c);
        return c;
      });
      var cabeza = document.createElementNS(NS, "circle");
      cabeza.setAttribute("r", "7");
      cabeza.setAttribute("class", "paquete");
      cabeza.style.filter = "drop-shadow(0 0 8px #e6c78f)";
      g.appendChild(cabeza);
      capa.appendChild(g);
      m.paquetes.push({ g: g, estela: estela, cabeza: cabeza, visible: false });
    }
    return m;
  }

  // Puntos repartidos por igual a lo largo de la curva (no por igual en t), para que el paquete
  // avance a velocidad pareja.
  function muestrearCurva(d) {
    var n = (d.match(/-?[0-9.]+/g) || []).map(Number);
    if (n.length !== 8) throw new Error("Arista con forma inesperada: " + d);
    var bez = function (t, a, b, c, e) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * e; };
    var FINO = 96, xs = [], ys = [], acum = [0];
    for (var i = 0; i <= FINO; i++) {
      var t = i / FINO;
      xs.push(bez(t, n[0], n[2], n[4], n[6]));
      ys.push(bez(t, n[1], n[3], n[5], n[7]));
      if (i) acum.push(acum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    }
    var total = acum[FINO], puntos = new Float32Array((MUESTRAS + 1) * 2), j = 0;
    for (var k = 0; k <= MUESTRAS; k++) {
      var objetivo = (total * k) / MUESTRAS;
      while (j < FINO - 1 && acum[j + 1] < objetivo) j++;
      var r = (objetivo - acum[j]) / Math.max(1e-6, acum[j + 1] - acum[j]);
      puntos[k * 2] = mezcla(xs[j], xs[j + 1], limitar(r, 0, 1));
      puntos[k * 2 + 1] = mezcla(ys[j], ys[j + 1], limitar(r, 0, 1));
    }
    return puntos;
  }

  function punto(arista, t) {
    var f = limitar(t, 0, 1) * MUESTRAS;
    var i = Math.min(MUESTRAS - 1, Math.floor(f));
    var r = f - i, p = arista.puntos;
    return [mezcla(p[i * 2], p[i * 2 + 2], r), mezcla(p[i * 2 + 1], p[i * 2 + 3], r)];
  }

  /* ---------- Dibujar un estado p (0…5) ---------- */

  function avanceArista(p) {
    var g = {};
    for (var k = 1; k <= ULTIMO; k++) {
      var f = limitar(p - (k - 1), 0, 1);
      var etapas = PASOS[k];
      for (var j = 0; j < etapas.length; j++) {
        var v = limitar(f * etapas.length - j, 0, 1);
        for (var e = 0; e < etapas[j].length; e++) g[etapas[j][e]] = v;
      }
    }
    return g;
  }

  function poner(m, clave, valor, escribir) {
    if (m.cache[clave] === valor) return;
    m.cache[clave] = valor;
    escribir(valor);
  }

  function dibujar(m, p, foco) {
    var g = avanceArista(p);
    var usados = 0;
    Object.keys(m.aristas).forEach(function (clave) {
      var a = m.aristas[clave], v = g[clave];
      poner(m, "d:" + clave, Math.round((1 - v) * 1000) / 1000, function (x) { a.ruta.style.strokeDashoffset = x; });
      poner(m, "i:" + clave, v >= 0.999, function (on) { if (a.items) a.items.classList.toggle("on", on); });
      if (v > 0.01 && v < 0.99 && usados < m.paquetes.length) {
        var pk = m.paquetes[usados++];
        var c = punto(a, v);
        pk.cabeza.setAttribute("cx", c[0].toFixed(1));
        pk.cabeza.setAttribute("cy", c[1].toFixed(1));
        for (var i = 0; i < pk.estela.length; i++) {
          var q = punto(a, v - (4 - i) * 0.035);
          pk.estela[i].setAttribute("cx", q[0].toFixed(1));
          pk.estela[i].setAttribute("cy", q[1].toFixed(1));
        }
        if (!pk.visible) { pk.g.setAttribute("opacity", "1"); pk.visible = true; }
      }
    });
    for (var u = usados; u < m.paquetes.length; u++) {
      if (m.paquetes[u].visible) { m.paquetes[u].g.setAttribute("opacity", "0"); m.paquetes[u].visible = false; }
    }

    var encendidos = 0;
    m.orden.forEach(function (n) {
      var on = p >= n.at - 0.001;
      if (on) encendidos++;
      poner(m, "on:" + n.id, on, function (x) { n.el.classList.toggle("on", x); });
      poner(m, "ahora:" + n.id, n.id === foco, function (x) { n.el.classList.toggle("ahora", x); });
      // «Ejecutándose»: el anillo da dos vueltas mientras le llegan los datos. Avanza con el scroll,
      // así que si el scroll se detiene, el anillo también.
      var llega = 0;
      n.entra.forEach(function (clave) { var v = g[clave]; if (v > 0.02 && v < 0.999) llega = Math.max(llega, v); });
      poner(m, "corre:" + n.id, llega ? Math.round(llega * 400) / 400 : 0, function (x) {
        n.corre.style.opacity = x ? "1" : "0";
        if (x) n.corre.style.strokeDashoffset = String(-x * 200);
      });
    });
    return encendidos;
  }

  /* ---------- Cámara: sigue al nodo que se ejecuta ---------- */

  function centroFoco(m, p) {
    for (var i = 1; i < FOCOS.length; i++) {
      if (p <= FOCOS[i][0]) {
        var a = m.nodos[FOCOS[i - 1][1]], b = m.nodos[FOCOS[i][1]];
        var t = suave((p - FOCOS[i - 1][0]) / (FOCOS[i][0] - FOCOS[i - 1][0]));
        return [mezcla(a.cx, b.cx, t), mezcla(a.cy, b.cy, t)];
      }
    }
    var ul = m.nodos.em;
    return [ul.cx, ul.cy];
  }

  function camaraObjetivo(m, p, idFoco, aspecto) {
    var c, ancho;
    if (idFoco && m.nodos[idFoco]) {
      c = [m.nodos[idFoco].cx, m.nodos[idFoco].cy];
      ancho = m.vertical ? 430 : 700;
    } else if (m.vertical) {
      c = centroFoco(m, p);
      // Al final, Merge y Hablemos con sus etiquetas completas.
      if (p > 4.5) c[1] = mezcla(c[1], m.nodos.em.cy - 55, suave((p - 4.5) / 0.5));
      ancho = 430;
    } else {
      c = centroFoco(m, p);
      var completo = Math.max(m.ancho + 60, (m.alto + 60) / aspecto);
      ancho = p < 0.6 ? mezcla(900, 680, suave(p / 0.6)) : 680;
      if (p > 4.5) {
        var s = suave((p - 4.5) / 0.5);
        ancho = mezcla(680, completo, s);
        c = [mezcla(c[0], m.ancho / 2, s), mezcla(c[1], m.alto / 2, s)];
      }
    }
    var alto = ancho * aspecto;
    var x = c[0] - ancho / 2, y = c[1] - alto / 2;
    // En celular, el final siempre muestra completa la etiqueta de «Hablemos», aunque la vista sea baja.
    if (m.vertical && !idFocoTeclado && p > 4.5) y = mezcla(y, Math.max(y, m.nodos.em.cy + 84 - alto), suave((p - 4.5) / 0.5));
    // Dentro del mundo cuando cabe; centrado cuando la vista es más grande que el grafo.
    x = ancho >= m.ancho ? (m.ancho - ancho) / 2 : limitar(x, -30, m.ancho - ancho + 30);
    y = alto >= m.alto ? (m.alto - alto) / 2 : limitar(y, -30, m.alto - alto + 50);
    return [x, y, ancho, alto];
  }

  /* ---------- Arranque ---------- */

  var modelos, activo, st, estado, progreso, paneles, nodosTeclado;
  var p = 0, pasoActual = -1, encendidosPrevio = -1, idFocoTeclado = null;
  var camara = null, aspecto = 0.6, tamanoLienzo = [1, 1];
  var reproduccion = null;
  var estrecho = matchMedia("(max-width: 56.24rem)");
  var reducido = matchMedia("(prefers-reduced-motion: reduce)");

  function modeloActivo() { return estrecho.matches ? modelos.vertical : modelos.horizontal; }

  function medirLienzo() {
    var lienzo = document.querySelector(".lienzo");
    var r = lienzo.getBoundingClientRect();
    tamanoLienzo = [Math.max(1, r.width), Math.max(1, r.height)];
    aspecto = tamanoLienzo[1] / tamanoLienzo[0];
  }

  function focoActual(q) {
    var id = "t";
    for (var i = 0; i < FOCOS.length; i++) if (q >= FOCOS[i][0] - 0.5) id = FOCOS[i][1];
    return id;
  }

  function actualizarEstado(n) {
    if (n === encendidosPrevio) return;
    encendidosPrevio = n;
    if (n >= 8) estado.innerHTML = "<b>✓ Ejecución exitosa · 8 nodos, 0 errores</b>";
    else estado.textContent = n > 1 ? "Ejecutando… " + n + "/8 nodos" : "Esperando ejecución";
  }

  function cambiarPaso(k) {
    if (k === pasoActual) return;
    var primero = pasoActual === -1;
    pasoActual = k;
    paneles.forEach(function (panel, i) { panel.classList.toggle("activo", i === k); });
    if (!primero) {
      gsap.fromTo(paneles[k].querySelectorAll(".cuerpo > *"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", overwrite: true });
      var id = IDS_PASO[k];
      try { history.replaceState(null, "", k === 0 ? location.pathname + location.search : "#" + id); } catch (e) { /* sin historial, sin problema */ }
    }
    // El nodo del paso activo es la entrada al grafo con el tabulador.
    var idNodo = { 0: "t", 1: "nx", 2: "mo", 3: "ta", 4: "pf", 5: "em" }[k];
    if (!idFocoTeclado) asignarTabulador(idNodo);
  }

  function asignarTabulador(id) {
    var m = modeloActivo();
    m.orden.forEach(function (n) { n.el.setAttribute("tabindex", n.id === id ? "0" : "-1"); });
  }

  function cuadro() {
    var m = modeloActivo();
    var foco = focoActual(p);
    var n = dibujar(m, p, foco);
    actualizarEstado(n);
    cambiarPaso(Math.min(ULTIMO, Math.round(p)));

    var objetivo = camaraObjetivo(m, p, idFocoTeclado, aspecto);
    if (!camara) camara = objetivo.slice();
    var mover = false;
    for (var i = 0; i < 4; i++) {
      var d = objetivo[i] - camara[i];
      if (Math.abs(d) > 0.05) { camara[i] += d * 0.12; mover = true; }
      else camara[i] = objetivo[i];
    }
    poner(m, "vb", camara.map(function (v) { return v.toFixed(1); }).join(" "), function (vb) { m.svg.setAttribute("viewBox", vb); });
    return mover;
  }

  function posicionPaso(k) { return st.start + (st.end - st.start) * PAUSAS[k]; }

  function irA(y, duracion) {
    detenerReproduccion();
    var proxy = { y: window.scrollY };
    reproduccion = gsap.to(proxy, {
      y: y, duration: duracion, ease: duracion > 3 ? "none" : "power2.inOut",
      onUpdate: function () { window.scrollTo(0, proxy.y); },
      onComplete: function () { reproduccion = null; },
    });
  }

  function detenerReproduccion() { if (reproduccion) { reproduccion.kill(); reproduccion = null; } }

  function volverABase() {
    detenerReproduccion();
    if (st) { st.kill(true); st = null; }
    gsap.ticker.remove(tick);
    raiz.classList.remove("flujo-activo", "listo");
    paneles.forEach(function (panel) { panel.classList.remove("activo"); gsap.set(panel.querySelectorAll(".cuerpo > *"), { clearProps: "all" }); });
    ["horizontal", "vertical"].forEach(function (clave) {
      var m = modelos[clave];
      m.cache = {};
      dibujar(m, ULTIMO, null);
      m.orden.forEach(function (n) { n.el.classList.remove("ahora"); n.el.removeAttribute("tabindex"); });
      m.paquetes.forEach(function (pk) { pk.g.setAttribute("opacity", "0"); });
      m.svg.setAttribute("viewBox", "0 0 " + m.ancho + " " + m.alto);
    });
    estado.innerHTML = "<b>✓ Ejecución exitosa · 8 nodos, 0 errores</b>";
    gsap.set(progreso, { clearProps: "all" });
  }

  // En reposo no se dibuja: solo cuando cambia el scroll, el foco o mientras la cámara llega.
  var sucio = true, camaraMoviendo = true;
  function tick() {
    if (!sucio && !camaraMoviendo) return;
    sucio = false;
    camaraMoviendo = cuadro();
  }

  function iniciar() {
    gsap.registerPlugin(ST);
    estado = document.getElementById("estado");
    progreso = document.querySelector(".progreso");
    paneles = [].slice.call(document.querySelectorAll(".paso"));
    modelos = {
      horizontal: crearModelo(document.querySelector(".grafo--horizontal")),
      vertical: crearModelo(document.querySelector(".grafo--vertical")),
    };
    medirLienzo();

    // La escena se fija con position: sticky (CSS). ScrollTrigger solo lee el progreso y hace el
    // snap: no envuelve ni mueve nada en el DOM.
    st = ST.create({
      trigger: "#flujo",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      snap: { snapTo: PAUSAS, duration: { min: 0.2, max: 0.6 }, delay: 0.15, ease: "power1.inOut" },
      onUpdate: function (self) {
        p = curva(self.progress);
        progreso.style.transform = "scaleX(" + self.progress.toFixed(4) + ")";
        sucio = true;
      },
      onRefresh: function () { medirLienzo(); camara = null; sucio = true; },
    });

    // Cambio entre geometría horizontal y vertical: se vuelve a dibujar todo en el grafo visible.
    estrecho.addEventListener("change", function () {
      modelos.horizontal.cache = {};
      modelos.vertical.cache = {};
      camara = null;
      encendidosPrevio = -1;
      asignarTabulador({ 0: "t", 1: "nx", 2: "mo", 3: "ta", 4: "pf", 5: "em" }[pasoActual] || "t");
      sucio = true;
    });
    reducido.addEventListener("change", function () { if (reducido.matches) volverABase(); });
    addEventListener("resize", function () { if (innerHeight < 560 && st) volverABase(); }, { passive: true });

    // Clic o Enter en un nodo: lleva a su paso.
    ["horizontal", "vertical"].forEach(function (clave) {
      var m = modelos[clave];
      m.svg.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest(".nodo");
        if (!a || !st) return;
        e.preventDefault();
        var k = NODOS_PASO[a.getAttribute("href").slice(1)];
        irA(posicionPaso(k), 0.9);
      });
      // Flechas entre nodos: el grafo es una sola parada del tabulador.
      m.svg.addEventListener("keydown", function (e) {
        var a = e.target.closest && e.target.closest(".nodo");
        if (!a) return;
        var i = m.orden.indexOf(m.nodos[a.dataset.id]), j = i;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") j = Math.min(m.orden.length - 1, i + 1);
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = Math.max(0, i - 1);
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = m.orden.length - 1;
        else return;
        e.preventDefault();
        asignarTabulador(m.orden[j].id);
        m.orden[j].el.focus();
      });
      m.svg.addEventListener("focusin", function (e) {
        var a = e.target.closest && e.target.closest(".nodo");
        idFocoTeclado = a ? a.dataset.id : null;
        sucio = true;
      });
      m.svg.addEventListener("focusout", function () { idFocoTeclado = null; sucio = true; });
    });

    // ▶ Ejecutar flujo: recorre el scroll de verdad hasta el final. Se detiene si la persona toca algo.
    var ejecutar = document.getElementById("ejecutar");
    ejecutar.hidden = false;
    ejecutar.addEventListener("click", function () {
      var fin = posicionPaso(ULTIMO);
      var restante = Math.max(0, fin - window.scrollY) / Math.max(1, st.end - st.start);
      if (restante < 0.02) { window.scrollTo(0, posicionPaso(0)); restante = 1; }
      irA(fin, Math.max(2, 9 * restante));
    });
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (tipo) {
      addEventListener(tipo, function (e) { if (e.target !== ejecutar) detenerReproduccion(); }, { passive: true });
    });

    // Un enlace con #paso abre directamente ese paso.
    var hash = location.hash.slice(1);
    if (hash in NODOS_PASO && NODOS_PASO[hash] > 0) window.scrollTo(0, posicionPaso(NODOS_PASO[hash]));

    gsap.ticker.add(tick);
    tick();
    raiz.classList.add("listo");
  }

  try {
    iniciar();
  } catch (error) {
    raiz.classList.remove("flujo-activo", "listo");
    if (window.console) console.error(error);
  }
})();
