/* Amplía las pestañas existentes sin sustituir el editor ni su almacenamiento. */
window.AdminInformacion = (() => {
  const modelo = window.InformacionEvento, esc = modelo.esc;
  const campo = id => document.getElementById(id);
  let secuencia = 0;
  const esquemas = {
    sesiones:[["fecha","Fecha","date"],["hora","Inicio","time"],["horaFin","Fin","time"],["lugar","Lugar de la sesión","text"]],
    tarifas:[["nombre","Nombre de la tarifa","text"],["importe","Importe en euros","text"],["condiciones","Condiciones","textarea"]],
    contactos:[["nombre","Persona o entidad","text"],["telefono","Teléfono","tel"],["correo","Correo","email"],["url","Enlace","url"]],
    enlacesAdicionales:[["titulo","Título del enlace o documento","text"],["url","URL permanente","url"],["tipo","Tipo","select"]],
    bloques:[]
  };
  const entrada = (id, etiqueta, tipo = "text") => `<div class="meta-item"><label for="${id}">${etiqueta}</label>${tipo === "textarea" ? `<textarea id="${id}" rows="2"></textarea>` : `<input id="${id}" type="${tipo}">`}</div>`;
  const plegable = (titulo, contenido) => `<details class="cms-opciones"><summary>${titulo}</summary><div class="cms-opciones-contenido">${contenido}</div></details>`;
  const coleccion = (id, titulo, ayuda) => plegable(titulo, `${ayuda ? `<p>${ayuda}</p>` : ""}<div class="meta-item" id="${id}" tabindex="-1" data-coleccion="${id}"></div><button class="btn-secundario" type="button" data-anadir-lista="${id}">Añadir ${titulo.toLocaleLowerCase("es") === "sesiones" ? "sesión" : ({tarifas:"tarifa",contactos:"contacto",enlacesAdicionales:"enlace o documento",bloques:"contenido"})[id]}</button>`);
  function iniciar() {
    campo("panel-basicos").insertAdjacentHTML("beforeend", `<section class="cms-panel cms-form-panel">${plegable("Más datos básicos",entrada("subtitulo","Subtítulo")+entrada("publico","Público al que va dirigido")+entrada("etiquetas","Etiquetas (separadas por comas)"))}</section>`);
    campo("editor-container").closest(".cms-form-panel").insertAdjacentHTML("beforeend",coleccion("bloques","Bloques de contenido","Añade solo lo que necesite el evento. Los bloques se muestran en el orden elegido."));
    campo("panel-fecha").insertAdjacentHTML("beforeend", `<section class="cms-panel cms-form-panel">${plegable("Acceso y otros espacios",entrada("aperturaPuertas","Apertura de puertas","time")+entrada("indicacionesAcceso","Indicaciones de acceso","textarea")+entrada("espaciosSecundarios","Espacios secundarios","textarea"))}${coleccion("sesiones","Sesiones","Añade horarios concretos sin crear eventos nuevos.")}<p id="avisoSesiones" class="cms-recomendaciones" role="status" aria-live="polite" hidden></p></section>`);
    campo("tipoPrecio").closest(".cms-form-panel").insertAdjacentHTML("beforeend",coleccion("tarifas","Tarifas","Los importes se muestran como información; no se realizan cobros.")+plegable("Plazo de inscripción",entrada("inscripcionInicio","Inicio del plazo","datetime-local")+entrada("inscripcionFin","Fin del plazo","datetime-local")));
    campo("organizador").closest(".cms-form-panel").insertAdjacentHTML("beforeend",plegable("Colaboradores y otros contactos",entrada("colaboradores","Colaboradores","textarea")+coleccion("contactos","Contactos","Puedes añadir personas o entidades adicionales.")));
    campo("accesibilidad").previousElementSibling.textContent = "Notas de accesibilidad";
    campo("accesibilidad").closest(".meta-item").insertAdjacentHTML("afterend", `<div class="meta-item cms-span-2" id="accesibilidadOpciones" tabindex="-1">${plegable("Opciones de accesibilidad",`<p>Marca solo las opciones confirmadas. Dejarlo vacío no afirma que el evento sea accesible.</p>${Object.entries(modelo.accesibilidad).map(([id,nombre])=>`<label class="cms-check"><input type="checkbox" data-accesibilidad="${id}"> ${nombre}</label>`).join("")}`)}</div>`);
    campo("web").closest(".cms-form-panel").insertAdjacentHTML("beforeend",coleccion("enlacesAdicionales","Enlaces y documentos","Usa enlaces HTTP(S) publicados y permanentes. Los archivos locales o temporales no se guardan como enlaces."));
    document.querySelector("#vista-editor .cms-editor-actionbar").insertAdjacentHTML("afterend",'<details class="cms-opciones" id="recomendacionesPanel" hidden><summary id="recomendacionesTitulo">Recomendaciones opcionales</summary><p class="cms-recomendaciones" id="recomendacionesEvento"></p></details>');
    document.getElementById("vista-editor").addEventListener("click", event => {
      const add = event.target.closest("[data-anadir-lista]");
      if(add?.dataset.anadirLista==='bloques'){AdminBloques.elegirTipo();return;}
      if (add) { const row = anadir(add.dataset.anadirLista); row.querySelector("input,textarea,select")?.focus(); programarAutoguardado(); avisar(); }
      const boton = event.target.closest("[data-lista-accion]");
      if (!boton) return;
      const row = boton.closest(".cms-fila-opcional"), lista = row.parentElement;
      if (boton.dataset.listaAccion === "quitar") { row.remove(); lista.parentElement.querySelector("[data-anadir-lista]")?.focus(); }
      else {
        const otra = boton.dataset.listaAccion === "subir" ? row.previousElementSibling : row.nextElementSibling;
        if (!otra?.matches(".cms-fila-opcional")) return;
        if (boton.dataset.listaAccion === "subir") otra.before(row); else otra.after(row);
        boton.focus();
      }
      programarAutoguardado(); avisar();
    });
    document.getElementById("vista-editor").addEventListener("input", event => {
      if (event.target.closest(".cms-fila-opcional") || event.target.matches("[data-accesibilidad]")) {
        if (event.target.id) limpiarError(event.target.id);
        programarAutoguardado();
      }
      avisar();
    });
  }
  function anadir(lista, datos = {}) {
    if(lista==="bloques")return AdminBloques.anadir(datos);
    const row = document.createElement("div"); row.className = "cms-fila-opcional";
    row.innerHTML = esquemas[lista].map(([k,label,type]) => {
      const id = `opcional-${++secuencia}`;
      let control = type === "textarea" ? `<textarea rows="2" id="${id}" data-propiedad="${k}"></textarea>` : type === "select" ? `<select id="${id}" data-propiedad="${k}"><option value="enlace">Enlace</option><option value="documento">Documento</option></select>` : `<input id="${id}" data-propiedad="${k}" type="${type}">`;
      return `<div class="meta-item"><label for="${id}">${label}</label>${control}</div>`;
    }).join("")+'<div class="cms-fila-acciones"><button type="button" class="btn-secundario" data-lista-accion="subir" aria-label="Subir elemento">↑</button><button type="button" class="btn-secundario" data-lista-accion="bajar" aria-label="Bajar elemento">↓</button><button type="button" class="btn-secundario" data-lista-accion="quitar">Eliminar</button></div>';
    row.querySelectorAll("[data-propiedad]").forEach(input => {
      if (input.type === "checkbox") input.checked = datos[input.dataset.propiedad] !== false;
      else input.value = datos[input.dataset.propiedad] || (input.tagName === "SELECT" ? "enlace" : "");
    });
    if (lista === "sesiones" && Number.isSafeInteger(datos.diaRelativo)) { row.dataset.diaRelativo=String(datos.diaRelativo); row.insertAdjacentHTML("afterbegin",`<small class="cms-dia-relativo">${GestionMunicipal.etiquetaDia(datos.diaRelativo)}</small>`); }
    campo(lista).append(row); return row;
  }
  function leer() {
    const datos = Object.fromEntries(modelo.textos.map(k => [k,campo(k).value.trim()]));
    Object.keys(esquemas).forEach(k => { if(k==="bloques"){datos.bloques=AdminBloques.leer();return;} datos[k] = [...campo(k).querySelectorAll(".cms-fila-opcional")].map(row => ({...Object.fromEntries([...row.querySelectorAll("[data-propiedad]")].map(input => [input.dataset.propiedad,input.type === "checkbox" ? input.checked : input.value.trim()])),...(k === "sesiones" && !row.querySelector('[data-propiedad="fecha"]').value && row.dataset.diaRelativo != null ? {diaRelativo:Number(row.dataset.diaRelativo)} : {})})); });
    datos.accesibilidadOpciones = [...document.querySelectorAll("[data-accesibilidad]:checked")].map(input => input.dataset.accesibilidad);
    return datos;
  }
  function rellenar(datos) {
    modelo.textos.forEach(k => { campo(k).value = datos[k] || ""; });
    Object.keys(esquemas).forEach(k => { if(k==="bloques"){AdminBloques.rellenar(datos.bloques);return;} campo(k).replaceChildren(); if (Array.isArray(datos[k])) datos[k].forEach(item => anadir(k,item)); });
    document.querySelectorAll("[data-accesibilidad]").forEach(input => { input.checked = Array.isArray(datos.accesibilidadOpciones) && datos.accesibilidadOpciones.includes(input.dataset.accesibilidad); });
    avisar();
  }
  function errores() {
    return modelo.validar({...leer(),tipoPrecio:campo("tipoPrecio").value}).map(([ruta,mensaje]) => {
      const [lista,i,k] = ruta.split(".");
      const entrada = lista === "bloques" ? AdminBloques.campoRuta(ruta) : k ? campo(lista).querySelectorAll(".cms-fila-opcional")[+i]?.querySelector(`[data-propiedad="${k}"]`) : campo(lista);
      return [entrada?.id || lista,mensaje];
    });
  }
  function avisar() {
    if (!window.AdminListado || !window.AdminGestion || !campo("recomendacionesEvento")) return [];
    let datos; try { datos=datosFormulario(null,"","borrador"); } catch { return []; }
    const avisos=RevisionEventos.analizar(datos,{plantilla:AdminGestion.esPlantilla()}).filter(a=>a.tipo==="recomendacion").map(a=>"Recomendación opcional: "+a.mensaje);
    campo("avisoSesiones").hidden=true;
    if(campo("recomendacionesEvento").textContent!==avisos.join(" "))campo("recomendacionesEvento").textContent=avisos.join(" ");
    campo("recomendacionesPanel").hidden=!avisos.length;campo("recomendacionesTitulo").textContent=`Recomendaciones opcionales (${avisos.length})`;return avisos;
  }
  return { iniciar,leer,rellenar,errores,avisar };
})();
