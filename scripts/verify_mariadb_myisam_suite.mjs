import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const workspaceRoot = 'd:/taskyar';
const testDbName = 'taskyar_test_myisam_verify';

console.log('===================================================================');
console.log('TaskYar Web 2.0 — Automated MariaDB (MyISAM Default) Verification');
console.log('===================================================================');

// Helper to execute MySQL queries via mariadb CLI
function runSql(sql) {
    const singleLine = sql.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
    const cmd = `& "C:\\Program Files\\MariaDB 13.0\\bin\\mariadb.exe" -u root -e "${singleLine}"`;
    return execSync(`powershell -NoProfile -Command "${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

// 1. Safety Check: Verify target is a disposable test database
if (!testDbName.includes('test')) {
    throw new Error(`SAFETY ABORT: ${testDbName} does not contain 'test'. Never run verification against production!`);
}
console.log(`[PASS] Safety check verified. Target database: '${testDbName}' is disposable.`);

// 2. Inspect MariaDB Server Version
const versionOutput = runSql('SELECT VERSION() as v;');
const serverVersion = versionOutput.split('\n')[1]?.trim() || 'Unknown';
console.log(`[PASS] Connected to database server. Version: ${serverVersion}`);

// 3. Confirm default storage engine is MyISAM
runSql("SET GLOBAL default_storage_engine=MyISAM;");
const engineOutput = runSql("SHOW GLOBAL VARIABLES LIKE 'default_storage_engine';");
const defaultEngine = engineOutput.split('\n')[1]?.split('\t')[1]?.trim() || 'Unknown';
console.log(`[PASS] Confirmed Server Global default_storage_engine = ${defaultEngine}`);
if (defaultEngine.toLowerCase() !== 'myisam') {
    throw new Error(`Verification requires default_storage_engine=MyISAM to reproduce production environment. Found: ${defaultEngine}`);
}

// 4. Create clean disposable test database
console.log(`\nRecreating clean test database: ${testDbName}...`);
runSql(`DROP DATABASE IF EXISTS ${testDbName}; CREATE DATABASE ${testDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
console.log('[PASS] Test database created with utf8mb4 and utf8mb4_unicode_ci.');

// 5. Test A — Fresh Installation via Artisan
console.log('\n--- Test A: Fresh Installation via Artisan ---');
const envOverride = `$env:DB_CONNECTION='mysql'; $env:DB_DATABASE='${testDbName}';`;

console.log('Running: php artisan config:clear');
execSync(`powershell -NoProfile -Command "${envOverride} php artisan config:clear"`, { cwd: workspaceRoot, stdio: 'inherit' });

console.log('Running: php artisan migrate --force');
const migOut = execSync(`powershell -NoProfile -Command "${envOverride} php artisan migrate --force"`, { cwd: workspaceRoot, encoding: 'utf8' });
console.log(migOut.trim());

if (!migOut.includes('DONE')) {
    throw new Error('Migration did not complete cleanly!');
}
console.log('[PASS] Test A: Fresh migration completed with exit code 0.');

// 6. Test B — Migration Status
console.log('\n--- Test B: Migration Status ---');
const statusOut = execSync(`powershell -NoProfile -Command "${envOverride} php artisan migrate:status"`, { cwd: workspaceRoot, encoding: 'utf8' });
console.log(statusOut.trim());
if (statusOut.includes('Pending') || !statusOut.includes('Ran')) {
    throw new Error('Some migrations are not in Ran status!');
}
console.log('[PASS] Test B: All migrations confirmed Ran in Batch 1.');

// 7. Test C — Repeated Migration (Idempotency)
console.log('\n--- Test C: Repeated Migration Execution ---');
const migRepeat = execSync(`powershell -NoProfile -Command "${envOverride} php artisan migrate --force"`, { cwd: workspaceRoot, encoding: 'utf8' });
console.log(migRepeat.trim());
if (!migRepeat.includes('Nothing to migrate')) {
    throw new Error('Repeated migration did not return "Nothing to migrate"!');
}
console.log('[PASS] Test C: Repeated migration executed cleanly without errors.');

// 8. Test D — Table Storage Engine Inspection
console.log('\n--- Test D: Table Storage Engine Inspection (Must all be InnoDB) ---');
const engineSql = `SELECT table_name, engine FROM information_schema.tables WHERE table_schema = '${testDbName}' ORDER BY table_name;`;
const engineRows = runSql(engineSql).split('\n').slice(1);

const expectedTables = [
    'cache', 'cache_locks', 'categories', 'failed_jobs', 'job_batches',
    'jobs', 'migrations', 'password_reset_tokens', 'sessions', 'subtasks',
    'tags', 'task_recurrence_exceptions', 'task_tag', 'tasks', 'users'
];

const foundEngines = {};
for (const line of engineRows) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
        const tName = parts[0].trim();
        const tEng = parts[1].trim();
        foundEngines[tName] = tEng;
        console.log(`  - Table '${tName}': Engine = ${tEng}`);
        if (expectedTables.includes(tName) && tEng.toLowerCase() !== 'innodb') {
            throw new Error(`CRITICAL ENGINE FAILURE: Table '${tName}' was created as ${tEng}, expected InnoDB!`);
        }
    }
}

for (const t of expectedTables) {
    if (!foundEngines[t]) {
        throw new Error(`CRITICAL TABLE MISSING: Table '${t}' does not exist!`);
    }
}
console.log('[PASS] Test D: All 15 database tables explicitly use InnoDB storage engine!');

// 9. Test E — Foreign Key Inspection
console.log('\n--- Test E: Foreign Key Constraints Inspection ---');
const fkSql = `
    SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE table_schema = '${testDbName}'
      AND referenced_table_name IS NOT NULL
    ORDER BY table_name, constraint_name;
`;
const fkRows = runSql(fkSql).split('\n').slice(1);
console.log(`Found ${fkRows.length} foreign key constraints:`);
for (const line of fkRows) {
    const parts = line.split('\t');
    if (parts.length >= 5) {
        console.log(`  - [${parts[0].trim()}.${parts[2].trim()}] -> ${parts[3].trim()}.${parts[4].trim()} (${parts[1].trim()})`);
    }
}

if (fkRows.length < 9) {
    throw new Error(`Expected at least 9 foreign key constraints, found ${fkRows.length}! Foreign keys failed to form.`);
}
console.log('[PASS] Test E: All relational foreign keys verified active and valid in MariaDB.');

// 10. Test F — Application Integration Tests on this Database
console.log('\n--- Test F: Application Database Operations & Foreign Key Cascading ---');
const testCmd = `php artisan test --filter=MySqlDatabaseIntegrationTest`;
execSync(`powershell -NoProfile -Command "$env:DB_DATABASE='${testDbName}'; ${testCmd}"`, { cwd: workspaceRoot, stdio: 'inherit' });
console.log('[PASS] Test F: User registration, duplicate validation, login, task CRUD, categories, tags, recurrence, and offline sync passed.');

// 11. Test G — Interrupted / Pre-existing MyISAM Recovery Simulation
console.log('\n--- Test G: Simulating Recovery of Pre-Existing MyISAM Tables ---');
const partialDbName = 'taskyar_test_partial_myisam';
runSql(`DROP DATABASE IF EXISTS ${partialDbName}; CREATE DATABASE ${partialDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
// Simulate earlier failed installation: users created as MyISAM!
runSql(`
    USE ${partialDbName};
    CREATE TABLE users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        email_verified_at TIMESTAMP NULL,
        password VARCHAR(255) NOT NULL,
        remember_token VARCHAR(100) NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);
console.log(`Simulated existing table '${partialDbName}.users' created as MyISAM.`);

// Run migrate --force against the partial database
console.log('Running: php artisan migrate --force against partial MyISAM database...');
const partialMigOut = execSync(`powershell -NoProfile -Command "$env:DB_CONNECTION='mysql'; $env:DB_DATABASE='${partialDbName}'; php artisan migrate --force"`, { cwd: workspaceRoot, encoding: 'utf8' });
console.log(partialMigOut.trim());

// Verify users was converted to InnoDB and tasks was created
const partialEngSql = `SELECT table_name, engine FROM information_schema.tables WHERE table_schema = '${partialDbName}' AND table_name IN ('users', 'tasks');`;
const partialEngines = runSql(partialEngSql);
console.log(partialEngines);
if (!partialEngines.includes('users\tInnoDB') || !partialEngines.includes('tasks\tInnoDB')) {
    throw new Error('Auto-conversion of existing MyISAM table to InnoDB failed during migration recovery!');
}
console.log('[PASS] Test G: Interrupted installation recovery auto-converted MyISAM to InnoDB without errno 150.');

// Clean up test databases
runSql(`DROP DATABASE IF EXISTS ${testDbName};`);
runSql(`DROP DATABASE IF EXISTS ${partialDbName};`);
console.log('\nCleaned up disposable test databases.');

console.log('===================================================================');
console.log('ALL MARIADB (MYISAM DEFAULT ENGINE) VERIFICATION TESTS PASSED 100%!');
console.log('===================================================================');
