# Documentación de funciones JavaScript — GilenaApp

Este documento describe las funciones de los seis archivos JavaScript revisados. La documentación se basa en el código actual y explica la responsabilidad de cada función, sus parámetros cuando los tiene y el resultado que devuelve.

> **Nota:** los perfiles de `PerfilesGilena` se guardan localmente en el navegador y, según el propio código, son perfiles de demostración; no constituyen un sistema de autenticación real ni cuentas verificadas en un servidor.

---

## 1. `perfiles.js`

Este archivo define `window.PerfilesGilena`, un módulo para gestionar perfiles locales, la sesión activa, las preferencias personales, los eventos guardados en una agenda y los vínculos con Google Calendar. Utiliza `localStorage` y `sessionStorage` del navegador.

### Funciones auxiliares internas

#### `leer(clave, defecto)`
Lee de `localStorage` el valor asociado a `clave` e intenta convertirlo desde JSON. Si no existe, el valor es `null` o se produce un error al leer o interpretar los datos, devuelve `defecto`.

- **Parámetros:** `clave` (clave de almacenamiento), `defecto` (valor alternativo).
- **Devuelve:** el dato leído o el valor alternativo.

#### `perfiles()`
Recupera la lista almacenada de perfiles y filtra los elementos para conservar solo aquellos que tengan `id`, `nombre` y `correo` de tipo texto.

- **Devuelve:** un array de perfiles válidos; si el contenido no es un array, devuelve `[]`.

#### `activo()`
Comprueba qué perfil está guardado como activo y lo contrasta con la lista de perfiles. Verifica tanto el identificador como el correo.

- **Devuelve:** el perfil activo si coincide con uno registrado; en caso contrario, `null`.

#### `clave(tipo, id = activo()?.id)`
Construye la clave de almacenamiento correspondiente a un tipo de dato y a un perfil.

- **Parámetros:** `tipo` (categoría de datos), `id` (identificador del perfil; por defecto, el perfil activo).
- **Devuelve:** una clave con el formato `tipoPerfilGilenaDemo:id`.

#### `escribir(claveDestino, valor)`
Convierte `valor` a JSON e intenta guardarlo en `localStorage`.

- **Parámetros:** `claveDestino` (clave de destino), `valor` (dato que se quiere guardar).
- **Devuelve:** `true` si se guarda correctamente; `false` si falla.

#### `guardarSesion(perfil)`
Guarda el perfil como sesión activa y emite el evento personalizado `perfil:cambio` para que otras partes de la web actualicen la interfaz.

- **Parámetros:** `perfil` (perfil que se activa).
- **Devuelve:** `true` si se guarda correctamente; `false` si ocurre un error.

#### `uid()`
Genera un identificador único para un perfil. Utiliza `crypto.randomUUID()` si está disponible y, como alternativa, combina la fecha actual con un valor aleatorio.

- **Devuelve:** una cadena identificadora.

#### `normalizarCorreo(correo)`
Elimina los espacios al principio y al final de la dirección y la convierte a minúsculas siguiendo la configuración regional española.

- **Parámetros:** `correo` (dirección de correo).
- **Devuelve:** el correo normalizado.

#### `preferenciasSinPerfil()`
Obtiene las preferencias guardadas para visitantes sin perfil. Primero intenta usar el bloque de preferencias conjunto y, si no existe, recupera los favoritos y avisos de claves anteriores.

- **Devuelve:** un objeto con `favoritos` y `avisos`.

#### `preferencias()`
Devuelve las preferencias del perfil activo o, si no hay perfil activo, las preferencias del visitante.

- **Devuelve:** un objeto con `favoritos` y `avisos`.

### Funciones públicas de `PerfilesGilena`

#### `registrar(nombre, correo)`
Valida el nombre y el correo, comprueba que no exista otro perfil con la misma dirección, crea un perfil y trata de guardarlo y activar su sesión.

- **Parámetros:** `nombre` y `correo`.
- **Devuelve:** `{ perfil }` si se completa; `{ error }` si los datos no son válidos, el correo ya existe o falla el almacenamiento.
- **Efecto adicional:** al activar la sesión, emite `perfil:cambio`.

#### `entrar(correo)`
Busca un perfil local cuyo correo normalizado coincida con el proporcionado y lo establece como perfil activo.

- **Parámetros:** `correo`.
- **Devuelve:** `{ perfil }` si encuentra y activa el perfil; `{ error }` si no existe o no se puede guardar la sesión.

#### `salir()`
Elimina el perfil activo del almacenamiento local y de sesión, solicita a `GoogleAgenda` que olvide el acceso si está disponible y emite `perfil:cambio`.

- **Devuelve:** `true` si se elimina correctamente la sesión local; `false` si falla la eliminación principal.

#### `favoritos()`
Obtiene la lista de identificadores favoritos de las preferencias actuales. Convierte los identificadores a texto y garantiza que el resultado sea un array.

- **Devuelve:** un array de identificadores como cadenas.

#### `avisos()`
Obtiene el objeto de avisos de las preferencias actuales y comprueba que sea un objeto válido y no un array.

- **Devuelve:** el objeto de avisos o `{}`.

#### `guardarPreferencias(favs, alertas)`
Guarda los favoritos y los avisos del perfil activo. Si no hay perfil activo, los guarda en las preferencias del visitante.

- **Parámetros:** `favs` (lista de favoritos), `alertas` (objeto de avisos).
- **Devuelve:** `true` si se guardan los datos; `false` si falla el almacenamiento.

#### `elementos()`
Recupera los elementos de la agenda personal del perfil activo.

- **Devuelve:** un array de elementos; si no hay perfil activo o los datos no son un array, devuelve `[]`.

#### `guardarElementos(datos)`
Guarda los elementos de la agenda personal, pero solo cuando existe un perfil activo.

- **Parámetros:** `datos` (elementos que se quieren guardar).
- **Devuelve:** `true` si hay perfil activo y se guardan los datos; `false` en caso contrario.

#### `vinculosGoogle()`
Recupera los vínculos entre eventos municipales y eventos de Google Calendar del perfil activo. Solo conserva registros que tengan `municipalId`, `calendarId` y `eventId` de tipo texto.

- **Devuelve:** un array de vínculos válidos; si no hay perfil activo, devuelve `[]`.

#### `guardarVinculosGoogle(datos)`
Guarda los vínculos con Google Calendar para el perfil activo.

- **Parámetros:** `datos` (array u otro valor que se desea guardar).
- **Devuelve:** `true` si hay un perfil activo y el guardado funciona; `false` en caso contrario.

#### `copiarFavoritosAnteriores()`
Copia los favoritos y avisos antiguos de visitante a las preferencias del perfil activo. Une las listas de favoritos sin duplicados y combina los objetos de avisos.

- **Devuelve:** `true` si la copia se guarda correctamente; `false` si no hay perfil activo, los datos antiguos no son válidos o falla el guardado.

#### `pendientesDeCopia()`
Comprueba si hay favoritos antiguos de visitante que todavía no estén incluidos en las preferencias del perfil activo.

- **Devuelve:** `true` si hay elementos pendientes de copiar; `false` en caso contrario.

---

## 2. `estado-eventos.js`

Este archivo centraliza la interpretación del estado de publicación de los eventos, manteniendo la compatibilidad con registros antiguos que no tenían ese campo.

#### `estadoPublicacion(evento)`
Devuelve el estado de publicación del evento. Si `evento.estado` no está definido o es una cadena vacía, interpreta que el evento está publicado.

- **Parámetros:** `evento` (objeto del evento).
- **Devuelve:** el estado del evento o `"publicado"` como valor predeterminado.

#### `esEventoPublicado(evento)`
Comprueba si el evento debe considerarse publicado usando `estadoPublicacion()`.

- **Parámetros:** `evento` (objeto del evento).
- **Devuelve:** `true` si el estado es exactamente `"publicado"`; `false` en caso contrario.

---

## 3. `favoritos-municipales.js`

Este archivo define `window.FavoritosGilena`, un módulo que gestiona los eventos favoritos, las preferencias de visitantes y el registro de datos necesarios para detectar cambios en eventos guardados. Los datos se conservan en el navegador.

### Funciones auxiliares internas

#### `claveActual()`
Determina la clave de almacenamiento para la lista de favoritos. Si hay un perfil activo, utiliza una clave asociada a ese perfil; si no, utiliza la clave general de favoritos públicos.

- **Devuelve:** la clave de almacenamiento elegida.

#### `leer(clave)`
Lee un valor de `localStorage` e intenta interpretarlo como JSON.

- **Parámetros:** `clave`.
- **Devuelve:** el valor interpretado o `null` si no existe o se produce un error.

#### `ids(valor)`
Normaliza una lista de identificadores: convierte sus elementos a cadenas y elimina duplicados.

- **Parámetros:** `valor` (valor que se quiere tratar como lista).
- **Devuelve:** un array de identificadores únicos; si `valor` no es un array, devuelve `[]`.

#### `lista()`
Recupera la lista de favoritos para el perfil activo o para el visitante. Si hace falta, consulta claves de preferencias anteriores para mantener compatibilidad con datos ya guardados.

- **Devuelve:** un array de identificadores únicos como cadenas.

#### `guardar(nuevos)`
Normaliza y guarda la lista de favoritos en la clave correspondiente al usuario actual. Después emite el evento `favoritos:actualizados`.

- **Parámetros:** `nuevos` (lista nueva de identificadores favoritos).
- **Devuelve:** `true` si se guarda correctamente; `false` si no se puede guardar.

#### `contarDisponibles()`
Lee los eventos municipales almacenados bajo la clave `eventos`, filtra los que están publicados y cuenta cuántos de ellos aparecen en la lista de favoritos.

- **Devuelve:** el número de favoritos que corresponden a eventos publicados.

#### `pendientesVisitante()`
Cuando existe un perfil activo, busca favoritos guardados como visitante que todavía no estén en la lista de ese perfil.

- **Devuelve:** un array con los identificadores pendientes de copiar; si no hay perfil activo, devuelve `[]`.

#### `copiarVisitante()`
Añade a los favoritos actuales los favoritos pendientes del visitante y guarda el resultado.

- **Devuelve:** `true` si la operación de guardado funciona; `false` si falla.

#### `claveReferencias()`
Selecciona la clave donde se guardan las referencias de los datos de eventos favoritos. La clave depende de si hay un perfil activo.

- **Devuelve:** una clave de almacenamiento.

#### `limpio(valor)`
Convierte un valor a texto, elimina espacios exteriores y sustituye secuencias de espacios por un único espacio.

- **Parámetros:** `valor`.
- **Devuelve:** el texto normalizado.

#### `referencia(evento)`
Crea una copia resumida de los campos del evento que se usarán para detectar cambios: fechas, horas, lugar y estado de actividad.

- **Parámetros:** `evento`.
- **Devuelve:** un objeto con `fecha`, `fechaFin`, `hora`, `horaFin`, `lugar` y `estadoActividad`.

#### `referencias()`
Lee el mapa de referencias almacenado y comprueba que sea un objeto y no un array.

- **Devuelve:** el mapa de referencias o `{}` si los datos no tienen el formato esperado.

#### `guardarReferencias(valor)`
Guarda en `localStorage` el mapa de referencias convertido a JSON.

- **Parámetros:** `valor` (mapa que se desea guardar).
- **Devuelve:** `true` si se guarda correctamente; `false` si ocurre un error.

### Funciones públicas de `FavoritosGilena`

#### `registrar(evento, forzar = false)`
Registra la referencia de un evento para poder comparar sus datos más adelante. Si ya existe una referencia y `forzar` es `false`, la conserva sin sobrescribirla.

- **Parámetros:** `evento` (evento que se registra), `forzar` (si es `true`, actualiza incluso una referencia existente).
- **Devuelve:** `false` si el evento no tiene identificador o falla el guardado; `true` si la referencia queda registrada o ya existía y no era necesario actualizarla.

#### `eliminarReferencia(id)`
Elimina del mapa de referencias la entrada correspondiente al identificador indicado.

- **Parámetros:** `id` (identificador del evento).
- **Devuelve:** el resultado de guardar el mapa actualizado (`true` o `false`).

#### `asegurar(eventos)`
Comprueba si los eventos favoritos tienen una referencia guardada. Para aquellos que no la tengan y aparezcan en el array recibido, crea la referencia inicial.

- **Parámetros:** `eventos` (lista de eventos disponibles).
- **Devuelve:** `true` si no hay cambios que guardar o si el guardado termina correctamente; `false` si falla.

#### `cambios(evento)`
Compara los campos actuales del evento con su referencia anterior. Detecta cambios en fecha inicial/final, hora inicial/final, lugar y estado de actividad.

- **Parámetros:** `evento` (evento que se quiere comparar).
- **Devuelve:** un array de cambios. Cada elemento incluye el nombre del campo, una etiqueta legible y los valores anterior y actual. Devuelve `[]` si no hay referencia previa o no se detectan cambios.

#### `marcarVisto(evento)`
Actualiza la referencia del evento aunque ya existiera. En la práctica, llama a `registrar(evento, true)` para guardar los datos actuales como referencia.

- **Parámetros:** `evento`.
- **Devuelve:** el resultado de `registrar()`.

#### `perfilesRecuperables()`
En la implementación actual no recupera perfiles: devuelve siempre un array vacío.

- **Devuelve:** `[]`.

#### `recuperar()`
En la implementación actual no realiza ninguna recuperación de datos.

- **Devuelve:** siempre `false`.

---

## 4. `contenido-web.js`

Este archivo define `window.ContenidoWeb`, que gestiona el contenido público editable de la portada y del pie de página. Valida, normaliza, guarda indirectamente mediante `localStorage` y genera fragmentos HTML para mostrarlos en la web.

### Datos y funciones auxiliares internas

#### `copiar(objeto)`
Realiza una copia profunda sencilla de un objeto mediante su conversión a JSON y posterior análisis.

- **Parámetros:** `objeto`.
- **Devuelve:** una copia independiente del objeto.

#### `esc(valor)`
Escapa los caracteres especiales de HTML (`&`, `<`, `>`, comillas dobles y simples) para evitar que se interpreten como marcado al insertar texto.

- **Parámetros:** `valor`.
- **Devuelve:** una cadena segura para insertar como texto en HTML.

#### `texto(valor)`
Devuelve el valor recortado si es una cadena; para otros tipos de dato devuelve una cadena vacía.

- **Parámetros:** `valor`.
- **Devuelve:** el texto normalizado o `""`.

#### `url(valor)`
Intenta analizar una dirección URL y solo acepta direcciones cuyo protocolo sea `http:` o `https:` y que tengan nombre de host.

- **Parámetros:** `valor` (dirección que se quiere validar).
- **Devuelve:** la URL normalizada si es válida; `""` si no lo es.

#### `validar(datos)`
Comprueba que el objeto de contenido tenga la versión y estructura esperadas. Valida tipos de campos, visibilidad de la introducción, formato del correo, formato del teléfono y enlaces.

- **Parámetros:** `datos` (contenido que se quiere validar).
- **Devuelve:** un array de errores; cada error contiene la ruta del campo y un mensaje. Si no hay errores, devuelve `[]`.

#### `normalizar(datos)`
Crea un objeto basado en la estructura inicial y sustituye sus valores por los del contenido recibido, recortando textos y normalizando la lista de enlaces.

- **Parámetros:** `datos` (contenido que se quiere normalizar).
- **Devuelve:** el contenido normalizado con las secciones `portada` y `pie`.

### Funciones públicas de `ContenidoWeb`

#### `obtener()`
Lee el contenido guardado en `localStorage`. Si no existe contenido guardado, devuelve una copia de los valores iniciales. Si el contenido almacenado no supera la validación, lanza un error para evitar sobrescribir datos inválidos.

- **Devuelve:** el contenido normalizado.
- **Puede lanzar:** `Error` si el contenido almacenado no es válido o no puede procesarse.

#### `publico()`
Intenta obtener el contenido guardado y, si se produce un error, devuelve una copia del contenido inicial para que la parte pública pueda seguir mostrándose.

- **Devuelve:** el contenido guardado válido o los valores iniciales.

#### `portada(datos = publico())`
Genera el fragmento HTML de la portada con la etiqueta de agenda municipal, el título, la introducción opcional y el enlace al calendario. Escapa los textos antes de insertarlos.

- **Parámetros:** `datos` (contenido que se representa; por defecto, el contenido público disponible).
- **Devuelve:** una cadena HTML.

#### `pie(datos = publico())`
Genera el fragmento HTML del pie de página con identidad municipal, ubicación, información, dirección, teléfono, correo y enlaces válidos, además de accesos al calendario y a la administración.

- **Parámetros:** `datos` (contenido que se representa; por defecto, el contenido público disponible).
- **Devuelve:** una cadena HTML.

#### `aplicar(datos = publico())`
Actualiza el HTML de los elementos de portada y pie de página presentes en el documento. También ajusta los atributos de accesibilidad del bloque de portada según exista o no un título.

- **Parámetros:** `datos` (contenido que se aplicará; por defecto, el contenido público disponible).
- **Devuelve:** no devuelve un valor explícito.

### Eventos automáticos del navegador
- **`DOMContentLoaded`:** si la página contiene `#cabeceraPublica`, aplica el contenido público al cargar el DOM.
- **`storage`:** si cambia la clave del contenido web (o se recibe un cambio general de almacenamiento) y la página tiene `#cabeceraPublica`, vuelve a aplicar el contenido.

---

## 5. `cabecera-publica.js`

Este archivo es una función autoejecutable que construye y controla la cabecera pública común de las páginas. Incluye navegación, menú móvil, acceso al perfil, contador de favoritos, cierre de menús, accesibilidad y detección de la sección visible en la página de inicio.

### Inicialización de la cabecera
Al ejecutarse, busca el elemento `#cabeceraPublica`. Si no existe, detiene la ejecución. Si existe, identifica la página actual, construye el HTML de la cabecera y prepara una barra de navegación adicional cuando se está en `index.html`. También inicializa el pie de página si está vacío.

### Funciones internas

#### `actualizarFavoritos()`
Obtiene el número de favoritos que corresponden a eventos publicados y actualiza el contador y la etiqueta accesible del enlace «Mis favoritos».

- **Devuelve:** no devuelve un valor explícito.

#### `actualizarIdentidad()`
Consulta el perfil activo y actualiza la cabecera: muestra el acceso para iniciar sesión cuando no hay perfil, o el menú de cuenta cuando sí lo hay. También actualiza el nombre, el correo, el avatar con la inicial y el contador de favoritos.

- **Devuelve:** no devuelve un valor explícito.

#### `cerrar({ devolverFoco = false } = {})`
Cierra la navegación desplegable si está abierta, restablece el estado accesible del botón, cambia el icono del menú y cierra el menú de cuenta. Opcionalmente devuelve el foco al botón que abrió la navegación.

- **Parámetros:** `devolverFoco` (si es `true`, devuelve el foco al botón del menú).
- **Devuelve:** no devuelve un valor explícito.

#### `sincronizarSeccion()`
En la página de inicio, determina cuál de las secciones enlazadas está situada en la zona visible según la posición de desplazamiento. Actualiza `aria-current="location"` en el enlace de navegación correspondiente.

- **Devuelve:** no devuelve un valor explícito.

#### `programarSeccion()`
Programa la sincronización de la sección activa para el siguiente ciclo de animación del navegador. Evita programar varias actualizaciones simultáneas mediante una bandera interna.

- **Devuelve:** no devuelve un valor explícito.

#### `medirCabecera()`
Mide la altura actual de la cabecera, la guarda en la variable CSS `--cabecera-altura` y programa la actualización de la sección activa.

- **Devuelve:** no devuelve un valor explícito.

### Manejadores de eventos registrados
El archivo también incorpora funciones de respuesta a eventos para mantener la interfaz sincronizada:

- **Clic en el botón del menú:** abre o cierra la navegación móvil y actualiza `aria-expanded` y el símbolo del botón.
- **Clic en un enlace o acción de navegación:** cierra el menú desplegable.
- **Clic fuera de la cabecera:** cierra la navegación y el menú de cuenta.
- **Tecla `Escape`:** oculta las ayudas y cierra el menú abierto; si cierra el menú de cuenta, devuelve el foco a su encabezado.
- **Cambios de perfil y favoritos:** los eventos `perfil:cambio`, `favoritos:actualizados` e `identidad:cambio` actualizan la información visible.
- **Cambios de almacenamiento y navegación:** los eventos `storage`, `pageshow`, `scroll`, `resize` y `hashchange` sincronizan la identidad, el contador o la sección activa según corresponda.
- **Cierre de sesión:** el botón correspondiente llama a `PerfilesGilena.salir()` y, si funciona, redirige a `index.html`; si falla, muestra un aviso.

---

## 6. `cuentas-locales.js`

Este archivo controla el formulario de registro e inicio de sesión local. Detecta qué tipo de formulario se está mostrando, valida el correo, llama al módulo `PerfilesGilena` y ofrece copiar los favoritos de visitante al perfil.

### Inicialización
Obtiene los elementos del formulario, el campo de correo y el área de mensajes. Determina si se trata del formulario de registro comprobando si existe `#nombreCuenta`. Si la URL incluye el parámetro `correo`, lo utiliza para rellenar inicialmente el campo.

### Manejador de envío del formulario
El archivo no declara una función con nombre para procesar el envío; registra una función anónima en el evento `submit` del formulario.

Cuando se envía:
1. Evita el envío convencional del formulario.
2. Comprueba la validez de los campos con `reportValidity()`.
3. Normaliza el correo y verifica que pertenezca a Gmail o Googlemail.
4. Si es un formulario de registro, llama a `PerfilesGilena.registrar()`; en caso contrario, llama a `PerfilesGilena.entrar()`.
5. Si se produce un error, muestra el mensaje y, cuando procede, ofrece un enlace para crear una cuenta.
6. Si el acceso se completa, pregunta si se quieren copiar los favoritos guardados como visitante.
7. Redirige a `mis-eventos.html`.

- **Resultado:** el manejador no devuelve un valor utilizado por el programa; controla la validación, los mensajes y la navegación.
- **Importante:** el código implementa perfiles locales de demostración, no autenticación segura en un servidor.

---

## Resumen de responsabilidades por archivo

| Archivo | Responsabilidad principal |
|---|---|
| `perfiles.js` | Perfiles locales, sesión, preferencias, agenda personal y vínculos de Google Calendar. |
| `estado-eventos.js` | Interpretación del estado de publicación de los eventos. |
| `favoritos-municipales.js` | Favoritos, migración de favoritos de visitante y detección de cambios en eventos. |
| `contenido-web.js` | Validación, normalización y generación del contenido público de portada y pie de página. |
| `cabecera-publica.js` | Construcción y comportamiento de la cabecera, navegación, cuenta y contador de favoritos. |
| `cuentas-locales.js` | Validación y procesamiento de los formularios locales de registro e inicio de sesión. |
