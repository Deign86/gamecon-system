##############################################################################
#  PlayVerse Ops -- Automated Build Script
#  Usage:
#    .\build.ps1              # builds everything (Web + Tauri + Android)
#    .\build.ps1 -Web         # web only
#    .\build.ps1 -Tauri       # tauri desktop only
#    .\build.ps1 -Android     # android APK only
#    .\build.ps1 -Web -Tauri  # combine any flags
##############################################################################

param(
    [switch]$Web,
    [switch]$Tauri,
    [switch]$Android
)

if (-not $Web -and -not $Tauri -and -not $Android) {
    $Web     = $true
    $Tauri   = $true
    $Android = $true
}

$ProjectRoot = $PSScriptRoot
$Downloads   = [System.Environment]::GetFolderPath("UserProfile") + "\Downloads"
$Timestamp   = Get-Date -Format "yyyy-MM-dd_HH-mm"
$AppName     = "playverse-ops"

function Write-Step { param($msg) Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "         $msg" -ForegroundColor DarkGray }

function Assert-ExitCode {
    param($label)
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "$label failed (exit $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
}

Write-Host ""
Write-Host "  ======================================" -ForegroundColor DarkRed
Write-Host "   PLAYVERSE OPS -- BUILD SCRIPT"        -ForegroundColor DarkRed
Write-Host "  ======================================" -ForegroundColor DarkRed
Write-Host "  $Timestamp" -ForegroundColor DarkGray
Write-Host "  Output -> $Downloads" -ForegroundColor DarkGray
Write-Host ""

Set-Location $ProjectRoot
$TotalStart = Get-Date

if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Step "Installing npm dependencies..."
    npm install
    Assert-ExitCode "npm install"
    Write-OK "Dependencies installed"
}

# WEB BUILD
if ($Web) {
    Write-Step "Building Web (Vite)..."
    $t = Get-Date
    npm run build 2>&1 | ForEach-Object { Write-Info $_ }
    Assert-ExitCode "npm run build"
    $zip = "$Downloads\$AppName-web-$Timestamp.zip"
    Compress-Archive -Path "$ProjectRoot\dist\*" -DestinationPath $zip -Force
    $elapsed = [math]::Round(((Get-Date) - $t).TotalSeconds, 1)
    Write-OK "Web build done in ${elapsed}s  ->  $(Split-Path $zip -Leaf)"
}

# TAURI BUILD
if ($Tauri) {
    Write-Step "Building Tauri desktop (NSIS installer)..."
    $t = Get-Date
    npx tauri build 2>&1 | ForEach-Object { Write-Info $_ }
    Assert-ExitCode "tauri build"
    $nsisDir   = "$ProjectRoot\src-tauri\target\release\bundle\nsis"
    $installer = Get-ChildItem -Path $nsisDir -Filter "*.exe" -ErrorAction SilentlyContinue |
                 Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($installer) {
        $dest = "$Downloads\$AppName-windows-$Timestamp.exe"
        Copy-Item $installer.FullName -Destination $dest -Force
        $elapsed = [math]::Round(((Get-Date) - $t).TotalSeconds, 1)
        Write-OK "Tauri build done in ${elapsed}s  ->  $(Split-Path $dest -Leaf)"
    } else {
        Write-Fail "Tauri build succeeded but installer not found at: $nsisDir"
    }
}

# ANDROID BUILD
if ($Android) {
    Write-Step "Syncing Capacitor assets to Android..."
    $t = Get-Date
    if (-not (Test-Path "$ProjectRoot\dist\index.html")) {
        Write-Info "dist/ missing -- running web build first..."
        npm run build 2>&1 | ForEach-Object { Write-Info $_ }
        Assert-ExitCode "npm run build (pre-android)"
    }
    npx cap sync android 2>&1 | ForEach-Object { Write-Info $_ }
    Assert-ExitCode "cap sync android"
    Write-OK "Capacitor sync done"
    Write-Step "Building Android APK (assembleDebug)..."
    $gradlew = "$ProjectRoot\android\gradlew.bat"
    & $gradlew -p "$ProjectRoot\android" assembleDebug 2>&1 | ForEach-Object { Write-Info $_ }
    Assert-ExitCode "gradlew assembleDebug"
    $apk = Get-ChildItem -Path "$ProjectRoot\android" -Recurse -Filter "*.apk" |
           Where-Object { $_.FullName -notmatch "capacitor-cordova" } |
           Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($apk) {
        $dest = "$Downloads\$AppName-android-$Timestamp.apk"
        Copy-Item $apk.FullName -Destination $dest -Force
        $elapsed = [math]::Round(((Get-Date) - $t).TotalSeconds, 1)
        Write-OK "Android build done in ${elapsed}s  ->  $(Split-Path $dest -Leaf)"
    } else {
        Write-Fail "Gradle succeeded but APK not found"
    }
}

$total = [math]::Round(((Get-Date) - $TotalStart).TotalSeconds, 1)
Write-Host ""
Write-Host "  --------------------------------------" -ForegroundColor DarkGray
Write-Host "  All builds complete in ${total}s"       -ForegroundColor Green
Write-Host "  Files saved to: $Downloads"             -ForegroundColor Green
Write-Host "  --------------------------------------" -ForegroundColor DarkGray
Write-Host ""