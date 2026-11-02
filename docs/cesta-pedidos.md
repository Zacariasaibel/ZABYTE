# Cesta y pedidos simulados de ZABYTE

El estado vigente del cierre V1 y sus 34 pruebas backend está en [verificacion-v1.md](verificacion-v1.md). Las cifras de 32 pruebas más abajo corresponden al bloque anterior; se conservan como trazabilidad de esa implementación.

## Presentación

La interfaz usa blanco #FFFFFF, fondos #F6F7F9, texto #171A21, texto secundario #667085, bordes #E4E7EC y acciones/foco #2563EB con hover #1D4ED8. Los diez WebP de estudio y el mapa por slug no cambian. Las zonas de imagen siguen siendo blancas 4:3 con contain.

La tarjeta es un enlace real al detalle y tiene un botón hermano independiente, sin botones dentro del enlace ni div con onclick. Desaparece la fila Details ansehen. La cabecera incorpora acceso a Warenkorb y contador de unidades. No hay avisos de portfolio, demostración o imágenes generadas en catálogo, detalle, cabecera o footer; el origen ficticio sigue documentado aquí y en README. El checkout sí identifica su acción como simulada.

## Cesta compartida

CartService mantiene señales para IDs/cantidades, productos recuperados de la API, carga, errores, confirmación y petición pendiente. El catálogo y el detalle lo comparten con las rutas /warenkorb, /kasse y /bestaetigung.

localStorage contiene dos estructuras separadas:

- zabyte.cart.v1: versión e items con productId/quantity.
- zabyte.checkout.v1: UUID de idempotencia e items con product_id/quantity, solo mientras un intento necesita confirmación.

No se leen precios guardados en el navegador. parseCart valida tipos, enteros positivos, duplicados y límites; los campos extra, incluidos precios manipulados, no se conservan. Una estructura corrupta se descarta con un mensaje comprensible. Un producto eliminado o inactivo no se inventa: aparece como no disponible, con opción de quitarlo.

Al añadir o cambiar cantidades se consulta el detalle real del producto. La cesta también refresca el listado al abrirse. No se permite añadir stock 0 ni sobrepasar la disponibilidad conocida; el servidor comprueba de nuevo la disponibilidad al crear la simulación. Un fallo de refresco no elimina IDs ni cantidades.

priceToCents transforma strings decimales en enteros. Subtotales y suma usan centavos enteros, con cantidades máximas de 10.000 y hasta 100 líneas. EuroCentsPipe construye el formato alemán desde la parte entera y los dos dígitos restantes, sin redondear sumas binarias.

## Del botón a SQLite

1. El usuario revisa la cesta y abre Zur Kasse. No hay formularios de tarjeta, correo, dirección ni otros datos personales.
2. CartService crea o recupera una UUID y guarda el intento antes de enviarlo. Durante un intento de resultado incierto la selección queda bloqueada para evitar cambiar la carga de un reintento.
3. GET /api/csrf/ entrega un token enmascarado y establece la cookie. El POST lleva X-CSRFToken. El endpoint exige CSRF también a usuarios anónimos; no usa una sesión Admin como autorización.
4. OrderInput solo acepta UUID, IDs y cantidades JSON enteras positivas. Rechaza bool, strings numéricos, floats, duplicados, campos de precio/total y datos personales.
5. La solicitud normalizada, ordenada por ID, se resume en SHA-256. Una clave existente con el mismo resumen devuelve el pedido previo; con otro resumen genera 409.
6. En una transacción se reclama la clave única, se consultan productos activos y stock y se crean las líneas con nombre, slug, precio unitario y subtotal tomados de la base de datos. El total usa Decimal.
7. Cualquier validación o fallo durante las líneas revierte toda la creación. No se actualiza Product ni se descuentan existencias.
8. El cliente valida que la confirmación esté marcada como simulada, corresponda a los mismos IDs/cantidades y tenga totales coherentes. Solo entonces vacía la cesta y muestra el recibo del servidor.

No se conserva una copia local de los precios como fuente de verdad. La confirmación se mantiene en memoria. No se expone una lista pública de pedidos ni una ruta GET por UUID.

## Reintentos y concurrencia

La doble pulsación no lanza una segunda petición mientras submitting está activo. En recarga o pérdida de respuesta se recupera el mismo intento y UUID; no se genera una nueva clave para repetir una solicitud incierta.

Los errores de red, 5xx, respuesta mal formada o CSRF no descartan esa clave. El error podría haberse producido después de guardar el pedido, por lo que se debe intentar recuperar la misma confirmación. Un rechazo explícito invalid_order, stock_conflict o idempotency_conflict permite revisar la selección sin vaciarla.

La restricción única de idempotency_key es la defensa final frente a peticiones concurrentes. En SQLite se inserta primero la clave dentro de la transacción para serializar escritores; un bloqueo de escritura devuelve 503 para reintentar con la misma clave. La prueba concurrente usa dos conexiones y comprueba que termina existiendo un solo pedido.

Si el almacenamiento local está bloqueado, se evita enviar un nuevo intento que no pueda recuperarse. Si falla su limpieza después de una confirmación, se conserva el intento para poder resolverlo sin generar otro pedido.

## Modelo y Admin

SimulatedOrder guarda UUID, clave única, resumen de solicitud, fecha, bandera simulada y total. SimulatedOrderLine guarda producto y snapshots de nombre, slug, cantidad y precios. Restricciones SQL protegen cantidades, importes positivos, producto único por pedido y bandera simulada.

Los productos con líneas se protegen frente a borrado. El Admin exige sus permisos habituales y ofrece revisión de pedidos y líneas como datos de solo lectura. No se implementan estados de pago, entrega o envío.

## Migración y conservación

Se creó una copia consistente de SQLite antes de aplicar catalog.0002_simulatedorder_simulatedorderline. La migración solo añade las dos tablas de pedidos. No se ejecutó seed_demo sobre los datos del usuario. sync_demo_presentation retiró referencias repetidas a las imágenes generadas de las descripciones, compartidas por seed y API; los nombres y campos protegidos permanecieron iguales.

Se compararon productos antes/después y se verificaron los hashes de las dependencias, del mapa de imágenes y de los diez WebP. El test HTTP real creó una única simulación de comprobación; su reintento recuperó el mismo UUID y no cambió ningún campo de los productos.

## Comprobaciones y límites

32 pruebas backend incluyen catálogo, migración de textos, validación estricta, precios manipulados, exactitud decimal, agotados/inactivos, rollback, CSRF, Admin, reintentos y concurrencia. check-cart.mjs ejecuta el servicio Angular real con almacenamiento y respuestas HTTP controlados: persistencia, datos corruptos, precios no confiables, límites, servidor fallido, doble envío, recarga, confirmación mal formada y almacenamiento bloqueado.

Estas pruebas no renderizan el navegador. El script de navegador está ampliado para catálogo, detalle, cesta, checkout, confirmación, foco y tabulación en escritorio y hasta 320 px, pero Chrome no pudo iniciar su canal Mojo en Codex. Véase verificacion.md para distinguir pruebas realizadas de pendientes.

El AssertionError histórico de backend/catalog/__init__.py era del comprobador artesanal que exigía un salto final incluso a un archivo de cero bytes. Un __init__.py vacío es válido: se importa, compila y pasa las pruebas. El comprobador acepta ahora archivos vacíos, sin insertar contenido artificial en el paquete.
