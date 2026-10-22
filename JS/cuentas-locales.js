(() => {
  const formulario = document.getElementById("formularioCuenta");
  const correo = document.getElementById("correoCuenta");
  const mensaje = document.getElementById("mensajeCuenta");
  const registro = !!document.getElementById("nombreCuenta");
  const inicial = new URLSearchParams(location.search).get("correo");
  if (inicial) correo.value = inicial;
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;
    const email = correo.value.trim().toLowerCase();
    if (!/^[^\s@]+@(?:gmail\.com|googlemail\.com)$/.test(email)) { mensaje.textContent = "Introduce una dirección de Gmail válida."; correo.focus(); return; }
    const resultado = registro ? PerfilesGilena.registrar(document.getElementById("nombreCuenta").value, email) : PerfilesGilena.entrar(email);
    if (resultado.error) {
      mensaje.replaceChildren(document.createTextNode(resultado.error + " "));
      if (!registro && !PerfilesGilena.perfiles().some(p => p.correo.toLowerCase() === email)) {
        const enlace = document.createElement("a"); enlace.href = `registro.html?correo=${encodeURIComponent(email)}`; enlace.textContent = "Crear cuenta"; mensaje.append(enlace);
      }
      return;
    }
    try {
      const pendientes = window.FavoritosGilena?.pendientesVisitante() || [];
      if (pendientes.length && confirm(`Hay ${pendientes.length} favoritos de visitante. ¿Quieres copiarlos a este perfil? Los originales se conservarán.`) && !FavoritosGilena.copiarVisitante()) {
        mensaje.textContent = FavoritosGilena.error; return;
      }
    } catch { /* El perfil sigue disponible si no se pueden consultar favoritos. */ }
    location.href = "mis-eventos.html";
  });
})();
