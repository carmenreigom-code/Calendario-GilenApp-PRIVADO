let eventosAdmin = [];
let errorCargaEventos = false;
try {
    const guardados = JSON.parse(localStorage.getItem("eventos") || "[]");
    eventosAdmin = Array.isArray(guardados) ? guardados : [];
    errorCargaEventos = !Array.isArray(guardados);
} catch (error) {
    eventosAdmin = [];
    errorCargaEventos = true;
}

const CLAVE_LUGARES = "lugaresHabitualesGilena";
const CLAVE_DESTACADOS = "destacadosInicioGilena";
const CLAVE_FIESTAS = "fiestasDestacadasGilena";
let fiestasDestacadas = [];
try { const datos = JSON.parse(localStorage.getItem(CLAVE_FIESTAS) || "[]"); if (Array.isArray(datos)) fiestasDestacadas = [...new Set(datos.map(String))]; } catch {}
let destacadosInicio = [];
try { const guardados=JSON.parse(localStorage.getItem(CLAVE_DESTACADOS)||"[]"); destacadosInicio=Array.isArray(guardados)?guardados.map(String).slice(0,6):[]; } catch { destacadosInicio=[]; }
let lugaresHabituales = [];
try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_LUGARES) || "[]");
    lugaresHabituales = Array.isArray(guardados) ? guardados : [];
} catch (error) {
    lugaresHabituales = [];
}

function guardarLugares(nuevaLista) {
    try {
        localStorage.setItem(CLAVE_LUGARES, JSON.stringify(nuevaLista));
        lugaresHabituales = nuevaLista;
        renderizarLugaresHabituales();
        return true;
    } catch (error) {
        notificar("No se pudieron guardar los lugares. Los datos anteriores siguen intactos.", "error");
        return false;
    }
}

const campo = (id) => document.getElementById(id);
let galeriaEditor = [];
let limpiarPreviaCarrusel = () => {};
let cambiosPendientes = false;
let rellenandoEditor = false;
let temporalIlegible = false;
let firmaGuardada = null;
function firmaFormulario(){return JSON.stringify(datosFormulario(null,"",campo("estadoPublicacionEditor").dataset.estado||"borrador"));}
function estadoEditor(estado, detalle="") {
    const textos={pendiente:"Cambios sin guardar",guardando:"Guardando…",guardado:"Guardado",error:"No se ha podido guardar",descartado:"Cambios descartados"};
    const nodo=campo("estadoGuardado");
    const texto=textos[estado]+(detalle?` · ${detalle}`:"");
    if(nodo.textContent!==texto)nodo.textContent=texto;
    nodo.dataset.estado=estado;
    if(["guardado","descartado"].includes(estado))document.getElementById("mensajesAdmin")?.classList.remove("visible");
}
function descartarCambiosEditor() {
    try { localStorage.removeItem("borradorEventoAdmin"); }
    catch { notificar("No se pudo retirar el temporal. El formulario y la copia anterior se conservan.","error");return false; }
    clearTimeout(temporizadorBorrador);cambiosPendientes=false;temporalIlegible=false;
    campo("estadoBorrador").textContent="Sin autoguardado temporal";estadoEditor("descartado");return true;
}
async function puedeSalirEditor() {
    if(campo("vista-contenido-web")&&!campo("vista-contenido-web").hidden&&AdminGestion.contenidoPendiente()){
        if(!await confirmarAccion("Contenido sin guardar","¿Descartar los cambios del contenido web y continuar?","Descartar cambios"))return false;
        campo("cancelarContenidoWeb").click();
    }
    if(guardandoEvento||cargasImagenPendientes.size){notificar("Espera a que termine el guardado o la carga de imágenes.","error");return false;}
    if(!cambiosPendientes||campo("vista-editor").hidden)return true;
    return await confirmarAccion("Cambios sin guardar","El evento no incluye todavía estos cambios. ¿Descartarlos y continuar?","Descartar cambios") && descartarCambiosEditor();
}
function bloquearEditor(ocupado) {
    document.querySelectorAll(".cms-editor-pages,#modoPlantilla").forEach(n=>n.inert=ocupado);
    document.querySelectorAll("#vista-editor .cms-editor-actionbar button").forEach(b=>b.disabled=ocupado);
}
let resolverConfirmacion = null;
let focoAntesConfirmacion = null;
const escaparHTML = (valor = "") => String(valor).replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
function guardarFiltrosAdmin() { window.AdminListado?.guardar(); }
function restaurarFiltrosAdmin() { window.AdminListado?.restaurar(); }
const hoyInicio = () => { const fecha = new Date(); fecha.setHours(0, 0, 0, 0); return fecha; };
const fechaEvento = (fecha) => fecha ? new Date(`${fecha}T12:00:00`) : null;
const fechaTexto = (fecha) => InformacionEvento.fecha(fecha) ? fechaEvento(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : fecha ? "Fecha no válida" : "Sin fecha";
const nombreEstado = (evento) => ({ borrador: "Borrador", publicado: "Publicado", archivado: "Archivado" })[estadoPublicacion(evento)] || "Estado desconocido";
const etiquetaEstado = (evento) => `<span class="cms-status ${escaparHTML(estadoPublicacion(evento))}">${nombreEstado(evento)}</span>`;
function notificar(mensaje, tipo = "correcto") {
    const contenedor = campo("mensajesAdmin");
    if (!contenedor) return;
    contenedor.textContent = mensaje;
    contenedor.className = `cms-mensajes visible ${tipo}`;
    clearTimeout(notificar.temporizador);
    if(tipo!=="error")notificar.temporizador = setTimeout(() => contenedor.classList.remove("visible"), 8000);
}
function confirmarAccion(titulo, mensaje, etiqueta = "Confirmar", nombreRequerido = "") {
    const fondo = campo("confirmacionAdmin");
    if(!fondo.hidden)return Promise.resolve(false);
    const modal=document.querySelector('dialog[open]');if(modal)modal.append(fondo);
    campo("confirmacionTitulo").textContent = titulo;
    campo("confirmacionTexto").textContent = mensaje;
    fondo.querySelector('[data-confirmar="aceptar"]').textContent = etiqueta;
    const nombre = campo("confirmacionNombre");
    nombre.value = ""; nombre.dataset.requerido = nombreRequerido;
    campo("confirmacionNombreGrupo").hidden = !nombreRequerido;
    fondo.querySelector('[data-confirmar="aceptar"]').disabled = !!nombreRequerido;
    focoAntesConfirmacion = document.activeElement;
    fondo.hidden = false;
    fondo.querySelector('[data-confirmar="cancelar"]').focus();
    return new Promise(resolver => { resolverConfirmacion = resolver; });
}
function cerrarConfirmacion(resultado) {
    const fondo = campo("confirmacionAdmin");
    if (!fondo || fondo.hidden) return;
    if (resultado && campo("confirmacionNombre").dataset.requerido && campo("confirmacionNombre").value.trim().replace(/\s+/g," ") !== campo("confirmacionNombre").dataset.requerido.trim().replace(/\s+/g," ")) return;
    fondo.hidden = true;
    document.body.append(fondo);
    resolverConfirmacion?.(resultado);
    resolverConfirmacion = null;
    focoAntesConfirmacion?.focus?.();
    focoAntesConfirmacion = null;
}
function actualizarResumenSecciones() {
    document.querySelectorAll(".cms-form-panel.cms-plegable").forEach(panel => {
        const entradas = [...panel.querySelectorAll("input:not([type=hidden]):not([type=file]),select,textarea")];
        const completos = entradas.filter(elemento => elemento.type === "checkbox" ? elemento.checked : elemento.value?.trim()).length;
        const resumen = panel.querySelector(".cms-seccion-resumen");
        if (resumen) resumen.textContent = completos ? `${completos} ${completos === 1 ? "dato completado" : "datos completados"}` : "Sin datos opcionales";
    });
    document.querySelectorAll("#vista-editor details.cms-opciones:not(#recomendacionesPanel)").forEach(panel=>{
        const entradas=[...panel.querySelectorAll('input:not([type=hidden]):not([type=file]),textarea')];
        const n=entradas.filter(c=>c.type==='checkbox'?c.checked&&c.dataset.propiedad!=='visible':c.value.trim()).length;
        const summary=panel.querySelector('summary');let resumen=summary.querySelector('.cms-opcional-resumen');
        if(!resumen){resumen=document.createElement('small');resumen.className='cms-opcional-resumen';summary.append(' ',resumen);}
        resumen.textContent=n?`${n} ${n===1?"dato completado":"datos completados"}`:'Opcional · Sin datos';
    });
}
function abrirSeccion(elemento) {
    const panel = elemento?.closest(".cms-plegable");
    if (!panel) return;
    panel.classList.add("abierta");
    panel.querySelector(".cms-panel-contenido").hidden = false;
    panel.querySelector(".cms-seccion-toggle").setAttribute("aria-expanded", "true");
}
function organizarFormulario() {
    const layout = document.querySelector("#vista-editor .cms-editor-layout");
    const basico = campo("titulo").closest(".cms-form-panel");
    const ubicacion = campo("lugarHabitual").closest(".cms-form-panel");
    const descripcion = campo("descripcion").closest(".cms-form-panel");
    const fechas = document.createElement("div");
    fechas.className = "cms-form-grid cms-form-grid-2";
    ["rangoFechas", "hora", "horaFin"].forEach(id => fechas.append(campo(id).closest(".meta-item")));
    ubicacion.querySelector(".cms-panel-heading").after(fechas);
    basico.append(campo("descripcion").closest(".meta-item"));
    descripcion.querySelector("h2").textContent="Descripción principal";
    const grupos = [
        ["basicos", "Datos básicos", ["titulo"]],
        ["contenido", "Contenido", ["editor-container"]],
        ["fecha", "Fecha y lugar", ["rangoFechas", "lugarHabitual", "estadoActividad"]],
        ["imagenes", "Imágenes", ["imagen", "imagenTarjeta", "imagenCarrusel", "cartel", "galeriaAdmin"]],
        ["programa", "Programa", ["listaProgramaAdmin"]],
        ["acceso", "Acceso e información", ["tipoPrecio", "organizador", "edadRecomendada", "web", "mostrarCompartir"]]
    ];
    const paneles = grupos.map(([, , ids]) => ids.map(id => campo(id)?.closest(".cms-form-panel")).filter(Boolean));
    const barra = document.createElement("div");
    barra.className = "cms-editor-tabs";
    barra.setAttribute("role", "tablist");
    barra.setAttribute("aria-label", "Secciones del evento");
    const paginas = document.createElement("div");
    paginas.className = "cms-editor-pages";
    grupos.forEach(([id, nombre], indice) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.id = `tab-${id}`;
        boton.setAttribute("role", "tab");
        boton.setAttribute("aria-controls", `panel-${id}`);
        boton.textContent = nombre;
        barra.append(boton);
        const pagina = document.createElement("div");
        pagina.id = `panel-${id}`;
        pagina.className = "cms-editor-page";
        pagina.setAttribute("role", "tabpanel");
        pagina.setAttribute("aria-labelledby", boton.id);
        pagina.tabIndex = 0;
        paneles[indice].forEach(panel => pagina.append(panel));
        paginas.append(pagina);
    });
    layout.replaceWith(barra, paginas);
    // La interfaz coloca estos nodos en su navegación vertical sin recrear controles.
    barra.addEventListener("click", evento => { const tab = evento.target.closest('[role="tab"]'); if (tab) activarPestana(tab.id.slice(4)); });
    barra.addEventListener("keydown", evento => {
        const teclas = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (!teclas.includes(evento.key)) return;
        evento.preventDefault();
        const tabs = [...barra.querySelectorAll('[role="tab"]')];
        const actual = tabs.indexOf(document.activeElement);
        const siguiente = evento.key === "Home" ? 0 : evento.key === "End" ? tabs.length - 1 : (actual + (["ArrowRight","ArrowDown"].includes(evento.key) ? 1 : -1) + tabs.length) % tabs.length;
        tabs[siguiente].focus();
        activarPestana(tabs[siguiente].id.slice(4));
    });
    activarPestana("basicos");
    const acciones = document.querySelector("#vista-editor .cms-heading-actions");
    if (acciones) { acciones.classList.add("cms-editor-actionbar"); barra.before(acciones); }
    const botonPublicar = acciones?.querySelector('.btn-primario');
    if (botonPublicar) botonPublicar.innerHTML = '<i class="fa-solid fa-globe"></i> Publicar';
}
function activarPestana(id) {
    document.querySelectorAll(".cms-editor-tabs [role=tab]").forEach(tab => {
        const activa = tab.id === `tab-${id}`;
        tab.setAttribute("aria-selected", String(activa));
        tab.tabIndex = activa ? 0 : -1;
        tab.classList.toggle("activa", activa);
    });
    document.querySelectorAll(".cms-editor-page").forEach(panel => { panel.hidden = panel.id !== `panel-${id}`; });
    window.AdminInterfaz?.seccion(id);
}
function marcarPestanasConErrores() {
    document.querySelectorAll(".cms-editor-tabs [role=tab]").forEach(tab => {
        const pagina = campo(tab.getAttribute("aria-controls"));
        const errores = pagina?.querySelectorAll(".cms-field-error").length || 0;
        tab.classList.toggle("con-error", errores > 0);
        tab.setAttribute("aria-label", `${tab.textContent}${errores ? `, ${errores} errores` : ""}`);
        window.AdminInterfaz?.marcarError(tab,errores);
    });
}
function guardarColeccion(nuevaLista, liberarBorradorTemporal = false) {
    if (errorCargaEventos) { notificar("No se pudo leer la colección anterior y no se sobrescribirá. Recarga o importa una copia válida para continuar.", "error"); return false; }
    let borradorAnterior = null;
    let borradorLiberado = false;
    try {
        const actuales=JSON.parse(localStorage.getItem("eventos")||"[]");
        if (JSON.stringify(actuales)!==JSON.stringify(eventosAdmin)) { notificar("Los eventos han cambiado desde otra pestaña. No se sobrescribió nada; revisa el listado antes de continuar.","error"); return false; }
        const anteriores=new Map(eventosAdmin.map(e=>[String(e.id),e]));
        nuevaLista=BibliotecaImagenes.estabilizar(nuevaLista).map(e=>{const anterior=anteriores.get(String(e.id));return JSON.stringify(e)===JSON.stringify(anterior)?e:{...e,modificadoEn:new Date().toISOString()};});
        const datos = JSON.stringify(nuevaLista);
        // El autoguardado puede contener otra copia completa de las imágenes.
        // Al guardar el evento ya no se necesita; si falla, se restaura.
        if (liberarBorradorTemporal) {
            borradorAnterior = localStorage.getItem("borradorEventoAdmin");
            if (borradorAnterior !== null) {
                localStorage.removeItem("borradorEventoAdmin");
                borradorLiberado = true;
            }
        }
        localStorage.setItem("eventos", datos);
        eventosAdmin = nuevaLista;
        return true;
    } catch (error) {
        let borradorRestaurado = true;
        if (borradorLiberado) {
            try { localStorage.setItem("borradorEventoAdmin", borradorAnterior); }
            catch (errorRestauracion) { borradorRestaurado = false; }
        }
        const cuota = error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
        const mensaje = cuota
            ? "El almacenamiento del navegador está lleno. Reduce el tamaño o la cantidad de imágenes del evento y vuelve a intentarlo. Puedes exportar una copia en Configuración."
            : "El navegador no permitió guardar los eventos. Comprueba que el almacenamiento del sitio esté habilitado y vuelve a intentarlo.";
        notificar(`No se pudieron guardar los eventos. ${mensaje} Los eventos anteriores siguen intactos.${borradorRestaurado ? "" : " Tampoco se pudo recuperar el autoguardado temporal."}`, "error");
        return false;
    }
}
function generarId(ocupados) {
    let id = Date.now();
    while (ocupados.has(String(id))) id++;
    ocupados.add(String(id));
    return id;
}
function refrescarAdmin() {
    renderizarListaCajon();
    renderizarTablas();
    renderizarDestacadosAdmin();
    renderizarFiestasAdmin();
    window.AdminGestion?.refrescar();
    if (typeof renderizarCalendarioAdmin === "function") renderizarCalendarioAdmin();
}
function guardarOrdenDestacados(notificarError = true) {
    const resultado = DestacadosGilena.guardar(destacadosInicio);
    if (!resultado.ok && notificarError) notificar("No se pudieron guardar los destacados. La configuración anterior se conserva.", "error");
    return resultado.ok;
}
function renderizarDestacadosAdmin() {
    destacadosInicio = DestacadosGilena.configuracion(eventosAdmin).ids;
    const elegibles = DestacadosGilena.elegibles(eventosAdmin);
    const selector = campo("seleccionarDestacado");
    selector.innerHTML = '<option value="">Selecciona un evento</option>' + elegibles.filter(e => !destacadosInicio.includes(String(e.id))).map(e => '<option value="'+escaparHTML(e.id)+'">'+escaparHTML(e.titulo)+'</option>').join("");
    campo("anadirDestacado").disabled = destacadosInicio.length >= 6;
    campo("listaDestacadosAdmin").innerHTML = destacadosInicio.map((id,i) => {
        const e = eventosAdmin.find(e => String(e.id) === id), valido = elegibles.some(e => String(e.id) === id);
        return '<div class="cms-destacado-item"><strong>'+escaparHTML(e?.titulo || "Evento no disponible")+'</strong><span>'+(valido ? escaparHTML(fechaTexto(e.fecha)) : "No elegible actualmente")+'</span><button type="button" data-subir-destacado="'+escaparHTML(id)+'" aria-label="Subir destacado" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-bajar-destacado="'+escaparHTML(id)+'" aria-label="Bajar destacado" '+(i===destacadosInicio.length-1?'disabled':'')+'>↓</button><button type="button" data-quitar-destacado="'+escaparHTML(id)+'">Quitar</button></div>';
    }).join("") || '<p>Sin selección manual. Se mostrarán los próximos eventos elegibles.</p>';
    campo("contadorDestacados").textContent = destacadosInicio.length + " / 6";
}
function manejarDestacadosAdmin(evento) {
    const b = evento.target.closest("[data-subir-destacado],[data-bajar-destacado],[data-quitar-destacado]");
    if (!b) return;
    const id = b.dataset.subirDestacado || b.dataset.bajarDestacado || b.dataset.quitarDestacado;
    const antes = [...destacadosInicio], indice = destacadosInicio.indexOf(id);
    if (indice < 0) return;
    if (b.hasAttribute("data-quitar-destacado")) destacadosInicio.splice(indice,1);
    else {
        const destino = indice + (b.hasAttribute("data-subir-destacado") ? -1 : 1);
        if (destino < 0 || destino >= destacadosInicio.length) return;
        [destacadosInicio[indice],destacadosInicio[destino]] = [destacadosInicio[destino],destacadosInicio[indice]];
    }
    if (!guardarOrdenDestacados()) destacadosInicio = antes;
    renderizarDestacadosAdmin();
    campo("seleccionarDestacado").focus();
}
function guardarFiestas(nuevaLista) {
    try { localStorage.setItem(CLAVE_FIESTAS, JSON.stringify(nuevaLista)); fiestasDestacadas = nuevaLista; renderizarFiestasAdmin(); return true; }
    catch { notificar("No se pudo guardar la selección de fiestas. Se conserva la anterior.", "error"); return false; }
}
function renderizarFiestasAdmin() {
    const lista = campo("listaFiestasAdmin"), selector = campo("seleccionarFiesta");
    if (!lista || !selector) return;
    selector.innerHTML = '<option value="">Selecciona un evento publicado</option>' + eventosAdmin.filter(e => esEventoPublicado(e) && !fiestasDestacadas.includes(String(e.id))).map(e => `<option value="${escaparHTML(e.id)}">${escaparHTML(e.titulo || 'Sin título')}</option>`).join("");
    lista.innerHTML = fiestasDestacadas.map((id, indice) => {
        const e = eventosAdmin.find(e => String(e.id) === id);
        return `<li class="cms-fiesta-fila"><div><strong>${escaparHTML(e?.titulo || 'Evento eliminado')}</strong>${!e || !esEventoPublicado(e) ? '<small>No visible en la portada</small>' : ''}</div><div class="cms-fiesta-acciones"><button type="button" data-fiesta-accion="subir" data-fiesta-id="${escaparHTML(id)}" aria-label="Subir ${escaparHTML(e?.titulo || 'evento')}" ${indice === 0 ? 'disabled' : ''}>↑</button><button type="button" data-fiesta-accion="bajar" data-fiesta-id="${escaparHTML(id)}" aria-label="Bajar ${escaparHTML(e?.titulo || 'evento')}" ${indice === fiestasDestacadas.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-fiesta-accion="quitar" data-fiesta-id="${escaparHTML(id)}">Quitar</button></div></li>`;
    }).join("") || '<li class="cms-destacados-vacios">Sin selección. La sección de fiestas se ocultará en el inicio.</li>';
}
const categoriaTexto = (categoria = "otros") => ({ cultura: "🎭 Cultura", deportes: "⚽ Deportivo", fiestas: "🎉 Fiesta", arte: "🎨 Arte", concierto: "🎵 Concierto", cine: "🎬 Cine", educacion: "📚 Educación", ayuntamiento: "🏛️ Ayuntamiento", familiar: "👨‍👩‍👧‍👦 Familiar", mercado: "🛍️ Mercado", naturaleza: "🌳 Naturaleza", gastronomia: "🧑‍🍳 Gastronomía", juventud: "Juventud", otros: "Otros" }[categoria] || categoria);

const calendarioRango = flatpickr("#rangoFechas", {
    mode: "range",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: "es",
    onChange: function (fechas, texto, instancia) {
        campo("fecha").value = fechas.length ? instancia.formatDate(fechas[0], "Y-m-d") : "";
        campo("fechaFin").value = fechas.length > 1 ? instancia.formatDate(fechas[1], "Y-m-d") : "";
        limpiarError("rangoFechas");
        actualizarPreviasImagenes();
        programarAutoguardado();
        if (campo("sesiones")) AdminInformacion.avisar();
    }
});

const ImagenTextoQuill=Quill.import('formats/image');
const sanearImagenQuill=ImagenTextoQuill.sanitize;
ImagenTextoQuill.sanitize=valor=>typeof valor==='string'&&(BibliotecaImagenes.esReferencia(valor)||BibliotecaImagenes.esReferencia(BibliotecaImagenes.estabilizar(valor)))?valor:sanearImagenQuill(valor);
// Los vídeos antiguos siguen editables como un bloque inerte; nunca un iframe al abrir el editor.
const VideoBase=Quill.import('blots/block/embed');
class VideoSeguro extends VideoBase {
    static create(valor){const n=super.create();const v=BloquesEvento.video(typeof valor==='object'?valor?.url:valor);if(v){n.dataset.videoUrl=v.url;n.dataset.videoTitulo=typeof valor==='object'&&typeof valor.titulo==='string'?valor.titulo:'Vídeo del evento';n.textContent='Vídeo · '+v.proveedor+' (carga voluntaria en la vista previa)';}return n;}
    static value(n){return {url:n.dataset.videoUrl||'',titulo:n.dataset.videoTitulo||'Vídeo del evento'};}
}
VideoSeguro.blotName='video';VideoSeguro.tagName='DIV';VideoSeguro.className='ev-video-legacy';Quill.register(VideoSeguro,true);
const quill = new Quill("#editor-container", {
    theme: "snow",
    formats:["header","bold","italic","underline","strike","list","indent","align","link","image","video","blockquote"],
    placeholder: "Empieza a escribir la información del evento...",
    modules: {
        imageResize: { displaySize: true },
        history: { delay: 1000, maxStack: 100, userOnly: true },
        toolbar: {
            container: "#toolbar",
            handlers: {
                undo: function () { this.quill.history.undo(); },
                redo: function () { this.quill.history.redo(); },
                divider: function () {
                    const rango = this.quill.getSelection(true);
                    this.quill.insertText(rango.index, "────────────────────────\n", { color: "#82909d" }, "user");
                    this.quill.setSelection(rango.index + 26, 0, "silent");
                }
            }
        }
    }
});

quill.root.setAttribute('role','textbox');quill.root.setAttribute('aria-label','Información detallada del evento');quill.root.setAttribute('aria-multiline','true');
quill.getModule('toolbar').addHandler('image',()=>{
    const rango=quill.getSelection(true),input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';input.hidden=true;input.id='imagenTextoLocal';document.body.append(input);
    input.oncancel=()=>input.remove();input.onchange=()=>{const archivo=input.files?.[0];if(!archivo){input.remove();return;}registrarCargaImagen((async()=>{try{const ref=await leerArchivoImagen(archivo);quill.insertEmbed(rango.index,'image',ref,'user');quill.setSelection(rango.index+1,0,'silent');}catch(error){fallosCargaImagen++;estadoEditor('error','La imagen del texto no se incorporó');notificar(error.message,'error');}finally{input.remove();}})());};input.click();
});
const etiquetasToolbar={bold:'Negrita',italic:'Cursiva',underline:'Subrayado',strike:'Tachado',link:'Insertar enlace',image:'Insertar imagen en el texto',video:'Insertar vídeo',divider:'Insertar separador',undo:'Deshacer',redo:'Rehacer',clean:'Limpiar formato',list:'Lista',indent:'Sangría',header:'Encabezado',color:'Color del texto',background:'Color de fondo',align:'Alineación'};
for(const n of document.querySelectorAll('#toolbar button,#toolbar select,#toolbar .ql-picker')){const clase=[...n.classList].find(c=>c.startsWith('ql-')&&c!=='ql-picker');const nombre=etiquetasToolbar[clase?.slice(3)];if(!nombre)continue;const etiqueta=nombre+(n.value?' '+n.value:'');n.setAttribute('aria-label',etiqueta);if(n.tagName==='BUTTON')n.type='button';const label=n.querySelector('.ql-picker-label');if(label)label.setAttribute('aria-label',etiqueta);n.querySelectorAll('.ql-picker-item').forEach(item=>item.setAttribute('aria-label',nombre+' '+(item.dataset.value||'predeterminado')));}

function leerAjustesImagen(tipo) {
    return ImagenesEvento.normalizar({ modo: campo(`${tipo}Modo`).value, x: Number(campo(`${tipo}FocoX`).value), y: Number(campo(`${tipo}FocoY`).value) });
}
function actualizarPreviasImagenes() {
    const datos = {
        titulo: campo("titulo").value.trim(), descripcion: campo("descripcion").value.trim(),
        categoria: campo("categoria").value, fecha: campo("fecha").value, fechaFin: campo("fechaFin").value,
        lugar: campo("lugar").value.trim(), hora: campo("hora").value,
        imagen: campo("imagen").value, imagenTarjeta: campo("imagenTarjeta").value, imagenCarrusel: campo("imagenCarrusel").value,
        imagenAjustes: leerAjustesImagen("imagen"), imagenTarjetaAjustes: leerAjustesImagen("imagenTarjeta"), imagenCarruselAjustes: leerAjustesImagen("imagenCarrusel"),
        imagenMetadatos: window.AdminBiblioteca?.leerMetadatos() || {}
    };
    const titulo = escaparHTML(datos.titulo || "Título del evento");
    const resumen = datos.descripcion ? `<p class="evento-resumen">${escaparHTML(datos.descripcion)}</p>` : "";
    campo("portadaPrevia").innerHTML = `<div class="ficha-evento cms-preview-ficha"><section class="hero-evento"><div class="hero-evento-contenido"><h2>${titulo}</h2>${resumen}</div>${ImagenesEvento.renderizar(datos, "imagen", "hero-evento-media")}</section></div>`;
    const fecha = formatearRangoEvento(datos.fecha, datos.fechaFin);
    const metadatos = [datos.lugar, datos.hora].filter(Boolean).map((valor) => `<span>${escaparHTML(valor)}</span>`).join("");
    const categoria = escaparHTML(campo("categoria").selectedOptions[0]?.textContent || "");
    campo("tarjetaPrevia").innerHTML = `<article class="evento-card tarjeta-evento-compacta">${ImagenesEvento.renderizar(datos, "imagenTarjeta", "miniatura-evento")}<span class="boton-favorito" aria-hidden="true">♥</span><div class="evento-contenido tarjeta-evento-contenido"><h3>${titulo}</h3>${fecha ? `<p class="evento-fecha">${escaparHTML(fecha)}</p>` : ""}${metadatos ? `<p class="evento-metadatos">${metadatos}</p>` : ""}${categoria ? `<span class="categoria">${categoria}</span>` : ""}<span class="boton-evento">Ver detalles</span></div></article>`;
    limpiarPreviaCarrusel();
    campo("carruselPrevia").innerHTML = `<div class="destacado-diapositiva is-active modo-${datos.imagenCarruselAjustes.modo}">${ImagenesEvento.renderizarCarrusel(datos, true)}<span class="destacado-titulo">${titulo}</span></div>`;
    limpiarPreviaCarrusel = ImagenesEvento.activarCarrusel(campo("carruselPrevia"), datos) || (() => {});
    ImagenesEvento.activar(campo("portadaPrevia"));
    ImagenesEvento.activar(campo("tarjetaPrevia"));
    const propia = Boolean(ImagenesEvento.urlImagen(datos.imagenTarjeta));
    window.AdminOrganizacion?.imagenes();
    campo("tarjetaOrigen").textContent = propia ? "La tarjeta utiliza su propia imagen y estos ajustes." : "La tarjeta utiliza la imagen de portada. Puedes ajustar aquí su modo y enfoque de forma independiente.";
    ["imagen", "imagenTarjeta", "imagenCarrusel"].forEach((tipo) => {
        campo(`${tipo}Enfoque`).hidden = campo(`${tipo}Modo`).value !== "fotografia";
        ["X", "Y"].forEach((eje) => { campo(`${tipo}Valor${eje}`).textContent = `${campo(`${tipo}Foco${eje}`).value}%`; });
    });
}
function iniciarControlesImagen() {
    document.querySelectorAll("[data-ajustes-imagen]").forEach((contenedor) => {
        const tipo = contenedor.dataset.ajustesImagen;
        const nombre = tipo === "imagen" ? "portada" : tipo === "imagenTarjeta" ? "miniatura" : "carrusel";
        contenedor.innerHTML = `<fieldset class="cms-imagen-ajustes" id="${tipo}Controles"><legend>Visualización de ${nombre}</legend><label for="${tipo}Modo">Cómo mostrar la imagen</label><select id="${tipo}Modo"><option value="cartel">Cartel: mostrar completo</option><option value="fotografia">Fotografía: rellenar y recortar</option></select><p>Mostrar completo conserva todos los bordes. Recortar llena el espacio; ajusta el enfoque para elegir qué parte se ve.</p><div id="${tipo}Enfoque" class="cms-imagen-enfoque" hidden><label for="${tipo}FocoX">Enfoque horizontal <output id="${tipo}ValorX" for="${tipo}FocoX">50%</output></label><input id="${tipo}FocoX" type="range" min="0" max="100" value="50" aria-label="Enfoque horizontal de ${nombre}"><label for="${tipo}FocoY">Enfoque vertical <output id="${tipo}ValorY" for="${tipo}FocoY">50%</output></label><input id="${tipo}FocoY" type="range" min="0" max="100" value="50" aria-label="Enfoque vertical de ${nombre}"></div></fieldset>`;
        contenedor.addEventListener("input", actualizarPreviasImagenes);
    });
    campo("categoria").addEventListener("change", actualizarPreviasImagenes);
    ["titulo", "descripcion", "lugar", "hora"].forEach((id) => campo(id).addEventListener("change", actualizarPreviasImagenes));
    actualizarPreviasImagenes();
}
function restaurarAjustesImagen(datos) {
    ["imagen", "imagenTarjeta", "imagenCarrusel"].forEach((tipo) => {
        const ajustes = ImagenesEvento.normalizar(datos[`${tipo}Ajustes`] ?? (tipo === "imagenTarjeta" && !datos.imagenTarjeta ? datos.imagenAjustes : null));
        campo(`${tipo}Modo`).value = ajustes.modo;
        campo(`${tipo}FocoX`).value = ajustes.x;
        campo(`${tipo}FocoY`).value = ajustes.y;
    });
}
function actualizarPortada(valor, guardar = true) {
    queueMicrotask(()=>window.AdminBiblioteca?.refrescarMetadatos());
    campo("imagen").value = valor;
    if (!valor) campo("inputImagenLocal").value = "";
    actualizarPreviasImagenes();
    if (guardar) programarAutoguardado();
}

function renderizarLugaresHabituales() {
    const selector = campo("lugarHabitual");
    const lista = campo("listaLugaresHabituales");
    if (selector) {
        const valor = selector.value;
        selector.innerHTML = '<option value="">Selecciona un lugar</option>' + lugaresHabituales.map(lugar => `<option value="${escaparHTML(lugar.id)}">${escaparHTML(lugar.nombre)}</option>`).join("") + '<option value="otro">Otro lugar</option>';
        selector.value = [...selector.options].some(opcion => opcion.value === valor) ? valor : "";
    }
    if (lista) lista.innerHTML = lugaresHabituales.length ? lugaresHabituales.map(lugar => `<article class="cms-lugar-item"><div><h3>${escaparHTML(lugar.nombre)}</h3>${lugar.direccion ? `<p>${escaparHTML(lugar.direccion)}</p>` : ""}${lugar.googleMapsUrl ? `<a href="${escaparHTML(lugar.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Abrir mapa</a>` : ""}</div><div><button type="button" class="btn-secundario" data-editar-lugar="${escaparHTML(lugar.id)}">Editar</button><button type="button" class="cms-delete-action" data-eliminar-lugar="${escaparHTML(lugar.id)}">Eliminar</button></div></article>`).join("") : '<p class="cms-vacio">Aún no has guardado lugares habituales.</p>';
}
function limpiarFormularioLugar() {
    campo("lugarHabitualId").value = "";
    campo("lugarHabitualNombre").value = "";
    campo("lugarHabitualDireccion").value = "";
    campo("lugarHabitualMapa").value = "";
    campo("cancelarLugarHabitual").hidden = true;
}
function guardarLugarHabitual(evento) {
    evento.preventDefault();
    const nombre = campo("lugarHabitualNombre").value.trim();
    const direccion = campo("lugarHabitualDireccion").value.trim();
    const googleMapsUrl = campo("lugarHabitualMapa").value.trim();
    const estado = campo("estadoLugares");
    if (!nombre) { estado.textContent = "Escribe el nombre del lugar."; campo("lugarHabitualNombre").focus(); return; }
    if (googleMapsUrl && !DetalleEvento.urlGoogleMaps(googleMapsUrl)) { estado.textContent = "Introduce un enlace HTTPS válido de Google Maps."; campo("lugarHabitualMapa").focus(); return; }
    const idActual = campo("lugarHabitualId").value;
    const id = idActual || `lugar-${Date.now()}`;
    const lugar = { id, nombre, direccion, googleMapsUrl };
    const nuevaLista = idActual ? lugaresHabituales.map(item => String(item.id) === idActual ? lugar : item) : [...lugaresHabituales, lugar];
    if (!guardarLugares(nuevaLista)) return;
    estado.textContent = idActual ? "Lugar actualizado." : "Lugar guardado.";
    limpiarFormularioLugar();
}
async function elegirLugarHabitual() {
    const id = campo("lugarHabitual").value;
    if (!id || id === "otro") return;
    const lugar = lugaresHabituales.find(item => String(item.id) === id);
    if (!lugar) return;
    const hayDatos = ["lugar", "direccion", "googleMapsUrl"].some(nombre => campo(nombre).value.trim());
    if (hayDatos && !await confirmarAccion("Sustituir ubicación", "Ya hay datos escritos. ¿Quieres sustituirlos por los del lugar habitual seleccionado?", "Sustituir")) {
        campo("lugarHabitual").value = "otro";
        return;
    }
    campo("lugar").value = lugar.nombre || "";
    campo("direccion").value = lugar.direccion || "";
    campo("googleMapsUrl").value = lugar.googleMapsUrl || "";
    actualizarPreviasImagenes();
    programarAutoguardado();
}
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".cms-main").prepend(campo("mensajesAdmin"));
    iniciarControlesImagen();
    organizarFormulario();
    AdminInformacion.iniciar();
    AdminGestion.iniciar();
    AdminBiblioteca.iniciar();
    AdminListado.iniciar();
    document.querySelectorAll("#panel-acceso > .cms-form-panel").forEach(panel=>{
        const cabecera=panel.querySelector(".cms-panel-heading"),titulo=cabecera?.querySelector("h2");if(!titulo)return;
        const d=document.createElement("details"),s=document.createElement("summary");d.className="cms-opciones";s.textContent=titulo.textContent;titulo.remove();d.append(s);d.append(...panel.childNodes);panel.append(d);
    });
    actualizarResumenSecciones();
    campo("confirmacionNombre").addEventListener("input", () => { campo("confirmacionAdmin").querySelector('[data-confirmar="aceptar"]').disabled = campo("confirmacionNombre").value.trim().replace(/\s+/g," ") !== campo("confirmacionNombre").dataset.requerido.trim().replace(/\s+/g," "); });
    campo("anadirDestacado").addEventListener("click", () => {
        const id = campo("seleccionarDestacado").value;
        if (!id || destacadosInicio.length >= 6 || destacadosInicio.includes(id) || !DestacadosGilena.elegibles(eventosAdmin).some(e => String(e.id) === id)) return;
        const antes = [...destacadosInicio]; destacadosInicio.push(id);
        if (!guardarOrdenDestacados()) destacadosInicio = antes;
        renderizarDestacadosAdmin();
    });
    campo("anadirFiesta")?.addEventListener("click", () => {
        const id = campo("seleccionarFiesta").value;
        if (id && !fiestasDestacadas.includes(id) && eventosAdmin.some(e => String(e.id) === id && esEventoPublicado(e))) guardarFiestas([...fiestasDestacadas, id]);
    });
    campo("listaFiestasAdmin")?.addEventListener("click", event => {
        const boton = event.target.closest("[data-fiesta-accion]");
        if (!boton) return;
        const nueva = [...fiestasDestacadas], indice = nueva.indexOf(boton.dataset.fiestaId);
        if (indice < 0) return;
        if (boton.dataset.fiestaAccion === "quitar") nueva.splice(indice, 1);
        else { const destino = indice + (boton.dataset.fiestaAccion === "subir" ? -1 : 1); if (destino < 0 || destino >= nueva.length) return; [nueva[indice], nueva[destino]] = [nueva[destino], nueva[indice]]; }
        if (guardarFiestas(nueva)) { const botones = [...campo("listaFiestasAdmin").querySelectorAll("button:not(:disabled)")]; (botones.find(b => b.dataset.fiestaId === boton.dataset.fiestaId && b.dataset.fiestaAccion === boton.dataset.fiestaAccion) || campo("seleccionarFiesta"))?.focus(); }
    });
    campo("confirmacionAdmin").addEventListener("click", evento => {
        const accion = evento.target.closest("[data-confirmar]")?.dataset.confirmar;
        if (accion) cerrarConfirmacion(accion === "aceptar");
        else if (evento.target === campo("confirmacionAdmin")) cerrarConfirmacion(false);
    });
    campo("confirmacionAdmin").addEventListener("keydown", evento => {
        if (evento.key !== "Tab") return;
        const botones = [...campo("confirmacionAdmin").querySelectorAll("button:not([disabled]),input")].filter(e=>e.getClientRects().length);
        const primero = botones[0], ultimo = botones[botones.length - 1];
        if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    });
    renderizarLugaresHabituales();
    campo("lugarHabitual").addEventListener("change", elegirLugarHabitual);
    campo("formLugarHabitual").addEventListener("submit", guardarLugarHabitual);
    campo("cancelarLugarHabitual").addEventListener("click", limpiarFormularioLugar);
    campo("listaLugaresHabituales").addEventListener("click", async evento => {
        const editar = evento.target.closest("[data-editar-lugar]");
        const eliminar = evento.target.closest("[data-eliminar-lugar]");
        if (editar) {
            const lugar = lugaresHabituales.find(item => String(item.id) === editar.dataset.editarLugar);
            if (!lugar) return;
            campo("lugarHabitualId").value = lugar.id;
            campo("lugarHabitualNombre").value = lugar.nombre;
            campo("lugarHabitualDireccion").value = lugar.direccion || "";
            campo("lugarHabitualMapa").value = lugar.googleMapsUrl || "";
            campo("cancelarLugarHabitual").hidden = false;
            campo("lugarHabitualNombre").focus();
        }
        if (eliminar) {
            const lugar = lugaresHabituales.find(item => String(item.id) === eliminar.dataset.eliminarLugar);
            if (lugar && await confirmarAccion("Eliminar lugar habitual", `¿Eliminar «${lugar.nombre}»? Los eventos guardados no cambiarán.`, "Eliminar")) {
                if (guardarLugares(lugaresHabituales.filter(item => String(item.id) !== eliminar.dataset.eliminarLugar))) notificar(`«${lugar.nombre}» se ha eliminado de los lugares habituales.`);
            }
        }
    });
    document.querySelectorAll("[data-vista]").forEach(boton=>{
        if(boton.dataset.vista==="editor")boton.removeAttribute("onclick");
        boton.addEventListener("click",async evento=>{
            evento.preventDefault();const destino=boton.dataset.vista;
            if(destino==="editor"){nuevoEvento();return;}
            if(!await puedeSalirEditor())return;mostrarVista(destino);if(destino==="eventos"&&boton.dataset.gestionDestino)AdminGestion.pestaña(boton.dataset.gestionDestino);
        });
    });
    campo("buscarAdmin").addEventListener("input", renderizarTablas);
    campo("filtroAdmin").addEventListener("change", renderizarTablas);
    campo("filtroEstadoAdmin").addEventListener("change", renderizarTablas);
    campo("buscarAdmin").addEventListener("input", guardarFiltrosAdmin);
    campo("filtroAdmin").addEventListener("change", guardarFiltrosAdmin);
    campo("filtroEstadoAdmin").addEventListener("change", guardarFiltrosAdmin);
    restaurarFiltrosAdmin();
        campo("listaDestacadosAdmin")?.addEventListener("click", manejarDestacadosAdmin);
    const barraFiltros = campo("buscarAdmin").closest(".cms-filterbar");
    if (barraFiltros && !campo("resumenAdmin")) {
        const resumen = document.createElement("p"); resumen.id="resumenAdmin"; resumen.className="cms-filter-result"; resumen.setAttribute("role","status"); resumen.setAttribute("aria-live","polite");
        const limpiar = document.createElement("button"); limpiar.id="limpiarFiltrosAdmin"; limpiar.type="button"; limpiar.className="btn-secundario"; limpiar.textContent="Limpiar filtros"; limpiar.hidden=true;
        limpiar.addEventListener("click",()=>{ campo("buscarAdmin").value=""; campo("filtroAdmin").value="todos"; campo("filtroEstadoAdmin").value="todos"; renderizarTablas(); });
        barraFiltros.after(resumen,limpiar);
    }
    campo("limpiarFiltrosAdmin")?.addEventListener("click",()=>{campo("buscarAdmin").value="";campo("filtroAdmin").value="todos";campo("filtroEstadoAdmin").value="todos";guardarFiltrosAdmin();renderizarTablas();});
    document.querySelectorAll(".cms-editor-pages input, .cms-editor-pages select, .cms-editor-pages textarea").forEach((entrada) => entrada.addEventListener("input", () => { if (entrada.id && entrada.closest(".meta-item")) limpiarError(entrada.id); programarAutoguardado(); }));
    document.querySelectorAll(".cms-editor-pages select").forEach((entrada) => entrada.addEventListener("change", programarAutoguardado));
    campo("titulo").addEventListener("input", () => { campo("nombreEventoEditor").textContent = campo("titulo").value.trim() || "Evento sin título"; });
    quill.on("text-change", (_delta,_anterior,origen)=>{if(origen!=="silent")programarAutoguardado();});
    campo("inputImagenLocal").addEventListener("change", cargarImagenLocal);
    campo("inputCartel").addEventListener("change", (evento) => cargarImagenAdicional(evento, "cartel"));
    campo("inputGaleria").addEventListener("change", (evento) => cargarImagenAdicional(evento, "galeria"));
    campo("anadirActividad").addEventListener("click", () => { anadirActividad(); programarAutoguardado(); });
    campo("listaProgramaAdmin").addEventListener("input", event => { if (event.target.id) limpiarError(event.target.id); programarAutoguardado(); });
    campo("listaProgramaAdmin").addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-quitar-actividad]");
        if (boton) { boton.closest(".cms-programa-item").remove(); window.AdminInterfaz?.actualizarPrograma();programarAutoguardado(); }
        const orden = evento.target.closest("[data-orden-actividad]");
        if (orden) {
            const fila = orden.closest(".cms-programa-item"), subir = orden.dataset.ordenActividad === "subir";
            const vecina = subir ? fila.previousElementSibling : fila.nextElementSibling;
            if(window.AdminInterfaz){AdminInterfaz.moverActividad(fila,subir);orden.focus();programarAutoguardado();}
            else if (vecina) { if (subir) vecina.before(fila); else vecina.after(fila); orden.focus(); programarAutoguardado(); }
        }
    });
    campo("galeriaAdmin").addEventListener("click", (evento) => {
        const orden=evento.target.closest('[data-orden-galeria]');
        if(orden){const i=+orden.dataset.ordenGaleria,j=i+(+orden.dataset.direccion);if(j>=0&&j<galeriaEditor.length){AdminBiblioteca.moverGaleria(i,j);[galeriaEditor[i],galeriaEditor[j]]=[galeriaEditor[j],galeriaEditor[i]];renderGaleriaAdmin();programarAutoguardado();campo('galeriaAdmin').querySelector('[data-orden-galeria="'+j+'"][data-direccion="'+orden.dataset.direccion+'"]')?.focus();}return;}
        const boton = evento.target.closest("[data-quitar-galeria]");
        if (boton) { AdminBiblioteca.quitarGaleria(Number(boton.dataset.quitarGaleria)); galeriaEditor.splice(Number(boton.dataset.quitarGaleria), 1); renderGaleriaAdmin(); programarAutoguardado(); }
    });
    document.querySelectorAll("[data-bloque]").forEach((boton) => boton.addEventListener("click", () => insertarBloque(boton.dataset.bloque)));
    campo("zonaImagen").addEventListener("dragover", (evento) => { evento.preventDefault(); campo("zonaImagen").classList.add("arrastrando"); });
    campo("zonaImagen").addEventListener("dragleave", () => campo("zonaImagen").classList.remove("arrastrando"));
    campo("zonaImagen").addEventListener("drop", (evento) => {
        evento.preventDefault();
        campo("zonaImagen").classList.remove("arrastrando");
        const archivo = evento.dataTransfer.files[0];
        if (archivo && archivo.type.startsWith("image/")) leerImagen(archivo);
    });
    campo("modalVistaPrevia").addEventListener("click", (evento) => { if (evento.target === campo("modalVistaPrevia")) cerrarVistaPrevia(); });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && !campo("confirmacionAdmin").hidden) { evento.preventDefault(); evento.stopPropagation(); cerrarConfirmacion(false); }
        else if (evento.key === "Escape" && !DetalleEvento.visorAbierto()) cerrarVistaPrevia();
        if (evento.key === "Tab" && !campo("modalVistaPrevia").hidden) {
            const controles = [...campo("modalVistaPrevia").querySelectorAll("button:not(:disabled),a[href],input,select,textarea")].filter(e => e.getClientRects().length);
            const primero = controles[0], ultimo = controles[controles.length-1];
            if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
            else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
        }
    });
    campo("exportarEventos").addEventListener("click", exportarEventos);
    campo("importarEventos").addEventListener("click", importarEventos);
    document.querySelectorAll('[data-preview-ancho]').forEach(b=>b.addEventListener('click',()=>{campo('previewEventoCompleto').classList.toggle('preview-movil',b.dataset.previewAncho==='movil');document.querySelectorAll('[data-preview-ancho]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
    restaurarBorrador();
    renderizarListaCajon();
    renderizarTablas();
    renderizarDestacadosAdmin();
    renderizarFiestasAdmin();
});

function mostrarVista(nombre) {
    if(nombre==="editor")window.AdminInterfaz?.recordarListado();
    const anterior=document.querySelector(".cms-vista.activa")?.id;
    document.querySelectorAll(".cms-vista").forEach((vista) => {
        const activa = vista.id === `vista-${nombre}`;
        vista.hidden = !activa;
        vista.classList.toggle("activa", activa);
    });
    document.querySelectorAll(".cms-nav-link").forEach((boton) => boton.classList.toggle("activo", boton.dataset.vista === nombre));
    window.scrollTo({ top: 0, behavior: document.documentElement.dataset.movimientoReducido === "true" || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    if(anterior!==`vista-${nombre}`){const h=campo(`vista-${nombre}`)?.querySelector("h1");if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
    if (nombre === "inicio" || nombre === "eventos") renderizarTablas();
    if (nombre === "imagenes") window.AdminBiblioteca?.refrescar();
    if (nombre === "calendario" && typeof renderizarCalendarioAdmin === "function") renderizarCalendarioAdmin();
    window.AdminInterfaz?.vista(nombre,anterior);
}

function renderizarTablas() { window.AdminListado?.renderizar(); }

function limpiarError(id) {
    const entrada = campo(id);
    const visible = id === "rangoFechas" ? calendarioRango.altInput || entrada : entrada;
    visible.removeAttribute("aria-invalid");
    visible.removeAttribute("aria-describedby");
    (entrada.closest(".meta-item") || entrada.parentElement)?.querySelector(".cms-field-error")?.remove();
    marcarPestanasConErrores();
}
function limpiarErroresFormulario() {
    document.querySelectorAll(".cms-field-error").forEach((error) => error.remove());
    document.querySelectorAll("[aria-invalid]").forEach((entrada) => { entrada.removeAttribute("aria-invalid"); entrada.removeAttribute("aria-describedby"); });
    marcarPestanasConErrores();
}
function mostrarError(id, mensaje) {
    const entrada = campo(id);
    for (let padre = entrada.parentElement; padre; padre = padre.parentElement) if (padre.tagName === "DETAILS") padre.open = true;
    activarPestana(entrada.closest(".cms-editor-page")?.id.slice(6) || "basicos");
    const visible = id === "rangoFechas" ? calendarioRango.altInput || entrada : entrada;
    const error = document.createElement("p");
    error.className = "cms-field-error";
    error.id = `error-${id}`;
    error.textContent = mensaje;
    (entrada.closest(".meta-item") || entrada.parentElement).append(error);
    visible.setAttribute("aria-invalid", "true");
    visible.setAttribute("aria-describedby", error.id);
    marcarPestanasConErrores();
    return visible;
}
function fechaValida(valor) { return InformacionEvento.fecha(valor); }
function enlaceValido(valor) { return !valor || Boolean(InformacionEvento.url(valor)); }
function erroresFormulario() {
    const datos=datosFormulario(null,"","borrador");
    const errores=RevisionEventos.analizar(datos,{plantilla:AdminGestion.esPlantilla()}).filter(a=>a.tipo==="error").map(a=>[AdminListado.campoRuta(a.campo)?.id||"titulo",a.mensaje]);
    return errores;
}
function validarPublicacion() {
    limpiarErroresFormulario();
    const errores = erroresFormulario();
    errores.forEach(([id, mensaje]) => mostrarError(id, mensaje));
    const primero = errores[0] && campo(errores[0][0]);
    if (primero) {
        for (let padre = primero.parentElement; padre; padre = padre.parentElement) if (padre.tagName === "DETAILS") padre.open = true;
        activarPestana(primero.closest(".cms-editor-page")?.id.slice(6) || "basicos");
        (errores[0][0] === "rangoFechas" ? calendarioRango.altInput || primero : primero).focus();
    }
    return errores.length === 0;
}
function datosFormulario(existente, id, estado) {
    return {
        ...(existente || {}), id, estado,
        titulo: campo("titulo").value.trim(), fecha: campo("fecha").value,
        destacarInicio: existente?.destacarInicio === true,
        revisionPlantillaPendiente: AdminGestion.revision(),
        ...AdminInformacion.leer(),
        fechaFin: campo("fechaFin").value, hora: campo("hora").value, horaFin: campo("horaFin").value,
        lugar: campo("lugar").value.trim(), direccion: campo("direccion").value.trim(),
        googleMapsUrl: campo("googleMapsUrl").value.trim(), mostrarComoLlegar: campo("mostrarComoLlegar").checked,
        organizador: campo("organizador").value.trim(), telefono: campo("telefono").value.trim(), correo: campo("correo").value.trim(),
        edadRecomendada: campo("edadRecomendada").value.trim(), accesibilidad: campo("accesibilidad").value.trim(),
        traer: campo("traer").value.trim(), observaciones: campo("observaciones").value.trim(),
        estadoActividad: campo("estadoActividad").value, mensajeEstado: campo("mensajeEstado").value.trim(),
        programa: leerProgramaFormulario(), mostrarCompartir: campo("mostrarCompartir").checked,
        mostrarRelacionados: campo("mostrarRelacionados").checked,
        tipoPrecio: campo("tipoPrecio").value, precio: campo("precio").value.trim(), aforo: campo("aforo").value,
        reservas: campo("reservas").value, urlReserva: campo("urlReserva").value.trim(),
        web: campo("web").value.trim(), instagram: campo("instagram").value.trim(),
        facebook: campo("facebook").value.trim(), otroEnlace: campo("otroEnlace").value.trim(),
        categoria: campo("categoria").value, imagen: campo("imagen").value,
        imagenTarjeta: campo("imagenTarjeta").value, imagenCarrusel: campo("imagenCarrusel").value, cartel: campo("cartel").value,
        imagenAjustes: leerAjustesImagen("imagen"), imagenTarjetaAjustes: leerAjustesImagen("imagenTarjeta"), imagenCarruselAjustes: leerAjustesImagen("imagenCarrusel"),
        imagenMetadatos: window.AdminBiblioteca?.leerMetadatos() || {},
        galeria: [...galeriaEditor], descripcion: campo("descripcion").value.trim(),
        descripcion_larga: DetalleEvento.htmlSeguro(BibliotecaImagenes.estabilizar(quill.root.innerHTML))
    };
}
function actualizarEstadoEditor(estado) {
    const etiqueta = campo("estadoPublicacionEditor");
    etiqueta.textContent = estado === "publicado" ? "Publicado" : estado === "archivado" ? "Archivado" : "Borrador";
    etiqueta.dataset.estado = estado;
    const boton = document.querySelector("#vista-editor .cms-editor-actionbar .btn-primario");
    if (boton) boton.innerHTML = `<i class="fa-solid fa-globe"></i> ${estado === "publicado" ? "Guardar cambios" : "Publicar"}`;
    window.AdminGestion?.aplicarModo();
}
let guardandoEvento = false;
const cargasImagenPendientes = new Set();
let fallosCargaImagen=0;
async function esperarImagenes(){const antes=fallosCargaImagen;const resultados=await Promise.allSettled([...cargasImagenPendientes]);if(antes!==fallosCargaImagen||resultados.some(r=>r.status==="rejected"))throw new Error("No se guardó el evento: falló una imagen que estaba cargándose. El formulario y los datos anteriores se conservan; vuelve a seleccionar la imagen antes de reintentar.");}
function registrarCargaImagen(tarea) {
    cargasImagenPendientes.add(tarea);
    tarea.then(() => cargasImagenPendientes.delete(tarea), () => cargasImagenPendientes.delete(tarea));
    return tarea;
}
async function guardarEvento(estado = "publicado") {
    if (guardandoEvento) return;
    if (AdminGestion.esPlantilla()) { guardandoEvento = true;estadoEditor("guardando");try { await AdminGestion.guardarPlantillaEditor(); } finally { guardandoEvento = false;bloquearEditor(false); } return; }
    if (estado === "publicado" && !validarPublicacion()) return;
    if (estado === "borrador") limpiarErroresFormulario();
    guardandoEvento = true;bloquearEditor(true);estadoEditor("guardando");

    clearTimeout(temporizadorBorrador);
    try {
        if (cargasImagenPendientes.size) {
            estadoEditor("guardando","Terminando de cargar imágenes");
            await esperarImagenes();
        }
        eventosAdmin = AdminGestion.coleccionActual();
        if (!AdminGestion.disponibleParaGuardar()) {estadoEditor("error","Conflicto con otra versión");return;}
        const baseGuardado=localStorage.getItem("eventos");
        const idInput = campo("eventoId").value;
        const indice = eventosAdmin.findIndex((evento) => String(evento.id) === idInput);
        const existente = indice >= 0 ? eventosAdmin[indice] : null;
        const ocupados = new Set(eventosAdmin.map((evento) => String(evento.id)));
        if (!existente && idInput && AdminGestion.idsReservados().includes(idInput)) { estadoEditor("error","El evento está en la papelera");notificar("El evento está en la papelera. Restáuralo antes de guardar cambios.", "error"); return; }
        const nuevo = datosFormulario(existente, existente ? existente.id : idInput || generarId(ocupados), estado);
        estadoEditor("guardando","Comprobando imágenes");
        // Guardar texto o fechas no recomprime las imágenes existentes.
        const guardado=await BibliotecaImagenes.conBloqueo(async()=>{
            await BibliotecaImagenes.verificarReferencias(nuevo);
            if(localStorage.getItem("eventos")!==baseGuardado)throw new Error("Los eventos han cambiado durante el guardado. Revisa los datos antes de continuar.");
            const nuevaLista=[...eventosAdmin];if(indice>=0)nuevaLista[indice]=nuevo;else nuevaLista.push(nuevo);
            return guardarColeccion(nuevaLista,true);
        });
        if(!guardado){estadoEditor("error","El formulario sigue abierto");return;}
        clearTimeout(temporizadorBorrador);
        try { localStorage.removeItem("borradorEventoAdmin"); } catch (error) { /* El evento principal ya está guardado. */ }
        estadoEditor("guardado",estado === "publicado" ? "Evento publicado" : "Borrador");
        campo("estadoBorrador").textContent = "Autoguardado temporal vacío";
        campo("eventoId").value = nuevo.id;
        campo("tituloVistaEditor").textContent = "Editar evento";
        actualizarEstadoEditor(estado);
        AdminGestion.marcarGuardado(nuevo);
        cambiosPendientes = false;firmaGuardada=firmaFormulario();
        notificar(estado === "publicado" ? `«${nuevo.titulo}» se ha publicado.` : `El borrador de «${nuevo.titulo || "Sin título"}» se ha guardado.`);
        refrescarAdmin();
        mostrarVista("eventos");

    } catch (error) {
        estadoEditor("error","El formulario sigue abierto");
        notificar(error.message || "No se pudo preparar el evento para guardarlo. Vuelve a intentarlo.", "error");
    } finally {
        guardandoEvento = false;bloquearEditor(false);
    }
}

function anadirActividad(datos = {}) {
    const fila = document.createElement("div");
    fila.className = "cms-programa-item";
    fila.innerHTML = `<label>Fecha opcional<input type="date" data-programa-fecha value="${escaparHTML(datos.fecha || "")}"></label><label>Hora<input type="time" data-programa-hora value="${escaparHTML(datos.hora || "")}"></label><label>Título<input type="text" data-programa-titulo value="${escaparHTML(datos.titulo || "")}"></label><label class="cms-programa-detalle">Información adicional<textarea data-programa-detalle rows="2"></textarea></label><label>Lugar opcional<input type="text" data-programa-lugar value="${escaparHTML(datos.lugar || "")}"></label><div class="cms-fila-acciones"><button type="button" class="btn-secundario" data-orden-actividad="subir" aria-label="Subir actividad">↑</button><button type="button" class="btn-secundario" data-orden-actividad="bajar" aria-label="Bajar actividad">↓</button><button type="button" class="cms-link-image" data-quitar-actividad>Eliminar actividad</button></div>`;
    if (Number.isSafeInteger(datos.diaRelativo)) { fila.dataset.diaRelativo = String(datos.diaRelativo); fila.insertAdjacentHTML("afterbegin",`<small class="cms-dia-relativo">${GestionMunicipal.etiquetaDia(datos.diaRelativo)}</small>`); }
    fila.querySelector("[data-programa-detalle]").value = datos.detalle || "";
    campo("listaProgramaAdmin").append(fila);
    window.AdminInterfaz?.actualizarPrograma(fila);
}
function leerProgramaFormulario() {
    return [...campo("listaProgramaAdmin").querySelectorAll(".cms-programa-item")].map((fila) => ({
        fecha: fila.querySelector("[data-programa-fecha]").value,
        hora: fila.querySelector("[data-programa-hora]").value,
        titulo: fila.querySelector("[data-programa-titulo]").value.trim(),
        detalle: fila.querySelector("[data-programa-detalle]").value.trim(),
        lugar: fila.querySelector("[data-programa-lugar]").value.trim(),
        ...(!fila.querySelector("[data-programa-fecha]").value && fila.dataset.diaRelativo != null ? {diaRelativo:Number(fila.dataset.diaRelativo)} : {})
    })).filter((item) => item.fecha || item.hora || item.titulo || item.detalle || item.lugar);
}
function actualizarCartel(valor, guardar = true) {
    queueMicrotask(()=>window.AdminBiblioteca?.refrescarMetadatos());
    campo("cartel").value = valor;
    const previa = campo("cartelPrevia");
    const imagen = DetalleEvento.urlImagen(valor);
    previa.hidden = !imagen;
    campo("cartelPreviaImagen").src = imagen || "";
    window.AdminOrganizacion?.imagenes();
    if (!valor) campo("inputCartel").value = "";
    if (guardar) programarAutoguardado();
}
function renderGaleriaAdmin() {
    window.AdminBiblioteca?.refrescarMetadatos();
    campo("galeriaAdmin").innerHTML = galeriaEditor.map((valor, indice) => {
        const imagen = DetalleEvento.urlImagen(valor);
        return `<div class="cms-galeria-item">${imagen ? `<img src="${escaparHTML(imagen)}" alt="Imagen ${indice + 1} de la galería">` : '<span class="cms-image-invalid">Imagen no válida</span>'}<div class="cms-galeria-acciones"><button type="button" data-orden-galeria="${indice}" data-direccion="-1" aria-label="Subir imagen ${indice+1}" ${indice===0?'disabled':''}>↑</button><button type="button" data-orden-galeria="${indice}" data-direccion="1" aria-label="Bajar imagen ${indice+1}" ${indice===galeriaEditor.length-1?'disabled':''}>↓</button><button type="button" data-quitar-galeria="${indice}" aria-label="Quitar imagen ${indice + 1}">Quitar</button></div></div>`;
    }).join("")+ `<button type="button" class="cms-galeria-anadir" onclick="AdminBiblioteca.elegir('galeria')">+ Añadir imágenes</button>`;
}
function pedirUrlImagenAdicional(tipo) {
    const valor = prompt("Pega el enlace directo a la imagen:");
    if (!valor || !valor.trim()) return;
    const imagen = DetalleEvento.urlImagen(valor.trim());
    if (!imagen) { notificar("Introduce una URL de imagen válida que empiece por https:// o http://.", "error"); return; }
    if (tipo === "cartel") actualizarCartel(imagen);
    else { galeriaEditor.push(imagen); renderGaleriaAdmin(); programarAutoguardado(); }
}
async function leerArchivoImagen(archivo) {
    const r=await BibliotecaImagenes.incorporar(archivo);
    return BibliotecaImagenes.prefijo+r.id;
}
function cargarImagenAdicional(evento, tipo) {
    return registrarCargaImagen((async () => {
        const archivos = [...(evento.target.files || [])];
        if (!archivos.length) return;
        try {
            const imagenes = await Promise.all(archivos.map((archivo) => tipo === "cartel"
                ? leerArchivoImagen(archivo, 2100, 1500000, 0.9)
                : leerArchivoImagen(archivo, 1400, 700000)));
            if (tipo === "cartel") actualizarCartel(imagenes[0]);
            else { galeriaEditor.push(...imagenes); renderGaleriaAdmin(); programarAutoguardado(); }
        } catch (error) { fallosCargaImagen++;estadoEditor("error","La imagen no se incorporó; datos anteriores conservados");notificar(error.message, "error"); }
        evento.target.value = "";
    })());
}

function pedirUrlImagen() {
    const url = prompt("Pega el enlace directo a la imagen (jpg, png o similar):");
    if (url && url.trim()) {
        const imagen = DetalleEvento.urlImagen(url.trim());
        if (!imagen) { notificar("Introduce una URL de imagen válida que empiece por https:// o http://.", "error"); return; }
        actualizarPortada(imagen);
    }
}

function cargarImagenLocal(evento) {
    const archivo = evento.target.files && evento.target.files[0];
    if (archivo) leerImagen(archivo);
}

function leerImagen(archivo) {
    return registrarCargaImagen((async () => {
        try {
            const imagen = await leerArchivoImagen(archivo);
            actualizarPortada(imagen);
        } catch (error) { fallosCargaImagen++;estadoEditor("error","La imagen no se incorporó; datos anteriores conservados");notificar(error.message, "error"); }
    })());
}

function abrirCajonEventos() {
    campo("cajonEventos").classList.add("abierto");
    campo("fondoCajon").classList.add("abierto");
}
function cerrarCajonEventos() {
    campo("cajonEventos").classList.remove("abierto");
    campo("fondoCajon").classList.remove("abierto");
}

function renderizarListaCajon() {
    const lista = campo("listaEventosAdmin");
    if (!lista) return;
    lista.innerHTML = [...eventosAdmin].sort((a, b) => (fechaEvento(a.fecha) || 0) - (fechaEvento(b.fecha) || 0)).map((evento) => `
        <div class="cajon-item"><img src="${escaparHTML(evento.imagen || "img/logo-gilena.png")}" alt=""><div class="cajon-item-info"><h4>${escaparHTML(evento.titulo || "Sin título")}</h4><p>${escaparHTML(fechaTexto(evento.fecha))} · ${nombreEstado(evento)}</p></div><div class="cajon-item-acciones"><button class="btn-editar-mini" type="button" onclick="cargarEvento('${escaparHTML(evento.id)}')" aria-label="Editar"><i class="fa-solid fa-pen"></i></button><button class="btn-borrar-mini" type="button" onclick="borrarEvento('${escaparHTML(evento.id)}')" aria-label="Mover a la papelera"><i class="fa-solid fa-trash"></i></button></div></div>
    `).join("");
}

async function cargarEvento(id) {
    window.AdminInterfaz?.recordarListado(id);
    if(!await puedeSalirEditor())return false;
    const evento = eventosAdmin.find((elemento) => String(elemento.id) === String(id));
    if (!evento) return false;
    clearTimeout(temporizadorBorrador);
    try { localStorage.removeItem("borradorEventoAdmin"); } catch { /* Conserva la copia anterior si el navegador bloquea el almacenamiento. */ }
    rellenarFormulario(evento);
    limpiarErroresFormulario();
    campo("tituloVistaEditor").textContent = "Editar evento";
    estadoEditor("guardado","Versión guardada del evento");
    campo("estadoBorrador").innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Autoguardado temporal sin cambios';
    cerrarCajonEventos();
    mostrarVista("editor");
    activarPestana("basicos");
    cambiosPendientes = false;return true;
}

async function duplicarEvento(id) {
    const original = eventosAdmin.find((evento) => String(evento.id) === String(id));
    if (!original) return;
    const copia = JSON.parse(JSON.stringify(original));
    copia.id = generarId(new Set(eventosAdmin.map(evento=>String(evento.id)))); copia.titulo = `Copia de: ${original.titulo || "Sin título"}`; copia.estado = "borrador"; copia.destacarInicio=false; copia.estadoActividad="programado"; copia.mensajeEstado="";
    ["googleEventId","googleCalendarId","favoritos","referenciaFavorito","cambiosFavorito","creadoEn"].forEach(clave => delete copia[clave]);
    const eleccion=await new Promise(resolve=>{
        const d=document.createElement('dialog');d.className='cms-gestion-dialogo';d.setAttribute('aria-labelledby','duplicarTitulo');d.innerHTML='<div class="cms-gestion-dialogo-cuerpo"><h2 id="duplicarTitulo">Duplicar evento</h2><p>Se creará un borrador independiente. Si cambias la fecha inicial, se trasladarán el final, el programa y las sesiones manteniendo su estructura.</p><label>Nueva fecha inicial (puedes conservar la actual)<input type="date" id="fechaCopia"></label><p role="alert" id="errorFechaCopia"></p><div class="cms-fila-acciones"><button type="button" data-cancelar-copia class="btn-secundario">Cancelar</button><button type="button" data-confirmar-copia class="btn-primario">Duplicar como borrador</button></div></div>';document.body.append(d);d.querySelector('input').value=fechaValida(original.fecha)?original.fecha:'';let valor=null;d.querySelector('[data-cancelar-copia]').onclick=()=>d.close();d.querySelector('[data-confirmar-copia]').onclick=()=>{const f=d.querySelector('input').value;if(f&&!fechaValida(f)){d.querySelector('#errorFechaCopia').textContent='Selecciona una fecha válida.';return;}valor={fecha:f};d.close();};d.onclose=()=>{d.remove();resolve(valor);};d.showModal();d.querySelector('button').focus();
    });
    if(!eleccion)return;
    if(eleccion.fecha&&fechaValida(copia.fecha)&&eleccion.fecha!==copia.fecha)Object.assign(copia,moverDatosEvento(copia,diferenciaDias(copia.fecha,eleccion.fecha)));
    try {
        eventosAdmin=AdminGestion.coleccionActual();
        if (JSON.stringify(eventosAdmin.find(e=>String(e.id)===String(id)))!==JSON.stringify(original)) { notificar("El evento original ha cambiado. Revisa su versión actual antes de duplicarlo.","error"); return; }
        copia.id=generarId(new Set([...eventosAdmin.map(e=>String(e.id)),...AdminGestion.idsReservados()]));
        await BibliotecaImagenes.verificarReferencias(copia);
    } catch(error) { notificar(error.message,"error"); return; }
    if (!guardarColeccion([...eventosAdmin,copia])) return;
    await cargarEvento(copia.id);
    campo("tituloVistaEditor").textContent = "Editar copia en borrador";
    notificar(`Se creó una copia en borrador de «${original.titulo || "Sin título"}».`);
}

async function archivarEvento(id) { return AdminOperaciones.ejecutar("archivar",[String(id)]); }
function restaurarEvento(id) { return AdminOperaciones.ejecutar("restaurar",[String(id)]); }
function rellenarFormulario(datos) {
    rellenandoEditor=true;try{
    campo("eventoId").value=datos.id ?? datos.eventoId ?? "";
    campo("titulo").value=datos.titulo||"";
    campo("nombreEventoEditor").textContent=datos.titulo||"Evento sin título";
    campo("hora").value=datos.hora||""; campo("horaFin").value=datos.horaFin||"";
    campo("lugar").value=datos.lugar||"";
    campo("lugarHabitual").value=datos.lugar||datos.direccion||datos.googleMapsUrl?"otro":"";
    ["direccion","googleMapsUrl","organizador","telefono","correo","edadRecomendada","accesibilidad","traer","observaciones","mensajeEstado"].forEach(id=>{campo(id).value=datos[id]||"";});
    campo("mostrarComoLlegar").checked=datos.mostrarComoLlegar===true;
    campo("mostrarCompartir").checked=datos.mostrarCompartir===true;
    campo("mostrarRelacionados").checked=datos.mostrarRelacionados===true;
    campo("estadoActividad").value=["programado","cancelado","aplazado"].includes(datos.estadoActividad)?datos.estadoActividad:"programado";
    campo("precio").value=datos.precio||"";
    campo("tipoPrecio").value=["gratis","pago","sin-especificar"].includes(datos.tipoPrecio)?datos.tipoPrecio:["gratis","gratuito","gratuita","0","0€","0 €"].includes(String(datos.precio||"").trim().toLocaleLowerCase("es"))?"gratis":datos.precio?"pago":"sin-especificar";
    ["aforo","reservas","urlReserva","web","instagram","facebook","otroEnlace","descripcion"].forEach(id=>{campo(id).value=datos[id]||"";});
    campo("categoria").value=datos.categoria||"otros";
    campo("fecha").value=datos.fecha||"";campo("fechaFin").value=datos.fechaFin||"";
    calendarioRango.setDate(datos.fechaFin?[datos.fecha,datos.fechaFin]:datos.fecha||"",false);
    restaurarAjustesImagen(datos);
    actualizarImagenTarjeta(datos.imagenTarjeta||"",false);actualizarImagenCarrusel(datos.imagenCarrusel||"",false);actualizarCartel(datos.cartel||"",false);
    galeriaEditor=Array.isArray(datos.galeria)?[...datos.galeria]:datos.imagen_extra?[datos.imagen_extra]:[];
    renderGaleriaAdmin();campo("listaProgramaAdmin").replaceChildren();if(Array.isArray(datos.programa))datos.programa.forEach(anadirActividad);
    campo("inputImagenTarjeta").value="";actualizarPortada(datos.imagen||"",false);
    if(datos.descripcion_larga)quill.clipboard.dangerouslyPasteHTML(DetalleEvento.htmlSeguro(datos.descripcion_larga),"silent");else quill.setText("","silent");
    AdminBiblioteca.rellenar(datos);AdminInformacion.rellenar(datos);actualizarEstadoEditor(estadoPublicacion(datos));AdminGestion.cargarContexto(datos);AdminInformacion.avisar();actualizarResumenSecciones();firmaGuardada=firmaFormulario();window.AdminInterfaz?.actualizar();
    }finally{rellenandoEditor=false;}
}
function nuevoEvento(enBlanco=false) {
    if(!enBlanco)return AdminGestion.solicitarNuevo();
    let idNuevo;
    try{idNuevo=generarId(new Set([...AdminGestion.coleccionActual().map(e=>String(e.id)),...AdminGestion.idsReservados()]));}catch(e){notificar("No se pudieron leer los datos. Se conserva el formulario actual.","error");return false;}
    if(!descartarCambiosEditor())return false;
    rellenarFormulario({categoria:"deportes",imagen:"",estado:"borrador"});limpiarErroresFormulario();campo("eventoId").value=idNuevo;
    campo("tituloVistaEditor").textContent="Crear evento";estadoEditor("pendiente","Evento nuevo");campo("estadoBorrador").textContent="Autoguardado temporal vacío";
    try{localStorage.removeItem("borradorEventoAdmin");}catch{}
    cerrarCajonEventos();mostrarVista("editor");activarPestana("basicos");campo("titulo").focus({preventScroll:true});cambiosPendientes=false;return true;
}
function borrarEvento(id) { return AdminGestion.eliminarEvento(id); }

function mensajeImportacion(texto, error = false) {
    const estado = campo("estadoImportacion");
    estado.textContent = texto;
    estado.classList.toggle("error", error);
}
async function exportarEventos() {
    try {
        const claves=["eventos",CLAVE_LUGARES,CLAVE_FIESTAS,CLAVE_DESTACADOS,DestacadosGilena.clave,"contenidoWebGilena","plantillasEventosGilena","papeleraEventosGilena"];
        const base=Object.fromEntries(claves.map(k=>[k,localStorage.getItem(k)])),eventos=AdminGestion.coleccionActual(),lugares=JSON.parse(localStorage.getItem(CLAVE_LUGARES)||"[]");
        const ids=DestacadosGilena.configuracion(eventos).ids.filter(id=>eventos.some(e=>String(e.id)===id));
        const datosCopia=AdminOperaciones.limpiarPrivado({version:6,...AdminGestion.exportables(),fechaExportacion:new Date().toISOString(),eventos,lugaresHabituales:lugares,destacadosInicio:ids,configuracionDestacados:{version:1,ids},fiestasDestacadas:JSON.parse(localStorage.getItem(CLAVE_FIESTAS)||"[]").filter(id=>eventos.some(e=>String(e.id)===String(id)))});
        await BibliotecaImagenes.verificarReferencias(datosCopia);datosCopia.bibliotecaImagenes=await BibliotecaImagenes.exportar();
        if(claves.some(k=>localStorage.getItem(k)!==base[k]))throw new Error("Los datos cambiaron mientras se preparaba la copia. Vuelve a exportar para obtener una copia coherente.");
        AdminOperaciones.descargar(datosCopia,`eventos-gilena-${new Date().toISOString().slice(0,10)}.json`);
        mensajeImportacion(`Copia preparada: ${eventos.length} eventos, ${datosCopia.bibliotecaImagenes.items.length} archivos y los apartados municipales. No incluye cuentas, favoritos ni credenciales de Google. Los documentos enlazados siguen siendo enlaces.`);
    }catch(error){mensajeImportacion(`No se pudo preparar la copia: ${error.message}`,true);}
}
function validarArchivoImportacion(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos) || ![1, 2, 3, 4, 5, 6].includes(datos.version) || !Array.isArray(datos.eventos) || typeof datos.fechaExportacion !== "string" || Number.isNaN(Date.parse(datos.fechaExportacion))) {
        throw new Error("El archivo no tiene un formato de copia de seguridad de Gilena compatible.");
    }
    const textos = ["titulo", "fecha", "fechaFin", "hora", "horaFin", "lugar", "direccion", "googleMapsUrl", "organizador", "telefono", "correo", "edadRecomendada", "accesibilidad", "traer", "observaciones", "estadoActividad", "mensajeEstado", "tipoPrecio", "precio", "reservas", "urlReserva", "web", "instagram", "facebook", "otroEnlace", "categoria", "imagen", "imagenTarjeta", "imagenCarrusel", "imagen_extra", "cartel", "descripcion", "descripcion_larga"];
    const idsImportados=new Set();
    datos.eventos.forEach((evento, indice) => {
        if(idsImportados.has(String(evento?.id)))throw new Error("La copia contiene IDs de evento repetidos.");idsImportados.add(String(evento?.id));
        const numero = indice + 1;
        if (!evento || typeof evento !== "object" || Array.isArray(evento)) throw new Error(`El evento ${numero} no es un objeto válido.`);
        const publicado=esEventoPublicado(evento);
        if (!(typeof evento.id === "number" && Number.isSafeInteger(evento.id) && evento.id > 0) && !(typeof evento.id === "string" && /^[a-zA-Z0-9_-]+$/.test(evento.id))) throw new Error(`El evento ${numero} no tiene un ID válido.`);
        if (!["borrador", "publicado", "archivado"].includes(estadoPublicacion(evento))) throw new Error(`El evento ${numero} tiene un estado desconocido.`);
        textos.forEach((clave) => { if (evento[clave] != null && typeof evento[clave] !== "string") throw new Error(`El campo ${clave} del evento ${numero} debe ser texto.`); });
        ["imagenAjustes", "imagenTarjetaAjustes", "imagenCarruselAjustes"].forEach((clave) => {
            const ajustes = evento[clave];
            if (ajustes == null) return;
            if (typeof ajustes !== "object" || Array.isArray(ajustes) || !["cartel", "fotografia"].includes(ajustes.modo) || ["x", "y"].some((eje) => ajustes[eje] != null && (typeof ajustes[eje] !== "number" || !Number.isFinite(ajustes[eje]) || ajustes[eje] < 0 || ajustes[eje] > 100))) throw new Error(`Los ajustes de imagen del evento ${numero} no son válidos.`);
        });
        if (evento.aforo!=null && !["string","number"].includes(typeof evento.aforo))throw new Error(`El aforo del evento ${numero} debe ser texto o número.`);
        if (publicado && evento.aforo != null && evento.aforo !== "" && (!/^\d+$/.test(String(evento.aforo)) || Number(evento.aforo) <= 0 || !Number.isSafeInteger(Number(evento.aforo)))) throw new Error(`El aforo del evento ${numero} no es un entero positivo.`);
        if (publicado && evento.fecha && !fechaValida(evento.fecha)) throw new Error(`La fecha inicial del evento ${numero} no es válida.`);
        if (publicado && evento.fechaFin && (!fechaValida(evento.fechaFin) || !evento.fecha || evento.fechaFin < evento.fecha)) throw new Error(`La fecha final del evento ${numero} no es válida.`);
        if (publicado && evento.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(evento.hora)) throw new Error(`La hora inicial del evento ${numero} no es válida.`);
        if (publicado && evento.horaFin && !/^([01]\d|2[0-3]):[0-5]\d$/.test(evento.horaFin)) throw new Error(`La hora final del evento ${numero} no es válida.`);
        if (publicado && evento.fecha && (!evento.fechaFin || evento.fecha === evento.fechaFin) && evento.hora && evento.horaFin && evento.horaFin <= evento.hora) throw new Error(`La hora final del evento ${numero} debe ser posterior a la inicial.`);
        ["urlReserva", "web", "instagram", "facebook", "otroEnlace"].forEach((clave) => { if (publicado && !enlaceValido(evento[clave])) throw new Error(`El enlace ${clave} del evento ${numero} no es válido.`); });
        if (publicado && evento.googleMapsUrl && !DetalleEvento.urlGoogleMaps(evento.googleMapsUrl)) throw new Error(`El enlace de Google Maps del evento ${numero} no es válido.`);
        ["mostrarComoLlegar", "mostrarCompartir", "mostrarRelacionados"].forEach((clave) => { if (evento[clave] != null && typeof evento[clave] !== "boolean") throw new Error(`La opción ${clave} del evento ${numero} no es válida.`); });
        if (evento.estadoActividad && !["programado", "cancelado", "aplazado"].includes(evento.estadoActividad)) throw new Error(`El estado de actividad del evento ${numero} no es válido.`);
        if (evento.destacarInicio != null && typeof evento.destacarInicio !== "boolean") throw new Error(`La opción de destacar del evento ${numero} no es válida.`);
        if (evento.tipoPrecio && !["gratis", "pago", "sin-especificar"].includes(evento.tipoPrecio)) throw new Error(`El tipo de precio del evento ${numero} no es válido.`);
        if (publicado && evento.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(evento.correo)) throw new Error(`El correo del evento ${numero} no es válido.`);
        if (publicado && evento.telefono && !/^[+\d\s().-]{6,25}$/.test(evento.telefono)) throw new Error(`El teléfono del evento ${numero} no es válido.`);
        if (evento.cartel && !DetalleEvento.urlImagen(evento.cartel)) throw new Error(`El cartel del evento ${numero} no es una imagen válida.`);
        if (["imagen","imagenTarjeta","imagenCarrusel","cartel"].some(k => /^(blob:|file:)/i.test(evento[k] || ""))) throw new Error(`El evento ${numero} contiene una imagen temporal o local sin incorporar.`);
        if (evento.imagenCarrusel && !ImagenesEvento.urlImagen(evento.imagenCarrusel)) throw new Error(`La imagen del carrusel del evento ${numero} no es válida.`);
        if (evento.galeria != null && (!Array.isArray(evento.galeria) || evento.galeria.some((imagen) => typeof imagen !== "string" || !DetalleEvento.urlImagen(imagen)))) throw new Error(`La galería del evento ${numero} no es válida.`);
        if (evento.programa != null && (!Array.isArray(evento.programa) || evento.programa.some((item) => !item || typeof item !== "object" || Array.isArray(item) || ["fecha", "hora", "titulo", "detalle", "lugar"].some((clave) => item[clave] != null && typeof item[clave] !== "string") || publicado && (item.fecha && !fechaValida(item.fecha) || item.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.hora))))) throw new Error(`El programa del evento ${numero} no es válido.`);
        if (evento.revisionPlantillaPendiente != null && typeof evento.revisionPlantillaPendiente !== "boolean") throw new Error(`La revisión de plantilla del evento ${numero} no es válida.`);
        if(evento.bloques!=null){const eb=BloquesEvento.validar(evento.bloques,{soloEstructura:!publicado});if(eb.length)throw new Error(`Evento ${numero}, ${eb[0][0]}: ${eb[0][1]}`);}
        const erroresAdicionales = InformacionEvento.validar(evento).filter(([,m])=>publicado || /Debe ser texto|lista no|elemento no|visibilidad|opciones|textos y encuadres/i.test(m));
        if (erroresAdicionales.length) throw new Error(`Evento ${numero}, ${erroresAdicionales[0][0]}: ${erroresAdicionales[0][1]}`);
        if (estadoPublicacion(evento) === "publicado" && (!evento.titulo?.trim() || !fechaValida(evento.fecha))) throw new Error(`El evento publicado ${numero} necesita título y fecha inicial válidos.`);
    });
    const lugares = datos.lugaresHabituales == null ? [] : datos.lugaresHabituales;
    if (!Array.isArray(lugares) || lugares.some(lugar => !lugar || typeof lugar !== "object" || Array.isArray(lugar) || typeof lugar.id !== "string" || !lugar.id || typeof lugar.nombre !== "string" || !lugar.nombre.trim() || ["direccion", "googleMapsUrl"].some(clave => lugar[clave] != null && typeof lugar[clave] !== "string") || lugar.googleMapsUrl && !DetalleEvento.urlGoogleMaps(lugar.googleMapsUrl))) throw new Error("La lista de lugares habituales no es válida.");
    const configuracion = datos.configuracionDestacados;
    if (configuracion != null && (!configuracion || typeof configuracion !== "object" || Array.isArray(configuracion) || configuracion.version !== 1 || !Array.isArray(configuracion.ids))) throw new Error("La configuración de destacados no es válida.");
    const destacados = configuracion ? configuracion.ids : datos.destacadosInicio == null ? [] : datos.destacadosInicio;
        if (!Array.isArray(destacados) || destacados.length > 6 || new Set(destacados.map(String)).size!==destacados.length || destacados.some(id => !(typeof id === "number" || typeof id === "string") || !datos.eventos.some(evento => String(evento.id) === String(id)))) throw new Error("La lista de eventos destacados no es válida.");
    const fiestas = datos.fiestasDestacadas == null ? [] : datos.fiestasDestacadas;
    if (!Array.isArray(fiestas) || new Set(fiestas.map(String)).size !== fiestas.length || fiestas.some(id => !["number","string"].includes(typeof id) || !datos.eventos.some(e => String(e.id) === String(id)))) throw new Error("La selección de fiestas destacadas no es válida.");
    const apartados = GestionMunicipal.validarApartados(datos, eventos => validarArchivoImportacion({version:3,fechaExportacion:new Date().toISOString(),eventos}));
    return { apartados, eventos: datos.eventos, lugares, destacadosInicio:[...new Set([...destacados.map(String), ...(!configuracion ? datos.eventos.filter(e => e.destacarInicio).map(e => String(e.id)) : [])])].slice(0,6), incluyeDestacados:!!configuracion || Array.isArray(datos.destacadosInicio) || datos.eventos.some(e => e.destacarInicio), incluyeLugares: Array.isArray(datos.lugaresHabituales), fiestasDestacadas:fiestas, incluyeFiestas:Array.isArray(datos.fiestasDestacadas) };
}
function prepararImportacion(importados, modo, reservados = []) {
    const nuevaLista = modo === "sustituir" ? [] : [...eventosAdmin];
    const ocupados = new Set([...nuevaLista.map((evento) => String(evento.id)),...reservados]);
    importados.forEach((evento) => {
        const copia = { ...evento };
        if (ocupados.has(String(copia.id))) copia.id = generarId(ocupados);
        else ocupados.add(String(copia.id));
        nuevaLista.push(copia);
    });
    return nuevaLista;
}
async function importarEventos() {
    const archivo = campo("archivoImportacion").files[0];
    if (!archivo) { mensajeImportacion("Selecciona un archivo JSON para importar.", true); return; }
    let importados, archivosImportados;
    const baseImportacion=Object.fromEntries(["eventos","papeleraEventosGilena","plantillasEventosGilena","contenidoWebGilena",CLAVE_LUGARES,CLAVE_FIESTAS,CLAVE_DESTACADOS,DestacadosGilena.clave].map(k=>[k,localStorage.getItem(k)]));
    try {
        const datos=JSON.parse(await archivo.text());
        importados = validarArchivoImportacion(datos);
        archivosImportados=await BibliotecaImagenes.validarCopia(datos.bibliotecaImagenes, {eventos:datos.eventos,plantillas:datos.plantillas,papelera:datos.papelera});
    } catch (error) {
        mensajeImportacion(`No se importó nada: ${error.message || "no se pudo leer el archivo."}`, true);
        return;
    }
    try { eventosAdmin=AdminGestion.coleccionActual();const lugares=JSON.parse(localStorage.getItem(CLAVE_LUGARES)||"[]"),fiestas=JSON.parse(localStorage.getItem(CLAVE_FIESTAS)||"[]");if(!Array.isArray(lugares)||!Array.isArray(fiestas))throw new Error("No se pudieron leer los lugares o las fiestas actuales.");lugaresHabituales=lugares;fiestasDestacadas=fiestas.map(String); }catch(error){mensajeImportacion(error.message,true);return;}
    const modo = document.querySelector('input[name="modoImportacion"]:checked').value;
    if(modo==="sustituir"||Object.hasOwn(importados.apartados,"contenidoWeb")){
        const detalle=[`Eventos: ${importados.eventos.length}; ${modo==="sustituir"?"sustituir "+eventosAdmin.length+" actuales":"añadir sin borrar los actuales"}.`,...[["plantillas","Plantillas"],["papelera","Papelera"],["contenidoWeb","Contenido público"]].map(([k,n])=>`${n}: ${Object.hasOwn(importados.apartados,k)?k==="contenidoWeb"?"reemplazar los textos actuales":modo==="sustituir"?"sustituir por el apartado de la copia":"combinar con los actuales":"conservar sin cambios (ausente en la copia)"}.`),`Destacados y fiestas: ${modo==="sustituir"?"se restauran los apartados incluidos; si faltan, se conservan las selecciones cuyos eventos sigan presentes":"se combinan las selecciones incluidas"}.`, `Archivos de biblioteca: ${archivosImportados.length}; se incorporan sin borrar los existentes.`,`Lugares habituales: ${importados.incluyeLugares?modo==="sustituir"?"sustituir":"combinar":"conservar"}. Las cuentas, favoritos y Google no se modifican.`].join("\n");
        if(!await confirmarAccion("Revisar importación",detalle,"Confirmar importación"))return;
    }
    const eventosAntes = [...eventosAdmin];
    const destacadosAntes = DestacadosGilena.configuracion(eventosAdmin).ids;
    let reservasPapelera;
    try { reservasPapelera = modo === "sustituir" && Object.hasOwn(importados.apartados,"papelera") ? importados.apartados.papelera : GestionMunicipal.papelera(); } catch (error) { mensajeImportacion(error.message,true); return; }
    const nuevaLista = prepararImportacion(importados.eventos, modo, reservasPapelera.map(r=>String(r.evento.id)));
    const lugaresNuevos = !importados.incluyeLugares ? [...lugaresHabituales] : modo === "sustituir" ? importados.lugares : [...lugaresHabituales, ...importados.lugares.filter(n => !lugaresHabituales.some(a => a.id === n.id))];
    const indiceBase = modo === "sustituir" ? 0 : eventosAntes.length;
    const mapaIds = new Map(importados.eventos.map((e,i) => [String(e.id), String(nuevaLista[indiceBase+i].id)]));
    const ordenImportado = (importados.destacadosInicio || []).map(id => mapaIds.get(String(id))).filter(Boolean);
    const ordenFinal = modo === "sustituir" ? importados.incluyeDestacados ? ordenImportado : destacadosAntes.filter(id=>nuevaLista.some(e=>String(e.id)===String(id))) : [...destacadosAntes, ...ordenImportado.filter(id => !destacadosAntes.includes(id))].slice(0,6);
    const fiestasImportadas = importados.fiestasDestacadas.map(id => mapaIds.get(String(id))).filter(Boolean);
    const fiestasFinales = modo === "sustituir" ? importados.incluyeFiestas ? fiestasImportadas : fiestasDestacadas.filter(id=>nuevaLista.some(e=>String(e.id)===String(id))) : [...fiestasDestacadas, ...fiestasImportadas.filter(id => !fiestasDestacadas.includes(id))];
    let cambiosExtras;
    try { cambiosExtras = GestionMunicipal.prepararExtras(importados.apartados, modo, nuevaLista); } catch (error) { mensajeImportacion(`No se importó nada: ${error.message}`,true); return; }
    const guardarImportacion=async()=>{
    let nuevosArchivos=[];
    try {
        nuevosArchivos=await BibliotecaImagenes.importar(archivosImportados);
        if (Object.entries(baseImportacion).some(([k,v])=>localStorage.getItem(k)!==v)) throw new Error("Los datos han cambiado en otra pestaña durante la importación. Revisa y vuelve a intentarlo.");
    } catch(error) {
        try { await BibliotecaImagenes.revertir(nuevosArchivos); } catch {}
        mensajeImportacion(error.message,true); return false;
    }
    const resultado = DestacadosGilena.escribir({
        ...cambiosExtras,
        [CLAVE_LUGARES]:JSON.stringify(lugaresNuevos),
        [CLAVE_DESTACADOS]:JSON.stringify(ordenFinal),
        [DestacadosGilena.clave]:JSON.stringify({version:1,ids:ordenFinal}),
        [CLAVE_FIESTAS]:JSON.stringify(fiestasFinales),
        eventos:JSON.stringify(nuevaLista)
    });
    if (!resultado.ok) {
        try { await BibliotecaImagenes.revertir(nuevosArchivos); } catch { mensajeImportacion("No se guardaron los eventos. Los archivos importados han quedado en la biblioteca sin asociar; puedes revisarlos allí.",true); return false; }
        mensajeImportacion(resultado.restaurado ? "No se pudo importar. Los eventos y la configuración anteriores siguen intactos." : "No se pudo importar y el navegador impidió restaurar parte de la configuración. Los datos en memoria se conservan; exporta una copia antes de cerrar.", true);
        return false;
    }
    return true;
    };
    if(!await BibliotecaImagenes.conBloqueo(guardarImportacion))return;
    errorCargaEventos = false;
    eventosAdmin = nuevaLista; lugaresHabituales = lugaresNuevos; destacadosInicio = ordenFinal; fiestasDestacadas = fiestasFinales;
    renderizarLugaresHabituales();
    AdminGestion.despuesImportar();
    document.dispatchEvent(new Event("gilena-biblioteca-cambio"));
    campo("archivoImportacion").value = "";
    refrescarAdmin();
    mensajeImportacion(`Importación completada: ${importados.eventos.length} eventos. Se han incluido los apartados presentes en la copia; el contenido web, las plantillas y la papelera ausentes se han conservado.`);
}

let focoAntesVistaPrevia;
function abrirVistaPrevia(eventoPrevio = null) {
    const id = campo("eventoId").value;
    const existente = eventosAdmin.find((item) => String(item.id) === id);
    const datos = eventoPrevio || datosFormulario(existente, existente?.id || "", campo("estadoPublicacionEditor").dataset.estado || "borrador");
    const contenedor = campo("previewEventoCompleto");
    const revision=RevisionEventos.analizar(datos,{plantilla:!eventoPrevio && AdminGestion.esPlantilla()});
    const avisos = revision.filter(a=>a.tipo==="recomendacion").map(a=>"Recomendación opcional: "+a.mensaje);
    const erroresRevision = revision.filter(a=>a.tipo==="error").map(a=>[a.campo,a.mensaje]);
    const resumen = [datos.titulo || "Sin título", formatearRangoEvento(datos.fecha,datos.fechaFin), [datos.hora,datos.horaFin].filter(Boolean).join(" – "),datos.lugar, ({gratis:"Gratis",pago:"De pago"})[datos.tipoPrecio] || "Acceso sin especificar"].filter(Boolean).join(" · ");
    contenedor.innerHTML = `<section class="cms-preview-resumen"><h3>Revisión antes de publicar</h3><p>${escaparHTML(resumen)}</p>${erroresRevision.length ? `<p><strong>Necesario para publicar:</strong><br>${erroresRevision.map(([,mensaje])=>escaparHTML(mensaje)).join("<br>")}</p>` : ""}${avisos.length ? `<p>${avisos.map(escaparHTML).join("<br>")}</p>` : ""}<p>Las recomendaciones son opcionales. Los errores señalados deben corregirse para publicar.</p></section>` + DetalleEvento.renderizar(datos, { previo: true, relacionados: eventosAdmin });
    DetalleEvento.activar(contenedor, datos, true);
    focoAntesVistaPrevia = document.activeElement;
    campo("modalVistaPrevia").hidden = false;
    document.body.classList.add("cms-modal-abierto");
    campo("modalVistaPrevia").querySelector(".cms-modal-close").focus();
}
function cerrarVistaPrevia() {
    const modal = campo("modalVistaPrevia");
    if (modal && !modal.hidden) {
        modal.hidden = true;
        campo("previewEventoCompleto").replaceChildren();
        document.body.classList.remove("cms-modal-abierto");
        focoAntesVistaPrevia?.focus?.();
    }
}

function insertarBloque(tipo) {
    const bloques = {
        ubicacion: ["📍 Ubicación: ", "#29527a"],
        horario: ["🕐 Horario: ", "#29527a"],
        informacion: ["ℹ️ Información: ", "#29527a"],
        aviso: ["⚠️ Aviso: ", "#9a6410"]
    };
    const bloque = bloques[tipo];
    if (!bloque) return;
    const rango = quill.getSelection(true);
    const texto = `${bloque[0]}Añade aquí la información\n`;
    quill.insertText(rango.index, texto, { bold: true, color: bloque[1] }, "user");
    quill.formatLine(rango.index, texto.length, "bold", false, "user");
    quill.setSelection(rango.index + texto.length, 0, "silent");
}

let temporizadorBorrador;
function programarAutoguardado() {
    if (!campo("estadoBorrador") || rellenandoEditor || guardandoEvento) return;
    actualizarResumenSecciones();
    if(firmaGuardada!==null&&firmaFormulario()===firmaGuardada){
        clearTimeout(temporizadorBorrador);if(cambiosPendientes){if(!descartarCambiosEditor())return;estadoEditor(eventosAdmin.some(e=>String(e.id)===campo("eventoId").value)?"guardado":"pendiente");}return;
    }
    cambiosPendientes = true;estadoEditor("pendiente");
    campo("estadoBorrador").innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Guardando cambios temporales...';
    clearTimeout(temporizadorBorrador);
    temporizadorBorrador = setTimeout(guardarBorradorTemporal, 650);
}
window.addEventListener("beforeunload", evento => {
    if (!cambiosPendientes && !guardandoEvento && !cargasImagenPendientes.size && !window.AdminGestion?.contenidoPendiente()) return;
    evento.preventDefault();
    evento.returnValue = "";
});
function guardarBorradorTemporal() {
    if(!cambiosPendientes || guardandoEvento || rellenandoEditor)return;
    if(temporalIlegible){campo("estadoBorrador").textContent="El temporal anterior no se puede leer y no se sobrescribirá. El formulario actual sigue abierto.";return;}
    const borrador = {};
    ["eventoId", "titulo", "categoria", "fecha", "fechaFin", "hora", "horaFin", "lugar", "direccion", "googleMapsUrl", "organizador", "telefono", "correo", "edadRecomendada", "accesibilidad", "traer", "observaciones", "estadoActividad", "mensajeEstado", "tipoPrecio", "precio", "aforo", "reservas", "urlReserva", "web", "instagram", "facebook", "otroEnlace", "imagen", "imagenTarjeta", "imagenCarrusel", "cartel", "descripcion"].forEach((id) => { borrador[id] = campo(id).value; });
    ["mostrarComoLlegar", "mostrarCompartir", "mostrarRelacionados"].forEach((id) => { borrador[id] = campo(id).checked; });
    Object.assign(borrador, AdminInformacion.leer(), AdminGestion.contextoBorrador());
    borrador.programa = leerProgramaFormulario();
    borrador.galeria = [...galeriaEditor];
    borrador.imagenMetadatos = AdminBiblioteca.leerMetadatos();
    borrador.imagenAjustes = leerAjustesImagen("imagen");
    borrador.imagenTarjetaAjustes = leerAjustesImagen("imagenTarjeta");
    borrador.imagenCarruselAjustes = leerAjustesImagen("imagenCarrusel");
    borrador.descripcion_larga = DetalleEvento.htmlSeguro(BibliotecaImagenes.estabilizar(quill.root.innerHTML));
    borrador.estado = campo("estadoPublicacionEditor").dataset.estado || "borrador";
    borrador.modificado = true;
    try {
        localStorage.setItem("borradorEventoAdmin", JSON.stringify(BibliotecaImagenes.estabilizar(borrador)));
        campo("estadoBorrador").innerHTML = `<i class="fa-solid fa-check"></i> Temporal actualizado; evento sin guardar · ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
        estadoEditor("error","Falló el autoguardado temporal; evento sin guardar");
        campo("estadoBorrador").innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se pudo autoguardar. La copia anterior sigue intacta; reduce las imágenes y mantén esta pestaña abierta.';
    }
}
function restaurarBorrador() {
    try {
        const raw=localStorage.getItem("borradorEventoAdmin"),borrador=JSON.parse(raw||"null");
        if(!borrador||typeof borrador!=="object"||Array.isArray(borrador)||!borrador.modificado&&!borrador.titulo&&!borrador.fecha&&!borrador.descripcion_larga)return;
        const d=document.createElement("dialog");d.className="cms-gestion-dialogo";d.setAttribute("aria-labelledby","recuperacionTitulo");
        d.innerHTML='<div class="cms-gestion-dialogo-cuerpo"><h2 id="recuperacionTitulo">Hay cambios temporales sin guardar</h2><p>El evento público no ha cambiado. Puedes recuperar el formulario anterior o descartar su copia temporal.</p><p id="tituloTemporal"></p><div class="cms-fila-acciones"><button type="button" class="btn-primario" data-recuperar>Restaurar formulario</button><button type="button" class="btn-secundario" data-descartar>Descartar temporal</button></div><p role="alert" id="errorRecuperacion"></p></div>';
        d.querySelector('#tituloTemporal').textContent=borrador.titulo||'Evento sin título';document.body.append(d);d.addEventListener('cancel',e=>e.preventDefault());
        d.querySelector('[data-recuperar]').onclick=()=>{
            try {rellenarFormulario(borrador);firmaGuardada=null;mostrarVista("editor");activarPestana("basicos");AdminGestion.aplicarModo();cambiosPendientes=true;estadoEditor("pendiente","Formulario recuperado");campo("estadoBorrador").textContent="Temporal recuperado; evento sin guardar";d.close();campo("titulo").focus();}
            catch(e){d.querySelector('#errorRecuperacion').textContent='No se pudo recuperar el formulario. La copia anterior se conserva.';}
        };
        d.querySelector('[data-descartar]').onclick=()=>{if(localStorage.getItem('borradorEventoAdmin')!==raw){d.querySelector('#errorRecuperacion').textContent='La copia temporal ha cambiado en otra pestaña. Recarga para revisar su versión actual.';return;}if(descartarCambiosEditor())d.close();else d.querySelector('#errorRecuperacion').textContent='No se pudo descartar el temporal. La copia anterior se conserva.';};
        d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();d.querySelector('button').focus();
    }catch(error){temporalIlegible=true;notificar("No se pudo leer el borrador temporal. Su copia se conserva sin sobrescribirla.","error");}
}

// Miniatura independiente: nunca modifica la portada del evento.
function actualizarImagenTarjeta(valor, guardar = true) {
    queueMicrotask(()=>window.AdminBiblioteca?.refrescarMetadatos());
    campo("imagenTarjeta").value = valor;
    actualizarPreviasImagenes();
    if (!valor) campo("inputImagenTarjeta").value = "";
    if (guardar) programarAutoguardado();
}
function pedirUrlTarjeta() {
    const valor = prompt("Pega el enlace directo a la imagen de la tarjeta:");
    if (!valor || !valor.trim()) return;
    try {
        const url = new URL(valor.trim());
        if (!["https:", "http:"].includes(url.protocol)) throw new Error();
        actualizarImagenTarjeta(url.href);
    } catch { notificar("Introduce una URL válida que empiece por https:// o http://.", "error"); }
}
campo("inputImagenTarjeta").addEventListener("change", async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const tarea = (async () => {
        try { actualizarImagenTarjeta(await leerArchivoImagen(archivo)); }
        catch (error) { fallosCargaImagen++;estadoEditor("error","La imagen no se incorporó; datos anteriores conservados");notificar(error.message, "error"); }
        evento.target.value = "";
    })();
    await registrarCargaImagen(tarea);
});

function actualizarImagenCarrusel(valor, guardar = true) {
    queueMicrotask(()=>window.AdminBiblioteca?.refrescarMetadatos());
    campo("imagenCarrusel").value = valor;
    if (!valor) campo("inputImagenCarrusel").value = "";
    actualizarPreviasImagenes();
    if (guardar) programarAutoguardado();
}
function pedirUrlCarrusel() {
    const valor = prompt("Pega el enlace directo a la imagen del carrusel:");
    if (!valor?.trim()) return;
    const imagen = ImagenesEvento.urlImagen(valor.trim());
    if (!imagen) { notificar("Introduce una URL de imagen válida que empiece por https:// o http://.", "error"); return; }
    actualizarImagenCarrusel(imagen);
}
campo("inputImagenCarrusel").addEventListener("change", async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const tarea = (async () => {
        try { actualizarImagenCarrusel(await leerArchivoImagen(archivo)); }
        catch (error) { fallosCargaImagen++;estadoEditor("error","La imagen no se incorporó; datos anteriores conservados");notificar(error.message, "error"); }
        evento.target.value = "";
    })();
    await registrarCargaImagen(tarea);
});
