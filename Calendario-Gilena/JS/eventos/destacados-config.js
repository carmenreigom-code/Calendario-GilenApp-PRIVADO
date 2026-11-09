/* Selección editorial compartida por el inicio y el administrador.
   Los indicadores antiguos se leen sin reescribir los eventos. */
window.DestacadosGilena = (() => {
  const clave = "configuracionDestacadosGilena", claveOrden = "destacadosInicioGilena";
  const leer = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const ids = datos => [...new Set((Array.isArray(datos) ? datos : []).map(String))].slice(0, 6);
  function configuracion(eventos = []) {
    const actual = leer(clave);
    if (actual?.version === 1 && Array.isArray(actual.ids)) return { version:1, ids:ids(actual.ids) };
    return { version:1, ids:ids([...(Array.isArray(leer(claveOrden)) ? leer(claveOrden) : []), ...eventos.filter(e => e.destacarInicio).map(e => e.id)]) };
  }
  function elegibles(eventos, ahora = new Date()) {
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,"0")}-${String(ahora.getDate()).padStart(2,"0")}`;
    const lista = eventos.filter(e => e && esEventoPublicado(e) && e.estadoActividad !== "cancelado" && e.fecha && ImagenesEvento.obtenerCarrusel(e).src && (e.fechaFin || e.fecha) >= hoy && !((e.fechaFin || e.fecha) === hoy && /^([01]\d|2[0-3]):[0-5]\d$/.test(e.horaFin || "") && new Date(`${e.fechaFin || e.fecha}T${e.horaFin}:00`) < ahora))
      .sort((a,b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora || "99:99").localeCompare(String(b.hora || "99:99")) || String(a.id).localeCompare(String(b.id)));
    return lista.filter((e,i) => lista.findIndex(x => String(x.id) === String(e.id)) === i);
  }
  function seleccionar(eventos) {
    const candidatos = elegibles(eventos), actual = leer(clave);
    const configurada = actual?.version === 1 && Array.isArray(actual.ids);
    const orden = configurada ? ids(actual.ids) : ids(leer(claveOrden));
    const manual = orden.map(id => candidatos.find(e => String(e.id) === id)).filter(Boolean);
    if (!configurada) candidatos.filter(e => e.destacarInicio).forEach(e => { if (manual.length < 6 && !manual.some(x => String(x.id) === String(e.id))) manual.push(e); });
    candidatos.forEach(e => { if (manual.length < 6 && !manual.some(x => String(x.id) === String(e.id))) manual.push(e); });
    return manual;
  }
  function guardar(orden) {
    return escribir({ [clave]:JSON.stringify({ version:1, ids:ids(orden) }), [claveOrden]:JSON.stringify(ids(orden)) });
  }
  // Prepara todo antes de escribir; restaura únicamente las claves ya modificadas.
  function escribir(cambios) {
    const anteriores = {}, escritas = [];
    try {
      Object.keys(cambios).forEach(key => { anteriores[key] = localStorage.getItem(key); });
      for (const [key, valor] of Object.entries(cambios)) {
        if (valor === null) localStorage.removeItem(key); else localStorage.setItem(key, valor);
        escritas.push(key);
      }
      return { ok:true };
    } catch (error) {
      let restaurado = true;
      escritas.reverse().forEach(key => { try { if (anteriores[key] === null) localStorage.removeItem(key); else localStorage.setItem(key, anteriores[key]); } catch { restaurado = false; } });
      return { ok:false, restaurado, error };
    }
  }
  return { clave, claveOrden, configuracion, elegibles, seleccionar, guardar, escribir };
})();
