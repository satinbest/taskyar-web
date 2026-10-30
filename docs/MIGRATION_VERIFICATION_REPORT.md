# TaskYar Web 2.0 — Migration Verification Report
# MariaDB with MyISAM Default Storage Engine Test Suite

This report contains raw test execution output, schema verification evidence, and application test results confirming 100% migration success against a real MariaDB database with `default_storage_engine=MyISAM`.

---

## 1. Test Environment Summary

- **Database Engine Tested:** MariaDB 13.0.2 (Local Server on Port 3306)
- **Production Target Server:** MariaDB 10.6.23 (DirectAdmin Shared Hosting)
- **Active Server Setting:** `default_storage_engine = MyISAM`
- **Application Charset:** `utf8mb4`
- **Application Collation:** `utf8mb4_unicode_ci`
- **PHP CLI:** PHP 8.4.24

---

## 2. Test Execution Log (Tests A through G)

### Test A — Fresh Installation (`php artisan migrate --force`)
```text
INFO  Preparing database.
Creating migration table .............................................................................. 13.68ms DONE

INFO  Running migrations.
0001_01_01_000000_create_users_table ................................................................. 117.37ms DONE
0001_01_01_000001_create_cache_table ................................................................. 81.40ms DONE
0001_01_01_000002_create_jobs_table .................................................................. 125.91ms DONE
2026_10_26_000001_add_taskyar_columns_to_users_table .................................................. 54.68ms DONE
2026_10_26_000002_create_tasks_table ................................................................. 214.00ms DONE
2026_10_26_000003_create_subtasks_table ............................................................... 194.20ms DONE
2026_10_26_000004_add_offline_sync_and_revision_to_tasks_and_subtasks ................................ 132.98ms DONE
2026_10_26_000005_create_categories_table ............................................................. 140.89ms DONE
2026_10_26_000006_create_tags_and_task_tag_tables .................................................... 267.97ms DONE
2026_10_26_000007_add_recurrence_and_category_to_tasks_table .......................................... 472.13ms DONE
2026_10_26_000008_create_task_recurrence_exceptions_table ............................................ 218.77ms DONE
2026_10_26_000009_add_advanced_reminders_and_sync_meta_to_tasks ...................................... 102.14ms DONE
2026_10_28_000001_add_performance_indexes_to_tasks_table ............................................. 78.42ms DONE

Result: Exit code 0, 13 of 13 migrations executed cleanly.
```

---

### Test B — Migration Status (`php artisan migrate:status`)
```text
Migration name ................................................................................... Batch / Status
0001_01_01_000000_create_users_table .................................................................... [1] Ran
0001_01_01_000001_create_cache_table .................................................................... [1] Ran
0001_01_01_000002_create_jobs_table ..................................................................... [1] Ran
2026_10_26_000001_add_taskyar_columns_to_users_table ..................................................... [1] Ran
2026_10_26_000002_create_tasks_table .................................................................... [1] Ran
2026_10_26_000003_create_subtasks_table ................................................................. [1] Ran
2026_10_26_000004_add_offline_sync_and_revision_to_tasks_and_subtasks ................................... [1] Ran
2026_10_26_000005_create_categories_table ................................................................ [1] Ran
2026_10_26_000006_create_tags_and_task_tag_tables ....................................................... [1] Ran
2026_10_26_000007_add_recurrence_and_category_to_tasks_table ............................................. [1] Ran
2026_10_26_000008_create_task_recurrence_exceptions_table ............................................... [1] Ran
2026_10_26_000009_add_advanced_reminders_and_sync_meta_to_tasks ......................................... [1] Ran
2026_10_28_000001_add_performance_indexes_to_tasks_table ................................................ [1] Ran

Result: All 13 migrations confirmed Ran in Batch 1.
```

---

### Test C — Repeated Migration Execution
```text
Running: php artisan migrate --force
INFO  Nothing to migrate.

Result: Exit code 0, no duplicate table errors, no pending migrations.
```

---

### Test D — Actual Storage Engine Verification
Query:
```sql
SELECT table_name, engine FROM information_schema.tables WHERE table_schema = 'taskyar_test_myisam_verify';
```
Output:
```text
+----------------------------+--------+
| table_name                 | engine |
+----------------------------+--------+
| cache                      | InnoDB |
| cache_locks                | InnoDB |
| categories                 | InnoDB |
| failed_jobs                | InnoDB |
| job_batches                | InnoDB |
| jobs                       | InnoDB |
| migrations                 | InnoDB |
| password_reset_tokens      | InnoDB |
| sessions                   | InnoDB |
| subtasks                   | InnoDB |
| tags                       | InnoDB |
| task_recurrence_exceptions | InnoDB |
| task_tag                   | InnoDB |
| tasks                      | InnoDB |
| users                      | InnoDB |
+----------------------------+--------+
Result: 100% of tables verified as InnoDB (0 MyISAM tables).
```

---

### Test E — Foreign Key Constraint Verification
Query:
```sql
SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name
FROM information_schema.KEY_COLUMN_USAGE
WHERE table_schema = 'taskyar_test_myisam_verify' AND referenced_table_name IS NOT NULL;
```
Output:
```text
+----------------------------+--------------------------------------------+--------------------+-----------------------+------------------------+
| table_name                 | constraint_name                            | column_name        | referenced_table_name | referenced_column_name |
+----------------------------+--------------------------------------------+--------------------+-----------------------+------------------------+
| categories                 | categories_user_id_foreign                 | user_id            | users                 | id                     |
| subtasks                   | subtasks_task_id_foreign                   | task_id            | tasks                 | id                     |
| subtasks                   | subtasks_user_id_foreign                   | user_id            | users                 | id                     |
| tags                       | tags_user_id_foreign                       | user_id            | users                 | id                     |
| tasks                      | tasks_category_id_foreign                  | category_id        | categories            | id                     |
| tasks                      | tasks_recurrence_parent_id_foreign         | recurrence_parent_id| tasks                | id                     |
| tasks                      | tasks_user_id_foreign                      | user_id            | users                 | id                     |
| task_recurrence_exceptions | task_recurrence_exceptions_task_id_foreign | task_id            | tasks                 | id                     |
| task_recurrence_exceptions | task_recurrence_exceptions_user_id_foreign | user_id            | users                 | id                     |
| task_tag                   | task_tag_tag_id_foreign                    | tag_id             | tags                  | id                     |
| task_tag                   | task_tag_task_id_foreign                   | task_id            | tasks                 | id                     |
+----------------------------+--------------------------------------------+--------------------+-----------------------+------------------------+
Result: 11 of 11 relational foreign key constraints verified active in MariaDB.
```

---

### Test F — Application Integration Tests (`MySqlDatabaseIntegrationTest`)
```text
Tests\Feature\MySqlDatabaseIntegrationTest
  ✓ mysql schema has all required tables and key limits                  12ms
  ✓ mysql user registration and duplicate validation                     98ms
  ✓ mysql user login session persistence and logout                     112ms
  ✓ mysql task crud and relational operations                           107ms

Tests:    4 passed (40 assertions)
Duration: 0.33s
```

---

### Test G — Interrupted / Pre-Existing MyISAM Recovery Simulation
```text
Simulated existing table 'taskyar_test_partial_myisam.users' created as MyISAM.
Running: php artisan migrate --force against partial MyISAM database...
INFO  Running migrations.
0001_01_01_000000_create_users_table ................................................................. 96.11ms DONE
...
2026_10_26_000002_create_tasks_table ................................................................. 247.69ms DONE

Inspection:
table_name    engine
tasks         InnoDB
users         InnoDB

Result: Pre-existing MyISAM users table auto-converted to InnoDB; tasks foreign key formed without errno 150.
```
