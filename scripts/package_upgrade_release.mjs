import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const releasesDir = path.join(workspaceRoot, 'releases');
const stagingDir = path.join(releasesDir, 'staging_upgrade');
const upgradeZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-Mobile-Refinement-Upgrade.zip');
const tmpZipOutput = path.join(releasesDir, 'TaskYar-Web-2.0-Mobile-Refinement-Upgrade.tmp.zip');
const testExtractDir = path.join(releasesDir, 'test_extract_upgrade');

console.log('=================================================================================');
console.log('TaskYar Web 2.0 — Packaging Safe In-Place Upgrade Archive');
console.log('=================================================================================\n');

// 1. Build frontend assets
console.log('1. Building production frontend assets with Vite...');
execSync('npm run build', { cwd: workspaceRoot, stdio: 'inherit' });

// 2. Prepare clean staging directory
if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 3. Helper to copy with directory creation
function copyFile(relPath) {
    const src = path.join(workspaceRoot, relPath);
    const dest = path.join(stagingDir, relPath);
    if (!fs.existsSync(src)) {
        throw new Error(`Source file missing: ${src}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(` + Copied: ${relPath}`);
}

function copyDirectory(relPath) {
    const src = path.join(workspaceRoot, relPath);
    const dest = path.join(stagingDir, relPath);
    if (!fs.existsSync(src)) {
        throw new Error(`Source directory missing: ${src}`);
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
        const itemSrc = path.join(src, item);
        const itemDest = path.join(dest, item);
        const stat = fs.statSync(itemSrc);
        if (stat.isDirectory()) {
            copyDirectory(path.join(relPath, item));
        } else {
            fs.copyFileSync(itemSrc, itemDest);
        }
    }
    console.log(` + Copied directory: ${relPath}`);
}

// 4. Copy updated files
console.log('\n2. Populating upgrade staging directory...');

// Backend controller
copyFile('app/Http/Controllers/CategoryController.php');

// Compiled assets & service worker
copyDirectory('public/build');
copyFile('public/sw.js');

// Styles & Vue components
copyFile('resources/css/taskyar.css');
copyFile('resources/js/components/MainHeader.vue');
copyFile('resources/js/components/AddTaskBar.vue');
copyFile('resources/js/components/PersianTimePicker.vue');
copyFile('resources/js/components/CategoryModal.vue');
copyFile('resources/js/components/ProgressBar.vue');
copyFile('resources/js/components/Sidebar.vue');
copyFile('resources/js/components/TaskCard.vue');
copyFile('resources/js/components/AlarmModal.vue');
copyFile('resources/js/components/ConflictResolutionModal.vue');

// Documentation & Changelog
copyFile('CHANGELOG.md');
copyFile('docs/UPGRADE_EXISTING_INSTALLATION_FA.md');

// 5. Create ZIP Archive
console.log(`\n3. Creating ZIP archive: ${upgradeZipOutput}...`);
if (fs.existsSync(tmpZipOutput)) fs.unlinkSync(tmpZipOutput);
if (fs.existsSync(upgradeZipOutput)) fs.unlinkSync(upgradeZipOutput);

const escapedStaging = stagingDir.replace(/\\/g, '/');
const escapedZip = tmpZipOutput.replace(/\\/g, '/');

const psZipCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${escapedStaging}', '${escapedZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(psZipCmd, { stdio: 'inherit' });

fs.renameSync(tmpZipOutput, upgradeZipOutput);
fs.rmSync(stagingDir, { recursive: true, force: true });

// 6. Test extraction and verify integrity
console.log('\n4. Verifying archive integrity by extracting to test directory...');
if (fs.existsSync(testExtractDir)) fs.rmSync(testExtractDir, { recursive: true, force: true });
fs.mkdirSync(testExtractDir, { recursive: true });

const escapedExtract = testExtractDir.replace(/\\/g, '/');
const escapedFinalZip = upgradeZipOutput.replace(/\\/g, '/');
const psUnzipCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFinalZip}', '${escapedExtract}')"`;
execSync(psUnzipCmd, { stdio: 'inherit' });

// Verify critical files in extracted archive
const criticalFiles = [
    'app/Http/Controllers/CategoryController.php',
    'public/build/manifest.json',
    'public/sw.js',
    'resources/css/taskyar.css',
    'resources/js/components/MainHeader.vue',
    'resources/js/components/AddTaskBar.vue',
    'resources/js/components/PersianTimePicker.vue',
    'resources/js/components/CategoryModal.vue',
    'CHANGELOG.md',
    'docs/UPGRADE_EXISTING_INSTALLATION_FA.md'
];

for (const f of criticalFiles) {
    const fullP = path.join(testExtractDir, f);
    if (!fs.existsSync(fullP)) {
        throw new Error(`Extraction verification failed! Missing file: ${f}`);
    }
}

// Ensure NO sensitive or destructive files are in the zip
const forbiddenFiles = ['.env', 'vendor', 'node_modules', 'database.sqlite'];
for (const f of forbiddenFiles) {
    const fullP = path.join(testExtractDir, f);
    if (fs.existsSync(fullP)) {
        throw new Error(`Safety violation! Upgrade ZIP contains prohibited file/folder: ${f}`);
    }
}

console.log('Archive extraction and safety verification PASSED!');
fs.rmSync(testExtractDir, { recursive: true, force: true });

// 7. Calculate SHA256
const stat = fs.statSync(upgradeZipOutput);
const hash = crypto.createHash('sha256').update(fs.readFileSync(upgradeZipOutput)).digest('hex');
const mb = (stat.size / (1024 * 1024)).toFixed(2);
const kb = (stat.size / 1024).toFixed(1);

console.log('\n=================================================================================');
console.log('UPGRADE PACKAGE READY!');
console.log(`Path:    ${upgradeZipOutput}`);
console.log(`Size:    ${stat.size} bytes (${kb} KB / ${mb} MB)`);
console.log(`SHA-256: ${hash}`);
console.log('=================================================================================\n');

// 8. Update SHA256SUMS.txt
let existingSums = '';
const sumsPath = path.join(releasesDir, 'SHA256SUMS.txt');
if (fs.existsSync(sumsPath)) {
    existingSums = fs.readFileSync(sumsPath, 'utf8').trim() + '\n';
}

// Filter out old upgrade entry if present
const lines = existingSums.split('\n').filter(l => l.trim() && !l.includes('TaskYar-Web-2.0-Mobile-Refinement-Upgrade.zip'));
lines.push(`${hash}  TaskYar-Web-2.0-Mobile-Refinement-Upgrade.zip`);
fs.writeFileSync(sumsPath, lines.join('\n') + '\n', 'utf8');

console.log('Updated releases/SHA256SUMS.txt successfully.');
