/* Preferencias personales de las páginas públicas. Se carga en <head> para evitar destellos. */
(() => {
  "use strict";
  const CLAVE = "ajustesPersonalesGilena";
  const claveActual = () => {
    try {
      const activo = JSON.parse(localStorage.getItem("perfilActivoGilenaDemo"));
      const perfiles = JSON.parse(localStorage.getItem("perfilesGilenaDemo"));
      return activo?.id && Array.isArray(perfiles) && perfiles.some(p => p.id === activo.id && p.correo === activo.correo) ? `${CLAVE}:${activo.id}` : CLAVE;
    } catch { return CLAVE; }
  };
  const categorias = ["todos", "cultura", "deportes", "fiestas", "arte", "concierto", "cine", "educacion", "ayuntamiento", "familiar", "mercado", "naturaleza", "gastronomia", "juventud", "otros"];
  const movimientoSistema = window.matchMedia("(prefers-reduced-motion: reduce)");
  const temaSistema = window.matchMedia("(prefers-color-scheme: dark)");
  const originales = () => ({ tema: "auto", texto: "normal", contraste: false, interlineado: false, reducirMovimiento: movimientoSistema.matches, movimientoCarrusel: true, categoria: "todos" });
  const opciones = { tema: ["claro", "oscuro", "auto"], texto: ["normal", "grande", "muy-grande"], categoria: categorias };
  const booleanos = ["contraste", "interlineado", "reducirMovimiento", "movimientoCarrusel"];
  let ajustes = originales();

  function cargar() {
    ajustes = originales();
    try {
    const guardados = JSON.parse(localStorage.getItem(claveActual()));
    if (guardados && typeof guardados === "object" && !Array.isArray(guardados)) {
      for (const clave of Object.keys(ajustes)) {
        if (opciones[clave]?.includes(guardados[clave]) || (booleanos.includes(clave) && typeof guardados[clave] === "boolean")) ajustes[clave] = guardados[clave];
      }
    }
    } catch (_) { /* El panel sigue funcionando en memoria. */ }
  }
  cargar();

  const raiz = document.documentElement;
  function aplicar() {
    raiz.dataset.tema = ajustes.tema;
    raiz.dataset.temaEfectivo = ajustes.tema === "auto" ? (temaSistema.matches ? "oscuro" : "claro") : ajustes.tema;
    raiz.dataset.texto = ajustes.texto;
    raiz.dataset.contraste = String(ajustes.contraste);
    raiz.dataset.interlineado = String(ajustes.interlineado);
    raiz.dataset.movimientoReducido = String(ajustes.reducirMovimiento);
    raiz.dataset.carruselAutomatico = String(ajustes.movimientoCarrusel);
    raiz.style.colorScheme = raiz.dataset.temaEfectivo === "oscuro" ? "dark" : "light";
  }
  aplicar();
  temaSistema.addEventListener("change", aplicar);
  movimientoSistema.addEventListener("change", () => {
    try {
      const guardados = JSON.parse(localStorage.getItem(claveActual()));
      if (guardados && typeof guardados.reducirMovimiento === "boolean") return;
    } catch (_) { /* Sin almacenamiento, sigue la preferencia del dispositivo. */ }
    ajustes.reducirMovimiento = movimientoSistema.matches;
    aplicar();
    actualizarControles();
  });

  function guardar() {
    try { localStorage.setItem(claveActual(), JSON.stringify(ajustes)); return true; }
    catch (_) { mostrarMensaje("No se pudieron guardar las preferencias. Los cambios se aplican solo durante esta visita.", "error"); return false; }
  }
  function actualizar(clave, valor) {
    ajustes = { ...ajustes, [clave]: valor };
    aplicar();
    guardar();
    actualizarControles();
    document.dispatchEvent(new CustomEvent("ajustes:cambio", { detail: { clave, valor, ajustes: { ...ajustes } } }));
  }
  window.AjustesGilena = { obtener: () => ({ ...ajustes }), actualizar };
  document.addEventListener("perfil:cambio", () => { cargar(); aplicar(); actualizarControles(); });

  let panel;
  let fondo;
  let disparador;
  let aislados = [];
  let mensajePanel;
  function mostrarMensaje(texto, tipo = "") {
    if (!mensajePanel) return;
    mensajePanel.textContent = texto;
    mensajePanel.className = `ajustes-mensaje ${tipo}`;
  }
  function actualizarControles() {
    if (!panel) return;
    panel.querySelectorAll("[data-ajuste]").forEach(control => {
      const valor = ajustes[control.dataset.ajuste];
      if (control.type === "checkbox") control.checked = valor;
      else if (control.type === "radio") control.checked = control.value === valor;
      else control.value = valor;
    });
  }
  function cerrar() {
    if (!fondo || fondo.hidden) return;
    fondo.hidden = true;
    document.body.classList.remove("ajustes-abiertos");
    aislados.forEach(([elemento, eraInerte]) => { elemento.inert = eraInerte; });
    aislados = [];
    if (disparador?.isConnected) {
      const navegacion = disparador.closest("nav");
      const menuMovil = disparador.closest(".cabecera-publica")?.querySelector(".nav-menu-toggle");
      if (navegacion && getComputedStyle(navegacion).display === "none" && menuMovil) menuMovil.focus();
      else disparador.focus();
    }
  }
  function abrir(boton) {
    disparador = boton;
    actualizarControles();
    fondo.hidden = false;
    aislados = [...document.body.children].filter(elemento => elemento !== fondo && !["SCRIPT", "STYLE"].includes(elemento.tagName)).map(elemento => [elemento, elemento.inert]);
    aislados.forEach(([elemento]) => { elemento.inert = true; });
    document.body.classList.add("ajustes-abiertos");
    panel.focus();
  }
  function seleccion(clave, etiqueta, alternativas) {
    return `<label class="ajustes-campo"><span>${etiqueta}</span><select data-ajuste="${clave}">${alternativas.map(([valor, nombre]) => `<option value="${valor}">${nombre}</option>`).join("")}</select></label>`;
  }
  function opcionesVisuales(clave, etiqueta, alternativas) {
    return `<fieldset class="ajustes-opciones-visuales"><legend>${etiqueta}</legend><div>${alternativas.map(([valor, nombre, icono]) => `<label><input type="radio" name="ajuste-${clave}" value="${valor}" data-ajuste="${clave}"><span aria-hidden="true">${icono}</span><strong>${nombre}</strong></label>`).join("")}</div></fieldset>`;
  }
  function interruptor(clave, etiqueta) {
    return `<label class="ajustes-interruptor"><span>${etiqueta}</span><input type="checkbox" data-ajuste="${clave}"></label>`;
  }
  document.addEventListener("DOMContentLoaded", () => {
    fondo = document.createElement("div");
    fondo.className = "ajustes-fondo";
    fondo.hidden = true;
    const esAdmin = document.body.classList.contains("body-admin-editor");
    fondo.innerHTML = `<aside class="ajustes-panel" role="dialog" aria-modal="true" aria-labelledby="ajustes-titulo" tabindex="-1">
      <div class="ajustes-cabecera"><div><span>Preferencias</span><h2 id="ajustes-titulo">Ajustes</h2></div><button type="button" class="ajustes-cerrar" aria-label="Cerrar ajustes">×</button></div>
      <div class="ajustes-contenido"><p class="ajustes-ayuda">Los cambios se aplican al instante y se guardan en este navegador.</p>
      <p class="ajustes-mensaje" role="status" aria-live="polite"></p>
      <section class="ajustes-seccion" aria-labelledby="ajustes-apariencia"><h3 id="ajustes-apariencia"><span aria-hidden="true">◐</span> Apariencia</h3>
        ${opcionesVisuales("tema", "Tema", [["claro", "Claro", "☀"], ["oscuro", "Oscuro", "●"], ["auto", "Sistema", "◐"]])}
        ${interruptor("movimientoCarrusel", "Movimiento automático del carrusel")}
      </section>
      <section class="ajustes-seccion" aria-labelledby="ajustes-lectura"><h3 id="ajustes-lectura"><span aria-hidden="true">Aa</span> Accesibilidad</h3>
        ${seleccion("texto", "Tamaño del texto", [["normal", "Normal"], ["grande", "Grande"], ["muy-grande", "Muy grande"]])}
        ${interruptor("reducirMovimiento", "Reducir animaciones")}
        ${interruptor("contraste", "Contraste alto")}
        ${esAdmin ? interruptor("interlineado", "Mayor interlineado") : ""}
      </section>
      ${esAdmin ? "" : `<section class="ajustes-seccion ajustes-google" id="google" aria-labelledby="tituloGoogleFavoritos"><h3 id="tituloGoogleFavoritos"><span aria-hidden="true">▣</span> Google Calendar</h3><p>Consulta tus calendarios en Mis favoritos y añade eventos municipales.</p><p id="estadoGoogle" class="ajustes-google-estado" role="status" aria-live="polite">Comprobando estado…</p><div class="ajustes-google-botones"><button type="button" id="conectarGoogle">Conectar Google Calendar</button><button type="button" id="actualizarGoogle" hidden>Actualizar</button><button type="button" id="desconectarGoogle" hidden>Desconectar</button></div><label id="grupoCalendario" hidden>Calendario de destino <select id="calendarioGoogle"></select></label><details id="elegirCalendarios" hidden><summary>Calendarios visibles</summary><div id="listaCalendarios"></div></details></section>`}
      <section class="ajustes-seccion ajustes-restablecer-seccion"><h3><span aria-hidden="true">↺</span> Restablecer preferencias</h3><p>Restablece únicamente apariencia y accesibilidad.</p><button type="button" class="ajustes-restablecer">Restablecer preferencias</button></section></div>
    </aside>`;
    panel = fondo.querySelector(".ajustes-panel");
    if (esAdmin) {
      panel.className = "cms-ajustes-integrados";
      ["role", "aria-modal", "tabindex", "aria-labelledby"].forEach(atributo => panel.removeAttribute(atributo));
      document.getElementById("ajustesAdminIntegrados").append(panel);
    } else document.body.append(fondo);
    mensajePanel = panel.querySelector(".ajustes-mensaje");
    actualizarControles();
    document.querySelectorAll("[data-abrir-ajustes]").forEach(boton => boton.addEventListener("click", () => abrir(boton)));
    fondo.addEventListener("click", evento => { if (evento.target === fondo || evento.target.closest(".ajustes-cerrar")) cerrar(); });
    panel.addEventListener("change", evento => {
      const control = evento.target.closest("[data-ajuste]");
      if (control) actualizar(control.dataset.ajuste, control.type === "checkbox" ? control.checked : control.value);
    });
    panel.querySelector(".ajustes-restablecer").addEventListener("click", evento => {
      const boton = evento.currentTarget;
      if (boton.dataset.confirmar !== "true") {
        boton.dataset.confirmar = "true";
        boton.textContent = "Confirmar restablecimiento";
        mostrarMensaje("Solo se restablecerán apariencia y accesibilidad. Tus datos y conexiones se conservarán.");
        return;
      }
      const categoriaConservada = ajustes.categoria;
      try { localStorage.removeItem(claveActual()); } catch { mostrarMensaje("No se pudieron restablecer las preferencias. Se conserva la configuración anterior.", "error"); return; }
      ajustes = { ...originales(), categoria: categoriaConservada };
      aplicar();
      actualizarControles();
      boton.dataset.confirmar = "false";
      boton.textContent = "Restablecer preferencias";
      mostrarMensaje("Preferencias restablecidas.");
      document.dispatchEvent(new CustomEvent("ajustes:cambio", { detail: { clave: "restablecer", ajustes: { ...ajustes } } }));
    });
    if (!esAdmin) iniciarGoogleComun();
    document.addEventListener("keydown", evento => {
      if (fondo.hidden) return;
      if (evento.key === "Escape") { evento.preventDefault(); cerrar(); return; }
      if (evento.key !== "Tab") return;
      const controles = [...panel.querySelectorAll("button:not([disabled]), select:not([disabled]), input:not([disabled])")];
      const primero = controles[0];
      const ultimo = controles[controles.length - 1];
      if (evento.shiftKey && (document.activeElement === primero || document.activeElement === panel)) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }, true);
    document.addEventListener("focusin", evento => {
      if (!fondo.hidden && !panel.contains(evento.target)) panel.focus();
    });
  });
  window.addEventListener("storage", evento => {
    if (evento.key !== claveActual()) return;
    cargar(); aplicar(); actualizarControles();
    mostrarMensaje("Preferencias actualizadas desde otra pestaña.");
  });

  function cargarScript(ruta) {
    if ([...document.scripts].some(script => new URL(script.src || "", location.href).pathname.endsWith(ruta))) return Promise.resolve();
    return new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = ruta; script.onload = resolve; script.onerror = reject; document.head.append(script); });
  }
  async function iniciarGoogleComun() {
    if (document.body.classList.contains("pagina-mis-eventos")) return;
    const estadoTexto = document.getElementById("estadoGoogle");
    try {
      await cargarScript("JS/google-config.js");
      await cargarScript("JS/google-agenda.js");
    } catch { estadoTexto.textContent = "No se pudo cargar Google Calendar. Comprueba la conexión."; return; }
    const conectar = document.getElementById("conectarGoogle"), actualizar = document.getElementById("actualizarGoogle"), desconectar = document.getElementById("desconectarGoogle");
    const grupo = document.getElementById("grupoCalendario"), selector = document.getElementById("calendarioGoogle"), detalles = document.getElementById("elegirCalendarios"), lista = document.getElementById("listaCalendarios");
    const CLAVE_VISIBLES = "googleCalendariosVisiblesGilena", CLAVE_DESTINO = "googleCalendarioDestinoGilena";
    const leerLista = () => { try { const valor = JSON.parse(localStorage.getItem(CLAVE_VISIBLES) || "[]"); return Array.isArray(valor) ? new Set(valor.map(String)) : new Set(); } catch { return new Set(); } };
    const escapar = valor => String(valor).replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[x]);
    const escribible = calendario => ["writer", "owner", "writerWithoutPrivateAccess"].includes(calendario.accessRole);
    function pintar(mensaje = "") {
      const estado = GoogleAgenda.estado();
      conectar.hidden = estado.conectado; actualizar.hidden = !estado.conectado; desconectar.hidden = !estado.conectado;
      grupo.hidden = !estado.conectado; detalles.hidden = !estado.conectado;
      if (!estado.conectado) {
        estadoTexto.textContent = mensaje || estado.motivo || (estado.requiereReconexion ? "Es necesario reconectar" : estado.configurado ? "Sin conectar" : "Sin conectar. Falta configurar el Client ID de Google.");
        selector.replaceChildren(); lista.replaceChildren(); return;
      }
      const destinoAnterior = selector.value || localStorage.getItem(CLAVE_DESTINO) || "";
      const destinos = estado.calendarios.filter(escribible);
      selector.replaceChildren(...destinos.map(c => new Option(c.summaryOverride || c.summary || c.id, c.id)));
      if (destinos.some(c => c.id === destinoAnterior)) selector.value = destinoAnterior;
      const visiblesGuardados = leerLista();
      const visibles = visiblesGuardados.size ? visiblesGuardados : new Set(estado.calendarios.map(c => c.id));
      lista.innerHTML = estado.calendarios.map(c => `<label><input type="checkbox" data-calendario-visible="${escapar(c.id)}" ${visibles.has(c.id) ? "checked" : ""}> <span>${escapar(c.summaryOverride || c.summary || c.id)}</span></label>`).join("");
      estadoTexto.textContent = mensaje || (destinos.length ? "Conectado" : "Conectado, pero no hay calendarios con permiso de escritura.");
    }
    async function conectarGoogle() {
      conectar.disabled = true; estadoTexto.textContent = "Abriendo autorización de Google…";
      try { await GoogleAgenda.conectar(); await GoogleAgenda.cargarCalendarios(); pintar("Conectado"); }
      catch (error) { pintar(error.message); }
      finally { conectar.disabled = false; }
    }
    conectar.addEventListener("click", conectarGoogle);
    actualizar.addEventListener("click", async () => { actualizar.disabled = true; try { await GoogleAgenda.cargarCalendarios(); pintar("Calendarios actualizados."); } catch (error) { pintar(error.message); } finally { actualizar.disabled = false; } });
    desconectar.addEventListener("click", async () => { await GoogleAgenda.desconectar(); pintar("Sin conectar"); });
    selector.addEventListener("change", () => { try { localStorage.setItem(CLAVE_DESTINO, selector.value); } catch { mostrarMensaje("No se pudo guardar el calendario de destino.", "error"); } });
    lista.addEventListener("change", () => { try { localStorage.setItem(CLAVE_VISIBLES, JSON.stringify([...lista.querySelectorAll("[data-calendario-visible]:checked")].map(input => input.dataset.calendarioVisible))); } catch { mostrarMensaje("No se pudo guardar la selección de calendarios.", "error"); } });
    GoogleAgenda.suscribir(() => pintar());
    pintar();
  }
})();
