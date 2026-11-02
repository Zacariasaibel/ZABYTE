# Verificación vigente de ZABYTE V1

## Estado local confirmado

El usuario ejecutó correctamente, en PowerShell normal, el build y el E2E completo del estado actual:

```powershell
npm.cmd run build --prefix frontend
npm.cmd run test:e2e --prefix frontend
```

Se toma esa ejecución como evidencia local superada. No se repiten pruebas de aplicación por la selección de capturas y actualización documental de este cierre.

| Comprobación | Resultado real |
| --- | --- |
| Build Angular | Superado por el usuario después del ajuste final de foco. |
| E2E completo | Superado por el usuario hasta el final, no solo hasta checkout. |
| Tamaños | Catálogo, filtros, navegación y foco a 1440, 800, 390 y 320 px. |
| Catálogo y detalle | Categorías, búsqueda combinada con filtros/orden, vacío, agotados, detalle y navegación. |
| Cesta y compra simulada | Altas sin navegación accidental, cantidades, persistencia, checkout, respuesta HTTP 201, referencia coincidente y vaciado tras confirmación. |
| API y seguridad del recorrido | Origin de destino, observación de cabeceras/CSRF, errores, reintentos, carga, 404 y diez imágenes locales/fallback. |
| Foco | Tab real hacia buscador y Suchen, indicador dinámico, contraste y ausencia de recorte, con capturas. |
| Backend previo | 34 pruebas superadas en base temporal, sin migraciones pendientes: validación, importes Decimal, transacción, CSRF, idempotencia, concurrencia y productos intactos. No repetidas por documentación. |
| Estado Angular previo | Pruebas de cesta, imágenes, filtros, temporizador y diagnóstico superadas. |
| Datos | No se reinicializó SQLite ni se ejecutó seed sobre la base del usuario en este cierre. |

## Evidencia disponible

La última ejecución correcta dejó capturas y diagnósticos en .local/qa, con identificador de diagnóstico `2026-11-01T19-29-28-462Z`. El diagnóstico de checkout registra HTTP 201, total 29,90 €, ruta /bestaetigung, referencia coincidente, cesta vacía y pedido SQLite correspondiente; los cuatro registros de foco contienen campo y botón en cada anchura. El final íntegro de la suite y el build se aceptan de la confirmación expresa del usuario, no se deducen únicamente de esos archivos.

Se revisaron visualmente las cinco capturas seleccionadas y se guardaron copias PNG optimizadas sin pérdida en docs/screenshots. Procedencia, dimensiones, pesos y textos alternativos están en portfolio.md y portfolio-project.json. La descompresión de IDAT se compara con el original: píxeles idénticos, sin redimensionar ni generar mockups. Los diagnósticos y originales temporales permanecen ignorados.

## Cierre documental y Git

Se inicializó un repositorio propio en ECommerceShop, rama main, tras comprobar que no existía otro en esta carpeta ni sus padres. Sin staging, commits, remotos, push o publicación. Las exclusiones se comprueban con git check-ignore; el inventario real del primer commit está en commit-v1.md. El ejemplo .env.example, migraciones, seed, lockfile, fuentes, imágenes, pruebas y despliegue quedan disponibles para un clon nuevo. Los ZIP de origen, secretos, SQLite, copias y artefactos quedan fuera.

El comprobador de fuentes valida el manifiesto de texto sin depender del índice de Git. git diff --check con índice vacío no sustituye esa comprobación; antes del commit manual se debe ejecutar también git diff --cached --check. El archivo backend/catalog/__init__.py vacío es válido: el AssertionError histórico pertenecía a un comprobador que no aceptaba archivos de cero bytes.

## Producción pendiente

La configuración existente fue revisada: Caddy sirve frontend y Admin estático, reenvía /api y /admin a Waitress privado y solo devuelve index para rutas SPA conocidas. Django exige secreto fuerte, DEBUG=False, hosts explícitos y HTTPS/cookies seguras. SQLite y copias usan volumen persistente.

No hay despliegue público comprobado. Docker no está instalado en este entorno y no se instala. Instalación/arranque real de Waitress, build de contenedores, Caddy validate, TLS, rutas directas/404 del servidor real, Admin estático y recuperación de copias siguen pendientes. La revisión de configuración no los convierte en resultados superados. Hosting, dominio, credenciales privadas y política HSTS deben decidirse al desplegar. El check --deploy anterior tuvo dos avisos deliberados, security.W005 y W021, sin errores; no se silencian.

Auditoría npm: último resultado aportado por el usuario, **16 avisos de desarrollo y 0 de producción**, sin nuevo audit ni cambios de dependencias. No significa cero vulnerabilidades globales; Python e imágenes Docker no se presentan como auditados.

El portfolio se encontró en `C:\Users\UserS2025\Desktop\Portfolio projects\Portfolio-Redesign`, distinto de la ruta abreviada indicada. Se leyeron sus instrucciones, Project de src/data/projects.ts, Projects.astro, [slug].astro y ProjectLayout.astro. Sin URLs reales verificadas de repositorio/demo, no se modificó Astro ni se ejecutó su build. El borrador adapta los campos reales en los dos documentos de portfolio existentes.

## Antecedentes cerrados

Checkout, captura de Origin y foco del buscador se corrigieron y ya pasaron el E2E completo del usuario. Los intentos anteriores de Codex bloqueados por Chrome o spawn EPERM son antecedentes del entorno, no fallos pendientes de la aplicación local. checkout-e2e.md conserva su trazabilidad bajo esa distinción. La validación pública de producción constituye una fase distinta y sigue abierta.
