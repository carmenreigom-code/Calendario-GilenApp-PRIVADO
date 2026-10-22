/* Plantillas y papelera: datos locales, sin cuentas, permisos ni llamadas a Google. */
window.GestionMunicipal = (() => {
  const claves = { plantillas:"plantillasEventosGilena", papelera:"papeleraEventosGilena" };
  const copiar = valor => JSON.parse(JSON.stringify(valor));
  const nuevoId = prefijo => `${prefijo}-${window.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2)}`;
  const campos = ["titulo","categoria","descripcion","descripcion_larga","lugar","direccion","googleMapsUrl","mostrarComoLlegar","hora","horaFin","organizador","telefono","correo","edadRecomendada","accesibilidad","traer","observaciones","tipoPrecio","precio","aforo","urlReserva","web","instagram","facebook","otroEnlace","imagen","imagenTarjeta","imagenCarrusel","cartel","galeria","imagenAjustes","imagenTarjetaAjustes","imagenCarruselAjustes","mostrarCompartir","mostrarRelacionados",...InformacionEvento.textos.filter(k=>!["inscripcionInicio","inscripcionFin"].includes(k)),...Object.keys(InformacionEvento.listas),"accesibilidadOpciones","programa"];
  campos.push("imagenMetadatos");
  const diasEntre = (a,b) => Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);
  function desplazar(fecha,dias) { const d = new Date(fecha+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+dias); return d.toISOString().slice(0,10); }
  function leer(clave, defecto) {
    const raw = localStorage.getItem(clave);
    return raw === null ? copiar(defecto) : JSON.parse(raw);
  }
  function plantillas() {
    const datos = leer(claves.plantillas,{version:1,items:[],recursos:{}});
    if (datos?.version !== 1 || !Array.isArray(datos.items) || !datos.recursos || typeof datos.recursos !== "object" || Array.isArray(datos.recursos)) throw new Error("No se pudo leer la colección de plantillas. No se sobrescribirá.");
    return datos;
  }
  function papelera() {
    const datos = leer(claves.papelera,[]);
    if (!Array.isArray(datos)) throw new Error("No se pudo leer la papelera. No se sobrescribirá.");
    return datos;
  }
  // Una copia por imagen incorporada entre todas las plantillas. No se eliminan recursos al borrar una plantilla.
  function transformar(valor, funcion) {
    if (typeof valor === "string") return valor.replace(/data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+|gilena-recurso:[a-z0-9_-]+/gi, funcion);
    if (Array.isArray(valor)) return valor.map(v=>transformar(v,funcion));
    if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k,v])=>[k,transformar(v,funcion)]));
    return valor;
  }
  function hidratar(datos, recursos) {
    return transformar(datos,valor=> {
      if (!valor.startsWith("gilena-recurso:")) return valor;
      const id = valor.slice(15);
      if (!Object.hasOwn(recursos,id)) throw new Error("Falta una imagen compartida de una plantilla.");
      return recursos[id];
    });
  }
  function compactar(datos, recursos) {
    return transformar(datos,valor=>{
      if (!valor.startsWith("data:image/")) return valor;
      let hash = 2166136261;
      for (let i=0;i<valor.length;i++) hash = Math.imul(hash^valor.charCodeAt(i),16777619);
      const base = `img-${(hash>>>0).toString(36)}`; let id = base, n = 0;
      while (Object.hasOwn(recursos,id) && recursos[id] !== valor) id = `${base}-${++n}`;
      recursos[id] = valor;
      return `gilena-recurso:${id}`;
    });
  }
  function reutilizable(evento) {
    const datos = Object.fromEntries([...new Set(campos)].filter(k=>Object.hasOwn(evento,k) && evento[k] !== undefined).map(k=>[k,copiar(evento[k])]));
    const estructuras={programa:["fecha","hora","titulo","detalle","lugar","diaRelativo"],...InformacionEvento.listas};
    for (const [lista,permitidos] of Object.entries(estructuras)) if (Array.isArray(datos[lista])) datos[lista]=datos[lista].map(item=>Object.fromEntries(Object.entries(item).filter(([k])=>permitidos.includes(k) || k === "diaRelativo" && lista === "sesiones" || k === "visible" && lista === "bloques")));
    if (datos.descripcion_larga) datos.descripcion_larga = DetalleEvento.htmlSeguro(datos.descripcion_larga);
    const fechas = [...(evento.programa || []),...(evento.sesiones || [])].map(s=>s.fecha).filter(InformacionEvento.fecha).sort();
    const base = InformacionEvento.fecha(evento.fecha) ? evento.fecha : fechas[0];
    for (const lista of ["programa","sesiones"]) if (Array.isArray(datos[lista])) datos[lista] = datos[lista].map(item=>{
      const copia = {...item};
      if (InformacionEvento.fecha(copia.fecha) && base) copia.diaRelativo = diasEntre(base,copia.fecha);
      delete copia.fecha;
      return copia;
    });
    return { datos, duracionDias:base && InformacionEvento.fecha(evento.fechaFin) ? Math.max(0,diasEntre(base,evento.fechaFin)) : Number.isSafeInteger(evento.duracionDias) ? evento.duracionDias : 0 };
  }
  function materializar(item, biblioteca, fecha = "") {
    const datos = hidratar(copiar(item.datos),biblioteca.recursos);
    for (const lista of ["programa","sesiones"]) if (Array.isArray(datos[lista])) datos[lista] = datos[lista].map(s=>{
      const nuevo = {...s};
      if (fecha && Number.isSafeInteger(s.diaRelativo)) { nuevo.fecha = desplazar(fecha,s.diaRelativo); delete nuevo.diaRelativo; }
      return nuevo;
    });
    return {...datos,estado:"borrador",estadoActividad:"programado",destacarInicio:false,mensajeEstado:"",reservas:"",fecha,fechaFin:fecha && item.duracionDias ? desplazar(fecha,item.duracionDias) : "",inscripcionInicio:"",inscripcionFin:""};
  }
  function guardarPlantilla(biblioteca, evento, nombre, id = "", duracionDias) {
    const nueva = copiar(biblioteca), reutil = reutilizable({...evento,duracionDias});
    const registro = { id:id || nuevoId("tpl"),nombre:nombre.trim(),modificadaEn:new Date().toISOString(),duracionDias:reutil.duracionDias,datos:compactar(reutil.datos,nueva.recursos) };
    const indice = nueva.items.findIndex(t=>t.id === registro.id);
    if (indice >= 0) nueva.items[indice] = registro; else nueva.items.push(registro);
    return { biblioteca:nueva,registro };
  }
  function validarPlantillas(datos, validarEventos) {
    if (!datos || datos.version !== 1 || !Array.isArray(datos.items) || !datos.recursos || typeof datos.recursos !== "object" || Array.isArray(datos.recursos)) throw new Error("La colección de plantillas no es válida.");
    const usados = new Set();
    for (const [id,valor] of Object.entries(datos.recursos)) if (!/^[a-z0-9_-]+$/i.test(id) || typeof valor !== "string" || !/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(valor)) throw new Error("Un recurso de las plantillas no es válido.");
    for (const item of datos.items) {
      if (!item || typeof item.id !== "string" || !/^[a-z0-9_-]+$/i.test(item.id) || usados.has(item.id) || typeof item.nombre !== "string" || !item.nombre.trim() || !Number.isFinite(Date.parse(item.modificadaEn)) || !Number.isSafeInteger(item.duracionDias) || item.duracionDias < 0 || item.duracionDias > 36500 || !item.datos || typeof item.datos !== "object" || Array.isArray(item.datos)) throw new Error("Hay una plantilla no válida.");
      usados.add(item.id);
      if (Object.keys(item.datos).some(k=>!campos.includes(k))) throw new Error("Una plantilla contiene campos ajenos al contenido reutilizable.");
      for (const lista of ["programa","sesiones"]) if (Array.isArray(item.datos[lista])) for (const s of item.datos[lista]) if (s.fecha || s.diaRelativo != null && (!Number.isSafeInteger(s.diaRelativo) || Math.abs(s.diaRelativo)>36500)) throw new Error("Las fechas relativas de una plantilla no son válidas.");
      const evento = materializar(item,datos);
      validarEventos([{...evento,id:"validacion-plantilla"}]);
    }
  }
  function validarPapelera(datos, activos, validarEventos) {
    if (!Array.isArray(datos)) throw new Error("La papelera no es válida.");
    const ids = new Set(activos.map(e=>String(e.id)));
    for (const registro of datos) {
      if (!registro || !registro.evento || !Number.isFinite(Date.parse(registro.eliminadoEn)) || !["publicado","borrador","archivado"].includes(registro.estadoAnterior) || ids.has(String(registro.evento.id))) throw new Error("Hay un registro no válido o repetido en la papelera.");
      validarEventos([registro.evento]); ids.add(String(registro.evento.id));
    }
  }
  function validarApartados(datos, validarEventos) {
    const extras = {};
    if (Object.hasOwn(datos,"contenidoWeb")) { if (ContenidoWeb.validar(datos.contenidoWeb).length) throw new Error("El contenido público de la copia no es válido."); extras.contenidoWeb = datos.contenidoWeb; }
    if (Object.hasOwn(datos,"plantillas")) { validarPlantillas(datos.plantillas,validarEventos); extras.plantillas = datos.plantillas; }
    if (Object.hasOwn(datos,"papelera")) { validarPapelera(datos.papelera,datos.eventos,validarEventos); extras.papelera = datos.papelera; }
    return extras;
  }
  function prepararExtras(extras, modo, eventos) {
    const cambios = {};
    if (Object.hasOwn(extras,"contenidoWeb")) cambios[ContenidoWeb.clave] = JSON.stringify(extras.contenidoWeb);
    if (extras.plantillas) {
      const actual = plantillas(), nueva = {version:1,items:modo === "sustituir" ? [] : copiar(actual.items),recursos:copiar(actual.recursos)};
      for (const t of extras.plantillas.items) {
        const item = copiar(t); if (nueva.items.some(x=>x.id === item.id)) item.id = nuevoId("tpl");
        item.datos = compactar(hidratar(item.datos,extras.plantillas.recursos),nueva.recursos); nueva.items.push(item);
      }
      cambios[claves.plantillas] = JSON.stringify(nueva);
    }
    if (Object.hasOwn(extras,"papelera")) {
      const nueva = modo === "sustituir" ? [] : papelera();
      const ids = new Set([...eventos.map(e=>String(e.id)),...nueva.map(r=>String(r.evento.id))]);
      for (const r of extras.papelera) { const copia = copiar(r); if (ids.has(String(copia.evento.id))) copia.evento.id = nuevoId("evento"); ids.add(String(copia.evento.id)); nueva.push(copia); }
      cambios[claves.papelera] = JSON.stringify(nueva);
    }
    return cambios;
  }
  const etiquetaDia = n => n >= 0 ? `Día ${n+1} de la plantilla` : `${Math.abs(n)} ${n === -1 ? "día" : "días"} antes del inicio`;
  return { claves,copiar,nuevoId,plantillas,papelera,reutilizable,materializar,guardarPlantilla,hidratar,compactar,validarApartados,prepararExtras,etiquetaDia };
})();
