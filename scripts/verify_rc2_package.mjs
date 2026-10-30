import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const zipPath = path.join(releasesDir, 'TaskYar-Web-2.0-RC2-PWA-Mobile-Fixed.zip');
const testBaseDir = path.join(releasesDir, 'clean_rc2_test');
const simHome = path.join(testBaseDir, 'home/fileruni/domains/taskyar.3aw.ir');
const corePath = path.join(simHome, 'taskyar_core');

console.log('===================================================================');
console.log('TaskYar Web 2.0 RC2 — Verified Package Extraction & Audit Suite');
console.log('===================================================================');

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
        throw new Error(`Required directory missing: ${d}`);
    }
    console.log(`  [OK] Directory: ${d}`);
}

const requiredFiles = [
    'artisan', 'composer.json', 'composer.lock', '.env.example',
    'bootstrap/app.php', 'public/index.php', 'public/.htaccess',
    'public/favicon.ico', 'public/manifest.webmanifest', 'public/sw.js',
    'docs/PWA_FIX_REPORT.md', 'docs/INDEXEDDB_FIX_REPORT.md',
    'docs/MOBILE_RESPONSIVE_REPORT.md', 'docs/BROWSER_CONSOLE_AUDIT.md',
    'docs/RC2_TEST_RESULTS.md', 'docs/DIRECTADMIN_UPDATE_FA.md'
];
for (const f of requiredFiles) {
    const full = path.join(corePath, f);
    if (!fs.existsSync(full)) {
        throw new Error(`Required file missing: ${f}`);
    }
    console.log(`  [OK] File: ${f}`);
}

// 5. Excluded files validation
console.log('\n--- 3. Excluded Files & Secret Hygiene Verification ---');
const forbiddenPaths = [
    '.env',
    '.git',
    'node_modules',
    'database/database.sqlite',
    '.phpunit.cache',
    '.phpunit.result.cache'
];
for (const f of forbiddenPaths) {
    const full = path.join(corePath, f);
    if (fs.existsSync(full)) {
        throw new Error(`Forbidden file/dir found in package: ${f}`);
    }
    console.log(`  [OK] Excluded: ${f} is absent as expected`);
}

// 6. Check PWA icons
console.log('\n--- 4. PWA Icons Verification ---');
const expectedIcons = [
    'icon-192.png',
    'icon-maskable-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'icon.svg',
    'apple-touch-icon.png',
    'favicon-64.png'
];
for (const ic of expectedIcons) {
    const p1 = path.join(corePath, 'public/pwa-icons', ic);
    const p2 = path.join(corePath, 'public/icons', ic);
    if (!fs.existsSync(p1) || fs.statSync(p1).size === 0) throw new Error(`Missing or empty icon: public/pwa-icons/${ic}`);
    if (!fs.existsSync(p2) || fs.statSync(p2).size === 0) throw new Error(`Missing or empty icon: public/icons/${ic}`);
    console.log(`  [OK] Icon verified: ${ic} (${fs.statSync(p1).size} bytes)`);
}

// 7. Check manifest & service worker
console.log('\n--- 5. Manifest & SW Verification ---');
const manifestContent = JSON.parse(fs.readFileSync(path.join(corePath, 'public/manifest.webmanifest'), 'utf8'));
if (!manifestContent.icons || manifestContent.icons.length < 5) {
    throw new Error('Manifest missing icons array');
}
if (!manifestContent.icons[0].src.startsWith('/pwa-icons/')) {
    throw new Error('Manifest icon does not point to /pwa-icons/');
}
console.log(`  [OK] Manifest contains ${manifestContent.icons.length} icon declarations pointing to /pwa-icons/`);

const swContent = fs.readFileSync(path.join(corePath, 'public/sw.js'), 'utf8');
if (!swContent.includes('/pwa-icons/icon-192.png')) {
    throw new Error('sw.js missing precaching for /pwa-icons/');
}
console.log('  [OK] sw.js precaches /pwa-icons/');

// 8. Check offlineDb.js clone & normalizer
console.log('\n--- 6. IndexedDB Engine Verification ---');
const offlineDbCode = fs.readFileSync(path.join(corePath, 'resources/js/utils/offlineDb.js'), 'utf8');
if (!offlineDbCode.includes('function deepClonePlain')) {
    throw new Error('offlineDb.js missing deepClonePlain');
}
if (!offlineDbCode.includes('normalizeTaskRecord')) {
    throw new Error('offlineDb.js missing normalizeTaskRecord');
}
console.log('  [OK] offlineDb.js includes deepClonePlain and typed normalizers');

// 9. Check Screenshots
console.log('\n--- 7. Documentation Screenshots Verification ---');
const screenshots = fs.readdirSync(path.join(corePath, 'docs/screenshots'));
console.log(`  [OK] ${screenshots.length} screenshots found in docs/screenshots/`);
if (screenshots.length < 13) {
    throw new Error(`Expected at least 13 screenshots, found ${screenshots.length}`);
}

// 10. Syntax verification with PHP CLI
console.log('\n--- 8. PHP Syntax Check ---');
const phpFiles = [
    'artisan',
    'public/index.php',
    'bootstrap/app.php',
    'app/Console/Commands/TaskyarDiagnoseCommand.php',
    'routes/web.php',
    'routes/console.php'
];
for (const pf of phpFiles) {
    const full = path.join(corePath, pf);
    execSync(`php -l "${full}"`, { stdio: 'inherit' });
}

// 11. Run Artisan from extracted folder
console.log('\n--- 9. Artisan Validation on Extracted Production Build ---');
const artisanOut = execSync('php artisan --version', { cwd: corePath, encoding: 'utf8' });
console.log(`  [OK] Extracted build runs: ${artisanOut.trim()}`);

console.log('\n===================================================================');
console.log('ALL VERIFICATION CHECKS PASSED FOR TaskYar-Web-2.0-RC2-PWA-Mobile-Fixed.zip');
console.log('===================================================================');
