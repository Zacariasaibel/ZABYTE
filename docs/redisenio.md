# Presentación comercial de ZABYTE

Estado de cierre: build y E2E completos superados por el usuario a 1440/800/390/320. Las comprobaciones y bloqueos citados en los apartados históricos corresponden a fases anteriores; el informe vigente es verificacion-v1.md. El despliegue público sigue pendiente.

## Marca e interfaz

ZABYTE es la marca de la tienda. La cabecera utiliza una marca tipográfica y un enlace funcional Warenkorb con icono y contador; no hay cuentas de cliente. Se actualizan footer, títulos de rutas, título de detalle, metadatos, favicon, Admin y documentación. Se mantienen los identificadores internos y las rutas existentes; por eso algunos slugs y el identificador interno del proyecto Angular conservan nombres históricos.

El catálogo sigue siendo el centro de la pantalla: búsqueda en cabecera, categorías reales del API, filtros en la URL y una introducción breve. La paleta usa blanco, gris y texto oscuro, con azul #2563EB como único acento. Los mensajes de demostración, aprendizaje e imágenes generadas se han retirado de la superficie comercial por instrucción actual.

Las tarjetas reservan imagen 4:3 en todas las filas, con ajuste `contain`. El contenido usa filas regulares para nombre, descripción breve, precio, stock y enlace. Se reduce el espacio entre descripción y precio sin usar relleno flexible de altura indefinida. Se elimina la fila Details ansehen y se añade un botón independiente para la cesta, fuera del enlace principal. La descripción breve ocupa un máximo de dos líneas; el detalle mantiene el texto completo.

## Representaciones generadas y datos

Las diez fichas utilizan diez WebP de estudio distintos, generados para productos ficticios. No son fotografías de modelos reales. El mapa usa los slugs y no el SVG compartido de los teclados: el completo negro y el compacto gris ya no comparten imagen. Catálogo y detalle usan la misma resolución. Véase [imagenes.md](imagenes.md).

Se sincronizaron nombres y descripciones incompatibles mediante la fuente compartida `DEMO_PRESENTATION` y el comando existente. Se preservaron todos los campos restantes, incluida la categoría. No se reinicializó SQLite. El error de imagen se reinicia al navegar entre productos; se mantienen los SVG como alternativa.

## Funcionalidad conservada

Angular standalone, TypeScript estricto, Django, DRF y SQLite no cambian. La búsqueda y las categorías siguen consultando el API real. Los parámetros se mantienen en las URLs y en los enlaces de regreso del detalle. Se conservan carga, error, reintento, resultados vacíos, navegación, accesibilidad y fallback de imágenes.

Se añade cesta y compra simulada, sin cuentas, pagos, datos personales, valoraciones ni promesas de entrega. La arquitectura y las garantías de reintento se detallan en [cesta-pedidos.md](cesta-pedidos.md).

## Dependencias y verificación

El resultado vigente aportado por el usuario es **16 avisos de desarrollo y 0 de producción**. No se cambian paquetes. Véase [dependencias.md](dependencias.md).

El informe de comprobaciones separa pruebas automatizadas, build y revisión visual real: [verificacion.md](verificacion.md). Un intento de Chrome bloqueado no cuenta como revisión visual. No se hace staging, commit, push ni publicación.
