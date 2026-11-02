# Arranque y pruebas locales

PowerShell desde la raíz de ECommerceShop. Versiones comprobadas: Python 3.13.3, Node 24.11.1, npm 11.6.2. Angular 21 y Django 5.2 LTS conservan sus versiones fijadas. No instalar herramientas globales. npm.cmd evita el bloqueo de npm.ps1.

## Preparación

Si el entorno y las dependencias ya existen, no hace falta reinstalarlos:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd ci --prefix frontend
```

Conservar SQLite existente. Antes de cualquier migración:

```powershell
$env:DJANGO_SECRET_KEY = (& .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(64))")
$env:DJANGO_DEBUG = '1'
.\.venv\Scripts\python.exe scripts\backup-database.py
.\.venv\Scripts\python.exe backend\manage.py migrate
```

La copia requiere una base existente. Solo para una instalación realmente nueva sin SQLite, omitir backup, migrar y crear los productos una vez con `.\.venv\Scripts\python.exe backend\manage.py seed_demo`. Nunca ejecutar ese comando para restablecer datos existentes. Si hace falta un administrador, usar createsuperuser con credenciales privadas propias, sin contraseñas de ejemplo.

## Servidores

Reutilizar los servidores si responden. En un terminal, después de definir las variables anteriores:

```powershell
.\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000 --noreload
```

En otro:

```powershell
npm.cmd start --prefix frontend
```

Abrir http://127.0.0.1:4200; Admin local http://127.0.0.1:8000/admin/. Angular redirige /api a Django. Django no carga automáticamente .env; ese archivo se usa con Compose en el procedimiento de producción.

## Pruebas

Con DJANGO_SECRET_KEY temporal definido en el terminal:

```powershell
.\.venv\Scripts\python.exe backend\manage.py test catalog
.\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe scripts\check-production-settings.py
node frontend/node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p frontend/tsconfig.app.json
node frontend/scripts/check-cart.mjs
node frontend/scripts/check-product-images.mjs
node frontend/scripts/check-filters.mjs
node frontend/scripts/check-notification.mjs
node frontend/scripts/check-checkout-diagnostics.mjs
.\.venv\Scripts\python.exe scripts\check-source-files.py
```

Los tests backend crean una base temporal; sus seeds no afectan los productos del usuario. Los tests Angular de estado usan clases reales con HTTP controlado y no sustituyen la revisión de navegador. El diagnóstico usa node:sqlite, incluido en Node 24; puede mostrar su aviso experimental, sin añadir dependencias.

El build actual ya fue confirmado por el usuario. Para futuros cambios de aplicación Angular:

```powershell
npm.cmd run build --prefix frontend
```

## E2E con Chrome local y servidores activos

El usuario ya completó correctamente este recorrido junto con el build. Para futuras regresiones, con los servidores activos:

```powershell
npm.cmd run test:e2e --prefix frontend
```

Prueba 1440/800/390/320, abre un perfil temporal propio y lo cierra al finalizar. Crea una simulación únicamente si alcanza el checkout. Guarda capturas y diagnóstico seguro en .local/qa, excluido de Git. No usar CHROME_DEBUG_URL con un navegador personal: el script cierra también el navegador de prueba suministrado. SHOP_URL admite un origen HTTP(S) sin credenciales, ruta, query ni fragmento; por defecto usa 127.0.0.1:4200.

Resultados actuales: [checkout-e2e.md](checkout-e2e.md), contexto previo: [verificacion-v1.md](verificacion-v1.md). Despliegue, HTTPS y persistencia: [despliegue.md](despliegue.md). Auditoría npm vigente aportada por el usuario: 16 avisos de desarrollo y 0 de producción, no cero vulnerabilidades globales; véase [dependencias.md](dependencias.md).
