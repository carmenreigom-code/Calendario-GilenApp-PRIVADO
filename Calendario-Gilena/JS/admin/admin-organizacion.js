/* Organización visual: conserva los nodos, manejadores y datos originales. */
window.AdminOrganizacion=(()=>{
  const $=id=>document.getElementById(id);
  let preparada=false;
  function imagenes(){
    if(!preparada)return;
    for(const tipo of ['imagen','imagenTarjeta','imagenCarrusel','cartel']){
      const panel=$(tipo).closest('.cms-form-panel'),propia=!!$(tipo).value;
      const datos=Object.fromEntries(['imagen','imagenTarjeta','imagenCarrusel','cartel'].map(k=>[k,$(k).value]));
      const hay=!!(tipo==='imagenCarrusel'?ImagenesEvento.obtenerCarrusel(datos).src:tipo==='cartel'?datos.cartel:ImagenesEvento.obtener(datos,tipo).src);
      panel.classList.toggle('cms-sin-imagen',!hay);
      panel.querySelector('[data-biblioteca-destino]').textContent=hay?'Cambiar':'Añadir imagen';
      const encuadrar=panel.querySelector('[data-encuadrar]');if(encuadrar)encuadrar.hidden=!hay;
      panel.querySelector('[data-menu-abrir]').hidden=false;
      panel.querySelector('[data-menu-panel]')?.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Quitar')b.hidden=!propia;});
      if(tipo==='cartel'){const m=AdminBiblioteca.leerMetadatos().cartel||{};const img=$('cartelPreviaImagen');img.style.objectFit=m.modo==='fotografia'?'cover':'contain';img.style.objectPosition=(m.x??50)+'% '+(m.y??50)+'%';}
    }
  }
  function prepararImagenes(){
    for(const tipo of ['imagen','imagenTarjeta','imagenCarrusel','cartel','galeria']){
      const panel=$(tipo==='galeria'?'galeriaAdmin':tipo).closest('.cms-form-panel');panel.classList.add('cms-imagen-panel');
      const actions=panel.querySelector('.cms-image-actions'),biblioteca=actions.querySelector('[data-biblioteca-destino]');
      const otros=[...actions.children].filter(n=>n!==biblioteca),secundarios=document.createElement('div');secundarios.dataset.menuPanel='';secundarios.hidden=true;
      // Los archivos se eligen desde las dos pestañas del selector único.
      otros.filter(n=>!n.getAttribute('onclick')?.includes('.click()')).forEach(n=>secundarios.append(n));
      const mas=document.createElement('button');mas.type='button';mas.className='cms-menu-disparador';mas.dataset.menuAbrir='';mas.setAttribute('aria-label','Otras opciones de '+tipo);mas.setAttribute('aria-haspopup','menu');mas.setAttribute('aria-expanded','false');mas.textContent='⋯';
      actions.replaceChildren(biblioteca);
      const ajuste=panel.querySelector('[data-ajustes-imagen]');
      if(ajuste){const d=document.createElement('details');d.className='cms-encuadre-desplegable';d.innerHTML='<summary>Ajustes de encuadre</summary>';ajuste.before(d);d.append(ajuste);const boton=document.createElement('button');boton.type='button';boton.className='btn-secundario';boton.dataset.encuadrar='';boton.textContent='Encuadrar';boton.setAttribute('aria-expanded','false');boton.onclick=()=>{d.open=!d.open;boton.setAttribute('aria-expanded',String(d.open));if(d.open)ajuste.querySelector('select,input')?.focus();};d.addEventListener('toggle',()=>boton.setAttribute('aria-expanded',String(d.open)));actions.append(boton);}
      if(tipo==='cartel'){const boton=document.createElement('button');boton.type='button';boton.className='btn-secundario';boton.dataset.encuadrar='';boton.textContent='Encuadrar';boton.onclick=()=>{const meta=document.querySelector('[data-meta-uso="cartel"]');if(meta){meta.open=true;meta.scrollIntoView({block:'center',behavior:'instant'});meta.querySelector('select')?.focus({preventScroll:true});}};actions.append(boton);}
      actions.append(mas,secundarios);
      if(tipo==='galeria'){biblioteca.remove();mas.setAttribute('aria-label','Otras opciones de galería');}
    }
    const meta=$('metadatosImagenes').closest('details');meta.open=true;
    preparada=true;imagenes();renderGaleriaAdmin();
  }
  function lugares(){
    const panel=document.querySelector('.cms-lugares-panel'),dialogo=document.createElement('dialog');dialogo.id='gestionarLugares';dialogo.className='cms-gestion-dialogo';dialogo.setAttribute('aria-labelledby','tituloLugaresHabituales');
    const cuerpo=document.createElement('div');cuerpo.className='cms-gestion-dialogo-cuerpo';dialogo.append(cuerpo);document.body.append(dialogo);cuerpo.append(panel);
    const cerrar=document.createElement('button');cerrar.type='button';cerrar.className='btn-secundario';cerrar.textContent='Cerrar lugares';cuerpo.append(cerrar);
    const abrir=document.createElement('button');abrir.type='button';abrir.className='cms-gestionar-lugares';abrir.textContent='Gestionar lugares';$('lugarHabitual').after(abrir);
    const valores=()=>['lugarHabitualId','lugarHabitualNombre','lugarHabitualDireccion','lugarHabitualMapa'].map(id=>$(id).value).join('\u0000');let inicial;
    abrir.onclick=()=>{inicial=valores();dialogo.showModal();$('lugarHabitualNombre').focus();};
    async function salir(){
      if(!$('confirmacionAdmin').hidden)return;
      if(valores()!==inicial){
        if(!await confirmarAccion('Lugar sin guardar','¿Descartar la edición de este lugar? El evento conservará todos sus cambios.','Descartar lugar'))return;
        limpiarFormularioLugar();
      }
      dialogo.close();
    }
    cerrar.onclick=salir;dialogo.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('confirmacionAdmin').hidden){e.preventDefault();e.stopPropagation();salir();}});dialogo.addEventListener('cancel',e=>{e.preventDefault();salir();});dialogo.onclose=()=>abrir.focus();
    $('formLugarHabitual').addEventListener('submit',()=>{if(!$('lugarHabitualNombre').value)inicial=valores();});$('cancelarLugarHabitual').addEventListener('click',()=>{inicial=valores();});
  }
  function iniciar(){
    const contenido=$('configContenidoWeb'),vista=document.createElement('section');vista.id='vista-contenido-web';vista.className='cms-vista';vista.hidden=true;vista.innerHTML='<div class="cms-page-heading"><div><h1>Contenido web</h1><p>Textos de la portada y del pie municipal.</p></div></div>';document.querySelector('.cms-main').append(vista);vista.append(contenido);contenido.open=true;
    const herramientas=document.createElement('div');herramientas.className='cms-herramientas-eventos';herramientas.innerHTML='<button type="button" class="btn-secundario" data-menu-abrir aria-haspopup="menu" aria-expanded="false">Herramientas <span aria-hidden="true">⋯</span></button><div data-menu-panel hidden><button type="button" data-herramienta="plantillas">Plantillas</button><button type="button" data-herramienta="imagenes">Biblioteca de imágenes</button><button type="button" data-herramienta="papelera">Papelera</button><button type="button" data-herramienta="revision">Revisar información</button></div>';$('vista-eventos').querySelector('.cms-page-heading').append(herramientas);
    document.addEventListener('click',async e=>{const b=e.target.closest('[data-herramienta]');if(!b)return;if(!await puedeSalirEditor())return;if(b.dataset.herramienta==='imagenes'){mostrarVista('imagenes');AdminBiblioteca.refrescar();}else{mostrarVista('eventos');AdminGestion.pestaña(b.dataset.herramienta);}});
    const volver=document.createElement('button');volver.type='button';volver.className='btn-secundario';volver.textContent='← Volver a Eventos';volver.onclick=()=>{mostrarVista('eventos');AdminGestion.pestaña('listado');};$('vista-imagenes').querySelector('.cms-page-heading').append(volver);
    prepararImagenes();lugares();
  }
  document.addEventListener('DOMContentLoaded',iniciar);
  return {imagenes};
})();
