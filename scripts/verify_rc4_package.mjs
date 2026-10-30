import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const zipPath = path.join(releasesDir, 'TaskYar-Web-2.0-RC4-PWA-Shortcuts-Fixed.zip');
const testBaseDir = path.join(releasesDir, 'clean_rc4_test');
const simHome = path.join(testBaseDir, 'home/fileruni/domains/taskyar.3aw.ir');
const corePath = path.join(simHome, 'taskyar_core');

console.log('===================================================================');
console.log('TaskYar Web 2.0 RC4 — Verified Package Extraction & Audit Suite');
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
    'docs/FRESH_INSTALL_DIRECTADMIN_FA.md',
    'docs/DIRECTADMIN_UPDATE_FA.md',
    'resources/js/utils/shortcuts.js'
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
if (!manifestContent.shortcuts || manifestContent.shortcuts.length < 3) {
    throw new Error('Manifest missing launcher shortcuts');
}
console.log(`  [OK] Manifest contains ${manifestContent.shortcuts.length} launcher shortcuts`);

const swContent = fs.readFileSync(path.join(corePath, 'public/sw.js'), 'utf8');
if (!swContent.includes('taskyar-v2.0.0-rc4')) {
    throw new Error('sw.js cache version not updated to rc4');
}
console.log('  [OK] sw.js cache version confirmed: taskyar-v2.0.0-rc4');

// 8. Check Shortcuts Engine
console.log('\n--- 6. Shortcuts Engine Verification ---');
const shortcutsCode = fs.readFileSync(path.join(corePath, 'resources/js/utils/shortcuts.js'), 'utf8');
if (!shortcutsCode.includes('SHORTCUT_DEFINITIONS') || !shortcutsCode.includes('registerShortcuts')) {
    throw new Error('shortcuts.js is missing critical definitions');
}
console.log('  [OK] shortcuts.js contains canonical definitions and registerShortcuts');

// 9. Check Screenshots
console.log('\n--- 7. Documentation Screenshots Verification ---');
const screenshots = fs.readdirSync(path.join(corePath, 'docs/screenshots'));
console.log(`  [OK] ${screenshots.length} screenshots found in docs/screenshots/`);

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
console.log('ALL VERIFICATION CHECKS PASSED FOR TaskYar-Web-2.0-RC4-PWA-Shortcuts-Fixed.zip');
console.log('===================================================================');
