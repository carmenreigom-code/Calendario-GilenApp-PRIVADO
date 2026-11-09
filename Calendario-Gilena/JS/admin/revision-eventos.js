/* Reglas compartidas para el editor, la revisión y el inicio. Sin peticiones de red. */
window.RevisionEventos = (() => {
  const F = InformacionEvento, hora = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const dia = (f,h) => F.fecha(f) ? new Date(`${f}T${h}`).getTime() : NaN;
  function intervalo(e) {
    return {inicio:dia(e.fecha,hora(e.hora)?`${e.hora}:00`:"00:00:00"),fin:dia(e.fechaFin||e.fecha,hora(e.horaFin)?`${e.horaFin}:00`:"23:59:59")};
  }
  function intervaloSesion(e,s) {
    const rango=intervalo(e), fecha=s.fecha||e.fecha;
    let inicio=dia(fecha,hora(s.hora)?`${s.hora}:00`:"00:00:00"), fin=dia(fecha,hora(s.horaFin||s.hora)?`${s.horaFin||s.hora}:00`:"23:59:59");
    // Un fin de madrugada solo pertenece al día siguiente si cabe en el evento definido.
    if (hora(s.hora)&&hora(s.horaFin)&&s.horaFin<s.hora) { const d=new Date(fin); d.setDate(d.getDate()+1); if (+d<=rango.fin && +d>inicio) fin=+d; }
    return {inicio,fin};
  }
  function situacion(e,ahora=Date.now()) { const r=intervalo(e); return !Number.isFinite(r.inicio)||!Number.isFinite(r.fin)||r.fin<r.inicio ? "sin-fecha" : ahora<r.inicio ? "proximos" : ahora>r.fin ? "finalizados" : "en-curso"; }
  const nombres={proximos:"Programado","en-curso":"En curso",finalizados:"Finalizado","sin-fecha":"Sin intervalo válido"};
  function analizar(e,{plantilla=false}={}) {
    const resultado=[], claves=new Set(), galeria=Array.isArray(e.galeria)?e.galeria:[];
    const add=(tipo,campo,mensaje)=>{const k=tipo+":"+campo;if(!claves.has(k)){claves.add(k);resultado.push({tipo,campo,mensaje})}};
    F.validar(e).forEach(([k,m])=>add("error",k,m));
    if(!plantilla&&e.revisionPlantillaPendiente===true) add("error","revisionPlantilla","Confirma que has revisado fechas, horarios, plazos y enlaces de la plantilla antes de publicar.");
    if(!plantilla&&!e.titulo?.trim()) add("error","titulo","Falta el título necesario para publicar.");
    if(!plantilla&&!F.fecha(e.fecha)) add("error","fecha","La fecha inicial no es válida o no se ha indicado.");
    for(const k of ["fecha","fechaFin"]) if(e[k]&&!F.fecha(e[k])) add("error",k,"La fecha no existe o no tiene un formato válido.");
    if(e.fechaFin&&F.fecha(e.fecha)&&e.fechaFin<e.fecha) add("error","fechaFin","La fecha final es anterior a la inicial.");
    for(const k of ["hora","horaFin"]) if(e[k]&&!hora(e[k])) add("error",k,"Introduce una hora válida.");
    const r=intervalo(e);
    if(e.hora&&e.horaFin&&r.fin<=r.inicio) add("error","horaFin","El fin debe ser posterior al inicio. Si termina de madrugada, indica la fecha del día siguiente.");
    for(const lista of ["programa","sesiones"]) if(Array.isArray(e[lista])) e[lista].forEach((s,i)=>{
      if(!s||typeof s!=="object") {add("error",lista,"Hay una actividad no válida.");return;}
      if(s.fecha&&!F.fecha(s.fecha)) add("error",`${lista}.${i}.fecha`,"La fecha de la actividad no es válida.");
      for(const k of ["hora","horaFin"]) if(s[k]&&!hora(s[k])) add("error",`${lista}.${i}.${k}`,"La hora de la actividad no es válida.");
      const v=intervaloSesion(e,s);
      if(lista==="sesiones"&&s.hora&&s.horaFin&&v.fin<=v.inicio) add("error",`${lista}.${i}.horaFin`,"El fin de la sesión debe ser posterior al inicio y quedar dentro del evento.");
      if(Number.isFinite(r.inicio)&&Number.isFinite(r.fin)&&r.fin>=r.inicio&&F.fecha(s.fecha||e.fecha)) {
        const f=s.fecha||e.fecha;
        const fuera=f<e.fecha||f>(e.fechaFin||e.fecha)||(hora(s.hora)&&v.inicio<r.inicio)||(hora(s.horaFin||s.hora)&&v.fin>r.fin);
        const campoFuera=f<e.fecha||f>(e.fechaFin||e.fecha)?"fecha":v.inicio<r.inicio?"hora":s.horaFin?"horaFin":"hora";
        if(fuera) add("error",`${lista}.${i}.${campoFuera}`,`${lista==="sesiones"?"La sesión":"La actividad"} ${i+1} queda fuera del intervalo del evento.`);
      }
    });
    for(const k of ["urlReserva","web","instagram","facebook","otroEnlace"]) if(e[k]&&!F.url(e[k])) add("error",k,"Usa un enlace completo con protocolo https:// o http://.");
    if(e.googleMapsUrl&&!DetalleEvento.urlGoogleMaps(e.googleMapsUrl)) add("error","googleMapsUrl","El enlace de Google Maps no tiene un formato permitido.");
    if(e.aforo!==""&&e.aforo!=null&&(!/^\d+$/.test(String(e.aforo))||!Number.isSafeInteger(+e.aforo)||+e.aforo<=0)) add("error","aforo","El aforo debe ser un entero positivo.");
    if(e.correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.correo)) add("error","correo","Introduce un correo válido.");
    if(e.telefono&&!/^[+\d\s().-]{6,25}$/.test(e.telefono)) add("error","telefono","Introduce un teléfono válido.");
    const tiene=["imagen","imagenTarjeta","imagenCarrusel","cartel"].some(k=>ImagenesEvento.urlImagen(e[k]))||galeria.some(v=>ImagenesEvento.urlImagen(v));
    if(!tiene) add("recomendacion","imagen","Puedes añadir una imagen para presentar el evento.");
    else if(["imagen","imagenTarjeta","imagenCarrusel","cartel"].some(k=>e[k]&&!String(e.imagenMetadatos?.[k]?.alt||"").trim())||galeria.some((v,i)=>v&&!String(e.imagenMetadatos?.[`galeria:${i}`]?.alt||"").trim())) add("recomendacion","imagenMetadatos","Revisa el texto alternativo de las imágenes utilizadas.");
    if(!e.lugar?.trim()) add("recomendacion","lugar","Puedes indicar el lugar del evento.");
    if(["si","abiertas","agotadas"].includes(e.reservas)||/inscrip|reserva|obligatori|necesari/i.test(e.reservas||"")) if(!e.urlReserva&&!e.telefono&&!e.correo&&!(e.contactos||[]).some(c=>c.url||c.telefono||c.correo)) add("recomendacion","urlReserva","Se indica inscripción, pero no hay enlace ni contacto para reservar.");
    if(e.inscripcionFin&&Number.isFinite(r.fin)&&new Date(e.inscripcionFin).getTime()>r.fin) add("recomendacion","inscripcionFin","El plazo de inscripción permanece abierto después de finalizar el evento.");
    return resultado;
  }
  return {intervalo,intervaloSesion,situacion,nombres,analizar,hora};
})();
