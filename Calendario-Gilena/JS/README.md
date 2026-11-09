# Guía de JavaScript

Los scripts clásicos se cargan desde los HTML en un orden concreto. Si añades o mueves uno, actualiza sus rutas en la página correspondiente y conserva el orden de sus dependencias. `comun/ajustes.js` carga además Google Calendar cuando se abre esa opción de Ajustes.

## `comun/` · elementos compartidos

| Archivo | Función |
| --- | --- |
| `ajustes.js` | Tema claro u oscuro, texto grande, preferencias y panel de Ajustes. |
| `avisos-locales.js` | Recordatorios locales mientras la web está abierta; actualmente ninguna página lo carga. |
| `biblioteca-imagenes.js` | Almacenamiento local de imágenes en IndexedDB y resolución de referencias de biblioteca. |
| `cabecera-publica.js` | Cabecera, navegación y pie de las páginas públicas. |
| `contenido-web.js` | Textos configurables de portada y pie de página. |
| `formato-fechas.js` | Formato de fechas y rangos de eventos. |

## `eventos/` · datos y presentación municipal

| Archivo | Función |
| --- | --- |
| `colores-eventos.js` | Colores de las categorías. |
| `contenido-bloques.js` | Bloques de texto, imagen, galería, vídeo y enlaces del detalle. |
| `destacados-config.js` | Selección y orden editorial de destacados. |
| `destacados-inicio.js` | Carrusel de eventos destacados en la portada. |
| `estado-eventos.js` | Estado de publicación y compatibilidad con eventos antiguos. |
| `imagenes-evento.js` | Imagen de tarjeta, detalle y carrusel con sus ajustes de encuadre. |
| `informacion-evento.js` | Datos opcionales, contactos, sesiones y enlaces de eventos. |
| `render-evento.js` | Página de detalle de un evento. |
| `tarjetas-evento.js` | Tarjetas reutilizadas en inicio, favoritos y relacionados. |

## `cuentas/` · perfiles y favoritos

| Archivo | Función |
| --- | --- |
| `auth-config.js` | Rutas previstas para un futuro servidor de autenticación; actualmente no se carga. |
| `cuentas-google.js` | Botón previsto para acceso con identidad Google; actualmente no se carga. |
| `cuentas-locales.js` | Formularios actuales de registro y acceso local. |
| `cuentas.js` | Formulario anterior de registro y acceso; actualmente no se carga. |
| `favoritos-municipales.js` | Guardar, contar y consultar favoritos del visitante o perfil activo. |
| `google-identidad.js` | Preparación de identidad Google con verificación en servidor; actualmente no se carga. |
| `perfiles.js` | Perfiles locales de demostración, sesión y preferencias por perfil. |

## `calendario/` · calendarios y Google

| Archivo | Función |
| --- | --- |
| `calendario-externo.js` | Fechas y enlaces para añadir eventos a calendarios externos. |
| `google-agenda.js` | Conexión y operaciones con Google Calendar. |
| `google-config.js` | Client ID público de Google. |
| `google-fechas.js` | Conversión de fechas entre la agenda municipal y Google Calendar. |

## `admin/` · administrador

| Archivo | Función |
| --- | --- |
| `admin.js` | Editor principal, carga y guardado de eventos, importación y controles centrales. |
| `admin-biblioteca.js` | Interfaz de biblioteca de imágenes. |
| `admin-bloques.js` | Edición de bloques de contenido. |
| `admin-calendario.js` | Calendario de gestión del administrador. |
| `admin-gestion.js` | Vistas de contenido web, plantillas y papelera. |
| `admin-informacion.js` | Campos adicionales del editor de eventos. |
| `admin-interfaz.js` | Distribución visual del administrador. |
| `admin-listado.js` | Inicio, tabla de eventos, papelera y revisión. |
| `admin-menus.js` | Menús de acciones de filas y controles. |
| `admin-operaciones.js` | Operaciones individuales y en grupo, incluido respaldo. |
| `admin-organizacion.js` | Organización visual de las secciones existentes. |
| `gestion-admin-datos.js` | Datos locales de plantillas y papelera. |
| `revision-eventos.js` | Reglas para avisar de información incompleta o incoherente. |

## `paginas/` · lógica propia de cada página

| Archivo | Función |
| --- | --- |
| `script.js` | Buscador, filtros, calendario y listado de la página principal `index.html`. |
| `inicio.js` | Fiestas destacadas de la portada. |
| `mis-favoritos.js` | Página `mis-eventos.html`, favoritos y lectura de calendarios Google. |
| `agenda-renovada.js` | Interfaz alternativa de agenda personal; actualmente no se carga. |

## Qué carga cada página

- `index.html`: archivos comunes, perfiles y favoritos, presentación de eventos y los tres scripts de inicio (`script.js`, `destacados-inicio.js`, `inicio.js`).
- `evento.html`: archivos comunes, perfiles y favoritos, y presentación del detalle.
- `mis-eventos.html`: archivos comunes, perfiles y favoritos, Google Calendar y `mis-favoritos.js`.
- `acceso.html` y `registro.html`: archivos comunes, perfiles y `cuentas-locales.js`.
- `admin.html`: archivos de eventos compartidos y todos los scripts de `admin/`.

Las páginas siguen usando rutas relativas desde la raíz del proyecto, por ejemplo `JS/paginas/script.js`. Los archivos que no se cargan se han conservado para evitar borrar código que quizá quieras recuperar o conectar más adelante.
