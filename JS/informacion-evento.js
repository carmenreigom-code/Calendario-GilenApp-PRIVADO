/* Datos opcionales del evento. Texto plano y enlaces permanentes HTTP(S). */
window.InformacionEvento = (() => {
  const textos = ["subtitulo", "publico", "etiquetas", "aperturaPuertas", "indicacionesAcceso", "espaciosSecundarios", "inscripcionInicio", "inscripcionFin", "colaboradores"];
  const listas = {
    sesiones:["fecha", "hora", "horaFin", "lugar"],
    tarifas:["nombre", "importe", "condiciones"],
    contactos:["nombre", "telefono", "correo", "url"],
    enlacesAdicionales:["titulo", "url", "tipo"],
    bloques:BloquesEvento.campos
  };
  const accesibilidad = { silla:"Acceso para silla de ruedas", aseo:"Aseo adaptado", signos:"Interpretación en lengua de signos", bucle:"Bucle magnético", apoyo:"Apoyo durante la actividad", tranquilo:"Espacio tranquilo" };
  const texto = value => typeof value === "string" ? value.trim() : "";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
  const multilinea = value => esc(value).replace(/\r?\n/g,"<br>");
  function url(valor) { try { const u = new URL(valor); return ["https:","http:"].includes(u.protocol) && u.hostname ? u.href : ""; } catch { return ""; } }
  function fecha(valor) { if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false; const d = new Date(`${valor}T12:00:00`); return !Number.isNaN(+d) && d.getFullYear() === +valor.slice(0,4) && d.getMonth()+1 === +valor.slice(5,7) && d.getDate() === +valor.slice(8,10); }
  const hora = valor => /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
  const instante = valor => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) && fecha(valor.slice(0,10)) && hora(valor.slice(11));
  function validar(e) {
    const errores = [], error = (campo, mensaje) => errores.push([campo, mensaje]);
    textos.forEach(k => { if (e[k] != null && typeof e[k] !== "string") error(k,"Debe ser texto."); });
    if (e.aperturaPuertas && !hora(e.aperturaPuertas)) error("aperturaPuertas","Introduce una hora válida.");
    ["inscripcionInicio","inscripcionFin"].forEach(k => { if (e[k] && !instante(e[k])) error(k,"Introduce fecha y hora válidas."); });
    if (e.inscripcionInicio && e.inscripcionFin && e.inscripcionFin < e.inscripcionInicio) error("inscripcionFin","El plazo debe terminar después de su inicio.");
    Object.entries(listas).forEach(([k, campos]) => {
      if (e[k] == null) return;
      if(k === "bloques"){errores.push(...BloquesEvento.validar(e[k]));return;}
      if (!Array.isArray(e[k])) { error(k,"La lista no es válida."); return; }
      e[k].forEach((item, i) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) { error(k,"Hay un elemento no válido."); return; }
        campos.forEach(c => { if (item[c] != null && typeof item[c] !== "string") error(`${k}.${i}.${c}`,"Debe ser texto."); });
        const revisar = (c, valido, mensaje) => { if (item[c] && !valido(item[c])) error(`${k}.${i}.${c}`,mensaje); };
        if (k === "sesiones") {
          revisar("fecha",fecha,"Selecciona una fecha válida."); revisar("hora",hora,"Introduce una hora válida."); revisar("horaFin",hora,"Introduce una hora válida.");
          if (item.hora && item.horaFin) {
            const r=window.RevisionEventos?.intervaloSesion(e,item);
            if (r ? r.fin <= r.inicio : item.horaFin <= item.hora) error(`${k}.${i}.horaFin`,"El fin de la sesión debe ser posterior al inicio.");
          }
        }
        if (k === "tarifas") revisar("importe",v => /^\d+(?:[.,]\d{1,2})?$/.test(v),"Usa un importe igual o superior a cero, con hasta dos decimales.");
        if (k === "contactos") {
          revisar("correo",v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),"Introduce un correo válido.");
          revisar("telefono",v => /^[+\d\s().-]{6,25}$/.test(v),"Introduce un teléfono válido.");
        }
        if (["contactos","enlacesAdicionales"].includes(k)) revisar("url",url,"Usa una URL permanente que empiece por https:// o http://.");
        if (k === "enlacesAdicionales" && item.tipo != null && !["", "enlace","documento"].includes(item.tipo)) error(`${k}.${i}.tipo`,"Tipo de enlace no válido.");
        if (k === "bloques" && item.visible != null && typeof item.visible !== "boolean") error(`${k}.${i}.visible`,"La visibilidad no es válida.");
      });
    });
    if (e.accesibilidadOpciones != null && (!Array.isArray(e.accesibilidadOpciones) || e.accesibilidadOpciones.some(v => !Object.hasOwn(accesibilidad,v)))) error("accesibilidadOpciones","Las opciones de accesibilidad no son válidas.");
    if (e.tipoPrecio === "gratis" && Array.isArray(e.tarifas) && e.tarifas.some(t => Number(String(t?.importe || "").replace(",",".")) > 0)) error("tipoPrecio","Has indicado Gratis, pero hay tarifas de pago. Revisa el tipo de acceso o las tarifas.");
    if (e.imagenMetadatos != null) {
      if (typeof e.imagenMetadatos !== "object" || Array.isArray(e.imagenMetadatos)) error("imagenMetadatos","Los textos y encuadres de imagen no son válidos.");
      else for (const [uso,m] of Object.entries(e.imagenMetadatos)) {
        if (!/^(imagen|imagenTarjeta|imagenCarrusel|cartel|galeria:\d+)$/.test(uso) || !m || typeof m!=="object" || Array.isArray(m) || ["alt","pie"].some(k=>m[k]!=null&&typeof m[k]!=="string") || m.modo!=null&&!["cartel","fotografia"].includes(m.modo) || ["x","y"].some(k=>m[k]!=null&&(typeof m[k]!=="number"||!Number.isFinite(m[k])||m[k]<0||m[k]>100))) error("imagenMetadatos","Revisa los textos y encuadres de las imágenes.");
      }
    }
    return errores;
  }
  const lista = (e,k) => Array.isArray(e[k]) ? e[k].filter(item => item && typeof item === "object") : [];
  function advertencias(e) {
    const avisos = [];
    lista(e,"sesiones").forEach((s,i) => {
      const dia = s.fecha || e.fecha, fin = e.fechaFin || e.fecha;
      if (!fecha(dia) || !fecha(e.fecha)) return;
      const fuera = dia < e.fecha || dia > fin || (dia === e.fecha && hora(s.hora) && hora(e.hora) && s.hora < e.hora) || (dia === fin && hora(s.horaFin || s.hora) && hora(e.horaFin) && (s.horaFin || s.hora) > e.horaFin);
      if (fuera) avisos.push(`La sesión ${i+1} queda fuera del intervalo del evento.`);
    });
    if (!e.descripcion?.trim()) avisos.push("Recomendación: añade un resumen breve.");
    if (!e.lugar?.trim()) avisos.push("Recomendación: indica la ubicación principal.");
    return avisos;
  }
  function adicionales(e,{omitirUbicacion=false}={}) {
    const dl = (nombre, valor) => texto(valor) ? `<div class="detalle-dato"><dt>${esc(nombre)}</dt><dd>${multilinea(valor)}</dd></div>` : "";
    const bloque = (titulo, contenido) => contenido ? `<section class="detalle-seccion"><h2>${esc(titulo)}</h2>${contenido}</section>` : "";
    const fechaTexto = f => fecha(f) ? new Date(`${f}T12:00:00`).toLocaleDateString("es-ES") : texto(f);
    const datos = [dl("Público",e.publico),dl("Etiquetas",e.etiquetas),dl("Apertura de puertas",e.aperturaPuertas),!omitirUbicacion&&dl("Indicaciones de acceso",e.indicacionesAcceso),!omitirUbicacion&&dl("Espacios secundarios",e.espaciosSecundarios)].filter(Boolean).join("");
    const sesiones = lista(e,"sesiones").filter(s => s.fecha || s.hora || s.horaFin || s.lugar).map(s => `<li><strong>${esc([fechaTexto(s.fecha),[s.hora,s.horaFin].filter(Boolean).join(" – ")].filter(Boolean).join(" · "))}</strong>${s.lugar ? `<p>${esc(s.lugar)}</p>` : ""}</li>`).join("");
    const tarifas = lista(e,"tarifas").filter(t => t.nombre || t.importe || t.condiciones).map(t => `<li>${t.nombre ? `<strong>${esc(t.nombre)}</strong> ` : ""}${t.importe !== "" && t.importe != null ? `${esc(t.importe)} €` : ""}${t.condiciones ? `<p>${multilinea(t.condiciones)}</p>` : ""}</li>`).join("");
    const plazoTexto = valor => instante(valor) ? `${fechaTexto(valor.slice(0,10))} · ${valor.slice(11)}` : texto(valor);
    const plazo = [dl("Inicio de inscripción",plazoTexto(e.inscripcionInicio)),dl("Fin de inscripción",plazoTexto(e.inscripcionFin))].join("");
    const contactos = lista(e,"contactos").map(c => {
      const valores = [c.nombre ? `<strong>${esc(c.nombre)}</strong>` : "", /^[+\d\s().-]{6,25}$/.test(texto(c.telefono)) ? `<a href="tel:${esc(c.telefono.replace(/[^+\d]/g,""))}">${esc(c.telefono)}</a>` : "", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(c.correo)) ? `<a href="mailto:${esc(encodeURIComponent(c.correo))}">${esc(c.correo)}</a>` : "", url(c.url) ? `<a href="${esc(url(c.url))}" target="_blank" rel="noopener noreferrer">Web del contacto</a>` : ""].filter(Boolean);
      return valores.length ? `<li>${valores.join(" · ")}</li>` : "";
    }).join("");
    const accesos = Array.isArray(e.accesibilidadOpciones) ? [...new Set(e.accesibilidadOpciones)].filter(k => Object.hasOwn(accesibilidad,k)).map(k => `<li>${esc(accesibilidad[k])}</li>`).join("") : "";
    const enlaces = lista(e,"enlacesAdicionales").filter(l => url(l.url)).map(l => `<li><a href="${esc(url(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.titulo || (l.tipo === "documento" ? "Documento" : "Más información"))}</a></li>`).join("");
    const bloques = BloquesEvento.renderizar(e.bloques);
    return [bloque("Datos para asistir",datos ? `<dl>${datos}</dl>` : ""),bloque("Sesiones",sesiones ? `<ul>${sesiones}</ul>` : ""),bloque("Tarifas",tarifas ? `<ul>${tarifas}</ul>` : ""),bloque("Plazo de inscripción",plazo ? `<dl>${plazo}</dl>` : ""),bloque("Colaboradores",e.colaboradores ? `<p>${multilinea(e.colaboradores)}</p>` : ""),bloque("Otros contactos",contactos ? `<ul>${contactos}</ul>` : ""),bloque("Opciones de accesibilidad confirmadas",accesos ? `<ul>${accesos}</ul>` : ""),bloques,bloque("Enlaces y documentos",enlaces ? `<ul>${enlaces}</ul>` : "").replace('class="detalle-seccion"','class="detalle-seccion detalle-documentos"')].join("");
  }
  return { textos,listas,accesibilidad,validar,advertencias,adicionales,esc,url,fecha };
})();
