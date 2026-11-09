/* Cabecera y pie comunes de las páginas públicas. El administrador usa su propia navegación. */
(() => {
  const cabecera = document.getElementById("cabeceraPublica");
  if (!cabecera) return;
  const pagina = location.pathname.split("/").pop() || "index.html";
  const inicio = pagina === "index.html";
  const agenda = pagina === "mis-eventos.html";
  const destinoInicio = inicio ? "" : "index.html";
  cabecera.classList.add("cabecera-publica");
  cabecera.innerHTML = `<div class="contenedor-header">
    <a class="logo-titulo" href="index.html" aria-label="Ayuntamiento de Gilena, ir al inicio">
      <img src="img/logo-gilena.png" alt="" width="52" height="52">
      <span class="marca-texto"><strong class="marca-larga">Ayuntamiento de Gilena</strong><strong class="marca-corta">Gilena</strong><small>Calendario Digital Municipal</small></span>
    </a>
    <button class="nav-menu-toggle" type="button" aria-controls="navegacionPrincipal" aria-expanded="false"><span aria-hidden="true">☰</span><span>Menú</span></button>
    <nav id="navegacionPrincipal" aria-label="Navegación principal">
      <div class="nav-centro">
        <a class="nav-enlace nav-inicio" href="${destinoInicio}#inicio">Inicio</a>
        <a class="nav-enlace nav-calendario" href="${destinoInicio}#calendario">Calendario</a>
        <a class="nav-enlace nav-proximos" href="${destinoInicio}#eventos">Próximos eventos</a>
        <a class="nav-enlace nav-informacion" href="${destinoInicio}#informacion">Información</a>
      </div>
      <div class="nav-acciones">
        <a class="nav-enlace nav-agenda nav-utilidad nav-favoritos" href="mis-eventos.html" aria-label="Mis favoritos: 0 eventos guardados"${agenda ? ' aria-current="page"' : ""}><i class="fa-${agenda ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i><span class="nav-utilidad-texto">Mis favoritos</span><span class="nav-contador" aria-hidden="true">0</span><span class="nav-ayuda" aria-hidden="true">Mis favoritos</span></a>
        <button type="button" class="nav-ajustes nav-utilidad" data-abrir-ajustes aria-haspopup="dialog" aria-label="Abrir ajustes"><i class="fa-solid fa-gear" aria-hidden="true"></i><span class="nav-utilidad-texto">Ajustes</span><span class="nav-ayuda" aria-hidden="true">Ajustes</span></button>
        <div class="nav-acceso"><a class="nav-entrar" href="acceso.html"${pagina === "acceso.html" ? ' aria-current="page"' : ""}>Iniciar sesión</a><details class="nav-perfil-menu nav-cuenta-menu" hidden><summary class="nav-perfil-resumen"><span class="nav-avatar" data-inicial></span><span data-nombre-cuenta></span></summary><div class="nav-perfil-opciones"><p class="nav-perfil-datos"><strong data-perfil-nombre></strong><small data-perfil-correo></small></p><button type="button" data-cerrar-cuenta>Cerrar sesión</button></div></details></div>
      </div>
    </nav>
  </div>`;
  const nav = cabecera.querySelector("nav");
  // En el index los destinos tienen su propia barra; los accesos personales
  // permanecen en la cabecera y conservan el menú móvil existente.
  let barra = null;
  if (inicio) {
    barra = document.createElement("nav");
    barra.className = "barra-navegacion";
    barra.setAttribute("aria-label", "Navegación principal");
    barra.append(cabecera.querySelector(".nav-centro"));
    cabecera.after(barra);
    nav.setAttribute("aria-label", "Accesos personales");
  }
  const boton = cabecera.querySelector(".nav-menu-toggle");
  const menuCuenta = cabecera.querySelector(".nav-cuenta-menu");
  let perfilVisible = window.PerfilesGilena?.activo()?.id || null;
  const enlaceFavoritos = cabecera.querySelector(".nav-favoritos");
  const actualizarFavoritos = () => {
    const numero = window.FavoritosGilena?.contarDisponibles() || 0;
    enlaceFavoritos.querySelector(".nav-contador").textContent = numero > 99 ? "99+" : String(numero);
    enlaceFavoritos.setAttribute("aria-label", `Mis favoritos: ${numero} ${numero === 1 ? "evento guardado" : "eventos guardados"}`);
  };
  const actualizarIdentidad = () => {
    const usuario = window.PerfilesGilena?.activo();
    perfilVisible = usuario?.id || null;
    cabecera.querySelector(".nav-entrar").hidden = !!usuario;
    menuCuenta.hidden = !usuario;
    menuCuenta.querySelector("[data-nombre-cuenta]").textContent = usuario?.nombre || "";
    menuCuenta.querySelector("[data-inicial]").textContent = usuario?.nombre?.trim().charAt(0).toLocaleUpperCase("es") || "";
    menuCuenta.querySelector("[data-perfil-nombre]").textContent = usuario?.nombre || "";
    menuCuenta.querySelector("[data-perfil-correo]").textContent = usuario?.correo || "";
    if (!usuario) menuCuenta.open = false;
    actualizarFavoritos();
  };
  document.addEventListener("DOMContentLoaded", () => {
    actualizarIdentidad();
  });
  document.addEventListener("perfil:cambio", actualizarIdentidad);
  document.addEventListener("favoritos:actualizados", actualizarFavoritos);
  document.addEventListener("identidad:cambio", actualizarIdentidad);
  window.addEventListener("pageshow", actualizarIdentidad);
  window.addEventListener("storage", evento => {
    if ([null, "perfilActivoGilenaDemo", "perfilesGilenaDemo"].includes(evento.key)) {
      const cambioPerfil = (window.PerfilesGilena?.activo()?.id || null) !== perfilVisible;
      if (cambioPerfil) window.GoogleAgenda?.olvidarAcceso();
      actualizarIdentidad();
      if (cambioPerfil || evento.key === null) document.dispatchEvent(new Event("perfil:cambio"));
      return;
    }
    const perfil = window.PerfilesGilena?.activo();
    if (["eventos", window.FavoritosGilena?.clave, "preferenciasSinPerfilGilenaDemo", "eventosFavoritosGilena", perfil && `preferenciasPerfilGilenaDemo:${perfil.id}`].includes(evento.key)) actualizarFavoritos();
  });
  menuCuenta.querySelector("[data-cerrar-cuenta]").addEventListener("click", () => {
    if (window.PerfilesGilena?.salir()) location.href = "index.html";
    else alert("No se pudo cerrar el perfil local. Comprueba el almacenamiento del navegador.");
  });
  const cerrar = ({ devolverFoco = false } = {}) => {
    if (!nav.classList.contains("nav-abierta")) return;
    nav.classList.remove("nav-abierta");
    boton.setAttribute("aria-expanded", "false");
    boton.querySelector("span[aria-hidden]").textContent = "☰";
    menuCuenta.open = false;
    if (devolverFoco) boton.focus();
  };
  boton.addEventListener("click", () => {
    const abierto = nav.classList.toggle("nav-abierta");
    boton.setAttribute("aria-expanded", String(abierto));
    boton.querySelector("span[aria-hidden]").textContent = abierto ? "×" : "☰";
  });
  nav.addEventListener("click", e => {
    if (e.target.closest("a, [data-abrir-ajustes], [data-cerrar-cuenta]")) cerrar();
  });
  barra?.addEventListener("click", e => { if (e.target.closest("a")) cerrar(); });
  document.addEventListener("click", e => {
    if (!cabecera.contains(e.target)) { cerrar(); menuCuenta.open = false; }
    else if (!menuCuenta.contains(e.target)) menuCuenta.open = false;
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    cabecera.setAttribute("data-ayudas-ocultas", "");
    if (nav.classList.contains("nav-abierta")) cerrar({ devolverFoco: true });
    else if (menuCuenta.open) { menuCuenta.open = false; menuCuenta.querySelector("summary").focus(); }
  });
  cabecera.addEventListener("focusin", e => { if (e.target.closest(".nav-utilidad")) cabecera.removeAttribute("data-ayudas-ocultas"); });
  cabecera.addEventListener("pointerover", e => { const acceso = e.target.closest(".nav-utilidad"); if (acceso && !acceso.contains(e.relatedTarget)) cabecera.removeAttribute("data-ayudas-ocultas"); });
  // El desplazamiento lo realizan los enlaces nativos: no se reinicia la agenda.
  if (inicio) {
    const enlaces = [...barra.querySelectorAll(".nav-centro a")];
    const destinos = enlaces.map(enlace => document.getElementById(enlace.hash.slice(1)));
    let pendiente = false;
    const sincronizarSeccion = () => {
      pendiente = false;
      const altura = cabecera.getBoundingClientRect().height;
      const limite = altura + 40;
      let activo = 0;
      destinos.forEach((destino, indice) => {
        if (destino && destino.getBoundingClientRect().top <= limite) activo = indice;
      });
      const pie = destinos[3]?.getBoundingClientRect();
      if (pie && pie.top < innerHeight && pie.bottom > altura) activo = 3;
      enlaces.forEach((enlace, indice) => {
        if (indice === activo) enlace.setAttribute("aria-current", "location");
        else enlace.removeAttribute("aria-current");
      });
    };
    const programarSeccion = () => {
      if (!pendiente) { pendiente = true; requestAnimationFrame(sincronizarSeccion); }
    };
    const medirCabecera = () => {
      document.documentElement.style.setProperty("--cabecera-altura", `${cabecera.getBoundingClientRect().height}px`);
      programarSeccion();
    };
    new ResizeObserver(medirCabecera).observe(cabecera);
    new ResizeObserver(programarSeccion).observe(document.body);
    window.addEventListener("scroll", programarSeccion, { passive: true });
    window.addEventListener("resize", programarSeccion);
    window.addEventListener("hashchange", programarSeccion);
    window.addEventListener("pageshow", programarSeccion);
    medirCabecera();
  }

  const pie = document.getElementById("informacion");
  if (pie && !pie.hasChildNodes()) {
    pie.innerHTML = ContenidoWeb.pie();
  }
})();
