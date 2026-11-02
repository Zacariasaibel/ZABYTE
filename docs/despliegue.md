# Despliegue V1: Docker Compose, un mismo origen

Procedimiento preparado, **no desplegado ni validado en contenedores aquí**. Pendiente elegir host Linux con Docker Engine/Compose v2, DNS propio, almacenamiento persistente, copias externas y puertos 80/443 accesibles. Comandos PowerShell en la raíz; necesitan Docker disponible y acceso al host autorizado por su propietario. No se ha contratado alojamiento ni creado cuentas.

El build Angular y E2E completos del usuario ya pasaron localmente. No es necesario repetirlos por esta revisión documental; las pruebas contra el dominio público serán una comprobación distinta. En un clon nuevo, preparar Python/.venv según inicio-local.md antes de usar las utilidades locales. Los comandos con bind mounts deben ejecutarse donde el daemon Docker pueda ver la ruta de origen. Con un contexto Docker remoto, una ruta de este portátil no se transfiere automáticamente: copiar primero proyecto/base al host autorizado y usar su ruta real. No se instala Docker en el portátil ni se ejecuta aquí este procedimiento.

## Componentes

- web.Dockerfile: Node 24.22.2, npm ci y build Angular; Caddy 2.11.7-alpine sirve dist/nordlicht-shop/browser. Se conserva el nombre interno de salida.
- api.Dockerfile: Python 3.13.18-slim-bookworm y Waitress 3.0.2, usuario 10001 sin privilegios. Solo Caddy publica puertos. API en red interna; no exponer su puerto ni añadir servicios no confiables a esa red: Waitress confía en las cabeceras de su proxy.
- SQLite /data/db.sqlite3 y copias /data/backups en volumen database; Admin estático /static en volumen admin_static; certificados y estado TLS en caddy_data/caddy_config. No ejecutar down -v.
- config.production fuerza DEBUG=False, secreto fuerte, hosts explícitos, orígenes HTTPS, cookies Secure/HttpOnly, redirección HTTPS y esquema del proxy. Django no carga dotenv; Compose lee .env. DJANGO_DB_PATH, DJANGO_STATIC_ROOT y DJANGO_BACKUP_DIR están declaradas en Compose; cualquier cambio requiere montajes persistentes coherentes.
- Caddy diferencia /api, /admin, /static/, rutas SPA conocidas y archivos. Abrir/recargar detalle, cesta, checkout y confirmación sirve Angular; rutas/archivos inexistentes reciben 404, sin index indiscriminado. Un producto inexistente se resuelve desde el API y la pantalla informa del error.

HSTS de subdominios y preload quedan desactivados hasta conocer el dominio. check --deploy devuelve deliberadamente security.W005 y security.W021, sin silenciarlos. Antes de publicar, comprobar HTTPS de todos los dominios afectados y documentar si se activan o se aceptan esos avisos. No activar preload a ciegas.

## Preparación sin publicación

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
notepad .env
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(64))"
```

Sustituir shop.example.invalid por el dominio real sin protocolo/ruta y pegar el secreto generado **solo** en .env. DJANGO_DB_PATH permite elegir el nombre de SQLite: mantenerlo dentro de /data para conservarlo en el volumen persistente. Si se cambia fuera de /data, es obligatorio añadir un montaje persistente y sus permisos. Restringir acceso al archivo y nunca versionarlo. Después:

```powershell
docker compose config --quiet
docker compose build --pull
docker compose run --rm --no-deps web caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Requiere red hacia npm/PyPI/registros Docker. No levanta el sitio. Versiones de paquetes y etiquetas de imágenes son explícitas, pero una etiqueta Docker puede reconstruirse: registrar los digests obtenidos con docker image inspect y fijarlos en FROM para reproducibilidad binaria exacta. No se inventan digests ni se afirma haber comprobado pulls.

## Datos: escoger una sola preparación

### A. Base existente: importación única conservando datos

No iniciar una SQLite vacía ni ejecutar seed_demo. El importador usa backup SQLite con origen de solo lectura y **falla si el destino existe**.

```powershell
.\.venv\Scripts\python.exe scripts\backup-database.py
$databaseSource = (Resolve-Path backend).Path
docker compose run --rm --volume "${databaseSource}:/import:ro" api python /app/scripts/import-database.py /import/db.sqlite3
docker compose run --rm api python /app/scripts/backup-database.py
docker compose run --rm api python manage.py migrate --noinput
docker compose run --rm api python manage.py collectstatic --noinput
docker compose run --rm api python manage.py check --deploy
```

Se conservan productos, IDs, precios, stock, pedidos y credenciales Admin. La copia previa a migrate queda en /data/backups. V1 no añade migraciones. Si falta una cuenta administrativa, solo entonces ejecutar `docker compose run --rm api python manage.py createsuperuser`.

### B. Clon nuevo sin SQLite: crear catálogo reproducible

Un clon no contiene la SQLite de este portátil. Esta alternativa se usa **solo si no se importa ninguna base existente y el volumen es nuevo**. La primera comprobación debe terminar correctamente antes de continuar; si el archivo ya existe, parar y usar el procedimiento A o el de actualización con copia. No ejecutar seed_demo para restablecer una tienda existente.

```powershell
docker compose run --rm api python -c "import os; from pathlib import Path; assert not Path(os.environ['DJANGO_DB_PATH']).exists(), 'Existing database: stop and back it up; do not initialize it again.'"
if ($LASTEXITCODE -ne 0) { throw 'La base ya existe. No continuar con la inicialización.' }
docker compose run --rm api python manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) { throw 'Migración fallida. No continuar.' }
docker compose run --rm api python -c "import django; django.setup(); from catalog.models import Product; from django.core.management import call_command; assert not Product.objects.exists(), 'Catalog already exists: do not reset it.'; call_command('seed_demo')"
if ($LASTEXITCODE -ne 0) { throw 'Carga inicial fallida. Revisar antes de continuar.' }
docker compose run --rm api python /app/scripts/backup-database.py
docker compose run --rm api python manage.py collectstatic --noinput
docker compose run --rm api python manage.py check --deploy
```

Esta secuencia no se ejecutó sobre los datos del usuario. La base nueva no tiene una copia previa posible; después de crearla se genera su primer backup. El seed y DEMO_PRESENTATION están versionados y generan diez productos con sus categorías, sin depender de archivos ignorados. Crear un Admin privado si se necesita con el comando del apartado A.

## Arranque personal y verificación

Después de build/configuración y de completar A o B, con dominio/DNS y credenciales reales preparados:

```powershell
docker compose up -d
docker compose ps
docker compose logs --tail 100 api web
$shopOrigin = Read-Host 'Origen HTTPS real, sin barra final'
.\.venv\Scripts\python.exe scripts\check-deployment.py $shopOrigin
$env:SHOP_URL = $shopOrigin
npm.cmd run test:e2e --prefix frontend
Remove-Item Env:SHOP_URL
```

Caddy necesita DNS y puertos válidos para certificados; arrancar no demuestra HTTPS correcto. El primer script es de solo lectura: rutas directas, API, faltantes 404, CSRF Secure/HttpOnly, Admin CSS e imágenes. El segundo usa Chrome aislado y crea **una simulación**. Revisar también HTTP→HTTPS, renovación TLS, login Admin, errores, teclado y 1440/800/390/320 px. Recargar una confirmación finalizada no recupera el recibo en memoria; una solicitud aún pendiente conserva UUID para reintento. No hay listado público de pedidos.

## Backup, actualización y recuperación

Antes de cada migración:

```powershell
docker compose run --rm api python /app/scripts/backup-database.py
docker compose run --rm api python -c "from pathlib import Path; print('\n'.join(str(p) for p in sorted(Path('/data/backups').glob('*.sqlite3'))))"
```

Exportar la última copia fuera del volumen y del host, con acceso restringido:

```powershell
New-Item -ItemType Directory -Force .local\production-backups | Out-Null
$backupExport = (Resolve-Path .local\production-backups).Path
docker compose run --rm --volume "${backupExport}:/export" api python -c "from pathlib import Path; import shutil; source = max(Path('/data/backups').glob('*.sqlite3'), key=lambda p: p.stat().st_mtime); shutil.copy2(source, Path('/export') / source.name); print(source.name)"
```

En Linux, permitir escritura al UID 10001 en el directorio exportado antes del comando. Una copia en el mismo disco no protege contra pérdida del host.

Recuperar solo con API parada, guardando copia previa y eligiendo un backup real. Probar antes en un entorno aislado:

```powershell
docker compose stop api
docker compose run --rm api python /app/scripts/backup-database.py
$restoreSource = Read-Host 'Ruta exacta de la copia existente dentro de /data/backups'
docker compose run --rm api python -c "import os, sqlite3, sys; from pathlib import Path; source = Path(sys.argv[1]); target = Path(os.environ['DJANGO_DB_PATH']); assert source.is_file() and source.resolve() != target.resolve(); src = sqlite3.connect(source.as_uri() + '?mode=ro', uri=True); assert src.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'; dst = sqlite3.connect(target); src.backup(dst); dst.close(); src.close()" $restoreSource
docker compose up -d api
```

Actualización de código: construir, respaldar, parar API para mantenimiento, migrate, collectstatic, check --deploy y up. Evitar cambios Admin durante mantenimiento y nunca borrar volúmenes. SQLite limita las escrituras concurrentes: demostración pequeña, sin promesa de alta disponibilidad. Determinar retención de copias/logs y supervisión con el host elegido.

## Dependencia y fuentes primarias

Waitress 3.0.2 sustituye a runserver, no tiene dependencias transitivas y declara soporte Python 3.13. Solo se añade a requirements-production.txt; no cambia npm. Instalación aquí bloqueada por PIP_NO_INDEX=1: compatibilidad documental comprobada, arranque real pendiente.

[Waitress](https://docs.pylonsproject.org/projects/waitress/en/stable/), [proxy](https://docs.pylonsproject.org/projects/waitress/en/stable/reverse-proxy.html), [Caddy handle](https://caddyserver.com/docs/caddyfile/directives/handle), [file_server](https://caddyserver.com/docs/caddyfile/directives/file_server), [Django deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/), imágenes oficiales [Python](https://hub.docker.com/_/python), [Node](https://hub.docker.com/_/node), [Caddy](https://hub.docker.com/_/caddy).
