(() => {
  const app = document.getElementById("agendaPersonalApp");
  if (!app) return;
  const perfil = PerfilesGilena.activo();
  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const dia = fecha => `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}-${String(fecha.getDate()).padStart(2,"0")}`;
  const fechaValida = valor => Boolean(leerFecha(valor));
  const horaLocalValida = (valor,hora) => { if (!fechaValida(valor) || !leerHora(hora)) return false; const d = new Date(`${valor}T${hora}:00`); return dia(d) === valor && `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` === hora; };
  const sumarDias = (valor, cantidad) => { const [a,m,d] = valor.split("-").map(Number); return new Date(Date.UTC(a,m-1,d+cantidad)).toISOString().slice(0,10); };
  const hoy = dia(new Date());
  const fechaBonita = valor => fechaValida(valor) ? new Date(`${valor}T12:00:00`).toLocaleDateString("es-ES",{ day:"numeric", month:"long", year:"numeric" }) : "Sin fecha";
  const rolesEscritura = ["writer","owner","writerWithoutPrivateAccess"];
  if (!perfil) {
    app.innerHTML = '<section class="agenda-panel"><h1 id="tituloMisEventos">Mi agenda</h1><p>Para usar tu agenda personal, abre un perfil local de demostración. Los eventos municipales se pueden consultar sin perfil.</p><a class="agenda-primario" href="acceso.html">Iniciar sesión</a> <a href="registro.html">Crear perfil</a></section>';
    return;
  }
  let seleccion = hoy, vista = "mes", filtro = "todos", googleCalendarId = "", googleEditando = null, guardando = false, cargando = 0, suprimirClick = false;
  let focoEditor = null, editorSucia = false, vinculoTemporal = null, municipalParaGoogle = null;
  const tipos = {
    municipal:["fa-landmark","Favorito municipal"], cita:["fa-calendar-check","Cita local"], google:["fa-brands fa-google","Evento de Google"],
    recordatorio:["fa-bell","Recordatorio"], anotacion:["fa-note-sticky","Anotación"]
  };
  app.innerHTML = `<div class="agenda-nueva-cabecera"><div><p class="agenda-eyebrow">AGENDA PERSONAL</p><h1 id="tituloMisEventos">Mi agenda</h1><p id="agendaFechaActual">${esc(new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}</p></div><div class="agenda-anadir-wrap"><button class="agenda-primario" id="anadirAgenda" type="button" aria-expanded="false" aria-controls="menuAnadir"><i class="fa-solid fa-plus" aria-hidden="true"></i> Añadir</button><div id="menuAnadir" class="agenda-menu-anadir" hidden><button type="button" data-nuevo="cita">Cita o evento personal</button><button type="button" data-nuevo="recordatorio">Recordatorio</button><button type="button" data-nuevo="anotacion">Anotación</button></div></div></div>
  <div class="agenda-barra"><div class="agenda-periodo"><button type="button" data-mover="-1" aria-label="Período anterior">‹</button><button type="button" id="irHoy">Hoy</button><button type="button" data-mover="1" aria-label="Período siguiente">›</button><strong id="tituloPeriodo"></strong></div><div class="agenda-vistas" role="group" aria-label="Vista de la agenda"><button type="button" data-vista="mes">Mes</button><button type="button" data-vista="semana">Semana</button><button type="button" data-vista="dia">Día</button><button type="button" data-vista="lista">Lista</button></div><label class="agenda-filtro">Tipo <select id="filtroTipo"><option value="todos">Todos</option><option value="municipal">Favoritos</option><option value="cita">Citas locales</option><option value="google">Google</option><option value="recordatorio">Recordatorios</option><option value="anotacion">Anotaciones</option></select></label></div>
  <div class="agenda-resumen" id="resumenAgenda"></div><p id="estadoAgenda" role="status" aria-live="polite"></p>
  <div id="copiarFavoritos" class="agenda-panel" hidden><p>Hay favoritos antiguos sin perfil. Puedes copiarlos aquí sin borrar los originales.</p><button type="button" id="copiarFavoritosBoton">Copiar favoritos</button></div>
  <div class="agenda-principal"><section class="agenda-panel agenda-calendario-panel" aria-label="Calendario personal"><div id="vistaAgenda"></div></section><aside class="agenda-panel agenda-panel-dia" aria-labelledby="tituloDia"><h2 id="tituloDia"></h2><div id="elementosDia"></div></aside></div>
  <section class="agenda-panel agenda-notas"><h2>Anotaciones sin fecha</h2><div id="notasSinFecha"></div></section>
  <details class="agenda-panel agenda-google-panel" id="panelGoogle"><summary><i class="fa-brands fa-google" aria-hidden="true"></i> Google Calendar <span id="googleResumen"></span></summary><div class="google-controles"><button type="button" id="conectarGoogle">Conectar Google Calendar</button><button type="button" id="actualizarGoogle" hidden>Actualizar</button><button type="button" id="desconectarGoogle" hidden>Desconectar</button><label>Calendario<select id="googleCalendario" disabled><option value="">Sin conexión</option></select></label></div><p id="googleEstado" role="status" aria-live="polite"></p><p>La conexión usa un token temporal en memoria. Los eventos de Google no se copian al almacenamiento local.</p></details>
  <details class="agenda-panel agenda-avisos" id="panelAvisos"><summary><i class="fa-solid fa-bell" aria-hidden="true"></i> Avisos <span id="resumenAvisos"></span></summary><p>Los avisos locales dependen de que la agenda esté abierta. Los recordatorios de Google los gestiona Google Calendar según la configuración de tu cuenta.</p><button type="button" id="activarNotificaciones">Activar notificaciones</button><p id="estadoNotificaciones" role="status"></p><div id="listaAvisos"></div></details>
  <dialog id="editorAgenda" class="agenda-dialogo" aria-labelledby="tituloEditor"><div class="agenda-dialogo-cabecera"><h2 id="tituloEditor">Añadir</h2><button type="button" id="cerrarEditor" aria-label="Cerrar editor">×</button></div><form id="formAgenda" novalidate><input type="hidden" name="id"><label>Tipo<select name="tipo"><option value="cita">Cita o evento personal</option><option value="recordatorio">Recordatorio</option><option value="anotacion">Anotación</option></select></label><label>Título <span aria-hidden="true">*</span><input name="titulo" required maxlength="150"></label><div id="camposFecha"><label>Fecha inicial <input type="date" name="fecha"></label><label id="horaInicioLabel">Hora inicial <input type="time" name="hora"></label><label id="fechaFinLabel">Fecha final opcional <input type="date" name="fechaFin"></label><label id="horaFinLabel">Hora final opcional <input type="time" name="horaFin"></label><label class="agenda-check" id="todoElDiaLabel"><input type="checkbox" name="todoElDia"> Todo el día</label></div><div id="camposNota" hidden><label>Contenido <textarea name="contenido" rows="5"></textarea></label><p>Sin fecha, la anotación aparecerá en su propia sección.</p></div><div id="camposAviso"><label>Aviso <select name="avisoMinutos"><option value="-1">Sin aviso</option><option value="0">A la hora</option><option value="10">10 minutos antes</option><option value="30">30 minutos antes</option><option value="1440">1 día antes</option><option value="predeterminado">Predeterminado de Google</option></select></label><p id="ayudaAviso"></p></div><label id="destinoAgendaLabel">Guardar en <select name="destino"><option value="local">Agenda local</option></select></label><details id="opcionesAdicionales"><summary>Opciones adicionales</summary><div class="agenda-opciones"><label id="lugarLabel">Lugar <input name="lugar" maxlength="200"></label><label id="notasLabel">Descripción o notas <textarea name="notas" rows="4"></textarea></label></div></details><p id="errorAgenda" role="alert"></p><div class="agenda-acciones"><button class="agenda-primario" type="submit">Guardar</button><button type="button" id="actualizarCitaGoogle" hidden>Actualizar datos de Google</button><button type="button" id="cancelarAgenda">Cancelar</button></div></form></dialog>
  <dialog id="googleCopiaDialog" class="agenda-dialogo" aria-labelledby="tituloCopia"><h2 id="tituloCopia">Añadir favorito a Google Calendar</h2><p id="resumenCopia"></p><label>Calendario con escritura <select id="calendarioCopia"></select></label><label>Aviso de Google <select id="avisoCopia"><option value="-1">Sin aviso (evita duplicar el aviso local)</option><option value="0">A la hora</option><option value="10">10 minutos antes</option><option value="30">30 minutos antes</option><option value="1440">1 día antes</option></select></label><p id="errorCopia" role="alert"></p><div class="agenda-acciones"><button class="agenda-primario" type="button" id="confirmarCopia">Crear copia en Google</button><button type="button" id="cancelarCopia">Cancelar</button></div></dialog><dialog id="detalleGoogleDialog" class="agenda-dialogo" aria-labelledby="tituloDetalleGoogle"><h2 id="tituloDetalleGoogle"></h2><div id="contenidoDetalleGoogle"></div><div class="agenda-acciones"><button type="button" id="editarDetalleGoogle">Editar esta cita</button><button type="button" id="cerrarDetalleGoogle">Cerrar</button></div></dialog>`;
  const nodo = id => document.getElementById(id);
  const editor = nodo("editorAgenda"), form = nodo("formAgenda"), campo = nombre => form.elements[nombre];
  const mensaje = texto => { nodo("estadoAgenda").textContent = texto; };
  const vinculos = () => [...PerfilesGilena.vinculosGoogle(), ...(vinculoTemporal ? [vinculoTemporal] : [])];
  const vinculo = id => vinculos().find(v => v.municipalId === String(id));
  const municipal = id => eventos.find(e => String(e.id) === String(id));
  const calendario = id => GoogleAgenda.estado().calendarios.find(c => c.id === id);
  const escribible = c => c && rolesEscritura.includes(c.accessRole);
  const abrirGoogle = valor => { try { const url = new URL(valor); if (url.protocol === "https:" && (url.hostname === "calendar.google.com" || ["www.google.com","google.com"].includes(url.hostname) && url.pathname.startsWith("/calendar/"))) window.open(url.href,"_blank","noopener,noreferrer"); } catch {} };
  const firmaMunicipal = e => JSON.stringify([e.titulo,e.fecha,e.fechaFin,e.hora,e.horaFin,e.lugar,e.direccion,e.descripcion,e.descripcion_larga]);
  const icono = item => `<i class="${item.tipo === "google" ? tipos.google[0] : "fa-solid " + tipos[item.tipo][0]}" aria-hidden="true"></i>`;
  const etiqueta = item => tipos[item.tipo]?.[1] || "Elemento";
  const itemId = item => esc(item.id);
  function elementos() {
    const favoritos = PerfilesGilena.favoritos();
    const municipales = eventos.filter(e => favoritos.includes(String(e.id))).map(e => ({ ...e, tipo:"municipal", id:String(e.id) }));
    const cal = calendario(googleCalendarId);
    const google = cal ? GoogleAgenda.estado().eventos.map(e => GoogleFechas.normalizar(e,cal)).filter(Boolean).filter(e => !municipales.some(m => { const v = vinculo(m.id); return v && v.calendarId === e.calendarioId && v.eventId === e.eventoId; })) : [];
    const locales = PerfilesGilena.elementos().filter(i => i && ["cita","recordatorio","anotacion"].includes(i.tipo));
    return [...municipales,...locales,...google].sort((a,b) => String(a.fecha || "").localeCompare(String(b.fecha || "")) || String(a.hora || "").localeCompare(String(b.hora || "")));
  }
  const visible = item => filtro === "todos" || item.tipo === filtro;
  const enDia = (item, valor) => item.fecha && item.fecha <= valor && (item.fechaFin || item.fecha) >= valor;
  function tarjeta(item) {
    const v = item.tipo === "municipal" ? vinculo(item.id) : null;
    const meta = `${item.fecha ? fechaBonita(item.fecha) : "Sin fecha"}${item.fechaFin && item.fechaFin !== item.fecha ? ` — ${fechaBonita(item.fechaFin)}` : ""}${item.hora && !item.todoElDia ? ` · ${item.hora}` : ""}${item.lugar ? ` · ${item.lugar}` : ""}`;
    let acciones = "";
    if (item.tipo === "municipal") acciones = `<a href="evento.html?id=${encodeURIComponent(item.id)}">Ver detalle</a>${v ? `<span class="agenda-vinculado">Copia en Google creada</span><button type="button" data-abrir-copia="${itemId(item)}">Abrir copia</button>${v.firma !== firmaMunicipal(item) ? `<button type="button" data-actualizar-copia="${itemId(item)}">Actualizar copia</button>` : ""}` : `<button type="button" data-copiar-google="${itemId(item)}">Añadir a Google Calendar</button>`}`;
    else if (item.tipo === "google") acciones = `<button type="button" data-ver-google="${itemId(item)}">Ver detalle${item.puedeEditar ? " y editar" : ""}</button>`;
    else acciones = `<button type="button" data-editar="${itemId(item)}">Editar</button><button type="button" data-eliminar="${itemId(item)}">Eliminar</button>${item.tipo === "recordatorio" ? `<button type="button" data-completar="${itemId(item)}">${item.completado ? "Volver a activar" : "Marcar completado"}</button>` : ""}${item.tipo === "cita" ? `<a data-exportar-google="${itemId(item)}" target="_blank" rel="noopener noreferrer">Preparar en Google</a><button type="button" data-ics="${itemId(item)}">Descargar .ics</button>` : ""}`;
    return `<article class="agenda-item agenda-${item.tipo}"><span class="agenda-etiqueta">${icono(item)} ${etiqueta(item)}</span><h3>${esc(item.titulo || "Sin título")}</h3><p>${esc(meta)}</p>${item.tipo === "recordatorio" && item.completado ? "<strong>Completado</strong>" : ""}${item.tipo === "google" ? `<p>${esc(item.calendarioNombre)}</p>` : ""}<div class="agenda-acciones">${acciones}</div></article>`;
  }
  function periodo() {
    const base = new Date(`${seleccion}T12:00:00`);
    if (vista === "dia") return [seleccion,seleccion];
    if (vista === "semana") { const lunes = new Date(base); lunes.setDate(base.getDate() - (base.getDay()+6)%7); return [dia(lunes),sumarDias(dia(lunes),6)]; }
    const primero = `${seleccion.slice(0,7)}-01`;
    const ultimo = dia(new Date(base.getFullYear(),base.getMonth()+1,0));
    return [primero,ultimo];
  }
  const periodoGoogle = () => { let [inicio,fin] = periodo(); if (vista === "mes") { inicio = sumarDias(inicio,-(new Date(`${inicio}T12:00:00`).getDay()+6)%7); fin = sumarDias(inicio,41); } const convertir = valor => { const [anio,mes,dia] = valor.split("-").map(Number); return fechaHoraUtc({anio,mes,dia},{hora:0,minuto:0})?.toISOString(); }; return { desde:convertir(inicio), hasta:convertir(sumarDias(fin,1)) }; };
  function mini(item) { return `<span class="agenda-mini agenda-${item.tipo}">${icono(item)} <span class="sr-only">${etiqueta(item)}: </span>${esc(item.titulo || "Sin título")}</span>`; }
  function renderCalendario(lista) {
    const [inicio,fin] = periodo();
    const base = vista === "mes" ? sumarDias(inicio,-(new Date(`${inicio}T12:00:00`).getDay()+6)%7) : inicio;
    const total = vista === "mes" ? 42 : vista === "semana" ? 7 : 1;
    let html = `<div class="agenda-cuadricula agenda-vista-${vista}">`;
    if (vista !== "dia") html += ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(n => `<span class="agenda-semana">${n}</span>`).join("");
    for (let i=0;i<total;i++) {
      const valor = sumarDias(base,i), delDia = lista.filter(item => enDia(item,valor));
      const otros = Math.max(0,delDia.length-3);
      html += `<button type="button" class="agenda-dia${valor === seleccion ? " seleccionada" : ""}${valor === hoy ? " hoy" : ""}${vista === "mes" && valor.slice(0,7) !== seleccion.slice(0,7) ? " fuera" : ""}" data-dia="${valor}" aria-pressed="${valor === seleccion}" aria-label="${esc(fechaBonita(valor))}, ${delDia.length} elementos"><strong>${Number(valor.slice(8))}</strong>${delDia.length ? `<span class="agenda-cantidad">${delDia.length} elem.</span>` : ""}${delDia.slice(0,3).map(mini).join("")}${otros ? `<span class="agenda-mas">+${otros} más</span>` : ""}</button>`;
    }
    return html + "</div>";
  }
  function exportaciones(lista) {
    nodo("vistaAgenda").querySelectorAll("[data-exportar-google]").forEach(a => {
      const item = lista.find(i => i.id === a.dataset.exportarGoogle);
      const datos = item && datosCalendario({titulo:item.titulo,fecha:item.fecha,fechaFin:item.fechaFin,hora:item.todoElDia ? "" : item.hora,horaFin:item.todoElDia ? "" : item.horaFin,lugar:item.lugar,descripcion:item.notas});
      if (datos) a.href = urlGoogleCalendar(datos); else a.remove();
    });
  }
  function renderAvisos() {
    const lista = AvisosGilena.pendientes(), ahora = Date.now();
    const proximos = lista.filter(i => i.cuando.getTime() > ahora).slice(0,5);
    const vencidos = lista.filter(i => i.cuando.getTime() <= ahora && !AvisosGilena.enviado(i.clave)).slice(-5);
    const completados = PerfilesGilena.elementos().filter(i => i.tipo === "recordatorio" && i.completado).slice(-5);
    nodo("resumenAvisos").textContent = `${vencidos.length} pendientes`;
    nodo("estadoNotificaciones").textContent = estadoPermisoNotificaciones();
    nodo("listaAvisos").innerHTML = `<h3>Próximos recordatorios</h3>${proximos.length ? proximos.map(i => `<p>${esc(i.titulo)} · ${esc(i.cuando.toLocaleString("es-ES"))}</p>`).join("") : "<p>No hay avisos próximos.</p>"}<h3>Avisos vencidos pendientes</h3>${vencidos.length ? vencidos.map(i => `<p>${esc(i.titulo)} · ${esc(i.cuando.toLocaleString("es-ES"))}</p>`).join("") : "<p>No hay avisos vencidos.</p>"}<h3>Recordatorios completados</h3>${completados.length ? completados.map(i => `<p>${esc(i.titulo)}</p>`).join("") : "<p>Aún no hay recordatorios completados.</p>"}`;
  }
  function render() {
    const todos = elementos(), lista = todos.filter(visible), [inicio,fin] = periodo();
    const diaSeleccionado = lista.filter(i => enDia(i,seleccion));
    const sinFecha = todos.filter(i => i.tipo === "anotacion" && !i.fecha && visible(i));
    nodo("tituloPeriodo").textContent = vista === "dia" ? fechaBonita(seleccion) : vista === "semana" ? `${fechaBonita(inicio)} — ${fechaBonita(fin)}` : new Date(`${seleccion}T12:00:00`).toLocaleDateString("es-ES",{month:"long",year:"numeric"});
    nodo("tituloDia").textContent = fechaBonita(seleccion);
    nodo("resumenAgenda").innerHTML = `<span>${todos.filter(i => i.tipo === "cita" || i.tipo === "google").filter(i => enDia(i,hoy)).length} citas hoy</span><span>${PerfilesGilena.elementos().filter(i => i.tipo === "recordatorio" && !i.completado && i.fecha >= hoy).length} recordatorios próximos</span><span>${PerfilesGilena.elementos().filter(i => i.tipo === "anotacion").length} anotaciones</span>`;
    nodo("vistaAgenda").innerHTML = vista === "lista" ? `<div class="agenda-lista">${lista.filter(i => i.fecha && i.fecha <= fin && (i.fechaFin || i.fecha) >= inicio).map(tarjeta).join("") || '<div class="agenda-vacio"><p>No hay elementos en este período.</p><button type="button" data-nuevo="cita">Añadir una cita</button></div>'}</div>` : renderCalendario(lista);
    nodo("elementosDia").innerHTML = diaSeleccionado.map(tarjeta).join("") || '<div class="agenda-vacio"><p>Este día está libre.</p><button type="button" data-nuevo="cita">Añadir una cita</button></div>';
    nodo("notasSinFecha").innerHTML = sinFecha.map(tarjeta).join("") || '<div class="agenda-vacio"><p>No hay notas sin fecha.</p><button type="button" data-nuevo="anotacion">Crear anotación</button></div>';
    nodo("copiarFavoritos").hidden = !PerfilesGilena.pendientesDeCopia();
    app.querySelectorAll("[data-vista]").forEach(b => b.setAttribute("aria-pressed",String(b.dataset.vista === vista)));
    exportaciones(todos); renderAvisos();
  }
  function controlesGoogle(texto = "") {
    const estado = GoogleAgenda.estado(), conectado = estado.conectado;
    nodo("conectarGoogle").hidden = conectado; nodo("actualizarGoogle").hidden = !conectado; nodo("desconectarGoogle").hidden = !conectado;
    const selector = nodo("googleCalendario"), anterior = googleCalendarId;
    selector.replaceChildren(); selector.disabled = !conectado || !estado.calendarios.length;
    if (!conectado || !estado.calendarios.length) selector.add(new Option(conectado ? "Sin calendarios" : "Sin conexión", ""));
    estado.calendarios.forEach(c => selector.add(new Option(`${c.summaryOverride || c.summary || c.id} · ${escribible(c) ? "escritura" : "solo lectura"}`,c.id)));
    googleCalendarId = conectado && estado.calendarios.some(c => c.id === anterior) ? anterior : conectado ? estado.calendarios.find(c => c.primary)?.id || estado.calendarios[0]?.id || "" : "";
    selector.value = googleCalendarId;
    nodo("googleResumen").textContent = conectado ? (calendario(googleCalendarId)?.summary || "Conectado temporalmente") : "Sin conexión";
    nodo("googleEstado").textContent = texto || estado.motivo || (conectado ? `Calendario seleccionado: ${calendario(googleCalendarId)?.summary || googleCalendarId}. ${escribible(calendario(googleCalendarId)) ? "Permiso de escritura." : "Solo lectura."}` : estado.configurado ? "Conecta para ver tus calendarios." : "Falta el Client ID en JS/google-config.js. La agenda local sigue disponible.");
    const destino = campo("destino"), elegido = destino.value;
    destino.replaceChildren(new Option("Agenda local","local"));
    estado.calendarios.filter(escribible).forEach(c => destino.add(new Option(`Google: ${c.summaryOverride || c.summary || c.id}`,c.id)));
    if (googleEditando && !Array.from(destino.options).some(o => o.value === googleEditando.calendarioId)) destino.add(new Option("Google (sin permiso)",googleEditando.calendarioId));
    destino.value = googleEditando?.calendarioId || (Array.from(destino.options).some(o => o.value === elegido) ? elegido : "local");
    ayudaAviso();
  }
  async function cargarGoogle({ calendarios = false } = {}) {
    if (!GoogleAgenda.estado().conectado) return;
    const solicitud = ++cargando;
    nodo("googleEstado").textContent = "Actualizando Google Calendar…";
    try {
      if (calendarios) await GoogleAgenda.cargarCalendarios();
      controlesGoogle();
      if (!googleCalendarId) return;
      const {desde,hasta} = periodoGoogle();
      if (!desde || !hasta) throw new Error("No se pudo calcular el período visible.");
      await GoogleAgenda.cargarEventos(googleCalendarId,desde,hasta);
      if (solicitud === cargando) nodo("googleEstado").textContent = "Eventos de Google actualizados para el período visible.";
    } catch (error) { if (solicitud === cargando) nodo("googleEstado").textContent = error.message; }
    finally { render(); }
  }
  function ayudaAviso() {
    const destino = campo("destino").value, esGoogle = googleEditando || destino !== "local";
    nodo("ayudaAviso").textContent = esGoogle ? "Este aviso se configurará en Google Calendar. Su entrega depende de los ajustes de notificación de tu cuenta de Google." : "Este aviso local se mostrará mientras tengas la agenda abierta y el navegador lo permita.";
    const predeterminado = campo("avisoMinutos").querySelector('[value="predeterminado"]');
    predeterminado.hidden = !esGoogle;
    if (!esGoogle && campo("avisoMinutos").value === "predeterminado") campo("avisoMinutos").value = "-1";
  }
  function camposTipo() {
    const tipo = campo("tipo").value;
    nodo("camposFecha").hidden = false;
    nodo("camposNota").hidden = tipo !== "anotacion";
    nodo("camposAviso").hidden = tipo === "anotacion";
    nodo("destinoAgendaLabel").hidden = tipo !== "cita";
    nodo("fechaFinLabel").hidden = tipo !== "cita";
    nodo("horaFinLabel").hidden = tipo !== "cita";
    nodo("todoElDiaLabel").hidden = tipo !== "cita";
    nodo("horaInicioLabel").hidden = tipo === "anotacion" || (tipo === "cita" && campo("todoElDia").checked);
    nodo("lugarLabel").hidden = tipo !== "cita";
    nodo("notasLabel").hidden = tipo === "anotacion";
    if (tipo !== "cita") campo("destino").value = "local";
    ayudaAviso();
  }
  function abrirEditor(tipo = "cita", item = null) {
    focoEditor = document.activeElement;
    googleEditando = null;
    form.reset(); campo("id").value = item?.id || ""; campo("tipo").value = item?.tipo || tipo;
    for (const k of ["titulo","fecha","hora","fechaFin","horaFin","lugar","notas","contenido"]) campo(k).value = item?.[k] || "";
    campo("todoElDia").checked = !!item?.todoElDia;
    campo("avisoMinutos").value = item?.avisoMinutos ?? (tipo === "recordatorio" ? "0" : "-1");
    campo("destino").disabled = false; campo("tipo").disabled = false;
    nodo("actualizarCitaGoogle").hidden = true; nodo("opcionesAdicionales").open = Boolean(item?.lugar || item?.notas);
    nodo("errorAgenda").textContent = ""; editorSucia = false;
    nodo("tituloEditor").textContent = item ? `Editar ${item.tipo === "recordatorio" ? "recordatorio" : item.tipo === "anotacion" ? "anotación" : "cita"}` : `Añadir ${tipo === "recordatorio" ? "recordatorio" : tipo === "anotacion" ? "anotación" : "cita"}`;
    camposTipo(); editor.showModal(); campo("titulo").focus();
  }
  function cerrarEditor(forzar = false) {
    if (editorSucia && !forzar && !confirm("Hay cambios sin guardar. ¿Cerrar el editor y descartarlos?")) return;
    editorSucia = false; editor.close(); googleEditando = null; campo("destino").disabled = false; campo("tipo").disabled = false; focoEditor?.focus?.();
  }
  function itemFormulario() {
    const f = form.elements, tipo = f.tipo.value;
    const item = { id:f.id.value || PerfilesGilena.uid(), tipo, titulo:f.titulo.value.trim(), fecha:f.fecha.value };
    if (tipo === "cita") Object.assign(item,{ fechaFin:f.fechaFin.value, hora:f.todoElDia.checked ? "" : f.hora.value, horaFin:f.todoElDia.checked ? "" : f.horaFin.value, todoElDia:f.todoElDia.checked, lugar:f.lugar.value.trim(), notas:f.notas.value.trim(), avisoMinutos:f.avisoMinutos.value });
    if (tipo === "recordatorio") Object.assign(item,{ hora:f.hora.value, notas:f.notas.value.trim(), avisoMinutos:f.avisoMinutos.value, completado:PerfilesGilena.elementos().find(i => i.id === item.id)?.completado || false });
    if (tipo === "anotacion") item.contenido = f.contenido.value.trim();
    return item;
  }
  function validar(item) {
    if (!item.titulo) return "El título es obligatorio.";
    if (item.tipo === "anotacion") { if (!item.contenido) return "Escribe el contenido de la anotación."; return item.fecha && !fechaValida(item.fecha) ? "La fecha no es válida." : ""; }
    if (!fechaValida(item.fecha)) return "Indica una fecha válida.";
    if (item.tipo === "recordatorio" && !horaLocalValida(item.fecha,item.hora)) return "Indica una hora local válida para el recordatorio.";
    if (item.tipo === "cita" && !item.todoElDia && !horaLocalValida(item.fecha,item.hora)) return "Indica una hora inicial local válida.";
    if (item.fechaFin && !fechaValida(item.fechaFin)) return "La fecha final no es válida.";
    if (item.fechaFin && item.fechaFin < item.fecha) return "La fecha final no puede ser anterior a la inicial.";
    if (item.horaFin && !leerHora(item.horaFin)) return "La hora final no es válida.";
    if (item.horaFin && !item.fechaFin) item.fechaFin = item.fecha;
    if (item.horaFin && !horaLocalValida(item.fechaFin,item.horaFin)) return "La hora final no existe en la fecha elegida.";
    if (item.tipo === "cita" && !item.todoElDia && item.horaFin && `${item.fechaFin}T${item.horaFin}` <= `${item.fecha}T${item.hora}`) return "El final debe ser posterior al inicio.";
    return "";
  }
  async function guardarFormulario(evento) {
    evento.preventDefault();
    if (guardando) return;
    const item = itemFormulario(), fallo = validar(item);
    if (fallo) { nodo("errorAgenda").textContent = fallo; return; }
    const destino = item.tipo === "cita" ? campo("destino").value : "local";
    guardando = true; const boton = form.querySelector('[type="submit"]'); boton.disabled = true; nodo("errorAgenda").textContent = "";
    try {
      if (googleEditando || destino !== "local") {
        GoogleAgenda.comprobarAcceso();
        const calId = googleEditando?.calendarioId || destino, cal = calendario(calId);
        if (!escribible(cal)) throw new Error("Este calendario de Google no permite guardar citas.");
        const cuerpo = GoogleFechas.cuerpo(item,googleEditando?.zona || GoogleFechas.ZONA);
        if (googleEditando && String(item.avisoMinutos) === String(googleEditando.avisoMinutos)) delete cuerpo.reminders;
        const respuesta = googleEditando ? await GoogleAgenda.editar(calId,googleEditando.eventoId,cuerpo,googleEditando.etag) : await GoogleAgenda.crear(calId,cuerpo);
        if (!respuesta?.id) throw new Error("Google no confirmó el guardado. Actualiza antes de repetir.");
        googleCalendarId = calId; cerrarEditor(true); mensaje("Cita guardada en Google Calendar."); await cargarGoogle();
      } else {
        const previos = PerfilesGilena.elementos();
        const nuevos = campo("id").value ? previos.map(i => i.id === item.id ? { ...i,...item } : i) : [...previos,item];
        if (!PerfilesGilena.guardarElementos(nuevos)) throw new Error(PerfilesGilena.errorGuardado);
        cerrarEditor(true); mensaje("Elemento guardado en la agenda local."); AvisosGilena.recalcular(); render();
      }
    } catch (error) { nodo("errorAgenda").textContent = error.message; if (["conflicto","sin_version"].includes(error.codigo) && googleEditando) nodo("actualizarCitaGoogle").hidden = false; }
    finally { guardando = false; boton.disabled = false; }
  }
  async function editarGoogle(item) {
    try {
      const original = await GoogleAgenda.obtener(item.calendarioId,item.eventoId);
      const vigente = GoogleFechas.normalizar(original,calendario(item.calendarioId));
      if (!vigente?.puedeEditar) throw new Error("Este calendario es de solo lectura o la cita ya no permite edición.");
      abrirEditor("cita",{ ...vigente,...GoogleFechas.datosParaEditar(vigente),tipo:"cita",id:"" });
      googleEditando = vigente; controlesGoogle(); campo("destino").value = vigente.calendarioId; campo("destino").disabled = true; campo("tipo").disabled = true; camposTipo();
      nodo("tituloEditor").textContent = vigente.recurrente ? "Editar solo esta aparición de Google" : "Editar cita de Google";
    } catch (error) { mensaje(error.message); }
  }
  function verGoogle(item) {
    nodo("tituloDetalleGoogle").textContent = item.titulo;
    nodo("contenidoDetalleGoogle").innerHTML = `<p><strong>Evento de Google</strong> · ${esc(item.calendarioNombre)}</p><p>${esc(fechaBonita(item.fecha))}${item.fechaFin && item.fechaFin !== item.fecha ? ` — ${esc(fechaBonita(item.fechaFin))}` : ""}${item.todoElDia ? " · Todo el día" : item.hora ? ` · ${esc(item.hora)}` : ""}</p>${item.lugar ? `<p>Lugar: ${esc(item.lugar)}</p>` : ""}${item.notas ? `<p class="google-descripcion">${esc(item.notas)}</p>` : ""}${item.recurrente ? "<p>La edición afecta solo a esta aparición de la serie.</p>" : ""}${!item.puedeEditar ? "<p>Calendario de solo lectura: no se puede editar aquí.</p>" : ""}`;
    nodo("editarDetalleGoogle").hidden = !item.puedeEditar;
    nodo("editarDetalleGoogle").dataset.id = item.id;
    nodo("detalleGoogleDialog").showModal();
    (item.puedeEditar ? nodo("editarDetalleGoogle") : nodo("cerrarDetalleGoogle")).focus();
  }
  function datosMunicipalesGoogle(e) {
    const url = new URL(`evento.html?id=${encodeURIComponent(e.id)}`,location.href).href;
    const texto = [textoEvento(e),`Detalle municipal: ${url}`].filter(Boolean).join("\n\n");
    const todoElDia = !leerHora(e.hora);
    const fin = !todoElDia && !e.fechaFin && e.horaFin && e.horaFin <= e.hora ? sumarDias(e.fecha,1) : e.fechaFin || "";
    return { titulo:e.titulo || "Evento municipal", fecha:e.fecha, fechaFin:fin, hora:todoElDia ? "" : e.hora, horaFin:todoElDia ? "" : e.horaFin || "", todoElDia, lugar:[e.lugar,e.direccion].filter(Boolean).join(", "), notas:texto };
  }
  function cerrarCopia() { nodo("googleCopiaDialog").close(); municipalParaGoogle = null; }
  function abrirCopia(id) {
    const e = municipal(id);
    if (!e || !PerfilesGilena.favoritos().includes(String(id))) { mensaje("Primero guarda el evento municipal en favoritos."); return; }
    if (vinculo(id)) { mensaje("Este favorito ya tiene una copia vinculada en Google."); return; }
    municipalParaGoogle = e;
    const dlg = nodo("googleCopiaDialog"), selector = nodo("calendarioCopia");
    selector.replaceChildren(); GoogleAgenda.estado().calendarios.filter(escribible).forEach(c => selector.add(new Option(c.summaryOverride || c.summary || c.id,c.id)));
    nodo("resumenCopia").textContent = `Se creará una copia de «${e.titulo || "Sin título"}» (${fechaBonita(e.fecha)}${e.fechaFin ? ` a ${fechaBonita(e.fechaFin)}` : ""}${e.hora ? `, ${e.hora}` : ", todo el día"}) con lugar, descripción y enlace al detalle municipal. No se sincronizará automáticamente.`;
    nodo("errorCopia").textContent = GoogleAgenda.estado().conectado ? selector.options.length ? "" : "No hay calendarios con permiso de escritura." : "Conecta Google Calendar para continuar.";
    nodo("confirmarCopia").textContent = GoogleAgenda.estado().conectado ? "Crear copia en Google" : "Conectar Google Calendar";
    dlg.showModal(); nodo("confirmarCopia").focus();
  }
  async function confirmarCopia() {
    if (!municipalParaGoogle || guardando) return;
    if (!GoogleAgenda.estado().conectado) {
      try { await GoogleAgenda.conectar(); await GoogleAgenda.cargarCalendarios(); controlesGoogle(); const id = municipalParaGoogle.id; cerrarCopia(); abrirCopia(id); await cargarGoogle(); }
      catch (error) { nodo("errorCopia").textContent = error.message; }
      return;
    }
    const e = municipalParaGoogle, calId = nodo("calendarioCopia").value;
    if (vinculo(e.id)) { nodo("errorCopia").textContent = "Este favorito ya tiene una copia vinculada."; return; }
    if (!escribible(calendario(calId))) { nodo("errorCopia").textContent = "Elige un calendario con permiso de escritura."; return; }
    guardando = true; nodo("confirmarCopia").disabled = true; nodo("errorCopia").textContent = "Creando la copia en Google…";
    try {
      const cuerpo = GoogleFechas.cuerpo({ ...datosMunicipalesGoogle(e),avisoMinutos:nodo("avisoCopia").value });
      const creado = await GoogleAgenda.crear(calId,cuerpo);
      if (!creado?.id) throw new Error("Google no confirmó la creación. Actualiza el calendario antes de repetir.");
      const nuevo = { municipalId:String(e.id),calendarId:calId,eventId:creado.id,htmlLink:creado.htmlLink || "",firma:firmaMunicipal(e) };
      if (!PerfilesGilena.guardarVinculosGoogle([...PerfilesGilena.vinculosGoogle(),nuevo])) {
        vinculoTemporal = nuevo;
        throw new Error(`Google creó la copia, pero no se pudo guardar el vínculo en este navegador. Ábrela desde ${creado.htmlLink || "Google Calendar"} y evita crear otra copia.`);
      }
      cerrarCopia(); mensaje("Copia creada en Google Calendar. Es independiente del favorito local."); await cargarGoogle(); render();
    } catch (error) { nodo("errorCopia").textContent = error.message; }
    finally { guardando = false; nodo("confirmarCopia").disabled = false; }
  }
  async function actualizarCopia(id) {
    const e = municipal(id), v = vinculo(id);
    if (!e || !v) return;
    if (!GoogleAgenda.estado().conectado) { mensaje("Conecta Google Calendar para actualizar esta copia."); nodo("panelGoogle").open = true; return; }
    if (!escribible(calendario(v.calendarId))) { mensaje("No tienes permiso de escritura en el calendario de esta copia."); return; }
    if (!confirm(`Se actualizarán el título, las fechas, el lugar y la descripción de la copia de «${e.titulo}». No cambia el favorito local. ¿Continuar?`)) return;
    try {
      const actual = await GoogleAgenda.obtener(v.calendarId,v.eventId);
      const cuerpo = GoogleFechas.cuerpo(datosMunicipalesGoogle(e));
      const respuesta = await GoogleAgenda.editar(v.calendarId,v.eventId,cuerpo,actual.etag);
      if (!respuesta?.id) throw new Error("Google no confirmó la actualización.");
      const nuevos = PerfilesGilena.vinculosGoogle().map(item => item.municipalId === String(id) ? { ...item,firma:firmaMunicipal(e),htmlLink:respuesta.htmlLink || item.htmlLink } : item);
      if (!PerfilesGilena.guardarVinculosGoogle(nuevos)) throw new Error("Google actualizó la copia, pero no se pudo guardar su estado local. Evita repetir el cambio sin revisar Google Calendar.");
      mensaje("Copia vinculada actualizada en Google Calendar."); await cargarGoogle(); render();
    } catch (error) { mensaje(error.message); }
  }
  function menuAnadir(abrir) { nodo("menuAnadir").hidden = !abrir; nodo("anadirAgenda").setAttribute("aria-expanded",String(abrir)); }
  function moverPeriodo(pasos) {
    const base = new Date(`${seleccion}T12:00:00`);
    if (vista === "dia") base.setDate(base.getDate()+pasos);
    else if (vista === "semana") base.setDate(base.getDate()+7*pasos);
    else { const d = base.getDate(); base.setDate(1); base.setMonth(base.getMonth()+pasos); base.setDate(Math.min(d,new Date(base.getFullYear(),base.getMonth()+1,0).getDate())); }
    seleccion = dia(base); GoogleAgenda.quitarEventos(); render(); cargarGoogle();
  }
  form.addEventListener("submit",guardarFormulario);
  form.addEventListener("input",() => { editorSucia = true; nodo("errorAgenda").textContent = ""; });
  campo("tipo").addEventListener("change",camposTipo);
  campo("todoElDia").addEventListener("change",camposTipo);
  campo("destino").addEventListener("change",ayudaAviso);
  editor.addEventListener("cancel",evento => { evento.preventDefault(); cerrarEditor(); });
  window.addEventListener("beforeunload",evento => { if (editor.open && editorSucia) { evento.preventDefault(); evento.returnValue = ""; } });
  nodo("googleCopiaDialog").addEventListener("cancel",evento => { evento.preventDefault(); cerrarCopia(); });
  app.addEventListener("click",async evento => {
    const b = evento.target.closest("button"); if (!b) return;
    if (b.id === "anadirAgenda") { menuAnadir(nodo("menuAnadir").hidden); return; }
    if (b.dataset.nuevo) { menuAnadir(false); abrirEditor(b.dataset.nuevo); campo("fecha").value = seleccion; return; }
    if (b.id === "irHoy") { seleccion = hoy; GoogleAgenda.quitarEventos(); render(); cargarGoogle(); return; }
    if (b.dataset.mover) { moverPeriodo(Number(b.dataset.mover)); return; }
    if (b.dataset.vista) { vista = b.dataset.vista; GoogleAgenda.quitarEventos(); render(); cargarGoogle(); return; }
    if (b.dataset.dia) { const anterior = seleccion; seleccion = b.dataset.dia; render(); if (seleccion.slice(0,7) !== anterior.slice(0,7)) { GoogleAgenda.quitarEventos(); cargarGoogle(); } return; }
    if (b.id === "cerrarEditor" || b.id === "cancelarAgenda") { cerrarEditor(); return; }
    if (b.dataset.editar) { const item = PerfilesGilena.elementos().find(i => i.id === b.dataset.editar); if (item) abrirEditor(item.tipo,item); return; }
    if (b.dataset.eliminar) {
      const item = PerfilesGilena.elementos().find(i => i.id === b.dataset.eliminar);
      if (item && confirm(`¿Eliminar «${item.titulo}» de tu agenda?`)) {
        if (PerfilesGilena.guardarElementos(PerfilesGilena.elementos().filter(i => i.id !== item.id))) { mensaje("Elemento eliminado."); AvisosGilena.recalcular(); render(); }
        else mensaje(PerfilesGilena.errorGuardado);
      }
      return;
    }
    if (b.dataset.completar) {
      const previos = PerfilesGilena.elementos(), item = previos.find(i => i.id === b.dataset.completar);
      if (item && PerfilesGilena.guardarElementos(previos.map(i => i.id === item.id ? { ...i,completado:!i.completado } : i))) { AvisosGilena.recalcular(); render(); }
      else mensaje(PerfilesGilena.errorGuardado);
      return;
    }
    if (b.dataset.ics) {
      const item = PerfilesGilena.elementos().find(i => i.id === b.dataset.ics);
      const datos = item && datosCalendario({titulo:item.titulo,fecha:item.fecha,fechaFin:item.fechaFin,hora:item.todoElDia ? "" : item.hora,horaFin:item.todoElDia ? "" : item.horaFin,lugar:item.lugar,descripcion:item.notas});
      if (datos) descargarIcs(datos,item.id); else mensaje("No se pudo preparar el archivo .ics.");
      return;
    }
    if (b.dataset.verGoogle) {
      const item = elementos().find(i => i.tipo === "google" && i.id === b.dataset.verGoogle);
      if (!item) return;
      verGoogle(item);
      return;
    }
    if (b.id === "cerrarDetalleGoogle") { nodo("detalleGoogleDialog").close(); return; }
    if (b.id === "editarDetalleGoogle") { const item = elementos().find(i => i.tipo === "google" && i.id === b.dataset.id); nodo("detalleGoogleDialog").close(); if (item) editarGoogle(item); return; }
    if (b.id === "actualizarCitaGoogle" && googleEditando) {
      try {
        const original = await GoogleAgenda.obtener(googleEditando.calendarioId,googleEditando.eventoId);
        const vigente = GoogleFechas.normalizar(original,calendario(googleEditando.calendarioId));
        if (!vigente?.puedeEditar) throw new Error("Ya no tienes permiso para editar esta cita.");
        googleEditando = vigente; nodo("errorAgenda").textContent = "Versión de Google actualizada. Revisa los datos del formulario antes de guardar."; b.hidden = true;
      } catch (error) { nodo("errorAgenda").textContent = error.message; }
      return;
    }
    if (b.dataset.copiarGoogle) { abrirCopia(b.dataset.copiarGoogle); return; }
    if (b.dataset.abrirCopia) { const v = vinculo(b.dataset.abrirCopia); if (v?.htmlLink) abrirGoogle(v.htmlLink); else mensaje("La copia está vinculada, pero no hay enlace directo. Ábrela desde Google Calendar."); return; }
    if (b.dataset.actualizarCopia) { actualizarCopia(b.dataset.actualizarCopia); return; }
    if (b.id === "confirmarCopia") { confirmarCopia(); return; }
    if (b.id === "cancelarCopia") { cerrarCopia(); return; }
    if (b.id === "copiarFavoritosBoton" && confirm("¿Copiar los favoritos anteriores a este perfil? Los originales se conservarán.")) {
      if (PerfilesGilena.copiarFavoritosAnteriores()) { favoritos = PerfilesGilena.favoritos(); avisos = PerfilesGilena.avisos(); mensaje("Favoritos copiados."); AvisosGilena.recalcular(); render(); }
      else mensaje(PerfilesGilena.errorGuardado);
      return;
    }
    if (b.id === "activarNotificaciones") {
      if (!("Notification" in window) || !entornoValidoNotificaciones()) { renderAvisos(); return; }
      if (Notification.permission === "default") { try { await Notification.requestPermission(); } catch { mensaje("No se pudo solicitar el permiso de notificaciones."); } }
      renderAvisos(); AvisosGilena.recalcular(); return;
    }
    if (b.id === "conectarGoogle") {
      b.disabled = true; nodo("googleEstado").textContent = "Abriendo autorización de Google…";
      try { await GoogleAgenda.conectar(); await GoogleAgenda.cargarCalendarios(); controlesGoogle(); await cargarGoogle(); }
      catch (error) { nodo("googleEstado").textContent = error.message; }
      finally { b.disabled = false; }
      return;
    }
    if (b.id === "actualizarGoogle") { cargarGoogle({calendarios:true}); return; }
    if (b.id === "desconectarGoogle") {
      cargando++; const resultado = await GoogleAgenda.desconectar(); controlesGoogle(resultado?.error ? "Google se retiró de la vista, pero la revocación no se confirmó." : "Google Calendar desconectado. Los datos locales se conservan."); render(); return;
    }
  });
  app.addEventListener("change",evento => {
    if (evento.target.id === "filtroTipo") { filtro = evento.target.value; render(); }
    if (evento.target.id === "googleCalendario") { googleCalendarId = evento.target.value; GoogleAgenda.quitarEventos(); render(); cargarGoogle(); }
  });
  document.addEventListener("click",evento => { if (!evento.target.closest(".agenda-anadir-wrap")) menuAnadir(false); });
  document.addEventListener("keydown",evento => { if (evento.key === "Escape" && !nodo("menuAnadir").hidden) { menuAnadir(false); nodo("anadirAgenda").focus(); } });
  document.addEventListener("avisos:actualizados",renderAvisos);
  window.addEventListener("storage",evento => {
    if (evento.key === "eventos") {
      try { const guardados = JSON.parse(evento.newValue || "[]"); eventos = Array.isArray(guardados) ? guardados.filter(esEventoPublicado) : []; }
      catch { /* La lista en memoria anterior sigue disponible. */ }
    }
    if (evento.key?.includes("PerfilGilenaDemo") || evento.key === "eventos") { render(); AvisosGilena.recalcular(); }
  });
  GoogleAgenda.suscribir(() => { controlesGoogle(); render(); });
  controlesGoogle(); render();
  const pedido = new URLSearchParams(location.search).get("googleFavorito");
  if (pedido) { const e = municipal(pedido); if (e && PerfilesGilena.favoritos().includes(String(pedido))) { abrirCopia(pedido); history.replaceState(null,"",location.pathname); } }
})();
