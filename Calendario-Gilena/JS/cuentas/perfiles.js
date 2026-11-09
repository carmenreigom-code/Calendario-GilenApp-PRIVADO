/* Perfiles de demostración: no son cuentas ni proporcionan autenticación. */
window.PerfilesGilena = (() => {
  const CLAVE = "perfilesGilenaDemo";
  const ACTIVO = "perfilActivoGilenaDemo";
  const FAVORITOS = "eventosFavoritosGilena";
  const AVISOS = "avisosEventosGilena";
  const PREFERENCIAS_SIN_PERFIL = "preferenciasSinPerfilGilenaDemo";
  const errorGuardado = "No se pudo guardar en este navegador. Tus datos anteriores se conservan; revisa el espacio o los permisos de almacenamiento.";
  const leer = (clave, defecto) => {
    try { const valor = JSON.parse(localStorage.getItem(clave)); return valor ?? defecto; }
    catch { return defecto; }
  };
  const perfiles = () => {
    const datos = leer(CLAVE, []);
    return Array.isArray(datos) ? datos.filter(p => p && typeof p.id === "string" && typeof p.nombre === "string" && typeof p.correo === "string") : [];
  };
  const activo = () => {
    try {
      const guardado = JSON.parse(localStorage.getItem(ACTIVO));
      return perfiles().find(p => p.id === guardado?.id && p.correo === guardado.correo) || null;
    } catch { return null; }
  };
  const clave = (tipo, id = activo()?.id) => `${tipo}PerfilGilenaDemo:${id}`;
  const escribir = (claveDestino, valor) => {
    try { localStorage.setItem(claveDestino, JSON.stringify(valor)); return true; }
    catch { return false; }
  };
  const guardarSesion = perfil => {
    try { localStorage.setItem(ACTIVO, JSON.stringify(perfil)); document.dispatchEvent(new Event("perfil:cambio")); return true; }
    catch { return false; }
  };
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const normalizarCorreo = correo => correo.trim().toLocaleLowerCase("es");
  function registrar(nombre, correo) {
    nombre = nombre.trim(); correo = normalizarCorreo(correo);
    if (!nombre || nombre.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "Introduce un nombre y un correo electrónico válidos." };
    const existentes = perfiles();
    if (existentes.some(p => normalizarCorreo(p.correo) === correo)) return { error: "Ya existe un perfil con ese correo." };
    const perfil = { id: uid(), nombre, correo };
    if (!escribir(CLAVE, [...existentes, perfil])) return { error: errorGuardado };
    if (!guardarSesion(perfil)) return { error: "Perfil creado, pero no se pudo recordar el acceso en este navegador." };
    return { perfil };
  }
  function entrar(correo) {
    const perfil = perfiles().find(p => normalizarCorreo(p.correo) === normalizarCorreo(correo));
    if (!perfil) return { error: "No hay un perfil local con ese correo." };
    return guardarSesion(perfil) ? { perfil } : { error: "No se pudo recordar el acceso en este navegador." };
  }
  function salir() {
    try { localStorage.removeItem(ACTIVO); }
    catch { return false; }
    try { sessionStorage.removeItem(ACTIVO); } catch {}
    window.GoogleAgenda?.olvidarAcceso();
    document.dispatchEvent(new Event("perfil:cambio"));
    return true;
  }
  const preferenciasSinPerfil = () => leer(PREFERENCIAS_SIN_PERFIL, null) || { favoritos: leer(FAVORITOS, []), avisos: leer(AVISOS, {}) };
  const preferencias = () => activo() ? leer(clave("preferencias"), { favoritos: [], avisos: {} }) : preferenciasSinPerfil();
  function favoritos() {
    const datos = preferencias().favoritos;
    return Array.isArray(datos) ? datos.map(String) : [];
  }
  function avisos() {
    const datos = preferencias().avisos;
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
  }
  function guardarPreferencias(favs, alertas) {
    return escribir(activo() ? clave("preferencias") : PREFERENCIAS_SIN_PERFIL, { favoritos: favs, avisos: alertas });
  }
  function elementos() {
    if (!activo()) return [];
    const datos = leer(clave("agenda"), []);
    return Array.isArray(datos) ? datos : [];
  }
  function guardarElementos(datos) { return !!activo() && escribir(clave("agenda"), datos); }
  function vinculosGoogle() {
    if (!activo()) return [];
    const datos = leer(clave("vinculosGoogle"), []);
    return Array.isArray(datos) ? datos.filter(v => v && typeof v.municipalId === "string" && typeof v.calendarId === "string" && typeof v.eventId === "string") : [];
  }
  function guardarVinculosGoogle(datos) { return !!activo() && escribir(clave("vinculosGoogle"), datos); }
  function copiarFavoritosAnteriores() {
    if (!activo()) return false;
    const { favoritos: antiguos, avisos: antiguosAvisos } = preferenciasSinPerfil();
    if (!Array.isArray(antiguos)) return false;
    return guardarPreferencias([...new Set([...favoritos(), ...antiguos.map(String)])], { ...antiguosAvisos, ...avisos() });
  }
  function pendientesDeCopia() {
    const antiguos = preferenciasSinPerfil().favoritos;
    return !!activo() && Array.isArray(antiguos) && antiguos.some(id => !favoritos().includes(String(id)));
  }
  return { activo, perfiles, registrar, entrar, salir, favoritos, avisos, guardarPreferencias, elementos, guardarElementos, vinculosGoogle, guardarVinculosGoogle, copiarFavoritosAnteriores, pendientesDeCopia, errorGuardado, uid };
})();
