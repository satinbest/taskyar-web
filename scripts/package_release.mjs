import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const stagingDir = path.join(releasesDir, 'staging');
const packageRoot = path.join(stagingDir, 'TaskYar-Web-2.0-RC1');
const zipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-RC1-DirectAdmin-NoSSH.zip');

console.log('==========================================================');
console.log('TaskYar Web 2.0 RC1 — Building DirectAdmin No-SSH Package');
console.log('==========================================================');

// 1. Clean staging directory
if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(packageRoot, { recursive: true });

const coreDir = path.join(packageRoot, 'taskyar_core');
const pubDir = path.join(packageRoot, 'public_html');
const instDir = path.join(packageRoot, 'installation');
const docDir = path.join(packageRoot, 'documentation');

fs.mkdirSync(coreDir, { recursive: true });
fs.mkdirSync(pubDir, { recursive: true });
fs.mkdirSync(instDir, { recursive: true });
fs.mkdirSync(docDir, { recursive: true });

// 2. Compile frontend assets with Vite
console.log('1. Compiling frontend assets with Vite...');
execSync('npm run build', { cwd: workspaceRoot, stdio: 'inherit' });

// 3. Install production-only PHP dependencies
console.log('2. Installing production-only Composer dependencies...');
execSync('composer install --no-dev --optimize-autoloader --no-interaction', { cwd: workspaceRoot, stdio: 'inherit' });

// 4. Populate taskyar_core
console.log('3. Populating taskyar_core...');
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

copyRecursiveSync(path.join(workspaceRoot, 'app'), path.join(coreDir, 'app'));
copyRecursiveSync(path.join(workspaceRoot, 'config'), path.join(coreDir, 'config'));
copyRecursiveSync(path.join(workspaceRoot, 'routes'), path.join(coreDir, 'routes'));
copyRecursiveSync(path.join(workspaceRoot, 'resources/views'), path.join(coreDir, 'resources/views'));
copyRecursiveSync(path.join(workspaceRoot, 'vendor'), path.join(coreDir, 'vendor'));

fs.mkdirSync(path.join(coreDir, 'bootstrap/cache'), { recursive: true });
fs.copyFileSync(path.join(workspaceRoot, 'bootstrap/app.php'), path.join(coreDir, 'bootstrap/app.php'));
fs.writeFileSync(path.join(coreDir, 'bootstrap/cache/.gitignore'), "*\n!.gitignore\n");

fs.mkdirSync(path.join(coreDir, 'database/migrations'), { recursive: true });
copyRecursiveSync(path.join(workspaceRoot, 'database/migrations'), path.join(coreDir, 'database/migrations'));
if (fs.existsSync(path.join(workspaceRoot, 'database/seeders'))) {
    copyRecursiveSync(path.join(workspaceRoot, 'database/seeders'), path.join(coreDir, 'database/seeders'));
}

fs.copyFileSync(path.join(workspaceRoot, 'artisan'), path.join(coreDir, 'artisan'));
fs.copyFileSync(path.join(workspaceRoot, 'composer.json'), path.join(coreDir, 'composer.json'));
fs.copyFileSync(path.join(workspaceRoot, 'composer.lock'), path.join(coreDir, 'composer.lock'));
fs.copyFileSync(path.join(workspaceRoot, '.env.example'), path.join(coreDir, '.env.example'));

// Clean storage directories
const storageDirs = [
    'storage/app/public',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/logs'
];
for (const dir of storageDirs) {
    const fullDir = path.join(coreDir, dir);
    fs.mkdirSync(fullDir, { recursive: true });
    fs.writeFileSync(path.join(fullDir, '.gitignore'), "*\n!.gitignore\n");
}

// Generate One-Time High-Entropy Secret
const secretToken = 'TY2026-' + crypto.randomBytes(16).toString('hex');
fs.writeFileSync(path.join(coreDir, 'install_token.txt'), secretToken);

// 5. Populate public_html
console.log('4. Populating public_html...');
copyRecursiveSync(path.join(workspaceRoot, 'public/build'), path.join(pubDir, 'build'));
copyRecursiveSync(path.join(workspaceRoot, 'public/fonts'), path.join(pubDir, 'fonts'));
copyRecursiveSync(path.join(workspaceRoot, 'public/icons'), path.join(pubDir, 'icons'));
fs.copyFileSync(path.join(workspaceRoot, 'public/favicon.ico'), path.join(pubDir, 'favicon.ico'));
fs.copyFileSync(path.join(workspaceRoot, 'public/robots.txt'), path.join(pubDir, 'robots.txt'));
fs.copyFileSync(path.join(workspaceRoot, 'public/manifest.webmanifest'), path.join(pubDir, 'manifest.webmanifest'));
fs.copyFileSync(path.join(workspaceRoot, 'public/sw.js'), path.join(pubDir, 'sw.js'));
fs.copyFileSync(path.join(workspaceRoot, 'public/.htaccess'), path.join(pubDir, '.htaccess'));
fs.copyFileSync(path.join(workspaceRoot, 'public/index.php'), path.join(pubDir, 'index.php'));
fs.copyFileSync(path.join(workspaceRoot, 'public/install.php'), path.join(pubDir, 'install.php'));

// 6. Populate installation
console.log('5. Populating installation...');
fs.copyFileSync(path.join(workspaceRoot, 'installation/taskyar_initial_schema.sql'), path.join(instDir, 'taskyar_initial_schema.sql'));
fs.copyFileSync(path.join(workspaceRoot, 'installation/.env.production.example'), path.join(instDir, '.env.production.example'));
fs.writeFileSync(path.join(instDir, 'INSTALL_SECRET.txt'), secretToken);

// 7. Populate documentation
console.log('6. Populating documentation...');
copyRecursiveSync(path.join(workspaceRoot, 'package_docs'), docDir);

// 8. Restore development dependencies in dev workspace
console.log('7. Restoring dev dependencies in workspace...');
execSync('composer install --no-interaction', { cwd: workspaceRoot, stdio: 'inherit' });

// 9. Create ZIP archive
console.log('8. Creating ZIP archive...');
if (fs.existsSync(zipOutput)) {
    fs.unlinkSync(zipOutput);
}

const escapedStaging = stagingDir.replace(/\\/g, '/');
const escapedZip = zipOutput.replace(/\\/g, '/');

const psZipCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${escapedStaging}', '${escapedZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(psZipCmd, { stdio: 'inherit' });

// 10. Check file metrics
const stat = fs.statSync(zipOutput);
const hash = crypto.createHash('sha256').update(fs.readFileSync(zipOutput)).digest('hex');
const mb = (stat.size / (1024 * 1024)).toFixed(2);

console.log('==========================================================');
console.log('Package created successfully!');
console.log(`Path:   ${zipOutput}`);
console.log(`Size:   ${stat.size} bytes (${mb} MB)`);
console.log(`SHA256: ${hash}`);
console.log(`Token:  ${secretToken}`);
console.log('==========================================================');
