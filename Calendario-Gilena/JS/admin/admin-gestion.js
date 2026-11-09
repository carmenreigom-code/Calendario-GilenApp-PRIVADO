/* Contenido web, plantillas y papelera integrados en las vistas existentes. */
window.AdminGestion = (() => {
  const M = GestionMunicipal, esc = ContenidoWeb.esc;
  const campo = id => document.getElementById(id);
  let plantillaEditor = null, revisionPendiente = false, contenidoGuardado = null, errorContenido = false, eventoOriginalId = null, eventoOriginalSnapshot = null;
  let dialogo, limpiarPrevia = () => {}, secuencia = 0, iniciado = false;
  const camposWeb = [
    ["portada.titulo","Título de portada","text"],["portada.introduccion","Texto introductorio","textarea"],
    ["portada.botonCalendario","Texto del botón que abre el calendario","text"],
    ["pie.titulo","Nombre municipal en el pie","text"],["pie.descripcion","Descripción del pie","text"],
    ["pie.ubicacion","Localidad / ubicación","text"],["pie.informacion","Información municipal","textarea"],
    ["pie.direccion","Dirección de contacto","text"],["pie.telefono","Teléfono de contacto","tel"],["pie.correo","Correo de contacto","email"]
  ];
  function error(mensaje) {
    const texto=mensaje || "No se pudo completar la operación. Los datos anteriores se conservan.";
    notificar(texto,"error");
    if(typeof guardandoEvento!=="undefined" && guardandoEvento)estadoEditor("error","El formulario se conserva");
    if (dialogo?.open) { let aviso=dialogo.querySelector(".cms-dialogo-error"); if (!aviso) { aviso=document.createElement("p"); aviso.className="cms-dialogo-error cms-field-error"; aviso.setAttribute("role","alert"); dialogo.querySelector(".cms-gestion-dialogo-cuerpo").prepend(aviso); } aviso.textContent=texto; }
  }
  function escribir(cambios) {
    const resultado = DestacadosGilena.escribir(cambios);
    if (!resultado.ok) error(resultado.restaurado ? "No se pudo guardar. Los datos anteriores y el formulario se conservan." : "El navegador impidió guardar y restaurar parte de los datos. Mantén esta pestaña abierta y exporta una copia.");
    return resultado.ok;
  }
  function abrirDialogo(titulo, html) {
    limpiarPrevia(); limpiarPrevia = () => {};
    dialogo.innerHTML = `<div class="cms-modal-heading"><h2 id="gestionDialogoTitulo">${esc(titulo)}</h2><button type="button" class="cms-modal-close" data-cerrar-gestion aria-label="Cerrar">×</button></div><div class="cms-gestion-dialogo-cuerpo">${html}</div>`;
    if (!dialogo.open) dialogo.showModal();
    dialogo.querySelector("[data-cerrar-gestion]").addEventListener("click",()=>dialogo.close());
    return dialogo;
  }
  function pestaña(nombre) {
    if (document.querySelector("[data-gestion-tab][aria-selected=true]")?.dataset.gestionTab !== nombre) window.AdminListado?.limpiarSeleccion();
    if (nombre === "revision") window.AdminListado?.renderizarRevision();
    document.querySelectorAll("[data-gestion-tab]").forEach(b=>{ const activa = b.dataset.gestionTab === nombre; b.setAttribute("aria-selected",String(activa)); b.tabIndex = activa ? 0 : -1; });
    for (const id of ["listado","plantillas","papelera","revision"]) campo(`gestion-${id}`).hidden = id !== nombre;
    window.AdminInterfaz?.actualizarNavegacion();
  }
  function iniciar() {
    dialogo = document.createElement("dialog"); dialogo.className = "cms-gestion-dialogo"; dialogo.id = "dialogoGestion"; dialogo.setAttribute("aria-labelledby","gestionDialogoTitulo"); document.body.append(dialogo);
    dialogo.addEventListener("close",()=>{ limpiarPrevia(); limpiarPrevia = () => {}; });
    const vista = campo("vista-eventos"), paneles = [...vista.children].filter(n=>n.classList.contains("cms-panel"));
    const barra = document.createElement("div"); barra.className = "cms-gestion-tabs"; barra.setAttribute("role","tablist"); barra.setAttribute("aria-label","Gestión de eventos");
    barra.innerHTML = [["listado","Eventos"],["plantillas","Plantillas"],["papelera","Papelera"]].map(([id,nombre],i)=>`<button type="button" role="tab" id="gestion-tab-${id}" data-gestion-tab="${id}" aria-controls="gestion-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${nombre}</button>`).join("");
    vista.querySelector(".cms-page-heading").after(barra);
    for (const id of ["listado","plantillas","papelera"]) { const p=document.createElement("div"); p.id=`gestion-${id}`; p.setAttribute("role","tabpanel"); p.setAttribute("aria-labelledby",`gestion-tab-${id}`); p.hidden=id!=="listado"; vista.append(p); }
    campo("gestion-listado").append(...paneles);
    campo("gestion-plantillas").innerHTML = '<section class="cms-panel"><h2>Plantillas de eventos</h2><p>Guarda una plantilla desde un evento existente con «Guardar como plantilla». Revisa fechas y horarios cuando la utilices.</p><div id="listaPlantillas" class="cms-gestion-lista"></div></section>';
    campo("gestion-papelera").innerHTML = '<section class="cms-panel"><h2>Papelera</h2><p>Eliminar mueve aquí el evento. Archivar lo conserva en Eventos fuera de la publicación pública. La papelera no se vacía automáticamente; restaurar devuelve el evento como borrador.</p><div id="listaPapelera" class="cms-gestion-lista"></div></section>';
    barra.addEventListener("click",e=>{ const b=e.target.closest("[data-gestion-tab]"); if (b) pestaña(b.dataset.gestionTab); });
    barra.addEventListener("keydown",e=>{
      if (!["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
      e.preventDefault(); const botones=[...barra.querySelectorAll("button")], i=botones.indexOf(document.activeElement);
      const n=e.key==="Home"?0:e.key==="End"?botones.length-1:(i+(e.key==="ArrowRight"?1:-1)+botones.length)%botones.length;
      pestaña(botones[n].dataset.gestionTab); botones[n].focus();
    });
    vista.addEventListener("click",e=>{
      const boton=e.target.closest("[data-plantilla-accion],[data-papelera-accion],[data-plantilla-evento]");
      if (!boton) return;
      if (boton.dataset.plantillaEvento) guardarDesdeEvento(boton.dataset.plantillaEvento);
      else if (boton.dataset.plantillaAccion) accionPlantilla(boton.dataset.plantillaAccion,boton.dataset.id);
      else accionPapelera(boton.dataset.papeleraAccion,boton.dataset.id);
    });
    const acciones=document.querySelector("#vista-editor .cms-editor-actionbar");
    acciones.insertAdjacentHTML("beforebegin",'<section class="cms-panel" id="modoPlantilla" hidden><div class="meta-item"><label for="nombrePlantillaEditor">Nombre de la plantilla</label><input id="nombrePlantillaEditor"></div><p>Estás editando una plantilla, no un evento publicado. Los días del programa son relativos; las fechas de referencia y los plazos de inscripción no se reutilizarán como fechas absolutas.</p></section>');
    acciones.insertAdjacentHTML("afterend",'<div class="meta-item cms-recomendaciones" id="revisionPlantillaGrupo" hidden><p>Evento creado desde una plantilla. Revisa fechas, horarios, contactos y enlaces. Los plazos de inscripción anteriores se han retirado.</p><label class="cms-check"><input type="checkbox" id="revisionPlantilla"> He revisado los datos que deben actualizarse antes de publicar.</label></div>');
    campo("nombrePlantillaEditor").addEventListener("input",programarAutoguardado);
    campo("revisionPlantilla").addEventListener("input",()=>{ limpiarError("revisionPlantilla"); programarAutoguardado(); });
    crearContenido(); iniciado=true; refrescar();
    window.addEventListener("storage",e=>{
      if ([ContenidoWeb.clave,null].includes(e.key)) sincronizarContenido();
      if (["eventos",M.claves.papelera,M.claves.plantillas,null].includes(e.key)) {
        try { eventosAdmin=coleccionActual(); refrescarAdmin(); } catch (errorLectura) { error(errorLectura.message); }
      }
    });
  }
  function refrescar() {
    if (!iniciado) return;
    try {
      const biblioteca=M.plantillas();
      campo("listaPlantillas").innerHTML=biblioteca.items.map(t=>`<article class="cms-gestion-fila"><div><h3>${esc(t.nombre)}</h3><p>Última modificación: ${esc(new Date(t.modificadaEn).toLocaleString("es-ES"))}</p></div><div class="cms-fila-acciones">${[["usar","Crear evento"],["editar","Editar"],["renombrar","Renombrar"],["duplicar","Duplicar"],["eliminar","Eliminar"]].map(([accion,label])=>`<button type="button" class="btn-secundario" data-plantilla-accion="${accion}" data-id="${esc(t.id)}">${label}</button>`).join("")}</div></article>`).join("") || '<p class="cms-vacio">Todavía no hay plantillas.</p>';
      const papelera=M.papelera();
      campo("listaPapelera").innerHTML=papelera.map(r=>`<article class="cms-gestion-fila"><div><h3>${esc(r.evento.titulo || "Sin título")}</h3><p>Fecha del evento: ${esc(fechaTexto(r.evento.fecha))}</p><p>Eliminado: ${esc(new Date(r.eliminadoEn).toLocaleString("es-ES"))} · Estado anterior: ${esc(r.estadoAnterior)}</p></div><div class="cms-fila-acciones"><button type="button" class="btn-secundario" data-papelera-accion="restaurar" data-id="${esc(r.evento.id)}">Restaurar como borrador</button><button type="button" class="cms-delete-action" data-papelera-accion="definitivo" data-id="${esc(r.evento.id)}">Borrar definitivamente</button></div></article>`).join("") || '<p class="cms-vacio">La papelera está vacía.</p>';
    } catch (e) { error(e.message); }
    window.AdminListado?.renderizarPapelera();
    window.AdminInterfaz?.compactarAcciones();
  }
  async function pedirNombre(titulo, inicial, callback) {
    const d=abrirDialogo(titulo,`${titulo === "Guardar como plantilla" ? '<p>Se conservarán categoría, textos, lugar, horarios, programa por días, tarifas, contactos, imágenes y bloques. No se copiarán el ID del evento, publicación, favoritos, vínculos con Google, historial ni plazos de inscripción. Las fechas del programa se convertirán en días relativos.</p>' : ""}<div class="meta-item"><label for="nombrePlantilla">Nombre</label><input id="nombrePlantilla" value="${esc(inicial)}" maxlength="160"></div><p id="errorNombrePlantilla" role="status"></p><button type="button" class="btn-primario" id="confirmarNombrePlantilla">Guardar</button>`);
    d.querySelector("input").focus();
    d.querySelector("#confirmarNombrePlantilla").addEventListener("click",async()=>{
      const nombre=campo("nombrePlantilla").value.trim();
      if (!nombre) { campo("errorNombrePlantilla").textContent="Escribe un nombre para identificar la plantilla."; campo("nombrePlantilla").focus(); return; }
      if (await callback(nombre)) d.close();
    });
  }
  async function guardarDesdeEvento(id) {
    const evento=eventosAdmin.find(e=>String(e.id)===String(id)); if (!evento) return;
    await pedirNombre("Guardar como plantilla",evento.titulo || "",nombre=>{
      try {
        const {biblioteca}=M.guardarPlantilla(M.plantillas(),evento,nombre);
        if (!escribir({[M.claves.plantillas]:JSON.stringify(biblioteca)})) return false;
        refrescar(); notificar(`Plantilla «${nombre}» guardada. Se han omitido fechas absolutas y datos privados del evento.`); return true;
      } catch(e) { error(e.message); return false; }
    });
  }
  async function accionPlantilla(accion,id) {
    try {
      const biblioteca=M.plantillas(), t=biblioteca.items.find(t=>t.id===id); if (!t) return;
      if (accion==="usar") { solicitarNuevo(id); return; }
      if (accion==="editar") {
        if (!await puedeSalirEditor()) return;
        const datos=M.materializar(t,biblioteca);
        rellenarFormulario({...datos,_plantillaEditor:{id:t.id,nombre:t.nombre,duracionDias:t.duracionDias}});
        campo("eventoId").value=""; limpiarErroresFormulario(); mostrarVista("editor"); activarPestana("basicos"); aplicarModo(); cambiosPendientes=false; return;
      }
      if (accion==="renombrar") {
        pedirNombre("Renombrar plantilla",t.nombre,nombre=>{ const actual=M.plantillas(), item=actual.items.find(x=>x.id===id); if (!item) return false; item.nombre=nombre; item.modificadaEn=new Date().toISOString(); if (!escribir({[M.claves.plantillas]:JSON.stringify(actual)})) return false; refrescar(); notificar("Nombre de la plantilla guardado."); return true; }); return;
      }
      if (accion==="eliminar") {
        if (!await confirmarAccion("Eliminar plantilla",`¿Eliminar la plantilla «${t.nombre}»? Los eventos y los recursos compartidos se conservarán.`,"Eliminar plantilla")) return;
        biblioteca.items=biblioteca.items.filter(x=>x.id!==id);
      } else if (accion==="duplicar") biblioteca.items.push({...M.copiar(t),id:M.nuevoId("tpl"),nombre:`Copia de: ${t.nombre}`,modificadaEn:new Date().toISOString()});
      if (escribir({[M.claves.plantillas]:JSON.stringify(biblioteca)})) { refrescar(); notificar(accion==="eliminar" ? "Plantilla eliminada. Sus eventos no se han modificado." : "Plantilla duplicada."); }
    } catch(e) { error(e.message); }
  }
  async function solicitarNuevo(preseleccion = "") {
    const vistaAnterior=document.querySelector(".cms-vista.activa")?.id.slice(6) || "eventos";
    if(guardandoEvento||cargasImagenPendientes.size){notificar("Espera a que termine el guardado o la carga.","error");return;}
    if(cambiosPendientes&&!campo("vista-editor").hidden&&!await confirmarAccion("Cambios sin guardar","Si creas otro evento, se descartará el formulario actual. ¿Continuar?","Continuar"))return;
    try {
      const biblioteca=M.plantillas(); let creado=false;
      const d=abrirDialogo("Crear evento",`<div class="meta-item"><label for="origenNuevoEvento">Cómo empezar</label><select id="origenNuevoEvento"><option value="">En blanco</option>${biblioteca.items.map(t=>`<option value="${esc(t.id)}">Desde plantilla: ${esc(t.nombre)}</option>`).join("")}</select></div><div id="fechaDesdePlantilla" class="meta-item" hidden><label for="nuevaFechaPlantilla">Nueva fecha inicial</label><input id="nuevaFechaPlantilla" type="date"><p>El programa y las sesiones se trasladarán manteniendo sus días relativos. Deberás revisar fechas, horarios y plazos antes de publicar.</p></div><p id="errorCrearDesdePlantilla" role="status"></p><button type="button" class="btn-primario" id="crearDesdeOrigen">Crear borrador</button>`);
      const selector=campo("origenNuevoEvento"); selector.value=preseleccion;
      const cambiar=()=>{ campo("fechaDesdePlantilla").hidden=!selector.value; }; selector.addEventListener("change",cambiar); cambiar();
      d.addEventListener("close",()=>{ if (!creado) mostrarVista(vistaAnterior); },{once:true});
      campo("crearDesdeOrigen").addEventListener("click",()=>{
        const id=selector.value, fecha=campo("nuevaFechaPlantilla").value;
        if (id && !fechaValida(fecha)) { campo("errorCrearDesdePlantilla").textContent="Selecciona una nueva fecha inicial válida."; campo("nuevaFechaPlantilla").focus(); return; }
        const t=biblioteca.items.find(t=>t.id===id); if (id && !t) return;
        const datos=t ? M.materializar(t,biblioteca,fecha) : null;
        if (nuevoEvento(true) === false) return;
        creado=true; d.close();
        if (datos) { const nuevoId=campo("eventoId").value; rellenarFormulario({...datos,id:nuevoId,revisionPlantillaPendiente:true}); campo("tituloVistaEditor").textContent="Crear evento desde plantilla"; firmaGuardada=null;programarAutoguardado(); }
        campo("titulo").focus();
      });
    } catch(e) { error(e.message); }
  }
  function huellaEvento(valor) {
    const s=typeof valor === "string" ? valor : JSON.stringify(valor); if (s==null) return "";
    let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(s.length-1-i);}
    return `h1:${s.length}:${(a>>>0).toString(36)}:${(b>>>0).toString(36)}`;
  }
  function cargarContexto(datos) {
    plantillaEditor=!datos.id ? datos._plantillaEditor || datos.plantillaEditor || null : null;
    const id=String(datos.id ?? datos.eventoId ?? "");
    eventoOriginalId=plantillaEditor ? null : datos.eventoOriginalId || (eventosAdmin.some(e=>String(e.id)===id) ? id : null);
    eventoOriginalSnapshot=datos.eventoOriginalSnapshot ? (datos.eventoOriginalSnapshot.startsWith("h1:") ? datos.eventoOriginalSnapshot : huellaEvento(datos.eventoOriginalSnapshot)) : eventoOriginalId ? huellaEvento(eventosAdmin.find(e=>String(e.id)===eventoOriginalId)) : null;
    if(plantillaEditor&&!plantillaEditor.huella)plantillaEditor.huella=huellaEvento(M.plantillas().items.find(t=>t.id===plantillaEditor.id));
    revisionPendiente=!plantillaEditor && datos.revisionPlantillaPendiente===true;
    campo("nombrePlantillaEditor").value=plantillaEditor?.nombre || "";
    campo("revisionPlantilla").checked=!revisionPendiente;
    aplicarModo();
  }
  function aplicarModo() {
    if (!campo("modoPlantilla")) return;
    const es=!!plantillaEditor;
    campo("modoPlantilla").hidden=!es; campo("revisionPlantillaGrupo").hidden=!revisionPendiente || es;
    campo("titulo").required=!es;
    for (const id of ["titulo","rangoFechas"]) campo(id).closest(".meta-item")?.querySelectorAll("b").forEach(b=>b.hidden=es||campo("estadoPublicacionEditor").dataset.estado==="publicado");
    for (const id of ["inscripcionInicio","inscripcionFin"]) campo(id).disabled=es;
    document.querySelectorAll('#vista-editor button[onclick="guardarEvento(\'borrador\')"]').forEach(b=>b.hidden=es);
    const boton=document.querySelector("#vista-editor .cms-editor-actionbar .btn-primario");
    if (boton) boton.innerHTML=es ? "Guardar plantilla" : `<i class="fa-solid fa-globe"></i> ${campo("estadoPublicacionEditor").dataset.estado === "publicado" ? "Guardar cambios" : "Publicar"}`;
    if (es) { campo("tituloVistaEditor").textContent="Editar plantilla"; campo("estadoPublicacionEditor").textContent="Plantilla · No publicada"; }
  }
  async function guardarPlantillaEditor() {
    limpiarErroresFormulario();
    const nombre=campo("nombrePlantillaEditor").value.trim();
    if (!nombre) { estadoEditor("pendiente");error("Escribe un nombre para la plantilla."); campo("nombrePlantillaEditor").focus(); return; }
    const errores=erroresFormulario(); errores.forEach(([id,mensaje])=>mostrarError(id,mensaje));
    if (errores.length) { estadoEditor("pendiente","Revisa los campos señalados");activarPestana(campo(errores[0][0]).closest(".cms-editor-page")?.id.slice(6)||"basicos"); campo(errores[0][0]).focus(); return; }
    bloquearEditor(true);
    try {
      if (cargasImagenPendientes.size) await esperarImagenes();
      const evento=datosFormulario(null,"","borrador");
      const guardado=await BibliotecaImagenes.conBloqueo(async()=>{
      await BibliotecaImagenes.verificarReferencias(evento);
      const actual=M.plantillas(); if (!actual.items.some(t=>t.id===plantillaEditor.id)) { error("La plantilla ya no existe. Guarda el contenido como una plantilla nueva desde un evento si lo necesitas."); return; }
      if(huellaEvento(actual.items.find(t=>t.id===plantillaEditor.id))!==plantillaEditor.huella){error("La plantilla cambió desde otra pestaña. El formulario se conserva; revisa la versión actual antes de guardar.");return false;}
      const {biblioteca}=M.guardarPlantilla(actual,evento,nombre,plantillaEditor.id,plantillaEditor.duracionDias);
      return escribir({[M.claves.plantillas]:JSON.stringify(biblioteca)});
      });
      if(!guardado)return;
      clearTimeout(temporizadorBorrador); try { localStorage.removeItem("borradorEventoAdmin"); } catch {}
      cambiosPendientes=false;estadoEditor("guardado","Plantilla"); plantillaEditor=null; aplicarModo(); refrescar(); mostrarVista("eventos"); pestaña("plantillas"); notificar(`Plantilla «${nombre}» guardada. Los eventos existentes no se han modificado.`);
    } catch(e) { error(e.message); }
  }
  async function eliminarEvento(id) { return AdminOperaciones.ejecutar("papelera",[String(id)]); }
  async function accionPapelera(accion,id) {
    if (accion === "restaurar") return AdminOperaciones.ejecutar("recuperar",[String(id)]);
    try {
      const basePapelera=localStorage.getItem(M.claves.papelera);
      const papelera=M.papelera(), registro=papelera.find(r=>String(r.evento.id)===String(id)); if (!registro) return;
      const titulo=registro.evento.titulo || "Sin título";
      if (accion==="definitivo") {
        if (!await confirmarAccion("Borrar definitivamente",`Se eliminará definitivamente «${titulo}» de esta papelera. No se borrarán imágenes o documentos compartidos ni copias de Google Calendar. Escribe el título para confirmar.`,"Borrar definitivamente",titulo)) return;
        if (localStorage.getItem(M.claves.papelera)!==basePapelera) { error("La papelera ha cambiado desde otra pestaña. Revisa sus datos antes de continuar."); return; }
        if (!escribir({[M.claves.papelera]:JSON.stringify(papelera.filter(r=>String(r.evento.id)!==String(id)))})) return;
        refrescarAdmin(); notificar(`«${titulo}» se ha borrado definitivamente de la papelera.`); return;
      }
    } catch(e) { error(e.message); }
  }
  function crearContenido() {
    const seccion=document.createElement("details"); seccion.className="cms-panel cms-opciones"; seccion.id="configContenidoWeb";
    seccion.innerHTML=`<summary>Contenido de la web</summary><div class="cms-opciones-contenido"><p>Estos cambios se reflejan solo en este navegador y origen. No se publican automáticamente para otros visitantes.</p><form id="formContenidoWeb" novalidate><div class="cms-form-grid cms-form-grid-2">${camposWeb.map(([ruta,nombre,tipo])=>`<div class="meta-item"><label for="web-${ruta.replace(".","-")}">${nombre}</label>${tipo==="textarea"?`<textarea rows="2" id="web-${ruta.replace(".","-")}" data-web="${ruta}"></textarea>`:`<input type="${tipo}" id="web-${ruta.replace(".","-")}" data-web="${ruta}">`}</div>`).join("")}</div><label class="cms-check"><input type="checkbox" id="web-mostrar-introduccion"> Mostrar texto introductorio</label><h3>Enlaces municipales y redes sociales</h3><div id="webEnlaces"></div><button type="button" class="btn-secundario" id="anadirWebEnlace">Añadir enlace</button><p id="estadoContenidoWeb" role="status" aria-live="polite"></p><div class="cms-fila-acciones"><button type="button" class="btn-secundario" id="previsualizarContenidoWeb">Vista previa</button><button type="submit" class="btn-primario">Guardar contenido</button><button type="button" class="btn-secundario" id="cancelarContenidoWeb">Cancelar cambios</button><button type="button" class="btn-secundario" id="restaurarContenidoWeb">Restaurar textos iniciales</button></div></form></div>`;
    campo("ajustesAdminIntegrados").after(seccion);
    campo("anadirWebEnlace").addEventListener("click",()=>{ anadirEnlace(); cambioContenido(); });
    campo("formContenidoWeb").addEventListener("input",cambioContenido);
    campo("webEnlaces").addEventListener("click",e=>{ const b=e.target.closest("[data-quitar-web-enlace]"); if (b) { b.closest(".cms-web-enlace").remove(); cambioContenido(); } });
    campo("formContenidoWeb").addEventListener("submit",e=>{ e.preventDefault(); guardarContenido(); });
    campo("cancelarContenidoWeb").addEventListener("click",cargarContenido);
    campo("previsualizarContenidoWeb").addEventListener("click",previsualizarContenido);
    campo("restaurarContenidoWeb").addEventListener("click",async()=>{ if (!await confirmarAccion("Restaurar textos iniciales","¿Restaurar el contenido inicial de portada y pie? Los eventos, plantillas, papelera y preferencias se conservarán.","Restaurar textos")) return; const datos=ContenidoWeb.inicial(); if (escribir({[ContenidoWeb.clave]:JSON.stringify(datos)})) { cargarContenido(); notificar("Textos iniciales restaurados."); } });
    cargarContenido();
  }
  function anadirEnlace(datos={texto:"",url:""}) {
    const row=document.createElement("div"); row.className="cms-web-enlace cms-fila-opcional"; const id=++secuencia;
    row.innerHTML=`<div class="meta-item"><label for="web-enlace-nombre-${id}">Texto del enlace</label><input id="web-enlace-nombre-${id}" data-web-enlace="texto" value="${esc(datos.texto)}"></div><div class="meta-item"><label for="web-enlace-url-${id}">Dirección web</label><input type="url" id="web-enlace-url-${id}" data-web-enlace="url" value="${esc(datos.url)}"></div><button type="button" class="btn-secundario" data-quitar-web-enlace>Eliminar enlace</button>`;
    campo("webEnlaces").append(row);
  }
  function leerContenido() {
    const datos=ContenidoWeb.inicial();
    document.querySelectorAll("[data-web]").forEach(input=>{ const [grupo,k]=input.dataset.web.split("."); datos[grupo][k]=input.value.trim(); });
    datos.portada.mostrarIntroduccion=campo("web-mostrar-introduccion").checked;
    datos.pie.enlaces=[...campo("webEnlaces").children].map(row=>Object.fromEntries([...row.querySelectorAll("[data-web-enlace]")].map(input=>[input.dataset.webEnlace,input.value.trim()])));
    return datos;
  }
  function cargarContenido() {
    try { contenidoGuardado=ContenidoWeb.obtener(); errorContenido=false; } catch(e) { contenidoGuardado=ContenidoWeb.inicial(); errorContenido=true; error(e.message); }
    document.querySelectorAll("[data-web]").forEach(input=>{ const [grupo,k]=input.dataset.web.split("."); input.value=contenidoGuardado[grupo][k]; });
    campo("web-mostrar-introduccion").checked=contenidoGuardado.portada.mostrarIntroduccion;
    campo("webEnlaces").replaceChildren(); contenidoGuardado.pie.enlaces.forEach(anadirEnlace);
    campo("formContenidoWeb").querySelectorAll(".cms-field-error").forEach(e=>e.remove());
    campo("formContenidoWeb").querySelectorAll("[aria-invalid]").forEach(e=>{e.removeAttribute("aria-invalid");e.removeAttribute("aria-describedby");});
    campo("estadoContenidoWeb").textContent=errorContenido ? "No se pudo leer el contenido guardado. Se conserva sin sobrescribirlo; puedes restaurar los textos iniciales con confirmación." : "Contenido guardado · Sin cambios pendientes";
  }
  function contenidoPendiente() { return !!contenidoGuardado && JSON.stringify(leerContenido())!==JSON.stringify(contenidoGuardado); }
  function cambioContenido() { campo("estadoContenidoWeb").textContent=contenidoPendiente() ? "Cambios pendientes · Aún no guardados" : "Sin cambios pendientes"; }
  function validarContenido() {
    const datos=leerContenido(), errores=ContenidoWeb.validar(datos), form=campo("formContenidoWeb");
    form.querySelectorAll(".cms-field-error").forEach(e=>e.remove()); form.querySelectorAll("[aria-invalid]").forEach(e=>{e.removeAttribute("aria-invalid");e.removeAttribute("aria-describedby");});
    let primero;
    for (const [ruta,mensaje] of errores) {
      const partes=ruta.split("."), input=partes[0]==="enlaces" ? campo("webEnlaces").children[+partes[1]]?.querySelector('[data-web-enlace="url"]') : form.querySelector(`[data-web="${ruta}"]`);
      if (!input) continue; const p=document.createElement("p"); p.className="cms-field-error"; p.id=`error-${input.id}`; p.textContent=mensaje; input.closest(".meta-item").append(p); input.setAttribute("aria-invalid","true"); input.setAttribute("aria-describedby",p.id); primero ||= input;
    }
    if (errores.length) { campo("estadoContenidoWeb").textContent="Revisa los campos señalados. No se ha guardado nada."; primero?.focus(); return null; }
    return datos;
  }
  function guardarContenido() { const datos=validarContenido(); if (!datos) return; if (errorContenido) { error("No se sobrescribirá un contenido que no se pudo leer. Usa Restaurar textos iniciales si deseas reemplazarlo."); return; } datos.pie.enlaces=datos.pie.enlaces.filter(e=>e.texto||e.url); if (escribir({[ContenidoWeb.clave]:JSON.stringify(datos)})) { cargarContenido(); notificar("Contenido guardado en este navegador y origen."); } }
  function previsualizarContenido() {
    const datos=validarContenido(); if (!datos) return;
    const e=DestacadosGilena.seleccionar(eventosAdmin)[0];
    abrirDialogo("Vista previa del contenido",`<p>Vista previa de los cambios pendientes. Todavía no se han guardado.</p><div class="cms-web-preview"><section class="cms-web-portada"><div class="portada-texto">${ContenidoWeb.portada(datos)}</div>${e?`<div class="cms-carrusel-previa"><div class="destacado-diapositiva">${ImagenesEvento.renderizarCarrusel(e,true)}</div></div>`:""}</section><footer>${ContenidoWeb.pie(datos)}</footer></div>`);
    dialogo.querySelector(".cms-web-preview").addEventListener("click",event=>{ if (event.target.closest("a")) event.preventDefault(); });
    if (e) limpiarPrevia=ImagenesEvento.activarCarrusel(dialogo,e) || (()=>{});
  }
  function exportables() { return {contenidoWeb:ContenidoWeb.obtener(),plantillas:M.plantillas(),papelera:M.papelera()}; }
  function contextoBorrador() { return {eventoOriginalId,eventoOriginalSnapshot,plantillaEditor:plantillaEditor ? {...plantillaEditor,nombre:campo("nombrePlantillaEditor").value} : null,revisionPlantillaPendiente:revisionPendiente && !campo("revisionPlantilla").checked}; }
  function erroresRevision() { return revisionPendiente && !campo("revisionPlantilla").checked && !plantillaEditor ? [["revisionPlantilla","Confirma que has revisado las fechas, horarios, plazos y enlaces de la plantilla antes de publicar."]] : []; }
  function idsReservados() { return M.papelera().map(r=>String(r.evento.id)); }
  function coleccionActual() { const datos=JSON.parse(localStorage.getItem("eventos") || "[]"); if (!Array.isArray(datos)) throw new Error("No se pudo leer la colección actual de eventos."); return datos; }
  function disponibleParaGuardar() { if (eventoOriginalId && eventoOriginalSnapshot && huellaEvento(eventosAdmin.find(e=>String(e.id)===eventoOriginalId))!==eventoOriginalSnapshot) { error("El evento ha cambiado o se ha eliminado desde otra pestaña. El formulario se conserva; revisa la versión actual antes de guardarlo."); return false; } if (eventoOriginalId && !eventosAdmin.some(e=>String(e.id)===eventoOriginalId)) { error("El evento ya no está en el listado activo. Recupera su borrador desde la papelera o crea un evento nuevo. El formulario se conserva."); return false; } return true; }
  function marcarGuardado(evento) { eventoOriginalId=String(evento.id); eventoOriginalSnapshot=huellaEvento(eventosAdmin.find(e=>String(e.id)===eventoOriginalId)); revisionPendiente=evento.revisionPlantillaPendiente===true; aplicarModo(); }
  function sincronizarContenido() {
    if (!contenidoPendiente()) cargarContenido();
    else { try { contenidoGuardado=ContenidoWeb.obtener(); cambioContenido(); } catch (e) { error(e.message); } }
  }
  return { iniciar,refrescar,pestaña,solicitarNuevo,cargarContexto,aplicarModo,esPlantilla:()=>!!plantillaEditor,guardarPlantillaEditor,eliminarEvento,accionPapelera,guardarDesdeEvento,accionPlantilla,contenidoPendiente,exportables,contextoBorrador,erroresRevision,idsReservados,revision:()=>revisionPendiente && !campo("revisionPlantilla").checked,despuesImportar:()=>{ refrescar(); sincronizarContenido(); },coleccionActual,disponibleParaGuardar,marcarGuardado };
})();
