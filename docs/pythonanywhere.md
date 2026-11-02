# PythonAnywhere gratuito: ZABYTE para Zaibel

Estado: adaptación local preparada; **no se ha configurado la cuenta ni verificado la tienda pública**. Repositorio confirmado: https://github.com/Zacariasaibel/ZABYTE.git, main, base 831813f. El panel de la cuenta no es una demo. Dominio previsto: zaibel.pythonanywhere.com; no se muestra como operativo en README/portfolio hasta comprobarlo.

Resultado local del 2 de noviembre: cargador/perfil, CSRF y tres pruebas de rutas superados; empaquetador comprobado con un build sintético. El único build específico real falló con spawn EPERM de esbuild y **no se generó ningún ZIP nuevo**. El comando del apartado 2 queda pendiente de PowerShell normal. El build habitual y E2E anteriores conservan la verificación aportada por el usuario.

## 1. Portátil: revisar y publicar manualmente el código

PowerShell, raíz ECommerceShop. Esta guía contiene acciones para el usuario; el agente no ejecutó staging, commit, push ni cambios en la cuenta.

```powershell
git status --short
git diff --check
.\.venv\Scripts\python.exe scripts\check-pythonanywhere.py
$env:DJANGO_SECRET_KEY = (& .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(64))")
.\.venv\Scripts\python.exe backend\manage.py test catalog.test_pythonanywhere
# Después de revisar el diff y los archivos nuevos:
git add -- backend deploy scripts frontend/angular.json README.md docs
git diff --cached --check
git diff --cached --stat
git commit -m "Prepare PythonAnywhere deployment"
git push origin main
```

No incluir SQLite, secretos, .venv ni .local. No cambian requisitos, datos ni diseño. La alternativa Docker conserva config.production, Caddy y Waitress; este destino utiliza el WSGI de la plataforma y requirements.txt, sin instalar Waitress.

## 2. Portátil: build específico y ZIP

```powershell
.\.venv\Scripts\python.exe scripts\build-pythonanywhere.py
```

El comando ejecuta npm.cmd run build --prefix frontend -- --configuration production,pythonanywhere. Mantiene producción/minificación, base href=/ y deployUrl=/shop-static/. Salida separada: frontend/dist/pythonanywhere/browser; el build habitual sigue en dist/nordlicht-shop.

Solo si npm termina con código 0, valida index y recursos y crea `.local/deploy/zabyte-frontend-<fechaUTC>.zip`. El script imprime la ruta exacta. El ZIP contiene el contenido de browser, con index.html en la raíz, sin carpeta browser contenedora. Rechaza secretos, SQLite, mapas de fuentes, fuentes TS, enlaces fuera del build y recursos de index inexistentes o con prefijos incorrectos. Usa solo Python estándar y crea un nombre nuevo, sin sobrescribir paquetes anteriores.

Si aparece spawn EPERM, detener aquí: **no se generó un paquete nuevo**. No subir un ZIP anterior atribuyéndolo al build actual. No ejecutar el empaquetador por separado contra un build antiguo. No se cambia la política de ejecución de PowerShell: el orquestador es Python y llama npm.cmd.

## 3. Bash en PythonAnywhere: comprobar cuenta, home y Python

Abrir una consola Bash desde la cuenta. Antes de crear rutas:

```bash
whoami
printf 'Home real: %s\n' "$HOME"
cd ~ && pwd
[ "$HOME" = /home/Zaibel ] || { echo 'STOP: revisar mayúsculas y todas las rutas previstas'; exit 1; }
command -v python3.13
python3.13 --version
```

No asumir que las rutas existen. Si el home no es exactamente /home/Zaibel, detenerse y corregir todas las rutas de esta guía, del ejemplo JSON y del WSGI de forma coherente. No cambiar a minúsculas a ciegas. Si falta Python 3.13, revisar Account → System Image: la documentación oficial lo incluye en innit. La pestaña Web debe ofrecer la misma versión. No crear virtualenv de otra versión ni cambiar requisitos para ocultar el problema; la disponibilidad efectiva en Zaibel está pendiente de esa comprobación.

## 4. Clonar por HTTPS y preparar virtualenv

Después de publicar manualmente la adaptación en GitHub:

```bash
git clone --branch main https://github.com/Zacariasaibel/ZABYTE.git /home/Zaibel/ZABYTE
cd /home/Zaibel/ZABYTE
git log -1 --oneline
python3.13 -m venv /home/Zaibel/.virtualenvs/zabyte
source /home/Zaibel/.virtualenvs/zabyte/bin/activate
python --version
python -m pip install -r /home/Zaibel/ZABYTE/backend/requirements.txt
```

La revisión desplegada debe incluir esta adaptación, no solo 831813f. Si la carpeta ya existe, no clonar encima: seguir actualización al final. Si pip no puede obtener una versión fijada, registrar el error; no actualizar arbitrariamente Django/DRF. No hace falta Node, npm, runserver, Docker, Caddy ni un proceso Waitress en la cuenta.

## 5. Configuración privada común a WSGI y consola

Una sola vez, en Bash con el virtualenv activo:

```bash
cd /home/Zaibel/ZABYTE
python scripts/create-pythonanywhere-config.py
```

El script genera SECRET_KEY en el servidor con secrets.token_urlsafe(64), no la imprime y crea `/home/Zaibel/.config/zabyte/environment.json` con modo 600, directorio 700. Falla si ya existe para no rotar claves en un redespliegue. No copiar el secreto al repositorio ni a carpetas estáticas; no ejecutar cat, printenv o echo para mostrarlo.

Crea además los destinos públicos separados zabyte-web/zabyte-static y el directorio privado zabyte-data. El cargador rechaza variables desconocidas, rutas relativas y secretos/base/copias dentro del código o de carpetas públicas. Configura:

- DEBUG=False por config.pythonanywhere → config.production.
- ALLOWED_HOSTS exclusivamente zaibel.pythonanywhere.com.
- CSRF_TRUSTED_ORIGINS exclusivamente https://zaibel.pythonanywhere.com; cookies Secure/HttpOnly.
- SQLite /home/Zaibel/zabyte-data/db.sqlite3 y copias /home/Zaibel/zabyte-data/backups.
- Frontend /home/Zaibel/zabyte-web y Admin estático /home/Zaibel/zabyte-static.

WSGI y `python scripts/pythonanywhere.py manage ...` cargan el mismo JSON, sin depender de exportaciones de la consola. Para copias, usar el mismo wrapper en modo backup. No usar manage.py directamente con un entorno diferente. El ejemplo versionado deploy/pythonanywhere-environment.example.json contiene solo un marcador inválido de clave, nunca una clave real.

## 6. Base nueva: migrar y cargar catálogo una sola vez

Este procedimiento es exclusivamente para la primera base, no para actualizaciones. Comprobar antes:

```bash
cd /home/Zaibel/ZABYTE
test ! -e /home/Zaibel/zabyte-data/db.sqlite3 || { echo 'STOP: existe SQLite; hacer copia y seguir actualización'; exit 1; }
python scripts/pythonanywhere.py manage migrate --noinput
python scripts/pythonanywhere.py manage shell -c "from catalog.models import Product; assert not Product.objects.exists(), 'Catalog already exists; do not reset it'"
python scripts/pythonanywhere.py manage seed_demo
python scripts/pythonanywhere.py manage createsuperuser
python scripts/pythonanywhere.py backup
python scripts/pythonanywhere.py manage collectstatic --noinput
python scripts/pythonanywhere.py manage check --deploy
```

Ejecutar paso a paso y detenerse ante un error. seed_demo usa update_or_create y **restablece** campos/stock de los diez slugs conocidos; por eso solo se ejecuta tras comprobar base nueva y catálogo vacío. No usarlo en un redespliegue. createsuperuser solicita credenciales interactivamente: elegir una contraseña privada; no hay una por defecto. La base del portátil no se borra ni se reinicializa. Si se quiere conservar sus pedidos/usuarios, se debe importar una copia consistente en el destino privado, antes de migrar, en vez de ejecutar esta inicialización.

check --deploy mostrará los avisos heredados de HSTS subdominios/preload y security.W008 porque Force HTTPS se delega a PythonAnywhere. No se silencian. Antes de abrir la tienda es obligatorio activar Force HTTPS en Web. No activar HSTS para dominios ajenos ni preload a ciegas.

## 7. Subir y extraer solo el frontend público

Desde Files de PythonAnywhere subir el ZIP nuevo generado en el portátil a **/home/Zaibel**, fuera de zabyte-web. Luego, en Bash, sustituir el nombre por el nombre real impreso al empaquetar:

```bash
read -r -p 'Ruta absoluta del ZIP nuevo subido: ' frontend_zip
python -m zipfile -l "$frontend_zip"
python -m zipfile -e "$frontend_zip" /home/Zaibel/zabyte-web
python - <<'PY'
from pathlib import Path
root = Path('/home/Zaibel/zabyte-web')
assert (root / 'index.html').is_file()
assert (root / 'assets/studio/keyboard-full.webp').is_file()
assert (root / 'assets/studio/keyboard-compact.webp').is_file()
html = (root / 'index.html').read_text()
assert '<base href="/">' in html and '/shop-static/' in html
print('Public frontend files present; public HTTP checks still pending.')
PY
```

Usar únicamente el ZIP validado del propio proyecto. La primera extracción es en carpeta nueva. En actualizaciones, guardar una copia de zabyte-web fuera de los mapeos y coordinar el reemplazo para evitar mezclar index y bundles de versiones diferentes; no tocar zabyte-data ni el JSON privado. No subir src, node_modules, backend o SQLite dentro de zabyte-web.

## 8. Web → Manual Configuration

Crear la web con **Manual Configuration**, dominio previsto zaibel.pythonanywhere.com y **Python 3.13**, coincidente con el virtualenv. No usar el asistente Django que crea otro proyecto. Valores exactos previstos:

| Campo Web | Valor |
| --- | --- |
| Source code | /home/Zaibel/ZABYTE/backend |
| Working directory | /home/Zaibel/ZABYTE/backend |
| Virtualenv | /home/Zaibel/.virtualenvs/zabyte |
| WSGI | Abrir el enlace de archivo mostrado por PythonAnywhere; no inventar su nombre |
| Force HTTPS | Activado, después de comprobar que HTTPS abre sin error de certificado |

Mapeos estáticos:

| URL | Directory |
| --- | --- |
| /shop-static/ | /home/Zaibel/zabyte-web/ |
| /assets/ | /home/Zaibel/zabyte-web/assets/ |
| /static/ | /home/Zaibel/zabyte-static/ |

**No mapear /**, el repositorio, /home/Zaibel, .config, zabyte-data ni el virtualenv. /shop-static/ sirve los bundles compilados y /assets/ las rutas absolutas existentes de las imágenes. /static/ es collectstatic, incluido Admin. Si un recurso no existe, debe dar 404, nunca index. El fallback Django solo admite /, /produkte/slug, /warenkorb, /kasse y /bestaetigung, con barra final opcional; /api y /admin se conservan fuera del fallback. El index recibe no-store y un build no instalado produce 503.

Pegar **todo** este contenido en el archivo WSGI enlazado por la plataforma (idéntico a deploy/pythonanywhere_wsgi.py):

```python
"""Paste this entire file into the WSGI file linked by PythonAnywhere Web."""
import os
import sys

backend_path = "/home/Zaibel/ZABYTE/backend"
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from config.pythonanywhere_environment import load_environment

load_environment("/home/Zaibel/.config/zabyte/environment.json")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.pythonanywhere"

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
```

Guardar y pulsar Reload. No editar config/wsgi.py para simular el archivo de la plataforma. No establecer HTTPS='on' ni falsificar cabeceras. El perfil usa el esquema WSGI de la plataforma y SECURE_PROXY_SSL_HEADER=None; SECURE_SSL_REDIRECT=False evita una segunda redirección Django basada en un proxy diferente. Force HTTPS del panel protege también estáticos. Si hay bucle, no debilitar CSRF/cookies: revisar error log, Force HTTPS y que se cargue config.pythonanywhere, no el perfil Docker. La ausencia de bucles reales solo puede confirmarse en la cuenta.

## 9. Comprobaciones públicas pendientes

No se han ejecutado desde este portátil. Tras Reload:

- Abrir https://zaibel.pythonanywhere.com y comprobar que HTTP redirige una sola vez a HTTPS, sin bucle ni errores de certificado.
- Revisar catálogo, búsqueda/categoría/orden/disponibilidad, imágenes (ambos teclados distintos) y /api/products/ con JSON.
- Abrir directamente y recargar /produkte/fjord-keys, /produkte/fjord-keys-mini, /warenkorb, /kasse y /bestaetigung. Sin recibo en memoria, esta última debe informar que no hay confirmación abierta; no inventar un pedido.
- Confirmar que /api/no-existe/, /shop-static/no-existe.js, /assets/no-existe.webp, /static/no-existe.css y /no-existe devuelven 404 y no el HTML de Angular.
- Consultar un JS y CSS reales referenciados por index: URL /shop-static/ y tipos de contenido correctos. Revisar /static/admin/css/base.css y el login Admin con su diseño, HTTPS y CSRF.
- Añadir productos, recargar y comprobar persistencia, cantidades y agotados. Enviar una simulación, comprobar POST 201/200, referencia real, total y cesta vacía. Revisar pedido en Admin y confirmar que no cambió stock.
- Comprobar reintento con la misma clave ante una respuesta perdida, sin crear otra orden; no cambiar la clave manualmente para simular un reintento.
- Revisar escritorio/móvil y Tab, consola y pestaña Network. No compartir cookies, tokens, clave privada o páginas de depuración.

Si hay 500, mirar los enlaces error log/server log de Web sin publicar secretos; si hay 503 de Django, falta el index público; si hay CSS/JS 404, revisar los tres mapeos y la extracción del ZIP. El E2E local completo previamente superado es evidencia local, no aprobación automática de este dominio. Su prueba de ruta 404 está diseñada para el servidor de desarrollo: no confundirla con la política HTTP 404 del servidor público.

Solo cuando esta lista esté verificada, añadir la demo operativa a README y completar el borrador del portfolio con https://zaibel.pythonanywhere.com. Hasta entonces demo sigue null; el panel nunca se usa como enlace de demo. En cuentas gratuitas, revisar en el panel los límites y renovación/caducidad de la web, sin contratar servicios.

## 10. Actualizaciones y copias

Bash, virtualenv activo. No crear de nuevo el secreto, la web o el virtualenv y no ejecutar seed_demo:

```bash
cd /home/Zaibel/ZABYTE
python scripts/pythonanywhere.py backup
git status --short
git pull --ff-only origin main
python -m pip install -r backend/requirements.txt
python scripts/pythonanywhere.py manage migrate --noinput
python scripts/pythonanywhere.py manage collectstatic --noinput
python scripts/pythonanywhere.py manage check --deploy
```

Subir un ZIP construido con la misma revisión, reemplazar frontend coordinadamente, Reload y repetir comprobaciones públicas. La copia previa usa SQLite backup y queda en /home/Zaibel/zabyte-data/backups; descargar una copia fuera de la cuenta con acceso restringido. No mapear ese directorio públicamente. Mantener versiones anteriores de frontend fuera de zabyte-web si se quiere poder volver atrás.

Para restaurar, poner la web fuera de servicio durante mantenimiento, guardar otra copia y elegir una copia íntegra. No sobrescribir una SQLite que aún atiende escrituras ni usar seed_demo como restauración. La herramienta existente scripts/import-database.py importa a un destino ausente; respaldar y retirar el archivo de destino antes, con todos los trabajadores detenidos. Probar recuperación en un entorno aislado antes de depender de ella. No borrar usuarios/pedidos como parte de un redespliegue normal.

## Fuentes oficiales consultadas

[Proyecto Django existente](https://help.pythonanywhere.com/pages/DeployExistingDjangoProject/), [mapeos estáticos](https://help.pythonanywhere.com/pages/StaticFiles/), [collectstatic/Admin](https://help.pythonanywhere.com/pages/DjangoStaticFiles/), [configuración de entorno WSGI y consola](https://help.pythonanywhere.com/pages/EnvironmentVariables/), [versiones Python por imagen de sistema](https://help.pythonanywhere.com/pages/PythonVersions/), [Force HTTPS](https://help.pythonanywhere.com/pages/ForcingHTTPS/) y [build/deploy-url de Angular](https://angular.dev/cli/build). La carga JSON sustituye la herramienta dotenv del ejemplo oficial sin añadir dependencias, conservando la misma configuración privada para ambos procesos. La disponibilidad específica de cuenta y el funcionamiento público siguen sin comprobarse.
