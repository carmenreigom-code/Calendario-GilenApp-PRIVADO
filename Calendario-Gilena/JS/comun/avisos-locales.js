/* Avisos locales: funcionan únicamente mientras alguna página de la web permanece abierta. */
window.AvisosGilena = (() => {
  let temporizador = null;
  const dia = valor => /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""));
  const claveFecha = fecha => `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}-${String(fecha.getDate()).padStart(2,"0")}`;
  const avisoMinutos = item => Number.isInteger(Number(item.avisoMinutos)) ? Number(item.avisoMinutos) : -1;
  const inicioLocal = item => {
    if (!dia(item.fecha)) return null;
    const hora = item.tipo === "municipal" && !item.hora ? "09:00" : item.hora || (item.todoElDia ? "09:00" : "");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return null;
    const fecha = new Date(`${item.fecha}T${hora}:00`);
    return claveFecha(fecha) === item.fecha && `${String(fecha.getHours()).padStart(2,"0")}:${String(fecha.getMinutes()).padStart(2,"0")}` === hora && !Number.isNaN(fecha.getTime()) ? fecha : null;
  };
  function pendientes() {
    const perfil = PerfilesGilena.activo();
    if (!perfil) return [];
    const locales = PerfilesGilena.elementos().filter(i => i.tipo === "recordatorio" || i.tipo === "cita").filter(i => !i.completado && avisoMinutos(i) >= 0);
    const favoritos = PerfilesGilena.favoritos();
    const avisos = PerfilesGilena.avisos();
    let municipales = [];
    try {
      const guardados = JSON.parse(localStorage.getItem("eventos") || "[]");
      if (Array.isArray(guardados)) municipales = guardados.filter(i => favoritos.includes(String(i.id)) && avisos[String(i.id)] !== false && (!window.esEventoPublicado || esEventoPublicado(i))).map(i => ({ ...i, tipo:"municipal", avisoMinutos:1440 }));
    } catch { /* Los avisos personales siguen disponibles. */ }
    return [...locales, ...municipales].map(item => {
      const inicio = inicioLocal(item);
      if (!inicio) return null;
      const cuando = new Date(inicio);
      if (avisoMinutos(item) === 1440) cuando.setDate(cuando.getDate() - 1);
      else cuando.setMinutes(cuando.getMinutes() - avisoMinutos(item));
      return { ...item, cuando, clave:`avisoGilena:${perfil.id}:${item.tipo}:${item.id}:${item.fecha}:${item.hora || ""}:${avisoMinutos(item)}` };
    }).filter(Boolean).sort((a,b) => a.cuando - b.cuando);
  }
  const enviado = clave => { try { return localStorage.getItem(clave) === "1"; } catch { return false; } };
  const marcar = clave => { try { localStorage.setItem(clave,"1"); return true; } catch { return false; } };
  async function avisar(item) {
    if (!("Notification" in window) || Notification.permission !== "granted" || document.visibilityState !== "visible" || enviado(item.clave)) return;
    const ejecutar = () => {
      if (enviado(item.clave) || !marcar(item.clave)) return;
      try { new Notification(item.tipo === "recordatorio" ? "Recordatorio de Mi agenda" : "Aviso de Mi agenda", { body:item.titulo || "Tienes un evento próximo" }); }
      catch { /* La marca impide duplicados si el navegador rechaza la notificación. */ }
    };
    // Web Locks serializa pestañas del mismo origen; sin él se muestran avisos en la web, pero no se envían notificaciones nativas duplicables.
    if (navigator.locks?.request) await navigator.locks.request(item.clave, ejecutar);
  }
  function recalcular() {
    clearTimeout(temporizador);
    const ahora = Date.now();
    const lista = pendientes();
    if (document.visibilityState === "visible") lista.filter(i => i.cuando.getTime() <= ahora && i.cuando.getTime() > ahora - 120000 && !enviado(i.clave)).forEach(avisar);
    const siguiente = lista.find(i => i.cuando.getTime() > ahora);
    if (siguiente) temporizador = setTimeout(recalcular, Math.min(Math.max(siguiente.cuando.getTime() - ahora, 1000), 60000));
    document.dispatchEvent(new CustomEvent("avisos:actualizados"));
  }
  function detener() { clearTimeout(temporizador); temporizador = null; }
  document.addEventListener("visibilitychange", recalcular);
  window.addEventListener("storage", cambio => { if (cambio.key?.includes("PerfilGilenaDemo") || cambio.key?.startsWith("avisoGilena:")) recalcular(); });
  document.addEventListener("perfil:salir", detener);
  recalcular();
  return { pendientes, enviado, recalcular, detener };
})();
