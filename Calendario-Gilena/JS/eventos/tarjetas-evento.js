/* Tarjeta municipal común: inicio, favoritos y eventos relacionados. */
window.TarjetasEvento = (() => {
  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const nombres = { cultura:"Cultura", deportes:"Deportivo", fiestas:"Fiesta", arte:"Arte", concierto:"Concierto", cine:"Cine", educacion:"Educación", ayuntamiento:"Ayuntamiento", familiar:"Familiar", mercado:"Mercado", naturaleza:"Naturaleza", gastronomia:"Gastronomía", juventud:"Juventud", otros:"Otros" };
  function fechaTarjeta(evento) {
    const leer = valor => {
      const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ""));
      if (!partes) return null;
      const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), 12);
      return fecha.getFullYear() === Number(partes[1]) && fecha.getMonth() === Number(partes[2]) - 1 && fecha.getDate() === Number(partes[3]) ? fecha : null;
    };
    const inicio = leer(evento.fecha), fin = leer(evento.fechaFin);
    if (!inicio) return "";
    const varios = fin && fin > inicio;
    const mes = inicio.toLocaleDateString("es-ES", { month:"short" }).replace(".", "");
    const rango = formatearRangoEvento(evento.fecha, evento.fechaFin);
    const inicioTexto = `<time datetime="${esc(evento.fecha)}" aria-label="${esc(inicio.toLocaleDateString("es-ES", {day:"numeric",month:"long",year:"numeric"}))}"><strong>${inicio.getDate()}</strong><span>${esc(mes)}</span></time>`;
    const finalTexto = varios ? `<span class="tarjeta-fecha-resto">${fin.getFullYear() !== inicio.getFullYear() ? `${inicio.getFullYear()} ` : ""}— ${esc(rango.slice(rango.indexOf(" al ") + 4))}</span>` : `<span class="tarjeta-fecha-resto">${inicio.getFullYear()}</span>`;
    return `<p class="tarjeta-fecha" aria-label="${esc(rango)}"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${inicioTexto}${finalTexto}</p>`;
  }
  function contenidoFavorito(activo) {
    return `<i class="${activo ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>`;
  }
  function actualizarFavorito(boton, activo) {
    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
    boton.setAttribute("aria-label", activo ? "Quitar de favoritos" : "Guardar en favoritos");
    boton.title = activo ? "Quitar de favoritos" : "Guardar en favoritos";
    boton.innerHTML = contenidoFavorito(activo);
  }
  function renderizar(evento, opciones = {}) {
    const id = String(evento.id), activo = Boolean(opciones.favorito);
    const atributo = ['data-favorito','data-quitar','data-guardar-relacionado'].includes(opciones.atributoFavorito) ? opciones.atributoFavorito : 'data-favorito';
    const estado = ['cancelado','aplazado'].includes(evento.estadoActividad) ? `<span class="tarjeta-estado ${evento.estadoActividad}">${evento.estadoActividad === 'cancelado' ? 'Cancelado' : 'Aplazado'}</span>` : '';
    const finInscripcion = String(evento.inscripcionFin || "");
    const fechaLimite = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(finInscripcion) ? new Date(finInscripcion) : null;
    const plazo = fechaLimite && !Number.isNaN(fechaLimite.getTime()) && `${fechaLimite.getFullYear()}-${String(fechaLimite.getMonth()+1).padStart(2,"0")}-${String(fechaLimite.getDate()).padStart(2,"0")}` === finInscripcion.slice(0,10) ? fechaLimite.getTime() : NaN;
    const avisoInscripcion = !estado && evento.reservas !== 'no' && Number.isFinite(plazo) && Date.now() > plazo ? '<span class="tarjeta-estado inscripcion-cerrada">Inscripción cerrada</span>' : '';
    const plazas = !estado && evento.reservas === 'agotadas' ? '<span class="tarjeta-estado inscripcion-cerrada">Plazas completas</span>' : '';
    const horario = [evento.hora, evento.horaFin].filter(Boolean).join(' – ');
    const color = window.ColoresEventos?.categoria(evento.categoria) || '#607d8b';
    const enlace = opciones.previo ? '<span class="boton-evento">Ver evento</span>' : `<a class="boton-evento" href="evento.html?id=${encodeURIComponent(id)}">Ver evento <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;
    return `<article class="evento-card tarjeta-evento-unificada ${esc(opciones.clases || '')}" style="--evento-color:${color}">
      <div class="tarjeta-media">${ImagenesEvento.renderizar(evento,'imagenTarjeta','miniatura-evento')}</div>
      <div class="evento-contenido tarjeta-evento-contenido">
        <div class="tarjeta-etiquetas"><span class="categoria"><i class="fa-solid fa-${ImagenesEvento.iconoCategoria(evento.categoria)}" aria-hidden="true"></i> ${esc(nombres[evento.categoria] || nombres.otros)}</span>${estado}${plazas || avisoInscripcion}</div>
        <h3>${esc(evento.titulo || 'Evento')}</h3>
        ${fechaTarjeta(evento)}
        ${horario ? `<p class="evento-metadatos"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(horario)}</p>` : ''}
        ${evento.lugar ? `<p class="evento-metadatos"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(evento.lugar)}</p>` : ''}
        ${estado && evento.mensajeEstado ? `<p class="favoritos-aviso">${esc(evento.mensajeEstado)}</p>` : ''}${opciones.extra || ''}
        <div class="tarjeta-acciones">${enlace}${opciones.previo ? '' : `<button type="button" class="tarjeta-guardar ${activo ? 'activo' : ''}" ${atributo}="${esc(id)}" aria-label="${activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}" title="${activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}" aria-pressed="${activo}">${contenidoFavorito(activo)}</button>`}${opciones.acciones || ''}</div>
      </div>
    </article>`;
  }
  function iniciarVista(raiz, contenedores) {
    if (!raiz) return;
    const botones = [...raiz.querySelectorAll("[data-vista-eventos]")];
    const pintar = () => {
      const vista = window.AjustesGilena?.obtener().vistaEventos === "lista" ? "lista" : "cuadricula";
      contenedores.forEach(nodo => nodo?.classList.toggle("vista-lista", vista === "lista"));
      botones.forEach(boton => boton.setAttribute("aria-pressed", String(boton.dataset.vistaEventos === vista)));
    };
    raiz.addEventListener("click", evento => {
      const boton = evento.target.closest("[data-vista-eventos]");
      if (!boton || !raiz.contains(boton)) return;
      window.AjustesGilena?.actualizar("vistaEventos", boton.dataset.vistaEventos);
      pintar();
    });
    document.addEventListener("ajustes:cambio", evento => { if (["vistaEventos","restablecer"].includes(evento.detail.clave)) pintar(); });
    document.addEventListener("perfil:cambio", pintar);
    window.addEventListener("storage", evento => { if (evento.key?.startsWith("ajustesPersonalesGilena")) pintar(); });
    pintar();
  }
  return { renderizar, actualizarFavorito, iniciarVista };
})();
