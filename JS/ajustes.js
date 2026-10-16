/* Preferencias personales de las páginas públicas. Se carga en <head> para evitar destellos. */
(() => {
  "use strict";
  const CLAVE = "ajustesPersonalesGilena";
  const categorias = ["todos", "cultura", "deportes", "fiestas", "arte", "concierto", "cine", "educacion", "ayuntamiento", "familiar", "mercado", "naturaleza", "gastronomia", "juventud", "otros"];
  const movimientoSistema = window.matchMedia("(prefers-reduced-motion: reduce)");
  const temaSistema = window.matchMedia("(prefers-color-scheme: dark)");
  const originales = () => ({ tema: "auto", texto: "normal", contraste: false, interlineado: false, reducirMovimiento: movimientoSistema.matches, categoria: "todos" });
  const opciones = { tema: ["claro", "oscuro", "auto"], texto: ["normal", "grande", "muy-grande"], categoria: categorias };
  const booleanos = ["contraste", "interlineado", "reducirMovimiento"];
  let ajustes = originales();

  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE));
    if (guardados && typeof guardados === "object" && !Array.isArray(guardados)) {
      for (const clave of Object.keys(ajustes)) {
        if (opciones[clave]?.includes(guardados[clave]) || (booleanos.includes(clave) && typeof guardados[clave] === "boolean")) ajustes[clave] = guardados[clave];
      }
    }
  } catch (_) { /* El panel sigue funcionando en memoria. */ }

  const raiz = document.documentElement;
  function aplicar() {
    raiz.dataset.tema = ajustes.tema;
    raiz.dataset.temaEfectivo = ajustes.tema === "auto" ? (temaSistema.matches ? "oscuro" : "claro") : ajustes.tema;
    raiz.dataset.texto = ajustes.texto;
    raiz.dataset.contraste = String(ajustes.contraste);
    raiz.dataset.interlineado = String(ajustes.interlineado);
    raiz.dataset.movimientoReducido = String(ajustes.reducirMovimiento);
    raiz.style.colorScheme = raiz.dataset.temaEfectivo === "oscuro" ? "dark" : "light";
  }
  aplicar();
  temaSistema.addEventListener("change", aplicar);
  movimientoSistema.addEventListener("change", () => {
    try {
      const guardados = JSON.parse(localStorage.getItem(CLAVE));
      if (guardados && typeof guardados.reducirMovimiento === "boolean") return;
    } catch (_) { /* Sin almacenamiento, sigue la preferencia del dispositivo. */ }
    ajustes.reducirMovimiento = movimientoSistema.matches;
    aplicar();
    actualizarControles();
  });

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch (_) { /* Solo esta visita. */ }
  }
  function actualizar(clave, valor) {
    ajustes = { ...ajustes, [clave]: valor };
    aplicar();
    guardar();
    actualizarControles();
    document.dispatchEvent(new CustomEvent("ajustes:cambio", { detail: { clave, valor, ajustes: { ...ajustes } } }));
  }
  window.AjustesGilena = { obtener: () => ({ ...ajustes }), actualizar };

  let panel;
  let fondo;
  let disparador;
  let aislados = [];
  function actualizarControles() {
    if (!panel) return;
    panel.querySelectorAll("[data-ajuste]").forEach(control => {
      const valor = ajustes[control.dataset.ajuste];
      if (control.type === "checkbox") control.checked = valor;
      else control.value = valor;
    });
  }
  function cerrar() {
    if (!fondo || fondo.hidden) return;
    fondo.hidden = true;
    document.body.classList.remove("ajustes-abiertos");
    aislados.forEach(([elemento, eraInerte]) => { elemento.inert = eraInerte; });
    aislados = [];
    if (disparador?.isConnected) disparador.focus();
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
  function interruptor(clave, etiqueta) {
    return `<label class="ajustes-interruptor"><span>${etiqueta}</span><input type="checkbox" data-ajuste="${clave}"></label>`;
  }
  document.addEventListener("DOMContentLoaded", () => {
    fondo = document.createElement("div");
    fondo.className = "ajustes-fondo";
    fondo.hidden = true;
    fondo.innerHTML = `<aside class="ajustes-panel" role="dialog" aria-modal="true" aria-labelledby="ajustes-titulo" tabindex="-1">
      <div class="ajustes-cabecera"><h2 id="ajustes-titulo"><span class="icono-ajustes" aria-hidden="true">⚙</span> Ajustes personales</h2><button type="button" class="ajustes-cerrar" aria-label="Cerrar ajustes">×</button></div>
      <p class="ajustes-ayuda">Estas preferencias se guardan en este navegador.</p>
      <section class="ajustes-seccion" aria-labelledby="ajustes-apariencia"><h3 id="ajustes-apariencia">Apariencia</h3>
        ${seleccion("tema", "Tema", [["claro", "Claro"], ["oscuro", "Oscuro"], ["auto", "Automático según el dispositivo"]])}
        ${seleccion("texto", "Tamaño del texto", [["normal", "Normal"], ["grande", "Grande"], ["muy-grande", "Muy grande"]])}
        ${interruptor("contraste", "Contraste alto")}
      </section>
      <section class="ajustes-seccion" aria-labelledby="ajustes-lectura"><h3 id="ajustes-lectura">Lectura y movimiento</h3>
        ${interruptor("interlineado", "Mayor separación entre líneas")}
        ${interruptor("reducirMovimiento", "Reducir animaciones")}
      </section>
      <section class="ajustes-seccion" aria-labelledby="ajustes-agenda"><h3 id="ajustes-agenda">Preferencias de la agenda</h3>
        ${seleccion("categoria", "Categoría inicial", [["todos", "Todas las categorías"], ["cultura", "Cultura"], ["deportes", "Deportivo"], ["fiestas", "Fiesta"], ["arte", "Arte"], ["concierto", "Concierto"], ["cine", "Cine"], ["educacion", "Educación"], ["ayuntamiento", "Ayuntamiento"], ["familiar", "Familiar"], ["mercado", "Mercado"], ["naturaleza", "Naturaleza"], ["gastronomia", "Gastronomía"], ["juventud", "Juventud"], ["otros", "Otros"]])}
      </section>
      <button type="button" class="ajustes-restablecer">Restablecer ajustes</button>
    </aside>`;
    document.body.append(fondo);
    panel = fondo.querySelector(".ajustes-panel");
    actualizarControles();
    document.querySelectorAll("[data-abrir-ajustes]").forEach(boton => boton.addEventListener("click", () => abrir(boton)));
    fondo.addEventListener("click", evento => { if (evento.target === fondo || evento.target.closest(".ajustes-cerrar")) cerrar(); });
    panel.addEventListener("change", evento => {
      const control = evento.target.closest("[data-ajuste]");
      if (control) actualizar(control.dataset.ajuste, control.type === "checkbox" ? control.checked : control.value);
    });
    panel.querySelector(".ajustes-restablecer").addEventListener("click", () => {
      ajustes = originales();
      try { localStorage.removeItem(CLAVE); } catch (_) { /* El panel sigue disponible. */ }
      aplicar();
      actualizarControles();
      document.dispatchEvent(new CustomEvent("ajustes:cambio", { detail: { clave: "restablecer", ajustes: { ...ajustes } } }));
    });
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
})();
