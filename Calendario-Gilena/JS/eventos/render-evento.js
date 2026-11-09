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

    // Solo formatos semánticos y clases de alineación/sangría conocidas de Quill.
    function htmlSeguro(html) {
        const plantilla=document.createElement('template');plantilla.innerHTML=typeof html==='string'?html:'';
        if(typeof html==='string'&&html.trim()&&!/<[a-z][^>]*>/i.test(html)){const p=document.createElement('p');html.split(/\r?\n/).forEach((line,i)=>{if(i)p.append(document.createElement('br'));p.append(document.createTextNode(line));});plantilla.content.replaceChildren(p);}
        const permitidas=new Set(['P','BR','STRONG','B','EM','I','U','S','H2','H3','H4','OL','UL','LI','BLOCKQUOTE','SPAN','DIV','A','IMG']);
        function limpiar(nodo){for(let hijo of [...nodo.childNodes]){
            if(hijo.nodeType!==Node.ELEMENT_NODE){if(hijo.nodeType!==Node.TEXT_NODE)hijo.remove();continue;}
            if(['SCRIPT','STYLE','OBJECT','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','SELECT','LINK','META','TEMPLATE','NOSCRIPT'].includes(hijo.tagName)){hijo.remove();continue;}
            const v=hijo.tagName==='IFRAME'?BloquesEvento.video(hijo.getAttribute('src')):hijo.classList.contains('ev-video-legacy')?BloquesEvento.video(hijo.getAttribute('data-video-url')):null;
            if(hijo.tagName==='IFRAME'||hijo.classList.contains('ev-video-legacy')){
                if(!v){hijo.remove();continue;}const d=document.createElement('div');d.className='ev-video-legacy';d.dataset.videoUrl=v.url;d.dataset.videoTitulo=hijo.getAttribute('data-video-titulo')||hijo.getAttribute('title')||'Vídeo del evento';d.textContent=d.dataset.videoTitulo;hijo.replaceWith(d);continue;
            }
            if(['H1','H2'].includes(hijo.tagName)){const h=document.createElement('h3');h.innerHTML=hijo.innerHTML;for(const attr of hijo.attributes)h.setAttribute(attr.name,attr.value);hijo.replaceWith(h);hijo=h;}
            limpiar(hijo);if(!permitidas.has(hijo.tagName)){hijo.replaceWith(...hijo.childNodes);continue;}
            const href=hijo.tagName==='A'?urlWeb(hijo.getAttribute('href')):'';
            const src=hijo.tagName==='IMG'?urlImagen(hijo.getAttribute('src')):'';
            const alt=hijo.getAttribute('alt')||'';
            const clases=[...hijo.classList].filter(c=>/^ql-align-(?:center|right|justify)$/.test(c)||/^ql-indent-[1-8]$/.test(c));
            const alineacion=hijo.style.textAlign||hijo.getAttribute('align');
            if(['left','center','right','justify'].includes(alineacion)&&!clases.some(c=>c.startsWith('ql-align-')))clases.push('ql-align-'+alineacion);
            for(const attr of [...hijo.attributes])hijo.removeAttribute(attr.name);
            if(clases.length)hijo.className=clases.join(' ');
            if(hijo.tagName==='A'&&href){hijo.href=href;hijo.target='_blank';hijo.rel='noopener noreferrer';}
            if(hijo.tagName==='IMG'){if(!src)hijo.remove();else{hijo.src=src;hijo.alt=alt;hijo.loading='lazy';}}
        }}
        limpiar(plantilla.content);return plantilla.innerHTML;
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
        return contenido ? `<section class="detalle-seccion ${clase}"><h2>${titulo}</h2>${contenido}</section>` : "";
    }
    function dato(etiqueta, valor, url = "") {
        if (!valor) return "";
        return `<div class="detalle-dato"><dt>${escapar(etiqueta)}</dt><dd>${url ? `<a href="${escapar(url)}">${multilinea(valor)}</a>` : multilinea(valor)}</dd></div>`;
    }
    function boton(contenido, clase = "", atributos = "") {
        return `<button class="boton-detalle ${clase}" type="button" ${atributos}>${contenido}</button>`;
    }

    function estadoInscripcion(evento, ahora = new Date()) {
        const fechaHora = valor => /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(texto(valor)) && InformacionEvento.fecha(valor.slice(0,10)) ? new Date(valor).getTime() : NaN;
        const inicio = fechaHora(evento.inscripcionInicio), fin = fechaHora(evento.inscripcionFin);
        const fechaFinal = InformacionEvento.fecha(texto(evento.fechaFin)) ? evento.fechaFin : evento.fecha;
        const finalEvento = InformacionEvento.fecha(texto(fechaFinal)) ? new Date(`${fechaFinal}T${/^([01]\d|2[0-3]):[0-5]\d$/.test(texto(evento.horaFin)) ? evento.horaFin : '23:59'}:59`).getTime() : NaN;
        const fechaLegible = valor => new Date(valor).toLocaleString('es-ES', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
        if (evento.estadoActividad === 'cancelado') return {abierta:false,mensaje:'Actividad cancelada. Consulta el aviso del evento.'};
        if (evento.estadoActividad === 'aplazado') return {abierta:false,mensaje:'Actividad aplazada. Consulta la nueva información antes de inscribirte.'};
        if (evento.reservas === 'no') return {abierta:false,mensaje:'No se necesita reserva.'};
        if (evento.reservas === 'agotadas') return {abierta:false,mensaje:'Plazas completas.'};
        if (Number.isFinite(finalEvento) && ahora.getTime() > finalEvento) return {abierta:false,mensaje:'El evento ha terminado.'};
        if (Number.isFinite(fin) && ahora.getTime() > fin) return {abierta:false,mensaje:`El plazo de inscripción terminó el ${fechaLegible(fin)}.`};
        if (Number.isFinite(inicio) && ahora.getTime() < inicio) return {abierta:false,mensaje:`La inscripción comienza el ${fechaLegible(inicio)}.`};
        return {abierta:true,mensaje:evento.reservas === 'abiertas' ? 'Reservas abiertas.' : ''};
    }

    function renderizarPrograma(evento) {
        const actividades = Array.isArray(evento.programa) ? evento.programa.filter(item => item && (texto(item.titulo) || texto(item.detalle) || texto(item.hora) || texto(item.lugar))) : [];
        if (!actividades.length) return '';
        const grupos = new Map();
        actividades.forEach(item => { const dia = InformacionEvento.fecha(texto(item.fecha)) ? item.fecha : ''; if (!grupos.has(dia)) grupos.set(dia,[]); grupos.get(dia).push(item); });
        const fechas = [...grupos.keys()].filter(Boolean).sort();
        const dias = [...fechas, ...(grupos.has('') ? [''] : [])];
        const fechaTexto = dia => dia ? new Date(`${dia}T12:00:00`).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'Actividades sin fecha indicada';
        const horaValida = valor => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(texto(valor));
        const largas = actividades.length > 8;
        const lista = dia => {
            const ordenadas = [...grupos.get(dia)].sort((a,b) => horaValida(a.hora) && horaValida(b.hora) ? a.hora.localeCompare(b.hora) : horaValida(a.hora) ? -1 : horaValida(b.hora) ? 1 : 0);
            return `<ol class="detalle-programa${largas?' programa-largo':''}">${ordenadas.map(item => {
                const hora = horaValida(item.hora) ? `<time datetime="${escapar(item.hora)}">${escapar(item.hora)}</time>` : '';
                const titulo = texto(item.titulo);
                const detalles = `${texto(item.detalle) ? `<p>${multilinea(texto(item.detalle))}</p>` : ''}${texto(item.lugar) ? `<p class="programa-lugar"><span class="ev-sr">Lugar: </span>${escapar(texto(item.lugar))}</p>` : ''}`;
                return `<li>${largas && titulo && detalles ? `<details><summary>${hora}<strong>${escapar(titulo)}</strong></summary><div>${detalles}</div></details>` : `${hora}<div>${titulo ? `<strong>${escapar(titulo)}</strong>` : ''}${detalles}</div>`}</li>`;
            }).join('')}</ol>`;
        };
        if (fechas.length < 2) return dias.map(dia => `${dia ? `<h3 class="programa-fecha">${escapar(fechaTexto(dia))}</h3>` : ''}${lista(dia)}`).join('');
        const opciones = dias.map((dia,i) => `<option value="${i}">${escapar(fechaTexto(dia))}</option>`).join('');
        const paneles = dias.map((dia,i) => `<div class="programa-jornada" id="programa-jornada-${i}" data-programa-jornada="${i}" ${i?'hidden':''}><h3 class="programa-fecha">${escapar(fechaTexto(dia))}</h3>${lista(dia)}</div>`).join('');
        return `<label class="programa-selector">Elige una jornada<select data-programa-selector aria-label="Jornada del programa">${opciones}</select></label>${paneles}`;
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
        const precioBase = texto(evento.precio);
        const precioGratis = /^(gratis|gratuit[oa]|0\s*€?)$/i.test(precioBase);
        const precio = evento.tipoPrecio === "gratis" ? (precioBase && !precioGratis ? `Gratis · ${precioBase}` : "Gratis") : evento.tipoPrecio === "pago" ? (precioBase && !precioGratis && !/^de pago$/i.test(precioBase) ? `De pago · ${precioBase}` : "De pago") : precioBase;

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
        let origen = ""; try { origen = sessionStorage.getItem("origenDetalleGilena") || ""; } catch {}
        const regresoFavoritos = !previo && (origen === "favoritos" || /\/mis-eventos\.html(?:$|[?#])/.test(document.referrer || ""));
        const regreso = regresoFavoritos ? "mis-eventos.html?restaurar=1" : `index.html?restaurar=1${origen === "destacados" ? "#destacados" : "#calendario"}`;
        const cabecera = `<div class="evento-intro"><a class="evento-volver" href="${escapar(regreso)}"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${regresoFavoritos ? "Volver a Mis favoritos" : "Volver al calendario"}</a><section class="hero-evento"><div class="hero-evento-contenido"><div class="evento-categoria-estado">${categoria ? `<span class="categoria">${escapar(categoria)}</span>` : ""}${estadoActividad && estadoActividad !== "programado" ? `<span class="estado-actividad ${estadoActividad}">${estadoTexto}</span>` : ""}</div>${titulo ? `<h1>${escapar(titulo)}</h1>` : ""}${texto(evento.subtitulo) ? `<p class="evento-subtitulo">${escapar(texto(evento.subtitulo))}</p>` : ""}${resumen ? `<p class="evento-resumen">${multilinea(resumen)}</p>` : ""}${estadoActividad && estadoActividad !== "programado" && mensajeEstado ? `<div class="aviso-actividad ${estadoActividad}" role="status"><p>${multilinea(mensajeEstado)}</p></div>` : ""}</div>${ImagenesEvento.renderizar(evento, "imagen", "hero-evento-media", true)}</section>${datosPrincipales ? `<div class="evento-datos-principales">${datosPrincipales}</div>` : ""}</div>`;

        const descripcionLarga = texto(evento.descripcion_larga);
        const descripcionHtml = descripcionLarga ? BloquesEvento.ricoPublico(htmlSeguro(descripcionLarga)) : "";
        const pruebaContenido = document.createElement("div");
        pruebaContenido.innerHTML = descripcionHtml;
        const descripcion = (pruebaContenido.textContent.trim() && pruebaContenido.textContent.trim() !== resumen || pruebaContenido.querySelector("img,[data-video-url]")) ? descripcionHtml : "";
        const sobre = seccion("Sobre el evento", descripcion, "texto-principal");

        const contacto = [
            dato("Organizador", texto(evento.organizador)),
            dato("Teléfono", texto(evento.telefono), enlaceTelefono(evento.telefono)),
            dato("Correo electrónico", texto(evento.correo), enlaceCorreo(evento.correo))
        ].filter(Boolean).join("");
        const mapa = urlMapa(evento);
        const ubicacion = [
            dato("Lugar", lugar),
            dato("Dirección", texto(evento.direccion)),
            dato("Indicaciones de acceso", texto(evento.indicacionesAcceso)),
            dato("Otros espacios", texto(evento.espaciosSecundarios))
        ].filter(Boolean).join("");
        const ubicacionHtml = ubicacion || mapa ? `${ubicacion ? `<dl>${ubicacion}</dl>` : ''}${mapa ? `<a class="detalle-mapa" href="${escapar(mapa)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> Abrir indicaciones en Google Maps</a>` : ''}` : '';
        const practica = [
            dato("Edad recomendada", texto(evento.edadRecomendada)),
            dato("Accesibilidad", texto(evento.accesibilidad)),
            dato("Qué llevar", texto(evento.traer)),
            dato("Observaciones", texto(evento.observaciones)),
            dato("Aforo", texto(evento.aforo) ? `${texto(evento.aforo)} plazas` : "")
        ].filter(Boolean).join("");
        const inscripcion = estadoInscripcion(evento);
        const reservas = inscripcion.mensaje ? seccion("Inscripción", `<p>${escapar(inscripcion.mensaje)}</p>`, "detalle-inscripcion") : "";
        const programaHtml = renderizarPrograma(evento);

        const cartel = urlImagen(evento.cartel);
        const metaImagen = uso => { const m=evento.imagenMetadatos?.[uso]||{}; const n=ImagenesEvento.normalizar(m); return {...m,estilo:`--uso-fit:${n.modo==='fotografia'?'cover':'contain'};--uso-x:${n.x}%;--uso-y:${n.y}%`}; };
        const mc=metaImagen('cartel');
        const cartelHtml = cartel ? `<button class="detalle-cartel" type="button" data-ampliar="${escapar(cartel)}" aria-label="Ampliar cartel"><img src="${escapar(cartel)}" alt="${escapar(mc.alt||"Cartel del evento")}" class="imagen-uso" style="${mc.estilo}" loading="lazy"><span>${escapar(mc.pie||"Ampliar cartel")}</span></button>` : "";
        const imagenes = Array.isArray(evento.galeria) ? evento.galeria : evento.imagen_extra ? [evento.imagen_extra] : [];
        const galeria = imagenes.map((v,indice)=>{const src=urlImagen(v),m=metaImagen(`galeria:${indice}`);return src?`<button type="button" data-ampliar="${escapar(src)}" aria-label="Ampliar imagen ${indice+1}"><img src="${escapar(src)}" alt="${escapar(m.alt||'Imagen '+(indice+1)+' de la galería')}" class="imagen-uso" style="${m.estilo}" loading="lazy">${m.pie?`<span>${escapar(m.pie)}</span>`:''}</button>`:'';}).join('');

        const enlaces = [["Página web", evento.web], ["Instagram", evento.instagram], ["Facebook", evento.facebook], ["Más información", evento.otroEnlace]]
            .map(([nombre, valor]) => { const url = urlWeb(valor); return url ? `<a class="enlace-evento" href="${escapar(url)}" target="_blank" rel="noopener noreferrer">${nombre}</a>` : ""; }).filter(Boolean).join("");

        const accionesClave = [];
        const accionesComplementarias = [];
        const reservaUrl = inscripcion.abierta ? urlWeb(evento.urlReserva) : "";
        const accionInscripcion = reservaUrl ? previo ? boton('<i class="fa-solid fa-ticket" aria-hidden="true"></i> Acceder a la inscripción', "boton-reservar", "disabled") : `<a class="boton-detalle boton-reservar" href="${escapar(reservaUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-ticket" aria-hidden="true"></i> ${evento.tipoPrecio === 'pago' ? 'Entradas y reservas' : 'Acceder a la inscripción'}</a>` : '';
        const calendario = titulo && fecha ? datosCalendario(evento) : null;
        accionesClave.push(boton('<i class="fa-regular fa-heart" aria-hidden="true"></i> Guardar en favoritos', "boton-detalle-secundario boton-guardar", previo ? "disabled" : `data-guardar-evento="${escapar(String(evento.id))}" aria-pressed="false"`));
        if (!previo && calendario) accionesClave.push(`<a class="boton-detalle boton-detalle-secundario" href="mis-eventos.html?googleFavorito=${encodeURIComponent(evento.id)}"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Añadir a Google Calendar</a>`);
        if (evento.mostrarCompartir === true) {
            if (typeof navigator.share === "function") accionesClave.push(boton('<i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Compartir', "boton-detalle-secundario", previo ? "disabled" : 'data-compartir=""'));
            else accionesClave.push(boton('<i class="fa-solid fa-link" aria-hidden="true"></i> Copiar enlace', "boton-detalle-secundario", previo ? "disabled" : 'data-copiar-enlace=""'));
        }
        if (calendario) {
            accionesComplementarias.push(boton('<i class="fa-solid fa-download" aria-hidden="true"></i> Descargar .ics', "boton-detalle-secundario", previo ? "disabled" : 'data-descargar-ics=""'));
        }
        accionesComplementarias.push(boton('<i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir', "boton-detalle-secundario", previo ? "disabled" : 'data-imprimir=""'));
        const esDireccionLocal = !previo && (location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname));
        const accionesHtml = `<section class="evento-acciones" aria-label="Acciones del evento">${accionInscripcion ? `<div class="evento-inscripcion-accion">${accionInscripcion}</div>` : ''}<div class="evento-acciones-lista evento-acciones-principales">${accionesClave.join("")}</div>${accionesComplementarias.length ? `<div class="evento-acciones-lista evento-acciones-complementarias">${accionesComplementarias.join("")}</div>` : ""}<p class="estado-accion" data-estado-favorito role="status" aria-live="polite"></p>${evento.mostrarCompartir === true ? `${esDireccionLocal ? `<p class="aviso-enlace-local">Estás usando una dirección local. El enlace copiado no será accesible públicamente.</p>` : ""}<p class="estado-compartir" data-estado-compartir role="status" aria-live="polite"></p>` : ""}</section>`;

        const hoy = new Date(), hoyClave = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
        const yaTermino = item => { const fin=texto(item.fechaFin)||texto(item.fecha); if(fin<hoyClave)return true; if(fin>hoyClave||!/^([01]\d|2[0-3]):[0-5]\d$/.test(texto(item.horaFin)))return false; return new Date(`${fin}T${item.horaFin}:00`).getTime()<hoy.getTime(); };
        const relacionados = texto(evento.categoria) && Array.isArray(opciones.relacionados)
            ? opciones.relacionados.filter((item) => esEventoPublicado(item) && item.categoria === evento.categoria && String(item.id) !== String(evento.id) && texto(item.titulo) && !["cancelado","archivado"].includes(item.estadoActividad) && (texto(item.fechaFin) || texto(item.fecha)) >= hoyClave && !yaTermino(item)).sort((a,b) => texto(a.fecha).localeCompare(texto(b.fecha)) || texto(a.hora).localeCompare(texto(b.hora))).slice(0, 3) : [];
        const relacionadosHtml = relacionados.map(item => TarjetasEvento.renderizar(item, { clases:"tarjeta-relacionada", previo, atributoFavorito:"data-guardar-relacionado", favorito:!previo && window.FavoritosGilena?.lista().includes(String(item.id)) })).join("");

        const contenido = [sobre, seccion("Programa", programaHtml, "seccion-programa"), InformacionEvento.adicionales(evento,{omitirUbicacion:true}), seccion("Información práctica y accesibilidad", practica ? `<dl class="detalle-practica">${practica}</dl>` : ""), seccion("Cartel", cartelHtml), seccion("Galería", galeria ? `<div class="detalle-galeria">${galeria}</div>` : ""), seccion("También te puede interesar", relacionadosHtml ? `<div class="detalle-relacionados">${relacionadosHtml}</div>` : "")].filter(Boolean).join("");
        const lateral = [reservas, seccion("Ubicación", ubicacionHtml, "seccion-ubicacion"), seccion("Organizador y contacto", contacto ? `<dl>${contacto}</dl>` : ""), seccion("Enlaces", enlaces ? `<div class="detalle-enlaces">${enlaces}</div>` : "")].filter(Boolean).join("");
        const cuerpoNodo=document.createElement('div'),lateralNodo=document.createElement('div');cuerpoNodo.innerHTML=contenido;lateralNodo.innerHTML=lateral;
        const accesos=[['.texto-principal','Descripción','detalle-descripcion',cuerpoNodo],['.seccion-programa','Programa','detalle-programa',cuerpoNodo],['.seccion-ubicacion','Ubicación','detalle-ubicacion',lateralNodo],['.tipo-documentos,.detalle-documentos','Documentos','detalle-documentos',cuerpoNodo]];
        const presentes=accesos.flatMap(([selector,nombre,id,raiz])=>{const seccion=raiz.querySelector(selector);if(!seccion)return [];seccion.id=id;return [[nombre,id]];});
        const navegacion=presentes.length>=3?`<nav class="evento-navegacion" aria-label="Dentro del evento">${presentes.map(([nombre,id])=>`<a href="#${id}">${nombre}</a>`).join('')}</nav>`:'';
        return `<div class="ficha-evento">${cabecera}${accionesHtml}${navegacion}${contenido || lateral ? `<div class="evento-info-grid ${contenido ? "" : "sin-cuerpo"}">${contenido ? `<div class="evento-cuerpo">${cuerpoNodo.innerHTML}</div>` : ""}${lateral ? `<aside class="evento-sidebar">${lateralNodo.innerHTML}</aside>` : ""}</div>` : ""}</div>`;
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
        document.addEventListener("keydown", (evento) => {
            if (visor.hidden) return;
            if (evento.key === "Escape") { evento.stopImmediatePropagation(); cerrarVisor(); }
            if (evento.key === "Tab") { evento.preventDefault(); visor.querySelector(".visor-cerrar").focus(); }
        }, true);
        document.body.append(visor);
        return visor;
    }
    function cerrarVisor() {
        const visor = document.getElementById("visorEventoImagen");
        if (visor) visor.hidden = true;
        document.body.classList.remove("visor-abierto");
        if (disparadorVisor?.isConnected) disparadorVisor.focus();
        disparadorVisor = null;
    }
    function visorAbierto() { return document.getElementById("visorEventoImagen")?.hidden === false; }
    function leerGuardados(clave, fallback) {
        try { return JSON.parse(localStorage.getItem(clave)) ?? fallback; } catch { return fallback; }
    }
    function actualizarBotonGuardar(boton, guardado) {
        boton.setAttribute("aria-pressed", String(guardado));
        boton.innerHTML = `<i class="${guardado ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i> ${guardado ? "Quitar de favoritos" : "Guardar en favoritos"}`;
        boton.setAttribute("aria-label", guardado ? "Quitar de favoritos" : "Guardar en favoritos");
    }
    function activar(contenedor, evento, previo = false) {
        ImagenesEvento.activar(contenedor);
        BloquesEvento.activar(contenedor);
        const selector=contenedor.querySelector('[data-programa-selector]');
        selector?.addEventListener('change',()=>{contenedor.querySelectorAll('[data-programa-jornada]').forEach(panel=>panel.hidden=panel.dataset.programaJornada!==selector.value);});
        const cabecera=document.querySelector('.cabecera-publica');
        if(cabecera&&'ResizeObserver' in window){const medir=()=>contenedor.style.setProperty('--evento-cabecera-alto',Math.ceil(cabecera.getBoundingClientRect().height)+'px');new ResizeObserver(medir).observe(cabecera);medir();}
        contenedor.querySelectorAll(".detalle-cartel img, .detalle-galeria img").forEach((imagen) => imagen.addEventListener("error", () => {
            const boton = imagen.closest("button");
            const seccion = boton.closest(".detalle-seccion");
            boton.remove();
            if (!seccion.querySelector("button")) seccion.remove();
        }, { once: true }));
        contenedor.querySelectorAll(".detalle-cartel img, .detalle-galeria img").forEach((imagen) => {
            if (imagen.complete && imagen.naturalWidth === 0 && !window.BibliotecaImagenes?.esReferencia(imagen.getAttribute("src"))) imagen.dispatchEvent(new Event("error"));
        });
        contenedor.querySelectorAll("[data-ampliar]").forEach((boton) => boton.addEventListener("click", () => {
            const imagen = urlImagen(boton.dataset.ampliar);
            if (!imagen) return;
            disparadorVisor = boton;
            const visor = prepararVisor();
            visor.querySelector("img").src = imagen;
            visor.querySelector("img").alt = boton.querySelector("img")?.alt || "Imagen ampliada";
            visor.hidden = false;
            document.body.classList.add("visor-abierto");
            visor.querySelector("button").focus();
        }));
        if (previo) return;
        const botonGuardar = contenedor.querySelector("[data-guardar-evento]");
        if (botonGuardar) {
            const id = String(evento.id);
            const obtenerFavoritos = () => {
                return FavoritosGilena.lista();
            };
            const actualizar = () => {
                const guardado = obtenerFavoritos().includes(id);
                actualizarBotonGuardar(botonGuardar, guardado);
            };
            actualizar();
            botonGuardar.addEventListener("click", () => {
                const favoritos = obtenerFavoritos();
                const guardado = !favoritos.includes(id);
                const nuevos = guardado ? [...favoritos, id] : favoritos.filter((item) => item !== id);
                try {
                    if (!FavoritosGilena.guardar(nuevos)) throw new Error("Sin almacenamiento");
                    if (guardado) FavoritosGilena.registrar?.(evento); else FavoritosGilena.eliminarReferencia?.(id);
                    actualizar();
                    const estado=contenedor.querySelector('[data-estado-favorito]');if(estado)estado.textContent=guardado?'Evento guardado en favoritos.':'Evento quitado de favoritos.';
                } catch { alert(FavoritosGilena.error); }
            });
            window.addEventListener("storage", (cambio) => {
                if (cambio.key === FavoritosGilena.clave) actualizar();
            });
            document.addEventListener("perfil:cambio", actualizar);
        }
        contenedor.querySelectorAll("[data-guardar-relacionado]").forEach(boton => {
            const id = boton.dataset.guardarRelacionado;
            const actualizar = () => TarjetasEvento.actualizarFavorito(boton, FavoritosGilena.lista().includes(id));
            actualizar();
            boton.addEventListener("click", () => { const lista=FavoritosGilena.lista(), activo=lista.includes(id), nuevos=activo ? lista.filter(x=>x!==id) : [...lista,id]; let relacionado=null; try { relacionado=(JSON.parse(localStorage.getItem("eventos")||"[]")||[]).find(e=>String(e.id)===id); } catch {} if (!FavoritosGilena.guardar(nuevos)) { alert(FavoritosGilena.error); return; } if (activo) FavoritosGilena.eliminarReferencia?.(id); else FavoritosGilena.registrar?.(relacionado); actualizar(); });
        });
        contenedor.querySelector("[data-descargar-ics]")?.addEventListener("click", () => {
            const datos = datosCalendario(evento);
            if (datos) descargarIcs(datos, evento.id);
        });
        contenedor.querySelector("[data-imprimir]")?.addEventListener("click", () => window.print());
        const estado = contenedor.querySelector("[data-estado-compartir]");
        const enlace = window.location.href;
        const copiarEnlace = async () => {
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
            return copiado;
        };
        contenedor.querySelector("[data-compartir]")?.addEventListener("click", async () => {
            try { await navigator.share({ title: texto(evento.titulo), url: enlace }); if(estado)estado.textContent='Enlace compartido.'; }
            catch (error) { if (error.name === "AbortError") { if(estado)estado.textContent='Compartir cancelado.'; } else await copiarEnlace(); }
        });
        contenedor.querySelector("[data-copiar-enlace]")?.addEventListener("click", copiarEnlace);
    }
    return { renderizar, activar, cerrarVisor, visorAbierto, urlImagen, urlGoogleMaps, htmlSeguro };
})();
