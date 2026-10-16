let eventosAdmin = [];
try {
    const guardados = JSON.parse(localStorage.getItem("eventos") || "[]");
    eventosAdmin = Array.isArray(guardados) ? guardados : [];
} catch (error) {
    eventosAdmin = [];
}

const campo = (id) => document.getElementById(id);
let galeriaEditor = [];
const escaparHTML = (valor = "") => String(valor).replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
const hoyInicio = () => { const fecha = new Date(); fecha.setHours(0, 0, 0, 0); return fecha; };
const fechaEvento = (fecha) => fecha ? new Date(`${fecha}T12:00:00`) : null;
const fechaTexto = (fecha) => fecha ? fechaEvento(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha";
const nombreEstado = (evento) => ({ borrador: "Borrador", publicado: "Publicado", archivado: "Archivado" })[estadoPublicacion(evento)] || "Estado desconocido";
const etiquetaEstado = (evento) => `<span class="cms-status ${escaparHTML(estadoPublicacion(evento))}">${nombreEstado(evento)}</span>`;
function guardarColeccion(nuevaLista, liberarBorradorTemporal = false) {
    let borradorAnterior = null;
    let borradorLiberado = false;
    try {
        const datos = JSON.stringify(nuevaLista);
        // El autoguardado puede contener otra copia completa de las imágenes.
        // Al guardar el evento ya no se necesita; si falla, se restaura.
        if (liberarBorradorTemporal) {
            borradorAnterior = localStorage.getItem("borradorEventoAdmin");
            if (borradorAnterior !== null) {
                localStorage.removeItem("borradorEventoAdmin");
                borradorLiberado = true;
            }
        }
        localStorage.setItem("eventos", datos);
        eventosAdmin = nuevaLista;
        return true;
    } catch (error) {
        let borradorRestaurado = true;
        if (borradorLiberado) {
            try { localStorage.setItem("borradorEventoAdmin", borradorAnterior); }
            catch (errorRestauracion) { borradorRestaurado = false; }
        }
        const cuota = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
        const mensaje = cuota
            ? "El almacenamiento del navegador está lleno. Reduce el tamaño o la cantidad de imágenes del evento y vuelve a intentarlo. Puedes exportar una copia en Configuración."
            : "El navegador no permitió guardar los eventos. Comprueba que el almacenamiento del sitio esté habilitado y vuelve a intentarlo.";
        alert(`No se pudieron guardar los eventos. ${mensaje} Los eventos anteriores siguen intactos. Mantén esta pestaña abierta hasta poder guardar los cambios.${borradorRestaurado ? "" : " Tampoco se pudo recuperar el autoguardado temporal."}`);
        return false;
    }
}
function generarId(ocupados) {
    let id = Date.now();
    while (ocupados.has(String(id))) id++;
    ocupados.add(String(id));
    return id;
}
function refrescarAdmin() {
    renderizarListaCajon();
    renderizarTablas();
}
const categoriaTexto = (categoria = "otros") => ({ cultura: "🎭 Cultura", deportes: "⚽ Deportivo", fiestas: "🎉 Fiesta", arte: "🎨 Arte", concierto: "🎵 Concierto", cine: "🎬 Cine", educacion: "📚 Educación", ayuntamiento: "🏛️ Ayuntamiento", familiar: "👨‍👩‍👧‍👦 Familiar", mercado: "🛍️ Mercado", naturaleza: "🌳 Naturaleza", gastronomia: "🧑‍🍳 Gastronomía", juventud: "Juventud", otros: "Otros" }[categoria] || categoria);

const calendarioRango = flatpickr("#rangoFechas", {
    mode: "range",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: "es",
    onChange: function (fechas, texto, instancia) {
        campo("fecha").value = fechas.length ? instancia.formatDate(fechas[0], "Y-m-d") : "";
        campo("fechaFin").value = fechas.length > 1 ? instancia.formatDate(fechas[1], "Y-m-d") : "";
        limpiarError("rangoFechas");
        actualizarPreviasImagenes();
        programarAutoguardado();
    }
});

const quill = new Quill("#editor-container", {
    theme: "snow",
    placeholder: "Empieza a escribir la información del evento...",
    modules: {
        imageResize: { displaySize: true },
        history: { delay: 1000, maxStack: 100, userOnly: true },
        toolbar: {
            container: "#toolbar",
            handlers: {
                undo: function () { this.quill.history.undo(); },
                redo: function () { this.quill.history.redo(); },
                divider: function () {
                    const rango = this.quill.getSelection(true);
                    this.quill.insertText(rango.index, "────────────────────────\n", { color: "#82909d" }, "user");
                    this.quill.setSelection(rango.index + 26, 0, "silent");
                }
            }
        }
    }
});

function leerAjustesImagen(tipo) {
    return ImagenesEvento.normalizar({ modo: campo(`${tipo}Modo`).value, x: Number(campo(`${tipo}FocoX`).value), y: Number(campo(`${tipo}FocoY`).value) });
}
function actualizarPreviasImagenes() {
    const datos = {
        titulo: campo("titulo").value.trim(), descripcion: campo("descripcion").value.trim(),
        categoria: campo("categoria").value, fecha: campo("fecha").value, fechaFin: campo("fechaFin").value,
        lugar: campo("lugar").value.trim(), hora: campo("hora").value,
        imagen: campo("imagen").value, imagenTarjeta: campo("imagenTarjeta").value,
        imagenAjustes: leerAjustesImagen("imagen"), imagenTarjetaAjustes: leerAjustesImagen("imagenTarjeta")
    };
    const titulo = escaparHTML(datos.titulo || "Título del evento");
    const resumen = datos.descripcion ? `<p class="evento-resumen">${escaparHTML(datos.descripcion)}</p>` : "";
    campo("portadaPrevia").innerHTML = `<div class="ficha-evento cms-preview-ficha"><section class="hero-evento"><div class="hero-evento-contenido"><h2>${titulo}</h2>${resumen}</div>${ImagenesEvento.renderizar(datos, "imagen", "hero-evento-media")}</section></div>`;
    const fecha = formatearRangoEvento(datos.fecha, datos.fechaFin);
    const metadatos = [datos.lugar, datos.hora].filter(Boolean).map((valor) => `<span>${escaparHTML(valor)}</span>`).join("");
    const categoria = escaparHTML(campo("categoria").selectedOptions[0]?.textContent || "");
    campo("tarjetaPrevia").innerHTML = `<article class="evento-card tarjeta-evento-compacta">${ImagenesEvento.renderizar(datos, "imagenTarjeta", "miniatura-evento")}<span class="boton-favorito" aria-hidden="true">♥</span><div class="evento-contenido tarjeta-evento-contenido"><h3>${titulo}</h3>${fecha ? `<p class="evento-fecha">${escaparHTML(fecha)}</p>` : ""}${metadatos ? `<p class="evento-metadatos">${metadatos}</p>` : ""}${categoria ? `<span class="categoria">${categoria}</span>` : ""}<span class="boton-evento">Ver detalles</span></div></article>`;
    ImagenesEvento.activar(campo("portadaPrevia"));
    ImagenesEvento.activar(campo("tarjetaPrevia"));
    const propia = Boolean(ImagenesEvento.urlImagen(datos.imagenTarjeta));
    campo("tarjetaOrigen").textContent = propia ? "La tarjeta utiliza su propia imagen y estos ajustes." : "La tarjeta utiliza la imagen de portada. Puedes ajustar aquí su modo y enfoque de forma independiente.";
    ["imagen", "imagenTarjeta"].forEach((tipo) => {
        campo(`${tipo}Enfoque`).hidden = campo(`${tipo}Modo`).value !== "fotografia";
        ["X", "Y"].forEach((eje) => { campo(`${tipo}Valor${eje}`).textContent = `${campo(`${tipo}Foco${eje}`).value}%`; });
    });
}
function iniciarControlesImagen() {
    document.querySelectorAll("[data-ajustes-imagen]").forEach((contenedor) => {
        const tipo = contenedor.dataset.ajustesImagen;
        contenedor.innerHTML = `<fieldset class="cms-imagen-ajustes" id="${tipo}Controles"><legend>Visualización de ${tipo === "imagen" ? "portada" : "miniatura"}</legend><label for="${tipo}Modo">Cómo mostrar la imagen</label><select id="${tipo}Modo"><option value="cartel">Cartel: mostrar completo</option><option value="fotografia">Fotografía: rellenar y recortar</option></select><p>Mostrar completo conserva todos los bordes. Recortar llena el espacio; ajusta el enfoque para elegir qué parte se ve.</p><div id="${tipo}Enfoque" class="cms-imagen-enfoque" hidden><label for="${tipo}FocoX">Enfoque horizontal <output id="${tipo}ValorX" for="${tipo}FocoX">50%</output></label><input id="${tipo}FocoX" type="range" min="0" max="100" value="50" aria-label="Enfoque horizontal de ${tipo === "imagen" ? "portada" : "miniatura"}"><label for="${tipo}FocoY">Enfoque vertical <output id="${tipo}ValorY" for="${tipo}FocoY">50%</output></label><input id="${tipo}FocoY" type="range" min="0" max="100" value="50" aria-label="Enfoque vertical de ${tipo === "imagen" ? "portada" : "miniatura"}"></div></fieldset>`;
        contenedor.addEventListener("input", actualizarPreviasImagenes);
    });
    campo("categoria").addEventListener("change", actualizarPreviasImagenes);
    ["titulo", "descripcion", "lugar", "hora"].forEach((id) => campo(id).addEventListener("change", actualizarPreviasImagenes));
    actualizarPreviasImagenes();
}
function restaurarAjustesImagen(datos) {
    ["imagen", "imagenTarjeta"].forEach((tipo) => {
        const ajustes = ImagenesEvento.normalizar(datos[`${tipo}Ajustes`] ?? (tipo === "imagenTarjeta" && !datos.imagenTarjeta ? datos.imagenAjustes : null));
        campo(`${tipo}Modo`).value = ajustes.modo;
        campo(`${tipo}FocoX`).value = ajustes.x;
        campo(`${tipo}FocoY`).value = ajustes.y;
    });
}
function actualizarPortada(valor, guardar = true) {
    campo("imagen").value = valor;
    if (!valor) campo("inputImagenLocal").value = "";
    actualizarPreviasImagenes();
    if (guardar) programarAutoguardado();
}
document.addEventListener("DOMContentLoaded", () => {
    iniciarControlesImagen();
    document.querySelectorAll("[data-vista]").forEach((boton) => boton.addEventListener("click", () => mostrarVista(boton.dataset.vista)));
    campo("buscarAdmin").addEventListener("input", renderizarTablas);
    campo("filtroAdmin").addEventListener("change", renderizarTablas);
    campo("filtroEstadoAdmin").addEventListener("change", renderizarTablas);
    document.querySelectorAll(".cms-editor-columna input, .cms-editor-columna select, .cms-editor-columna textarea").forEach((entrada) => entrada.addEventListener("input", () => { limpiarError(entrada.id); programarAutoguardado(); }));
    document.querySelectorAll(".cms-editor-columna select").forEach((entrada) => entrada.addEventListener("change", programarAutoguardado));
    quill.on("text-change", programarAutoguardado);
    campo("inputImagenLocal").addEventListener("change", cargarImagenLocal);
    campo("inputCartel").addEventListener("change", (evento) => cargarImagenAdicional(evento, "cartel"));
    campo("inputGaleria").addEventListener("change", (evento) => cargarImagenAdicional(evento, "galeria"));
    campo("anadirActividad").addEventListener("click", () => { anadirActividad(); programarAutoguardado(); });
    campo("listaProgramaAdmin").addEventListener("input", programarAutoguardado);
    campo("listaProgramaAdmin").addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-quitar-actividad]");
        if (boton) { boton.closest(".cms-programa-item").remove(); programarAutoguardado(); }
    });
    campo("galeriaAdmin").addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-quitar-galeria]");
        if (boton) { galeriaEditor.splice(Number(boton.dataset.quitarGaleria), 1); renderGaleriaAdmin(); programarAutoguardado(); }
    });
    document.querySelectorAll("[data-bloque]").forEach((boton) => boton.addEventListener("click", () => insertarBloque(boton.dataset.bloque)));
    campo("zonaImagen").addEventListener("dragover", (evento) => { evento.preventDefault(); campo("zonaImagen").classList.add("arrastrando"); });
    campo("zonaImagen").addEventListener("dragleave", () => campo("zonaImagen").classList.remove("arrastrando"));
    campo("zonaImagen").addEventListener("drop", (evento) => {
        evento.preventDefault();
        campo("zonaImagen").classList.remove("arrastrando");
        const archivo = evento.dataTransfer.files[0];
        if (archivo && archivo.type.startsWith("image/")) leerImagen(archivo);
    });
    campo("modalVistaPrevia").addEventListener("click", (evento) => { if (evento.target === campo("modalVistaPrevia")) cerrarVistaPrevia(); });
    document.addEventListener("keydown", (evento) => { if (evento.key === "Escape" && !DetalleEvento.visorAbierto()) cerrarVistaPrevia(); });
    campo("exportarEventos").addEventListener("click", exportarEventos);
    campo("importarEventos").addEventListener("click", importarEventos);
    restaurarBorrador();
    renderizarListaCajon();
    renderizarTablas();
});

function mostrarVista(nombre) {
    document.querySelectorAll(".cms-vista").forEach((vista) => {
        const activa = vista.id === `vista-${nombre}`;
        vista.hidden = !activa;
        vista.classList.toggle("activa", activa);
    });
    document.querySelectorAll(".cms-nav-link").forEach((boton) => boton.classList.toggle("activo", boton.dataset.vista === nombre));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (nombre === "inicio" || nombre === "eventos") renderizarTablas();
}

function renderizarTablas() {
    const fechaHoy = hoyInicio();
    const publicados = eventosAdmin.filter(esEventoPublicado);
    const pasados = publicados.filter((evento) => {
        const final = fechaEvento(evento.fechaFin || evento.fecha);
        return final && final < fechaHoy;
    });
    const activos = publicados.filter((evento) => !pasados.includes(evento));
    const proximos = publicados.filter((evento) => {
        const inicio = fechaEvento(evento.fecha);
        return inicio && inicio >= fechaHoy;
    });
    campo("statTotal").textContent = eventosAdmin.length;
    campo("statActivos").textContent = activos.length;
    campo("statProximos").textContent = proximos.length;
    campo("statPasados").textContent = pasados.length;
    campo("navTotalEventos").textContent = eventosAdmin.length;

    const recientes = [...eventosAdmin].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6);
    campo("tablaRecientes").innerHTML = recientes.map((evento) => `<tr>
        <td><strong class="cms-event-name">${escaparHTML(evento.titulo || "Sin título")}</strong></td>
        <td>${escaparHTML(fechaTexto(evento.fecha))}</td>
        <td><span class="cms-category">${escaparHTML(categoriaTexto(evento.categoria))}</span></td>
        <td>${etiquetaEstado(evento)}</td>
        <td><button class="cms-table-action" type="button" data-editar="${escaparHTML(evento.id)}">Editar</button></td>
      </tr>`).join("");
    campo("vacioRecientes").hidden = recientes.length > 0;

    const busqueda = campo("buscarAdmin").value.trim().toLocaleLowerCase("es");
    const categoria = campo("filtroAdmin").value;
    const estado = campo("filtroEstadoAdmin").value;
    const filtrados = [...eventosAdmin].sort((a, b) => (fechaEvento(a.fecha) || 0) - (fechaEvento(b.fecha) || 0)).filter((evento) => {
        const coincideTexto = !busqueda || `${evento.titulo || ""} ${evento.descripcion || ""}`.toLocaleLowerCase("es").includes(busqueda);
        return coincideTexto && (categoria === "todos" || evento.categoria === categoria) && (estado === "todos" || estadoPublicacion(evento) === estado);
    });
    campo("tablaEventos").innerHTML = filtrados.map((evento) => `<tr>
        <td><strong class="cms-event-name">${escaparHTML(evento.titulo || "Sin título")}</strong></td>
        <td>${escaparHTML(fechaTexto(evento.fecha))}${evento.fechaFin ? `<small class="cms-date-end"> hasta ${escaparHTML(fechaTexto(evento.fechaFin))}</small>` : ""}</td>
        <td><span class="cms-category">${escaparHTML(categoriaTexto(evento.categoria))}</span></td>
        <td>${etiquetaEstado(evento)}</td>
        <td>${evento.aforo ? `${escaparHTML(evento.aforo)} plazas` : "—"}</td>
        <td><div class="cms-row-actions"><button class="cms-table-action" type="button" data-editar="${escaparHTML(evento.id)}" aria-label="Editar ${escaparHTML(evento.titulo)}"><i class="fa-solid fa-pen"></i> Editar</button><button class="cms-table-action" type="button" data-duplicar="${escaparHTML(evento.id)}">Duplicar</button>${estadoPublicacion(evento) === "archivado" ? `<button class="cms-table-action" type="button" data-restaurar="${escaparHTML(evento.id)}">Restaurar como borrador</button>` : `<button class="cms-table-action" type="button" data-archivar="${escaparHTML(evento.id)}">Archivar</button>`}<button class="cms-delete-action" type="button" data-eliminar="${escaparHTML(evento.id)}">Eliminar definitivamente</button></div></td>
      </tr>`).join("");
    campo("vacioEventos").hidden = filtrados.length > 0;
    document.querySelectorAll("[data-editar]").forEach((boton) => boton.addEventListener("click", () => cargarEvento(boton.dataset.editar)));
    document.querySelectorAll("[data-duplicar]").forEach((boton) => boton.addEventListener("click", () => duplicarEvento(boton.dataset.duplicar)));
    document.querySelectorAll("[data-archivar]").forEach((boton) => boton.addEventListener("click", () => archivarEvento(boton.dataset.archivar)));
    document.querySelectorAll("[data-restaurar]").forEach((boton) => boton.addEventListener("click", () => restaurarEvento(boton.dataset.restaurar)));
    document.querySelectorAll("[data-eliminar]").forEach((boton) => boton.addEventListener("click", () => borrarEvento(boton.dataset.eliminar)));
}

function limpiarError(id) {
    const entrada = campo(id);
    const visible = id === "rangoFechas" ? calendarioRango.altInput || entrada : entrada;
    visible.removeAttribute("aria-invalid");
    visible.removeAttribute("aria-describedby");
    entrada.closest(".meta-item")?.querySelector(".cms-field-error")?.remove();
}
function limpiarErroresFormulario() {
    document.querySelectorAll(".cms-field-error").forEach((error) => error.remove());
    document.querySelectorAll("[aria-invalid]").forEach((entrada) => { entrada.removeAttribute("aria-invalid"); entrada.removeAttribute("aria-describedby"); });
}
function mostrarError(id, mensaje) {
    const entrada = campo(id);
    const visible = id === "rangoFechas" ? calendarioRango.altInput || entrada : entrada;
    const error = document.createElement("p");
    error.className = "cms-field-error";
    error.id = `error-${id}`;
    error.textContent = mensaje;
    entrada.closest(".meta-item").append(error);
    visible.setAttribute("aria-invalid", "true");
    visible.setAttribute("aria-describedby", error.id);
    return visible;
}
function fechaValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T12:00:00`);
    return !Number.isNaN(fecha.getTime()) && fecha.getFullYear() === Number(valor.slice(0, 4)) && fecha.getMonth() + 1 === Number(valor.slice(5, 7)) && fecha.getDate() === Number(valor.slice(8, 10));
}
function enlaceValido(valor) {
    if (!valor) return true;
    try {
        const url = new URL(valor);
        return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
    } catch { return false; }
}
function validarPublicacion() {
    limpiarErroresFormulario();
    const errores = [];
    const titulo = campo("titulo").value.trim();
    const inicio = campo("fecha").value;
    const fin = campo("fechaFin").value;
    if (!titulo) errores.push(["titulo", "Escribe un título para publicar el evento."]);
    if (!fechaValida(inicio)) errores.push(["rangoFechas", "Selecciona una fecha inicial válida."]);
    else if (fin && (!fechaValida(fin) || fin < inicio)) errores.push(["rangoFechas", "La fecha final no puede ser anterior a la inicial."]);
    if (inicio && (!fin || fin === inicio) && campo("hora").value && campo("horaFin").value && campo("horaFin").value <= campo("hora").value) errores.push(["horaFin", "La hora final debe ser posterior a la inicial cuando el evento termina el mismo día."]);
    const aforo = campo("aforo").value.trim();
    if (aforo && (!/^\d+$/.test(aforo) || Number(aforo) <= 0 || !Number.isSafeInteger(Number(aforo)))) errores.push(["aforo", "El aforo debe ser un entero positivo."]);
    ["urlReserva", "web", "instagram", "facebook", "otroEnlace"].forEach((id) => {
        if (!enlaceValido(campo(id).value.trim())) errores.push([id, "Introduce una dirección completa que empiece por https:// o http://."]);
    });
    if (campo("googleMapsUrl").value.trim() && !DetalleEvento.urlGoogleMaps(campo("googleMapsUrl").value.trim())) errores.push(["googleMapsUrl", "Introduce un enlace HTTPS válido de Google Maps."]);
    const correo = campo("correo").value.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.push(["correo", "Introduce un correo electrónico válido."]);
    const telefono = campo("telefono").value.trim();
    if (telefono && !/^[+\d\s().-]{6,25}$/.test(telefono)) errores.push(["telefono", "Introduce un teléfono válido."]);
    const primero = errores.map(([id, mensaje]) => mostrarError(id, mensaje))[0];
    if (primero) primero.focus();
    return errores.length === 0;
}
function datosFormulario(existente, id, estado) {
    return {
        ...(existente || {}), id, estado,
        titulo: campo("titulo").value.trim(), fecha: campo("fecha").value,
        fechaFin: campo("fechaFin").value, hora: campo("hora").value, horaFin: campo("horaFin").value,
        lugar: campo("lugar").value.trim(), direccion: campo("direccion").value.trim(),
        googleMapsUrl: campo("googleMapsUrl").value.trim(), mostrarComoLlegar: campo("mostrarComoLlegar").checked,
        organizador: campo("organizador").value.trim(), telefono: campo("telefono").value.trim(), correo: campo("correo").value.trim(),
        edadRecomendada: campo("edadRecomendada").value.trim(), accesibilidad: campo("accesibilidad").value.trim(),
        traer: campo("traer").value.trim(), observaciones: campo("observaciones").value.trim(),
        estadoActividad: campo("estadoActividad").value, mensajeEstado: campo("mensajeEstado").value.trim(),
        programa: leerProgramaFormulario(), mostrarCompartir: campo("mostrarCompartir").checked,
        mostrarRelacionados: campo("mostrarRelacionados").checked,
        precio: campo("precio").value.trim(), aforo: campo("aforo").value,
        reservas: campo("reservas").value, urlReserva: campo("urlReserva").value.trim(),
        web: campo("web").value.trim(), instagram: campo("instagram").value.trim(),
        facebook: campo("facebook").value.trim(), otroEnlace: campo("otroEnlace").value.trim(),
        categoria: campo("categoria").value, imagen: campo("imagen").value,
        imagenTarjeta: campo("imagenTarjeta").value, cartel: campo("cartel").value,
        imagenAjustes: leerAjustesImagen("imagen"), imagenTarjetaAjustes: leerAjustesImagen("imagenTarjeta"),
        galeria: [...galeriaEditor], descripcion: campo("descripcion").value.trim(),
        descripcion_larga: quill.root.innerHTML
    };
}
function actualizarEstadoEditor(estado) {
    const etiqueta = campo("estadoPublicacionEditor");
    etiqueta.textContent = estado === "publicado" ? "Publicado" : estado === "archivado" ? "Archivado" : "Borrador";
    etiqueta.dataset.estado = estado;
}
let guardandoEvento = false;
const cargasImagenPendientes = new Set();
function registrarCargaImagen(tarea) {
    cargasImagenPendientes.add(tarea);
    tarea.then(() => cargasImagenPendientes.delete(tarea), () => cargasImagenPendientes.delete(tarea));
    return tarea;
}
async function guardarEvento(estado = "publicado") {
    if (guardandoEvento) return;
    if (estado === "publicado" && !validarPublicacion()) return;
    if (estado === "borrador") limpiarErroresFormulario();
    guardandoEvento = true;
    clearTimeout(temporizadorBorrador);
    try {
        if (cargasImagenPendientes.size) {
            campo("estadoGuardado").textContent = "Terminando de cargar imágenes...";
            await Promise.allSettled([...cargasImagenPendientes]);
        }
        const idInput = campo("eventoId").value;
        const indice = eventosAdmin.findIndex((evento) => String(evento.id) === idInput);
        const existente = indice >= 0 ? eventosAdmin[indice] : null;
        const ocupados = new Set(eventosAdmin.map((evento) => String(evento.id)));
        const nuevo = datosFormulario(existente, existente ? existente.id : generarId(ocupados), estado);
        campo("estadoGuardado").textContent = "Preparando imágenes para guardar...";
        await optimizarImagenesEvento(nuevo);
        const nuevaLista = [...eventosAdmin];
        if (indice >= 0) nuevaLista[indice] = nuevo; else nuevaLista.push(nuevo);
        if (!guardarColeccion(nuevaLista, true)) {
            campo("estadoGuardado").textContent = "No se pudo guardar. El formulario sigue abierto.";
            return;
        }
        clearTimeout(temporizadorBorrador);
        try { localStorage.removeItem("borradorEventoAdmin"); } catch (error) { /* El evento principal ya está guardado. */ }
        campo("estadoGuardado").textContent = estado === "publicado" ? "Evento publicado" : "Borrador guardado";
        campo("estadoBorrador").textContent = "Autoguardado temporal vacío";
        campo("eventoId").value = nuevo.id;
        campo("tituloVistaEditor").textContent = "Editar evento";
        actualizarEstadoEditor(estado);
        refrescarAdmin();
        mostrarVista("eventos");
    } catch (error) {
        campo("estadoGuardado").textContent = "No se pudo preparar el evento. El formulario sigue abierto.";
        alert("No se pudo preparar el evento para guardarlo. Vuelve a intentarlo.");
    } finally {
        guardandoEvento = false;
    }
}

function anadirActividad(datos = {}) {
    const fila = document.createElement("div");
    fila.className = "cms-programa-item";
    fila.innerHTML = `<label>Hora<input type="time" data-programa-hora value="${escaparHTML(datos.hora || "")}"></label><label>Título<input type="text" data-programa-titulo value="${escaparHTML(datos.titulo || "")}"></label><label class="cms-programa-detalle">Información adicional<textarea data-programa-detalle rows="2"></textarea></label><button type="button" class="cms-link-image" data-quitar-actividad>Eliminar actividad</button>`;
    fila.querySelector("[data-programa-detalle]").value = datos.detalle || "";
    campo("listaProgramaAdmin").append(fila);
}
function leerProgramaFormulario() {
    return [...campo("listaProgramaAdmin").querySelectorAll(".cms-programa-item")].map((fila) => ({
        hora: fila.querySelector("[data-programa-hora]").value,
        titulo: fila.querySelector("[data-programa-titulo]").value.trim(),
        detalle: fila.querySelector("[data-programa-detalle]").value.trim()
    })).filter((item) => item.hora || item.titulo || item.detalle);
}
function actualizarCartel(valor, guardar = true) {
    campo("cartel").value = valor;
    const previa = campo("cartelPrevia");
    const imagen = DetalleEvento.urlImagen(valor);
    previa.hidden = !imagen;
    campo("cartelPreviaImagen").src = imagen || "";
    if (!valor) campo("inputCartel").value = "";
    if (guardar) programarAutoguardado();
}
function renderGaleriaAdmin() {
    campo("galeriaAdmin").innerHTML = galeriaEditor.map((valor, indice) => {
        const imagen = DetalleEvento.urlImagen(valor);
        return `<div class="cms-galeria-item">${imagen ? `<img src="${escaparHTML(imagen)}" alt="Imagen ${indice + 1} de la galería">` : '<span class="cms-image-invalid">Imagen no válida</span>'}<button type="button" data-quitar-galeria="${indice}" aria-label="Quitar imagen ${indice + 1}">Quitar</button></div>`;
    }).join("");
}
function pedirUrlImagenAdicional(tipo) {
    const valor = prompt("Pega el enlace directo a la imagen:");
    if (!valor || !valor.trim()) return;
    const imagen = DetalleEvento.urlImagen(valor.trim());
    if (!imagen) { alert("Introduce una URL de imagen válida que empiece por https:// o http://."); return; }
    if (tipo === "cartel") actualizarCartel(imagen);
    else { galeriaEditor.push(imagen); renderGaleriaAdmin(); programarAutoguardado(); }
}
function optimizarImagenDataUrl(valor, dimensionMaxima = 1600, longitudMaxima = 900000, calidad = 0.84) {
    if (typeof valor !== "string" || !/^data:image\/(png|jpeg|webp);base64,/i.test(valor) || valor.length < 150000) return Promise.resolve(valor);
    return new Promise((resolver) => {
        const imagen = new Image();
        imagen.onload = () => {
            try {
                let mejor = valor;
                let dimension = dimensionMaxima;
                for (let intento = 0; intento < 4; intento++) {
                    const escala = Math.min(1, dimension / Math.max(imagen.naturalWidth, imagen.naturalHeight));
                    const lienzo = document.createElement("canvas");
                    lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
                    lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
                    const contexto = lienzo.getContext("2d");
                    if (!contexto) break;
                    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
                    const comprimida = lienzo.toDataURL("image/webp", Math.max(0.66, calidad - intento * 0.06));
                    if (comprimida.length < mejor.length) mejor = comprimida;
                    if (mejor.length <= longitudMaxima) break;
                    dimension = Math.round(dimension * 0.8);
                }
                resolver(mejor);
            } catch (error) { resolver(valor); }
        };
        imagen.onerror = () => resolver(valor);
        imagen.src = valor;
    });
}
async function optimizarImagenesEvento(evento) {
    const [portada, tarjeta, cartel, extra, ...galeria] = await Promise.all([
        optimizarImagenDataUrl(evento.imagen, 1600, 900000),
        optimizarImagenDataUrl(evento.imagenTarjeta, 850, 400000),
        optimizarImagenDataUrl(evento.cartel, 2100, 1500000, 0.9),
        optimizarImagenDataUrl(evento.imagen_extra, 1600, 900000),
        ...(Array.isArray(evento.galeria) ? evento.galeria : []).map((imagen) => optimizarImagenDataUrl(imagen, 1400, 700000))
    ]);
    evento.imagen = portada;
    evento.imagenTarjeta = tarjeta;
    evento.cartel = cartel;
    if (evento.imagen_extra) evento.imagen_extra = extra;
    evento.galeria = galeria;
    if (typeof evento.descripcion_larga === "string" && /<img\b[^>]*\bsrc\s*=\s*["']?data:image\//i.test(evento.descripcion_larga)) {
        const documento = new DOMParser().parseFromString(evento.descripcion_larga, "text/html");
        const imagenes = [...documento.body.querySelectorAll('img[src^="data:image/"]')];
        await Promise.all(imagenes.map(async (imagen) => {
            imagen.src = await optimizarImagenDataUrl(imagen.getAttribute("src"), 1400, 700000);
        }));
        evento.descripcion_larga = documento.body.innerHTML;
    }
}
function leerArchivoImagen(archivo, dimensionMaxima = 1600, longitudMaxima = 900000, calidad = 0.84) {
    return new Promise((resolver, rechazar) => {
        if (!/^image\/(png|jpeg|gif|webp)$/.test(archivo.type)) { rechazar(new Error("Selecciona imágenes PNG, JPEG, GIF o WebP.")); return; }
        const lector = new FileReader();
        lector.onload = () => optimizarImagenDataUrl(lector.result, dimensionMaxima, longitudMaxima, calidad).then(resolver, rechazar);
        lector.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
        lector.readAsDataURL(archivo);
    });
}
function cargarImagenAdicional(evento, tipo) {
    return registrarCargaImagen((async () => {
        const archivos = [...(evento.target.files || [])];
        if (!archivos.length) return;
        try {
            const imagenes = await Promise.all(archivos.map((archivo) => tipo === "cartel"
                ? leerArchivoImagen(archivo, 2100, 1500000, 0.9)
                : leerArchivoImagen(archivo, 1400, 700000)));
            if (tipo === "cartel") actualizarCartel(imagenes[0]);
            else { galeriaEditor.push(...imagenes); renderGaleriaAdmin(); programarAutoguardado(); }
        } catch (error) { alert(error.message); }
        evento.target.value = "";
    })());
}

function pedirUrlImagen() {
    const url = prompt("Pega el enlace directo a la imagen (jpg, png o similar):");
    if (url && url.trim()) {
        const imagen = DetalleEvento.urlImagen(url.trim());
        if (!imagen) { alert("Introduce una URL de imagen válida que empiece por https:// o http://."); return; }
        actualizarPortada(imagen);
    }
}

function cargarImagenLocal(evento) {
    const archivo = evento.target.files && evento.target.files[0];
    if (archivo) leerImagen(archivo);
}

function leerImagen(archivo) {
    return registrarCargaImagen((async () => {
        try {
            const imagen = await leerArchivoImagen(archivo);
            actualizarPortada(imagen);
        } catch (error) { alert(error.message); }
    })());
}

function abrirCajonEventos() {
    campo("cajonEventos").classList.add("abierto");
    campo("fondoCajon").classList.add("abierto");
}
function cerrarCajonEventos() {
    campo("cajonEventos").classList.remove("abierto");
    campo("fondoCajon").classList.remove("abierto");
}

function renderizarListaCajon() {
    const lista = campo("listaEventosAdmin");
    if (!lista) return;
    lista.innerHTML = [...eventosAdmin].sort((a, b) => (fechaEvento(a.fecha) || 0) - (fechaEvento(b.fecha) || 0)).map((evento) => `
        <div class="cajon-item"><img src="${escaparHTML(evento.imagen || "img/logo-gilena.png")}" alt=""><div class="cajon-item-info"><h4>${escaparHTML(evento.titulo || "Sin título")}</h4><p>${escaparHTML(fechaTexto(evento.fecha))} · ${nombreEstado(evento)}</p></div><div class="cajon-item-acciones"><button class="btn-editar-mini" type="button" onclick="cargarEvento('${escaparHTML(evento.id)}')" aria-label="Editar"><i class="fa-solid fa-pen"></i></button><button class="btn-borrar-mini" type="button" onclick="borrarEvento('${escaparHTML(evento.id)}')" aria-label="Eliminar definitivamente"><i class="fa-solid fa-trash"></i></button></div></div>
    `).join("");
}

function cargarEvento(id) {
    const evento = eventosAdmin.find((elemento) => String(elemento.id) === String(id));
    if (!evento) return;
    localStorage.removeItem("borradorEventoAdmin");
    rellenarFormulario(evento);
    limpiarErroresFormulario();
    campo("tituloVistaEditor").textContent = "Editar evento";
    campo("estadoGuardado").textContent = "Editando evento existente";
    campo("estadoBorrador").innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Autoguardado temporal sin cambios';
    cerrarCajonEventos();
    mostrarVista("editor");
}

function duplicarEvento(id) {
    const original = eventosAdmin.find((evento) => String(evento.id) === String(id));
    if (!original) return;
    rellenarFormulario({ ...original, id: "", titulo: `Copia de: ${original.titulo || "Sin título"}`, estado: "borrador" });
    limpiarErroresFormulario();
    campo("tituloVistaEditor").textContent = "Duplicar evento";
    campo("estadoGuardado").textContent = "Copia pendiente de guardar";
    cerrarCajonEventos();
    mostrarVista("editor");
    programarAutoguardado();
    campo("titulo").focus({ preventScroll: true });
}

function cambiarEstadoEvento(id, estado) {
    const indice = eventosAdmin.findIndex((evento) => String(evento.id) === String(id));
    if (indice < 0) return;
    const nuevaLista = [...eventosAdmin];
    nuevaLista[indice] = { ...nuevaLista[indice], estado };
    if (!guardarColeccion(nuevaLista)) return;
    refrescarAdmin();
}
function archivarEvento(id) {
    const evento = eventosAdmin.find((item) => String(item.id) === String(id));
    if (!evento || !confirm(`¿Archivar «${evento.titulo || "Sin título"}»? Se ocultará de la web pública y conservará todos sus datos.`)) return;
    cambiarEstadoEvento(id, "archivado");
}
function restaurarEvento(id) {
    cambiarEstadoEvento(id, "borrador");
}

function rellenarFormulario(datos) {
    campo("eventoId").value = datos.id ?? datos.eventoId ?? "";
    campo("titulo").value = datos.titulo || "";
    campo("hora").value = datos.hora || "";
    campo("horaFin").value = datos.horaFin || "";
    campo("lugar").value = datos.lugar || "";
    ["direccion", "googleMapsUrl", "organizador", "telefono", "correo", "edadRecomendada", "accesibilidad", "traer", "observaciones", "mensajeEstado"].forEach((id) => { campo(id).value = datos[id] || ""; });
    campo("mostrarComoLlegar").checked = datos.mostrarComoLlegar === true;
    campo("mostrarCompartir").checked = datos.mostrarCompartir === true;
    campo("mostrarRelacionados").checked = datos.mostrarRelacionados === true;
    campo("estadoActividad").value = ["programado", "cancelado", "aplazado"].includes(datos.estadoActividad) ? datos.estadoActividad : "programado";
    campo("precio").value = datos.precio || "";
    campo("aforo").value = datos.aforo || "";
    campo("reservas").value = datos.reservas || "";
    campo("urlReserva").value = datos.urlReserva || "";
    campo("web").value = datos.web || "";
    campo("instagram").value = datos.instagram || "";
    campo("facebook").value = datos.facebook || "";
    campo("otroEnlace").value = datos.otroEnlace || "";
    campo("categoria").value = datos.categoria || "otros";
    campo("descripcion").value = datos.descripcion || "";
    campo("fecha").value = datos.fecha || "";
    campo("fechaFin").value = datos.fechaFin || "";
    calendarioRango.setDate(datos.fechaFin ? [datos.fecha, datos.fechaFin] : datos.fecha || "", false);
    restaurarAjustesImagen(datos);
    actualizarImagenTarjeta(datos.imagenTarjeta || "", false);
    actualizarCartel(datos.cartel || "", false);
    galeriaEditor = Array.isArray(datos.galeria) ? [...datos.galeria] : datos.imagen_extra ? [datos.imagen_extra] : [];
    renderGaleriaAdmin();
    campo("listaProgramaAdmin").innerHTML = "";
    if (Array.isArray(datos.programa)) datos.programa.forEach(anadirActividad);
    campo("inputImagenTarjeta").value = "";
    actualizarPortada(datos.imagen || "", false);
    if (datos.descripcion_larga) quill.clipboard.dangerouslyPasteHTML(datos.descripcion_larga, "silent");
    else quill.setText(datos.descripcion || "", "silent");
    actualizarEstadoEditor(estadoPublicacion(datos));
}

function nuevoEvento() {
    rellenarFormulario({ categoria: "deportes", imagen: "", estado: "borrador" });
    limpiarErroresFormulario();
    campo("eventoId").value = "";
    campo("tituloVistaEditor").textContent = "Crear evento";
    campo("estadoGuardado").textContent = "Creando nuevo evento...";
    campo("estadoBorrador").innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Autoguardado temporal vacío';
    localStorage.removeItem("borradorEventoAdmin");
    cerrarCajonEventos();
    mostrarVista("editor");
    campo("titulo").focus({ preventScroll: true });
}

function cancelarEdicion() {
    clearTimeout(temporizadorBorrador);
    localStorage.removeItem("borradorEventoAdmin");
    if (campo("eventoId").value) mostrarVista("eventos");
    else mostrarVista("inicio");
    campo("estadoBorrador").innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Autoguardado temporal vacío';
}

function borrarEvento(id) {
    const evento = eventosAdmin.find((item) => String(item.id) === String(id));
    if (!evento || !confirm(`¿Eliminar definitivamente «${evento.titulo || "Sin título"}»? Esta acción no se puede deshacer.`)) return;
    const nuevaLista = eventosAdmin.filter((item) => String(item.id) !== String(id));
    if (!guardarColeccion(nuevaLista)) return;
    refrescarAdmin();
    if (campo("eventoId").value === String(id)) nuevoEvento();
}

function mensajeImportacion(texto, error = false) {
    const estado = campo("estadoImportacion");
    estado.textContent = texto;
    estado.classList.toggle("error", error);
}
function exportarEventos() {
    const contenido = JSON.stringify({ version: 1, fechaExportacion: new Date().toISOString(), eventos: eventosAdmin }, null, 2);
    const url = URL.createObjectURL(new Blob([contenido], { type: "application/json;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `eventos-gilena-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    mensajeImportacion(`Copia preparada con ${eventosAdmin.length} eventos.`);
}
function validarArchivoImportacion(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos) || datos.version !== 1 || !Array.isArray(datos.eventos) || typeof datos.fechaExportacion !== "string" || Number.isNaN(Date.parse(datos.fechaExportacion))) {
        throw new Error("El archivo no tiene el formato de copia de seguridad de Gilena (versión 1).");
    }
    const textos = ["titulo", "fecha", "fechaFin", "hora", "horaFin", "lugar", "direccion", "googleMapsUrl", "organizador", "telefono", "correo", "edadRecomendada", "accesibilidad", "traer", "observaciones", "estadoActividad", "mensajeEstado", "precio", "reservas", "urlReserva", "web", "instagram", "facebook", "otroEnlace", "categoria", "imagen", "imagenTarjeta", "imagen_extra", "cartel", "descripcion", "descripcion_larga"];
    datos.eventos.forEach((evento, indice) => {
        const numero = indice + 1;
        if (!evento || typeof evento !== "object" || Array.isArray(evento)) throw new Error(`El evento ${numero} no es un objeto válido.`);
        if (!(typeof evento.id === "number" && Number.isSafeInteger(evento.id) && evento.id > 0) && !(typeof evento.id === "string" && /^[a-zA-Z0-9_-]+$/.test(evento.id))) throw new Error(`El evento ${numero} no tiene un ID válido.`);
        if (!["borrador", "publicado", "archivado"].includes(estadoPublicacion(evento))) throw new Error(`El evento ${numero} tiene un estado desconocido.`);
        textos.forEach((clave) => { if (evento[clave] != null && typeof evento[clave] !== "string") throw new Error(`El campo ${clave} del evento ${numero} debe ser texto.`); });
        ["imagenAjustes", "imagenTarjetaAjustes"].forEach((clave) => {
            const ajustes = evento[clave];
            if (ajustes == null) return;
            if (typeof ajustes !== "object" || Array.isArray(ajustes) || !["cartel", "fotografia"].includes(ajustes.modo) || ["x", "y"].some((eje) => ajustes[eje] != null && (typeof ajustes[eje] !== "number" || !Number.isFinite(ajustes[eje]) || ajustes[eje] < 0 || ajustes[eje] > 100))) throw new Error(`Los ajustes de imagen del evento ${numero} no son válidos.`);
        });
        if (evento.aforo != null && evento.aforo !== "" && (!/^\d+$/.test(String(evento.aforo)) || Number(evento.aforo) <= 0 || !Number.isSafeInteger(Number(evento.aforo)))) throw new Error(`El aforo del evento ${numero} no es un entero positivo.`);
        if (evento.fecha && !fechaValida(evento.fecha)) throw new Error(`La fecha inicial del evento ${numero} no es válida.`);
        if (evento.fechaFin && (!fechaValida(evento.fechaFin) || !evento.fecha || evento.fechaFin < evento.fecha)) throw new Error(`La fecha final del evento ${numero} no es válida.`);
        if (evento.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(evento.hora)) throw new Error(`La hora inicial del evento ${numero} no es válida.`);
        if (evento.horaFin && !/^([01]\d|2[0-3]):[0-5]\d$/.test(evento.horaFin)) throw new Error(`La hora final del evento ${numero} no es válida.`);
        if (evento.fecha && (!evento.fechaFin || evento.fecha === evento.fechaFin) && evento.hora && evento.horaFin && evento.horaFin <= evento.hora) throw new Error(`La hora final del evento ${numero} debe ser posterior a la inicial.`);
        ["urlReserva", "web", "instagram", "facebook", "otroEnlace"].forEach((clave) => { if (!enlaceValido(evento[clave])) throw new Error(`El enlace ${clave} del evento ${numero} no es válido.`); });
        if (evento.googleMapsUrl && !DetalleEvento.urlGoogleMaps(evento.googleMapsUrl)) throw new Error(`El enlace de Google Maps del evento ${numero} no es válido.`);
        ["mostrarComoLlegar", "mostrarCompartir", "mostrarRelacionados"].forEach((clave) => { if (evento[clave] != null && typeof evento[clave] !== "boolean") throw new Error(`La opción ${clave} del evento ${numero} no es válida.`); });
        if (evento.estadoActividad && !["programado", "cancelado", "aplazado"].includes(evento.estadoActividad)) throw new Error(`El estado de actividad del evento ${numero} no es válido.`);
        if (evento.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(evento.correo)) throw new Error(`El correo del evento ${numero} no es válido.`);
        if (evento.telefono && !/^[+\d\s().-]{6,25}$/.test(evento.telefono)) throw new Error(`El teléfono del evento ${numero} no es válido.`);
        if (evento.cartel && !DetalleEvento.urlImagen(evento.cartel)) throw new Error(`El cartel del evento ${numero} no es una imagen válida.`);
        if (evento.galeria != null && (!Array.isArray(evento.galeria) || evento.galeria.some((imagen) => typeof imagen !== "string" || !DetalleEvento.urlImagen(imagen)))) throw new Error(`La galería del evento ${numero} no es válida.`);
        if (evento.programa != null && (!Array.isArray(evento.programa) || evento.programa.some((item) => !item || typeof item !== "object" || Array.isArray(item) || ["hora", "titulo", "detalle"].some((clave) => item[clave] != null && typeof item[clave] !== "string") || item.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.hora)))) throw new Error(`El programa del evento ${numero} no es válido.`);
        if (estadoPublicacion(evento) === "publicado" && (!evento.titulo?.trim() || !fechaValida(evento.fecha))) throw new Error(`El evento publicado ${numero} necesita título y fecha inicial válidos.`);
    });
    return datos.eventos;
}
function prepararImportacion(importados, modo) {
    const nuevaLista = modo === "sustituir" ? [] : [...eventosAdmin];
    const ocupados = new Set(nuevaLista.map((evento) => String(evento.id)));
    importados.forEach((evento) => {
        const copia = { ...evento };
        if (ocupados.has(String(copia.id))) copia.id = generarId(ocupados);
        else ocupados.add(String(copia.id));
        nuevaLista.push(copia);
    });
    return nuevaLista;
}
async function importarEventos() {
    const archivo = campo("archivoImportacion").files[0];
    if (!archivo) { mensajeImportacion("Selecciona un archivo JSON para importar.", true); return; }
    let importados;
    try {
        importados = validarArchivoImportacion(JSON.parse(await archivo.text()));
    } catch (error) {
        mensajeImportacion(`No se importó nada: ${error.message || "no se pudo leer el archivo."}`, true);
        return;
    }
    const modo = document.querySelector('input[name="modoImportacion"]:checked').value;
    if (modo === "sustituir" && !confirm(`¿Sustituir ${eventosAdmin.length} eventos actuales por ${importados.length} del archivo? Los actuales se reemplazarán definitivamente.`)) return;
    const nuevaLista = prepararImportacion(importados, modo);
    if (!guardarColeccion(nuevaLista)) { mensajeImportacion("No se pudo importar: el almacenamiento está lleno o no está disponible. Los eventos anteriores siguen intactos.", true); return; }
    campo("archivoImportacion").value = "";
    refrescarAdmin();
    mensajeImportacion(`Importación completada: ${importados.length} eventos. Ahora hay ${eventosAdmin.length} en el administrador.`);
}

function abrirVistaPrevia() {
    const id = campo("eventoId").value;
    const existente = eventosAdmin.find((item) => String(item.id) === id);
    const datos = datosFormulario(existente, existente?.id || "", campo("estadoPublicacionEditor").dataset.estado || "borrador");
    const contenedor = campo("previewEventoCompleto");
    contenedor.innerHTML = DetalleEvento.renderizar(datos, { previo: true, relacionados: eventosAdmin });
    DetalleEvento.activar(contenedor, datos, true);
    campo("modalVistaPrevia").hidden = false;
    document.body.classList.add("cms-modal-abierto");
}
function cerrarVistaPrevia() {
    const modal = campo("modalVistaPrevia");
    if (modal && !modal.hidden) {
        modal.hidden = true;
        document.body.classList.remove("cms-modal-abierto");
    }
}

function insertarBloque(tipo) {
    const bloques = {
        ubicacion: ["📍 Ubicación: ", "#29527a"],
        horario: ["🕐 Horario: ", "#29527a"],
        informacion: ["ℹ️ Información: ", "#29527a"],
        aviso: ["⚠️ Aviso: ", "#9a6410"]
    };
    const bloque = bloques[tipo];
    if (!bloque) return;
    const rango = quill.getSelection(true);
    const texto = `${bloque[0]}Añade aquí la información\n`;
    quill.insertText(rango.index, texto, { bold: true, color: bloque[1] }, "user");
    quill.formatLine(rango.index, texto.length, "bold", false, "user");
    quill.setSelection(rango.index + texto.length, 0, "silent");
}

let temporizadorBorrador;
function programarAutoguardado() {
    if (!campo("estadoBorrador")) return;
    campo("estadoBorrador").innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Guardando cambios temporales...';
    clearTimeout(temporizadorBorrador);
    temporizadorBorrador = setTimeout(guardarBorradorTemporal, 650);
}
function guardarBorradorTemporal() {
    const borrador = {};
    ["eventoId", "titulo", "categoria", "fecha", "fechaFin", "hora", "horaFin", "lugar", "direccion", "googleMapsUrl", "organizador", "telefono", "correo", "edadRecomendada", "accesibilidad", "traer", "observaciones", "estadoActividad", "mensajeEstado", "precio", "aforo", "reservas", "urlReserva", "web", "instagram", "facebook", "otroEnlace", "imagen", "imagenTarjeta", "cartel", "descripcion"].forEach((id) => { borrador[id] = campo(id).value; });
    ["mostrarComoLlegar", "mostrarCompartir", "mostrarRelacionados"].forEach((id) => { borrador[id] = campo(id).checked; });
    borrador.programa = leerProgramaFormulario();
    borrador.galeria = [...galeriaEditor];
    borrador.imagenAjustes = leerAjustesImagen("imagen");
    borrador.imagenTarjetaAjustes = leerAjustesImagen("imagenTarjeta");
    borrador.descripcion_larga = quill.root.innerHTML;
    borrador.estado = campo("estadoPublicacionEditor").dataset.estado || "borrador";
    borrador.modificado = true;
    try {
        localStorage.setItem("borradorEventoAdmin", JSON.stringify(borrador));
        campo("estadoBorrador").innerHTML = `<i class="fa-solid fa-check"></i> Autoguardado temporal · ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
        campo("estadoBorrador").innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo autoguardar. La copia anterior sigue intacta; reduce las imágenes y mantén esta pestaña abierta.';
    }
}
function restaurarBorrador() {
    try {
        const borrador = JSON.parse(localStorage.getItem("borradorEventoAdmin") || "null");
        if (!borrador || !borrador.modificado && !borrador.titulo && !borrador.fecha && !borrador.descripcion_larga) return;
        rellenarFormulario(borrador);
        campo("tituloVistaEditor").textContent = borrador.eventoId ? "Editar evento" : "Crear evento";
        campo("estadoGuardado").textContent = "Borrador recuperado";
        campo("estadoBorrador").innerHTML = '<i class="fa-solid fa-rotate-left"></i> Autoguardado temporal recuperado';
        mostrarVista("editor");
    } catch (error) {
        localStorage.removeItem("borradorEventoAdmin");
    }
}

// Miniatura independiente: nunca modifica la portada del evento.
function actualizarImagenTarjeta(valor, guardar = true) {
    campo("imagenTarjeta").value = valor;
    actualizarPreviasImagenes();
    if (!valor) campo("inputImagenTarjeta").value = "";
    if (guardar) programarAutoguardado();
}
function pedirUrlTarjeta() {
    const valor = prompt("Pega el enlace directo a la imagen de la tarjeta:");
    if (!valor || !valor.trim()) return;
    try {
        const url = new URL(valor.trim());
        if (!["https:", "http:"].includes(url.protocol)) throw new Error();
        actualizarImagenTarjeta(url.href);
    } catch { alert("Introduce una URL válida que empiece por https:// o http://."); }
}
campo("inputImagenTarjeta").addEventListener("change", async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const tarea = (async () => {
        try { actualizarImagenTarjeta(await leerArchivoImagen(archivo, 850, 400000)); }
        catch (error) { alert(error.message); }
        evento.target.value = "";
    })();
    await registrarCargaImagen(tarea);
});
