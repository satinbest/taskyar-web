import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const zipPath = path.join(workspaceRoot, 'releases/TaskYar-Web-2.0-RC1-DirectAdmin-NoSSH.zip');
const cleanTestDir = path.join(workspaceRoot, 'releases/clean_test');

console.log('================================================================');
console.log('TaskYar Web 2.0 RC1 — Mandatory Clean Extraction Verification');
console.log('================================================================');

// 1. Check ZIP file existence, size and SHA256
if (!fs.existsSync(zipPath)) {
    console.error('FAIL: ZIP file not found at:', zipPath);
    process.exit(1);
}

const stat = fs.statSync(zipPath);
const hash = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
console.log(`[PASS] ZIP Archive exists: ${zipPath}`);
console.log(`[PASS] File Size: ${stat.size} bytes (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`[PASS] SHA-256: ${hash}`);

// 2. Clean extraction directory
if (fs.existsSync(cleanTestDir)) {
    fs.rmSync(cleanTestDir, { recursive: true, force: true });
}
fs.mkdirSync(cleanTestDir, { recursive: true });

// 3. Extract ZIP
console.log('\n--- 1. Extracting ZIP to clean directory ---');
const escapedZip = zipPath.replace(/\\/g, '/');
const escapedDest = cleanTestDir.replace(/\\/g, '/');
const psExtractCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedZip}', '${escapedDest}')"`;
execSync(psExtractCmd, { stdio: 'inherit' });
console.log('[PASS] Extracted successfully without errors');

// 4. Verify Folder Structure
console.log('\n--- 2. Verifying Folder Structure ---');
const pkgDir = path.join(cleanTestDir, 'TaskYar-Web-2.0-RC1');
if (!fs.existsSync(pkgDir)) {
    console.error('FAIL: TaskYar-Web-2.0-RC1 root folder missing inside ZIP');
    process.exit(1);
}

const requiredDirs = ['taskyar_core', 'public_html', 'installation', 'documentation'];
for (const d of requiredDirs) {
    const fullP = path.join(pkgDir, d);
    if (!fs.existsSync(fullP) || !fs.statSync(fullP).isDirectory()) {
        console.error(`FAIL: Required folder missing: ${d}`);
        process.exit(1);
    }
    console.log(`[PASS] Found required folder: ${d}`);
}

// 5. Verify vendor and production PHP dependencies
console.log('\n--- 3. Verifying Production PHP Dependencies & Autoload ---');
const autoloadPath = path.join(pkgDir, 'taskyar_core/vendor/autoload.php');
if (!fs.existsSync(autoloadPath)) {
    console.error('FAIL: vendor/autoload.php missing');
    process.exit(1);
}
console.log('[PASS] vendor/autoload.php exists');

// Verify NO node_modules or .git
const forbidden = [
    path.join(pkgDir, 'taskyar_core/node_modules'),
    path.join(pkgDir, 'public_html/node_modules'),
    path.join(pkgDir, '.git'),
    path.join(pkgDir, 'taskyar_core/.git')
];
for (const f of forbidden) {
    if (fs.existsSync(f)) {
        console.error(`FAIL: Forbidden development directory found in package: ${f}`);
        process.exit(1);
    }
}
console.log('[PASS] Zero node_modules or .git artifacts in package');

// 6. Verify Compiled Frontend Assets
console.log('\n--- 4. Verifying Compiled Assets & Local Fonts ---');
const buildDir = path.join(pkgDir, 'public_html/build');
const manifestFile = path.join(buildDir, 'manifest.json');
if (!fs.existsSync(manifestFile)) {
    console.error('FAIL: public_html/build/manifest.json missing');
    process.exit(1);
}
console.log('[PASS] Vite build manifest exists');

const vazirFont = path.join(pkgDir, 'public_html/fonts/vazirmatn/vazirmatn.css');
if (!fs.existsSync(vazirFont)) {
    console.error('FAIL: Vazirmatn font CSS missing');
    process.exit(1);
}
console.log('[PASS] Locally hosted Vazirmatn font exists');

const iconSvg = path.join(pkgDir, 'public_html/icons/icon.svg');
if (!fs.existsSync(iconSvg)) {
    console.error('FAIL: Iconsax SVG icons missing');
    process.exit(1);
}
console.log('[PASS] Local Iconsax icon assets exist');

const swFile = path.join(pkgDir, 'public_html/sw.js');
const pwaManifest = path.join(pkgDir, 'public_html/manifest.webmanifest');
const htaccess = path.join(pkgDir, 'public_html/.htaccess');
if (!fs.existsSync(swFile) || !fs.existsSync(pwaManifest) || !fs.existsSync(htaccess)) {
    console.error('FAIL: PWA service worker, manifest, or .htaccess missing');
    process.exit(1);
}
console.log('[PASS] sw.js, manifest.webmanifest, and .htaccess exist');

// 7. Verify Documentation
console.log('\n--- 5. Verifying Documentation Files ---');
const expectedDocs = [
    'INSTALL_DIRECTADMIN_NO_SSH_FA.md',
    'CRON_SETUP_DIRECTADMIN_FA.md',
    'UPDATE_WITHOUT_SSH_FA.md',
    'BACKUP_RESTORE_FA.md',
    'ROLLBACK_RECOVERY_FA.md',
    'HOSTING_REQUIREMENTS_FA.md',
    'RELEASE_NOTES_FA.md',
    'FINAL_PACKAGE_VERIFICATION.md'
];
for (const doc of expectedDocs) {
    const docP = path.join(pkgDir, 'documentation', doc);
    if (!fs.existsSync(docP)) {
        console.error(`FAIL: Required doc missing: ${doc}`);
        process.exit(1);
    }
    console.log(`[PASS] Documentation verified: ${doc}`);
}

// 8. Verify Installation Package
console.log('\n--- 6. Verifying Installation Utilities ---');
const sqlSchema = path.join(pkgDir, 'installation/taskyar_initial_schema.sql');
const secretTxt = path.join(pkgDir, 'installation/INSTALL_SECRET.txt');
const tokenTxt = path.join(pkgDir, 'taskyar_core/install_token.txt');
if (!fs.existsSync(sqlSchema) || !fs.existsSync(secretTxt) || !fs.existsSync(tokenTxt)) {
    console.error('FAIL: Installation SQL schema or tokens missing');
    process.exit(1);
}

const secret1 = fs.readFileSync(secretTxt, 'utf-8').trim();
const secret2 = fs.readFileSync(tokenTxt, 'utf-8').trim();
if (secret1 !== secret2 || secret1.length < 20) {
    console.error('FAIL: Secret token mismatch or low entropy');
    process.exit(1);
}
console.log(`[PASS] One-Time Secret Token verified (${secret1})`);

// 9. Simulate DirectAdmin Directory Layout
console.log('\n--- 7. Simulating DirectAdmin Deployment Layout ---');
const simRoot = path.join(cleanTestDir, 'simulated_hosting');
const simUserHome = path.join(simRoot, 'home/testuser');
const simDomains = path.join(simUserHome, 'domains/testdomain.com');
const simPublicHtml = path.join(simDomains, 'public_html');
const simCore = path.join(simUserHome, 'taskyar_core');

fs.mkdirSync(simPublicHtml, { recursive: true });
fs.mkdirSync(simCore, { recursive: true });

// Move extracted directories to simulate user actions
function copyDir(src, dest) {
    fs.cpSync(src, dest, { recursive: true });
}
copyDir(path.join(pkgDir, 'taskyar_core'), simCore);
copyDir(path.join(pkgDir, 'public_html'), simPublicHtml);
console.log(`[PASS] Simulated DirectAdmin layout:`);
console.log(`       Core:   ${simCore}`);
console.log(`       Public: ${simPublicHtml}`);

// 10. Test Database & Migrations in Extracted Core
console.log('\n--- 8. Testing Database Migrations on Clean Isolated DB ---');
const testDbPath = path.join(simCore, 'database/test_clean.sqlite');
fs.writeFileSync(testDbPath, '');

const testEnvContent = `APP_NAME=TaskYar
APP_ENV=production
APP_KEY=base64:${crypto.randomBytes(32).toString('base64')}
APP_DEBUG=false
APP_URL=http://testdomain.com
DB_CONNECTION=sqlite
DB_DATABASE="${testDbPath.replace(/\\/g, '/')}"
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=false
CACHE_STORE=file
QUEUE_CONNECTION=sync
`;
fs.writeFileSync(path.join(simCore, '.env'), testEnvContent);

const migrateOutput = execSync(`php artisan migrate --force`, {
    cwd: simCore,
    encoding: 'utf-8'
});
console.log('[PASS] artisan migrate --force executed successfully on clean DB:');
console.log(migrateOutput.trim().split('\n').slice(0, 5).join('\n') + '\n...');

// 11. Test that Public Entry Point Resolves Correctly
console.log('\n--- 9. Verifying Public Entry Point Bootstrap ---');
const verifyPhpPath = path.join(simPublicHtml, '_test_bootstrap.php');
fs.writeFileSync(verifyPhpPath, `<?php
require_once '${path.join(simCore, 'vendor/autoload.php').replace(/\\/g, '/')}';
$app = require_once '${path.join(simCore, 'bootstrap/app.php').replace(/\\/g, '/')}';
$kernel = $app->make(Illuminate\\Contracts\\Http\\Kernel::class);
$request = Illuminate\\Http\\Request::create('/', 'GET');
$response = $kernel->handle($request);
echo "STATUS:" . $response->getStatusCode();
`);

const testRunOutput = execSync(`php _test_bootstrap.php`, {
    cwd: simPublicHtml,
    encoding: 'utf-8'
});
fs.unlinkSync(verifyPhpPath);
console.log(`[PASS] HTTP Request bootstrap returned: ${testRunOutput.trim()}`);
if (!testRunOutput.includes('STATUS:200') && !testRunOutput.includes('STATUS:302')) {
    console.error('FAIL: Public entry point did not return 200/302');
    process.exit(1);
}

// 12. Test Installer Lockout
console.log('\n--- 10. Verifying Installer Lockout ---');
fs.writeFileSync(path.join(simCore, 'installed.lock'), 'Installed at ' + new Date().toISOString());

const testLockPath = path.join(simPublicHtml, '_test_lock.php');
fs.writeFileSync(testLockPath, `<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
include '${path.join(simPublicHtml, 'install.php').replace(/\\/g, '/')}';
$content = ob_get_clean();
echo "CODE:" . http_response_code();
`);

const lockOutput = execSync(`php _test_lock.php`, {
    cwd: simPublicHtml,
    encoding: 'utf-8'
});
fs.unlinkSync(testLockPath);
console.log(`[PASS] install.php when locked returned: ${lockOutput.trim()}`);
if (!lockOutput.includes('نصب قبلاً با موفقیت انجام شده است') && !lockOutput.includes('CODE:403')) {
    console.error('FAIL: install.php did not refuse execution when installed.lock exists');
    process.exit(1);
}

console.log('\n================================================================');
console.log('ALL 15 MANDATORY CLEAN EXTRACTION VERIFICATION CHECKS PASSED!');
console.log('================================================================');
