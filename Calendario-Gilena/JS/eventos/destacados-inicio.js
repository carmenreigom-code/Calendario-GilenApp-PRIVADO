/* Selección manual de hasta seis eventos y portada automática. */
(() => {
  const ID_ORDEN = "destacadosInicioGilena";
  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function listaEventos() { try { const datos = JSON.parse(localStorage.getItem("eventos") || "[]"); return Array.isArray(datos) ? datos : []; } catch { return []; } }
  function seleccionar() { return DestacadosGilena.seleccionar(listaEventos()); }

  let limpiarAnterior = () => {};
  function renderizar() {
    limpiarAnterior();
    limpiarAnterior = () => {};
    const root = document.getElementById("destacados");
    const viewport = document.getElementById("destacadosViewport");
    const carrusel = document.getElementById("eventoDestacadoCarrusel");
    const anterior = document.getElementById("destacadoAnterior");
    const siguiente = document.getElementById("destacadoSiguiente");
    if (!root || !viewport || !carrusel || !anterior || !siguiente) return;
    const eventos = seleccionar();
    root.classList.toggle("sin-destacados", !eventos.length);
    viewport.replaceChildren();
    anterior.hidden = siguiente.hidden = eventos.length < 2;
    if (!eventos.length) return;

    let indice = 0, temporizador = 0, gesto = null, ignorarClickHasta = 0;
    let ratonDentro = window.matchMedia("(hover:hover)").matches && carrusel.matches(":hover"), focoDentro = carrusel.contains(document.activeElement);
    const abortar = new AbortController();
    const opciones = { signal: abortar.signal };
    const limpiezasImagen = new Map();
    const preferenciaMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const movimientoReducido = () => document.documentElement.dataset.movimientoReducido === "true" || preferenciaMovimiento.matches;
    const diapositivas = eventos.map((e, i) => {
      const ajustes = ImagenesEvento.obtenerCarrusel(e);
      const enlace = document.createElement("a");
      enlace.className = `destacado-diapositiva modo-${ajustes.modo}`;
      enlace.href = `evento.html?id=${encodeURIComponent(e.id)}`;
      enlace.draggable = false;
      enlace.setAttribute("aria-label", `Ver evento: ${e.titulo || "Evento"}`);
      enlace.innerHTML = `${ImagenesEvento.renderizarCarrusel(e, i === 0)}<span class="destacado-titulo">${esc(e.titulo || "Evento")}</span>`;
      return enlace;
    });
    viewport.append(...diapositivas);
    const detener = () => { window.clearTimeout(temporizador); temporizador = 0; };
    const puedeAvanzar = () => diapositivas.length > 1 && document.documentElement.dataset.carruselAutomatico !== "false" && !movimientoReducido() && !ratonDentro && !focoDentro && !gesto && !document.hidden;
    const actualizarControles = () => { anterior.hidden = siguiente.hidden = diapositivas.length < 2; };
    const mostrar = nuevo => {
      if (!diapositivas.length) return;
      indice = (nuevo + diapositivas.length) % diapositivas.length;
      diapositivas.forEach((diapositiva, i) => {
        const visible = i === indice;
        diapositiva.classList.toggle("is-active", visible);
        diapositiva.tabIndex = visible ? 0 : -1;
        diapositiva.setAttribute("aria-hidden", String(!visible));
      });
      [indice, (indice + 1) % diapositivas.length].forEach(i => {
        const imagen = diapositivas[i].querySelector(".carrusel-imagen-principal");
        if (imagen) { imagen.loading = "eager"; if (imagen.dataset.src) { imagen.src = imagen.dataset.src; delete imagen.dataset.src; } }
      });
    };
    const programar = () => {
      detener();
      if (puedeAvanzar()) temporizador = window.setTimeout(() => { if (puedeAvanzar()) mostrar(indice + 1); programar(); }, 5000);
    };
    const avanzar = salto => { mostrar(indice + salto); programar(); };
    const quitarFallida = diapositiva => {
      const posicion = diapositivas.indexOf(diapositiva);
      if (posicion < 0) return;
      const visible = posicion === indice;
      limpiezasImagen.get(diapositiva)?.();
      limpiezasImagen.delete(diapositiva);
      diapositivas.splice(posicion, 1);
      diapositiva.remove();
      root.classList.toggle("sin-destacados", !diapositivas.length);
      actualizarControles();
      if (!diapositivas.length) { detener(); return; }
      if (visible) mostrar(Math.min(posicion, diapositivas.length - 1));
      else { if (posicion < indice) indice--; mostrar(indice); }
      programar();
    };
    mostrar(0);
    diapositivas.slice().forEach((diapositiva, i) => {
      const limpiar = ImagenesEvento.activarCarrusel(diapositiva, eventos[i], () => quitarFallida(diapositiva));
      if (diapositiva.isConnected) limpiezasImagen.set(diapositiva, limpiar);
      else limpiar?.();
    });
    anterior.addEventListener("click", () => avanzar(-1), opciones);
    siguiente.addEventListener("click", () => avanzar(1), opciones);
    carrusel.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") { ratonDentro = true; programar(); } }, opciones);
    carrusel.addEventListener("pointerleave", event => { if (event.pointerType === "mouse") { ratonDentro = false; programar(); } }, opciones);
    carrusel.addEventListener("focusin", () => { focoDentro = true; programar(); }, opciones);
    carrusel.addEventListener("focusout", event => { if (!carrusel.contains(event.relatedTarget)) { focoDentro = false; programar(); } }, opciones);
    viewport.addEventListener("pointerdown", event => {
      if (diapositivas.length < 2 || event.pointerType === "mouse" || !event.isPrimary) return;
      gesto = { id:event.pointerId, x:event.clientX, y:event.clientY };
      detener();
    }, opciones);
    viewport.addEventListener("pointermove", event => {
      if (!gesto || event.pointerId !== gesto.id) return;
      const dx = event.clientX - gesto.x, dy = event.clientY - gesto.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        if (event.cancelable) event.preventDefault();
        try { viewport.setPointerCapture(event.pointerId); } catch {}
      }
    }, { ...opciones, passive:false });
    const terminarGesto = event => {
      if (!gesto || event.pointerId !== gesto.id) return;
      const dx = event.clientX - gesto.x, dy = event.clientY - gesto.y;
      gesto = null;
      if (event.type !== "pointercancel" && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        ignorarClickHasta = performance.now() + 500;
        avanzar(dx < 0 ? 1 : -1);
      } else programar();
    };
    document.addEventListener("pointerup", terminarGesto, opciones);
    document.addEventListener("pointercancel", terminarGesto, opciones);
    viewport.addEventListener("click", event => {
      if (performance.now() < ignorarClickHasta) { event.preventDefault(); event.stopPropagation(); }
    }, { ...opciones, capture:true });
    document.addEventListener("visibilitychange", programar, opciones);
    document.addEventListener("ajustes:cambio", programar, opciones);
    preferenciaMovimiento.addEventListener("change", programar, opciones);
    const observar = new MutationObserver(programar);
    observar.observe(document.documentElement, { attributes:true, attributeFilter:["data-movimiento-reducido", "data-carrusel-automatico"] });
    limpiarAnterior = () => { detener(); abortar.abort(); observar.disconnect(); limpiezasImagen.forEach(limpiar => limpiar?.()); };
    programar();
  }
  window.DestacadosInicio = { renderizar };
  window.addEventListener("storage", event => { if (["eventos", ID_ORDEN, DestacadosGilena.clave, null].includes(event.key)) renderizar(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderizar, { once:true });
  else renderizar();
})();
