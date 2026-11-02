# Primer commit de ZABYTE V1

Repositorio propio inicializado en ECommerceShop, rama main. No hay staging, commits, remotos, push ni publicacion. No se modifico el repositorio del portfolio ni ninguna carpeta superior.

## Textos revisados por el comprobador

Este bloque alimenta scripts/check-source-files.py. No es por si solo la lista completa del primer commit; los binarios y las fuentes previas aparecen en el inventario completo siguiente.

```text
.gitignore
.dockerignore
.env.example
compose.yaml
README.md
backend/config/settings.py
backend/config/production.py
backend/serve.py
backend/requirements-production.txt
backend/catalog/views.py
backend/catalog/tests.py
frontend/src/app/app.component.ts
frontend/src/app/catalog.component.ts
frontend/src/app/catalog.component.html
frontend/src/app/catalog.service.ts
frontend/src/app/catalog-filters.ts
frontend/src/app/cart.service.ts
frontend/src/app/cart-notice.component.ts
frontend/src/app/notification-timer.ts
frontend/src/app/cart.component.ts
frontend/src/app/checkout.component.ts
frontend/src/app/confirmation.component.ts
frontend/src/app/checkout-steps.component.ts
frontend/src/styles.css
frontend/scripts/check-browser.mjs
frontend/scripts/checkout-diagnostics.mjs
frontend/scripts/check-checkout-diagnostics.mjs
frontend/scripts/test-runtime.mjs
frontend/scripts/check-filters.mjs
frontend/scripts/check-notification.mjs
scripts/backup-database.py
scripts/import-database.py
scripts/check-database-tools.py
scripts/check-production-settings.py
scripts/check-deployment.py
scripts/check-source-files.py
deploy/api.Dockerfile
deploy/web.Dockerfile
deploy/Caddyfile
docs/arquitectura-v1.md
docs/inicio-local.md
docs/checkout-e2e.md
docs/aprendizaje.md
docs/cesta-pedidos.md
docs/despliegue.md
docs/dependencias.md
docs/verificacion.md
docs/verificacion-v1.md
docs/portfolio.md
docs/portfolio-project.json
docs/commit-v1.md
```

## Inventario completo del primer commit

Generado con git ls-files --others --exclude-standard en este cierre, sin anadir archivos al indice. Todos estos archivos deben entrar; se incluyen migraciones, seed, lockfile, fuentes, pruebas, despliegue, ejemplos e imagenes. SQLite y secretos no forman parte del inventario. Las capturas finales de docs/screenshots si se versionan; .local/qa no.

```text
.dockerignore
.editorconfig
.env.example
.gitignore
AGENTS.md
README.md
backend/catalog/__init__.py
backend/catalog/admin.py
backend/catalog/apps.py
backend/catalog/demo_presentation.py
backend/catalog/management/__init__.py
backend/catalog/management/commands/__init__.py
backend/catalog/management/commands/seed_demo.py
backend/catalog/management/commands/sync_demo_presentation.py
backend/catalog/migrations/0001_initial.py
backend/catalog/migrations/0002_simulatedorder_simulatedorderline.py
backend/catalog/migrations/__init__.py
backend/catalog/models.py
backend/catalog/order_serializers.py
backend/catalog/order_service.py
backend/catalog/order_views.py
backend/catalog/serializers.py
backend/catalog/test_orders.py
backend/catalog/tests.py
backend/catalog/urls.py
backend/catalog/views.py
backend/config/__init__.py
backend/config/production.py
backend/config/settings.py
backend/config/urls.py
backend/config/wsgi.py
backend/manage.py
backend/requirements-production.txt
backend/requirements.txt
backend/serve.py
compose.yaml
deploy/Caddyfile
deploy/api.Dockerfile
deploy/web.Dockerfile
docs/aprendizaje.md
docs/arquitectura-v1.md
docs/cesta-pedidos.md
docs/checkout-e2e.md
docs/commit-v1.md
docs/dependencias.md
docs/despliegue.md
docs/fotos-seleccionadas.md
docs/imagenes-estudio-zabyte.md
docs/imagenes-fotograficas-anteriores.md
docs/imagenes.md
docs/inicio-local.md
docs/photo-manifest.json
docs/portfolio-project.json
docs/portfolio.md
docs/redisenio.md
docs/screenshots/bestaetigung-mobil.png
docs/screenshots/katalog-desktop.png
docs/screenshots/katalog-mobil.png
docs/screenshots/produktdetail-desktop.png
docs/screenshots/warenkorb-desktop.png
docs/studio-assets.json
docs/verificacion-v1.md
docs/verificacion.md
frontend/angular.json
frontend/package-lock.json
frontend/package.json
frontend/proxy.conf.json
frontend/public/assets/favicon.svg
frontend/public/assets/photos/cable-usbc.jpg
frontend/public/assets/photos/deskmat.jpg
frontend/public/assets/photos/headphones.jpg
frontend/public/assets/photos/hub.jpg
frontend/public/assets/photos/keyboard-white.jpg
frontend/public/assets/photos/keyboard-wired.jpg
frontend/public/assets/photos/lamp.jpg
frontend/public/assets/photos/mouse-wired.jpg
frontend/public/assets/photos/speaker.jpg
frontend/public/assets/photos/stand.jpg
frontend/public/assets/products/cable.svg
frontend/public/assets/products/deskmat.svg
frontend/public/assets/products/headphones.svg
frontend/public/assets/products/hub.svg
frontend/public/assets/products/keyboard.svg
frontend/public/assets/products/lamp.svg
frontend/public/assets/products/mouse.svg
frontend/public/assets/products/speaker.svg
frontend/public/assets/products/stand.svg
frontend/public/assets/studio/cable-usbc.webp
frontend/public/assets/studio/deskmat.webp
frontend/public/assets/studio/headphones.webp
frontend/public/assets/studio/hub.webp
frontend/public/assets/studio/keyboard-compact.webp
frontend/public/assets/studio/keyboard-full.webp
frontend/public/assets/studio/lamp.webp
frontend/public/assets/studio/mouse.webp
frontend/public/assets/studio/speaker.webp
frontend/public/assets/studio/stand.webp
frontend/scripts/check-browser.mjs
frontend/scripts/check-cart.mjs
frontend/scripts/check-checkout-diagnostics.mjs
frontend/scripts/check-filters.mjs
frontend/scripts/check-notification.mjs
frontend/scripts/check-product-images.mjs
frontend/scripts/checkout-diagnostics.mjs
frontend/scripts/test-runtime.mjs
frontend/src/app/app.component.ts
frontend/src/app/app.routes.ts
frontend/src/app/cart-notice.component.ts
frontend/src/app/cart-state.ts
frontend/src/app/cart.component.ts
frontend/src/app/cart.service.ts
frontend/src/app/catalog-filters.ts
frontend/src/app/catalog.component.html
frontend/src/app/catalog.component.ts
frontend/src/app/catalog.service.ts
frontend/src/app/checkout-steps.component.ts
frontend/src/app/checkout.component.ts
frontend/src/app/confirmation.component.ts
frontend/src/app/euro-cents.pipe.ts
frontend/src/app/not-found.component.ts
frontend/src/app/notification-timer.ts
frontend/src/app/product-detail.component.ts
frontend/src/app/product-image.component.ts
frontend/src/app/product-photos.ts
frontend/src/index.html
frontend/src/main.ts
frontend/src/styles.css
frontend/tsconfig.app.json
frontend/tsconfig.json
scripts/backup-database.py
scripts/check-database-tools.py
scripts/check-deployment.py
scripts/check-production-settings.py
scripts/check-source-files.py
scripts/import-database.py
scripts/start-backend.ps1
```

## Revision y primer commit manual

PowerShell desde la raiz de ECommerceShop:

```powershell
git status --short
git branch --show-current
git check-ignore .env backend/db.sqlite3 .local/qa frontend/node_modules frontend/dist
.\.venv\Scripts\python.exe scripts\check-source-files.py
git diff --check
# Solo el usuario ejecuta lo siguiente, despues de revisar los archivos:
git add -- .dockerignore .editorconfig .env.example .gitignore AGENTS.md README.md compose.yaml backend deploy docs frontend scripts
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "Initial version of ZABYTE"
```

Antes de confirmar, comprobar que la lista staged coincide con el inventario y no contiene secretos o datos locales. Si Git solicita identidad, configurarla localmente con los datos propios del usuario. No se ha creado un repositorio remoto ni se propone una URL inventada. La URL real y el push se prepararan cuando el usuario cree el repositorio en GitHub.

## Clon nuevo

Inicio-local.md contiene venv, pip, npm ci, migraciones y seed solo para una base nueva. El seed usa DEMO_PRESENTATION y diez imagenes versionadas; no depende de SQLite, ZIP originales, .local, dist ni node_modules de este portatil. Backend/requirements.txt y requirements-production.txt fijan paquetes Python y package-lock.json fija npm. Los ejemplos .env.example no contienen claves reales. Despliegue.md distingue importacion de datos existentes e inicializacion de un volumen vacio.

git diff --check sin staging no revisa los archivos untracked. Por eso se conserva el comprobador de textos y se exige git diff --cached --check despues del staging manual. Las copias, SQLite y ZIP originales permanecen localmente ignorados; no se borran. El contenido publico del portfolio sigue como borrador pendiente de URLs reales.
