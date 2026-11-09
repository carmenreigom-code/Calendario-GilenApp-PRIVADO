# Eventos de demostración

Este paquete contiene tres eventos **ficticios** para revisar el calendario, las tarjetas, el carrusel, el detalle y la vista previa del administrador. Las imágenes están en `img/demo/` y se han creado para esta demostración.

## Cómo cargarlos

1. Abre `admin.html` en este proyecto e inicia sesión.
2. En **Copias de seguridad**, selecciona `demo/eventos-ejemplo.json`.
3. Deja marcada **Añadir a los eventos existentes** y pulsa **Importar eventos**.
4. Abre `index.html`: los tres eventos aparecen como `DEMO · ...`. Desde el listado puedes abrir sus detalles y probar favoritos, compartir, las imágenes y el programa.

El archivo JSON no sustituye ni borra eventos si se importa con **Añadir**. Los recursos visuales usan rutas del proyecto: conserva la carpeta `img/demo/` junto al resto de la web. Si vuelves a importar el paquete, el administrador creará copias con otros identificadores; importa una sola vez.

## Qué prueba cada evento

| Evento | Funciones visibles |
| --- | --- |
| Noche de Arte y Cine | Fotografía, cartel completo, programa de una jornada, bloques y vídeo de YouTube con carga voluntaria, acceso gratuito. |
| Ruta familiar del olivar | Categoría naturaleza, cartel completo en el carrusel, precio sin especificar, galería y visor. |
| Taller de pan y aceite | Dos días con selector de jornadas, precio de pago, plazo y botón de reserva de prueba, bloque de imagen y texto. |

El vídeo es el corto de muestra [Big Buck Bunny de Blender](https://www.youtube.com/watch?v=aqz-KE-bpKQ); no representa una actividad municipal real. El botón de reserva de la tercera ficha abre `example.com` y **no permite reservar ni pagar**. Ninguno de los tres eventos anuncia una convocatoria real.

Las fechas son de noviembre y diciembre de 2026 para que puedan verse como próximos eventos durante la revisión actual. Después de esas fechas, seguirán en el calendario histórico, pero dejarán de figurar entre los próximos y destacados.
