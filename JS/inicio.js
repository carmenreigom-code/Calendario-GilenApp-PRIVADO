/* Selección editorial de fiestas de la portada. */
(() => {
  const esc = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderizarFiestas() {
    const seccion = document.getElementById('fiestasDestacadas');
    const lista = document.getElementById('listaFiestasDestacadas');
    if (!seccion || !lista) return;
    let eventos = [], orden = [];
    try { eventos = JSON.parse(localStorage.getItem('eventos') || '[]'); orden = JSON.parse(localStorage.getItem('fiestasDestacadasGilena') || '[]'); } catch {}
    if (!Array.isArray(eventos)) eventos = [];
    if (!Array.isArray(orden)) orden = [];
    const elegidos = [...new Set(orden.map(String))].map(id => eventos.find(e => String(e.id) === id && esEventoPublicado(e))).filter(Boolean);
    lista.innerHTML = elegidos.map(e => `<a class="fiesta-tarjeta" href="evento.html?id=${encodeURIComponent(e.id)}"><div class="fiesta-imagen">${ImagenesEvento.renderizar(e,'imagenTarjeta','miniatura-fiesta')}</div><h3>${esc(e.titulo || 'Evento')}</h3></a>`).join('');
    seccion.hidden = !elegidos.length;
    ImagenesEvento.activar(lista);
  }
  renderizarFiestas();
  window.addEventListener('storage', event => { if (['eventos','fiestasDestacadasGilena',null].includes(event.key)) renderizarFiestas(); });
})();
