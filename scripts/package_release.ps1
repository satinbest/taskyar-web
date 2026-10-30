# TaskYar Web 2.0 RC1 — Packaging Script for DirectAdmin No-SSH
$ErrorActionPreference = "Stop"

$workspaceRoot = "d:\taskyar"
$releasesDir = "$workspaceRoot\releases"
$stagingDir = "$releasesDir\staging"
$packageRoot = "$stagingDir\TaskYar-Web-2.0-RC1"
$zipOutput = "$releasesDir\TaskYar-Web-2.0-RC1-DirectAdmin-NoSSH.zip"

Write-Host "=========================================================="
Write-Host "TaskYar Web 2.0 RC1 — Building DirectAdmin No-SSH Package"
Write-Host "=========================================================="

# 1. Clean previous staging
if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Path $packageRoot | Out-Null
New-Item -ItemType Directory -Path "$packageRoot\taskyar_core" | Out-Null
New-Item -ItemType Directory -Path "$packageRoot\public_html" | Out-Null
New-Item -ItemType Directory -Path "$packageRoot\installation" | Out-Null
New-Item -ItemType Directory -Path "$packageRoot\documentation" | Out-Null

# 2. Compile production frontend assets
Write-Host "1. Compiling frontend assets with Vite..."
Set-Location $workspaceRoot
npm run build

# 3. Install production-only PHP dependencies
Write-Host "2. Installing production-only Composer dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# 4. Copy files to taskyar_core
Write-Host "3. Populating taskyar_core..."
$coreDir = "$packageRoot\taskyar_core"

Copy-Item -Recurse -Path "$workspaceRoot\app" -Destination "$coreDir\app"
Copy-Item -Recurse -Path "$workspaceRoot\config" -Destination "$coreDir\config"
Copy-Item -Recurse -Path "$workspaceRoot\routes" -Destination "$coreDir\routes"
Copy-Item -Recurse -Path "$workspaceRoot\resources\views" -Destination "$coreDir\resources\views"
Copy-Item -Recurse -Path "$workspaceRoot\vendor" -Destination "$coreDir\vendor"

New-Item -ItemType Directory -Path "$coreDir\bootstrap" | Out-Null
Copy-Item -Path "$workspaceRoot\bootstrap\app.php" -Destination "$coreDir\bootstrap\app.php"
New-Item -ItemType Directory -Path "$coreDir\bootstrap\cache" | Out-Null
Set-Content -Path "$coreDir\bootstrap\cache\.gitignore" -Value "*`n!.gitignore"

New-Item -ItemType Directory -Path "$coreDir\database" | Out-Null
Copy-Item -Recurse -Path "$workspaceRoot\database\migrations" -Destination "$coreDir\database\migrations"
if (Test-Path "$workspaceRoot\database\seeders") {
    Copy-Item -Recurse -Path "$workspaceRoot\database\seeders" -Destination "$coreDir\database\seeders"
}

Copy-Item -Path "$workspaceRoot\artisan" -Destination "$coreDir\artisan"
Copy-Item -Path "$workspaceRoot\composer.json" -Destination "$coreDir\composer.json"
Copy-Item -Path "$workspaceRoot\composer.lock" -Destination "$coreDir\composer.lock"
Copy-Item -Path "$workspaceRoot\.env.example" -Destination "$coreDir\.env.example"

# Create clean storage directory structure
New-Item -ItemType Directory -Path "$coreDir\storage\app\public" | Out-Null
New-Item -ItemType Directory -Path "$coreDir\storage\framework\cache\data" | Out-Null
New-Item -ItemType Directory -Path "$coreDir\storage\framework\sessions" | Out-Null
New-Item -ItemType Directory -Path "$coreDir\storage\framework\views" | Out-Null
New-Item -ItemType Directory -Path "$coreDir\storage\logs" | Out-Null

Set-Content -Path "$coreDir\storage\app\.gitignore" -Value "*`n!.gitignore"
Set-Content -Path "$coreDir\storage\framework\cache\.gitignore" -Value "*`n!.gitignore"
Set-Content -Path "$coreDir\storage\framework\sessions\.gitignore" -Value "*`n!.gitignore"
Set-Content -Path "$coreDir\storage\framework\views\.gitignore" -Value "*`n!.gitignore"
Set-Content -Path "$coreDir\storage\logs\.gitignore" -Value "*`n!.gitignore"

# Generate One-Time High-Entropy Secret
$tokenBytes = [byte[]]::new(16)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($tokenBytes)
$secretToken = "TY2026-" + [System.BitConverter]::ToString($tokenBytes).Replace("-", "").ToLower()
Set-Content -Path "$coreDir\install_token.txt" -Value $secretToken

# 5. Populating public_html
Write-Host "4. Populating public_html..."
$pubDir = "$packageRoot\public_html"

Copy-Item -Recurse -Path "$workspaceRoot\public\build" -Destination "$pubDir\build"
Copy-Item -Recurse -Path "$workspaceRoot\public\fonts" -Destination "$pubDir\fonts"
Copy-Item -Recurse -Path "$workspaceRoot\public\icons" -Destination "$pubDir\icons"
Copy-Item -Path "$workspaceRoot\public\favicon.ico" -Destination "$pubDir\favicon.ico"
Copy-Item -Path "$workspaceRoot\public\robots.txt" -Destination "$pubDir\robots.txt"
Copy-Item -Path "$workspaceRoot\public\manifest.webmanifest" -Destination "$pubDir\manifest.webmanifest"
Copy-Item -Path "$workspaceRoot\public\sw.js" -Destination "$pubDir\sw.js"
Copy-Item -Path "$workspaceRoot\public\.htaccess" -Destination "$pubDir\.htaccess"
Copy-Item -Path "$workspaceRoot\public\index.php" -Destination "$pubDir\index.php"
Copy-Item -Path "$workspaceRoot\public\install.php" -Destination "$pubDir\install.php"

# 6. Populating installation
Write-Host "5. Populating installation..."
$instDir = "$packageRoot\installation"
Copy-Item -Path "$workspaceRoot\installation\taskyar_initial_schema.sql" -Destination "$instDir\taskyar_initial_schema.sql"
Copy-Item -Path "$workspaceRoot\installation\.env.production.example" -Destination "$instDir\.env.production.example"
Set-Content -Path "$instDir\INSTALL_SECRET.txt" -Value $secretToken

# 7. Populating documentation
Write-Host "6. Populating documentation..."
$docDir = "$packageRoot\documentation"
Copy-Item -Recurse -Path "$workspaceRoot\package_docs\*" -Destination $docDir

# 8. Restore development composer dependencies in workspace
Write-Host "7. Restoring dev dependencies in workspace..."
Set-Location $workspaceRoot
composer install --no-interaction

# 9. Create ZIP Archive
Write-Host "8. Creating ZIP archive..."
if (Test-Path $zipOutput) {
    Remove-Item -Force $zipOutput
}

# Use .NET System.IO.Compression for fast and reliable zip creation
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingDir,
    $zipOutput,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

$zipItem = Get-Item $zipOutput
$len = $zipItem.Length
$mb = [Math]::Round($len / 1048576, 2)
$sha = (Get-FileHash -Path $zipOutput -Algorithm SHA256).Hash

Write-Host "=========================================================="
Write-Host "Package created successfully!"
Write-Host "Path:   $zipOutput"
Write-Host "Size:   $len bytes"
Write-Host "SizeMB: $mb"
Write-Host "SHA256: $sha"
Write-Host "Token:  $secretToken"
Write-Host "=========================================================="
