(() => {
  const contenedor = document.getElementById("botonGoogleIdentidad");
  if (!contenedor) return;
  const aviso = document.getElementById("mensajeCuenta");
  const informar = texto => { aviso.textContent = texto; };
  const modo = location.pathname.endsWith("registro.html") ? "registro" : "login";
  if (!GoogleIdentidad.estado().configurado) {
    informar("El proyecto aún no tiene backend de autenticación. La cuenta y la sesión reales estarán disponibles cuando el servidor verifique el token de Google. Puedes seguir usando los favoritos sin cuenta.");
    return;
  }
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () => {
    document.querySelector(".cuenta-boton-pendiente").hidden = true;
    GoogleIdentidad.mostrarBoton(contenedor, modo, informar);
  };
  script.onerror = () => informar("No se pudo cargar Google Identity Services. Comprueba tu conexión.");
  document.head.append(script);
})();
