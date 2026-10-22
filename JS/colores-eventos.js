/* Paleta de categorías usada por el calendario municipal. Solo colorea cada evento. */
window.ColoresEventos = (() => {
  const municipal = {
    deportes:"#2196f3", cultura:"#9c27b0", fiestas:"#ff9800",
    arte:"#ad5c89", concierto:"#ad5c89", cine:"#7559a3",
    educacion:"#4f7695", ayuntamiento:"#829b53", familiar:"#829b53",
    mercado:"#a98447", naturaleza:"#a98447", gastronomia:"#a98447",
    juventud:"#467e9a", otros:"#607d8b"
  };
  const seguro = valor => /^#[0-9a-f]{6}$/i.test(String(valor || "")) ? valor : "";
  const categoria = clave => seguro(municipal[clave]);
  const google = (item, calendario, paleta) => seguro(paleta?.event?.[item.original?.colorId]?.background) || seguro(calendario?.backgroundColor) || seguro(paleta?.calendar?.[calendario?.colorId]?.background);
  const estilo = color => seguro(color) ? ` style="--evento-color:${color}"` : "";
  return { categoria, google, estilo };
})();
