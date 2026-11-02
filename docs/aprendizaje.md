# Cómo funciona ZABYTE

El catálogo está conectado a SQLite mediante una API. La interfaz y el README público están en alemán; el código usa identificadores en inglés. Incluye cesta compartida y pedidos simulados. No hay cuentas de clientes, pagos ni envío real. El cierre V1 se explica en [arquitectura-v1.md](arquitectura-v1.md); los resultados y bloqueos actuales están en [verificacion-v1.md](verificacion-v1.md).

## Las piezas

- **Angular** dibuja la interfaz con componentes standalone. TypeScript estricto ayuda a detectar usos incorrectos de datos. `CatalogService` concentra las peticiones HTTP y define los tipos `Category` y `Product`.
- **Angular Router** conecta `/` con el listado y `/produkte/:slug` con el detalle. Búsqueda, categoría, orden y disponibilidad se guardan como parámetros de URL. Compartir o recargar la URL conserva los filtros; el enlace de regreso desde detalle también los conserva.
- **Django REST Framework** transforma los modelos en JSON y proporciona las vistas de lectura. No existen rutas públicas para crear, modificar o borrar productos. Un endpoint separado registra pedidos simulados con validación y CSRF.
- **Django ORM** consulta SQLite sin construir SQL manualmente. `select_related('category')` obtiene cada producto junto a su categoría y evita una consulta adicional por tarjeta.
- **Django Admin** proporciona la gestión privada. Exige autenticación y permisos. Usa sesiones, protección CSRF y validadores de contraseña de Django.

## De la pantalla a la base de datos

1. La persona escribe `Tastatur` en la cabecera, pulsa `Suchen` y elige el enlace `Tastatur & Maus`.
2. Angular cambia la URL a `/?search=Tastatur&category=eingabe`.
3. El componente lee los parámetros y llama a `CatalogService.products()`.
4. `HttpClient` envía `GET /api/products/?search=Tastatur&category=eingabe`. Durante desarrollo, el proxy de Angular lo reenvía a Django en el puerto 8000.
5. Django resuelve la ruta en `catalog/urls.py`. La vista valida la longitud y el formato de los filtros.
6. El ORM combina `is_active=True`, `name__icontains='Tastatur'` y `category__slug='eingabe'`. SQLite devuelve los productos correspondientes.
7. El serializer convierte el resultado en JSON. El precio viaja como string decimal, por ejemplo `"69.90"`, para conservar su representación exacta.
8. Angular recibe los datos y sustituye el estado de carga por las tarjetas. `CurrencyPipe` muestra el precio según el formato alemán: `69,90 €`.

Las búsquedas se envían al pulsar el botón o Enter. `switchMap` cancela la suscripción de una petición anterior al cambiar la ruta o los filtros. `takeUntilDestroyed` libera las suscripciones al salir del componente. Los errores HTTP se convierten en un estado visible con reintento; una lista vacía tiene su propio mensaje.

Tras el rediseño, la cabecera vive en `AppComponent` y aparece también en el detalle. Escucha los eventos de navegación para mantener el campo de búsqueda y la categoría activa sincronizados con la URL, incluso al usar atrás y adelante. Sus categorías vienen del mismo API. El listado conserva la lectura de parámetros y la petición filtrada; no filtra una copia local de los productos.

## Datos y validación

`Category` contiene nombre y slug únicos. `Product` contiene nombre, slug único, descripción, precio decimal positivo, categoría obligatoria, ruta SVG local, existencias no negativas y estado activo.

El método `save()` llama a `full_clean()`, así que la validación se aplica también fuera del Admin. El precio usa `Decimal`, no un float. La base de datos añade restricciones para precio positivo y existencias no negativas. `PROTECT` evita borrar una categoría utilizada. Las actualizaciones masivas del ORM omiten `save()`; las restricciones de base de datos siguen protegiendo precio y existencias, pero deben evitarse para saltar validaciones de texto e imágenes.

La imagen es una ruta validada bajo `/assets/products/`, no una subida. Los SVG originales se conservan como alternativa. Las diez fichas conocidas seleccionan representaciones generadas locales mediante el slug en product-photos.ts; los dos teclados comparten SVG de alternativa pero tienen WebP diferentes. Véase imagenes.md. Si se añade un nombre de archivo nuevo en Admin, también hay que crear ese archivo local.

Un producto inactivo devuelve 404 y desaparece de la lista pública. Uno agotado sigue visible por defecto: `stock === 0` muestra `Ausverkauft`; el filtro `available=1` limita el listado a stock positivo. El catálogo no reserva ni descuenta unidades.

## Seguridad y configuración

Los endpoints de catálogo declaran únicamente GET, HEAD y OPTIONS. Incluso un usuario administrador recibe 405 si intenta modificar el catálogo por esta API. El POST de simulaciones es independiente y no modifica los productos. La configuración general de DRF exige autenticación. Las vistas públicas se declaran explícitamente: lectura del catálogo y creación anónima de simulaciones con protección CSRF.

La clave secreta se toma de una variable de entorno obligatoria. El script local genera una clave aleatoria en memoria si no existe. No hay contraseñas de demostración ni claves en el código. SQLite y los artefactos locales se ignoran. El Admin pertenece al backend y conserva sus protecciones de autenticación y CSRF.

El proxy local resuelve la comunicación entre puertos sin habilitar CORS para cualquier origen. Para producción se preparó una configuración separada: Caddy y Waitress con un mismo origen HTTPS, ajustes por entorno y SQLite persistente. El procedimiento y sus comprobaciones todavía pendientes están en [despliegue.md](despliegue.md).

## Datos de demostración y comprobaciones

`seed_demo` usa una transacción y `update_or_create` con slugs estables. Repetirlo mantiene diez productos de demostración y cuatro categorías. Restablece sus campos y existencias, pero conserva productos adicionales. No crea usuarios.

Las pruebas del backend verifican listado, detalle, ordenación, filtros combinados, validación, productos inactivos y agotados, rechazo de escritura, Admin, protección de categorías, pedidos e idempotencia. También comprueban los SVG de fallback. El usuario confirmó el build final y el E2E completo a 1440/800/390/320 px, incluidos checkout, Origin, foco, errores y reintentos. Los bloqueos anteriores de Codex quedan como antecedentes; no invalidan esa ejecución local. El despliegue HTTPS sigue pendiente y se distingue de estas pruebas en verificacion-v1.md.

Para estudiar el proyecto, empieza por `frontend/src/app/catalog.component.ts`, sigue hacia `catalog.service.ts`, después `backend/catalog/views.py`, `serializers.py` y finalmente `models.py`. Las migraciones describen la estructura física que Django crea en SQLite.

## Textos compartidos y conservación de la base

Los nombres y descripciones actuales están en `backend/catalog/demo_presentation.py`. Tanto el seed como `sync_demo_presentation` leen esa misma fuente. Este último comando se puede repetir y solo actualiza los dos campos de texto de productos ya existentes; no reinicia precios, existencias, IDs ni categorías y no recrea productos eliminados. La interfaz no tiene una segunda copia de los textos: los obtiene del API. Las pruebas comprueban esa conservación y que el seed use los mismos textos.

## Estado de error de la imagen

`ProductImageComponent` usa `resolveProductImage(product)` tanto en tarjetas como en el detalle. El mapa se indexa por `slug`. `linkedSignal` reinicia el error cuando cambia la entrada de producto, incluso si el SVG de alternativa es el mismo. No se hereda el fallo del teclado completo al compacto. Un segundo fallo sobre el SVG no provoca un ciclo de reintentos.

## Cesta y simulación

El recorrido completo desde el navegador hasta la transacción de pedidos se explica en [cesta-pedidos.md](cesta-pedidos.md). La cesta solo persiste IDs y cantidades; los precios vienen del API y se calculan en centavos. La confirmación usa precios Decimal del servidor, una clave idempotente y líneas guardadas en una única transacción. Simular no cambia el stock. Los mensajes históricos sobre IA o demostración ya no se muestran en el catálogo, pero se conservan la procedencia de las imágenes y la explicación del carácter ficticio en la documentación.
