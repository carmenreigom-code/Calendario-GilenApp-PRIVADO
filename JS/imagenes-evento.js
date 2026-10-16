/* Una configuración por imagen; los eventos antiguos se muestran completos. */
window.ImagenesEvento = (() => {
    const escapar = (valor) => String(valor).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    function urlImagen(valor) {
        if (typeof valor !== "string") return "";
        const imagen = valor.trim();
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
        return { src: urlImagen(evento[campo]), ...normalizar(ajustes) };
    }
    const iconoCategoria = (categoria) => ({ cultura: "masks-theater", deportes: "futbol", fiestas: "champagne-glasses", arte: "palette", concierto: "music", cine: "film", educacion: "book-open", ayuntamiento: "landmark", familiar: "people-group", mercado: "basket-shopping", naturaleza: "leaf", gastronomia: "utensils", juventud: "star" })[categoria] || "calendar-days";
    function renderizar(evento, tipo = "imagenTarjeta", clase = "", ampliar = false) {
        const imagen = obtener(evento, tipo);
        const esBoton = ampliar && imagen.src && imagen.modo === "cartel";
        const etiqueta = esBoton ? "button" : "div";
        return `<${etiqueta} class="imagen-evento-marco modo-${imagen.modo} ${clase} ${imagen.src ? "" : "sin-imagen"}" style="--imagen-foco-x:${imagen.x}%;--imagen-foco-y:${imagen.y}%" ${esBoton ? `type="button" data-ampliar="${escapar(imagen.src)}" aria-label="Ampliar portada del evento"` : ""}>${imagen.src ? `<img src="${escapar(imagen.src)}" alt="${escapar(evento.titulo || "Imagen del evento")}" ${tipo === "imagenTarjeta" ? 'loading="lazy"' : ""}>` : ""}<span class="imagen-evento-vacio" aria-hidden="true"><i class="fa-solid fa-${iconoCategoria(evento.categoria)}"></i></span>${esBoton ? '<span class="imagen-evento-ampliar" aria-hidden="true"><i class="fa-solid fa-expand"></i> Ampliar</span>' : ""}</${etiqueta}>`;
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
            if (imagen.complete) imagen.naturalWidth ? ajustarProporcion() : fallo();
        });
    }
    return { urlImagen, normalizar, obtener, renderizar, activar };
})();
