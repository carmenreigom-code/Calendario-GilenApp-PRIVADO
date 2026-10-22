/* Una configuración por imagen; los eventos antiguos se muestran completos. */
window.ImagenesEvento = (() => {
    const escapar = (valor) => String(valor).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    function urlImagen(valor) {
        if (typeof valor !== "string") return "";
        const imagen = valor.trim();
        if (window.BibliotecaImagenes?.esReferencia(imagen)) return imagen;
        if (!imagen || imagen === "img/hero-placeholder.jpg") return "";
        if (/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(imagen)) return imagen;
        if (/^(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:png|jpe?g|gif|webp)$/i.test(imagen) && !imagen.includes("..")) return imagen;
        try { const url = new URL(imagen); return ["https:", "http:"].includes(url.protocol) && url.hostname ? url.href : ""; } catch { return ""; }
    }
    function normalizar(ajustes) {
        const valor = ajustes && typeof ajustes === "object" ? ajustes : {};
        const foco = (numero) => typeof numero === "number" && Number.isFinite(numero) ? Math.min(100, Math.max(0, numero)) : 50;
        return { modo: valor.modo === "fotografia" ? "fotografia" : "cartel", x: foco(valor.x), y: foco(valor.y) };
    }
    function obtener(evento, tipo = "imagenTarjeta") {
        const campo = tipo === "imagenTarjeta" && urlImagen(evento.imagenTarjeta) ? "imagenTarjeta" : "imagen";
        const ajustes = tipo === "imagenTarjeta"
            ? evento.imagenTarjetaAjustes ?? (campo === "imagen" ? evento.imagenAjustes : null)
            : evento.imagenAjustes;
        return { src: urlImagen(evento[campo]), alt:evento.imagenMetadatos?.[campo]?.alt, pie:evento.imagenMetadatos?.[campo]?.pie, ...normalizar(ajustes) };
    }
    function obtenerCarrusel(evento) {
        const exclusiva = urlImagen(evento.imagenCarrusel);
        const portada = urlImagen(evento.imagen);
        const tarjeta = urlImagen(evento.imagenTarjeta);
        const src = exclusiva || portada || tarjeta;
        return { src, alternativas: [...new Set([portada, tarjeta].filter(imagen => imagen && imagen !== src))], ...normalizar(evento.imagenCarruselAjustes) };
    }
    function renderizarCarrusel(evento, prioridad = false) {
        const imagen = obtenerCarrusel(evento);
        return `<span class="carrusel-imagen modo-${imagen.modo} ${imagen.src ? "" : "sin-imagen"}" style="--imagen-foco-x:${imagen.x}%;--imagen-foco-y:${imagen.y}%"><img class="carrusel-imagen-fondo" alt="" aria-hidden="true" decoding="async"><img class="carrusel-imagen-principal" ${imagen.src ? `${prioridad ? 'src' : 'data-src'}="${escapar(imagen.src)}"` : ""} alt="" ${prioridad ? 'fetchpriority="high" loading="eager"' : 'fetchpriority="low" loading="lazy"'} decoding="async" ${imagen.src ? "" : "hidden"}><span class="carrusel-imagen-vacia" aria-hidden="true"><i class="fa-solid fa-${iconoCategoria(evento.categoria)}"></i></span></span>`;
    }
    function activarCarrusel(contenedor, evento, alFallar) {
        const principal = contenedor.querySelector(".carrusel-imagen-principal");
        const fondo = contenedor.querySelector(".carrusel-imagen-fondo");
        const marco = contenedor.querySelector(".carrusel-imagen");
        if (!principal || !fondo || !marco || !obtenerCarrusel(evento).src) return;
        const alternativas = obtenerCarrusel(evento).alternativas;
        const diapositiva = contenedor.matches(".destacado-diapositiva") ? contenedor : contenedor.querySelector(".destacado-diapositiva");
        const titulo = contenedor.querySelector(".destacado-titulo");
        const ajustarTitulo = () => {
            if (!diapositiva || !titulo) return;
            const textoAlto = titulo.getBoundingClientRect().height - parseFloat(getComputedStyle(titulo).paddingTop || 0) + 8;
            const reserva = Math.max(0, Math.min(textoAlto, diapositiva.clientHeight - 70));
            marco.style.setProperty("--carrusel-titulo-alto", `${Math.ceil(reserva)}px`);
        };
        const observar = typeof ResizeObserver === "function" ? new ResizeObserver(ajustarTitulo) : null;
        if (diapositiva) observar?.observe(diapositiva);
        if (titulo) observar?.observe(titulo);
        ajustarTitulo();
        const cargada = () => { fondo.src = principal.currentSrc || principal.src; marco.classList.remove("sin-imagen"); ajustarTitulo(); };
        const fallida = () => {
            if (alternativas.length) { principal.src = alternativas.shift(); return; }
            principal.removeAttribute("src");
            principal.hidden = true;
            fondo.removeAttribute("src");
            marco.classList.add("sin-imagen");
            alFallar?.();
        };
        principal.addEventListener("load", cargada);
        principal.addEventListener("error", fallida);
        if (principal.hasAttribute("src") && principal.complete && !window.BibliotecaImagenes?.esReferencia(principal.getAttribute("src"))) principal.naturalWidth ? cargada() : fallida();
        return () => { observar?.disconnect(); principal.removeEventListener("load", cargada); principal.removeEventListener("error", fallida); };
    }
    const iconoCategoria = (categoria) => ({ cultura: "masks-theater", deportes: "futbol", fiestas: "champagne-glasses", arte: "palette", concierto: "music", cine: "film", educacion: "book-open", ayuntamiento: "landmark", familiar: "people-group", mercado: "basket-shopping", naturaleza: "leaf", gastronomia: "utensils", juventud: "star" })[categoria] || "calendar-days";
    function renderizar(evento, tipo = "imagenTarjeta", clase = "", ampliar = false) {
        const imagen = obtener(evento, tipo);
        const esBoton = ampliar && imagen.src && imagen.modo === "cartel";
        const etiqueta = esBoton ? "button" : "div";
        return `<${etiqueta} class="imagen-evento-marco modo-${imagen.modo} ${clase} ${imagen.src ? "" : "sin-imagen"}" style="--imagen-foco-x:${imagen.x}%;--imagen-foco-y:${imagen.y}%" ${esBoton ? `type="button" data-ampliar="${escapar(imagen.src)}" aria-label="Ampliar portada del evento"` : ""}>${imagen.src ? `<img src="${escapar(imagen.src)}" alt="${escapar(imagen.alt || evento.titulo || "Imagen del evento")}" ${tipo === "imagenTarjeta" ? 'loading="lazy"' : ""}>` : ""}<span class="imagen-evento-vacio" aria-hidden="true"><i class="fa-solid fa-${iconoCategoria(evento.categoria)}"></i></span>${esBoton ? '<span class="imagen-evento-ampliar" aria-hidden="true"><i class="fa-solid fa-expand"></i> Ampliar</span>' : ""}</${etiqueta}>${imagen.pie ? `<p class="imagen-pie">${escapar(imagen.pie)}</p>` : ""}`;
    }
    function activar(contenedor) {
        contenedor.querySelectorAll(".imagen-evento-marco > img").forEach((imagen) => {
            const ajustarProporcion = () => {
                if (!imagen.isConnected || !imagen.naturalWidth || !imagen.naturalHeight) return;
                const marco = imagen.parentElement;
                const proporcion = imagen.naturalWidth / imagen.naturalHeight;
                marco.style.setProperty("--imagen-proporcion", String(proporcion));
                const completa = marco.classList.contains("modo-cartel");
                marco.closest(".tarjeta-evento-compacta")?.classList.toggle("imagen-panoramica", completa && proporcion >= 2.8);
                const cabecera = marco.closest(".hero-evento");
                const destacado = marco.closest(".destacado-imagen");
                if (destacado) {
                    destacado.classList.toggle("destacado-vertical", completa && proporcion < 0.85);
                    destacado.classList.toggle("destacado-panoramico", completa && proporcion >= 2.4);
                }
                if (cabecera) {
                    cabecera.classList.toggle("hero-panoramica", completa && proporcion >= 2.4);
                    cabecera.classList.toggle("hero-vertical", completa && proporcion < 0.85);
                }
            };
            const fallo = () => {
                const marco = imagen.parentElement;
                if (!marco) return;
                imagen.remove();
                marco.classList.add("sin-imagen");
                marco.removeAttribute("data-ampliar");
                marco.querySelector(".imagen-evento-ampliar")?.remove();
                if (marco.tagName === "BUTTON") { marco.disabled = true; marco.setAttribute("aria-label", "Imagen no disponible"); }
            };
            imagen.addEventListener("error", fallo, { once: true });
            imagen.addEventListener("load", ajustarProporcion, { once: true });
            if (imagen.complete && !window.BibliotecaImagenes?.esReferencia(imagen.getAttribute("src"))) imagen.naturalWidth ? ajustarProporcion() : fallo();
        });
    }
    return { urlImagen, normalizar, obtener, obtenerCarrusel, renderizar, renderizarCarrusel, activar, activarCarrusel, iconoCategoria };
})();
