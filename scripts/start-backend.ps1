$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not $env:DJANGO_SECRET_KEY) {
    $env:DJANGO_SECRET_KEY = & .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
    if ($LASTEXITCODE -ne 0) { throw 'Python konnte nicht gestartet werden.' }
}
$env:DJANGO_DEBUG = '1'
& .\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000 --noreload
exit $LASTEXITCODE
