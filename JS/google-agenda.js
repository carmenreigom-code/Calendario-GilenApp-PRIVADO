/* Google Calendar permanece separado de los perfiles locales y del administrador. */
window.GoogleAgenda = (() => {
  const SCOPES = "https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events";
  const BASE = "https://www.googleapis.com/calendar/v3";
  const MARCA_AUTORIZACION = "googleAutorizadoSesionGilena";
  let token = null, caduca = 0, calendarios = [], eventos = [], cliente = null, version = 0, temporizador = null, cargaBiblioteca = null, errorBiblioteca = "", motivo = "";
  let versionAcceso=0,conexionEnCurso=null;
  const autorizado=()=>{try{return sessionStorage.getItem(MARCA_AUTORIZACION)==="1";}catch{return false;}};
  const oyentes = new Set();
  const avisar = () => oyentes.forEach(fn => fn());
  const configurado = () => /^[\w-]+\.apps\.googleusercontent\.com$/.test(String(window.GILENA_GOOGLE_CLIENT_ID || ""));
  const conectado = () => !!token && Date.now() < caduca;
  const estado = () => ({ conectado: conectado(), configurado: configurado(), requiereReconexion: !conectado() && autorizado(), calendarios: [...calendarios], eventos: [...eventos], motivo });
  const suscribir = fn => { oyentes.add(fn); return () => oyentes.delete(fn); };
  function limpiar(razon = "") { versionAcceso++; token = null; caduca = 0; calendarios = []; eventos = []; motivo = razon; version++; clearTimeout(temporizador); avisar(); }
  function error(mensaje, codigo = "") { const e = new Error(mensaje); e.codigo = codigo; return e; }
  function comprobarAcceso() {
    if (!token) throw error("Conecta Google Calendar para continuar.", "sin_acceso");
    if (Date.now() >= caduca) { limpiar("El acceso a Google ha caducado. Vuelve a conectar."); throw error("El acceso a Google ha caducado. Pulsa «Conectar Google Calendar» para volver a autorizar.", "caducado"); }
  }
  function cargarBiblioteca() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (cargaBiblioteca) return cargaBiblioteca;
    errorBiblioteca = "";
    cargaBiblioteca = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => window.google?.accounts?.oauth2 ? resolve() : reject(error("No se pudo iniciar Google Identity Services."));
      script.onerror = () => reject(error("No se pudo cargar Google Identity Services. Comprueba tu conexión."));
      document.head.append(script);
    }).catch(e => { cargaBiblioteca = null; errorBiblioteca = e.message; throw e; });
    return cargaBiblioteca;
  }
  function conectar() {
    if(conexionEnCurso)return conexionEnCurso;
    const tarea=iniciarConexion();conexionEnCurso=tarea;
    tarea.finally(()=>{if(conexionEnCurso===tarea)conexionEnCurso=null;}).catch(()=>{});return tarea;
  }
  function iniciarConexion() {
    if (!configurado()) return Promise.reject(error("Falta el OAuth Client ID. Configúralo en JS/google-config.js. Los favoritos locales siguen disponibles.", "configuracion"));
    if (location.protocol === "file:") return Promise.reject(error("Abre la web con Live Server en localhost; Google no autoriza páginas file://.", "origen"));
    if (!window.google?.accounts?.oauth2) {
      const anterior = errorBiblioteca;
      cargarBiblioteca().catch(() => {});
      return Promise.reject(error(anterior || "Google Identity Services aún está cargando. Pulsa «Conectar Google Calendar» de nuevo en unos segundos.", "cargando"));
    }
    const solicitudAcceso=versionAcceso;
    return new Promise((resolve, reject) => {
      let resuelto = false;
      const espera = setTimeout(() => terminar(reject, error("No se completó la autorización de Google. Cierra la ventana si sigue abierta e inténtalo de nuevo.", "tiempo")), 120000);
      const terminar = (fn, valor) => { if (!resuelto) { resuelto = true; clearTimeout(espera); fn(valor); } };
      try {
        cliente = google.accounts.oauth2.initTokenClient({
          client_id: window.GILENA_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: respuesta => {
            if(solicitudAcceso!==versionAcceso)return terminar(reject,error("La sesión cambió durante la autorización. Vuelve a conectar desde el perfil actual.","sesion_cambiada"));
            if (respuesta.error) return terminar(reject, error(respuesta.error_description || "No se concedió el acceso a Google.", respuesta.error));
            if (!respuesta.access_token || !google.accounts.oauth2.hasGrantedAllScopes(respuesta, ...SCOPES.split(" "))) return terminar(reject, error("No se concedieron todos los permisos necesarios para consultar y editar citas.", "permisos"));
            limpiar();token = respuesta.access_token;
            try{sessionStorage.setItem(MARCA_AUTORIZACION, "1");}catch{}
            caduca = Date.now() + Math.max(0, Number(respuesta.expires_in || 0) - 30) * 1000;
            motivo = "";
            clearTimeout(temporizador);
            temporizador = setTimeout(() => limpiar("El acceso a Google ha caducado. Vuelve a conectar."), Math.max(0, caduca - Date.now()));
            avisar(); terminar(resolve, estado());
          },
          error_callback: fallo => terminar(reject, error(fallo.type === "popup_failed_to_open" ? "La ventana de Google fue bloqueada. Permite ventanas emergentes e inténtalo de nuevo." : "Se cerró o canceló la ventana de autorización de Google.", fallo.type))
        });
        cliente.requestAccessToken({ prompt: "consent" });
      } catch (e) { terminar(reject, error("No se pudo abrir la autorización de Google. Comprueba el Client ID y el origen autorizado.")); }
    });
  }
  function desconectar() {
    const anterior = token;
    limpiar();
    try{sessionStorage.removeItem(MARCA_AUTORIZACION);}catch{}
    if (anterior && window.google?.accounts?.oauth2?.revoke) {
      return new Promise(resolve => {
        try { google.accounts.oauth2.revoke(anterior, resultado => resolve(resultado)); }
        catch { resolve({ error:"No se pudo confirmar la revocación." }); }
      });
    }
    return Promise.resolve(null);
  }
  function olvidarAcceso() { limpiar(); try{sessionStorage.removeItem(MARCA_AUTORIZACION);}catch{} }
  async function peticion(ruta, { method = "GET", body, etag, query } = {}) {
    comprobarAcceso();
    const acceso=versionAcceso;const comprobarVigencia=()=>{if(acceso!==versionAcceso||!conectado())throw error("La sesión de Google cambió o caducó durante la operación. Vuelve a conectar y actualizar.","sesion_cambiada");};
    const url = new URL(BASE + ruta);
    if (query) Object.entries(query).forEach(([k,v]) => { if (v !== "" && v != null) url.searchParams.set(k, String(v)); });
    const headers = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (etag) headers["If-Match"] = etag;
    let respuesta;
    try { respuesta = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" }); }
    catch { throw error("No se pudo contactar con Google. Comprueba la conexión e inténtalo de nuevo.", "red"); }
    comprobarVigencia();
    if (respuesta.status === 401) { limpiar("El acceso a Google ha caducado o fue revocado. Vuelve a conectar."); throw error("El acceso a Google ha caducado o fue revocado. Vuelve a conectar.", "caducado"); }
    if (!respuesta.ok) {
      let detalle = "";
      try { detalle = (await respuesta.json()).error?.message || ""; } catch {}
      if (respuesta.status === 412) throw error("La cita cambió en Google desde que la abriste. Pulsa «Actualizar» antes de intentarlo de nuevo; el formulario se conserva.", "conflicto");
      if (respuesta.status === 403) throw error(`Google denegó la operación. Comprueba los permisos del calendario.${detalle ? " " + detalle : ""}`, "permiso");
      throw error(`Google devolvió un error (${respuesta.status}). ${detalle || "Inténtalo de nuevo."}`, String(respuesta.status));
    }
    const datos=respuesta.status === 204 ? null : await respuesta.json();comprobarVigencia();return datos;
  }
  async function paginas(ruta, query = {}) {
    const todos = [];
    let pagina = "";
    do {
      const resultado = await peticion(ruta, { query: { ...query, pageToken: pagina } });
      todos.push(...(resultado.items || []));
      pagina = resultado.nextPageToken || "";
    } while (pagina);
    return todos;
  }
  async function cargarCalendarios() {
    const acceso=versionAcceso;
    const lista = await paginas("/users/me/calendarList", { maxResults: 250, minAccessRole: "reader" });
    if(acceso!==versionAcceso||!conectado())throw error("La sesión de Google cambió mientras se consultaban los calendarios.","sesion_cambiada");
    calendarios = [...new Map(lista.filter(c => c.id && ["reader", "writer", "owner", "writerWithoutPrivateAccess"].includes(c.accessRole)).map(c => [c.id,c])).values()];
    avisar(); return [...calendarios];
  }
  async function cargarEventos(calendarId, desde, hasta) {
    const solicitud = ++version;
    const ruta = `/calendars/${encodeURIComponent(calendarId)}/events`;
    const lista = await paginas(ruta, { timeMin: desde, timeMax: hasta, singleEvents: true, showDeleted: false, maxResults: 2500 });
    if (solicitud === version) { eventos = [...new Map(lista.filter(e => e.id && e.status !== "cancelled").map(e => [e.id,e])).values()]; avisar(); }
    return [...eventos];
  }
  async function listarEventos(calendarId, desde, hasta) {
    const ruta = `/calendars/${encodeURIComponent(calendarId)}/events`;
    const lista = await paginas(ruta, { timeMin: desde, timeMax: hasta, singleEvents: true, showDeleted: false, maxResults: 2500 });
    return [...new Map(lista.filter(e => e.id && e.status !== "cancelled").map(e => [e.id,e])).values()];
  }
  function quitarEventos() { version++; eventos = []; avisar(); }
  const rutaEvento = (cal,id) => `/calendars/${encodeURIComponent(cal)}/events/${encodeURIComponent(id)}`;
  const obtener = (cal,id) => peticion(rutaEvento(cal,id));
  const cargarColores = () => peticion("/colors");
  const buscarCopia = (cal, clave) => paginas(`/calendars/${encodeURIComponent(cal)}/events`, { privateExtendedProperty:`gilenaCopia=${clave}`, maxResults:250, showDeleted:false });
  const crear = (cal,cuerpo) => peticion(`/calendars/${encodeURIComponent(cal)}/events`, { method:"POST", body:cuerpo });
  const editar = (cal,id,cuerpo,etag) => etag ? peticion(rutaEvento(cal,id), { method:"PATCH", body:cuerpo, etag }) : Promise.reject(error("No se recibió la versión de la cita. Actualiza los datos antes de editar.", "sin_version"));
  if (configurado()) cargarBiblioteca().catch(() => {});
  return { estado, suscribir, conectar, desconectar, olvidarAcceso, cargarCalendarios, cargarColores, cargarEventos, listarEventos, quitarEventos, obtener, buscarCopia, crear, editar, comprobarAcceso };
})();
