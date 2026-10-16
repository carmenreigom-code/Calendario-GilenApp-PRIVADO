function formatearRangoEvento(inicio, fin) {
    const leer = (valor) => {
        const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ""));
        if (!partes) return null;
        const anio = Number(partes[1]);
        const mes = Number(partes[2]);
        const dia = Number(partes[3]);
        const fecha = new Date(Date.UTC(anio, mes - 1, dia));
        return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() + 1 === mes && fecha.getUTCDate() === dia
            ? { anio, mes, dia, fecha } : null;
    };
    const primero = leer(inicio);
    if (!primero) return "";
    const ultimo = leer(fin);
    const mesTexto = (valor) => valor.fecha.toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
    const fechaCompleta = (valor) => `${valor.dia} de ${mesTexto(valor)} de ${valor.anio}`;
    if (!ultimo || ultimo.fecha <= primero.fecha) return fechaCompleta(primero);
    if (primero.anio === ultimo.anio && primero.mes === ultimo.mes) {
        return `Del ${primero.dia} al ${ultimo.dia} de ${mesTexto(ultimo)} de ${ultimo.anio}`;
    }
    if (primero.anio === ultimo.anio) {
        return `Del ${primero.dia} de ${mesTexto(primero)} al ${fechaCompleta(ultimo)}`;
    }
    return `Del ${fechaCompleta(primero)} al ${fechaCompleta(ultimo)}`;
}
