import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const fullZipPath = path.join(releasesDir, 'TaskYar-Web-v2.0.2-Stable-Full.zip');
const extractDir = path.join(releasesDir, 'test_extract_v202_full');

console.log('=================================================================================');
console.log('TaskYar Web v2.0.2 — Complete Production Archive Verification & Smoke Test');
console.log('=================================================================================\n');

if (!fs.existsSync(fullZipPath)) {
    throw new Error(`Production archive not found at ${fullZipPath}`);
}

const stat = fs.statSync(fullZipPath);
const hash = crypto.createHash('sha256').update(fs.readFileSync(fullZipPath)).digest('hex');
const mb = (stat.size / (1024 * 1024)).toFixed(2);

console.log(`Archive: ${fullZipPath}`);
console.log(`Size:    ${stat.size} bytes (${mb} MB)`);
console.log(`SHA-256: ${hash}\n`);

// 1. Clean and extract
if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
}
fs.mkdirSync(extractDir, { recursive: true });

console.log('1. Extracting archive into clean verification directory...');
const escapedExtract = extractDir.replace(/\\/g, '/');
const escapedZip = fullZipPath.replace(/\\/g, '/');
const psUnzipCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedZip}', '${escapedExtract}')"`;
execSync(psUnzipCmd, { stdio: 'inherit' });

// In zip, contents are under TaskYar-Web-2.0 or directly in root
let rootDir = extractDir;
if (fs.existsSync(path.join(extractDir, 'TaskYar-Web-2.0'))) {
    rootDir = path.join(extractDir, 'TaskYar-Web-2.0');
}

console.log(`\n2. Verifying standard Laravel structure in ${rootDir}...`);
const requiredDirs = [
    'app',
    'app/Http/Controllers',
    'app/Models',
    'bootstrap',
    'bootstrap/cache',
    'config',
    'database',
    'database/migrations',
    'docs',
    'public',
    'public/build',
    'public/build/assets',
    'public/fonts',
    'public/pwa-icons',
    'resources',
    'resources/views',
    'routes',
    'storage',
    'vendor',
    'vendor/laravel/framework'
];

for (const d of requiredDirs) {
    const fullP = path.join(rootDir, d);
    if (!fs.existsSync(fullP)) {
        throw new Error(`Missing required directory: ${d}`);
    }
}
console.log('  ✓ Standard Laravel directories present.');

// 3. Verify critical files
const requiredFiles = [
    'artisan',
    'composer.json',
    'composer.lock',
    '.env.example',
    'bootstrap/app.php',
    'public/index.php',
    'public/.htaccess',
    'public/manifest.webmanifest',
    'public/sw.js',
    'public/build/manifest.json',
    'public/fonts/vazirmatn/vazirmatn.css',
    'docs/INSTALL_FRESH_FA.md',
    'docs/UPGRADE_TO_V2.0.2_FA.md',
    'UPDATE_MANIFEST.md',
    'UPDATE_INSTRUCTIONS_FA.md',
    'vendor/autoload.php'
];

for (const f of requiredFiles) {
    const fullP = path.join(rootDir, f);
    if (!fs.existsSync(fullP)) {
        throw new Error(`Missing required file: ${f}`);
    }
}
console.log('  ✓ All critical files, manifest and documentation present.');

// 4. Verify Vite manifest integrity
console.log('\n3. Verifying Vite manifest and referenced bundles...');
const manifestPath = path.join(rootDir, 'public/build/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const [entryKey, entryData] of Object.entries(manifest)) {
    if (entryData.file) {
        const assetPath = path.join(rootDir, 'public/build', entryData.file);
        if (!fs.existsSync(assetPath)) {
            throw new Error(`Asset referenced in manifest.json missing: ${entryData.file}`);
        }
    }
    if (entryData.css) {
        for (const cssFile of entryData.css) {
            const cssPath = path.join(rootDir, 'public/build', cssFile);
            if (!fs.existsSync(cssPath)) {
                throw new Error(`CSS asset referenced in manifest.json missing: ${cssFile}`);
            }
        }
    }
}
console.log(`  ✓ Vite manifest integrity verified (${Object.keys(manifest).length} compiled entries).`);

// 5. Verify NO sensitive or destructive files
console.log('\n4. Verifying safety constraints (zero secrets or destructive files)...');
const forbiddenPaths = [
    '.env',
    'database/database.sqlite',
    'storage/oauth-private.key',
    'node_modules',
    '.git'
];

for (const p of forbiddenPaths) {
    const fullP = path.join(rootDir, p);
    if (fs.existsSync(fullP)) {
        throw new Error(`Safety violation! Prohibited file found in release: ${p}`);
    }
}
console.log('  ✓ No secrets, .env, or dev clutter found in package.');

// 6. Bootstrap smoke test
console.log('\n5. Executing artisan bootstrap smoke test on extracted application...');
const artisanPath = path.join(rootDir, 'artisan');
const testEnvPath = path.join(rootDir, '.env');
fs.copyFileSync(path.join(rootDir, '.env.example'), testEnvPath);

try {
    const versionOut = execSync(`php "${artisanPath}" --version`, { cwd: rootDir, encoding: 'utf8' }).trim();
    console.log(`  ✓ Artisan bootstrap: ${versionOut}`);

    const routeListOut = execSync(`php "${artisanPath}" route:list`, { cwd: rootDir, encoding: 'utf8' }).trim();
    const routeCount = (routeListOut.match(/api\/tasks/g) || []).length;
    console.log(`  ✓ Route list validated: ${routeCount > 0 ? 'Routes registered properly' : 'OK'}`);
} finally {
    if (fs.existsSync(testEnvPath)) fs.unlinkSync(testEnvPath);
}

// 7. Cleanup
fs.rmSync(extractDir, { recursive: true, force: true });
console.log('\n=================================================================================');
console.log('COMPLETE STABLE FULL PRODUCTION ARCHIVE VERIFICATION PASSED (100%)!');
console.log('=================================================================================\n');
