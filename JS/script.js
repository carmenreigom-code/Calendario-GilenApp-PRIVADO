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
    const lunes = sumarDiasLocal(hoy, -((hoy.getDay() + 6) % 7));
    if (filtroFechaActivo === "semana") return { desde: lunes, hasta: sumarDiasLocal(lunes, 6) };
    if (filtroFechaActivo === "fin-semana") {
        const sabado = sumarDiasLocal(lunes, 5);
        return { desde: sabado, hasta: sumarDiasLocal(sabado, 1) };
    }
    return null;
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
    return { texto:document.getElementById("buscador")?.value || "", categoria:document.getElementById("filtroCategoria")?.value || "todos", periodo:filtroFechaActivo, gratis:filtroSoloGratis, mes:`${fechaActual.getFullYear()}-${String(fechaActual.getMonth()+1).padStart(2,"0")}`, dia:fechaSeleccionada, scrollY:window.scrollY };
}
function guardarEstadoAgenda() {
    try { sessionStorage.setItem(CLAVE_ESTADO_AGENDA, JSON.stringify(estadoAgenda())); } catch {}
    const estado = estadoAgenda(), url = new URL(location.href);
    ["q","categoria","periodo","gratis","mes","dia","restaurar"].forEach(k => url.searchParams.delete(k));
    if (estado.texto.trim()) url.searchParams.set("q", estado.texto.trim());
    if (estado.categoria !== "todos") url.searchParams.set("categoria", estado.categoria);
    if (estado.periodo !== "todos") url.searchParams.set("periodo", estado.periodo);
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
    document.getElementById("filtroCategoria").value = valor("categoria", guardado.categoria || document.getElementById("filtroCategoria").value || "todos");
    filtroFechaActivo = valor("periodo", guardado.periodo || "todos");
    filtroSoloGratis = valor("gratis", guardado.gratis ? "1" : "") === "1";
    const mes = valor("mes", guardado.mes || ""); if (/^\d{4}-\d{2}$/.test(mes)) fechaActual = new Date(Number(mes.slice(0,4)), Number(mes.slice(5))-1, 1);
    fechaSeleccionada = valor("dia", guardado.dia || "");
    document.querySelectorAll("[data-filtro-fecha]").forEach(b => { const activo=b.dataset.filtroFecha===filtroFechaActivo; b.classList.toggle("activo",activo); b.setAttribute("aria-pressed",String(activo)); });
    document.getElementById("filtroGratis")?.classList.toggle("activo", filtroSoloGratis);
    document.getElementById("filtroGratis")?.setAttribute("aria-pressed", String(filtroSoloGratis));
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
        if (idMensaje === "sinResultados") mensaje.innerHTML = `${fechaSeleccionada ? 'No hay eventos para este día con los filtros activos.' : 'No hay próximos eventos que coincidan con los filtros.'} <button type="button" data-limpiar-sin-resultados>Quitar filtros</button>`;
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
    const categoria = document.getElementById("filtroCategoria")?.value || "todos";
    const texto = document.getElementById("buscador")?.value.trim().toLocaleLowerCase("es") || "";
    const periodo = periodoSeleccionado();
    const contenido = `${evento.titulo || ""} ${evento.subtitulo || ""} ${evento.etiquetas || ""} ${evento.descripcion || ""} ${evento.lugar || ""}`.toLocaleLowerCase("es");
    return (categoria === "todos" || evento.categoria === categoria)
        && (!texto || contenido.includes(texto))
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
    const texto = document.getElementById("buscador").value.toLowerCase().trim();
    const cajaResultados = document.getElementById("resultadosBusqueda");
    filtrarEventos();

    // Si está vacío, ocultamos la caja
    if (texto.length === 0) {
        cajaResultados.style.display = "none";
        return;
    }

    const coincidencias = eventos.filter(evento => filtrosComunes(evento) && (!fechaSeleccionada || eventoEnFecha(evento, fechaSeleccionada))).slice(0, 8);

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
    activarImagenesFallback(cajaResultados);
}

// Cerrar el buscador flotante si hacemos clic fuera
document.addEventListener("click", function(event) {
    const buscador = document.querySelector(".campo-busqueda");
    const cajaResultados = document.getElementById("resultadosBusqueda");
    
    // Verificamos que la caja de resultados exista antes de ocultarla
    if (buscador && cajaResultados && !buscador.contains(event.target)) {
        cajaResultados.style.display = "none";
    }
});

/* ========================================
   FILTROS COMBINADOS Y PRÓXIMOS/ANTERIORES
======================================== */
function filtrarEventos() {
    const selectCategoria = document.getElementById("filtroCategoria");
    if (!selectCategoria) return;
    const ahora = new Date();
    const filtrados = eventos.filter(evento => filtrosComunes(evento) && (!fechaSeleccionada || eventoEnFecha(evento, fechaSeleccionada)));
    const proximos = filtrados.filter(evento => {
        const final = finalEvento(evento);
        return final && (fechaSeleccionada || final >= ahora);
    }).sort(compararInicio);
    const anteriores = filtrados.filter(evento => {
        const final = finalEvento(evento);
        return !fechaSeleccionada && final && final < ahora;
    })
        .sort((a, b) => (finalEvento(b)?.getTime() || 0) - (finalEvento(a)?.getTime() || 0));

    mostrarEventos(proximos, "listaEventos", "sinResultados");
    mostrarEventos(anteriores, "listaEventosAnteriores", "sinResultadosAnteriores");
    const contadorAnteriores = document.getElementById("contadorAnteriores");
    if (contadorAnteriores) contadorAnteriores.textContent = `(${anteriores.length})`;
    const resumen = document.getElementById("resumenFiltros");
    if (resumen) resumen.textContent = `${filtrados.length} ${filtrados.length === 1 ? "resultado" : "resultados"}${fechaSeleccionada ? ' para el día seleccionado' : `: ${proximos.length} ${proximos.length === 1 ? 'próximo' : 'próximos'} y ${anteriores.length} ${anteriores.length === 1 ? 'anterior' : 'anteriores'}`}`;
    const limpiar = document.getElementById("limpiarFiltros");
    const textoBusqueda = document.getElementById("buscador")?.value.trim() || "";
    const sinFiltros = filtroFechaActivo === "todos" && !filtroSoloGratis && selectCategoria.value === "todos" && !textoBusqueda && !fechaSeleccionada;
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
        if (selectCategoria.value !== "todos") activos.push(["categoria", selectCategoria.options[selectCategoria.selectedIndex]?.text || selectCategoria.value]);
        if (filtroFechaActivo !== "todos") activos.push(["periodo", ({hoy:"Hoy",semana:"Esta semana","fin-semana":"Este fin de semana"})[filtroFechaActivo]]);
        if (filtroSoloGratis) activos.push(["gratis", "Gratis"]);
        if (fechaSeleccionada) activos.push(["dia", formatearFecha(fechaSeleccionada)]);
        chips.innerHTML = activos.map(([clave,etiqueta]) => `<button type="button" data-quitar-filtro="${clave}" aria-label="Quitar filtro ${escaparHTML(etiqueta)}">${escaparHTML(etiqueta)} <span aria-hidden="true">×</span></button>`).join("");
        chips.hidden = !activos.length;
    }
    generarCalendario();
    document.getElementById("resultadosBusqueda").style.display = "none";
    guardarEstadoAgenda();
}

document.getElementById("filtrosActivos")?.addEventListener("click", evento => {
    const boton = evento.target.closest("[data-quitar-filtro]"); if (!boton) return;
    if (boton.dataset.quitarFiltro === "texto") document.getElementById("buscador").value = "";
    if (boton.dataset.quitarFiltro === "categoria") document.getElementById("filtroCategoria").value = "todos";
    if (boton.dataset.quitarFiltro === "periodo") filtroFechaActivo = "todos";
    if (boton.dataset.quitarFiltro === "gratis") filtroSoloGratis = false;
    if (boton.dataset.quitarFiltro === "dia") fechaSeleccionada = "";
    document.querySelectorAll("[data-filtro-fecha]").forEach(b => { const activo=b.dataset.filtroFecha===filtroFechaActivo; b.classList.toggle("activo",activo); b.setAttribute("aria-pressed",String(activo)); });
    document.getElementById("filtroGratis").classList.toggle("activo", filtroSoloGratis);
    document.getElementById("filtroGratis").setAttribute("aria-pressed", String(filtroSoloGratis));
    filtrarEventos();
});

document.querySelectorAll("[data-filtro-fecha]").forEach(boton => {
    boton.addEventListener("click", () => {
        filtroFechaActivo = boton.dataset.filtroFecha;
        document.querySelectorAll("[data-filtro-fecha]").forEach(opcion => {
            const activo = opcion === boton;
            opcion.classList.toggle("activo", activo);
            opcion.setAttribute("aria-pressed", String(activo));
        });
        filtrarEventos();
    });
});
document.getElementById("filtroGratis")?.addEventListener("click", evento => {
    filtroSoloGratis = !filtroSoloGratis;
    evento.currentTarget.classList.toggle("activo", filtroSoloGratis);
    evento.currentTarget.setAttribute("aria-pressed", String(filtroSoloGratis));
    filtrarEventos();
});
document.getElementById("limpiarFiltros")?.addEventListener("click", () => {
    filtroFechaActivo = "todos";
    filtroSoloGratis = false;
    fechaSeleccionada = "";
    document.getElementById("buscador").value = "";
    document.getElementById("filtroCategoria").value = "todos";
    document.getElementById("filtroGratis").classList.remove("activo");
    document.getElementById("filtroGratis").setAttribute("aria-pressed", "false");
    document.querySelectorAll("[data-filtro-fecha]").forEach(opcion => {
        const activo = opcion.dataset.filtroFecha === "todos";
        opcion.classList.toggle("activo", activo);
        opcion.setAttribute("aria-pressed", String(activo));
    });
    document.getElementById("resultadosBusqueda").style.display = "none";
    filtrarEventos();
});
document.addEventListener("click", evento => { if (evento.target.closest("[data-limpiar-sin-resultados]")) document.getElementById("limpiarFiltros")?.click(); });
document.getElementById("verPeriodoCompleto")?.addEventListener("click", () => { fechaSeleccionada = ""; filtrarEventos(); });

document.getElementById("filtroCategoria")?.addEventListener("change", filtrarEventos);

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
        const primerEvento = eventosDia[0];

        const diaSemana = new Date(año, mes, dia).getDay();
        const claseFinDeSemana = (diaSemana === 0 || diaSemana === 6) ? "fin-de-semana" : "";

        const clases = ["dia", claseFinDeSemana, eventosDia.length ? "evento" : "", primerEvento?.categoria || "", fechaClave === hoyClave ? "es-hoy" : "", fechaClave === fechaSeleccionada ? "seleccionado" : ""].filter(Boolean).join(" ");
        const resumen = eventosDia.length
            ? eventosDia.slice(0,2).map(e => `<span class="nombre-evento-calendario"${ColoresEventos.estilo(ColoresEventos.categoria(e.categoria))}>${e.hora ? `<time class="hora-evento-calendario">${escaparHTML(e.hora)}</time>` : ""}<span>${escaparHTML(e.titulo)}</span></span>`).join("") + (eventosDia.length > 2 ? `<span class="mas-eventos">+${eventosDia.length - 2} más</span>` : "")
            : "";
        calendario.innerHTML += `<button type="button" class="${clases}" data-fecha="${fechaClave}" aria-pressed="${fechaClave === fechaSeleccionada}" ${fechaClave === hoyClave ? 'aria-current="date"' : ""} aria-label="${eventosDia.length ? `${eventosDia.length} eventos` : "Sin eventos"} el ${dia} de ${tituloMes.textContent}"><span class="numero-dia">${dia}</span>${resumen}</button>`;
    }

}

/* ========================================
   EVENTOS DEL DÍA
======================================== */
let focoAntesPanelDia = null;
function abrirPanelDia(fecha) {
    const dia = fechaLocal(fecha);
    if (!dia) return;
    fechaSeleccionada = claveFecha(dia);
    filtrarEventos();
    const lista = eventos.filter(evento => filtrosComunes(evento) && eventoEnFecha(evento, dia))
        .sort((a, b) => String(a.hora || "99:99").localeCompare(String(b.hora || "99:99"), "es"));
    const fondo = document.getElementById("panelDiaFondo");
    document.getElementById("panelDiaTitulo").textContent = dia.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    document.getElementById("panelDiaLista").innerHTML = lista.length ? lista.map(evento => `<article class="panel-dia-evento">
        <time>${escaparHTML(evento.hora ? `${evento.hora}${evento.horaFin ? ` – ${evento.horaFin}` : ""}` : "Sin horario")}</time>
        <div><span class="categoria">${escaparHTML(categoriaLegible(evento.categoria))}</span><h3>${escaparHTML(evento.titulo)}</h3>${evento.estadoActividad && evento.estadoActividad !== "programado" ? `<strong class="estado-actividad ${escaparHTML(evento.estadoActividad)}">${evento.estadoActividad === "cancelado" ? "Cancelado" : "Aplazado"}</strong>` : ""}</div>
        <a href="evento.html?id=${encodeURIComponent(evento.id)}">Ver detalle <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </article>`).join("") : '<p class="panel-dia-vacio">No hay eventos para este día con los filtros activos.</p>';
    focoAntesPanelDia = document.activeElement;
    fondo.hidden = false;
    document.body.classList.add("panel-dia-abierto");
    document.getElementById("cerrarPanelDia").focus();
}
function cerrarPanelDia() {
    const fondo = document.getElementById("panelDiaFondo");
    if (!fondo || fondo.hidden) return;
    fondo.hidden = true;
    document.body.classList.remove("panel-dia-abierto");
    focoAntesPanelDia?.focus?.();
}
document.getElementById("calendarioDias")?.addEventListener("click", evento => {
    const boton = evento.target.closest("[data-fecha]");
    if (boton) abrirPanelDia(boton.dataset.fecha);
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
const scrollRestaurado = restaurarEstadoAgenda();

document.addEventListener("ajustes:cambio", evento => {
    if (["categoria", "restablecer"].includes(evento.detail.clave) && selectorCategoria) {
        selectorCategoria.value = evento.detail.ajustes.categoria;
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
