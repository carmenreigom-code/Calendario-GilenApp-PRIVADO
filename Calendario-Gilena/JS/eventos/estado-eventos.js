// Los registros anteriores a los estados de publicación siguen siendo públicos.
function estadoPublicacion(evento) {
    return evento.estado == null || evento.estado === "" ? "publicado" : evento.estado;
}

function esEventoPublicado(evento) {
    return estadoPublicacion(evento) === "publicado";
}
