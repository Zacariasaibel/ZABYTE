# Checkout E2E: diagnóstico y corrección de la pulsación

## Estado final de V1: build y E2E completos superados

El usuario confirmó una ejecución correcta de npm.cmd run build --prefix frontend y npm.cmd run test:e2e --prefix frontend en PowerShell normal. La suite terminó íntegramente: checkout, Origin, carga, errores/reintentos, rutas 404, foco por Tab e imágenes, además de catálogo/filtros/detalle/navegación a 1440/800/390/320. Se acepta esa ejecución como evidencia local, sin repetirla por documentación.

Las capturas y diagnósticos de esa ejecución están en .local/qa; cinco capturas reales revisadas y optimizadas se conservan en docs/screenshots. Véanse portfolio.md y verificacion-v1.md. **No quedan pendientes los fallos locales de checkout, Origin ni foco.** El despliegue público, TLS y comprobaciones de contenedores sí están pendientes y no se declaran probados.

Todo lo que sigue es el historial de diagnóstico de bloques anteriores. Sus apartados sobre bloqueos o ejecuciones pendientes ya fueron resueltos por la ejecución completa del usuario; se conservan únicamente como trazabilidad.

## Antecedente resuelto: foco del buscador

El usuario confirma que checkout y Origin ya pasan. El siguiente fallo fue un campo activo tras focus() cuyo outlineStyle computado era none. La suite completa todavía no ha terminado satisfactoriamente.

Se revisaron todos los estilos de frontend/src: el contorno general depende de :focus-visible; no había una sobrescritura que quitara outline al buscador. main:focus solo afecta al elemento main. El buscador no tenía :focus ni :focus-within propios. Los overflow:hidden encontrados corresponden a etiquetas ocultas y tarjetas/imágenes, no a sus contenedores. Formulario, cabecera y shell no declaran recorte. Esta revisión del código no demuestra por qué Chrome devolvió none en la ejecución anterior: no se dispone de los estilos computados completos ni de matches(':focus-visible') de aquel momento.

Se añadió un contorno explícito a input:focus y button:focus dentro de .header-search: azul existente, 3 px y separación de 3 px. position:relative y z-index:1 elevan el control enfocado sobre su vecino para evitar posibles superposiciones. No cambia tamaños ni distribución. El contraste calculado del azul sobre blanco supera 3:1; el contraste y el recorte realmente renderizados quedan pendientes del navegador.

El E2E ya no alcanza el buscador mediante focus(): recarga un documento, pulsa Tab real mediante CDP hasta #search y conserva la comprobación de que el siguiente Tab llega a Suchen. A 1440, 800, 390 y 320 px compara estados con/sin foco y exige contorno sólido de al menos 3 px, separación, contraste mínimo 3:1, límites del viewport y ausencia de recorte por ancestros. Registra matches(':focus-visible') como diagnóstico; no exige ese selector porque el indicador implementado usa :focus. No acepta una sombra estática como alternativa. Conserva todas las pruebas previas.

Resultados de esta pasada:

- Sintaxis del script y expresiones JavaScript enviadas al navegador comprobadas. El comprobador de foco, ejercitado con estados controlados, rechaza indicadores ausentes, estáticos, de bajo contraste o recortados; esto no es una prueba de renderizado CSS.
- Comprobación de fuentes y UTF-8: 51 archivos superados.
- E2E completo intentado una vez reutilizando los servidores existentes; Chrome no abrió el endpoint de depuración. Terminó mediante la limpieza prevista. Sin capturas nuevas del foco ni revisión visual superada.
- Build ejecutado una vez por el cambio CSS: bloqueado con spawn EPERM al iniciar esbuild. No se repitió el intento ni se cambiaron dependencias. El build anterior aportado por el usuario corresponde al estado previo al ajuste CSS.

Pendiente en PowerShell normal, raíz del proyecto y servidores activos:

```powershell
npm.cmd run build --prefix frontend
npm.cmd run test:e2e --prefix frontend
```

El E2E guardará focus-search-1440.png y focus-suchen-1440.png, además de sus variantes 800/390/320, y focus-diagnostic-<fecha>.json en .local/qa. Si falla, conserva la captura general de fallo. Solo se dará por aprobada la suite si termina íntegramente, incluidas ambas comprobaciones de foco. Las siguientes secciones describen los bloques anteriores.

## Antecedente resuelto: corrección de Origin

La última ejecución aportada por el usuario **sí confirmó la compra simulada**: POST /api/simulated-orders/ con HTTP 201, total 29,90 €, navegación a /bestaetigung, referencia coincidente, cesta vacía y pedido correspondiente en SQLite. El fallo posterior era del test: confundía la cabecera HTTP Origin (no observada en el evento básico) con el origen de la URL de destino. No es evidencia de un fallo de compra ni de CSRF.

Se sustituyó el campo ambiguo origin por:

- `requestUrlOrigin`: new URL(request.url).origin de la petición realmente capturada; es el dato comparado con el origen configurado del frontend.
- `httpOriginHeader`: valor literal observado de la cabecera, o null si no se ha observado. La cadena literal "null" es distinta de la ausencia de datos.
- `httpOriginHeaderSource`: requestWillBeSent, requestWillBeSentExtraInfo o null; `extraInfoObserved` indica si llegó el evento adicional.

Network.requestWillBeSentExtraInfo se correlaciona por requestId aunque llegue antes o después del evento básico. Los nombres de cabeceras se buscan sin distinguir mayúsculas; solo se conservan Origin y la presencia booleana de X-CSRFToken. Nunca se copian cookies, tokens, Authorization ni cabeceras completas al informe. Un Origin diferente se registra como observado, no se reemplaza; un Origin ausente sigue siendo null. Esta comprobación de mismo origen usa la URL de destino y no pretende verificar una cabecera ausente. Las comprobaciones existentes de CSRF, recibo, referencia, idempotencia y cesta permanecen.

Verificación de esta corrección: pruebas del diagnóstico superadas, incluidas ambas secuencias de eventos, aislamiento entre requestIds, destinos distintos, cabeceras ausentes o diferentes, Origin literal "null", protección de secretos y correlación SQLite de solo lectura. Sintaxis de los tres scripts y comprobación de fuentes/UTF-8 revisadas. El E2E completo se intentó una vez en Codex, pero Chrome no abrió su endpoint de depuración; terminó por la ruta de limpieza. **La suite completa no se declara superada.** No se repitió el build ni se modificó aplicación, diseño, dependencias o datos.

Único comando pendiente en PowerShell normal, raíz del proyecto con servidores activos:

```powershell
npm.cmd run test:e2e --prefix frontend
```

Guardará diagnóstico y captura al fallar en .local/qa. Para aprobar la suite debe terminar también las pruebas posteriores al checkout. Las secciones siguientes conservan el historial del fallo anterior; sus referencias a checkout pendiente o causa probable de teclado no sustituyen la evidencia HTTP 201 más reciente.

## Resultado real de partida

El usuario confirmó el build Angular, las comprobaciones de 47 archivos y el catálogo/filtros/navegación a 1440, 800, 390 y 320 px. El test alcanzó checkout, pero expiró esperando «server confirms simulated order». Las capturas reales de catálogo, detalle, cesta y checkout están en .local/qa. No se interpreta ese fallo como un fallo del build ni como una compra confirmada.

## Revisión y causa probable

El test enfocaba un botón nativo type=button y enviaba keyDown/keyUp con key Enter, pero sin text ni unmodifiedText. Se encontró ese defecto concreto en la simulación de teclado: faltaba el carácter de Enter `\r` usado para la activación nativa. pressEnter ahora envía una secuencia completa, también utilizada para abrir tarjetas con teclado. No utiliza click como alternativa ni incrementa el timeout de 15 segundos.

La [implementación primaria de teclado de Puppeteer](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Input.ts) envía text/unmodifiedText y su [definición de Enter](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/common/USKeyboardLayout.ts) establece ese carácter. Es una referencia para construir el evento CDP, no una prueba de que la ejecución fallida original tuviera esa única causa.

La activación incompleta es la **causa probable**, todavía pendiente de confirmación en Chrome. No hay traza de red ni captura posterior al error de la ejecución original: no puede afirmarse retrospectivamente si no salió el POST o si fue rechazado. La SQLite local consultada contiene dos pedidos previos y ninguno creado durante la ejecución del usuario a las 19:30; esto descarta una creación exitosa en esa base, pero por sí solo no distingue ausencia de envío de un 403.

Revisión del contrato:

- CartService obtiene `/api/csrf/`, envía X-CSRFToken al POST `/api/simulated-orders/`, valida el recibo y vacía la cesta únicamente después de una respuesta válida. Conserva el intento incierto con la misma UUID.
- Checkout navega a `/bestaetigung` tras recibir el recibo. ConfirmationComponent usa selector app-confirmation y muestra «Simulation bestätigt» en #confirmation-title. El texto esperado original coincide; no se encontró un selector de componente equivocado.
- El test ahora exige ruta y título correctos, una única activación y un único POST, estado 200/201, CSRF presente, origen esperado, recibo marcado como simulación, referencia idéntica a la respuesta y contador vacío. Conserva todas las comprobaciones de éxito anteriores y añade condiciones verificables.
- Cada ejecución abre un perfil aislado y limpia cesta/intento entre tamaños. Antes de confirmar exige que no haya intento pendiente ajeno. El diagnóstico detecta si se reutiliza el intento inicial mediante una huella, sin guardar su UUID completa.
- Django conserva validación estricta, precios Decimal desde SQLite, transacción y clave única. No se modificó código de aplicación, diseño, protección CSRF ni cálculo/stock.

## Comprobaciones repetidas en Codex

- 14 pruebas de pedidos superadas: CSRF, validaciones, importes, rollback, agotados, concurrencia e idempotencia.
- check-cart.mjs superado: persistencia, precios actuales, cantidades/límites, errores, doble envío, reintento tras recarga y validación del recibo.
- check-checkout-diagnostics.mjs superado: secuencia de Enter, ausencia de petición frente a 403/201, clasificación segura de rechazo CSRF, respuesta pública, detección de reutilización y correlación SQLite de solo lectura sobre una base desechable. Verifica que no se serializan cookies, tokens, claves completas ni páginas HTML de depuración.
- HTTP real mediante los servidores existentes: CSRF/cookie/Origin y dos repeticiones con la clave previa devolvieron **200/200**, mismo UUID `5eba3b3a-4611-4314-8a72-7447eed0941b`, total 29,90 €. Un solo pedido para esa clave, productos intactos. Esta prueba no equivale a activar el botón en Chrome.
- Un único intento de E2E en Codex: Chrome no abrió su endpoint de depuración. Se ejecutó la limpieza del test. No se repitió el lanzamiento ni se declaró resuelto el recorrido renderizado.
- No se repitió el build: no se cambió la aplicación Angular y el usuario ya confirmó el build actual. Solo se modificaron scripts de prueba y documentación. README: 304 palabras, alemán sencillo.

## Una ejecución personal pendiente

Con los servidores existentes activos, PowerShell normal desde la raíz:

```powershell
npm.cmd run test:e2e --prefix frontend
```

No hacen falta paquetes nuevos ni un build adicional. Mantener por defecto http://127.0.0.1:4200; si se usa SHOP_URL, debe ser un origen HTTP(S) completo sin credenciales/ruta/query. Los dos orígenes locales 127.0.0.1:4200 y localhost:4200 están en la configuración de desarrollo de CSRF; no se desactiva ninguna protección.

Se producirán bajo .local/qa:

- `checkout-diagnostic-<fecha>.json`: ruta esperada/actual, foco y estado del botón, eventos Enter/click, peticiones CSRF/pedido con estado HTTP, presencia del encabezado CSRF (solo booleano), origen, datos públicos del recibo, huella parcial de la clave, mensajes visibles y contador. Nunca se recupera el cuerpo de `/api/csrf/` para el diagnóstico.
- `failure-<fecha>.png`: captura real al fallar, independiente de que las imágenes hayan cargado correctamente.
- Si tiene éxito, `confirmation-320.png` y el mismo diagnóstico con outcome confirmed. El recorrido crea una simulación, sin pago ni envío.

En origen local y si el archivo existe, el runner consulta SQLite con node:sqlite en modo de solo lectura para comprobar si la clave corresponde a un pedido. Solo guarda referencia, total y recuento, sin la clave. Es una base candidata local: si el servidor usa otra ruta, definir DJANGO_DB_PATH coherentemente o comprobar el pedido en Admin. En un origen remoto no se inspecciona SQLite local.

Lectura del resultado: cero clicks indica activación de teclado/foco; click sin peticiones apunta a una condición del cliente; CSRF 403 se clasifica si el HTML contiene un motivo conocido, sin guardar el HTML; POST 400/409 indica validación/conflicto; 5xx o fallo de red conserva el intento; 200/201 con pedido y recibo correcto pero ruta/título incorrectos apunta al estado/navegación del cliente. No aumentar el timeout para resolver ninguno de esos casos.

## Pendiente

La causa exacta del timeout original y el éxito del checkout renderizado solo podrán cerrarse con esa ejecución. Hasta entonces se informa «evento de teclado corregido y diagnóstico probado; checkout de navegador pendiente». Hosting/HTTPS y publicación siguen fuera de esta comprobación.
