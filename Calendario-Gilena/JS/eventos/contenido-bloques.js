/* Una sola colección de bloques, compatible con los antiguos {titulo,texto}. */
window.BloquesEvento = (() => {
  const tipos = {texto:['align-left','Texto','Párrafos, listas y encabezados.'],imagen:['image','Imagen','Imagen completa con texto alternativo y pie.'],mixto:['columns','Imagen y texto','Dos columnas que se apilan en móvil.'],galeria:['images','Galería','Imágenes ordenadas con ampliación.'],video:['film','Vídeo','YouTube o Vimeo, con carga voluntaria.'],destacado:['circle-info','Destacado','Información breve con estilos definidos.'],enlace:['link','Enlace o botón','Una acción con destino real.'],documentos:['file-lines','Documentos','Enlaces permanentes a documentos.']};
  const campos = ['titulo','texto','tipo','html','visible','imagen','alt','pie','ancho','lado','imagenes','url','transcripcion','subtitulos','variante','etiqueta','estilo','documentos'];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const web = v => {try {const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  function video(valor) {
    try {
      const u=new URL(valor);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
      const host=u.hostname.toLowerCase();let id;
      if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com','youtu.be'].includes(host)) {
        id=host==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):/^\/(?:embed|shorts)\/([^/]+)$/.exec(u.pathname)?.[1];
        if(!/^[\w-]{11}$/.test(id||''))return null;
        return {proveedor:'YouTube',url:`https://www.youtube.com/watch?v=${id}`,src:`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`};
      }
      if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)) {
        const m=/^\/(?:video\/)?([1-9]\d{0,11})(?:\/([a-zA-Z0-9]{6,32}))?\/?$/.exec(u.pathname);if(!m)return null;
        const hash=m[2]||u.searchParams.get('h');if(hash&&!/^[a-zA-Z0-9]{6,32}$/.test(hash))return null;
        return {proveedor:'Vimeo',url:`https://vimeo.com/${m[1]}${hash?'/'+hash:''}`,src:`https://player.vimeo.com/video/${m[1]}?dnt=1&autoplay=0${hash?'&h='+hash:''}`};
      }
    }catch{}return null;
  }
  function videoHTML(url,titulo='Vídeo del evento',imagen='') {
    const v=video(url);if(!v)return '';
    const src=ImagenesEvento.urlImagen(imagen);
    return `<div class="ev-video" data-video-url="${esc(v.url)}" data-video-titulo="${esc(titulo||'Vídeo del evento')}"><div class="ev-video-portada">${src?`<img src="${esc(src)}" alt="" loading="lazy">`:'<span class="ev-video-simbolo" aria-hidden="true">▶</span>'}<div><p>${esc(titulo||'Vídeo del evento')}</p><p>Se conectará con ${v.proveedor} al cargar el vídeo.</p><button type="button" class="boton-detalle" data-cargar-video>Cargar vídeo<span class="ev-sr">: ${esc(titulo||'Vídeo del evento')}</span></button></div></div></div><p class="ev-video-enlace"><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Abrir vídeo en ${v.proveedor}</a></p>`;
  }
  function ricoPublico(html){const d=document.createElement('div');d.innerHTML=html;d.querySelectorAll('.ev-video-legacy').forEach(v=>{const p=document.createElement('template');p.innerHTML=videoHTML(v.dataset.videoUrl,v.dataset.videoTitulo);v.replaceWith(p.content);});return d.innerHTML;}
  function activar(root) {
    root.querySelectorAll('[data-cargar-video]').forEach(b=>b.addEventListener('click',()=>{
      const marco=b.closest('[data-video-url]'),v=video(marco.dataset.videoUrl);if(!v)return;
      const iframe=document.createElement('iframe');iframe.src=v.src;iframe.title=marco.dataset.videoTitulo||'Vídeo del evento';iframe.allow='fullscreen; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';marco.replaceChildren(iframe);iframe.focus();
    },{once:true}));
    root.querySelectorAll('.ev-bloque img').forEach(img=>img.addEventListener('error',()=>{const f=img.closest('figure');if(f){f.hidden=true;const section=f.closest('.ev-bloque');if(section&&[...section.querySelectorAll('figure')].every(x=>x.hidden)&&!section.querySelector('.ev-rico')?.textContent.trim())section.hidden=true;}else img.hidden=true;},{once:true}));
  }
  function validar(bloques,{soloEstructura=false}={}) {
    const errores=[];if(!Array.isArray(bloques))return [['bloques','La lista de bloques no es válida.']];
    bloques.forEach((b,i)=>{
      const err=(k,m)=>errores.push([`bloques.${i}.${k}`,m]);
      if(!b||typeof b!=='object'||Array.isArray(b)){err('tipo','Bloque no válido.');return;}
      if(b.tipo!=null&&!Object.hasOwn(tipos,b.tipo))err('tipo','Tipo de bloque no permitido.');
      campos.filter(k=>!['imagenes','documentos','visible'].includes(k)).forEach(k=>{if(b[k]!=null&&typeof b[k]!=='string')err(k,'Debe ser texto.');});
      if(b.visible!=null&&typeof b.visible!=='boolean')err('visible','La visibilidad no es válida.');
      for(const [k,opciones] of [['ancho',['normal','ampliada']],['lado',['izquierda','derecha']],['variante',['informacion','aviso','nota']],['estilo',['boton','secundario','enlace']]])if(b[k]&&!opciones.includes(b[k]))err(k,'Opción de bloque no permitida.');
      if(b.imagen&&(!ImagenesEvento.urlImagen(b.imagen)||/^(blob:|file:)/i.test(b.imagen)))err('imagen','Usa una imagen incorporada a la biblioteca o una URL permanente.');
      if(b.url&&/^(blob:|file:|data:)/i.test(b.url))err('url','No se admiten enlaces temporales ni archivos locales sin incorporar.');
      if(!soloEstructura&&b.url&&!(b.tipo==='video'?video(b.url):web(b.url)))err('url',b.tipo==='video'?'Usa un enlace HTTPS válido de YouTube o Vimeo.':'Usa una URL permanente HTTP(S).');
      if(!soloEstructura&&b.tipo==='enlace'&&b.etiqueta&&!b.url)err('url','Indica el destino del enlace.');
      for(const k of ['imagenes','documentos'])if(b[k]!=null){
        if(!Array.isArray(b[k])){err(k,'La lista del bloque no es válida.');continue;}
        b[k].forEach(item=>{if(!item||typeof item!=='object'||Array.isArray(item)||Object.entries(item).some(([key,v])=>!['url','alt','pie','nombre','descripcion'].includes(key)||typeof v!=='string')){err(k,'Hay un elemento de bloque no válido.');return;}
          if(item.url&&(!soloEstructura||k==='imagenes'||/^(blob:|file:|data:)/i.test(item.url))&&!(k==='imagenes'?ImagenesEvento.urlImagen(item.url)&&! /^(blob:|file:)/i.test(item.url):web(item.url)))err(k,'Hay una referencia de bloque no válida o temporal.');
        });
      }
    });return errores;
  }
  function renderizar(bloques) {
    const texto=v=>esc(v).replace(/\r?\n/g,'<br>');
    const figura=(m,ampliar=false)=>{const src=ImagenesEvento.urlImagen(m?.url);return src?`<figure>${ampliar?`<button type="button" data-ampliar="${esc(src)}" aria-label="Ampliar ${esc(m.alt||m.pie||'imagen')}">`:''}<img src="${esc(src)}" alt="${esc(m.alt||'')}" loading="lazy" decoding="async">${ampliar?'</button>':''}${m.pie?`<figcaption>${texto(m.pie)}</figcaption>`:''}</figure>`:'';};
    return (Array.isArray(bloques)?bloques:[]).map(b=>{
      if(!b||b.visible===false)return '';const tipo=b.tipo||'texto';let contenido='';
      const rico=b.html?ricoPublico(DetalleEvento.htmlSeguro(b.html)):b.texto?`<p>${texto(b.texto)}</p>`:'';
      const tieneRico=(()=>{const d=document.createElement('div');d.innerHTML=rico;return d.textContent.trim()||d.querySelector('img,[data-video-url]');})();
      if(tipo==='texto')contenido=tieneRico?`<div class="ev-rico">${rico}</div>`:'';
      if(tipo==='imagen')contenido=figura({url:b.imagen,alt:b.alt,pie:b.pie});
      if(tipo==='mixto'){const f=figura({url:b.imagen,alt:b.alt,pie:b.pie});contenido=f||tieneRico?`<div class="ev-mixto lado-${b.lado==='derecha'?'derecha':'izquierda'}">${f}${tieneRico?`<div class="ev-rico">${rico}</div>`:''}</div>`:'';}
      if(tipo==='galeria')contenido=`${(b.imagenes||[]).map(m=>figura(m,true)).join('')}`;if(tipo==='galeria'&&contenido)contenido=`<div class="ev-bloque-galeria">${contenido}</div>`;
      if(tipo==='video'){contenido=videoHTML(b.url,b.titulo,b.imagen);if(contenido)contenido+=`${b.subtitulos?`<p class="ev-subtitulos">Subtítulos: ${texto(b.subtitulos)}</p>`:''}${b.transcripcion?`<details><summary>Transcripción</summary><p>${texto(b.transcripcion)}</p></details>`:''}`;}
      if(tipo==='destacado'&&b.texto)contenido=`<aside class="ev-destacado variante-${['aviso','nota'].includes(b.variante)?b.variante:'informacion'}"><strong>${({aviso:'Aviso',nota:'Nota'})[b.variante]||'Información'}</strong><p>${texto(b.texto)}</p></aside>`;
      if(tipo==='enlace'&&web(b.url))contenido=`<a class="ev-enlace estilo-${['secundario','enlace'].includes(b.estilo)?b.estilo:'boton'}" href="${esc(web(b.url))}" target="_blank" rel="noopener noreferrer">${esc(b.etiqueta||'Más información')}</a>`;
      if(tipo==='documentos')contenido=(b.documentos||[]).filter(d=>web(d.url)).map(d=>`<li><a href="${esc(web(d.url))}" target="_blank" rel="noopener noreferrer">${esc(d.nombre||'Consultar documento')}</a>${d.descripcion?`<p>${texto(d.descripcion)}</p>`:''}</li>`).join('');if(tipo==='documentos'&&contenido)contenido=`<ul class="ev-documentos">${contenido}</ul>`;
      return contenido?`<section class="ev-bloque tipo-${esc(tipo)} ancho-${b.ancho==='ampliada'?'ampliada':'normal'}">${b.titulo&&tipo!=='video'?`<h2>${esc(b.titulo)}</h2>`:''}${contenido}</section>`:'';
    }).join('');
  }
  return {ricoPublico,tipos,campos,video,videoHTML,activar,validar,renderizar,web,esc};
})();
