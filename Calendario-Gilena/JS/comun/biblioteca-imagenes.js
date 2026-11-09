/* Archivos locales en IndexedDB; las referencias gilena-imagen: nunca son URLs de objetos. */
window.BibliotecaImagenes = (() => {
  const prefijo="gilena-imagen:", patron=/gilena-imagen:img-[a-f0-9]{64}/g, urls=new Map(), inversas=new Map();
  let conexion;
  const pendientes=new Map();
  const canal=typeof BroadcastChannel==='function'?new BroadcastChannel('gilena-biblioteca'):null;
  if(canal)canal.onmessage=()=>document.dispatchEvent(new Event('gilena-biblioteca-cambio'));
  const avisar=()=>canal?.postMessage('actualizada');
  function liberar(id){const ref=prefijo+id;for(const [clave,u]of urls)if(clave===ref||clave.startsWith(ref+"#")){URL.revokeObjectURL(u);urls.delete(clave);inversas.delete(u);}}
  const esReferencia=v=>typeof v==="string"&&/^gilena-imagen:img-[a-f0-9]{64}$/.test(v);
  function abrir() {
    if(!conexion) conexion=new Promise((resolve,reject)=>{
      const req=indexedDB.open("gilenaBibliotecaImagenes",2);
      req.onupgradeneeded=()=>{for(const nombre of ["imagenes","miniaturas"])if(!req.result.objectStoreNames.contains(nombre))req.result.createObjectStore(nombre,{keyPath:"id"});};
      req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();conexion=null;};resolve(req.result);};
      req.onerror=()=>{conexion=null;reject(new Error("No se pudo abrir la biblioteca local de imágenes."));};
      req.onblocked=()=>{conexion=null;reject(new Error("Cierra otras pestañas antiguas para abrir la biblioteca."));};
    });
    return conexion;
  }
  async function operar(modo,accion,almacen="imagenes") {
    const db=await abrir();return new Promise((resolve,reject)=>{
      const tx=db.transaction(almacen,modo), req=accion(tx.objectStore(almacen));
      tx.oncomplete=()=>resolve(req?.result);tx.onerror=tx.onabort=()=>reject(new Error("El navegador no permitió guardar o leer los archivos. Los datos anteriores se conservan."));
    });
  }
  const conBloqueo=accion=>navigator.locks?navigator.locks.request("gilena-eventos",accion):accion();
  async function borrarArchivo(id){const db=await abrir();return new Promise((resolve,reject)=>{const tx=db.transaction(["imagenes","miniaturas"],"readwrite");tx.objectStore("imagenes").delete(id);tx.objectStore("miniaturas").delete(id);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(new Error("No se eliminó la imagen. Los archivos anteriores se conservan."));});}
  const listar=()=>operar("readonly",s=>s.getAll());
  const obtener=id=>operar("readonly",s=>s.get(id));
  async function miniatura(r) {
    const existente=await operar("readonly",s=>s.get(r.id),"miniaturas");if(existente)return existente.archivo;
    const img=new Image(),u=URL.createObjectURL(r.archivo);
    try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=u;});const escala=Math.min(1,640/img.naturalWidth,640/img.naturalHeight),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*escala));c.height=Math.max(1,Math.round(img.naturalHeight*escala));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const archivo=await new Promise(resolve=>c.toBlob(resolve,'image/webp',.86));if(!archivo)throw new Error('No se pudo preparar la miniatura.');try{await operar('readwrite',s=>s.put({id:r.id,archivo}),'miniaturas');}catch{/* La derivada puede permanecer en memoria; el original no se modifica. */}return archivo;}finally{URL.revokeObjectURL(u);}
  }
  async function url(ref,reducida=false) {
    if(!esReferencia(ref))return ref;const clave=ref+(reducida?'#miniatura':'');
    if(urls.has(clave))return urls.get(clave);if(pendientes.has(clave))return pendientes.get(clave);
    const tarea=(async()=>{const r=await obtener(ref.slice(prefijo.length));if(!r)throw new Error('La imagen local no está disponible. Importa una copia que incluya sus archivos.');const archivo=reducida?await miniatura(r):r.archivo,u=URL.createObjectURL(archivo);urls.set(clave,u);inversas.set(u,ref);return u;})();
    pendientes.set(clave,tarea);try{return await tarea;}finally{pendientes.delete(clave);}
  }
  function estabilizar(valor) {
    let texto=typeof valor==="string"?valor:JSON.stringify(valor);
    for(const [u,ref] of inversas) texto=texto.split(u).join(ref);
    return typeof valor==="string"?texto:JSON.parse(texto);
  }
  function referencias(valor) {return [...new Set((typeof valor==="string"?estabilizar(valor):JSON.stringify(valor)).match(patron)||[])];}
  async function cargarElemento(img) {
    const ref=img.getAttribute("src");if(!esReferencia(ref))return;
    try {const src=await url(ref,!!img.closest(".cms-biblioteca-item,.miniatura-evento,#tablaEventos,.cajon-item,.detalle-galeria,.ev-bloque-galeria,.cms-bloque-previa"));if(img.getAttribute("src")===ref){img.dataset.imagenBiblioteca=ref;img.src=src;}}
    catch {if(img.getAttribute("src")===ref){img.removeAttribute("src");img.dispatchEvent(new Event("error"));}}
  }
  function observar() {
    const recorrer=n=>{if(n.nodeType!==1)return;if(n.matches("img[src]"))cargarElemento(n);n.querySelectorAll("img[src]").forEach(cargarElemento);};
    recorrer(document.documentElement);
    let limpieza;const candidatas=new Set();const limpiar=()=>{clearTimeout(limpieza);limpieza=setTimeout(()=>{const usados=new Set([...document.images].map(i=>i.getAttribute('src')));for(const [clave,u]of urls)if(candidatas.has(u)&&!usados.has(u)&&!pendientes.has(clave)){URL.revokeObjectURL(u);urls.delete(clave);inversas.delete(u);}candidatas.clear();},1000);};
    new MutationObserver(ms=>{ms.forEach(m=>{if(m.type==="attributes"){if(m.oldValue)candidatas.add(m.oldValue);recorrer(m.target);}else{m.removedNodes.forEach(n=>{if(n.nodeType===1){if(n.tagName==="IMG")candidatas.add(n.getAttribute("src"));n.querySelectorAll("img").forEach(i=>candidatas.add(i.getAttribute("src")));}});m.addedNodes.forEach(recorrer);}});limpiar();}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["src"],attributeOldValue:true});
  }
  document.addEventListener("error",e=>{if(e.target.tagName==="IMG"&&esReferencia(e.target.getAttribute("src"))){e.stopImmediatePropagation();cargarElemento(e.target);}},true);
  document.addEventListener("DOMContentLoaded",observar);
  window.addEventListener("pagehide",e=>{if(!e.persisted){for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();inversas.clear();canal?.close();}});
  function usos(id) {
    const ref=prefijo+id, resultados=[], vistas=new Set();
    const add=(tipo,nombre)=>{const k=tipo+nombre;if(!vistas.has(k)){vistas.add(k);resultados.push({tipo,nombre});}};
    for(let i=0;i<localStorage.length;i++){
      const clave=localStorage.key(i), raw=localStorage.getItem(clave);if(!raw?.includes(ref))continue;
      let datos;try{datos=JSON.parse(raw);}catch{add("Otros datos locales",clave);continue;}
      if(clave==="eventos") datos.forEach(e=>{if(JSON.stringify(e).includes(ref))add(estadoPublicacion(e)==="archivado"?"Archivado":"Evento",e.titulo||"Sin título");});
      else if(clave==="papeleraEventosGilena") datos.forEach(r=>{if(JSON.stringify(r).includes(ref))add("Papelera",r.evento?.titulo||"Sin título");});
      else if(clave==="plantillasEventosGilena") {for(const t of datos.items||[])if(JSON.stringify(t).includes(ref))add("Plantilla",t.nombre);if(JSON.stringify(datos.recursos||{}).includes(ref))add("Recursos de plantillas","Archivo compartido");}
      else add(/histori/i.test(clave)?"Historial":"Otros datos locales",clave==="borradorEventoAdmin"?"Autoguardado del editor":clave);
    }
    return resultados;
  }
  const dataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error("No se pudo leer el archivo."));r.readAsDataURL(blob);});
  async function inspeccionar(blob) {
    if(!blob||blob.size===0||blob.size>25*1024*1024)throw new Error("Usa un archivo de hasta 25 MB.");
    const b=new Uint8Array(await blob.slice(0,16).arrayBuffer());
    const tipo=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71?"image/png":b[0]===255&&b[1]===216&&b[2]===255?"image/jpeg":String.fromCharCode(...b.slice(0,6)).match(/^GIF8[79]a$/)?"image/gif":String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP"?"image/webp":"";
    if(!tipo||blob.type&&blob.type!==tipo)throw new Error("El contenido no coincide con un PNG, JPEG, WebP o GIF válido.");
    const img=new Image(), src=URL.createObjectURL(blob);
    try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("No se pudo decodificar la imagen."));img.src=src;});if(img.naturalWidth>10000||img.naturalHeight>10000||img.naturalWidth*img.naturalHeight>50000000)throw new Error("La imagen supera 10.000 px por lado o 50 megapíxeles. Redúcela antes de incorporarla.");return {tipo,ancho:img.naturalWidth,alto:img.naturalHeight};}finally{URL.revokeObjectURL(src);}
  }
  async function identidad(blob){if(!crypto.subtle)throw new Error("Abre la web desde localhost o HTTPS para utilizar la biblioteca.");return "img-"+[...new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,"0")).join("");}
  async function incorporar(archivo,{optimizar=false}={}) {
    let meta=await inspeccionar(archivo), blob=archivo;
    if(optimizar&&meta.tipo!=="image/gif"&&(meta.ancho>2600||meta.alto>2600||blob.size>3*1024*1024)) {
      const img=await createImageBitmap(blob), escala=Math.min(1,2600/meta.ancho,2600/meta.alto), c=document.createElement("canvas");c.width=Math.round(meta.ancho*escala);c.height=Math.round(meta.alto*escala);c.getContext("2d").drawImage(img,0,0,c.width,c.height);img.close();
      const candidato=await new Promise(r=>c.toBlob(r,meta.tipo==="image/png"?"image/png":"image/jpeg",.94));
      if(candidato&&candidato.size<blob.size){blob=candidato;meta=await inspeccionar(blob);}
    }
    const id=await identidad(blob), existente=await obtener(id);if(existente)return existente;
    const registro={id,nombre:(archivo.name||"Imagen").slice(0,180),...meta,tamano:blob.size,creadaEn:new Date().toISOString(),archivo:blob};
    await operar("readwrite",s=>s.add(registro));avisar();return registro;
  }
  async function renombrar(id,nombre) {if(!nombre.trim())throw new Error("Escribe un nombre descriptivo.");const r=await obtener(id);if(!r)throw new Error("La imagen ya no existe.");await operar("readwrite",s=>s.put({...r,nombre:nombre.trim().slice(0,180)}));avisar();}
  async function eliminar(id) {const ejecutar=async()=>{if(usos(id).length)throw new Error("La imagen sigue en uso. Quita sus asociaciones antes de eliminarla.");await borrarArchivo(id);liberar(id);avisar();};return conBloqueo(ejecutar);}
  async function verificarReferencias(datos) {for(const ref of referencias(datos))if(!await obtener(ref.slice(prefijo.length)))throw new Error("Falta una imagen de la biblioteca. Recupérala desde una copia antes de guardar.");}
  async function exportar(datos) {
    const refs=datos?new Set(referencias(datos)):null, items=[];
    for(const r of await listar())if(!refs||refs.has(prefijo+r.id))items.push({...r,archivo:await dataURL(r.archivo)});
    if(refs&&items.length!==refs.size)throw new Error("Faltan archivos locales necesarios para la copia. No se generará una copia incompleta.");
    return {version:1,items};
  }
  async function validarCopia(datos,contenido) {
    if(datos==null){if(referencias(contenido).length)throw new Error("La copia contiene referencias de biblioteca sin sus archivos.");return [];}
    if(datos.version!==1||!Array.isArray(datos.items))throw new Error("La biblioteca de la copia no es válida.");
    const items=[],ids=new Set();
    for(const r of datos.items){
      if(!r||typeof r.nombre!=="string"||!r.nombre.trim()||typeof r.archivo!=="string"||!/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(r.archivo)||r.archivo.length>36*1024*1024)throw new Error("Hay un archivo de biblioteca no válido.");
      const [cab,base]=r.archivo.split(","), bin=atob(base),blob=new Blob([Uint8Array.from(bin,c=>c.charCodeAt(0))],{type:cab.slice(5,cab.indexOf(";"))}),meta=await inspeccionar(blob),id=await identidad(blob);
      if(id!==r.id||ids.has(id))throw new Error("La identidad de una imagen de la copia no coincide o está repetida.");ids.add(id);
      items.push({id,nombre:r.nombre.slice(0,180),...meta,tamano:blob.size,creadaEn:Number.isFinite(Date.parse(r.creadaEn))?r.creadaEn:new Date().toISOString(),archivo:blob});
    }
    if(referencias(contenido).some(ref=>!ids.has(ref.slice(prefijo.length))))throw new Error("La copia no contiene todos los archivos de sus referencias locales.");return items;
  }
  async function importar(items) {
    const nuevos=[];try{for(const r of items)if(!await obtener(r.id)){await operar("readwrite",s=>s.add(r));nuevos.push(r.id);}}catch(e){await revertir(nuevos);throw e;}return nuevos;
  }
  async function revertir(ids) {for(const id of ids)if(!usos(id).length){await borrarArchivo(id);liberar(id);}}
  return {conBloqueo,prefijo,esReferencia,referencias,estabilizar,url,cargarElemento,listar,obtener,usos,incorporar,renombrar,eliminar,exportar,validarCopia,importar,revertir,verificarReferencias};
})();
