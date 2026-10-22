/* Favoritos públicos de este navegador. Los datos de antiguos perfiles se conservan aparte. */
window.FavoritosGilena = (() => {
  const CLAVE = "favoritosMunicipalesGilena";
  const claveActual = () => window.PerfilesGilena?.activo()?.id ? `favoritosPerfilGilenaDemo:${window.PerfilesGilena.activo().id}` : CLAVE;
  const leer = clave => {
    try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
  };
  const ids = valor => Array.isArray(valor) ? [...new Set(valor.map(String))] : [];
  function lista() {
    const clave = claveActual();
    if (!clave) return [];
    const actual = leer(clave);
    if (Array.isArray(actual)) return ids(actual);
    if (clave !== CLAVE) return ids(leer(`preferenciasPerfilGilenaDemo:${window.PerfilesGilena.activo().id}`)?.favoritos);
    const visitante = leer("preferenciasSinPerfilGilenaDemo")?.favoritos;
    return ids(Array.isArray(visitante) ? visitante : leer("eventosFavoritosGilena"));
  }
  function guardar(nuevos) {
    const clave = claveActual();
    if (!clave) return false;
    try { localStorage.setItem(clave, JSON.stringify(ids(nuevos))); document.dispatchEvent(new Event("favoritos:actualizados")); return true; }
    catch { return false; }
  }
  function contarDisponibles() {
    const eventos = leer("eventos");
    const publicados = new Set((Array.isArray(eventos) ? eventos : [])
      .filter(evento => evento && evento.id != null && esEventoPublicado(evento))
      .map(evento => String(evento.id)));
    return lista().filter(id => publicados.has(id)).length;
  }
  function pendientesVisitante() {
    if (!window.PerfilesGilena?.activo()) return [];
    const visitante = leer(CLAVE);
    const antiguos = leer("preferenciasSinPerfilGilenaDemo")?.favoritos || leer("eventosFavoritosGilena");
    return ids(Array.isArray(visitante) ? visitante : antiguos).filter(id => !lista().includes(id));
  }
  function copiarVisitante() { return guardar([...lista(), ...pendientesVisitante()]); }
  const claveReferencias = () => window.PerfilesGilena?.activo()?.id ? `referenciasFavoritosPerfilGilenaDemo:${window.PerfilesGilena.activo().id}` : "referenciasFavoritosGilena";
  const limpio = valor => String(valor || "").trim().replace(/\s+/g, " ");
  const referencia = evento => ({ fecha:limpio(evento?.fecha), fechaFin:limpio(evento?.fechaFin), hora:limpio(evento?.hora), horaFin:limpio(evento?.horaFin), lugar:limpio(evento?.lugar), estadoActividad:limpio(evento?.estadoActividad || "programado") });
  const referencias = () => { const valor = leer(claveReferencias()); return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {}; };
  const guardarReferencias = valor => { try { localStorage.setItem(claveReferencias(), JSON.stringify(valor)); return true; } catch { return false; } };
  function registrar(evento, forzar = false) { if (!evento?.id) return false; const mapa = referencias(), id = String(evento.id); if (!forzar && mapa[id]) return true; mapa[id] = referencia(evento); return guardarReferencias(mapa); }
  function eliminarReferencia(id) { const mapa = referencias(); delete mapa[String(id)]; return guardarReferencias(mapa); }
  function asegurar(eventos) { const porId = new Map((Array.isArray(eventos) ? eventos : []).map(e => [String(e.id), e])); const mapa = referencias(); let cambio = false; lista().forEach(id => { if (!mapa[id] && porId.has(id)) { mapa[id] = referencia(porId.get(id)); cambio = true; } }); return !cambio || guardarReferencias(mapa); }
  function cambios(evento) {
    const anterior = referencias()[String(evento?.id)]; if (!anterior) return [];
    const actual = referencia(evento), nombres = { fecha:"Fecha de inicio", fechaFin:"Fecha final", hora:"Hora de inicio", horaFin:"Hora final", lugar:"Lugar", estadoActividad:"Estado" };
    return Object.keys(nombres).filter(clave => limpio(anterior[clave]).toLocaleLowerCase("es") !== limpio(actual[clave]).toLocaleLowerCase("es")).map(clave => ({ campo:clave, nombre:nombres[clave], anterior:anterior[clave] || "Sin indicar", actual:actual[clave] || "Sin indicar" }));
  }
  return { get clave() { return claveActual(); }, lista, guardar, contarDisponibles, registrar, eliminarReferencia, asegurar, cambios, marcarVisto: evento => registrar(evento, true), pendientesVisitante, copiarVisitante,
    perfilesRecuperables: () => [], recuperar: () => false,
    error: "No se pudo guardar en este navegador. Tus favoritos anteriores se conservan; revisa el espacio o los permisos de almacenamiento." };
})();
