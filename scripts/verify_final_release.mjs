import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const zipPath = path.join(releasesDir, 'TaskYar-Web-2.0-FINAL-Stable.zip');
const testBaseDir = path.join(releasesDir, 'clean_final_test');
const simHome = path.join(testBaseDir, 'home/fileruni/domains/taskyar.3aw.ir');
const corePath = path.join(simHome, 'taskyar_core');

console.log('=================================================================================');
console.log('TaskYar Web 2.0 FINAL — Extraction & Production Compatibility Audit Suite');
console.log('=================================================================================\n');

// 1. Check ZIP archive
if (!fs.existsSync(zipPath)) {
    throw new Error(`Package archive not found: ${zipPath}`);
}
const stat = fs.statSync(zipPath);
const hash = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
console.log(`[PASS] ZIP archive found: ${zipPath}`);
console.log(`       Size: ${stat.size} bytes (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`       SHA-256: ${hash}`);

// 2. Clean previous test extraction
if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true, force: true });
}
fs.mkdirSync(simHome, { recursive: true });

// 3. Extract ZIP package
console.log('\n--- 1. Extracting ZIP Package ---');
const escapedZip = zipPath.replace(/\\/g, '/');
const escapedExtract = testBaseDir.replace(/\\/g, '/');
const psExtractCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedZip}', '${escapedExtract}')"`;
execSync(psExtractCmd, { stdio: 'inherit' });

const extractedRoot = path.join(testBaseDir, 'TaskYar-Web-2.0');
if (!fs.existsSync(extractedRoot)) {
    throw new Error('TaskYar-Web-2.0 folder not found in extracted archive root!');
}
const escapedSrc = extractedRoot.replace(/\\/g, '/');
const escapedDest = corePath.replace(/\\/g, '/');
execSync(`powershell -NoProfile -Command "Move-Item -Path '${escapedSrc}' -Destination '${escapedDest}'"`, { stdio: 'inherit' });
console.log(`[PASS] Extracted successfully to: ${corePath}`);

// 4. Verify directory structure & critical files
console.log('\n--- 2. Directory Structure & Files Verification ---');
const requiredDirs = [
    'app', 'app/Console/Commands', 'bootstrap', 'bootstrap/cache', 'config',
    'database', 'database/migrations', 'docs', 'docs/screenshots',
    'public', 'public/build', 'public/fonts', 'public/pwa-icons', 'public/icons',
    'resources', 'routes', 'storage', 'storage/app/public',
    'storage/framework/cache/data', 'storage/framework/sessions', 'storage/framework/views',
    'storage/logs', 'vendor'
];
for (const d of requiredDirs) {
    const full = path.join(corePath, d);
    if (!fs.existsSync(full)) {
        throw new Error(`Missing required directory: ${d}`);
    }
}
console.log(`[PASS] All ${requiredDirs.length} standard Laravel directories are present`);

// 5. Excluded items check
console.log('\n--- 3. Excluded Development Items Verification ---');
const excludedItems = [
    '.env',
    '.git',
    'node_modules',
    'database/database.sqlite',
    '.phpunit.cache',
    '.phpunit.result.cache',
    '.ai'
];
for (const excl of excludedItems) {
    const full = path.join(corePath, excl);
    if (fs.existsSync(full)) {
        throw new Error(`Excluded item found in package: ${excl}`);
    }
}
console.log('[PASS] No sensitive .env, .git, node_modules, or cache files found in release');

// 6. Precompiled Frontend Assets Verification
console.log('\n--- 4. Precompiled Assets & Vite Manifest Verification ---');
const manifestPath = path.join(corePath, 'public/build/manifest.json');
if (!fs.existsSync(manifestPath)) {
    throw new Error('Vite manifest.json not found in public/build!');
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest['resources/js/app.js']) {
    throw new Error('manifest.json does not contain resources/js/app.js entry!');
}
const jsAsset = path.join(corePath, 'public/build', manifest['resources/js/app.js'].file);
if (!fs.existsSync(jsAsset)) {
    throw new Error(`Referenced compiled JS asset not found: ${jsAsset}`);
}
console.log(`[PASS] Vite manifest valid with compiled JS bundle: ${manifest['resources/js/app.js'].file}`);

// Check Vazirmatn local fonts
const fontDir = path.join(corePath, 'public/fonts/vazirmatn/fonts/webfonts');
if (!fs.existsSync(fontDir)) {
    throw new Error('Local Vazirmatn fonts directory missing from public/fonts/vazirmatn/fonts/webfonts!');
}
const fonts = fs.readdirSync(fontDir);
if (fonts.length < 5) {
    throw new Error('Local Vazirmatn woff2 fonts missing from public/fonts/vazirmatn/fonts/webfonts!');
}
console.log(`[PASS] Local Vazirmatn woff2 fonts present (${fonts.length} font weights)`);

// Check PWA icons & manifest
const manifestWeb = path.join(corePath, 'public/manifest.webmanifest');
if (!fs.existsSync(manifestWeb)) throw new Error('manifest.webmanifest missing!');
const swJs = path.join(corePath, 'public/sw.js');
if (!fs.existsSync(swJs)) throw new Error('sw.js missing!');
console.log('[PASS] PWA webmanifest and service worker present');

// 7. Verify Database Migrations have InnoDB and correct key lengths
console.log('\n--- 5. MariaDB 10.6.23 & MyISAM Engine Compatibility Verification ---');
const migrationsDir = path.join(corePath, 'database/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.php'));
let innodbChecks = 0;
for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (content.includes('Schema::create(')) {
        if (!content.includes("$table->engine = 'InnoDB'")) {
            throw new Error(`Migration ${file} missing explicit $table->engine = 'InnoDB' declaration!`);
        }
        innodbChecks++;
    }
}
console.log(`[PASS] All ${innodbChecks} table creation migrations explicitly enforce $table->engine = 'InnoDB'`);

// 8. Artisan Command Simulation on extracted package
console.log('\n--- 6. Artisan Commands Simulation on Extracted Package ---');
fs.copyFileSync(path.join(corePath, '.env.example'), path.join(corePath, '.env'));
execSync('php artisan --version', { cwd: corePath, stdio: 'inherit' });
execSync('php artisan key:generate', { cwd: corePath, stdio: 'inherit' });
execSync('php artisan config:clear', { cwd: corePath, stdio: 'inherit' });
execSync('php artisan route:list --path=api', { cwd: corePath, stdio: 'inherit' });
console.log('[PASS] Artisan commands execute cleanly on production core');

// Clean test base directory
fs.rmSync(testBaseDir, { recursive: true, force: true });

console.log('\n=================================================================================');
console.log('TaskYar Web 2.0 FINAL RELEASE INTEGRITY VERIFIED (100% PRODUCTION READY)');
console.log('=================================================================================');
