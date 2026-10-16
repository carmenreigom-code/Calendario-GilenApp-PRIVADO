// 1. Cargamos los eventos de la base de datos (localStorage)
let eventos = [];
try {
    const guardados = JSON.parse(localStorage.getItem("eventos")) || [];
    eventos = Array.isArray(guardados) ? guardados.filter(esEventoPublicado) : [];
} catch (e) {
    eventos = [];
}

// 2. Usamos la fecha de hoy para el calendario
let fechaActual = new Date();

function escaparHTML(valor = "") {
    return String(valor).replace(/[&<>"']/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caracter]));
}

const CLAVE_FAVORITOS = "eventosFavoritosGilena";
const CLAVE_AVISOS = "avisosEventosGilena";
function leerPreferencias(clave, inicial) {
    try { return JSON.parse(localStorage.getItem(clave)) || inicial; } catch (e) { return inicial; }
}
let favoritos = leerPreferencias(CLAVE_FAVORITOS, []).map(String);
let avisos = leerPreferencias(CLAVE_AVISOS, {});
function guardarPreferencias() {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(favoritos));
    localStorage.setItem(CLAVE_AVISOS, JSON.stringify(avisos));
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
function mostrarEventos(lista) {
    const contenedor = document.getElementById("listaEventos");
    const mensaje = document.getElementById("sinResultados");
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        mensaje.style.display = "block";
        return;
    }

    mensaje.style.display = "none";

    lista.forEach(evento => {
        const id = String(evento.id);
        const guardado = favoritos.includes(id);
        contenedor.innerHTML += `
            <article class="evento-card tarjeta-evento-compacta">
                <button class="boton-favorito ${guardado ? "activo" : ""}" type="button" data-favorito="${escaparHTML(id)}" aria-label="${guardado ? "Quitar de" : "Guardar en"} Mis eventos" aria-pressed="${guardado}"><i class="${guardado ? "fa-solid" : "fa-regular"} fa-heart"></i></button>
                ${bloqueImagen(evento)}
                <div class="evento-contenido tarjeta-evento-contenido">
                    <span class="categoria">${escaparHTML(categoriaLegible(evento.categoria))}</span>
                    <h3>${escaparHTML(evento.titulo)}</h3>
                    ${(evento.lugar || evento.hora) ? `<p class="evento-metadatos">${evento.lugar ? `<span><i class="fa-solid fa-location-dot"></i>${escaparHTML(evento.lugar)}</span>` : ""}${evento.hora ? `<span><i class="fa-regular fa-clock"></i>${escaparHTML(evento.hora)}${evento.horaFin ? ` – ${escaparHTML(evento.horaFin)}` : ""}</span>` : ""}</p>` : ""}
                    ${typeof evento.descripcion === "string" && evento.descripcion.trim() ? `<p class="evento-descripcion">${escaparHTML(evento.descripcion.trim())}</p>` : ""}
                    <div class="evento-fecha"><i class="fa-regular fa-calendar"></i> ${escaparHTML(formatearFechaTarjeta(evento.fecha, evento.fechaFin))}</div>
                    <a class="boton-evento" href="evento.html?id=${encodeURIComponent(evento.id)}">
                        Ver detalles <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </article>
        `;
    });
    activarImagenesFallback(contenedor);
}

function mostrarMisEventos() {
    const contenedor = document.getElementById("listaMisEventos");
    const vacio = document.getElementById("sinFavoritos");
    if (!contenedor || !vacio) return;
    const guardados = eventos.filter(evento => favoritos.includes(String(evento.id)));
    contenedor.innerHTML = guardados.map(evento => {
        const id = String(evento.id);
        const activo = avisos[id] !== false;
        const metadatos = [evento.hora ? `<span><i class="fa-regular fa-clock"></i>${escaparHTML(evento.hora)}${evento.horaFin ? ` – ${escaparHTML(evento.horaFin)}` : ""}</span>` : "", evento.lugar ? `<span><i class="fa-solid fa-location-dot"></i>${escaparHTML(evento.lugar)}</span>` : ""].filter(Boolean).join("");
        return `<article class="mis-evento-card tarjeta-evento-compacta">
            ${bloqueImagen(evento)}
                <button class="boton-favorito activo" type="button" data-favorito="${escaparHTML(id)}" aria-label="Quitar ${escaparHTML(evento.titulo)} de Mis eventos" aria-pressed="true"><i class="fa-solid fa-heart"></i></button>
            <div class="mis-evento-contenido tarjeta-evento-contenido">
                <span class="categoria">${escaparHTML(categoriaLegible(evento.categoria))}</span>
                <h3>${escaparHTML(evento.titulo)}</h3>
                <p class="mis-evento-fecha"><i class="fa-regular fa-calendar"></i> ${escaparHTML(formatearFechaTarjeta(evento.fecha, evento.fechaFin))}</p>
                ${metadatos ? `<p class="mis-evento-metadatos">${metadatos}</p>` : ""}
            </div>
            <div class="mis-evento-pie">
                    <button class="boton-aviso ${activo ? "activo" : ""}" type="button" data-aviso="${escaparHTML(id)}" aria-pressed="${activo}"><i class="fa-solid fa-bell"></i> Aviso 1 día antes: ${activo ? "activado" : "desactivado"}</button>
                    <a class="boton-evento" href="evento.html?id=${encodeURIComponent(evento.id)}">Ver detalles <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </article>`;
    }).join("");
    vacio.hidden = guardados.length > 0;
    const contador = document.getElementById("contadorFavoritos");
    if (contador) contador.textContent = `${guardados.length} ${guardados.length === 1 ? "evento guardado" : "eventos guardados"}`;
    activarImagenesFallback(contenedor);
}

document.addEventListener("click", event => {
    const botonFavorito = event.target.closest("[data-favorito]");
    if (botonFavorito) {
        const id = botonFavorito.dataset.favorito;
        if (favoritos.includes(id)) favoritos = favoritos.filter(item => item !== id);
        else { favoritos.push(id); avisos[id] = true; }
        guardarPreferencias();
        document.querySelectorAll(`[data-favorito="${CSS.escape(id)}"]`).forEach(boton => {
            const activo = favoritos.includes(id);
            boton.classList.toggle("activo", activo);
            boton.setAttribute("aria-pressed", String(activo));
            boton.setAttribute("aria-label", `${activo ? "Quitar de" : "Guardar en"} Mis eventos`);
            boton.innerHTML = `<i class="${activo ? "fa-solid" : "fa-regular"} fa-heart"></i>`;
        });
        mostrarMisEventos();
        programarAvisos();
    }
    const botonAviso = event.target.closest("[data-aviso]");
    if (botonAviso) {
        const id = botonAviso.dataset.aviso;
        avisos[id] = avisos[id] === false;
        guardarPreferencias();
        mostrarMisEventos();
        programarAvisos();
    }
});

function mensajeNotificacion(texto) {
    const estado = document.getElementById("estadoNotificaciones");
    if (estado) estado.textContent = texto;
}
function entornoValidoNotificaciones() {
    const esLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    return window.isSecureContext && (location.protocol === "https:" || esLocal);
}
function estadoPermisoNotificaciones() {
    if (!("Notification" in window) || typeof Notification.requestPermission !== "function") return "Este navegador no admite notificaciones.";
    if (!entornoValidoNotificaciones()) {
        return "Las notificaciones requieren HTTPS o localhost. Abre la web con Live Server en localhost.";
    }
    if (Notification.permission === "granted") return "Permiso concedido. Los avisos pueden llegar mientras la página esté abierta.";
    if (Notification.permission === "denied") return "Permiso bloqueado. Para permitir avisos, abre los ajustes del sitio desde el icono junto a la dirección, cambia Notificaciones a Permitir y recarga la página.";
    return "Permiso pendiente. Pulsa «Activar notificaciones» para solicitarlo. Los avisos pueden depender de que la página siga abierta.";
}
if (document.getElementById("activarNotificaciones")) mensajeNotificacion(estadoPermisoNotificaciones());
document.getElementById("activarNotificaciones")?.addEventListener("click", async () => {
    if (!("Notification" in window) || typeof Notification.requestPermission !== "function" || !entornoValidoNotificaciones() || Notification.permission !== "default") {
        mensajeNotificacion(estadoPermisoNotificaciones());
        if ("Notification" in window && Notification.permission === "granted") programarAvisos();
        return;
    }
    mensajeNotificacion("Solicitud de permiso pendiente en el navegador…");
    try {
        await Notification.requestPermission();
        mensajeNotificacion(estadoPermisoNotificaciones());
        programarAvisos();
    } catch (error) {
        mensajeNotificacion("No se pudo solicitar el permiso. Comprueba los ajustes de notificaciones del sitio e inténtalo de nuevo.");
    }
});
function programarAvisos() {
    if (!("Notification" in window) || Notification.permission !== "granted" || document.visibilityState !== "visible") return;
    const ahora = Date.now();
    eventos.filter(evento => favoritos.includes(String(evento.id)) && avisos[String(evento.id)] !== false).forEach(evento => {
        const cuando = new Date(`${evento.fecha}T09:00:00`).getTime() - 86400000;
        const clave = `avisoEnviado_${evento.id}_${evento.fecha}`;
        if (cuando <= ahora && ahora < cuando + 86400000 && !localStorage.getItem(clave)) {
            new Notification("Evento mañana en Gilena", { body: evento.titulo });
            localStorage.setItem(clave, "1");
        }
    });
}
setInterval(programarAvisos, 60000);
document.addEventListener("visibilitychange", programarAvisos);

/* ========================================
   FORMATEAR FECHA
======================================== */
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

    // Si está vacío, ocultamos la caja
    if (texto.length === 0) {
        cajaResultados.style.display = "none";
        return;
    }

    // Buscamos en TODOS los eventos (sin límite de fecha)
    const coincidencias = eventos.filter(evento => 
        String(evento.titulo || "").toLocaleLowerCase("es").includes(texto) ||
        String(evento.descripcion || "").toLocaleLowerCase("es").includes(texto)
    );

    cajaResultados.innerHTML = "";

    if (coincidencias.length === 0) {
        cajaResultados.innerHTML = `<div class="sin-resultados-mini">No se han encontrado eventos para "${escaparHTML(texto)}"</div>`;
    } else {
        coincidencias.forEach(evento => {
            cajaResultados.innerHTML += `
                <a href="evento.html?id=${encodeURIComponent(evento.id)}" class="item-resultado-mini">
                    ${bloqueImagen(evento, "miniatura-resultado")}
                    <div>
                        <h4>${escaparHTML(evento.titulo)}</h4>
                        <p>📅 ${escaparHTML(formatearFecha(evento.fecha))}</p>
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
   FILTRO DE CATEGORÍAS (6 Próximos eventos)
======================================== */
function filtrarEventos() {
    // Si no existe el select de categoría, no hacemos nada (evita errores)
    const selectCategoria = document.getElementById("filtroCategoria");
    if (!selectCategoria) return;

    const categoria = selectCategoria.value;
    
    // Calculamos hoy a las 00:00:00 para incluir los eventos del día actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // 1. Filtramos por categoría y descartamos los eventos pasados
    let resultado = eventos.filter(evento => {
        const coincideCategoria = categoria === "todos" || evento.categoria === categoria;
        
        const fechaEvento = new Date(evento.fecha + "T00:00:00");
        const esFuturoOHoy = fechaEvento >= hoy; // Solo hoy o en el futuro

        return coincideCategoria && esFuturoOHoy;
    });

    // 2. Ordenamos para que salgan primero los más cercanos en el tiempo
    resultado.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // 3. RECORTAMOS la lista para quedarnos solo con los 6 primeros
    resultado = resultado.slice(0, 6);

    // 4. Los mostramos en la web
    mostrarEventos(resultado);
    generarCalendario();
}

document.querySelectorAll(".filtro-rapido").forEach(boton => {
    boton.addEventListener("click", () => {
        const select = document.getElementById("filtroCategoria");
        if (!select) return;
        select.value = boton.dataset.categoria;
        document.querySelectorAll(".filtro-rapido").forEach(opcion => {
            const seleccionado = opcion === boton;
            opcion.classList.toggle("activo", seleccionado);
            opcion.setAttribute("aria-pressed", String(seleccionado));
        });
        filtrarEventos();
    });
});

document.getElementById("filtroCategoria")?.addEventListener("change", () => {
    const actual = document.getElementById("filtroCategoria").value;
    document.querySelectorAll(".filtro-rapido").forEach(boton => {
        const seleccionado = boton.dataset.categoria === actual;
        boton.classList.toggle("activo", seleccionado);
        boton.setAttribute("aria-pressed", String(seleccionado));
    });
});

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
    const categoriaElegida = document.getElementById("filtroCategoria")?.value || "todos";

    // Espacios vacíos antes del primer día
    for (let i = 0; i < primerDia; i++) {
        // Calculamos si el hueco vacío cae en sábado (5) o domingo (6)
        const esFinDeSemana = (i === 5 || i === 6) ? "fin-de-semana" : "";
        calendario.innerHTML += `<div class="dia vacio ${esFinDeSemana}"></div>`;
    }

    // Días del mes
    for (let dia = 1; dia <= diasMes; dia++) {
        const fechaActualBucle = new Date(año, mes, dia, 12, 0, 0); 
        
        // Comprobar si el día actual cae DENTRO del rango de algún evento
        const hayEvento = eventos.find(evento => {
            if (categoriaElegida !== "todos" && evento.categoria !== categoriaElegida) return false;
            const fInicio = new Date(evento.fecha + "T00:00:00");
            // Si no tiene fecha fin, la fecha fin es igual a la de inicio
            const fFin = (evento.fechaFin && evento.fechaFin !== "") ? new Date(evento.fechaFin + "T23:59:59") : new Date(evento.fecha + "T23:59:59");
            return fechaActualBucle >= fInicio && fechaActualBucle <= fFin;
        });

        const diaSemana = new Date(año, mes, dia).getDay();
        const claseFinDeSemana = (diaSemana === 0 || diaSemana === 6) ? "fin-de-semana" : "";

        if (hayEvento) {
            calendario.innerHTML += `
                <button type="button" class="dia evento ${hayEvento.categoria} ${claseFinDeSemana}" data-evento-id="${escaparHTML(hayEvento.id)}" aria-label="Ver ${escaparHTML(hayEvento.titulo)} del ${dia}">
                    <span class="numero-dia">${dia}</span>
                    <span class="nombre-evento-calendario">${escaparHTML(hayEvento.titulo)}</span>
                </button>
            `;
        } else {
            calendario.innerHTML += `
                <div class="dia ${claseFinDeSemana}">
                    <span class="numero-dia">${dia}</span>
                </div>
            `;
        }
    }

}

/* ========================================
   EVENTOS DEL DÍA
======================================== */
function abrirEvento(id) {
    const evento = eventos.find(evento => String(evento.id) === id);
    if (evento) {
        window.location.href = `evento.html?id=${encodeURIComponent(evento.id)}`;
    }
}
document.getElementById("calendarioDias")?.addEventListener("click", evento => {
    const boton = evento.target.closest("[data-evento-id]");
    if (boton) abrirEvento(boton.dataset.eventoId);
});

/* ========================================
   CAMBIAR MES
======================================== */
function mesAnterior() {
    fechaActual.setMonth(fechaActual.getMonth() - 1);
    generarCalendario();
}

function mesSiguiente() {
    fechaActual.setMonth(fechaActual.getMonth() + 1);
    generarCalendario();
}

/* ========================================
   INICIAR PÁGINA (Se ejecuta al cargar)
======================================== */
const selectorCategoria = document.getElementById("filtroCategoria");
if (selectorCategoria && window.AjustesGilena) selectorCategoria.value = AjustesGilena.obtener().categoria;

document.addEventListener("ajustes:cambio", evento => {
    if (["categoria", "restablecer"].includes(evento.detail.clave) && selectorCategoria) {
        selectorCategoria.value = evento.detail.ajustes.categoria;
        filtrarEventos();
    }
});
filtrarEventos();
generarCalendario();
mostrarMisEventos();
programarAvisos();

// Actualizamos el contador de estadísticas
const elementoTotal = document.getElementById("totalEventos");
if (elementoTotal) {
    elementoTotal.textContent = eventos.length;
}
