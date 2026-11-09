// El administrador guarda fechas YYYY-MM-DD y horas HH:MM, sin zona horaria.
const ZONA_EVENTOS = "Europe/Madrid";
const formatoMadrid = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONA_EVENTOS, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

function leerFecha(valor) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ""));
  if (!partes) return null;
  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
    ? { anio, mes, dia } : null;
}

function leerHora(valor) {
  const partes = /^(\d{2}):(\d{2})$/.exec(String(valor || ""));
  if (!partes) return null;
  const hora = Number(partes[1]);
  const minuto = Number(partes[2]);
  return hora < 24 && minuto < 60 ? { hora, minuto } : null;
}

function sumarDias(fecha, dias) {
  const siguiente = new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia + dias));
  return { anio: siguiente.getUTCFullYear(), mes: siguiente.getUTCMonth() + 1, dia: siguiente.getUTCDate() };
}

function fechaIcs(fecha) {
  return `${fecha.anio}${String(fecha.mes).padStart(2, "0")}${String(fecha.dia).padStart(2, "0")}`;
}

function fechaHoraUtc(fecha, hora) {
  const objetivo = Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia, hora.hora, hora.minuto);
  let instante = objetivo;
  for (let intento = 0; intento < 3; intento++) {
    const partes = Object.fromEntries(formatoMadrid.formatToParts(instante).map(({ type, value }) => [type, Number(value)]));
    const representado = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second);
    const diferencia = objetivo - representado;
    if (diferencia === 0) return new Date(instante);
    instante += diferencia;
  }
  return null; // Una hora inexistente durante el cambio al horario de verano.
}

function textoEvento(evento) {
  if (typeof evento.descripcion === "string" && evento.descripcion.trim()) return evento.descripcion.trim();
  if (typeof evento.descripcion_larga !== "string" || !evento.descripcion_larga.trim()) return "";
  const html = evento.descripcion_larga.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n");
  return new DOMParser().parseFromString(html, "text/html").body.textContent.trim();
}

function datosCalendario(evento) {
  const inicio = leerFecha(evento.fecha);
  if (!inicio) return null;
  const finRegistrado = leerFecha(evento.fechaFin);
  const finFecha = finRegistrado && fechaIcs(finRegistrado) >= fechaIcs(inicio) ? finRegistrado : inicio;
  const titulo = typeof evento.titulo === "string" ? evento.titulo.trim() : "";
  const ubicaciones = [evento.lugar, evento.direccion].filter((valor) => typeof valor === "string" && valor.trim()).map((valor) => valor.trim());
  const lugar = ubicaciones.filter((valor, indice) => indice === 0 || valor !== ubicaciones[0]).join(", ");
  const descripcion = textoEvento(evento);
  const horaInicio = leerHora(evento.hora);

  if (!horaInicio) {
    return { titulo, lugar, descripcion, todoElDia: true, inicio: fechaIcs(inicio), fin: fechaIcs(sumarDias(finFecha, 1)) };
  }

  const empieza = fechaHoraUtc(inicio, horaInicio);
  if (!empieza) return null;
  const horaFin = leerHora(evento.horaFin);
  let termina = horaFin ? fechaHoraUtc(finFecha, horaFin) : fechaHoraUtc(finFecha, horaInicio);
  if (!termina) return null;
  if (!horaFin) termina = new Date(termina.getTime() + 3600000);
  else if (termina <= empieza && fechaIcs(finFecha) === fechaIcs(inicio)) {
    termina = fechaHoraUtc(sumarDias(finFecha, 1), horaFin);
  }
  if (!termina || termina <= empieza) return null;
  return { titulo, lugar, descripcion, todoElDia: false, inicio: empieza, fin: termina };
}

function fechaUtcIcs(fecha) {
  return fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function urlGoogleCalendar(datos) {
  const parametros = new URLSearchParams({
    action: "TEMPLATE", text: datos.titulo,
    dates: `${datos.todoElDia ? datos.inicio : fechaUtcIcs(datos.inicio)}/${datos.todoElDia ? datos.fin : fechaUtcIcs(datos.fin)}`,
    ctz: ZONA_EVENTOS
  });
  if (datos.lugar) parametros.set("location", datos.lugar);
  if (datos.descripcion) parametros.set("details", datos.descripcion);
  return `https://calendar.google.com/calendar/render?${parametros}`;
}

function escaparIcs(texto) {
  return String(texto).replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function plegarIcs(linea) {
  const codificador = new TextEncoder();
  const partes = [];
  let actual = "";
  let bytes = 0;
  for (const caracter of linea) {
    const longitud = codificador.encode(caracter).length;
    if (bytes + longitud > 75) { partes.push(actual); actual = " "; bytes = 1; }
    actual += caracter;
    bytes += longitud;
  }
  partes.push(actual);
  return partes.join("\r\n");
}

function contenidoIcs(datos, id) {
  const identificador = String(id ?? "evento").replace(/[^a-zA-Z0-9-]/g, "-");
  const lineas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ayuntamiento de Gilena//Calendario Municipal//ES",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:gilena-${identificador}@calendario-municipal.local`,
    `DTSTAMP:${fechaUtcIcs(new Date())}`,
    datos.todoElDia ? `DTSTART;VALUE=DATE:${datos.inicio}` : `DTSTART:${fechaUtcIcs(datos.inicio)}`,
    datos.todoElDia ? `DTEND;VALUE=DATE:${datos.fin}` : `DTEND:${fechaUtcIcs(datos.fin)}`,
    `SUMMARY:${escaparIcs(datos.titulo)}`
  ];
  if (datos.lugar) lineas.push(`LOCATION:${escaparIcs(datos.lugar)}`);
  if (datos.descripcion) lineas.push(`DESCRIPTION:${escaparIcs(datos.descripcion)}`);
  lineas.push("END:VEVENT", "END:VCALENDAR");
  return lineas.map(plegarIcs).join("\r\n") + "\r\n";
}

function descargarIcs(datos, id) {
  const archivo = new Blob([contenidoIcs(datos, id)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `evento-gilena-${String(id ?? "calendario").replace(/[^a-zA-Z0-9-]/g, "-")}.ics`;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
