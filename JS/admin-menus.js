/* Menús portados al body: nunca participan en la altura de una fila. */
window.AdminMenus = (() => {
  let actual=null,secuencia=0;
  function cerrar(foco=false){
    if(!actual)return;const {boton,panel,padre,siguiente}=actual;actual=null;
    panel.hidden=true;boton.setAttribute('aria-expanded','false');
    if(padre.isConnected)padre.insertBefore(panel,siguiente?.parentNode===padre?siguiente:null);else panel.remove();
    if(foco&&boton.isConnected)boton.focus({preventScroll:true});
  }
  function posicionar(){
    if(!actual)return;const {boton,panel}=actual,r=boton.getBoundingClientRect();
    if(!boton.isConnected||r.bottom<0||r.top>innerHeight){cerrar();return;}
    panel.style.maxHeight=Math.max(80,innerHeight-24)+'px';
    const h=panel.getBoundingClientRect().height,w=panel.getBoundingClientRect().width;
    panel.style.left=Math.max(12,Math.min(r.right-w,innerWidth-w-12))+'px';
    panel.style.top=Math.max(12,Math.min(r.bottom+6+h>innerHeight-12?r.top-h-6:r.bottom+6,innerHeight-h-12))+'px';
  }
  function abrir(boton,ultimo=false){
    if(actual?.boton===boton){cerrar(true);return;}cerrar();
    const panel=boton.nextElementSibling;if(!panel?.matches('[data-menu-panel]'))return;
    actual={boton,panel,padre:panel.parentNode,siguiente:panel.nextSibling};
    panel.id||=("menuAdmin"+ ++secuencia);panel.classList.add('cms-menu-flotante');panel.setAttribute('role','menu');panel.setAttribute('aria-label',boton.getAttribute('aria-label')||boton.textContent.trim());boton.setAttribute('aria-controls',panel.id);boton.setAttribute('aria-expanded','true');
    panel.querySelectorAll('button').forEach(b=>{b.setAttribute('role','menuitem');b.tabIndex=-1;});
    document.body.append(panel);panel.hidden=false;posicionar();const items=[...panel.querySelectorAll('button:not(:disabled):not([hidden])')];items[ultimo?items.length-1:0]?.focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-menu-abrir]');if(b)abrir(b);},false);
  // Cerrar antes de ejecutar una acción, para que su diálogo reciba el foco final.
  document.addEventListener('click',e=>{if(actual?.panel.contains(e.target)&&e.target.closest('button'))cerrar(true);},true);
  document.addEventListener('pointerdown',e=>{if(actual&&!actual.panel.contains(e.target)&&!actual.boton.contains(e.target))cerrar();});
  document.addEventListener('focusin',e=>{if(actual&&!actual.panel.contains(e.target)&&e.target!==actual.boton)cerrar();});
  document.addEventListener('keydown',e=>{
    const b=e.target.closest('[data-menu-abrir]');if(b&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();abrir(b,e.key==='ArrowUp');return;}
    if(!actual)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cerrar(true);return;}
    if(e.key==='Tab'){cerrar(true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();
    const items=[...actual.panel.querySelectorAll('button:not(:disabled):not([hidden])')],i=items.indexOf(document.activeElement);
    items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
  });
  window.addEventListener('resize',posicionar);document.addEventListener('scroll',e=>{if(actual&&!actual.panel.contains(e.target))posicionar();},true);
  return {abrir,cerrar};
})();
