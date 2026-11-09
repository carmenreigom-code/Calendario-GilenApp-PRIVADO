# Revisión de eventos reales · 22 de octubre de 2026

La copia revisada es `eventos-gilena-revisados-2026-10-22.json`. Conserva los nueve eventos, sus identificadores, imágenes, ajustes de encuadre y demás datos de la copia original. Solo cambia los textos y algunos campos de ubicación, horario o enlaces de cinco eventos publicados del usuario. El borrador de la fiesta del Rosario y los tres eventos `DEMO` permanecen idénticos.

| Evento | Fuente contrastada | Alcance de la revisión |
| --- | --- | --- |
| Sepharazz · Ivo Blanek | [Diputación de Sevilla, Circuito 107](https://www.dipusevilla.es/comunicacion/noticias/El-programa-cultural-Circuito-107-del-Area-de-Cultura-y-Ciudadania-recorrera-esta-semana-45-municipios-de-la-provincia/) confirma artista, espectáculo, Gilena, museo, fecha y hora. | Se resumió el anuncio y se retiró el relato con el año «1941», que no se podía presentar como dato histórico. Acceso gratuito y sin inscripción procede del anuncio incluido en la copia original. |
| Viaje a Marchena | [Diputación de Sevilla, colección Coullaut Valera](https://sevillaentubolsillo.dipusevilla.es/node/40013) confirma el nombre de la colección y del artista. | Itinerario, precio, salida, almuerzo y lista de espera proceden exclusivamente del anuncio de la copia original; no se encontró una publicación independiente de este viaje. Se corrigió el lugar de salida a calle Álamos, se quitó una hora de fin que el anuncio no daba y se retiró el enlace de mapa antiguo, que no se pudo verificar. La web generará una búsqueda de la dirección de salida. |
| Viaje a Londres | Sin publicación independiente localizada para el viaje concreto. | Se ordenaron únicamente las fechas, el itinerario y la agencia indicados en el anuncio original. Se retiraron la dirección y el mapa del museo como ubicación del viaje, y se ocultó «Cómo llegar» porque el viaje no tiene un único destino. No se añadieron precio, vuelos, horarios ni reservas. |
| Reunión de voluntariado | [Colección Museográfica de Gilena, voluntariado](https://museografica.gilena.es/es/voluntariado/) explica el carácter gratuito y la formación de sus programas. | La fecha, la reunión y las líneas de trabajo proceden del anuncio original; la página del museo no confirma esta convocatoria concreta. |
| Arqueología musical · Emilio Villalba y Sara Marina | [Diputación de Sevilla, Circuito 107](https://www.dipusevilla.es/comunicacion/noticias/El-Circuito-107-lleva-40-propuestas-culturales-a-26-municipios-sevillanos-en-un-primer-fin-de-semana-de-octubre-marcado-por-el-flamenco-y-el-teatro/) confirma artistas, actividad, museo, fecha y hora. [Web de Emilio Villalba](https://www.emiliovillalba.com/proyectos/conferencias/) explica el formato de sus conferencias. | Se resumió el contenido y se añadieron enlaces. Las condiciones de acceso proceden del anuncio original. |

## Importación

En `admin.html`, abre **Copias de seguridad**, selecciona el JSON revisado, marca **Sustituir los eventos actuales** y pulsa **Importar eventos**. **Añadir a los eventos existentes** duplicaría las fichas, por lo que no sirve para aplicar esta revisión. La sustitución restaura también los demás apartados incluidos en la copia del 22 de octubre; exporta primero otra copia si has editado contenido desde entonces.

## Comprobaciones

- El validador de importación de `JS/admin/admin.js` acepta la copia revisada.
- Los nueve identificadores son únicos y se conservan.
- El borrador, los tres eventos `DEMO`, las imágenes y sus ajustes, la biblioteca y los demás apartados del respaldo son idénticos al original.
- No se modificaron archivos de la web; el contenido vive en los datos del navegador y se aplica al importar la copia.
