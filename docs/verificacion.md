# Informe del bloque anterior: cesta y compra simulada de ZABYTE

El estado vigente del cierre V1 está en [verificacion-v1.md](verificacion-v1.md). Este archivo conserva la trazabilidad de las comprobaciones anteriores; sus 32 pruebas y bloqueos no sustituyen el informe actual.

## Implementación

- Paleta azul solicitada en cabecera, navegación, catálogo, detalle, cesta, checkout, enlaces, botones y foco. Los diez WebP conservan fondo blanco, zonas 4:3 y contain.
- Se elimina Details ansehen. La superficie principal de la tarjeta sigue siendo un enlace RouterLink; In den Warenkorb es un botón hermano independiente.
- Cesta compartida: cantidades, quitar artículos, subtotal/total exactos en céntimos, contador de unidades, persistencia de IDs/cantidades y confirmación accesible.
- Checkout sin datos personales ni tarjeta: resumen, simulación y confirmación del servidor.
- Nueva migración 0002 añade SimulatedOrder y SimulatedOrderLine. Se aplicó después de una copia SQLite consistente en .local/backups/cart-20261101-before-migration.sqlite3.
- No se ejecutó el seed en la base existente. La actualización de textos eliminó referencias visibles a las imágenes generadas; se preservaron nombres, IDs, slugs, precios, existencias, categorías, rutas de imagen y estados.
- Los hashes de las dependencias, product-photos.ts y los diez WebP no cambiaron. Los teclados mantienen sus dos asignaciones distintas por slug.
- La API del catálogo sigue siendo de lectura. El endpoint independiente de simulaciones exige CSRF y calcula desde la base. Pedidos y líneas quedan en una transacción, sin modificar stock.

## Pruebas realizadas

| Comprobación | Resultado |
| --- | --- |
| manage.py test catalog | **32 pruebas superadas** en una base temporal. |
| Pruebas de pedidos | Tipos enteros estrictos, cantidades/IDs inválidos, agotados/inactivos, precio manipulado, cálculo Decimal, rollback parcial y fallo inyectado, repetición y conflicto de clave, CSRF anónimo, acceso Admin y ausencia de listado público. |
| Concurrencia | Dos conexiones envían la misma clave; solo queda un pedido y una línea. Bloqueos SQLite se reintentan con la misma clave, sin duplicados. |
| ngc -p frontend/tsconfig.app.json | Compilación estricta de TypeScript y plantillas superada. |
| node frontend/scripts/check-cart.mjs | Persistencia/recarga, datos corruptos, precios almacenados manipulados, céntimos exactos, altas/cambios/bajas, cantidades inválidas, agotados, sobrestock, productos inexistentes, refresco fallido, error de servidor, doble clic, reintento tras recarga, confirmación inválida, CSRF fallido y almacenamiento bloqueado. |
| Limpieza local tras confirmar | Si falla la escritura se mantiene la clave pendiente; al recuperarse se confirma con la misma clave y no se genera otro pedido. |
| node frontend/scripts/check-product-images.mjs | Diez slugs/archivos/hashes distintos y fallback de imágenes al navegar entre teclados. |
| manage.py check y makemigrations --check --dry-run | Sin incidencias ni migraciones pendientes. |
| Sintaxis de scripts y formato de fuentes | Revisados, aceptando correctamente archivos vacíos. |

Las pruebas Angular ejecutan servicios/componentes reales con inyector, almacenamiento y respuestas HTTP controlados. No renderizan DOM y no equivalen a una revisión visual.

## Prueba HTTP sobre los servidores existentes

Se reutilizaron los procesos que respondían en 127.0.0.1:4200 y :8000. No se arrancaron otros servidores.

Con un cliente HTTP y cookie jar se comprobó el recorrido real a través del proxy Angular:

1. GET /api/csrf/ devuelve token enmascarado y cookie.
2. POST /api/simulated-orders/ con Origin del frontend, cabecera CSRF, UUID e IDs/cantidades devuelve **201**.
3. Repetir exactamente la solicitud devuelve **200** y la misma confirmación.
4. El pedido tiene una línea de una unidad y total **29,90 EUR**, calculado desde SQLite.
5. Todos los campos de todos los productos coinciden antes/después; no se descontó stock.

Queda **una única simulación de comprobación**, revisable en Django Admin. Su respuesta se guardó localmente bajo .local/live-order-result.json. No se recogieron datos personales ni se realizó pago o envío. Los tests unitarios adicionales usan exclusivamente su base temporal.

## AssertionError de backend/catalog/__init__.py aclarado

El archivo tiene **0 bytes** y es un módulo de paquete Python válido. Se comprobó con compile y con las importaciones y pruebas Django.

El AssertionError anterior lo provocó mi comprobador artesanal de formato, que exigía un salto final también a archivos vacíos. La condición correcta acepta contenido vacío o contenido terminado en salto de línea. Se corrigió esa comprobación, sin añadir contenido artificial a __init__.py. No era un error de Django, de migración ni un módulo pendiente de reparar.

## Build: un intento, bloqueado

Se ejecutó una sola vez:

```powershell
npm.cmd run build --prefix frontend
```

El proceso del ejecutor Codex terminó con **spawn EPERM**. No se repitió el intento ni se cambiaron paquetes para compensarlo. La comprobación directa del compilador Angular sí pasó. Para comprobar el bundle actual, ejecutar el comando en PowerShell normal.

## Navegador, teclado y 320 px: pendientes

Chrome headless se intentó una vez con perfil exclusivo .local/chrome-cart-review y puerto 9343. Terminó con acceso denegado 0x5 en el canal Mojo/Crashpad. No llegó a exponer su puerto de depuración.

Por tanto, no se da por realizada la revisión visual en escritorio, 800, 390 o 320 px ni la navegación real con Tab. Se conservaron controles nativos, etiquetas y foco CSS visible; el script de navegador contiene las comprobaciones de enlaces, botones separados, foco, cesta, persistencia, checkout y confirmación, pero no pudo ejecutarlas en un navegador de este entorno. No hay nuevas capturas.

```powershell
# Con los servidores existentes respondiendo:
npm.cmd run test:e2e --prefix frontend
```

Este script crea una simulación de prueba al final, sin reducir stock. Su prueba debe usar un navegador de QA independiente; no una sesión personal.

## Alcance y cierre

- El origen ficticio y generado permanece en README y documentación técnica; se retiraron los avisos visibles del catálogo, fichas, cabecera y footer por la nueva instrucción.
- El checkout y su confirmación sí identifican la operación como simulada; nunca indican pago o envío realizados.
- Se mantienen los 16 avisos de desarrollo y 0 de producción aportados por el usuario, sin cambiar dependencias ni ejecutar audit fix.
- El Chrome temporal terminó y no queda el puerto 9343 escuchando. Los servidores existentes se conservan.
- No hay repositorio Git: git diff --check no aplica. No se ha hecho staging, commit, push ni publicación.

La arquitectura y sus límites están en [cesta-pedidos.md](cesta-pedidos.md).
