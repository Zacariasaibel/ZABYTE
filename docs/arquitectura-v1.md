# Cierre de V1: recorrido y decisiones

CatalogComponent lee search, category, sort y available de ActivatedRoute; CatalogService los convierte en parámetros de /api/products/. Django valida opciones, combina filtros y ordena en SQLite. El precio usa orden numérico y el ID desempata; Name A–Z usa Lower(name) y luego ID. No se cambia ningún producto. Una respuesta determina tarjetas y contador.

catalog-filters.ts centraliza lectura/escritura de URL. Cabecera, tarjetas y regreso desde detalle conservan los cuatro parámetros. Los valores por defecto se omiten de los enlaces; una URL de interfaz con orden desconocido vuelve al orden por nombre. La API rechaza opciones de orden/disponibilidad inválidas con 400. El historial continúa usando Router, sin estado paralelo en localStorage.

CartService conserva IDs/cantidades y recupera precios actuales del API sin aplicar el filtro de disponibilidad. Así un agotado o un producto eliminado no desaparece silenciosamente de la cesta. Se mantienen validaciones, céntimos enteros, UUID persistente, CSRF, transacción y snapshots del servidor. Las pruebas de pedido usan una base temporal; sus llamadas a seed_demo no se ejecutan en la SQLite del proyecto.

CartNoticeComponent presenta una notificación fija sin desplazar contenido. NotificationTimer dispone de seis segundos efectivos: pausa por puntero y foco, conserva ambas razones simultáneas y cancela al cerrar o destruir. El cambio de ruta limpia el mensaje. No mueve el foco. Advertencias de almacenamiento permanecen disponibles en cesta/checkout aunque desaparezca una notificación temporal.

El resumen de cesta es sticky en escritorio y vuelve al flujo normal a 950 px. Checkout y confirmación comparten ancho máximo de 820 px. El indicador tiene tres pasos y solo marca confirmación si existe una respuesta válida. Referencia, líneas y total proceden del recibo real de Django.

Producción: navegador → Caddy (TLS y archivos Angular) → /api o /admin → Waitress → Django → volumen SQLite. Caddy sirve index únicamente para rutas SPA conocidas; faltantes API, estáticos y rutas desconocidas no se transforman en una respuesta 200 del frontend. Django confía en el esquema enviado por el proxy porque su puerto no se publica y permanece en una red privada.

No se modifica el mapa de imágenes por slug, los diez WebP, dependencias npm ni requisitos Python de desarrollo. Se añade exclusivamente Waitress para producción. Véanse despliegue, dependencias y verificacion-v1 para resultados y límites.
