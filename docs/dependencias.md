# Dependencias de ZABYTE

## Resultado vigente: corrección del informe anterior

El usuario verificó en PowerShell **16 avisos de desarrollo y 0 de producción**. Este es el resultado que debe figurar como vigente. Se retira la conclusión anterior de «0 vulnerabilidades totales» y de que no quedaban avisos: la salida observada previamente dentro del entorno de Codex no justificaba contradecir la verificación del usuario.

No se dispone aquí del desglose de los 16 avisos por paquete o gravedad. No se inventa su distribución ni se afirma que los 16 procedan de glob/minimatch. Desarrollo y producción deben informarse por separado; que sean herramientas de desarrollo no hace desaparecer sus avisos.

## Cadena revisada en el bloque anterior

El lockfile y la instalación entonces inspeccionados contenían:

```text
@angular/cli@21.2.29 (dev)
└─ pacote@21.5.1
   ├─ @npmcli/package-json / cacache → glob@13.0.6
   ├─ ignore-walk → minimatch@10.2.6
   └─ sigstore / tuf-js / @tufjs/models → minimatch@10.2.6
glob@13.0.6 → minimatch@^10.2.2
```

Se conserva como contexto de trazabilidad, no como prueba de ausencia de vulnerabilidades ni como desglose de los 16 avisos. CLI, build, compiler-cli y TypeScript están en `devDependencies`. Angular de ejecución, RxJS y tslib están en `dependencies`.

## Alcance del bloque anterior

**No se ha cambiado ninguna dependencia.** Se conservan `package.json`, `package-lock.json` y `backend/requirements.txt`; se comparan sus SHA-256 antes y después del trabajo. No se ha ejecutado `npm install`, `audit fix`, un downgrade ni overrides. Tampoco se ha repetido el audit para sustituir los resultados aportados por el usuario.

Para obtener un informe nuevo cuando se decida abordar las dependencias:

```powershell
npm.cmd audit --prefix frontend
npm.cmd audit --prefix frontend --omit=dev
npm.cmd explain glob --prefix frontend
npm.cmd explain minimatch --prefix frontend
```

La corrección de paquetes queda fuera de este bloque. Un build correcto no resuelve ni invalida los avisos de seguridad. Los errores `spawn EPERM` del ejecutor Codex se documentan aparte; no se usan como motivo para alterar versiones.

## Cierre V1: dependencia exclusiva de producción

Se mantienen sin cambios package.json, package-lock.json y backend/requirements.txt; sus SHA-256 se compararon con la instantánea inicial. No se ejecutó una auditoría nueva ni audit fix. El último resultado npm continúa siendo el aportado por el usuario: **16 avisos de desarrollo y 0 de producción**, sin desglose disponible. No equivale a una auditoría Python, Docker o del despliegue.

Se añade backend/requirements-production.txt, que incluye los requisitos existentes y fija waitress==3.0.2 como único paquete adicional para servir WSGI en producción. [La documentación oficial](https://docs.pylonsproject.org/projects/waitress/en/stable/) confirma Python 3.13 y ausencia de dependencias transitivas. Se intentó instalar una vez con pip: PIP_NO_INDEX=1 impidió consultar el índice y no había distribución disponible localmente. No se cambió esa política ni se eligió otra versión a ciegas. La instalación y el arranque real siguen pendientes en el host con red.

Caddy, Python y Node se declaran mediante imágenes oficiales con etiquetas de versión en los Dockerfiles; no se descargaron ni auditaron aquí porque Docker no está instalado. Antes de publicar, revisar también paquetes Python e imágenes en el entorno real. Ninguna de estas comprobaciones se presenta como auditoría superada.
