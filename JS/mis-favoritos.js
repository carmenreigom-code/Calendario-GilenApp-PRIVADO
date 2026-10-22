/* Favoritos municipales y lectura temporal de los calendarios de Google seleccionados. */
(() => {
  document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&#39;"}[c]));
  const publicados = () => {
    try { const datos = JSON.parse(localStorage.getItem("eventos")); return Array.isArray(datos) ? datos.filter(esEventoPublicado) : []; }
    catch { return []; }
  };
  const todosGuardados = () => { try { const datos=JSON.parse(localStorage.getItem("eventos")); return Array.isArray(datos) ? datos : []; } catch { return []; } };
  const etiqueta = e => e.categoria ? e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1) : "Evento";
  const claveCopia = id => `${new URL("index.html", location.href).pathname}:${id}`;
  const firmaDe = cuerpo => {
    const texto = JSON.stringify([cuerpo.summary,cuerpo.start,cuerpo.end,cuerpo.location,cuerpo.description]);
    let hash = 2166136261;
    for (let i = 0; i < texto.length; i++) { hash ^= texto.charCodeAt(i); hash = Math.imul(hash,16777619); }
    return (hash >>> 0).toString(16);
  };
  const escribible = c => ["writer", "owner", "writerWithoutPrivateAccess"].includes(c.accessRole);
  const CLAVE_CALENDARIOS = "googleCalendariosVisiblesGilena";
  const leerCalendarios = () => { try { const lista = JSON.parse(localStorage.getItem(CLAVE_CALENDARIOS) || "[]"); return Array.isArray(lista) ? new Set(lista.map(String)) : new Set(); } catch { return new Set(); } };
  const guardarCalendarios = () => { try { localStorage.setItem(CLAVE_CALENDARIOS, JSON.stringify([...seleccionados])); } catch {} };
  let elegido = null, ocupado = false, copiaVerificada = null;
  let mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let diaSeleccionado = "", tipoVisible = "todos", seleccionados = new Set(), googlePorCalendario = new Map(), solicitudGoogle = 0;
  let busqueda = "", categoria = "todos";
  const CLAVE_ESTADO = "estadoMisFavoritosGilena";
  const guardarEstado = () => { try { sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify({ mes:fechaClave(mes).slice(0,7), dia:diaSeleccionado, tipo:tipoVisible, busqueda, categoria, scrollY:window.scrollY })); } catch {} };
  const restaurarEstado = () => { const params=new URLSearchParams(location.search), vuelve=params.get("restaurar")==="1"||performance.getEntriesByType("navigation")[0]?.type==="back_forward"; if(!vuelve)return 0; try { const e=JSON.parse(sessionStorage.getItem(CLAVE_ESTADO)||"{}"); if (/^\d{4}-\d{2}$/.test(e.mes)) mes=new Date(Number(e.mes.slice(0,4)),Number(e.mes.slice(5))-1,1); diaSeleccionado=e.dia||""; tipoVisible=e.tipo||"todos"; busqueda=e.busqueda||""; categoria=e.categoria||"todos"; if(params.has("restaurar")){params.delete("restaurar");const url=new URL(location.href);url.searchParams.delete("restaurar");history.replaceState({favoritos:true},"",`${url.pathname}${url.search}${url.hash}`);} return Number(e.scrollY)||0; } catch { return 0; } };
  let seleccionInicializada = false;
  let coloresGoogle = null;
  const fechaClave = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const limiteMes = () => ({ desde:fechaClave(mes), hasta:fechaClave(new Date(mes.getFullYear(),mes.getMonth()+1,0)) });
  const solapa = (item, desde, hasta) => item.fecha <= hasta && (item.fechaFin || item.fecha) >= desde;
  function elementos() {
    const favs = FavoritosGilena.lista();
    const municipales = publicados().filter(e => favs.includes(String(e.id))).map(e => ({ tipo:"municipal", id:`municipal:${e.id}`, fecha:e.fecha, fechaFin:e.fechaFin || e.fecha, hora:e.hora || "", todoElDia:!e.hora, municipal:e, google:null }));
    const porClave = new Map(municipales.map(item => [claveCopia(item.municipal.id), item]));
    const otros = [];
    for (const [calId, lista] of googlePorCalendario) {
      const calendario = GoogleAgenda.estado().calendarios.find(c => c.id === calId);
      if (!calendario) continue;
      for (const original of lista) {
        const item = GoogleFechas.normalizar(original, calendario);
        if (!item) continue;
        item.color = ColoresEventos.google(item, calendario, coloresGoogle);
        const vinculado = porClave.get(original.extendedProperties?.private?.gilenaCopia);
        if (vinculado && !vinculado.google && original.extendedProperties?.private?.gilenaCopia === claveCopia(vinculado.municipal.id)) vinculado.google = item;
        else otros.push(item);
      }
    }
    return [...municipales, ...otros];
  }
  const visibles = items => items.filter(item => tipoVisible === "todos" || (tipoVisible === "municipal" ? item.tipo === "municipal" : item.tipo === "google" || !!item.google));
  const ordenar = (a,b) => a.fecha.localeCompare(b.fecha) || Number(!a.todoElDia)-Number(!b.todoElDia) || (a.hora || "").localeCompare(b.hora || "") || a.id.localeCompare(b.id);
  const enlaceGoogle = url => { try { const u = new URL(url); return u.protocol === "https:" && (u.hostname === "calendar.google.com" || u.hostname === "www.google.com") ? u.href : ""; } catch { return ""; } };
  function tarjeta(item) {
    if (item.tipo === "google") {
      const url = enlaceGoogle(item.htmlLink);
      return `<article class="favoritos-card favoritos-card-google"${ColoresEventos.estilo(item.color)}><div class="favoritos-card-cuerpo"><div class="favoritos-etiquetas"><span>▣ Google Calendar</span></div><h3>${esc(item.titulo)}</h3><p><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${esc(formatearRangoEvento(item.fecha,item.fechaFin))}</p><p><i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(item.todoElDia ? "Todo el día" : item.hora)}</p>${item.lugar ? `<p><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(item.lugar)}</p>` : ""}<p>Calendario: ${esc(item.calendarioNombre)}</p>${url ? `<div class="favoritos-card-acciones"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir en Google Calendar</a></div>` : ""}</div></article>`;
    }
    const e = item.municipal, id = String(e.id), url = item.google && enlaceGoogle(item.google.htmlLink);
    const cambios = FavoritosGilena.cambios?.(e) || [];
    const etiquetasCambio = [...new Set(cambios.map(c => ["fecha","fechaFin"].includes(c.campo) ? "Fecha modificada" : ["hora","horaFin"].includes(c.campo) ? "Horario modificado" : c.campo === "lugar" ? "Lugar modificado" : e.estadoActividad === "cancelado" ? "Cancelado" : e.estadoActividad === "aplazado" ? "Aplazado" : "Estado modificado"))];
    const avisoCambios = cambios.length ? `<details class="favorito-cambios"><summary>${etiquetasCambio.map(esc).join(" · ")}</summary><dl>${cambios.map(c=>`<div><dt>${esc(c.nombre)}</dt><dd><span>Antes: ${esc(c.anterior)}</span><strong>Ahora: ${esc(c.actual)}</strong></dd></div>`).join("")}</dl><button type="button" data-visto="${esc(id)}">Marcar como visto</button></details>` : "";
    return TarjetasEvento.renderizar(e, { clases:"favoritos-card", favorito:true, atributoFavorito:"data-quitar", extra:avisoCambios,
      acciones:`${datosCalendario(e) ? `<button type="button" data-google="${esc(id)}">${item.google ? "Comprobar copia en Google" : "Añadir a Google Calendar"}</button>` : ""}${url ? `<a class="favoritos-enlace-google" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir copia en Google</a>` : ""}` });
  }
  function renderCalendario(items) {
    const ano = mes.getFullYear(), numero = mes.getMonth(), primerDia = (new Date(ano,numero,1).getDay()+6)%7;
    const dias = new Date(ano,numero+1,0).getDate(), hoy = GoogleFechas.partes(new Date()).fecha;
    let html = "";
    const total = Math.ceil((primerDia+dias)/7)*7;
    for (let indice=0;indice<total;indice++) {
      const fechaReal = new Date(ano,numero,indice-primerDia+1);
      const fecha = fechaClave(fechaReal), dia = fechaReal.getDate(), fuera = fechaReal.getMonth() !== numero;
      const delDia = fuera ? [] : items.filter(item => solapa(item,fecha,fecha));
      const chips = fuera ? "" : delDia.slice(0,2).map(item => {
        const municipal = item.tipo === "municipal", nombre = municipal ? item.municipal.titulo : item.titulo;
        const color = municipal ? ColoresEventos.categoria(item.municipal.categoria) : item.color;
        const categoria = municipal ? etiqueta(item.municipal) : "Google Calendar";
        return `<span class="favoritos-chip ${municipal ? "es-municipal" : "es-google"}"${ColoresEventos.estilo(color)} title="${esc(`${categoria}${item.google ? " y Google Calendar" : ""}: ${nombre}`)}">${item.hora ? `<time>${esc(item.hora)}</time> ` : ""}${esc(nombre)}</span>`;
      }).join("");
      const nombreDia = fechaReal.toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});
      html += `<div class="favoritos-dia ${fuera ? "es-fuera" : ""} ${fecha === hoy ? "es-hoy" : ""} ${fecha === diaSeleccionado ? "es-seleccionado" : ""}"><button type="button" class="favoritos-dia-abrir" data-dia="${fecha}" ${fuera ? 'data-otro-mes="true"' : ""} aria-pressed="${fecha === diaSeleccionado}" ${fecha === hoy ? 'aria-current="date"' : ""} aria-label="${esc(nombreDia)}: ${fuera ? "ir a ese mes" : `${delDia.length} eventos`}"><span class="favoritos-numero">${dia}</span>${fecha === hoy ? '<span class="favoritos-hoy-texto">Hoy</span>' : ""}<span class="favoritos-chips">${chips}</span></button>${!fuera && delDia.length > 2 ? `<button type="button" class="favoritos-mas" data-dia="${fecha}" aria-label="Ver ${delDia.length} eventos del ${esc(nombreDia)}">+${delDia.length-2} más</button>` : ""}</div>`;
    }
    $("diasFavoritos").innerHTML = html;
  }
  function render() {
    const idsFavoritos = FavoritosGilena.lista(), publicadosAhora = publicados();
    FavoritosGilena.asegurar?.(publicadosAhora);
    const publicosIds = new Set(publicadosAhora.map(e=>String(e.id))), noDisponibles = idsFavoritos.filter(id=>!publicosIds.has(id));
    const todos = elementos(), favoritos = todos.filter(x => x.tipo === "municipal");
    const disponibles=FavoritosGilena.contarDisponibles();$("contadorFavoritos").textContent = `${disponibles} ${disponibles===1?"favorito municipal disponible":"favoritos municipales disponibles"}${noDisponibles.length?` · ${noDisponibles.length} no disponible(s)`:""}`;
    $("mesVisible").textContent = mes.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
    const {desde,hasta} = limiteMes(), mesActual = visibles(todos.filter(item => solapa(item,desde,hasta))).sort(ordenar);
    renderCalendario(mesActual);
    const municipalesMes = todos.filter(item => item.tipo === "municipal" && solapa(item,desde,hasta)).sort(ordenar);
    const lista = (diaSeleccionado ? municipalesMes.filter(item => solapa(item,diaSeleccionado,diaSeleccionado)) : municipalesMes).filter(item => (categoria === "todos" || item.municipal.categoria === categoria) && `${item.municipal.titulo} ${item.municipal.lugar || ""}`.toLocaleLowerCase("es").includes(busqueda));
    $("tituloListadoFavoritos").textContent = "Eventos favoritos";
    const periodo = diaSeleccionado ? new Date(`${diaSeleccionado}T12:00:00`).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : mes.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
    $("periodoListado").textContent = `${periodo} · ${lista.length} ${lista.length === 1 ? "evento" : "eventos"}`;
    $("verTodoMes").hidden = !diaSeleccionado;
    const avisosNoDisponibles = noDisponibles.map(id=>`<article class="favoritos-card favorito-no-disponible"><div class="favoritos-card-cuerpo"><h3>Evento no disponible</h3><p>Este evento ya no está disponible públicamente.</p><button type="button" data-quitar="${esc(id)}">Quitar de favoritos</button></div></article>`).join("");
    $("eventosFavoritos").innerHTML = lista.map(tarjeta).join("") + avisosNoDisponibles;
    $("favoritosVacios").hidden = !!idsFavoritos.length;
    $("sinCoincidencias").hidden = !!lista.length || !!noDisponibles.length || !$("favoritosVacios").hidden;
    $("sinCoincidencias").textContent = diaSeleccionado ? "No tienes eventos municipales favoritos para este día" : "No hay eventos municipales favoritos para este período y filtros.";
    const categorias = [...new Set(favoritos.map(item => item.municipal.categoria).filter(Boolean))].sort();
    const selectorCategoria = $("categoriaFavoritos");
    const anterior = selectorCategoria.value;
    selectorCategoria.replaceChildren(new Option("Todas", "todos"), ...categorias.map(c => new Option(etiqueta({categoria:c}), c)));
    selectorCategoria.value = categorias.includes(anterior) ? anterior : "todos";
    ImagenesEvento.activar($("eventosFavoritos"));
    guardarEstado();
  }
  function cuerpoMunicipal(e) {
    const datos = datosCalendario(e);
    if (!datos) throw new Error("La fecha u hora del evento no permite crear una copia en Google.");
    const url = new URL(`evento.html?id=${encodeURIComponent(e.id)}`, location.href).href;
    const descripcion = [datos.descripcion, `Detalle municipal: ${url}`].filter(Boolean).join("\n\n");
    const fecha = compacta => `${compacta.slice(0,4)}-${compacta.slice(4,6)}-${compacta.slice(6,8)}`;
    return { summary:datos.titulo, location:datos.lugar, description:descripcion,
      start:datos.todoElDia ? {date:fecha(datos.inicio)} : {dateTime:datos.inicio.toISOString()},
      end:datos.todoElDia ? {date:fecha(datos.fin)} : {dateTime:datos.fin.toISOString()},
      extendedProperties:{private:{gilenaCopia:claveCopia(e.id)}} };
  }
  async function cargarGoogle() {
    const solicitud = ++solicitudGoogle;
    if (!GoogleAgenda.estado().conectado || !seleccionados.size) { googlePorCalendario.clear(); render(); return; }
    const periodo = GoogleFechas.periodo(mes);
    const calendarios = GoogleAgenda.estado().calendarios.filter(c => seleccionados.has(c.id));
    $("estadoGoogle").textContent = "Actualizando los eventos de Google del mes visible…";
    const resultados = await Promise.allSettled(calendarios.map(async c => [c.id, await GoogleAgenda.listarEventos(c.id,periodo.desde,periodo.hasta)]));
    if (solicitud !== solicitudGoogle) return;
    if (!GoogleAgenda.estado().conectado) { googlePorCalendario.clear(); controlesGoogle(GoogleAgenda.estado().motivo); render(); return; }
    googlePorCalendario = new Map(resultados.filter(r => r.status === "fulfilled").map(r => r.value));
    const errores = resultados.filter(r => r.status === "rejected").map(r => r.reason?.message || "Error de Google");
    $("estadoGoogle").textContent = errores.length ? `No se pudieron cargar todos los calendarios. ${errores[0]}` : `${calendarios.length} ${calendarios.length === 1 ? "calendario consultado" : "calendarios consultados"} para ${mes.toLocaleDateString("es-ES",{month:"long",year:"numeric"})}.`;
    render();
  }
  function controlesGoogle(mensaje = "") {
    const estado = GoogleAgenda.estado(), lista = estado.calendarios.filter(escribible);
    if (estado.conectado && !seleccionInicializada) { const guardados = leerCalendarios(); seleccionados = guardados.size ? new Set(estado.calendarios.filter(c => guardados.has(c.id)).map(c => c.id)) : new Set(estado.calendarios.map(c => c.id)); seleccionInicializada = true; }
    if (!estado.conectado) { seleccionados.clear(); seleccionInicializada = false; googlePorCalendario.clear(); coloresGoogle = null; solicitudGoogle++; }
    $("conectarGoogle").hidden = estado.conectado;
    $("desconectarGoogle").hidden = !estado.conectado;
    $("actualizarGoogle").hidden = !estado.conectado;
    $("grupoCalendario").hidden = !estado.conectado;
    $("elegirCalendarios").hidden = !estado.conectado;
    $("listaCalendarios").innerHTML = estado.calendarios.map(c => `<label><input type="checkbox" data-calendario-visible="${esc(c.id)}" ${seleccionados.has(c.id) ? "checked" : ""}> ${esc(c.summaryOverride || c.summary || c.id)}</label>`).join("");
    const selector = $("calendarioGoogle"), previo = selector.value;
    selector.replaceChildren(...lista.map(c => new Option(c.summaryOverride || c.summary || c.id, c.id)));
    if (lista.some(c => c.id === previo)) selector.value = previo;
    const copia = $("calendarioCopia"), copiaAnterior = copia.value;
    copia.replaceChildren(...lista.map(c => new Option(c.summaryOverride || c.summary || c.id, c.id)));
    copia.value = lista.some(c => c.id === copiaAnterior) ? copiaAnterior : selector.value;
    $("grupoCalendarioCopia").hidden = !estado.conectado;
    $("estadoGoogle").textContent = mensaje || estado.motivo || (!estado.configurado ? "Falta el OAuth Client ID en JS/google-config.js. Tus favoritos locales siguen disponibles." : estado.conectado ? lista.length ? "Google Calendar conectado. Elige qué calendarios consultar." : "Conectado, pero no hay calendarios con permiso de escritura para crear copias." : estado.requiereReconexion ? "Es necesario reconectar Google Calendar." : "Google Calendar es opcional. Conéctalo para consultar eventos y añadir copias municipales.");
  }
  async function conectar() {
    await GoogleAgenda.conectar();
    await GoogleAgenda.cargarCalendarios();
    try { coloresGoogle = await GoogleAgenda.cargarColores(); } catch { coloresGoogle = null; }
    controlesGoogle();
    await cargarGoogle();
  }
  function abrir(e) {
    elegido = e; copiaVerificada = null;
    $("tituloCopia").textContent = "Añadir a Google Calendar";
    $("mensajeCopia").textContent = "";
    $("calendarioCopia").value = $("calendarioGoogle").value;
    $("resumenCopia").textContent = `Evento: ${e.titulo}. Fecha: ${formatearRangoEvento(e.fecha,e.fechaFin)}. ${e.hora || "Todo el día"}. ${GoogleAgenda.estado().conectado ? `Destino: ${$("calendarioCopia").selectedOptions[0]?.textContent || "elige un calendario"}.` : "Conecta Google para elegir el calendario de destino."} Se creará una copia independiente.`;
    $("confirmarCopia").textContent = GoogleAgenda.estado().conectado ? "Comprobar copia" : "Conectar Google Calendar";
    $("dialogoCopia").showModal();
    $("confirmarCopia").focus();
  }
  async function confirmar() {
    if (!elegido || ocupado) return;
    ocupado = true; $("confirmarCopia").disabled = true; $("mensajeCopia").textContent = "Procesando…";
    try {
      if (!GoogleAgenda.estado().conectado) {
        await conectar();
        $("mensajeCopia").textContent = "Google conectado. Comprueba el calendario de destino y confirma la copia.";
        $("resumenCopia").textContent = `Evento: ${elegido.titulo}. Destino: ${$("calendarioCopia").selectedOptions[0]?.textContent || "ninguno"}.`;
        $("confirmarCopia").textContent = "Comprobar copia";
        return;
      }
      const cal = $("calendarioCopia").value;
      if (!cal) throw new Error("Elige un calendario con permiso de escritura.");
      const clave = claveCopia(elegido.id);
      const encontrados = await GoogleAgenda.buscarCopia(cal, clave);
      const copia = encontrados.find(item => item.status !== "cancelled" && item.extendedProperties?.private?.gilenaCopia === clave);
      const cuerpo = cuerpoMunicipal(elegido);
      const firma = firmaDe(cuerpo);
      if (copia) {
        copiaVerificada = copia;
        const igual = copia.extendedProperties?.private?.gilenaFirma === firma;
        if (igual) {
          $("mensajeCopia").textContent = "Añadido a Google Calendar. La copia ya existe en este calendario.";
          $("confirmarCopia").hidden = true;
        } else {
          $("tituloCopia").textContent = "Actualizar copia en Google";
          $("mensajeCopia").textContent = "Ya existe una copia vinculada. El evento municipal ha cambiado o la copia es anterior. Confirma si quieres actualizar título, fechas, lugar y descripción.";
          $("confirmarCopia").textContent = "Actualizar copia";
          $("confirmarCopia").dataset.accion = "actualizar";
        }
        return;
      }
      if ($("confirmarCopia").dataset.accion !== "crear") {
        $("mensajeCopia").textContent = `Se creará «${elegido.titulo}» en «${$("calendarioCopia").selectedOptions[0].textContent}». Confirma el guardado.`;
        $("confirmarCopia").textContent = "Crear copia en Google";
        $("confirmarCopia").dataset.accion = "crear";
        return;
      }
      cuerpo.extendedProperties.private.gilenaFirma = firma;
      const creada = await GoogleAgenda.crear(cal, cuerpo);
      if (!creada?.id) throw new Error("Google no confirmó el identificador de la copia. Comprueba el calendario antes de reintentar.");
      $("mensajeCopia").textContent = "Añadido a Google Calendar. La relación se comprobará directamente en ese calendario.";
      $("confirmarCopia").hidden = true;
      cargarGoogle().catch(() => {});
    } catch (error) { $("mensajeCopia").textContent = error.message; controlesGoogle(error.message); }
    finally { ocupado = false; $("confirmarCopia").disabled = false; }
  }
  async function actualizarCopia() {
    if (ocupado || !copiaVerificada || !elegido) return;
    ocupado = true; $("confirmarCopia").disabled = true;
    try {
      const cal = $("calendarioCopia").value, cuerpo = cuerpoMunicipal(elegido);
      const firma = firmaDe(cuerpo);
      cuerpo.extendedProperties.private.gilenaFirma = firma;
      const respuesta = await GoogleAgenda.editar(cal,copiaVerificada.id,cuerpo,copiaVerificada.etag);
      if (!respuesta?.id) throw new Error("Google no confirmó la actualización.");
      $("mensajeCopia").textContent = "Copia actualizada en Google Calendar.";
      $("confirmarCopia").hidden = true;
      cargarGoogle().catch(() => {});
    } catch (error) { $("mensajeCopia").textContent = `${error.message} Cierra y vuelve a abrir para comprobar la copia actual.`; }
    finally { ocupado = false; $("confirmarCopia").disabled = false; }
  }
  $("mis-eventos").addEventListener("click", async event => {
    const b = event.target.closest("button"); if (!b) return;
    if (b.dataset.quitar) { if (FavoritosGilena.guardar(FavoritosGilena.lista().filter(id => id !== b.dataset.quitar))) { FavoritosGilena.eliminarReferencia?.(b.dataset.quitar); render(); } else alert(FavoritosGilena.error); }
    if (b.dataset.visto) { const e=publicados().find(item=>String(item.id)===b.dataset.visto); if (e) FavoritosGilena.marcarVisto?.(e); render(); }
    if (b.dataset.google) { const e = publicados().find(item => String(item.id) === b.dataset.google); if (e) abrir(e); }
  });
  $("diasFavoritos").addEventListener("click", e => { const boton = e.target.closest("[data-dia]"); if (!boton) return; const fecha = boton.dataset.dia; if (boton.classList.contains("favoritos-mas")) { const items = visibles(elementos().filter(item => solapa(item,fecha,fecha))).sort(ordenar); $("tituloDia").textContent = `Eventos del ${new Date(`${fecha}T12:00:00`).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}`; $("listaDia").innerHTML = items.map(item => `<p><strong>${item.tipo === "municipal" ? "Municipal" : "Google Calendar"}</strong> ${esc(item.tipo === "municipal" ? item.municipal.titulo : item.titulo)}</p>`).join(""); $("dialogoDia").showModal(); return; } diaSeleccionado = fecha; if (boton.dataset.otroMes) { const d = new Date(`${fecha}T12:00:00`); mes = new Date(d.getFullYear(),d.getMonth(),1); cargarGoogle(); } render(); $("tituloListadoFavoritos").focus(); $("tituloListadoFavoritos").scrollIntoView({block:"start"}); });
  $("cerrarDia").addEventListener("click", () => $("dialogoDia").close());
  $("buscarFavoritos").addEventListener("input", e => { busqueda = e.target.value.trim().toLocaleLowerCase("es"); render(); });
  $("categoriaFavoritos").addEventListener("change", e => { categoria = e.target.value; render(); });
  $("verTodoMes").addEventListener("click", () => { diaSeleccionado = ""; render(); $("tituloListadoFavoritos").focus?.(); });
  for (const [id, desplazamiento] of [["mesAnterior",-1],["mesSiguiente",1]]) $(id).addEventListener("click", () => { mes = new Date(mes.getFullYear(),mes.getMonth()+desplazamiento,1); diaSeleccionado = ""; render(); cargarGoogle(); });
  $("irHoy").addEventListener("click", () => { const ahora = new Date(); mes = new Date(ahora.getFullYear(),ahora.getMonth(),1); diaSeleccionado = ""; render(); cargarGoogle(); });
  $("mis-eventos").addEventListener("click", e => { const b = e.target.closest("[data-tipo]"); if (b) { tipoVisible = b.dataset.tipo; document.querySelectorAll("[data-tipo]").forEach(opcion => opcion.setAttribute("aria-pressed",String(opcion === b))); render(); } });
  $("listaCalendarios").addEventListener("change", e => { const c = e.target.closest("[data-calendario-visible]"); if (!c) return; if (c.checked) seleccionados.add(c.dataset.calendarioVisible); else seleccionados.delete(c.dataset.calendarioVisible); guardarCalendarios(); cargarGoogle(); });
  $("conectarGoogle").addEventListener("click", async () => { $("conectarGoogle").disabled = true; try { await conectar(); } catch(e) { controlesGoogle(e.message); } finally { $("conectarGoogle").disabled = false; } });
  $("actualizarGoogle").addEventListener("click", async () => { $("actualizarGoogle").disabled = true; try { await GoogleAgenda.cargarCalendarios(); try { coloresGoogle = await GoogleAgenda.cargarColores(); } catch { coloresGoogle = null; } controlesGoogle(); await cargarGoogle(); } catch(e) { controlesGoogle(e.message); } finally { $("actualizarGoogle").disabled = false; } });
  async function desconectar() { const resultado = await GoogleAgenda.desconectar(); controlesGoogle(resultado?.error ? "Desconectado. No se pudo confirmar la revocación de Google." : "Google Calendar desconectado. Tus favoritos se conservan."); render(); }
  $("desconectarGoogle").addEventListener("click",desconectar);
  document.addEventListener("google:desconectado", e => { controlesGoogle(e.detail?.error ? "Desconectado. No se pudo confirmar la revocación de Google." : "Google Calendar desconectado. Tus favoritos se conservan."); render(); });
  GoogleAgenda.suscribir(() => { if (!GoogleAgenda.estado().conectado) { controlesGoogle(); render(); } });
  $("confirmarCopia").addEventListener("click", () => $("confirmarCopia").dataset.accion === "actualizar" ? actualizarCopia() : confirmar());
  $("cancelarCopia").addEventListener("click", () => $("dialogoCopia").close());
  $("dialogoCopia").addEventListener("close", () => { elegido = null; copiaVerificada = null; $("confirmarCopia").hidden = false; delete $("confirmarCopia").dataset.accion; });
  $("calendarioGoogle").addEventListener("change", () => { if (elegido && $("dialogoCopia").open) { const evento = elegido; $("dialogoCopia").close(); abrir(evento); } });
  $("calendarioCopia").addEventListener("change", () => { copiaVerificada = null; delete $("confirmarCopia").dataset.accion; $("confirmarCopia").hidden = false; $("confirmarCopia").textContent = "Comprobar copia"; $("mensajeCopia").textContent = `Destino: ${$("calendarioCopia").selectedOptions[0]?.textContent || "ninguno"}. Comprueba este calendario antes de guardar.`; });
  window.addEventListener("storage", e => { if (["eventos",FavoritosGilena.clave].includes(e.key)) render(); });
  document.addEventListener("perfil:cambio", render);
  const scrollRestaurado = restaurarEstado();
  if (new URLSearchParams(location.search).has("restaurar")) { try { const url=new URL(location.href); url.searchParams.delete("restaurar"); history.replaceState({favoritos:true},"",`${url.pathname}${url.search}${url.hash}`); } catch {} }
  $("buscarFavoritos").value = busqueda;
  document.querySelectorAll("[data-tipo]").forEach(opcion => opcion.setAttribute("aria-pressed",String(opcion.dataset.tipo===tipoVisible)));
  render(); controlesGoogle();
  if (categoria !== "todos") $("categoriaFavoritos").value = categoria;
  if (scrollRestaurado) requestAnimationFrame(()=>window.scrollTo({top:scrollRestaurado,behavior:"auto"}));
  $("mis-eventos").addEventListener("click", event => { if (event.target.closest('a[href^="evento.html"]')) { guardarEstado(); try { sessionStorage.setItem("origenDetalleGilena","favoritos"); } catch {} } });
  const solicitado = new URLSearchParams(location.search).get("googleFavorito");
  if (solicitado) { const e = publicados().find(item => String(item.id) === solicitado); if (e && datosCalendario(e)) abrir(e); }
  });
})();
