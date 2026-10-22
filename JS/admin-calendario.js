// Calendario de gestión: trabaja únicamente con la colección municipal `eventos`.
const calendarioAdmin = { mes: new Date(new Date().getFullYear(), new Date().getMonth(), 1), arrastre: null, temporizador: null, zona: "", deshacer: null };
const claveDia = fecha => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
const diaUTC = valor => { const [a, m, d] = valor.split("-").map(Number); return Date.UTC(a, m - 1, d); };
const diferenciaDias = (desde, hasta) => Math.round((diaUTC(hasta) - diaUTC(desde)) / 86400000);
const desplazarDia = (valor, dias) => { const fecha = new Date(diaUTC(valor)); fecha.setUTCDate(fecha.getUTCDate() + dias); return fecha.toISOString().slice(0, 10); };
const fechaLarga = valor => fechaValida(valor) ? new Date(`${valor}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "Sin fecha";

function moverDatosEvento(evento, dias) {
    return {
        ...evento,
        fecha: desplazarDia(evento.fecha, dias),
        fechaFin: fechaValida(evento.fechaFin) ? desplazarDia(evento.fechaFin, dias) : evento.fechaFin,
        programa: Array.isArray(evento.programa) ? evento.programa.map(item => ({
            ...item,
            ...(fechaValida(item.fecha) ? { fecha: desplazarDia(item.fecha, dias) } : {})
        })) : evento.programa,
        sesiones: Array.isArray(evento.sesiones) ? evento.sesiones.map(item => ({...item, ...(fechaValida(item.fecha) ? {fecha:desplazarDia(item.fecha,dias)} : {})})) : evento.sesiones
    };
}
function guardarMovimiento(id, origen, destino) {
    const indice = eventosAdmin.findIndex(evento => String(evento.id) === String(id));
    const actual = eventosAdmin[indice];
    if (!actual || !fechaValida(actual.fecha) || !fechaValida(origen) || !fechaValida(destino)) return false;
    if (actual.fecha!==origen) { notificar("El evento ha cambiado de fecha. Revisa el calendario antes de moverlo.","error"); return false; }
    const dias = diferenciaDias(origen, destino);
    if (!dias) return false;
    const anterior = structuredClone(actual);
    const nuevo = moverDatosEvento(actual, dias);
    if (!guardarColeccion(eventosAdmin.map((evento, posicion) => posicion === indice ? nuevo : evento))) {
        renderizarCalendarioAdmin();
        return false;
    }
    calendarioAdmin.deshacer = { id: String(id), anterior, guardado: JSON.stringify(eventosAdmin.find(e=>String(e.id)===String(id))) };
    mostrarResultadoMovimiento(`«${nuevo.titulo || "Sin título"}»: ${fechaLarga(anterior.fecha)}${anterior.fechaFin ? ` a ${fechaLarga(anterior.fechaFin)}` : ""} → ${fechaLarga(nuevo.fecha)}${nuevo.fechaFin ? ` a ${fechaLarga(nuevo.fechaFin)}` : ""}.`, true);
    refrescarAdmin();
    return true;
}
function mostrarResultadoMovimiento(texto, permitirDeshacer = false) {
    const resultado = campo("calResultado");
    resultado.hidden = false;
    resultado.replaceChildren(document.createTextNode(texto));
    if (permitirDeshacer) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "btn-secundario";
        boton.textContent = "Deshacer";
        boton.addEventListener("click", deshacerMovimiento);
        resultado.append(boton);
    }
}
function deshacerMovimiento() {
    const movimiento = calendarioAdmin.deshacer;
    if (!movimiento) return;
    const indice = eventosAdmin.findIndex(evento => String(evento.id) === movimiento.id);
    if (indice < 0 || JSON.stringify(eventosAdmin[indice]) !== movimiento.guardado) {
        calendarioAdmin.deshacer = null;
        mostrarResultadoMovimiento("No se puede deshacer: el evento ha cambiado después del movimiento.");
        return;
    }
    if (!guardarColeccion(eventosAdmin.map((evento, posicion) => posicion === indice ? movimiento.anterior : evento))) return;
    calendarioAdmin.deshacer = null;
    refrescarAdmin();
    mostrarResultadoMovimiento(`Se han restaurado las fechas de «${movimiento.anterior.titulo || "Sin título"}».`);
}
function eventosFiltradosCalendario() {
    const estado = campo("calFiltroEstado").value;
    const categoria = campo("calFiltroCategoria").value;
    return eventosAdmin.filter(evento => fechaValida(evento.fecha) &&
        (estado === "todos" || estado === "activos" && estadoPublicacion(evento) !== "archivado" || estadoPublicacion(evento) === estado) &&
        (categoria === "todos" || evento.categoria === categoria));
}
function renderizarCalendarioAdmin() {
    const selector = campo("calFiltroCategoria");
    if (!selector) return;
    const seleccion = selector.value;
    const categorias = [...new Set(eventosAdmin.map(evento => evento.categoria).filter(Boolean))].sort();
    selector.innerHTML = '<option value="todos">Todas</option>' + categorias.map(c => `<option value="${escaparHTML(c)}">${escaparHTML(categoriaTexto(c))}</option>`).join("");
    selector.value = categorias.includes(seleccion) ? seleccion : "todos";
    const mes = calendarioAdmin.mes;
    campo("calTituloMes").textContent = mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - (primero.getDay() + 6) % 7);
    const eventos = eventosFiltradosCalendario();
    const dias = Array.from({ length: 42 }, (_, indice) => {
        const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
        const clave = claveDia(fecha);
        const dentro = fecha.getMonth() === mes.getMonth();
        const delDia = eventos.filter(evento => evento.fecha <= clave && (evento.fechaFin && fechaValida(evento.fechaFin) ? evento.fechaFin : evento.fecha) >= clave);
        return `<div class="cms-calendar-day${dentro ? "" : " fuera"}${clave === claveDia(new Date()) ? " hoy" : ""}" data-dia="${clave}" aria-label="${escaparHTML(fechaLarga(clave))}"><div class="cms-calendar-day-header"><strong>${fecha.getDate()}</strong><span>${delDia.length ? `${delDia.length} evento${delDia.length === 1 ? "" : "s"}` : ""}</span></div><div class="cms-calendar-events">${delDia.map(evento => `<button class="cms-calendar-event ${escaparHTML(estadoPublicacion(evento))}" type="button" data-id="${escaparHTML(evento.id)}" data-origen="${clave}" title="${escaparHTML(evento.titulo || "Sin título")}"><span class="cms-calendar-event-title">${escaparHTML(evento.titulo || "Sin título")}</span><span class="cms-status ${escaparHTML(estadoPublicacion(evento))}">${nombreEstado(evento)}</span></button>`).join("")}</div></div>`;
    });
    campo("calCuadricula").innerHTML = '<div class="cms-calendar-weekdays">' + ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => `<span>${d}</span>`).join("") + '</div><div class="cms-calendar-days">' + dias.join("") + "</div>";
}
function cambiarMesAdmin(diferencia) {
    calendarioAdmin.mes = new Date(calendarioAdmin.mes.getFullYear(), calendarioAdmin.mes.getMonth() + diferencia, 1);
    renderizarCalendarioAdmin();
}
let focoAntesModalCalendario = null;
function cerrarModalCalendario() { campo("calModal").hidden = true; campo("calModalAcciones").replaceChildren(); focoAntesModalCalendario?.focus?.(); focoAntesModalCalendario = null; }
function abrirEventoCalendario(id) {
    const evento = eventosAdmin.find(item => String(item.id) === String(id));
    if (!evento) return;
    focoAntesModalCalendario = document.activeElement;
    campo("calModalTitulo").textContent = evento.titulo || "Sin título";
    campo("calModalDetalle").textContent = `${fechaLarga(evento.fecha)}${evento.fechaFin ? ` a ${fechaLarga(evento.fechaFin)}` : ""} · ${nombreEstado(evento)} · ${categoriaTexto(evento.categoria)}`;
    const acciones = campo("calModalAcciones");
    acciones.replaceChildren();
    const editar = document.createElement("button");
    editar.type = "button"; editar.className = "btn-secundario"; editar.textContent = "Editar";
    editar.addEventListener("click", () => { cerrarModalCalendario(); cargarEvento(id); });
    const cambiar = document.createElement("button");
    cambiar.type = "button"; cambiar.className = "btn-primario"; cambiar.textContent = "Cambiar fecha";
    cambiar.addEventListener("click", () => abrirCambioFecha(id));
    acciones.append(editar, cambiar);
    campo("calModal").hidden = false;
    cambiar.focus();
}
function abrirCambioFecha(id) {
    const evento = eventosAdmin.find(item => String(item.id) === String(id));
    if (!evento) return;
    campo("calModalDetalle").textContent = `Fecha actual: ${fechaLarga(evento.fecha)}${evento.fechaFin ? ` a ${fechaLarga(evento.fechaFin)}` : ""}. Elige la nueva fecha inicial; se conservará la duración y las horas.`;
    const acciones = campo("calModalAcciones");
    acciones.replaceChildren();
    const etiqueta = document.createElement("label");
    etiqueta.textContent = "Nueva fecha inicial ";
    const entrada = document.createElement("input");
    entrada.type = "date"; entrada.required = true; entrada.value = evento.fecha;
    etiqueta.append(entrada);
    const boton = document.createElement("button");
    boton.type = "button"; boton.className = "btn-primario"; boton.textContent = "Revisar cambio";
    boton.addEventListener("click", async () => {
        if (!fechaValida(entrada.value)) { entrada.setCustomValidity("Elige una fecha válida."); entrada.reportValidity(); return; }
        entrada.setCustomValidity("");
        const dias = diferenciaDias(evento.fecha, entrada.value);
        if (!dias) { notificar("La fecha elegida es la actual."); return; }
        const nuevo = moverDatosEvento(evento, dias);
        cerrarModalCalendario();
        if (await confirmarAccion("Confirmar cambio de fecha", `«${evento.titulo || "Sin título"}»: ${fechaLarga(evento.fecha)}${evento.fechaFin ? ` a ${fechaLarga(evento.fechaFin)}` : ""} → ${fechaLarga(nuevo.fecha)}${nuevo.fechaFin ? ` a ${fechaLarga(nuevo.fechaFin)}` : ""}. ¿Guardar el cambio?`, "Guardar fecha")) guardarMovimiento(id, evento.fecha, nuevo.fecha);
    });
    acciones.append(etiqueta, boton);
    entrada.focus();
}
function cancelarTemporizadorMes() { clearTimeout(calendarioAdmin.temporizador); calendarioAdmin.temporizador = null; calendarioAdmin.zona = ""; }
function terminarArrastre() {
    cancelarTemporizadorMes();
    calendarioAdmin.arrastre = null;
    campo("calSuperficie").classList.remove("arrastrando");
    document.querySelectorAll(".cms-calendar-day.destino").forEach(dia => dia.classList.remove("destino"));
    campo("calBordeAnterior").classList.remove("activo");
    campo("calBordeSiguiente").classList.remove("activo");
    campo("calVistaMovimiento")?.remove();
}
function objetivoArrastre(x, y) {
    const elemento = document.elementFromPoint(x, y);
    return { dia: elemento?.closest("[data-dia]")?.dataset.dia || "", zona: elemento?.closest(".cms-calendar-edge")?.id || "" };
}
function actualizarArrastre(x, y) {
    const arrastre = calendarioAdmin.arrastre;
    if (!arrastre) return;
    const { dia, zona } = objetivoArrastre(x, y);
    document.querySelectorAll(".cms-calendar-day.destino").forEach(item => item.classList.remove("destino"));
    if (dia) campo("calCuadricula").querySelector(`[data-dia="${dia}"]`)?.classList.add("destino");
    ["calBordeAnterior", "calBordeSiguiente"].forEach(id => campo(id).classList.toggle("activo", id === zona));
    arrastre.destino = dia;
    if (zona !== calendarioAdmin.zona) {
        cancelarTemporizadorMes();
        calendarioAdmin.zona = zona;
        if (zona) calendarioAdmin.temporizador = setTimeout(() => {
            cambiarMesAdmin(zona === "calBordeAnterior" ? -1 : 1);
            // El capturador de puntero permanece fuera de la cuadrícula regenerada.
            calendarioAdmin.temporizador = setTimeout(function repetir() {
                if (calendarioAdmin.arrastre && calendarioAdmin.zona === zona) {
                    cambiarMesAdmin(zona === "calBordeAnterior" ? -1 : 1);
                    calendarioAdmin.temporizador = setTimeout(repetir, 850);
                }
            }, 850);
        }, 850);
    }
    const evento = eventosAdmin.find(item => String(item.id) === arrastre.id);
    const vista = campo("calVistaMovimiento");
    if (evento && vista) {
        if (dia) {
            const nuevo = moverDatosEvento(evento, diferenciaDias(arrastre.origen, dia));
            vista.textContent = `${evento.titulo || "Sin título"}: ${fechaLarga(evento.fecha)} → ${fechaLarga(nuevo.fecha)}${nuevo.fechaFin ? ` a ${fechaLarga(nuevo.fechaFin)}` : ""}`;
        } else vista.textContent = zona ? "Mantén aquí para cambiar de mes" : "Suelta sobre un día válido";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    campo("calMesAnterior").addEventListener("click", () => cambiarMesAdmin(-1));
    campo("calMesSiguiente").addEventListener("click", () => cambiarMesAdmin(1));
    campo("calHoy").addEventListener("click", () => { calendarioAdmin.mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderizarCalendarioAdmin(); });
    ["calFiltroEstado", "calFiltroCategoria"].forEach(id => campo(id).addEventListener("change", renderizarCalendarioAdmin));
    campo("calCuadricula").addEventListener("click", evento => { const boton = evento.target.closest("[data-id]"); if (boton && !calendarioAdmin.ignorarClick) abrirEventoCalendario(boton.dataset.id); calendarioAdmin.ignorarClick = false; });
    const superficie = campo("calSuperficie");
    superficie.addEventListener("pointerdown", evento => {
        if (evento.pointerType !== "mouse" || evento.button !== 0) return;
        const boton = evento.target.closest("[data-id]");
        if (!boton) return;
        calendarioAdmin.arrastre = { id: boton.dataset.id, origen: boton.dataset.origen, inicioX: evento.clientX, inicioY: evento.clientY, activo: false, destino: "" };
        superficie.setPointerCapture(evento.pointerId);
    });
    superficie.addEventListener("pointermove", evento => {
        const arrastre = calendarioAdmin.arrastre;
        if (!arrastre) return;
        if (!arrastre.activo && Math.hypot(evento.clientX - arrastre.inicioX, evento.clientY - arrastre.inicioY) < 6) return;
        if (!arrastre.activo) {
            arrastre.activo = true;
            superficie.classList.add("arrastrando");
            const vista = document.createElement("div"); vista.id = "calVistaMovimiento"; vista.className = "cms-calendar-drag-preview"; vista.setAttribute("role", "status"); superficie.append(vista);
        }
        actualizarArrastre(evento.clientX, evento.clientY);
    });
    superficie.addEventListener("pointerup", evento => {
        const arrastre = calendarioAdmin.arrastre;
        if (!arrastre) return;
        if (arrastre.activo) {
            const destino = objetivoArrastre(evento.clientX, evento.clientY).dia;
            calendarioAdmin.ignorarClick = true;
            setTimeout(() => { calendarioAdmin.ignorarClick = false; }, 0);
            if (destino) guardarMovimiento(arrastre.id, arrastre.origen, destino);
        } else { calendarioAdmin.ignorarClick = true; abrirEventoCalendario(arrastre.id); setTimeout(() => { calendarioAdmin.ignorarClick = false; }, 0); }
        terminarArrastre();
    });
    superficie.addEventListener("pointercancel", terminarArrastre);
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") { terminarArrastre(); if (!campo("calModal").hidden) cerrarModalCalendario(); }
    });
    campo("calModalCerrar").addEventListener("click", cerrarModalCalendario);
    campo("calModal").addEventListener("click", evento => { if (evento.target === campo("calModal")) cerrarModalCalendario(); });
    campo("calModal").addEventListener("keydown", evento => {
        if (evento.key !== "Tab") return;
        const controles = [...campo("calModal").querySelectorAll('button:not([disabled]), input:not([disabled])')];
        const primero = controles[0], ultimo = controles[controles.length - 1];
        if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    });
    renderizarCalendarioAdmin();
});
