import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const stagingDir = path.join(releasesDir, 'staging_final');
const packageRoot = path.join(stagingDir, 'TaskYar-Web-2.0');
const finalZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-FINAL-Stable.zip');
const compatZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-FINAL-Production-Ready.zip');
const stableProdZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-Stable-Production.zip');
const v202ZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-Production-v2.0.2.zip');
const stableFullZipOutput = path.join(releasesDir, 'TaskYar-Web-v2.0.2-Stable-Full.zip');
const tmpZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-FINAL-Stable.tmp.zip');

console.log('=================================================================================');
console.log('TaskYar Web 2.0 FINAL — Packaging Complete Production-Ready Release Archive');
console.log('=================================================================================\n');

// 1. Clean and prepare staging directory
if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(packageRoot, { recursive: true });

// 2. Compile frontend assets with Vite
console.log('1. Compiling production frontend assets with Vite...');
execSync('npm run build', { cwd: workspaceRoot, stdio: 'inherit' });

// 3. Install production-only PHP dependencies
console.log('\n2. Installing production-only Composer dependencies...');
execSync('composer install --no-dev --optimize-autoloader --prefer-dist --no-interaction', { cwd: workspaceRoot, stdio: 'inherit' });

// 4. Helper for copying recursively
function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const childItem of fs.readdirSync(src)) {
            // Ignore unwanted items
            if (
                childItem === '.git' ||
                childItem === 'node_modules' ||
                childItem === '.phpunit.cache' ||
                childItem === '.phpunit.result.cache' ||
                childItem === '.ai' ||
                childItem === 'database.sqlite' ||
                childItem === '.env'
            ) {
                continue;
            }
            copyRecursiveSync(path.join(src, childItem), path.join(dest, childItem));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

// 5. Populate standard Laravel directories
console.log('\n3. Populating standard Laravel structure in TaskYar-Web-2.0...');

// app
copyRecursiveSync(path.join(workspaceRoot, 'app'), path.join(packageRoot, 'app'));

// bootstrap
fs.mkdirSync(path.join(packageRoot, 'bootstrap/cache'), { recursive: true });
fs.copyFileSync(path.join(workspaceRoot, 'bootstrap/app.php'), path.join(packageRoot, 'bootstrap/app.php'));
if (fs.existsSync(path.join(workspaceRoot, 'bootstrap/providers.php'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'bootstrap/providers.php'), path.join(packageRoot, 'bootstrap/providers.php'));
}
fs.writeFileSync(path.join(packageRoot, 'bootstrap/cache/.gitignore'), "*\n!.gitignore\n");

// config
copyRecursiveSync(path.join(workspaceRoot, 'config'), path.join(packageRoot, 'config'));

// database (migrations, seeders, factories)
fs.mkdirSync(path.join(packageRoot, 'database/migrations'), { recursive: true });
copyRecursiveSync(path.join(workspaceRoot, 'database/migrations'), path.join(packageRoot, 'database/migrations'));
if (fs.existsSync(path.join(workspaceRoot, 'database/seeders'))) {
    copyRecursiveSync(path.join(workspaceRoot, 'database/seeders'), path.join(packageRoot, 'database/seeders'));
}
if (fs.existsSync(path.join(workspaceRoot, 'database/factories'))) {
    copyRecursiveSync(path.join(workspaceRoot, 'database/factories'), path.join(packageRoot, 'database/factories'));
}

// docs (Documentation and Screenshots)
const docsTarget = path.join(packageRoot, 'docs');
copyRecursiveSync(path.join(workspaceRoot, 'docs'), docsTarget);

// public (Precompiled assets, PWA icons, manifest, sw)
const pubTarget = path.join(packageRoot, 'public');
fs.mkdirSync(pubTarget, { recursive: true });
copyRecursiveSync(path.join(workspaceRoot, 'public/build'), path.join(pubTarget, 'build'));
copyRecursiveSync(path.join(workspaceRoot, 'public/fonts'), path.join(pubTarget, 'fonts'));
copyRecursiveSync(path.join(workspaceRoot, 'public/pwa-icons'), path.join(pubTarget, 'pwa-icons'));
copyRecursiveSync(path.join(workspaceRoot, 'public/icons'), path.join(pubTarget, 'icons'));
fs.copyFileSync(path.join(workspaceRoot, 'public/favicon.ico'), path.join(pubTarget, 'favicon.ico'));
fs.copyFileSync(path.join(workspaceRoot, 'public/robots.txt'), path.join(pubTarget, 'robots.txt'));
fs.copyFileSync(path.join(workspaceRoot, 'public/manifest.webmanifest'), path.join(pubTarget, 'manifest.webmanifest'));
fs.copyFileSync(path.join(workspaceRoot, 'public/sw.js'), path.join(pubTarget, 'sw.js'));
fs.copyFileSync(path.join(workspaceRoot, 'public/.htaccess'), path.join(pubTarget, '.htaccess'));
fs.copyFileSync(path.join(workspaceRoot, 'public/index.php'), path.join(pubTarget, 'index.php'));

// resources
copyRecursiveSync(path.join(workspaceRoot, 'resources'), path.join(packageRoot, 'resources'));

// routes
copyRecursiveSync(path.join(workspaceRoot, 'routes'), path.join(packageRoot, 'routes'));

// storage (clean production directories)
const storageDirs = [
    'storage/app/public',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/logs'
];
for (const dir of storageDirs) {
    const fullDir = path.join(packageRoot, dir);
    fs.mkdirSync(fullDir, { recursive: true });
    fs.writeFileSync(path.join(fullDir, '.gitignore'), "*\n!.gitignore\n");
}

// vendor (production only)
copyRecursiveSync(path.join(workspaceRoot, 'vendor'), path.join(packageRoot, 'vendor'));

// Root files
fs.copyFileSync(path.join(workspaceRoot, 'artisan'), path.join(packageRoot, 'artisan'));
fs.copyFileSync(path.join(workspaceRoot, 'composer.json'), path.join(packageRoot, 'composer.json'));
fs.copyFileSync(path.join(workspaceRoot, 'composer.lock'), path.join(packageRoot, 'composer.lock'));
fs.copyFileSync(path.join(workspaceRoot, '.env.example'), path.join(packageRoot, '.env.example'));
if (fs.existsSync(path.join(workspaceRoot, 'CHANGELOG.md'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'CHANGELOG.md'), path.join(packageRoot, 'CHANGELOG.md'));
}
if (fs.existsSync(path.join(workspaceRoot, 'README.md'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'README.md'), path.join(packageRoot, 'README.md'));
}
if (fs.existsSync(path.join(workspaceRoot, 'LICENSE'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'LICENSE'), path.join(packageRoot, 'LICENSE'));
}
if (fs.existsSync(path.join(workspaceRoot, 'UPDATE_MANIFEST.md'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'UPDATE_MANIFEST.md'), path.join(packageRoot, 'UPDATE_MANIFEST.md'));
}
if (fs.existsSync(path.join(workspaceRoot, 'UPDATE_INSTRUCTIONS_FA.md'))) {
    fs.copyFileSync(path.join(workspaceRoot, 'UPDATE_INSTRUCTIONS_FA.md'), path.join(packageRoot, 'UPDATE_INSTRUCTIONS_FA.md'));
}

// 6. Restore development dependencies in workspace
console.log('\n4. Restoring full development dependencies in dev workspace...');
execSync('composer install --prefer-dist --no-interaction', { cwd: workspaceRoot, stdio: 'inherit' });

// 7. Create temporary ZIP archive
console.log(`\n5. Creating final production ZIP archive: ${tmpZipOutput}...`);
if (fs.existsSync(tmpZipOutput)) {
    fs.unlinkSync(tmpZipOutput);
}

const escapedStaging = stagingDir.replace(/\\/g, '/');
const escapedZip = tmpZipOutput.replace(/\\/g, '/');

const psZipCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${escapedStaging}', '${escapedZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(psZipCmd, { stdio: 'inherit' });

// 8. Move tmp zip to final destination
if (fs.existsSync(finalZipOutput)) {
    fs.unlinkSync(finalZipOutput);
}
fs.renameSync(tmpZipOutput, finalZipOutput);
fs.copyFileSync(finalZipOutput, compatZipOutput);
fs.copyFileSync(finalZipOutput, stableProdZipOutput);
fs.copyFileSync(finalZipOutput, v202ZipOutput);
fs.copyFileSync(finalZipOutput, stableFullZipOutput);

// Clean staging directory
fs.rmSync(stagingDir, { recursive: true, force: true });

// 9. Calculate file metrics and generate SHA256SUMS.txt
const stat = fs.statSync(finalZipOutput);
const hash = crypto.createHash('sha256').update(fs.readFileSync(finalZipOutput)).digest('hex');
const mb = (stat.size / (1024 * 1024)).toFixed(2);

// Check hotfix zip hash if exists
const hotfixZip = path.join(releasesDir, 'TaskYar-Web-2.0-Mobile-UI-Hotfix.zip');
let hotfixLine = '';
if (fs.existsSync(hotfixZip)) {
    const hotfixHash = crypto.createHash('sha256').update(fs.readFileSync(hotfixZip)).digest('hex');
    hotfixLine = `${hotfixHash}  TaskYar-Web-2.0-Mobile-UI-Hotfix.zip\n`;
}

const sha256Content = `${hotfixLine}${hash}  TaskYar-Web-v2.0.2-Stable-Full.zip\n${hash}  TaskYar-Web-2.0-Production-v2.0.2.zip\n${hash}  TaskYar-Web-2.0-Stable-Production.zip\n${hash}  TaskYar-Web-2.0-FINAL-Stable.zip\n${hash}  TaskYar-Web-2.0-FINAL-Production-Ready.zip\n`;
fs.writeFileSync(path.join(releasesDir, 'SHA256SUMS.txt'), sha256Content, 'utf8');

console.log('=================================================================================');
console.log('FINAL PRODUCTION RELEASE CREATED SUCCESSFULLY!');
console.log(`Archive: ${finalZipOutput}`);
console.log(`Size:    ${stat.size} bytes (${mb} MB)`);
console.log(`SHA256:  ${hash}`);
console.log('=================================================================================');
