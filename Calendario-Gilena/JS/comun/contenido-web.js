/* Contenido público común. Cambia solo en este navegador y origen. */
window.ContenidoWeb = (() => {
  const clave = "contenidoWebGilena";
  const inicial = {
    version:1,
    portada:{ titulo:"Todo lo que pasa en Gilena", introduccion:"Cultura, fiestas y planes para disfrutar de nuestro pueblo", mostrarIntroduccion:true, botonCalendario:"Ver calendario" },
    pie:{ titulo:"Ayuntamiento de Gilena", descripcion:"Calendario Digital Municipal", ubicacion:"Gilena, Sevilla", informacion:"Información municipal", direccion:"", telefono:"", correo:"", enlaces:[] }
  };
  const copiar = objeto => JSON.parse(JSON.stringify(objeto));
  const esc = valor => String(valor ?? "").replace(/[&<>"']/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const texto = valor => typeof valor === "string" ? valor.trim() : "";
  function url(valor) { try { const u = new URL(valor); return ["https:","http:"].includes(u.protocol) && u.hostname ? u.href : ""; } catch { return ""; } }
  function validar(datos) {
    const errores = [];
    if (!datos || datos.version !== 1 || !datos.portada || !datos.pie || Array.isArray(datos.portada) || Array.isArray(datos.pie)) return [["contenido","El contenido de la web no tiene un formato válido."]];
    for (const grupo of ["portada","pie"]) for (const k of Object.keys(inicial[grupo])) {
      if (["mostrarIntroduccion","enlaces"].includes(k)) continue;
      if (typeof datos[grupo][k] !== "string") errores.push([`${grupo}.${k}`,"Debe ser texto."]);
    }
    if (typeof datos.portada.mostrarIntroduccion !== "boolean") errores.push(["portada.mostrarIntroduccion","La visibilidad de la introducción no es válida."]);
    if (texto(datos.pie.correo) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(datos.pie.correo))) errores.push(["pie.correo","Introduce un correo válido."]);
    if (texto(datos.pie.telefono) && (!/^[+\d\s().-]{6,25}$/.test(texto(datos.pie.telefono)) || texto(datos.pie.telefono).replace(/\D/g, "").length < 6)) errores.push(["pie.telefono","Introduce un teléfono válido."]);
    if (!Array.isArray(datos.pie.enlaces)) errores.push(["pie.enlaces","La lista de enlaces no es válida."]);
    else datos.pie.enlaces.forEach((e,i) => {
      if (!e || typeof e.texto !== "string" || typeof e.url !== "string") errores.push([`enlaces.${i}.url`,"El enlace no es válido."]);
      else if (texto(e.texto) || texto(e.url)) {
        if (!url(e.url)) errores.push([`enlaces.${i}.url`,"Usa una dirección permanente que empiece por https:// o http://."]);
      }
    });
    return errores;
  }
  function normalizar(datos) {
    const limpio=copiar(inicial);
    for (const grupo of ["portada","pie"]) for (const k of Object.keys(inicial[grupo])) if (!["mostrarIntroduccion","enlaces"].includes(k)) limpio[grupo][k]=texto(datos[grupo][k]);
    limpio.portada.mostrarIntroduccion=datos.portada.mostrarIntroduccion;
    limpio.pie.enlaces=datos.pie.enlaces.map(e=>({texto:texto(e.texto),url:texto(e.url)})).filter(e=>e.texto||e.url);
    return limpio;
  }
  function obtener() {
    const raw = localStorage.getItem(clave);
    if (raw === null) return copiar(inicial);
    const datos = JSON.parse(raw);
    if (validar(datos).length) throw new Error("El contenido guardado no es válido. Se ha conservado sin sobrescribirlo.");
    return normalizar(datos);
  }
  function publico() { try { return obtener(); } catch { return copiar(inicial); } }
  function portada(datos = publico()) {
    const p = normalizar(datos).portada;
    return `<p class="portada-etiqueta">Agenda municipal</p>${texto(p.titulo) ? `<h1 id="tituloPortadaInicio">${esc(p.titulo)}</h1>` : ""}${p.mostrarIntroduccion && texto(p.introduccion) ? `<p class="portada-descripcion">${esc(p.introduccion)}</p>` : ""}${texto(p.botonCalendario) ? `<a class="portada-calendario" href="#calendario">${esc(p.botonCalendario)} <span aria-hidden="true">→</span></a>` : ""}`;
  }
  function pie(datos = publico()) {
    const p = normalizar(datos).pie;
    const lineas = [p.ubicacion ? `<p><span aria-hidden="true">📍</span> ${esc(p.ubicacion)}</p>` : "", p.informacion ? `<p><span aria-hidden="true">✉</span> ${esc(p.informacion)}</p>` : "", p.direccion ? `<p>${esc(p.direccion)}</p>` : "", p.telefono ? `<p><a href="tel:${esc(p.telefono.replace(/[^+\d]/g,""))}">${esc(p.telefono)}</a></p>` : "", p.correo ? `<p><a href="mailto:${esc(encodeURIComponent(p.correo))}">${esc(p.correo)}</a></p>` : "", ...p.enlaces.filter(e=>url(e.url)).map(e=>`<p><a href="${esc(url(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.texto || e.url)}</a></p>`)].filter(Boolean).join("");
    const identidad = `${texto(p.titulo) ? `<h3>${esc(p.titulo)}</h3>` : ""}${texto(p.descripcion) ? `<p>${esc(p.descripcion)}</p>` : ""}`;
    return `${identidad ? `<div>${identidad}</div>` : ""}<div class="footer-contacto">${lineas}<p>Consulta las actividades en el <a href="index.html#calendario">calendario</a>.</p><p><a href="admin.html">Administración municipal</a></p></div>`;
  }
  function aplicar(datos = publico()) {
    const root = document.getElementById("destacados"), bloque = root?.querySelector(".portada-texto");
    if (bloque) {
      bloque.innerHTML = portada(datos);
      if (texto(datos.portada.titulo)) { root.setAttribute("aria-labelledby","tituloPortadaInicio"); root.removeAttribute("aria-label"); }
      else { root.removeAttribute("aria-labelledby"); root.setAttribute("aria-label","Agenda municipal"); }
    }
    const footer = document.getElementById("informacion");
    if (footer && document.getElementById("cabeceraPublica")) footer.innerHTML = pie(datos);
  }
  document.addEventListener("DOMContentLoaded",()=>{ if (document.getElementById("cabeceraPublica")) aplicar(); });
  window.addEventListener("storage",e=>{ if ([clave,null].includes(e.key) && document.getElementById("cabeceraPublica")) aplicar(); });
  return { clave,inicial:()=>copiar(inicial),obtener,validar,portada,pie,aplicar,esc,url };
})();
