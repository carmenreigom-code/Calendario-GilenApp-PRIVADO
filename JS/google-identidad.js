/* Google Identity Services identifica al usuario; solo el servidor puede verificar el ID token y crear una sesión. */
window.GoogleIdentidad = (() => {
  let usuario = null;
  let sesionComprobada = false;
  const oyentes = new Set();
  const avisar = () => { oyentes.forEach(fn => fn(usuario)); document.dispatchEvent(new Event("identidad:cambio")); };
  const ruta = nombre => {
    const valor = window.GILENA_AUTH_ENDPOINTS?.[nombre];
    if (!valor) return "";
    try { const url = new URL(valor, location.href); return url.origin === location.origin && url.protocol !== "file:" ? url.href : ""; }
    catch { return ""; }
  };
  const configurado = () => !!(ruta("login") && ruta("registro") && ruta("sesion") && ruta("salir") && /^[\w-]+\.apps\.googleusercontent\.com$/.test(window.GILENA_GOOGLE_CLIENT_ID || ""));
  const estado = () => ({ usuario, configurado:configurado(), comprobada:!configurado() || sesionComprobada });
  const suscribir = fn => { oyentes.add(fn); return () => oyentes.delete(fn); };
  async function cargarSesion() {
    if (!configurado()) return null;
    try {
      const respuesta = await fetch(ruta("sesion"), { credentials:"same-origin", cache:"no-store" });
      const datos = respuesta.ok ? await respuesta.json() : null;
      usuario = datos?.usuario && typeof datos.usuario.id === "string" && typeof datos.usuario.nombre === "string" ? { id:datos.usuario.id, nombre:datos.usuario.nombre } : null;
    } catch { usuario = null; }
    sesionComprobada = true;
    avisar(); return usuario;
  }
  async function enviarCredencial(modo, credencial) {
    if (!configurado() || !credencial) throw new Error("Falta un backend que verifique la identidad. No se ha iniciado sesión ni creado una cuenta.");
    const respuesta = await fetch(ruta(modo), { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ credential:credencial }) });
    if (!respuesta.ok) throw new Error("No se pudo verificar la identidad en el servidor. No se ha iniciado sesión.");
    const datos = await respuesta.json();
    if (!datos?.usuario || typeof datos.usuario.id !== "string" || typeof datos.usuario.nombre !== "string") throw new Error("El servidor no confirmó una sesión válida.");
    usuario = { id:datos.usuario.id, nombre:datos.usuario.nombre };
    sesionComprobada = true;
    avisar(); return usuario;
  }
  function mostrarBoton(contenedor, modo, informar) {
    if (!configurado()) { informar("Para crear cuentas reales falta un backend que verifique los tokens de Google y gestione sesiones. Los favoritos de visitante siguen disponibles."); return; }
    if (!window.google?.accounts?.id) { informar("No se pudo cargar Google Identity Services. Comprueba la conexión."); return; }
    google.accounts.id.initialize({ client_id:window.GILENA_GOOGLE_CLIENT_ID, auto_select:false, callback:async respuesta => {
      try { informar("Verificando identidad…"); await enviarCredencial(modo,respuesta.credential); location.href = "mis-eventos.html"; }
      catch (error) { informar(error.message); }
    } });
    google.accounts.id.renderButton(contenedor,{ theme:"outline", size:"large", text:modo === "registro" ? "signup_with" : "signin_with" });
  }
  async function salir() {
    if (!usuario || !ruta("salir")) return false;
    const respuesta = await fetch(ruta("salir"),{method:"POST",credentials:"same-origin"});
    if (!respuesta.ok) return false;
    usuario = null;
    window.google?.accounts?.id?.disableAutoSelect?.();
    avisar(); return true;
  }
  return { estado, suscribir, cargarSesion, mostrarBoton, salir };
})();
