/* Una misma operación para acciones individuales y en grupo. */
window.AdminOperaciones = (() => {
  const claves=["eventos","papeleraEventosGilena",DestacadosGilena.clave,DestacadosGilena.claveOrden,"fiestasDestacadasGilena"];
  const snapshot=()=>Object.fromEntries(claves.map(k=>[k,localStorage.getItem(k)]));
  const categorias=()=>[...document.querySelectorAll('#categoria option')].map(o=>o.value);
  const esc=InformacionEvento.esc;
  function preparar(accion,ids,categoria,base=snapshot()) {
    const eventos=JSON.parse(base.eventos||"[]"), papelera=JSON.parse(base.papeleraEventosGilena||"[]");
    if(!Array.isArray(eventos)||!Array.isArray(papelera))throw new Error("No se pudieron leer los datos actuales. No se sobrescribirán.");
    ids=[...new Set(ids.map(String))];if(!ids.length)throw new Error("Selecciona al menos un evento.");
    const origen=accion==="recuperar"?papelera.map(r=>r.evento):eventos;
    const elegidos=[],rechazados=[];
    for(const id of ids){const e=origen.find(x=>String(x.id)===id);let motivo="";
      if(!e)motivo="Ya no se encuentra en este apartado.";
      else if(accion==="archivar"&&estadoPublicacion(e)==="archivado")motivo="Ya está archivado.";
      else if(accion==="restaurar"&&estadoPublicacion(e)!=="archivado")motivo="Solo se restauran archivados desde este listado.";
      else if(accion==="recuperar"&&eventos.some(x=>String(x.id)===id))motivo="El ID ya está en el listado activo.";
      else if(accion==="papelera"&&papelera.some(r=>String(r.evento.id)===id))motivo="El ID ya está en la papelera.";
      if(motivo)rechazados.push({titulo:e?.titulo||id,motivo});else elegidos.push(e);
    }
    if(accion==="categoria"&&!categorias().includes(categoria))throw new Error("Selecciona una categoría disponible.");
    if(!["categoria","archivar","restaurar","recuperar","papelera","exportar"].includes(accion))throw new Error("Acción no válida.");
    const conjunto=new Set(ids), ahora=new Date().toISOString();let nuevos=eventos.map(e=>({...e})), basura=structuredClone(papelera);
    if(!rechazados.length){
      if(accion==="papelera") {nuevos=nuevos.filter(e=>!conjunto.has(String(e.id)));basura.push(...elegidos.map(e=>({evento:structuredClone(e),eliminadoEn:ahora,estadoAnterior:estadoPublicacion(e)})));}
      else if(accion==="recuperar"){nuevos.push(...elegidos.map(e=>({...structuredClone(e),estado:"borrador",destacarInicio:false,modificadoEn:ahora})));basura=basura.filter(r=>!conjunto.has(String(r.evento.id)));}
      else if(accion!=="exportar")nuevos=nuevos.map(e=>conjunto.has(String(e.id))?{...e,...(accion==="categoria"?{categoria}:{estado:accion==="archivar"?"archivado":"borrador",destacarInicio:false}),modificadoEn:ahora}:e);
    }
    const cambios={eventos:JSON.stringify(nuevos)};
    if(["papelera","recuperar"].includes(accion))cambios.papeleraEventosGilena=JSON.stringify(basura);
    if(["papelera","archivar","restaurar","recuperar"].includes(accion)) {
      const orden=DestacadosGilena.configuracion(eventos).ids.filter(id=>!conjunto.has(String(id)));
      cambios[DestacadosGilena.clave]=JSON.stringify({version:1,ids:orden});cambios[DestacadosGilena.claveOrden]=JSON.stringify(orden);
      cambios.fiestasDestacadasGilena=JSON.stringify(JSON.parse(base.fiestasDestacadasGilena||"[]").filter(id=>!conjunto.has(String(id))));
    }
    return {accion,ids,base,cambios,eventos:nuevos,papelera:basura,elegidos,rechazados};
  }
  const etiquetas={categoria:"Cambiar categoría",archivar:"Archivar",restaurar:"Restaurar archivados como borradores",recuperar:"Restaurar de la papelera como borradores",papelera:"Mover a la papelera",exportar:"Exportar seleccionados"};
  function confirmar(p,categoria) {
    return new Promise(resolve=>{
      const d=document.createElement('dialog');d.className="cms-gestion-dialogo";d.setAttribute('aria-labelledby','operacionTitulo');
      d.innerHTML=`<div class="cms-gestion-dialogo-cuerpo"><h2 id="operacionTitulo">${etiquetas[p.accion]}</h2><p>${p.ids.length} evento(s) indicado(s).${p.accion==="categoria"?` Nueva categoría: ${esc(categoriaTexto(categoria))}.`:""}</p><details open><summary>Consultar los títulos afectados</summary><ul>${p.elegidos.map(e=>`<li>${esc(e.titulo||"Sin título")}</li>`).join('')}</ul></details>${p.rechazados.length?`<p role="alert">No se realizará ningún cambio. Revisa estos eventos:</p><ul>${p.rechazados.map(r=>`<li>${esc(r.titulo)}: ${esc(r.motivo)}</li>`).join('')}</ul>`:`<p>${["restaurar","recuperar"].includes(p.accion)?"Se restaurarán como borradores, sin volver a selecciones editoriales.":p.accion==="papelera"?"Podrás recuperarlos desde la papelera. Se conservarán sus archivos y sus copias de Google.":"Solo se aplicará la acción indicada."}</p>`}<form method="dialog" class="cms-fila-acciones"><button class="btn-secundario" value="cancelar">Cancelar</button>${!p.rechazados.length?'<button class="btn-primario" value="confirmar">Confirmar</button>':''}</form><p class="cms-operacion-estado" role="status"></p></div>`;
      document.body.append(d);d.addEventListener('close',()=>{const aceptar=d.returnValue==='confirmar';d.remove();resolve(aceptar)},{once:true});d.showModal();d.querySelector('button').focus();
    });
  }
  function limpiarPrivado(valor){
    if(Array.isArray(valor))return valor.map(limpiarPrivado);
    if(valor&&typeof valor==="object"&&(valor.kind==="calendar#event"||valor.origen==="google"))return null;
    if(valor&&typeof valor==="object")return Object.fromEntries(Object.entries(valor).filter(([k])=>k==="googleMapsUrl"||!/google|token|credential|password|contras|favorit|auth|session|^perfil|^usuario|^sesion(?:id)?$|correoPersonal|emailPersonal/i.test(k)).map(([k,v])=>[k,limpiarPrivado(v)]));
    return valor;
  }
  function descargar(datos,nombre){const u=URL.createObjectURL(new Blob([JSON.stringify(datos,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=nombre;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
  async function ejecutar(accion,ids,categoria="") {
    let p;try{p=preparar(accion,ids,categoria);if(!await confirmar(p,categoria)||p.rechazados.length)return false;
      if(accion==="exportar"){
        const eventos=limpiarPrivado(p.elegidos),datos={version:5,fechaExportacion:new Date().toISOString(),eventos};
        validarArchivoImportacion(datos);datos.bibliotecaImagenes=await BibliotecaImagenes.exportar(datos);
        descargar(datos,`eventos-seleccionados-gilena-${new Date().toISOString().slice(0,10)}.json`);notificar(`Copia preparada con ${eventos.length} eventos.`);return true;
      }
      const guardar=()=>{
        if(claves.some(k=>localStorage.getItem(k)!==p.base[k]))throw new Error("Los datos han cambiado desde otra pestaña o durante la confirmación. No se guardó nada. Revisa el listado y vuelve a seleccionar.");
        const r=DestacadosGilena.escribir(p.cambios);if(!r.ok)throw new Error(r.restaurado?"No se pudo guardar. Los datos anteriores y la selección se conservan.":"No se completó la operación y el navegador impidió revertir parte de los datos. Mantén la pestaña abierta y exporta una copia antes de continuar.");
        eventosAdmin=p.eventos;fiestasDestacadas=JSON.parse(localStorage.getItem(CLAVE_FIESTAS)||'[]');destacadosInicio=DestacadosGilena.configuracion(eventosAdmin).ids;
      };
      if(navigator.locks)await navigator.locks.request('gilena-eventos',guardar);else guardar();
      window.AdminListado?.limpiarSeleccion(false);refrescarAdmin();if(!document.getElementById('vista-eventos').hidden){const panel=document.getElementById(accion==='recuperar'?'gestion-papelera':'gestion-listado'),foco=panel?.querySelector('h2,.cms-table-wrap');if(foco){if(foco.tagName==='H2')foco.tabIndex=-1;foco.focus({preventScroll:true});}}notificar(`${etiquetas[accion]}: ${p.ids.length} evento(s). Operación completada.`);return true;
    }catch(e){notificar(e.message||'No se pudo completar la operación.','error');return false;}
  }
  return {preparar,ejecutar,snapshot,limpiarPrivado,descargar};
})();
