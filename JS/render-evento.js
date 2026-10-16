window.DetalleEvento = (() => {
    let disparadorVisor = null;
    const texto = (valor) => {
        if (typeof valor !== "string" && typeof valor !== "number") return "";
        const limpio = String(valor).trim();
        return /^(undefined|null)$/i.test(limpio) ? "" : limpio;
    };
    const escapar = (valor) => String(valor).replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
    const multilinea = (valor) => escapar(valor).replace(/\r\n|\r|\n/g, "<br>");
    const urlWeb = (valor) => {
        try {
            const url = new URL(texto(valor));
            return ["https:", "http:"].includes(url.protocol) && url.hostname ? url.href : "";
        } catch { return ""; }
    };
    const urlGoogleMaps = (valor) => {
        const enlace = urlWeb(valor);
        if (!enlace) return "";
        const url = new URL(enlace);
        const host = url.hostname.toLowerCase();
        if (url.protocol !== "https:") return "";
        return host === "maps.app.goo.gl" || host === "maps.google.com" || host === "maps.google.es" || host === "goo.gl" || ((host === "www.google.com" || host === "google.com" || host === "www.google.es" || host === "google.es") && url.pathname.startsWith("/maps")) ? enlace : "";
    };
    const urlImagen = ImagenesEvento.urlImagen;
    const enlaceCorreo = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(valor)) ? `mailto:${encodeURIComponent(texto(valor))}` : "";
    const enlaceTelefono = (valor) => /^[+\d\s().-]{6,25}$/.test(texto(valor)) ? `tel:${texto(valor).replace(/[^+\d]/g, "")}` : "";
    const categoriaNombre = (categoria) => ({ cultura: "🎭 Cultura", deportes: "⚽ Deportivo", fiestas: "🎉 Fiesta", arte: "🎨 Arte", concierto: "🎵 Concierto", cine: "🎬 Cine", educacion: "📚 Educación", ayuntamiento: "🏛️ Ayuntamiento", familiar: "👨‍👩‍👧‍👦 Familiar", mercado: "🛍️ Mercado", naturaleza: "🌳 Naturaleza", gastronomia: "🧑‍🍳 Gastronomía", juventud: "Juventud", otros: "Otros" })[categoria] || texto(categoria);

    function htmlSeguro(html) {
        const plantilla = document.createElement("template");
        plantilla.innerHTML = html;
        const permitidas = new Set(["P", "BR", "STRONG", "EM", "U", "S", "H1", "H2", "H3", "OL", "UL", "LI", "BLOCKQUOTE", "SPAN", "DIV", "A", "IMG", "IFRAME"]);
        const limpiar = (nodo) => {
            for (const hijo of [...nodo.childNodes]) {
                if (hijo.nodeType !== Node.ELEMENT_NODE) continue;
                if (["SCRIPT", "STYLE", "OBJECT", "SVG", "FORM"].includes(hijo.tagName)) { hijo.remove(); continue; }
                limpiar(hijo);
                if (!permitidas.has(hijo.tagName)) { hijo.replaceWith(...hijo.childNodes); continue; }
                const href = hijo.tagName === "A" ? urlWeb(hijo.getAttribute("href")) : "";
                const src = hijo.tagName === "IMG" ? urlImagen(hijo.getAttribute("src")) : "";
                const video = hijo.tagName === "IFRAME" ? urlWeb(hijo.getAttribute("src")) : "";
                const alt = hijo.tagName === "IMG" ? texto(hijo.getAttribute("alt")) : "";
                for (const atributo of [...hijo.attributes]) hijo.removeAttribute(atributo.name);
                if (hijo.tagName === "A" && href) { hijo.href = href; hijo.target = "_blank"; hijo.rel = "noopener noreferrer"; }
                if (hijo.tagName === "IMG") {
                    if (!src) hijo.remove();
                    else { hijo.src = src; hijo.alt = alt; hijo.loading = "lazy"; }
                }
                if (hijo.tagName === "IFRAME") {
                    const url = video ? new URL(video) : null;
                    const rutaVideoValida = url && (url.hostname === "player.vimeo.com" ? url.pathname.startsWith("/video/") : url.pathname.startsWith("/embed/"));
                    if (!url || url.protocol !== "https:" || !["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"].includes(url.hostname) || !rutaVideoValida) hijo.remove();
                    else { hijo.src = video; hijo.loading = "lazy"; hijo.referrerPolicy = "strict-origin-when-cross-origin"; hijo.allowFullscreen = true; }
                }
            }
        };
        limpiar(plantilla.content);
        return plantilla.innerHTML;
    }

    function urlMapa(evento) {
        if (evento.mostrarComoLlegar !== true) return "";
        const directo = urlGoogleMaps(evento.googleMapsUrl);
        if (directo) return directo;
        const partes = [texto(evento.direccion), texto(evento.lugar)].filter(Boolean);
        if (!partes.length) return "";
        if (!partes.some((parte) => /gilena/i.test(parte))) partes.push("Gilena, Sevilla");
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(", "))}`;
    }

    function seccion(titulo, contenido, clase = "") {
        return contenido ? `<section class="detalle-seccion ${clase}"><h3>${titulo}</h3>${contenido}</section>` : "";
    }
    function dato(etiqueta, valor, url = "") {
        if (!valor) return "";
        return `<div class="detalle-dato"><dt>${escapar(etiqueta)}</dt><dd>${url ? `<a href="${escapar(url)}">${multilinea(valor)}</a>` : multilinea(valor)}</dd></div>`;
    }
    function boton(contenido, clase = "", atributos = "") {
        return `<button class="boton-detalle ${clase}" type="button" ${atributos}>${contenido}</button>`;
    }

    function renderizar(evento, opciones = {}) {
        const previo = opciones.previo === true;
        const titulo = texto(evento.titulo);
        const categoria = categoriaNombre(evento.categoria);
        const fecha = formatearRangoEvento(evento.fecha, evento.fechaFin);
        const hora = texto(evento.hora);
        const horaFin = texto(evento.horaFin);
        const horario = hora ? `${hora}${horaFin ? ` – ${horaFin}` : ""}` : horaFin ? `Hasta las ${horaFin}` : "";
        const lugar = texto(evento.lugar);
        const precio = texto(evento.precio);

        const estadoActividad = ["programado", "cancelado", "aplazado"].includes(evento.estadoActividad) ? evento.estadoActividad : "";
        const estadoTexto = ({ programado: "Programado", cancelado: "Cancelado", aplazado: "Aplazado" })[estadoActividad] || "";
        const mensajeEstado = estadoActividad && estadoActividad !== "programado" ? texto(evento.mensajeEstado) : "";
        const resumen = texto(evento.descripcion);
        const fechaInicio = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(evento.fecha));
        const mesFecha = fecha && fechaInicio ? new Date(`${evento.fecha}T12:00:00`).toLocaleDateString("es-ES", { month: "short" }).replace(".", "") : "";
        const datoPrincipal = (icono, etiqueta, valor, clase = "") => valor ? `<div class="evento-dato-principal ${clase}"><span class="evento-dato-icono" aria-hidden="true"><i class="${icono}"></i></span><div><span class="evento-dato-etiqueta">${etiqueta}</span><strong>${escapar(valor)}</strong></div></div>` : "";
        const datosPrincipales = [
            fecha ? `<div class="evento-dato-principal evento-dato-fecha"><span class="evento-fecha-sello" aria-hidden="true"><b>${escapar(fechaInicio?.[3] || "")}</b><small>${escapar(mesFecha)}</small></span><div><span class="evento-dato-etiqueta">${evento.fechaFin && evento.fechaFin > evento.fecha ? "Fechas" : "Fecha"}</span><strong>${escapar(fecha)}</strong></div></div>` : "",
            datoPrincipal("fa-regular fa-clock", "Horario", horario),
            datoPrincipal("fa-solid fa-location-dot", "Lugar", lugar),
            datoPrincipal("fa-solid fa-ticket", "Precio", precio)
        ].filter(Boolean).join("");
        const cabecera = `<div class="evento-intro"><a class="evento-volver" href="index.html"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Volver a la agenda</a><section class="hero-evento"><div class="hero-evento-contenido">${categoria ? `<span class="categoria">${escapar(categoria)}</span>` : ""}${titulo ? `<h2>${escapar(titulo)}</h2>` : ""}${resumen ? `<p class="evento-resumen">${multilinea(resumen)}</p>` : ""}${estadoActividad && estadoActividad !== "programado" ? `<div class="aviso-actividad ${estadoActividad}" role="status"><strong><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> ${estadoTexto}</strong>${mensajeEstado ? `<p>${multilinea(mensajeEstado)}</p>` : ""}</div>` : ""}</div>${ImagenesEvento.renderizar(evento, "imagen", "hero-evento-media", true)}</section>${datosPrincipales ? `<div class="evento-datos-principales">${datosPrincipales}</div>` : ""}</div>`;

        const descripcionLarga = texto(evento.descripcion_larga);
        const descripcionHtml = descripcionLarga ? htmlSeguro(descripcionLarga) : "";
        const pruebaContenido = document.createElement("div");
        pruebaContenido.innerHTML = descripcionHtml;
        const descripcion = (pruebaContenido.textContent.trim() || pruebaContenido.querySelector("img,iframe")) ? descripcionHtml : (texto(evento.descripcion) ? `<p>${multilinea(texto(evento.descripcion))}</p>` : "");
        const sobre = seccion("Sobre el evento", descripcion, "texto-principal");

        const contacto = [
            dato("Organizador", texto(evento.organizador)),
            dato("Teléfono", texto(evento.telefono), enlaceTelefono(evento.telefono)),
            dato("Correo electrónico", texto(evento.correo), enlaceCorreo(evento.correo))
        ].filter(Boolean).join("");
        const ubicacion = [dato("Lugar", lugar), dato("Dirección", texto(evento.direccion))].filter(Boolean).join("");
        const practica = [
            dato("Edad recomendada", texto(evento.edadRecomendada)),
            dato("Accesibilidad", texto(evento.accesibilidad)),
            dato("Qué llevar", texto(evento.traer)),
            dato("Observaciones", texto(evento.observaciones)),
            dato("Aforo", texto(evento.aforo) ? `${texto(evento.aforo)} plazas` : "")
        ].filter(Boolean).join("");
        const estadoReserva = ({ abiertas: "Reservas abiertas", no: "No se necesita reserva", agotadas: "Plazas completas" })[evento.reservas] || "";
        const reservas = seccion("Reservas", estadoReserva ? `<p>${escapar(estadoReserva)}</p>` : "");
        const programa = Array.isArray(evento.programa) ? evento.programa.filter((item) => item && /^([01]\d|2[0-3]):[0-5]\d$/.test(texto(item.hora)) && texto(item.titulo)) : [];
        const programaHtml = programa.map((item) => `<li><time>${escapar(texto(item.hora))}</time><div><strong>${escapar(texto(item.titulo))}</strong>${texto(item.detalle) ? `<p>${multilinea(texto(item.detalle))}</p>` : ""}</div></li>`).join("");

        const cartel = urlImagen(evento.cartel);
        const cartelHtml = cartel ? `<button class="detalle-cartel" type="button" data-ampliar="${escapar(cartel)}" aria-label="Ampliar cartel"><img src="${escapar(cartel)}" alt="Cartel del evento" loading="lazy"><span>Ampliar cartel</span></button>` : "";
        const imagenes = Array.isArray(evento.galeria) ? evento.galeria : evento.imagen_extra ? [evento.imagen_extra] : [];
        const galeria = imagenes.map(urlImagen).filter(Boolean).map((src, indice) => `<button type="button" data-ampliar="${escapar(src)}" aria-label="Ampliar imagen ${indice + 1}"><img src="${escapar(src)}" alt="Imagen ${indice + 1} de la galería" loading="lazy"></button>`).join("");

        const enlaces = [["Página web", evento.web], ["Instagram", evento.instagram], ["Facebook", evento.facebook], ["Más información", evento.otroEnlace]]
            .map(([nombre, valor]) => { const url = urlWeb(valor); return url ? `<a class="enlace-evento" href="${escapar(url)}" target="_blank" rel="noopener noreferrer">${nombre}</a>` : ""; }).filter(Boolean).join("");

        const acciones = [];
        const reservaUrl = evento.reservas === "abiertas" ? urlWeb(evento.urlReserva) : "";
        if (reservaUrl) acciones.push(previo ? boton('<i class="fa-solid fa-ticket" aria-hidden="true"></i> Reservar', "boton-reservar", "disabled") : `<a class="boton-detalle boton-reservar" href="${escapar(reservaUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-ticket" aria-hidden="true"></i> Reservar</a>`);
        const calendario = titulo && fecha ? datosCalendario(evento) : null;
        if (calendario) {
            acciones.push(previo ? boton('<i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Google Calendar', "boton-detalle-secundario", "disabled") : `<a class="boton-detalle boton-detalle-secundario" href="${escapar(urlGoogleCalendar(calendario))}" target="_blank" rel="noopener noreferrer"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Google Calendar</a>`);
            acciones.push(boton('<i class="fa-solid fa-download" aria-hidden="true"></i> Descargar .ics', "boton-detalle-secundario", previo ? "disabled" : 'data-descargar-ics=""'));
        }
        const mapa = urlMapa(evento);
        if (mapa) acciones.push(previo ? boton('<i class="fa-solid fa-location-arrow" aria-hidden="true"></i> Cómo llegar', "boton-detalle-secundario", "disabled") : `<a class="boton-detalle boton-detalle-secundario" href="${escapar(mapa)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> Cómo llegar</a>`);
        if (evento.mostrarCompartir === true) {
            if (typeof navigator.share === "function") acciones.push(boton('<i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Compartir', "boton-detalle-secundario", previo ? "disabled" : 'data-compartir=""'));
            else acciones.push(boton('<i class="fa-solid fa-link" aria-hidden="true"></i> Compartir enlace', "boton-detalle-secundario", previo ? "disabled" : 'data-copiar-enlace=""'));
        }
        acciones.push(boton('<i class="fa-regular fa-heart" aria-hidden="true"></i> Guardar en Mis eventos', "boton-detalle-secundario boton-guardar", previo ? "disabled" : `data-guardar-evento="${escapar(String(evento.id))}" aria-pressed="false"`));
        acciones.push(boton('<i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir', "boton-detalle-secundario", previo ? "disabled" : 'data-imprimir=""'));
        const accionesHtml = `<section class="evento-acciones" aria-label="Acciones del evento"><div class="evento-acciones-lista">${acciones.join("")}</div>${evento.mostrarCompartir === true ? `<p class="aviso-enlace-local">El enlace solo abrirá este evento en otros dispositivos cuando exista almacenamiento compartido.</p><p class="estado-compartir" data-estado-compartir role="status"></p>` : ""}</section>`;

        const relacionados = evento.mostrarRelacionados === true && texto(evento.categoria) && Array.isArray(opciones.relacionados)
            ? opciones.relacionados.filter((item) => esEventoPublicado(item) && item.categoria === evento.categoria && String(item.id) !== String(evento.id) && texto(item.titulo)).slice(0, 3) : [];
        const relacionadosHtml = relacionados.map((item) => `<a href="${previo ? "#" : `evento.html?id=${encodeURIComponent(item.id)}`}" ${previo ? 'aria-disabled="true"' : ""}><strong>${escapar(texto(item.titulo))}</strong>${formatearRangoEvento(item.fecha, item.fechaFin) ? `<small>${escapar(formatearRangoEvento(item.fecha, item.fechaFin))}</small>` : ""}</a>`).join("");

        const contenido = [sobre, seccion("Programa", programaHtml ? `<ol class="detalle-programa">${programaHtml}</ol>` : ""), seccion("Información práctica y accesibilidad", practica ? `<dl class="detalle-practica">${practica}</dl>` : ""), seccion("Cartel", cartelHtml), seccion("Galería", galeria ? `<div class="detalle-galeria">${galeria}</div>` : ""), seccion("Eventos relacionados", relacionadosHtml ? `<div class="detalle-relacionados">${relacionadosHtml}</div>` : "")].filter(Boolean).join("");
        const lateral = [reservas, seccion("Cómo llegar", ubicacion ? `<dl>${ubicacion}</dl>` : ""), seccion("Organizador y contacto", contacto ? `<dl>${contacto}</dl>` : ""), seccion("Enlaces", enlaces ? `<div class="detalle-enlaces">${enlaces}</div>` : "")].filter(Boolean).join("");
        return `<div class="ficha-evento">${cabecera}${accionesHtml}${contenido || lateral ? `<div class="evento-info-grid ${contenido ? "" : "sin-cuerpo"}">${contenido ? `<div class="evento-cuerpo">${contenido}</div>` : ""}${lateral ? `<aside class="evento-sidebar">${lateral}</aside>` : ""}</div>` : ""}</div>`;
    }

    function prepararVisor() {
        let visor = document.getElementById("visorEventoImagen");
        if (visor) return visor;
        visor = document.createElement("div");
        visor.id = "visorEventoImagen";
        visor.className = "visor-imagen";
        visor.hidden = true;
        visor.setAttribute("role", "dialog");
        visor.setAttribute("aria-modal", "true");
        visor.setAttribute("aria-label", "Imagen ampliada");
        visor.innerHTML = '<button type="button" class="visor-cerrar" aria-label="Cerrar imagen">×</button><img alt="Imagen ampliada">';
        visor.addEventListener("click", (evento) => { if (evento.target === visor || evento.target.closest(".visor-cerrar")) cerrarVisor(); });
        document.addEventListener("keydown", (evento) => { if (evento.key === "Escape" && !visor.hidden) { evento.stopImmediatePropagation(); cerrarVisor(); } }, true);
        document.body.append(visor);
        return visor;
    }
    function cerrarVisor() {
        const visor = document.getElementById("visorEventoImagen");
        if (visor) visor.hidden = true;
        if (disparadorVisor?.isConnected) disparadorVisor.focus();
        disparadorVisor = null;
    }
    function visorAbierto() { return document.getElementById("visorEventoImagen")?.hidden === false; }
    function leerGuardados(clave, fallback) {
        try { return JSON.parse(localStorage.getItem(clave)) ?? fallback; } catch { return fallback; }
    }
    function actualizarBotonGuardar(boton, guardado) {
        boton.setAttribute("aria-pressed", String(guardado));
        boton.innerHTML = `<i class="${guardado ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i> ${guardado ? "Guardado en Mis eventos" : "Guardar en Mis eventos"}`;
    }
    function activar(contenedor, evento, previo = false) {
        ImagenesEvento.activar(contenedor);
        contenedor.querySelectorAll(".detalle-cartel img, .detalle-galeria img").forEach((imagen) => imagen.addEventListener("error", () => {
            const boton = imagen.closest("button");
            const seccion = boton.closest(".detalle-seccion");
            boton.remove();
            if (!seccion.querySelector("button")) seccion.remove();
        }, { once: true }));
        contenedor.querySelectorAll(".detalle-cartel img, .detalle-galeria img").forEach((imagen) => {
            if (imagen.complete && imagen.naturalWidth === 0) imagen.dispatchEvent(new Event("error"));
        });
        contenedor.querySelectorAll("[data-ampliar]").forEach((boton) => boton.addEventListener("click", () => {
            const imagen = urlImagen(boton.dataset.ampliar);
            if (!imagen) return;
            disparadorVisor = boton;
            const visor = prepararVisor();
            visor.querySelector("img").src = imagen;
            visor.hidden = false;
            visor.querySelector("button").focus();
        }));
        if (previo) return;
        const botonGuardar = contenedor.querySelector("[data-guardar-evento]");
        if (botonGuardar) {
            const id = String(evento.id);
            const clave = "eventosFavoritosGilena";
            const obtenerFavoritos = () => {
                const valores = leerGuardados(clave, []);
                return Array.isArray(valores) ? valores.map(String) : [];
            };
            actualizarBotonGuardar(botonGuardar, obtenerFavoritos().includes(id));
            botonGuardar.addEventListener("click", () => {
                const favoritos = obtenerFavoritos();
                const guardado = !favoritos.includes(id);
                const nuevos = guardado ? [...favoritos, id] : favoritos.filter((item) => item !== id);
                try {
                    localStorage.setItem(clave, JSON.stringify(nuevos));
                    if (guardado) {
                        const avisos = leerGuardados("avisosEventosGilena", {});
                        const actuales = avisos && typeof avisos === "object" && !Array.isArray(avisos) ? avisos : {};
                        actuales[id] = true;
                        localStorage.setItem("avisosEventosGilena", JSON.stringify(actuales));
                    }
                    actualizarBotonGuardar(botonGuardar, guardado);
                } catch { botonGuardar.title = "No se pudo guardar en este navegador"; }
            });
            window.addEventListener("storage", (cambio) => {
                if (cambio.key === clave) actualizarBotonGuardar(botonGuardar, obtenerFavoritos().includes(id));
            });
        }
        contenedor.querySelector("[data-descargar-ics]")?.addEventListener("click", () => {
            const datos = datosCalendario(evento);
            if (datos) descargarIcs(datos, evento.id);
        });
        contenedor.querySelector("[data-imprimir]")?.addEventListener("click", () => window.print());
        const estado = contenedor.querySelector("[data-estado-compartir]");
        const enlace = window.location.href;
        contenedor.querySelector("[data-compartir]")?.addEventListener("click", async () => {
            try { await navigator.share({ title: texto(evento.titulo), url: enlace }); }
            catch (error) { if (error.name !== "AbortError" && estado) estado.textContent = "No se pudo compartir. Prueba a copiar el enlace."; }
        });
        contenedor.querySelector("[data-copiar-enlace]")?.addEventListener("click", async () => {
            let copiado = false;
            try {
                if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(enlace); copiado = true; }
                else {
                    const entrada = document.createElement("textarea");
                    entrada.value = enlace;
                    document.body.append(entrada);
                    entrada.select();
                    copiado = document.execCommand("copy");
                    entrada.remove();
                }
            } catch (error) { copiado = false; }
            if (estado) estado.textContent = copiado ? "Enlace copiado." : "No se pudo copiar el enlace. Cópialo desde la barra de direcciones.";
        });
    }
    return { renderizar, activar, cerrarVisor, visorAbierto, urlImagen, urlGoogleMaps };
})();
