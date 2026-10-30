<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TaskyarDiagnoseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'taskyar:diagnose {--repair : Safely convert MyISAM tables to InnoDB and record completed migrations if schema is verified complete}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Diagnose database connectivity, default engine, table storage engines, index limits, foreign keys, and migration consistency for TaskYar Web 2.0';

    /**
     * Expected core tables in TaskYar Web 2.0.
     *
     * @var array<string>
     */
    protected array $expectedTables = [
        'users',
        'password_reset_tokens',
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'tasks',
        'subtasks',
        'categories',
        'tags',
        'task_tag',
        'task_recurrence_exceptions',
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->newLine();
        $this->info('================================================================');
        $this->info('TaskYar Web 2.0 — Production Database Diagnostic & Health Check');
        $this->info('================================================================');
        $this->newLine();

        // 1. Connection check
        $defaultConnection = config('database.default');
        $this->line("<comment>Connection:</comment>  {$defaultConnection}");

        try {
            $pdo = DB::connection()->getPdo();
            $driver = DB::connection()->getDriverName();
            $this->info("✓ Database connection successful! (Driver: {$driver})");
        } catch (\Throwable $e) {
            $this->error('✗ Connection failed: '.$e->getMessage());
            $this->warn('Tip: On DirectAdmin shared hosting, verify DB_HOST=localhost (not 127.0.0.1).');

            return Command::FAILURE;
        }

        // 2. Server details (if MySQL / MariaDB)
        $isMySql = in_array($driver, ['mysql', 'mariadb']);
        $defaultEngine = 'unknown';

        if ($isMySql) {
            try {
                $version = DB::selectOne('SELECT VERSION() as v')->v ?? 'Unknown';
                $dbName = DB::connection()->getDatabaseName();
                $charsetRes = DB::selectOne('SELECT default_character_set_name, default_collation_name FROM information_schema.SCHEMATA WHERE schema_name = ?', [$dbName]);
                $charset = $charsetRes->default_character_set_name ?? 'unknown';
                $collation = $charsetRes->default_collation_name ?? 'unknown';

                $engineVar = DB::selectOne("SHOW VARIABLES LIKE 'default_storage_engine'");
                $defaultEngine = $engineVar->Value ?? 'unknown';

                $this->line("<comment>Server Version:</comment> {$version}");
                $this->line("<comment>Database Name:</comment>  {$dbName}");
                $this->line("<comment>Default Engine:</comment> {$defaultEngine}");
                $this->line("<comment>Charset/Collate:</comment>{$charset} / {$collation}");

                if (strcasecmp($defaultEngine, 'InnoDB') !== 0) {
                    $this->warn("! Notice: Server default storage engine is '{$defaultEngine}'. All TaskYar tables MUST explicitly use InnoDB for foreign key support.");
                }

                if ($charset !== 'utf8mb4') {
                    $this->warn('Notice: Database default charset is not utf8mb4. Persian characters require utf8mb4.');
                }
            } catch (\Throwable $e) {
                $this->warn('Could not inspect MySQL metadata: '.$e->getMessage());
            }
        }

        // 3. Inspect table existence, row counts, and storage engines
        $this->newLine();
        $this->info('--- Table & Storage Engine Inspection ---');
        $existingTables = [];
        $missingTables = [];
        $myisamTables = [];
        $hasMigrationsTable = Schema::hasTable('migrations');
        $userCount = 0;
        $taskCount = 0;

        foreach ($this->expectedTables as $table) {
            if (Schema::hasTable($table)) {
                $count = DB::table($table)->count();
                $existingTables[$table] = $count;

                $engine = 'N/A';
                if ($isMySql) {
                    $engRes = DB::selectOne('SELECT engine FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [$table]);
                    $engine = $engRes->engine ?? 'unknown';
                    if (strcasecmp($engine, 'InnoDB') !== 0) {
                        $myisamTables[] = $table;
                    }
                }

                $engineStr = $isMySql ? " [Engine: {$engine}]" : '';
                if (in_array($table, $myisamTables)) {
                    $this->line("! Table <comment>{$table}</comment> exists ({$count} rows)<fg=yellow>{$engineStr} -> REQUIRES INNODB CONVERSION</>");
                } else {
                    $this->line("✓ Table <info>{$table}</info> exists ({$count} rows){$engineStr}");
                }

                if ($table === 'users') {
                    $userCount = $count;
                }
                if ($table === 'tasks') {
                    $taskCount = $count;
                }
            } else {
                $missingTables[] = $table;
                $this->line("✗ Table <fg=red>{$table}</fg=red> does not exist");
            }
        }

        // 4. Foreign key inspection (if MySQL/MariaDB)
        if ($isMySql && count($existingTables) > 0) {
            $this->newLine();
            $this->info('--- Foreign Key Constraints ---');
            $fks = DB::select('
                SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE table_schema = DATABASE()
                  AND referenced_table_name IS NOT NULL
                ORDER BY table_name, constraint_name
            ');

            if (empty($fks)) {
                $this->warn('✗ No foreign keys detected! This occurs if tables were created with MyISAM.');
            } else {
                $this->info('✓ '.count($fks).' Foreign Key constraints verified active in database:');
                foreach ($fks as $fk) {
                    $this->line("  - <info>{$fk->table_name}.{$fk->column_name}</info> -> {$fk->referenced_table_name}.{$fk->referenced_column_name}");
                }
            }
        }

        // 5. Migration tracking inspection
        $this->newLine();
        $this->info('--- Migration Records ---');
        $recordedMigrations = [];
        if ($hasMigrationsTable) {
            $recordedMigrations = DB::table('migrations')->pluck('migration')->toArray();
            $this->info('✓ Migrations table exists with '.count($recordedMigrations).' recorded migrations.');
        } else {
            $this->warn('✗ Migrations table does not exist.');
        }

        // 6. Scenario Detection
        $this->newLine();
        $this->info('================================================================');
        $this->info('DIAGNOSTIC SCENARIO ASSESSMENT');
        $this->info('================================================================');

        $totalExpected = count($this->expectedTables);
        $totalFound = count($existingTables);

        if (! empty($myisamTables)) {
            $this->error('CRITICAL COMPATIBILITY ISSUE: MyISAM Tables Detected!');
            $this->line('Tables using MyISAM: '.implode(', ', $myisamTables));
            $this->line('MyISAM does NOT support Foreign Keys and causes errno 150.');
            $this->line('Safe Recovery Path:');
            $this->comment('  Run: php artisan taskyar:diagnose --repair');
            $this->line('  Or run: php artisan migrate --force (which automatically alters them to InnoDB)');
        }

        if ($totalFound === 0 && ! $hasMigrationsTable) {
            // Scenario A
            $this->info('Scenario A: Completely Clean Database (Fresh Install)');
            $this->line('No TaskYar tables exist. The database is empty and ready.');
            $this->line('Recommended Action:');
            $this->comment('  php artisan migrate --force');
        } elseif ($totalFound < $totalExpected && $userCount === 0 && $taskCount === 0) {
            // Scenario B
            $this->warn('Scenario B: Partially Installed Database (Disposable / No User Data)');
            $this->line("Only {$totalFound} of {$totalExpected} tables exist, and there are 0 user and task records.");
            $this->line('This indicates an earlier migration run was interrupted or failed.');
            $this->line('Safe Recovery Path:');
            $this->comment('  The migrations have been made fully idempotent with explicit InnoDB.');
            $this->comment('  php artisan migrate --force');
            $this->line('Or if you wish to start from an entirely clean slate:');
            $this->comment('  php artisan migrate:fresh --force');
        } elseif ($totalFound === $totalExpected && count($missingTables) === 0 && empty($myisamTables)) {
            // All tables exist with InnoDB
            if ($userCount > 0 || $taskCount > 0) {
                // Scenario C
                $this->info('Scenario C: Healthy Production Database with Active Data (InnoDB)');
                $this->line("All {$totalExpected} tables exist in InnoDB with {$userCount} users and {$taskCount} tasks.");
                $this->line('Recommended Action:');
                $this->comment('  php artisan migrate --force (runs only pending migrations safely)');
                $this->warn('  NEVER run migrate:fresh or db:wipe on this database!');
            } else {
                $this->info('Database fully installed with InnoDB, currently empty (0 users).');
                $this->comment('  php artisan migrate --force');
            }
        } else {
            // Scenario D
            $this->error('Scenario D: Migration History Inconsistency Detected');
            $this->line("Existing tables: {$totalFound} of {$totalExpected}. User records: {$userCount}.");
            $this->line('Missing tables: '.implode(', ', $missingTables));
            $this->line('Safe Recovery Path:');
            $this->comment('  1. Back up your database via phpMyAdmin or mysqldump.');
            $this->comment('  2. Run: php artisan migrate --force');
            $this->comment('  3. If missing migration history prevents execution, run: php artisan taskyar:diagnose --repair');
        }

        // If --repair flag requested
        if ($this->option('repair')) {
            $this->newLine();
            $this->info('--- Performing Safe Database Repair ---');

            // Convert any MyISAM tables to InnoDB
            if ($isMySql && ! empty($myisamTables)) {
                $this->info('Converting MyISAM tables to InnoDB...');
                foreach ($myisamTables as $table) {
                    DB::statement("ALTER TABLE `{$table}` ENGINE = InnoDB");
                    $this->line("✓ Converted <info>{$table}</info> to InnoDB.");
                }
            }

            // Sync missing migration history if tables exist
            if ($totalFound === $totalExpected) {
                $allMigrationFiles = glob(database_path('migrations/*.php'));
                $batch = ($hasMigrationsTable && count($recordedMigrations) > 0)
                    ? (DB::table('migrations')->max('batch') ?? 1) + 1
                    : 1;

                if (! $hasMigrationsTable) {
                    $this->call('migrate:install');
                }

                $repaired = 0;
                foreach ($allMigrationFiles as $file) {
                    $migName = basename($file, '.php');
                    if (! in_array($migName, $recordedMigrations)) {
                        DB::table('migrations')->insert([
                            'migration' => $migName,
                            'batch' => $batch,
                        ]);
                        $this->line("✓ Synced migration entry: <info>{$migName}</info>");
                        $repaired++;
                    }
                }
                $this->info("Safe repair complete. {$repaired} missing migration records synced.");
            }
        }

        $this->newLine();

        return Command::SUCCESS;
    }
}
