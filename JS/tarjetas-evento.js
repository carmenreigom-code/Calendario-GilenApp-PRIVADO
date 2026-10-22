/* Tarjeta municipal común: inicio, favoritos y eventos relacionados. */
window.TarjetasEvento = (() => {
  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const nombres = { cultura:"Cultura", deportes:"Deportivo", fiestas:"Fiesta", arte:"Arte", concierto:"Concierto", cine:"Cine", educacion:"Educación", ayuntamiento:"Ayuntamiento", familiar:"Familiar", mercado:"Mercado", naturaleza:"Naturaleza", gastronomia:"Gastronomía", juventud:"Juventud", otros:"Otros" };
  function insignia(evento) {
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(evento.fecha || "") ? new Date(`${evento.fecha}T12:00:00`) : null;
    if (!fecha || Number.isNaN(fecha.getTime())) return "";
    return `<time class="tarjeta-insignia-fecha" datetime="${esc(evento.fecha)}" aria-label="Comienza el ${esc(fecha.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}))}"><strong>${fecha.getDate()}</strong><span>${esc(fecha.toLocaleDateString('es-ES',{month:'short'}).replace('.', ''))}</span></time>`;
  }
  function contenidoFavorito(activo) {
    return `<i class="${activo ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i><span>${activo ? 'Quitar' : 'Guardar'}</span>`;
  }
  function actualizarFavorito(boton, activo) {
    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
    boton.setAttribute("aria-label", activo ? "Quitar de favoritos" : "Guardar en favoritos");
    boton.innerHTML = contenidoFavorito(activo);
  }
  function renderizar(evento, opciones = {}) {
    const id = String(evento.id), activo = Boolean(opciones.favorito);
    const atributo = ['data-favorito','data-quitar','data-guardar-relacionado'].includes(opciones.atributoFavorito) ? opciones.atributoFavorito : 'data-favorito';
    const estado = ['cancelado','aplazado'].includes(evento.estadoActividad) ? `<span class="tarjeta-estado ${evento.estadoActividad}">${evento.estadoActividad === 'cancelado' ? 'Cancelado' : 'Aplazado'}</span>` : '';
    const horario = [evento.hora, evento.horaFin].filter(Boolean).join(' – ');
    const color = window.ColoresEventos?.categoria(evento.categoria) || '#607d8b';
    const enlace = opciones.previo ? '<span class="boton-evento">Ver evento</span>' : `<a class="boton-evento" href="evento.html?id=${encodeURIComponent(id)}">Ver evento <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;
    return `<article class="evento-card tarjeta-evento-unificada ${esc(opciones.clases || '')}" style="--evento-color:${color}">
      <div class="tarjeta-media">${ImagenesEvento.renderizar(evento,'imagenTarjeta','miniatura-evento')}${insignia(evento)}</div>
      <div class="evento-contenido tarjeta-evento-contenido">
        <div class="tarjeta-etiquetas"><span class="categoria"><i class="fa-solid fa-${ImagenesEvento.iconoCategoria(evento.categoria)}" aria-hidden="true"></i> ${esc(nombres[evento.categoria] || nombres.otros)}</span>${estado}</div>
        <h3>${esc(evento.titulo || 'Evento')}</h3>
        <p class="evento-fecha"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${esc(formatearRangoEvento(evento.fecha,evento.fechaFin))}</p>
        ${horario ? `<p class="evento-metadatos"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(horario)}</p>` : ''}
        ${evento.lugar ? `<p class="evento-metadatos"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(evento.lugar)}</p>` : ''}
        ${estado && evento.mensajeEstado ? `<p class="favoritos-aviso">${esc(evento.mensajeEstado)}</p>` : ''}${opciones.extra || ''}
        <div class="tarjeta-acciones">${enlace}${opciones.previo ? '' : `<button type="button" class="tarjeta-guardar ${activo ? 'activo' : ''}" ${atributo}="${esc(id)}" aria-label="${activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}" aria-pressed="${activo}">${contenidoFavorito(activo)}</button>`}${opciones.acciones || ''}</div>
      </div>
    </article>`;
  }
  return { renderizar, actualizarFavorito };
})();
