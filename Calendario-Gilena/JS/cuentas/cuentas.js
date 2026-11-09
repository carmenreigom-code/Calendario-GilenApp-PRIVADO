(() => {
  const mensaje = document.getElementById("mensajeCuenta");
  const continuar = () => { location.href = "mis-eventos.html"; };
  document.getElementById("formAcceso")?.addEventListener("submit", e => {
    e.preventDefault();
    const resultado = PerfilesGilena.entrar(e.currentTarget.elements.correo.value);
    if (resultado.error) mensaje.textContent = resultado.error; else continuar();
  });
  document.getElementById("formRegistro")?.addEventListener("submit", e => {
    e.preventDefault();
    const campos = e.currentTarget.elements;
    const resultado = PerfilesGilena.registrar(campos.nombre.value, campos.correo.value);
    if (resultado.error) mensaje.textContent = resultado.error; else continuar();
  });
})();
