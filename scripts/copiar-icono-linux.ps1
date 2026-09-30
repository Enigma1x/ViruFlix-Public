# Copia opcional del icono a build/ (sobrescribe el usado por electron-builder si existe).
# Por defecto, package.json ya apunta a src/assets/icons/vf_Symbol.png para Windows/macOS/Linux.

$iconSource = Join-Path $PSScriptRoot "..\src\assets\icons\vf_Symbol.png"
$iconDest = Join-Path $PSScriptRoot "..\build\icon.png"
$buildDir = Join-Path $PSScriptRoot "..\build"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
    Write-Host "Carpeta build/ creada" -ForegroundColor Green
}

if (Test-Path $iconSource) {
    Copy-Item -Path $iconSource -Destination $iconDest -Force
    Write-Host "Icono copiado a build/icon.png (opcional; el repo ya usa src/assets/icons/vf_Symbol.png)" -ForegroundColor Green
    Write-Host "  Archivo: $iconDest" -ForegroundColor Gray
} else {
    Write-Host "No se encontro el icono en: $iconSource" -ForegroundColor Red
    exit 1
}
