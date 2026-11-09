// 1. Cargamos los eventos de la base de datos (localStorage)
let eventos = [];
try {
    const guardados = JSON.parse(localStorage.getItem("eventos")) || [];
    eventos = Array.isArray(guardados) ? guardados.filter(esEventoPublicado) : [];
} catch (e) {
    eventos = [];
}

// Fechas locales: se evita convertir YYYY-MM-DD a UTC.
let fechaActual = new Date();
fechaActual.setDate(1);
let filtroFechaActivo = "todos";
let filtroSoloGratis = false;
let filtroCategoriaActivo = "todos";
let fechasPersonalizadas = null;
let borradorFiltros = null;
let temporizadorBusqueda = null;
let mesVisibleFiltro = null;
let fechasEnDialogo = null;
let esperandoFinRango = false;
let fechaSeleccionada = "";
const CLAVE_ESTADO_AGENDA = "estadoAgendaGilena";

function fechaLocal(valor) {
    if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""))) return null;
    const [ano, mes, dia] = String(valor).split("-").map(Number);
    const fecha = new Date(ano, mes - 1, dia);
    return fecha.getFullYear() === ano && fecha.getMonth() === mes - 1 && fecha.getDate() === dia ? fecha : null;
}
function claveFecha(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
function sumarDiasLocal(fecha, dias) {
    const copia = fechaLocal(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
}
function intervaloEvento(evento) {
    const inicio = fechaLocal(evento.fecha);
    if (!inicio) return null;
    const finLeido = fechaLocal(evento.fechaFin);
    const fin = finLeido && finLeido >= inicio ? finLeido : fechaLocal(evento.fecha);
    return { inicio, fin };
}
function eventoCoincidePeriodo(evento, desde, hasta) {
    const intervalo = intervaloEvento(evento);
    return Boolean(intervalo && intervalo.inicio <= hasta && intervalo.fin >= desde);
}
function eventoEnFecha(evento, fecha) {
    const dia = fechaLocal(fecha);
    return Boolean(dia && eventoCoincidePeriodo(evento, dia, dia));
}
function finalEvento(evento) {
    const intervalo = intervaloEvento(evento);
    if (!intervalo) return null;
    const final = new Date(intervalo.fin);
    if (evento.horaFin && /^([01]\d|2[0-3]):[0-5]\d$/.test(evento.horaFin)) {
        const [hora, minuto] = evento.horaFin.split(":").map(Number);
        final.setHours(hora, minuto, 59, 999);
    } else final.setHours(23, 59, 59, 999);
    return final;
}
function eventoEsGratis(evento) {
    if (evento.tipoPrecio === "gratis") return true;
    if (["pago", "sin-especificar"].includes(evento.tipoPrecio)) return false;
    const precio = String(evento.precio ?? "").trim().toLocaleLowerCase("es");
    return ["gratis", "gratuito", "gratuita", "0", "0€", "0 €"].includes(precio);
}
function periodoSeleccionado() {
    const hoy = fechaLocal(new Date());
    if (filtroFechaActivo === "hoy") return { desde: hoy, hasta: hoy };
    if (filtroFechaActivo === "manana") {
        const manana = sumarDiasLocal(hoy, 1);
        return { desde: manana, hasta: manana };
    }
    if (filtroFechaActivo === "personalizado") {
        const desde = fechaLocal(fechasPersonalizadas?.desde);
        const hasta = fechaLocal(fechasPersonalizadas?.hasta || fechasPersonalizadas?.desde);
        return desde && hasta && hasta >= desde ? { desde, hasta } : null;
    }
    const lunes = sumarDiasLocal(hoy, -((hoy.getDay() + 6) % 7));
    if (filtroFechaActivo === "semana") return { desde: lunes, hasta: sumarDiasLocal(lunes, 6) };
    if (filtroFechaActivo === "fin-semana") {
        const sabado = sumarDiasLocal(lunes, 5);
        return { desde: sabado, hasta: sumarDiasLocal(sabado, 1) };
    }
    return null;
}

function textoBuscable(valor) {
    const plantilla = document.createElement("template");
    plantilla.innerHTML = String(valor || "");
    return plantilla.content.textContent || "";
}
function normalizarBusqueda(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}
const textosEventos = new WeakMap();
function contenidoBuscable(evento) {
    if (!textosEventos.has(evento)) textosEventos.set(evento, normalizarBusqueda([
        evento.titulo, evento.subtitulo, textoBuscable(evento.descripcion), textoBuscable(evento.descripcion_larga), evento.lugar
    ].join(" ")));
    return textosEventos.get(evento);
}

function escaparHTML(valor = "") {
    return String(valor).replace(/[&<>"']/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caracter]));
}

let favoritos = FavoritosGilena.lista();
function guardarPreferencias() {
    if (!FavoritosGilena.guardar(favoritos)) {
        favoritos = FavoritosGilena.lista();
        alert(FavoritosGilena.error);
        return false;
    }
    return true;
}

function estadoAgenda() {
    return { texto:document.getElementById("buscador")?.value || "", categoria:filtroCategoriaActivo, periodo:filtroFechaActivo, desde:fechasPersonalizadas?.desde || "", hasta:fechasPersonalizadas?.hasta || "", gratis:filtroSoloGratis, mes:`${fechaActual.getFullYear()}-${String(fechaActual.getMonth()+1).padStart(2,"0")}`, dia:fechaSeleccionada, scrollY:window.scrollY };
}
function guardarEstadoAgenda() {
    try { sessionStorage.setItem(CLAVE_ESTADO_AGENDA, JSON.stringify(estadoAgenda())); } catch {}
    const estado = estadoAgenda(), url = new URL(location.href);
    ["q","categoria","periodo","desde","hasta","gratis","mes","dia","restaurar"].forEach(k => url.searchParams.delete(k));
    if (estado.texto.trim()) url.searchParams.set("q", estado.texto.trim());
    if (estado.categoria !== "todos") url.searchParams.set("categoria", estado.categoria);
    if (estado.periodo !== "todos") url.searchParams.set("periodo", estado.periodo);
    if (estado.periodo === "personalizado" && estado.desde) {
        url.searchParams.set("desde", estado.desde);
        if (estado.hasta && estado.hasta !== estado.desde) url.searchParams.set("hasta", estado.hasta);
    }
    if (estado.gratis) url.searchParams.set("gratis", "1");
    if (estado.mes !== claveFecha(new Date()).slice(0,7)) url.searchParams.set("mes", estado.mes);
    if (estado.dia) url.searchParams.set("dia", estado.dia);
    try { history.replaceState({ agenda:true }, "", `${url.pathname}${url.search}${url.hash}`); } catch {}
}
function restaurarEstadoAgenda() {
    const parametros = new URLSearchParams(location.search);
    const vuelve = parametros.get("restaurar") === "1" || performance.getEntriesByType("navigation")[0]?.type === "back_forward";
    let guardado = {};
    if (vuelve) { try { guardado = JSON.parse(sessionStorage.getItem(CLAVE_ESTADO_AGENDA)) || {}; } catch {} }
    const valor = (nombre, respaldo) => parametros.has(nombre) ? parametros.get(nombre) : respaldo;
    document.getElementById("buscador").value = valor("q", guardado.texto || "");
    const categoriaGuardada = valor("categoria", guardado.categoria || document.getElementById("filtroCategoria").value || "todos");
    filtroCategoriaActivo = [...document.getElementById("filtroCategoria").options].some(opcion => opcion.value === categoriaGuardada) ? categoriaGuardada : "todos";
    document.getElementById("filtroCategoria").value = filtroCategoriaActivo;
    filtroFechaActivo = valor("periodo", guardado.periodo || "todos");
    if (!["todos", "hoy", "manana", "semana", "fin-semana", "personalizado"].includes(filtroFechaActivo)) filtroFechaActivo = "todos";
    const desde = valor("desde", guardado.desde || "");
    const hasta = valor("hasta", guardado.hasta || desde);
    fechasPersonalizadas = fechaLocal(desde) && fechaLocal(hasta) && hasta >= desde ? { desde, hasta } : null;
    if (filtroFechaActivo === "personalizado" && !fechasPersonalizadas) filtroFechaActivo = "todos";
    filtroSoloGratis = valor("gratis", guardado.gratis ? "1" : "") === "1";
    const mes = valor("mes", guardado.mes || ""); if (/^\d{4}-\d{2}$/.test(mes)) fechaActual = new Date(Number(mes.slice(0,4)), Number(mes.slice(5))-1, 1);
    fechaSeleccionada = fechaLocal(valor("dia", guardado.dia || "")) ? valor("dia", guardado.dia || "") : "";
    sincronizarControles();
    const posicion = vuelve ? Number(guardado.scrollY) || 0 : 0;
    if (parametros.has("restaurar")) { parametros.delete("restaurar"); const url=new URL(location.href); url.searchParams.delete("restaurar"); try { history.replaceState({agenda:true},"",`${url.pathname}${url.search}${url.hash}`); } catch {} }
    return posicion;
}

function categoriaLegible(categoria = "otros") {
    return ({
        cultura: "🎭 Cultura", deportes: "⚽ Deportivo", fiestas: "🎉 Fiesta", arte: "🎨 Arte",
        concierto: "🎵 Concierto", cine: "🎬 Cine", educacion: "📚 Educación", ayuntamiento: "🏛️ Ayuntamiento",
        familiar: "👨‍👩‍👧‍👦 Familiar", mercado: "🛍️ Mercado", naturaleza: "🌳 Naturaleza",
        gastronomia: "🧑‍🍳 Gastronomía", juventud: "Juventud", otros: "Otros"
    })[categoria] || categoria;
}

function bloqueImagen(evento, clase = "") {
    return ImagenesEvento.renderizar(evento, "imagenTarjeta", `miniatura-evento ${clase}`);
}

function activarImagenesFallback(contenedor) {
    ImagenesEvento.activar(contenedor);
}

/* ========================================
   MOSTRAR EVENTOS (Lista principal)
======================================== */
function mostrarEventos(lista, idContenedor = "listaEventos", idMensaje = "sinResultados") {
    const contenedor = document.getElementById(idContenedor);
    const mensaje = document.getElementById(idMensaje);
    if (!contenedor || !mensaje) return;
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        mensaje.style.display = "block";
        if (idMensaje === "sinResultados") {
            const hayFiltros = Boolean(document.getElementById("buscador")?.value.trim() || filtroCategoriaActivo !== "todos" || filtroFechaActivo !== "todos" || filtroSoloGratis || fechaSeleccionada);
            mensaje.innerHTML = `No hay eventos con estos filtros.${hayFiltros ? ' <button type="button" data-limpiar-sin-resultados>Limpiar filtros</button>' : ""}${filtroFechaActivo !== "todos" ? ' <button type="button" data-ampliar-fechas>Ampliar fechas</button>' : ""}`;
        }
        return;
    }

    mensaje.style.display = "none";

    contenedor.innerHTML = lista.map(evento => TarjetasEvento.renderizar(evento, { favorito: favoritos.includes(String(evento.id)) })).join("");
    activarImagenesFallback(contenedor);
}

function compararInicio(a, b) {
    const fechaA = intervaloEvento(a)?.inicio?.getTime() || Infinity;
    const fechaB = intervaloEvento(b)?.inicio?.getTime() || Infinity;
    return fechaA - fechaB || String(a.hora || "99:99").localeCompare(String(b.hora || "99:99"), "es");
}

function filtrosComunes(evento) {
    const categoria = filtroCategoriaActivo;
    const texto = normalizarBusqueda(document.getElementById("buscador")?.value || "");
    const periodo = periodoSeleccionado();
    return (categoria === "todos" || evento.categoria === categoria)
        && (!texto || contenidoBuscable(evento).includes(texto))
        && (!filtroSoloGratis || eventoEsGratis(evento))
        && (!periodo || eventoCoincidePeriodo(evento, periodo.desde, periodo.hasta));
}

document.addEventListener("click", event => {
    const botonFavorito = event.target.closest("[data-favorito]");
    if (botonFavorito) {
        const id = botonFavorito.dataset.favorito;
        const estabaGuardado = favoritos.includes(id);
        if (estabaGuardado) favoritos = favoritos.filter(item => item !== id);
        else favoritos.push(id);
        if (!guardarPreferencias()) return;
        if (estabaGuardado) FavoritosGilena.eliminarReferencia?.(id);
        else FavoritosGilena.registrar?.(eventos.find(item => String(item.id) === id));
        document.querySelectorAll(`[data-favorito="${CSS.escape(id)}"]`).forEach(boton => {
            const activo = favoritos.includes(id);
            TarjetasEvento.actualizarFavorito(boton, activo);
        });
    }
    const abrirDetalle = event.target.closest('a[href^="evento.html"]');
    if (abrirDetalle) {
        guardarEstadoAgenda();
        try { sessionStorage.setItem("origenDetalleGilena", abrirDetalle.closest(".evento-destacado-carrusel") ? "destacados" : "inicio"); } catch {}
    }
});
window.addEventListener("storage", event => {
    if (event.key === FavoritosGilena.clave) {
        favoritos = FavoritosGilena.lista();
        filtrarEventos();
    }
});
document.addEventListener("identidad:cambio", () => { favoritos = FavoritosGilena.lista(); filtrarEventos(); });
document.addEventListener("perfil:cambio", () => { favoritos = FavoritosGilena.lista(); filtrarEventos(); });

function formatearFecha(fecha) {
    const opciones = { day: "numeric", month: "long", year: "numeric" };
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", opciones);
}

function formatearFechaTarjeta(inicio, fin = "") {
    return formatearRangoEvento(inicio, fin);
}

/* ========================================
   BUSCADOR FLOTANTE (Mini apartado)
======================================== */
function buscarEventoDesplegable() {
    const texto = document.getElementById("buscador").value.trim();
    const cajaResultados = document.getElementById("resultadosBusqueda");
    filtrarEventos();

    // Si está vacío, ocultamos la caja
    if (texto.length === 0) {
        ocultarResultadosBusqueda();
        return;
    }

    const coincidencias = eventos.filter(evento => filtrosComunes(evento) && (!fechaSeleccionada || eventoEnFecha(evento, fechaSeleccionada)) && finalEvento(evento) >= new Date()).slice(0, 8);

    cajaResultados.innerHTML = "";

    if (coincidencias.length === 0) {
        cajaResultados.innerHTML = `<div class="sin-resultados-mini">No se han encontrado eventos para "${escaparHTML(texto)}"</div>`;
    } else {
        coincidencias.forEach(evento => {
            const estado = evento.estadoActividad && evento.estadoActividad !== "programado" ? `<span class="tarjeta-estado ${escaparHTML(evento.estadoActividad)}">${evento.estadoActividad === "cancelado" ? "Cancelado" : "Aplazado"}</span>` : "";
            const horario = evento.hora ? `${evento.hora}${evento.horaFin ? ` – ${evento.horaFin}` : ""}` : "";
            cajaResultados.innerHTML += `
                <a href="evento.html?id=${encodeURIComponent(evento.id)}" class="item-resultado-mini">
                    ${bloqueImagen(evento, "miniatura-resultado")}
                    <div>
                        <div class="tarjeta-etiquetas"><span class="categoria">${escaparHTML(categoriaLegible(evento.categoria))}</span>${estado}</div>
                        <h4>${escaparHTML(evento.titulo)}</h4>
                        <p><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${escaparHTML(formatearFechaTarjeta(evento.fecha, evento.fechaFin))}${horario ? ` · ${escaparHTML(horario)}` : ""}</p>
                        ${evento.lugar ? `<p><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escaparHTML(evento.lugar)}</p>` : ""}
                    </div>
                </a>
            `;
        });
    }

    cajaResultados.style.display = "block";
    document.getElementById("buscador").setAttribute("aria-expanded", "true");
    activarImagenesFallback(cajaResultados);
}

function ocultarResultadosBusqueda() {
    document.getElementById("resultadosBusqueda").style.display = "none";
    document.getElementById("buscador").setAttribute("aria-expanded", "false");
}

// Cerrar el buscador flotante si hacemos clic fuera
document.addEventListener("click", function(event) {
    const buscador = document.querySelector(".campo-busqueda");
    const cajaResultados = document.getElementById("resultadosBusqueda");
    
    // Verificamos que la caja de resultados exista antes de ocultarla
    if (buscador && cajaResultados && !buscador.contains(event.target)) {
        ocultarResultadosBusqueda();
    }
});
document.getElementById("buscador").addEventListener("keydown", evento => {
    if (evento.key === "Escape" && evento.currentTarget.getAttribute("aria-expanded") === "true") {
        evento.preventDefault();
        ocultarResultadosBusqueda();
    }
});

/* ========================================
   FILTROS COMBINADOS Y PRÓXIMOS/ANTERIORES
======================================== */
function filtrarEventos() {
    const selectCategoria = document.getElementById("filtroCategoria");
    if (!selectCategoria) return;
    const ahora = new Date();
    const filtrados = eventos.filter(evento => intervaloEvento(evento) && filtrosComunes(evento) && (!fechaSeleccionada || eventoEnFecha(evento, fechaSeleccionada)));
    const proximos = filtrados.filter(evento => {
        const final = finalEvento(evento);
        return final && final >= ahora;
    }).sort(compararInicio);
    const anteriores = filtrados.filter(evento => {
        const final = finalEvento(evento);
        return final && final < ahora;
    })
        .sort((a, b) => (finalEvento(b)?.getTime() || 0) - (finalEvento(a)?.getTime() || 0));

    mostrarEventos(proximos, "listaEventos", "sinResultados");
    mostrarEventos(anteriores, "listaEventosAnteriores", "sinResultadosAnteriores");
    if (!proximos.length && anteriores.length) document.getElementById("sinResultados").textContent = "No hay próximos eventos con estos filtros. Puedes consultar los eventos anteriores.";
    const contadorAnteriores = document.getElementById("contadorAnteriores");
    if (contadorAnteriores) contadorAnteriores.textContent = `(${anteriores.length})`;
    const resumen = document.getElementById("resumenFiltros");
    const total = new Set(filtrados.map(evento => String(evento.id))).size;
    if (resumen) resumen.textContent = `${total} ${total === 1 ? "resultado" : "resultados"}: ${proximos.length} ${proximos.length === 1 ? "próximo" : "próximos"} y ${anteriores.length} ${anteriores.length === 1 ? "anterior" : "anteriores"}`;
    const limpiar = document.getElementById("limpiarFiltros");
    const textoBusqueda = document.getElementById("buscador")?.value.trim() || "";
    const sinFiltros = filtroFechaActivo === "todos" && !filtroSoloGratis && filtroCategoriaActivo === "todos" && !textoBusqueda && !fechaSeleccionada;
    if (limpiar) limpiar.hidden = sinFiltros;
    const periodoDia = document.getElementById("periodoDiaSeleccionado");
    if (periodoDia) {
        periodoDia.hidden = !fechaSeleccionada;
        periodoDia.textContent = fechaSeleccionada ? `Eventos del ${formatearFecha(fechaSeleccionada)}` : "";
    }
    const volverPeriodo = document.getElementById("verPeriodoCompleto");
    if (volverPeriodo) volverPeriodo.hidden = !fechaSeleccionada;
    const tituloListado = document.getElementById("tituloProximosEventos");
    if (tituloListado) tituloListado.textContent = fechaSeleccionada ? "Eventos del día" : "Próximos eventos";
    const chips = document.getElementById("filtrosActivos");
    if (chips) {
        const activos = [];
        if (textoBusqueda) activos.push(["texto", `Búsqueda: ${textoBusqueda}`]);
        if (filtroCategoriaActivo !== "todos") activos.push(["categoria", [...selectCategoria.options].find(opcion => opcion.value === filtroCategoriaActivo)?.text || filtroCategoriaActivo]);
        if (filtroFechaActivo !== "todos") activos.push(["periodo", etiquetaPeriodo()]);
        if (filtroSoloGratis) activos.push(["gratis", "Solo gratuitos"]);
        chips.innerHTML = activos.map(([clave,etiqueta]) => `<button type="button" data-quitar-filtro="${clave}" aria-label="Quitar filtro ${escaparHTML(etiqueta)}">${escaparHTML(etiqueta)} <span aria-hidden="true">×</span></button>`).join("");
        chips.hidden = !activos.length;
    }
    generarCalendario();
    ocultarResultadosBusqueda();
    sincronizarControles();
    guardarEstadoAgenda();
}

function etiquetaPeriodo(periodo = filtroFechaActivo, fechas = fechasPersonalizadas) {
    const nombres = { hoy:"Hoy", manana:"Mañana", semana:"Esta semana", "fin-semana":"Este fin de semana" };
    if (periodo === "personalizado" && fechas?.desde) return fechas.hasta && fechas.hasta !== fechas.desde
        ? `${formatearFecha(fechas.desde)} – ${formatearFecha(fechas.hasta)}` : formatearFecha(fechas.desde);
    return nombres[periodo] || "Cualquier fecha";
}
function esMovilFiltros() { return matchMedia("(max-width: 700px)").matches; }
function panelFiltrosAbierto() { return document.getElementById("panelFiltrosMovil").classList.contains("abierto"); }
function sincronizarControles() {
    const estado = borradorFiltros && panelFiltrosAbierto() ? borradorFiltros : { categoria:filtroCategoriaActivo, periodo:filtroFechaActivo, gratis:filtroSoloGratis, fechas:fechasPersonalizadas };
    document.getElementById("filtroCategoria").value = estado.categoria;
    const selectorPeriodo = document.getElementById("filtroCuando");
    selectorPeriodo.querySelector('option[value="personalizado"]').textContent = estado.periodo === "personalizado" && estado.fechas ? `Fechas: ${etiquetaPeriodo("personalizado", estado.fechas)}` : "Elegir fechas…";
    selectorPeriodo.value = estado.periodo;
    selectorPeriodo.title = estado.periodo === "personalizado" && estado.fechas ? etiquetaPeriodo("personalizado", estado.fechas) : "";
    document.getElementById("filtroGratis").checked = estado.gratis;
    const textoFecha = document.getElementById("periodoPersonalizadoTexto");
    textoFecha.hidden = estado.periodo !== "personalizado" || !estado.fechas;
    textoFecha.textContent = textoFecha.hidden ? "" : etiquetaPeriodo("personalizado", estado.fechas);
    document.getElementById("editarFechas").hidden = textoFecha.hidden;
    document.getElementById("borrarBusqueda").hidden = !document.getElementById("buscador").value;
    const cantidad = Number(filtroCategoriaActivo !== "todos") + Number(filtroFechaActivo !== "todos") + Number(filtroSoloGratis);
    document.getElementById("contadorFiltrosMovil").textContent = cantidad;
    document.getElementById("contadorFiltrosMovil").hidden = !cantidad;
    document.getElementById("abrirFiltrosMovil").setAttribute("aria-label", cantidad ? `Filtros: ${cantidad} activos` : "Filtros");
}
function aplicarFiltros({ categoria, periodo, gratis, fechas }) {
    filtroCategoriaActivo = categoria;
    filtroFechaActivo = periodo;
    filtroSoloGratis = gratis;
    fechasPersonalizadas = periodo === "personalizado" ? fechas : null;
    fechaSeleccionada = "";
    filtrarEventos();
}
function limpiarTodosLosFiltros() {
    clearTimeout(temporizadorBusqueda);
    document.getElementById("buscador").value = "";
    aplicarFiltros({ categoria:"todos", periodo:"todos", gratis:false, fechas:null });
}
function ampliarFechas() {
    filtroFechaActivo = "todos";
    fechasPersonalizadas = null;
    fechaSeleccionada = "";
    filtrarEventos();
}
function abrirPanelFiltros() {
    if (!esMovilFiltros()) return;
    borradorFiltros = { categoria:filtroCategoriaActivo, periodo:filtroFechaActivo, gratis:filtroSoloGratis, fechas:fechasPersonalizadas && { ...fechasPersonalizadas } };
    const panel = document.getElementById("panelFiltrosMovil");
    panel.classList.add("abierto");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "tituloPanelFiltros");
    document.getElementById("abrirFiltrosMovil").setAttribute("aria-expanded", "true");
    document.body.classList.add("filtros-movil-abiertos");
    sincronizarControles();
    document.getElementById("cerrarFiltrosMovil").focus();
}
function cerrarPanelFiltros(aplicar = false) {
    if (!panelFiltrosAbierto()) return;
    const pendiente = borradorFiltros;
    const panel = document.getElementById("panelFiltrosMovil");
    panel.classList.remove("abierto");
    panel.removeAttribute("role"); panel.removeAttribute("aria-modal"); panel.removeAttribute("aria-labelledby");
    document.body.classList.remove("filtros-movil-abiertos");
    document.getElementById("abrirFiltrosMovil").setAttribute("aria-expanded", "false");
    borradorFiltros = null;
    if (aplicar) aplicarFiltros(pendiente);
    else sincronizarControles();
    (esMovilFiltros() ? document.getElementById("abrirFiltrosMovil") : document.getElementById("filtroCategoria")).focus();
}
function abrirDialogoFechas() {
    const fechas = borradorFiltros?.fechas || fechasPersonalizadas;
    fechasEnDialogo = fechas?.desde ? { desde:fechas.desde, hasta:fechas.hasta || fechas.desde } : { desde:"", hasta:"" };
    esperandoFinRango = false;
    const referencia = fechaLocal(fechasEnDialogo.desde) || fechaLocal(new Date());
    mesVisibleFiltro = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
    renderizarCalendarioFiltro();
    document.getElementById("dialogoFechas").showModal();
    const diaInicial = fechasEnDialogo.desde || claveFecha(new Date());
    (document.querySelector(`#calendarioFiltroFechas [data-dia-filtro="${diaInicial}"]`) || document.querySelector("#calendarioFiltroFechas [data-dia-filtro]"))?.focus();
}
function renderizarCalendarioFiltro(diaEnFoco = "") {
    const contenedor = document.getElementById("calendarioFiltroFechas");
    const año = mesVisibleFiltro.getFullYear(), mes = mesVisibleFiltro.getMonth();
    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;
    const diasMes = new Date(año, mes + 1, 0).getDate();
    const hoy = claveFecha(new Date());
    const prefijoMes = `${año}-${String(mes + 1).padStart(2, "0")}-`;
    const diaEnTab = diaEnFoco || (fechasEnDialogo.desde.startsWith(prefijoMes) ? fechasEnDialogo.desde : hoy.startsWith(prefijoMes) ? hoy : `${prefijoMes}01`);
    document.getElementById("mesVisibleFiltro").textContent = mesVisibleFiltro.toLocaleDateString("es-ES", { month:"long", year:"numeric" });
    contenedor.innerHTML = Array.from({ length:42 }, (_, indice) => {
        const numero = indice - primerDia + 1;
        if (numero < 1 || numero > diasMes) return '<span class="dialogo-fechas-vacio" aria-hidden="true"></span>';
        const dia = new Date(año, mes, numero), clave = claveFecha(dia);
        const enRango = fechasEnDialogo.desde && clave >= fechasEnDialogo.desde && clave <= fechasEnDialogo.hasta;
        const inicio = clave === fechasEnDialogo.desde, fin = clave === fechasEnDialogo.hasta;
        const nombre = dia.toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
        return `<button type="button" data-dia-filtro="${clave}" tabindex="${clave === diaEnTab ? "0" : "-1"}" class="${[enRango ? "en-rango" : "", inicio ? "rango-inicio" : "", fin ? "rango-fin" : ""].filter(Boolean).join(" ")}" aria-label="${escaparHTML(nombre)}" aria-pressed="${Boolean(enRango)}" ${clave === hoy ? 'aria-current="date"' : ""}>${numero}</button>`;
    }).join("");
    const resumen = document.getElementById("resumenRangoFechas");
    resumen.textContent = !fechasEnDialogo.desde ? "Selecciona el primer día." : esperandoFinRango
        ? `Desde el ${formatearFecha(fechasEnDialogo.desde)}. Selecciona el último día o pulsa Aplicar para un solo día.`
        : `Seleccionado: ${etiquetaPeriodo("personalizado", fechasEnDialogo)}.`;
    document.getElementById("aplicarDialogoFechas").disabled = !fechasEnDialogo.desde;
    if (diaEnFoco) contenedor.querySelector(`[data-dia-filtro="${diaEnFoco}"]`)?.focus();
}
function seleccionarDiaFiltro(clave) {
    if (!fechaLocal(clave)) return;
    if (esperandoFinRango) {
        fechasEnDialogo = clave < fechasEnDialogo.desde
            ? { desde:clave, hasta:fechasEnDialogo.desde }
            : { desde:fechasEnDialogo.desde, hasta:clave };
        esperandoFinRango = false;
    } else {
        fechasEnDialogo = { desde:clave, hasta:clave };
        esperandoFinRango = true;
    }
    renderizarCalendarioFiltro(clave);
}
function cambiarMesFiltro(cantidad) {
    mesVisibleFiltro = new Date(mesVisibleFiltro.getFullYear(), mesVisibleFiltro.getMonth() + cantidad, 1);
    renderizarCalendarioFiltro();
}
document.getElementById("abrirFiltrosMovil").addEventListener("click", abrirPanelFiltros);
document.getElementById("cerrarFiltrosMovil").addEventListener("click", () => cerrarPanelFiltros());
document.getElementById("cancelarFiltrosMovil").addEventListener("click", () => cerrarPanelFiltros());
document.getElementById("aplicarFiltrosMovil").addEventListener("click", () => cerrarPanelFiltros(true));
document.getElementById("panelFiltrosMovil").addEventListener("click", evento => { if (evento.target.id === "panelFiltrosMovil") cerrarPanelFiltros(); });
document.getElementById("filtroCategoria").addEventListener("change", evento => {
    if (borradorFiltros) borradorFiltros.categoria = evento.target.value;
    else aplicarFiltros({ categoria:evento.target.value, periodo:filtroFechaActivo, gratis:filtroSoloGratis, fechas:fechasPersonalizadas });
});
document.getElementById("filtroCuando").addEventListener("change", evento => {
    if (evento.target.value === "personalizado") { abrirDialogoFechas(); return; }
    if (borradorFiltros) { borradorFiltros.periodo = evento.target.value; borradorFiltros.fechas = null; sincronizarControles(); }
    else aplicarFiltros({ categoria:filtroCategoriaActivo, periodo:evento.target.value, gratis:filtroSoloGratis, fechas:null });
});
document.getElementById("editarFechas").addEventListener("click", abrirDialogoFechas);
document.getElementById("mesAnteriorFiltro").addEventListener("click", () => cambiarMesFiltro(-1));
document.getElementById("mesSiguienteFiltro").addEventListener("click", () => cambiarMesFiltro(1));
document.getElementById("calendarioFiltroFechas").addEventListener("click", evento => {
    const dia = evento.target.closest("[data-dia-filtro]");
    if (dia) seleccionarDiaFiltro(dia.dataset.diaFiltro);
});
document.getElementById("calendarioFiltroFechas").addEventListener("keydown", evento => {
    const boton = evento.target.closest("[data-dia-filtro]");
    if (!boton) return;
    const desplazamientos = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7 };
    const fecha = fechaLocal(boton.dataset.diaFiltro);
    let siguiente = null;
    if (Object.hasOwn(desplazamientos, evento.key)) siguiente = sumarDiasLocal(fecha, desplazamientos[evento.key]);
    if (evento.key === "Home") siguiente = sumarDiasLocal(fecha, -((fecha.getDay() + 6) % 7));
    if (evento.key === "End") siguiente = sumarDiasLocal(fecha, 6 - ((fecha.getDay() + 6) % 7));
    if (evento.key === "PageUp" || evento.key === "PageDown") {
        const otroMes = new Date(fecha.getFullYear(), fecha.getMonth() + (evento.key === "PageUp" ? -1 : 1), 1);
        siguiente = new Date(otroMes.getFullYear(), otroMes.getMonth(), Math.min(fecha.getDate(), new Date(otroMes.getFullYear(), otroMes.getMonth() + 1, 0).getDate()));
    }
    if (!siguiente) return;
    evento.preventDefault();
    mesVisibleFiltro = new Date(siguiente.getFullYear(), siguiente.getMonth(), 1);
    renderizarCalendarioFiltro(claveFecha(siguiente));
});
document.getElementById("filtroGratis").addEventListener("change", evento => {
    if (borradorFiltros) borradorFiltros.gratis = evento.target.checked;
    else aplicarFiltros({ categoria:filtroCategoriaActivo, periodo:filtroFechaActivo, gratis:evento.target.checked, fechas:fechasPersonalizadas });
});
document.getElementById("aplicarDialogoFechas").addEventListener("click", () => {
    if (!fechasEnDialogo?.desde) return;
    const fechas = { ...fechasEnDialogo };
    if (borradorFiltros) { borradorFiltros.periodo = "personalizado"; borradorFiltros.fechas = fechas; }
    else aplicarFiltros({ categoria:filtroCategoriaActivo, periodo:"personalizado", gratis:filtroSoloGratis, fechas });
    document.getElementById("dialogoFechas").close();
    sincronizarControles();
});
for (const id of ["cerrarDialogoFechas", "cancelarDialogoFechas"]) document.getElementById(id).addEventListener("click", () => document.getElementById("dialogoFechas").close());
document.getElementById("dialogoFechas").addEventListener("close", () => { sincronizarControles(); document.getElementById("filtroCuando").focus(); });
document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && panelFiltrosAbierto() && !document.getElementById("dialogoFechas").open) { evento.preventDefault(); cerrarPanelFiltros(); }
    if (evento.key !== "Tab" || !panelFiltrosAbierto() || document.getElementById("dialogoFechas").open) return;
    const controles = [...document.querySelectorAll('#panelFiltrosMovil button:not([hidden]), #panelFiltrosMovil select, #panelFiltrosMovil input:not([hidden])')].filter(elemento => !elemento.closest("[hidden]"));
    if (evento.shiftKey && document.activeElement === controles[0]) { evento.preventDefault(); controles.at(-1).focus(); }
    else if (!evento.shiftKey && document.activeElement === controles.at(-1)) { evento.preventDefault(); controles[0].focus(); }
});
matchMedia("(max-width: 700px)").addEventListener("change", () => { if (panelFiltrosAbierto() && !esMovilFiltros()) cerrarPanelFiltros(); });
document.getElementById("buscador").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    sincronizarControles();
    temporizadorBusqueda = setTimeout(buscarEventoDesplegable, 180);
});
document.getElementById("borrarBusqueda").addEventListener("click", () => { clearTimeout(temporizadorBusqueda); document.getElementById("buscador").value = ""; filtrarEventos(); document.getElementById("buscador").focus(); });
document.getElementById("filtrosActivos").addEventListener("click", evento => {
    const boton = evento.target.closest("[data-quitar-filtro]"); if (!boton) return;
    if (boton.dataset.quitarFiltro === "texto") document.getElementById("buscador").value = "";
    if (boton.dataset.quitarFiltro === "categoria") filtroCategoriaActivo = "todos";
    if (boton.dataset.quitarFiltro === "periodo") { filtroFechaActivo = "todos"; fechasPersonalizadas = null; fechaSeleccionada = ""; }
    if (boton.dataset.quitarFiltro === "gratis") filtroSoloGratis = false;
    filtrarEventos();
});
document.getElementById("limpiarFiltros").addEventListener("click", limpiarTodosLosFiltros);
document.addEventListener("click", evento => {
    if (evento.target.closest("[data-limpiar-sin-resultados]")) limpiarTodosLosFiltros();
    if (evento.target.closest("[data-ampliar-fechas]")) ampliarFechas();
});
document.getElementById("verPeriodoCompleto").addEventListener("click", ampliarFechas);

/* ========================================
   CALENDARIO (Con categorías, nombres y fines de semana)
======================================== */
function generarCalendario() {
    const calendario = document.getElementById("calendarioDias");
    const tituloMes = document.getElementById("mesActual");

    if (!calendario || !tituloMes) return;

    calendario.innerHTML = "";

    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();

    tituloMes.textContent = fechaActual.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

    let primerDia = new Date(año, mes, 1).getDay();
    primerDia = primerDia === 0 ? 6 : primerDia - 1; // Ajuste para que empiece en lunes

    const diasMes = new Date(año, mes + 1, 0).getDate();
    const hoyClave = claveFecha(new Date());

    // Espacios vacíos antes del primer día
    for (let i = 0; i < primerDia; i++) {
        // Calculamos si el hueco vacío cae en sábado (5) o domingo (6)
        const esFinDeSemana = (i === 5 || i === 6) ? "fin-de-semana" : "";
        calendario.innerHTML += `<div class="dia vacio ${esFinDeSemana}"></div>`;
    }

    // Días del mes
    for (let dia = 1; dia <= diasMes; dia++) {
        const fechaActualBucle = new Date(año, mes, dia);
        const fechaClave = claveFecha(fechaActualBucle);
        const eventosDia = eventos.filter(evento => filtrosComunes(evento) && eventoEnFecha(evento, fechaActualBucle)).sort(compararInicio);

        const diaSemana = new Date(año, mes, dia).getDay();
        const claseFinDeSemana = (diaSemana === 0 || diaSemana === 6) ? "fin-de-semana" : "";

        const clases = ["dia", claseFinDeSemana, eventosDia.length ? "evento" : "", fechaClave === hoyClave ? "es-hoy" : "", fechaClave === fechaSeleccionada ? "seleccionado" : ""].filter(Boolean).join(" ");
        const resumen = eventosDia.slice(0,2).map(e => `<a class="nombre-evento-calendario" href="evento.html?id=${encodeURIComponent(e.id)}"${ColoresEventos.estilo(ColoresEventos.categoria(e.categoria))} aria-label="Ver ${escaparHTML(e.titulo)}"><span>${e.hora ? `<time class="hora-evento-calendario">${escaparHTML(e.hora)}</time>` : ""}${escaparHTML(e.titulo)}</span></a>`).join("");
        calendario.innerHTML += `<div class="${clases}" data-fecha="${fechaClave}"><button type="button" class="dia-seleccionar" data-seleccionar-fecha="${fechaClave}" aria-pressed="${fechaClave === fechaSeleccionada}" ${fechaClave === hoyClave ? 'aria-current="date"' : ""} aria-label="Seleccionar el ${dia} de ${tituloMes.textContent}, ${eventosDia.length} eventos"><span class="numero-dia">${dia}</span></button><div class="dia-enlaces">${resumen}</div>${eventosDia.length > 2 ? `<button type="button" class="mas-eventos" data-mas-fecha="${fechaClave}" aria-label="Ver los ${eventosDia.length} eventos del ${dia} de ${tituloMes.textContent}">+${eventosDia.length - 2} más</button>` : ""}</div>`;
    }

}

/* ========================================
   EVENTOS DEL DÍA
======================================== */
let focoAntesPanelDia = null;
function abrirPanelDia(fecha) {
    const dia = fechaLocal(fecha);
    if (!dia) return;
    focoAntesPanelDia = document.activeElement;
    fechaSeleccionada = claveFecha(dia);
    filtroFechaActivo = "personalizado";
    fechasPersonalizadas = { desde:fechaSeleccionada, hasta:fechaSeleccionada };
    filtrarEventos();
    const lista = eventos.filter(evento => filtrosComunes(evento) && eventoEnFecha(evento, dia))
        .sort((a, b) => String(a.hora || "99:99").localeCompare(String(b.hora || "99:99"), "es"));
    const fondo = document.getElementById("panelDiaFondo");
    document.getElementById("panelDiaTitulo").textContent = dia.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("panelDiaLista").innerHTML = lista.length ? lista.map(evento => `<article class="panel-dia-evento">
        <time>${escaparHTML(evento.hora ? `${evento.hora}${evento.horaFin ? ` – ${evento.horaFin}` : ""}` : "Sin horario")}</time>
        <div><span class="categoria">${escaparHTML(categoriaLegible(evento.categoria))}</span><h3><a href="evento.html?id=${encodeURIComponent(evento.id)}">${escaparHTML(evento.titulo)}</a></h3>${evento.estadoActividad && evento.estadoActividad !== "programado" ? `<strong class="estado-actividad ${escaparHTML(evento.estadoActividad)}">${evento.estadoActividad === "cancelado" ? "Cancelado" : "Aplazado"}</strong>` : ""}</div>
      </article>`).join("") : '<p class="panel-dia-vacio">No hay eventos para este día con los filtros activos.</p>';
    fondo.hidden = false;
    document.body.classList.add("panel-dia-abierto");
    document.getElementById("cerrarPanelDia").focus();
}
function cerrarPanelDia() {
    const fondo = document.getElementById("panelDiaFondo");
    if (!fondo || fondo.hidden) return;
    fondo.hidden = true;
    document.body.classList.remove("panel-dia-abierto");
    if (focoAntesPanelDia?.isConnected) focoAntesPanelDia.focus();
    else (document.querySelector(`#calendarioDias [data-mas-fecha="${fechaSeleccionada}"]`) || document.querySelector(`#calendarioDias [data-seleccionar-fecha="${fechaSeleccionada}"]`))?.focus();
}
document.getElementById("calendarioDias")?.addEventListener("click", evento => {
    if (evento.target.closest("a.nombre-evento-calendario")) { evento.stopPropagation(); return; }
    const mas = evento.target.closest("[data-mas-fecha]");
    if (mas) { evento.stopPropagation(); abrirPanelDia(mas.dataset.masFecha); return; }
    const dia = evento.target.closest("[data-seleccionar-fecha], .dia[data-fecha]");
    if (!dia) return;
    const fecha = dia.dataset.seleccionarFecha || dia.dataset.fecha;
    fechaSeleccionada = fecha;
    filtroFechaActivo = "personalizado";
    fechasPersonalizadas = { desde:fecha, hasta:fecha };
    filtrarEventos();
});
document.getElementById("cerrarPanelDia")?.addEventListener("click", cerrarPanelDia);
document.getElementById("panelDiaFondo")?.addEventListener("click", evento => { if (evento.target === evento.currentTarget) cerrarPanelDia(); });
document.addEventListener("keydown", evento => {
    const fondo = document.getElementById("panelDiaFondo");
    if (evento.key === "Escape" && fondo && !fondo.hidden) cerrarPanelDia();
    if (evento.key === "Tab" && fondo && !fondo.hidden) {
        const elementos = [...fondo.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')];
        if (!elementos.length) return;
        const primero = elementos[0], ultimo = elementos[elementos.length - 1];
        if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }
});

/* ========================================
   AGENDA IMPRIMIBLE
======================================== */
function rangoAgendaImprimible() {
    const referencia = fechaLocal(document.getElementById("agendaFechaPeriodo")?.value) || fechaLocal(new Date());
    if (document.getElementById("agendaTipoPeriodo")?.value === "mes") {
        return { desde: new Date(referencia.getFullYear(), referencia.getMonth(), 1), hasta: new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0) };
    }
    const lunes = sumarDiasLocal(referencia, -((referencia.getDay() + 6) % 7));
    return { desde: lunes, hasta: sumarDiasLocal(lunes, 6) };
}
function precioEvento(evento) {
    return String(evento.precio || "").trim() || (evento.tipoPrecio === "gratis" ? "Gratis" : evento.tipoPrecio === "pago" ? "De pago" : "");
}
function actualizarAgendaImprimible() {
    const contenedor = document.getElementById("agendaImprimible");
    if (!contenedor) return;
    const { desde, hasta } = rangoAgendaImprimible();
    const periodo = desde.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + (claveFecha(desde) === claveFecha(hasta) ? "" : ` – ${hasta.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`);
    const lista = eventos.filter(evento => eventoCoincidePeriodo(evento, desde, hasta)).sort(compararInicio);
    contenedor.innerHTML = `<header class="agenda-impresion-cabecera"><p>AYUNTAMIENTO DE GILENA</p><h1>Agenda Municipal de Gilena</h1><strong>${escaparHTML(periodo)}</strong></header>${lista.length ? `<div class="agenda-impresion-lista">${lista.map(evento => {
        const horario = evento.hora ? `${evento.hora}${evento.horaFin ? ` – ${evento.horaFin}` : ""}` : "";
        const precio = precioEvento(evento);
        const estado = evento.estadoActividad && evento.estadoActividad !== "programado" ? `<strong class="agenda-estado ${escaparHTML(evento.estadoActividad)}">${evento.estadoActividad === "cancelado" ? "Cancelado" : "Aplazado"}</strong>` : "";
        return `<article class="agenda-impresion-evento"><div class="agenda-fecha"><i class="fa-regular fa-calendar" aria-hidden="true"></i><strong>${escaparHTML(formatearFechaTarjeta(evento.fecha, evento.fechaFin))}</strong></div><h2>${escaparHTML(evento.titulo)}</h2>${estado}<dl>${horario ? `<div><dt>Horario</dt><dd>${escaparHTML(horario)}</dd></div>` : ""}${evento.lugar ? `<div><dt>Lugar</dt><dd>${escaparHTML(evento.lugar)}</dd></div>` : ""}${precio ? `<div><dt>Precio</dt><dd>${escaparHTML(precio)}</dd></div>` : ""}</dl></article>`;
    }).join("")}</div>` : '<p class="agenda-sin-eventos">No hay eventos publicados que coincidan con este período.</p>'}`;
    const imprimir = document.getElementById("imprimirAgenda");
    imprimir.disabled = lista.length === 0;
    imprimir.title = lista.length ? "" : "No hay eventos para imprimir en este período";
}
function abrirAgendaImprimible() {
    const fondo = document.getElementById("agendaImpresionFondo");
    document.getElementById("agendaFechaPeriodo").value = claveFecha(new Date());
    actualizarAgendaImprimible();
    fondo.hidden = false;
    document.body.classList.add("agenda-impresion-abierta");
    document.getElementById("cerrarAgendaImprimible").focus();
}
function cerrarAgendaImprimible() {
    const fondo = document.getElementById("agendaImpresionFondo");
    if (!fondo || fondo.hidden) return;
    fondo.hidden = true;
    document.body.classList.remove("agenda-impresion-abierta");
    document.getElementById("abrirAgendaImprimible")?.focus();
}
document.getElementById("abrirAgendaImprimible")?.addEventListener("click", abrirAgendaImprimible);
document.getElementById("cerrarAgendaImprimible")?.addEventListener("click", cerrarAgendaImprimible);
document.getElementById("agendaImpresionFondo")?.addEventListener("click", evento => { if (evento.target === evento.currentTarget) cerrarAgendaImprimible(); });
document.getElementById("agendaTipoPeriodo")?.addEventListener("change", actualizarAgendaImprimible);
document.getElementById("agendaFechaPeriodo")?.addEventListener("change", actualizarAgendaImprimible);
document.getElementById("imprimirAgenda")?.addEventListener("click", () => window.print());
document.addEventListener("keydown", evento => { if (evento.key === "Escape" && !document.getElementById("agendaImpresionFondo")?.hidden) cerrarAgendaImprimible(); });

/* ========================================
   CAMBIAR MES
======================================== */
function mesAnterior() {
    fechaActual.setMonth(fechaActual.getMonth() - 1);
    generarCalendario();
    guardarEstadoAgenda();
}

function mesSiguiente() {
    fechaActual.setMonth(fechaActual.getMonth() + 1);
    generarCalendario();
    guardarEstadoAgenda();
}

function irAHoy() {
    const hoy = new Date();
    fechaActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    generarCalendario();
    guardarEstadoAgenda();
}

/* ========================================
   INICIAR PÁGINA (Se ejecuta al cargar)
======================================== */
const selectorCategoria = document.getElementById("filtroCategoria");
if (selectorCategoria && window.AjustesGilena) selectorCategoria.value = AjustesGilena.obtener().categoria;
TarjetasEvento.iniciarVista(document.getElementById("eventos"), [document.getElementById("listaEventos"), document.getElementById("listaEventosAnteriores")]);
const scrollRestaurado = restaurarEstadoAgenda();

document.addEventListener("ajustes:cambio", evento => {
    if (["categoria", "restablecer"].includes(evento.detail.clave) && selectorCategoria) {
        filtroCategoriaActivo = evento.detail.ajustes.categoria;
        selectorCategoria.value = filtroCategoriaActivo;
        filtrarEventos();
    }
});
filtrarEventos();
generarCalendario();
if (scrollRestaurado) requestAnimationFrame(() => window.scrollTo({ top:scrollRestaurado, behavior:"auto" }));

// Actualizamos el contador de estadísticas
const elementoTotal = document.getElementById("totalEventos");
if (elementoTotal) {
    elementoTotal.textContent = eventos.length;
}
