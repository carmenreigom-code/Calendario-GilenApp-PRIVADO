/* Conversión entre los períodos de la agenda municipal y Google Calendar. */
window.GoogleFechas = (() => {
  const ZONA = "Europe/Madrid";
  function sumar(fecha, dias) {
    const [a,m,d] = fecha.split("-").map(Number);
    return new Date(Date.UTC(a,m-1,d+dias)).toISOString().slice(0,10);
  }
  function partes(instante, zona = ZONA) {
    const lista = new Intl.DateTimeFormat("en-GB", { timeZone:zona, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(instante);
    const p = Object.fromEntries(lista.map(x => [x.type,x.value]));
    return { fecha:`${p.year}-${p.month}-${p.day}`, hora:`${p.hour}:${p.minute}` };
  }
  function normalizar(evento, calendario) {
    if (!evento?.id || !evento.start || !evento.end || evento.status === "cancelled") return null;
    const todoElDia = !!evento.start.date;
    let inicio, fin;
    if (todoElDia) {
      inicio = { fecha:evento.start.date, hora:"" };
      fin = { fecha:sumar(evento.end.date || sumar(evento.start.date,1), -1), hora:"" };
    } else {
      const start = new Date(evento.start.dateTime), end = new Date(evento.end.dateTime);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
      inicio = partes(start);
      fin = partes(new Date(Math.max(start.getTime(),end.getTime()-1)));
    }
    return {
      tipo:"google", id:`google:${calendario.id}:${evento.id}`, calendarioId:calendario.id, eventoId:evento.id,
      calendarioNombre:calendario.summaryOverride || calendario.summary || calendario.id,
      titulo:evento.summary || "Sin detalles disponibles", fecha:inicio.fecha, fechaFin:fin.fecha,
      hora:inicio.hora, todoElDia, lugar:evento.location || "", notas:evento.description || "",
      htmlLink:evento.htmlLink || "", etag:evento.etag || "", recurrente:!!evento.recurringEventId,
      avisoMinutos:evento.reminders?.useDefault === false ? (evento.reminders.overrides?.find(r => r.method === "popup")?.minutes ?? -1) : "predeterminado",
      puedeEditar:["writer","owner","writerWithoutPrivateAccess"].includes(calendario.accessRole) && !(calendario.accessRole === "writerWithoutPrivateAccess" && evento.visibility === "private") && evento.locked !== true && (!evento.eventType || evento.eventType === "default"),
      original:evento, zona:evento.start.timeZone || calendario.timeZone || ZONA
    };
  }
  function datosParaEditar(item) {
    const evento = item.original, zona = item.zona;
    if (item.todoElDia) return { fecha:evento.start.date, fechaFin:sumar(evento.end.date,-1), hora:"", horaFin:"", todoElDia:true, zona };
    const inicio = partes(new Date(evento.start.dateTime),zona);
    const fin = partes(new Date(evento.end.dateTime),zona);
    return { fecha:inicio.fecha, hora:inicio.hora, fechaFin:fin.fecha, horaFin:fin.hora, todoElDia:false, zona };
  }
  function cuerpo(item, zona = ZONA) {
    const base = { summary:item.titulo, description:item.notas || "", location:item.lugar || "" };
    if (item.avisoMinutos !== undefined && item.avisoMinutos !== "predeterminado") {
      const minutos = Number(item.avisoMinutos);
      base.reminders = { useDefault:false, overrides:Number.isInteger(minutos) && minutos >= 0 && minutos <= 40320 ? [{ method:"popup", minutes:minutos }] : [] };
    }
    if (item.todoElDia) return { ...base, start:{ date:item.fecha }, end:{ date:sumar(item.fechaFin || item.fecha,1) } };
    let finFecha = item.fechaFin || item.fecha;
    let finHora = item.horaFin;
    if (!finHora) {
      if (finFecha > item.fecha) finHora = item.hora;
      else {
        const [h,m] = item.hora.split(":").map(Number);
        const fin = new Date(Date.UTC(2000,0,1,h+1,m));
        finHora = fin.toISOString().slice(11,16);
        if (fin.getUTCDate() !== 1) finFecha = sumar(item.fecha,1);
      }
    }
    return { ...base, start:{ dateTime:`${item.fecha}T${item.hora}:00`, timeZone:zona }, end:{ dateTime:`${finFecha}T${finHora}:00`, timeZone:zona } };
  }
  function periodo(mes) {
    const inicio = new Date(mes.getFullYear(),mes.getMonth(),1);
    const fin = new Date(mes.getFullYear(),mes.getMonth()+1,1);
    const cero = { hora:0, minuto:0 };
    const partesFecha = d => ({ anio:d.getFullYear(), mes:d.getMonth()+1, dia:1 });
    return { desde:fechaHoraUtc(partesFecha(inicio),cero).toISOString(), hasta:fechaHoraUtc(partesFecha(fin),cero).toISOString() };
  }
  return { ZONA, sumar, partes, normalizar, datosParaEditar, cuerpo, periodo };
})();
