/* Presentación del administrador. Mueve nodos existentes; no migra ni guarda datos. */
window.AdminInterfaz = (() => {
  const $=id=>document.getElementById(id);
  let iniciado=false,contextoLista=null,agrupando=false,menu,selector;
  const movimiento=()=>document.documentElement.dataset.movimientoReducido==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function iniciar(){
    document.querySelector('#vista-inicio .cms-page-heading a[href="index.html"]')?.remove();
    const editor=$('vista-editor'),barra=editor.querySelector('.cms-editor-tabs'),paginas=editor.querySelector('.cms-editor-pages');
    const workspace=document.createElement('div');workspace.className='cms-editor-workspace';barra.before(workspace);workspace.append(barra,paginas);
    barra.setAttribute('aria-orientation','vertical');barra.insertAdjacentHTML('afterbegin','<span class="cms-editor-nav-label" aria-hidden="true">EN ESTE EVENTO</span>');
    // Orden editorial, independiente del orden en que se construyen los controles.
    for(const id of ['basicos','fecha','contenido','imagenes','programa','acceso'])barra.append($('tab-'+id));
    const movil=document.createElement('label');movil.className='cms-editor-selector';movil.innerHTML='Sección del evento<select id="selectorSeccionEditor" aria-label="Sección del evento"></select>';workspace.before(movil);selector=movil.querySelector('select');
    barra.querySelectorAll('[role=tab]').forEach(b=>{const o=document.createElement('option');o.value=b.id.slice(4);o.textContent=b.textContent;selector.append(o);});
    selector.onchange=()=>{activarPestana(selector.value);const p=$('panel-'+selector.value);p.focus({preventScroll:true});p.scrollIntoView({block:'start',behavior:movimiento()?'instant':'smooth'});};
    const heading=editor.querySelector('.cms-page-heading');heading.classList.add('cms-editor-heading');
    const volver=document.createElement('button');volver.type='button';volver.className='cms-editor-volver';volver.textContent='← Volver al listado';volver.onclick=volverListado;heading.before(volver);
    const estados=document.createElement('div');estados.className='cms-editor-estados';heading.querySelector('h1').after(estados);estados.append($('estadoPublicacionEditor'),$('estadoGuardado'));heading.querySelector('div').append($('estadoBorrador'));
    const acciones=editor.querySelector('.cms-editor-actionbar');editor.append(acciones);acciones.setAttribute('role','group');acciones.setAttribute('aria-label','Acciones del evento');
    // Se conserva el elemento que otros módulos usan para anunciar el nombre.
    $('nombreEventoEditor').hidden=true;
    const nav=document.querySelector('.cms-sidebar');nav.id='menuAdministracion';menu=document.createElement('button');menu.type='button';menu.className='cms-menu-toggle';menu.setAttribute('aria-controls',nav.id);menu.setAttribute('aria-expanded','false');menu.textContent='☰ Navegación';document.querySelector('.cms-topbar-inner').append(menu);
    menu.onclick=()=>{const abierto=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(abierto));document.body.classList.toggle('cms-menu-abierto',abierto);};
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('cms-menu-abierto')){menu.click();menu.focus();}});
    programa();
    $("bloques").closest("details").open=true;
    const topbar=document.querySelector(".cms-topbar");const medir=()=>document.body.style.setProperty("--ui-top",Math.ceil(topbar.getBoundingClientRect().height)+"px");new ResizeObserver(medir).observe(topbar);medir();
    $('titulo').addEventListener('input',actualizar);
    new MutationObserver(actualizar).observe($('estadoPublicacionEditor'),{childList:true,attributes:true,attributeFilter:['data-estado']});
    new MutationObserver(actualizar).observe($('nombreEventoEditor'),{childList:true});
    compactarAcciones();
    iniciado=true;seccion(document.querySelector('.cms-editor-tabs [aria-selected=true]')?.id.slice(4)||'basicos');actualizar();actualizarNavegacion();
  }
  function seccion(id){if(selector)selector.value=id;}
  function marcarError(tab,n){if(!selector)return;const o=[...selector.options].find(o=>o.value===tab.id.slice(4));if(o)o.textContent=tab.textContent+(n?` · ${n} errores`:'');}
  function actualizar(){
    if(!iniciado)return;const plantilla=AdminGestion.esPlantilla(),guardado=eventosAdmin.some(e=>String(e.id)===$('eventoId').value);
    $('tituloVistaEditor').textContent=plantilla?$('nombrePlantillaEditor')?.value||'Editar plantilla':guardado?$('titulo').value.trim()||'Evento sin título':'Nuevo evento';
    const borrador=document.querySelector('#vista-editor .cms-editor-actionbar [onclick="guardarEvento(\'borrador\')"]');if(borrador)borrador.hidden=plantilla||$('estadoPublicacionEditor').dataset.estado==='publicado';
  }
  function actualizarNavegacion(){
    if(!iniciado)return;const vista=document.querySelector('.cms-vista.activa')?.id.slice(6),gestion=document.querySelector('[data-gestion-tab][aria-selected=true]')?.dataset.gestionTab;
    const textos={listado:['Eventos','Consulta, filtra y administra la agenda municipal.'],plantillas:['Plantillas','Reutiliza contenido para preparar nuevos eventos.'],papelera:['Papelera','Revisa y restaura eventos eliminados.'],revision:['Revisión','Corrige errores y consulta recomendaciones opcionales.']};if(vista==='eventos'&&textos[gestion]){const h=$('vista-eventos').querySelector('.cms-page-heading');h.querySelector('h1').textContent=textos[gestion][0];h.querySelector('p').textContent=textos[gestion][1];}
    document.querySelectorAll('.cms-sidebar .cms-nav-link').forEach(b=>{const origenEditor=AdminGestion.esPlantilla()?'plantillas':eventosAdmin.some(e=>String(e.id)===$('eventoId').value)?'listado':null;const activo=vista==='editor'&&origenEditor?b.dataset.vista==='eventos':b.dataset.vista===vista&&(!b.dataset.gestionDestino||vista==='eventos'||b.dataset.gestionDestino===gestion);b.classList.toggle('activo',activo||b.dataset.vista==='eventos'&&['editor','imagenes'].includes(vista));if(activo||b.dataset.vista==='eventos'&&['editor','imagenes'].includes(vista))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(vista==='contenido-web')$('herramientasSitio').open=true;
  }
  function recordarListado(id){
    if(!iniciado)return;if($('vista-eventos').hidden){if($('vista-editor').hidden)contextoLista=null;return;}const tabla=$('tablaEventos').closest('.cms-table-wrap');
    contextoLista={y:scrollY,x:tabla.scrollLeft,tablaY:tabla.scrollTop,id:id==null?contextoLista?.id||'':String(id),gestion:document.querySelector('[data-gestion-tab][aria-selected=true]')?.dataset.gestionTab||'listado'};AdminListado.guardar();
  }
  function restaurarListado(){if(!contextoLista)return;const c=contextoLista;requestAnimationFrame(()=>requestAnimationFrame(()=>{if($('vista-eventos').hidden)return;const tabla=$('tablaEventos').closest('.cms-table-wrap');tabla.scrollLeft=c.x;tabla.scrollTop=c.tablaY;const boton=$('tablaEventos').querySelector(`[data-editar="${CSS.escape(c.id)}"]`);(boton?.getClientRects().length?boton:$('vista-eventos').querySelector('h1'))?.focus({preventScroll:true});window.scrollTo({top:c.y,behavior:'instant'});}));}
  async function volverListado(){if(!await puedeSalirEditor())return;mostrarVista('eventos');AdminGestion.pestaña(contextoLista?.gestion||'listado');restaurarListado();}
  function vista(nombre,anterior){if(!iniciado)return;document.body.classList.remove('cms-menu-abierto');menu.setAttribute('aria-expanded','false');actualizar();actualizarNavegacion();if(nombre==='eventos'&&anterior==='vista-editor'){AdminGestion.pestaña(contextoLista?.gestion||'listado');restaurarListado();}}
  function compactarAcciones(){document.querySelectorAll('#listaPlantillas .cms-fila-acciones').forEach(f=>{if(f.querySelector('details'))return;const secundarios=[...f.querySelectorAll('[data-plantilla-accion]')].filter(b=>!['usar','editar'].includes(b.dataset.plantillaAccion));if(!secundarios.length)return;const d=document.createElement('details');d.className='cms-acciones-menu';d.innerHTML='<summary>Más acciones</summary><div></div>';d.querySelector('div').append(...secundarios);f.append(d);});}
  function programa(){
    const add=$('anadirActividad');add.insertAdjacentHTML('beforebegin','<button type="button" class="btn-secundario" id="anadirDiaPrograma">Añadir día</button>');$('anadirDiaPrograma').onclick=anadirDia;
    $('listaProgramaAdmin').addEventListener('input',resumenesPrograma);
    $('listaProgramaAdmin').addEventListener('change',e=>{if(e.target.matches('[data-programa-fecha]'))actualizarPrograma();});actualizarPrograma();
  }
  function claveDia(row){return row.querySelector('[data-programa-fecha]').value|| (row.dataset.diaRelativo!=null?'relativo:'+row.dataset.diaRelativo:'sin-fecha');}
  function nombreDia(k){return k.startsWith('relativo:')?GestionMunicipal.etiquetaDia(+k.split(':')[1]):k==='sin-fecha'?'Sin fecha específica':new Date(k+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
  function resumenesPrograma(){document.querySelectorAll('#listaProgramaAdmin .cms-programa-item').forEach(row=>{const s=row.querySelector('.cms-programa-actividad>summary');if(s)s.textContent=[row.querySelector('[data-programa-hora]').value,row.querySelector('[data-programa-titulo]').value.trim()||'Actividad sin título'].filter(Boolean).join(' · ');});}
  function actualizarPrograma(nueva){
    const lista=$('listaProgramaAdmin');if(!lista||agrupando)return;agrupando=true;
    try{const activo=document.activeElement,estados=new Map([...lista.querySelectorAll('.cms-programa-dia')].map(d=>[d.dataset.dia,d.open]));const rows=[...lista.querySelectorAll('.cms-programa-item')];lista.replaceChildren();let grupo=null,keyAnterior='',segmento=0;
      rows.forEach(row=>{if(!row.querySelector('.cms-programa-actividad')){const d=document.createElement('details');d.className='cms-programa-actividad';d.open=row===nueva&&!rellenandoEditor;d.innerHTML='<summary></summary><div class="cms-programa-campos"></div>';d.querySelector('div').append(...row.childNodes);row.append(d);}
        const k=claveDia(row);if(!grupo||k!==keyAnterior){keyAnterior=k;grupo=document.createElement('details');grupo.className='cms-programa-dia';grupo.dataset.dia=k+':'+segmento++;grupo.open=estados.get(grupo.dataset.dia)??true;const summary=document.createElement('summary');summary.textContent=nombreDia(k);const cuerpo=document.createElement('div');cuerpo.className='cms-programa-dia-contenido';grupo.append(summary,cuerpo);lista.append(grupo);const b=document.createElement('button');b.type='button';b.className='btn-secundario cms-programa-anadir';b.textContent='Añadir actividad a este día';b.onclick=()=>{const datos=k.startsWith('relativo:')?{diaRelativo:+k.split(':')[1]}:k==='sin-fecha'?{}:{fecha:k};anadirActividad(datos);programarAutoguardado();};grupo.append(b);}
        grupo.querySelector('.cms-programa-dia-contenido').append(row);
      });resumenesPrograma();if(activo?.isConnected)activo.focus({preventScroll:true});
    }finally{agrupando=false;}
  }
  function moverActividad(row,subir){const lista=$('listaProgramaAdmin'),rows=[...lista.querySelectorAll('.cms-programa-item')],i=rows.indexOf(row),j=i+(subir?-1:1);if(j<0||j>=rows.length)return;[rows[i],rows[j]]=[rows[j],rows[i]];lista.replaceChildren(...rows);actualizarPrograma();}
  function anadirDia(){const d=document.createElement('dialog');d.className='cms-gestion-dialogo';d.setAttribute('aria-labelledby','nuevoDiaTitulo');d.innerHTML='<div class="cms-gestion-dialogo-cuerpo"><h2 id="nuevoDiaTitulo">Añadir día al programa</h2><p>Se añadirá una actividad vacía en la fecha elegida.</p><form><label>Fecha<input type="date" required></label><div class="cms-fila-acciones"><button type="button" class="btn-secundario" data-cancelar>Cancelar</button><button class="btn-primario">Añadir día</button></div></form></div>';const foco=document.activeElement;document.body.append(d);d.querySelector('input').value=$('fecha').value;d.querySelector('[data-cancelar]').onclick=()=>d.close();d.querySelector('form').onsubmit=e=>{e.preventDefault();const fecha=d.querySelector('input').value;if(!InformacionEvento.fecha(fecha))return;anadirActividad({fecha});programarAutoguardado();d.close();};d.onclose=()=>{d.remove();foco?.isConnected&&foco.focus();};d.showModal();}
  document.addEventListener('DOMContentLoaded',iniciar);
  return {compactarAcciones,seccion,marcarError,actualizar,actualizarNavegacion,recordarListado,vista,actualizarPrograma,moverActividad};
})();
