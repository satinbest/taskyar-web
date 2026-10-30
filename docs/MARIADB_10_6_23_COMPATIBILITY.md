# MariaDB 10.6.23 & MyISAM Default Engine Compatibility Report
# TaskYar Web 2.0 — Engineering Analysis & Resolution

This document details the architectural analysis and engineering fixes implemented to ensure that TaskYar Web 2.0 installs and operates flawlessly on DirectAdmin shared hosting powered by **MariaDB 10.6.23** where the server-wide default storage engine is configured as **MyISAM**.

---

## 1. Production Environment Specifications

- **Hosting Control Panel:** DirectAdmin
- **PHP CLI Executable:** `/usr/local/php-8.4/bin/php` (PHP 8.4)
- **Database Server:** MariaDB 10.6.23
- **Global Default Storage Engine:** `MyISAM` (`default_storage_engine=MyISAM`)
- **Database Host:** `localhost` (UNIX Domain Socket)
- **Database Name:** `fileruni_taskyar`
- **Application Charset/Collation:** `utf8mb4` / `utf8mb4_unicode_ci`
- **Hosting Access Constraints:** Standard unprivileged shared hosting (no root privileges, no server-wide my.cnf modifications permitted)

---

## 2. Technical Post-Mortem of Previous Failures

### 2.1. First Failure — MySQL/MariaDB Error 1071 (Key Length Limit)
**Observed Error:**
```text
SQLSTATE[42000]: 1071
Specified key was too long; max key length is 1000 bytes
SQL: create table `password_reset_tokens` (`email` varchar(255) not null, ...)
```

**Root Cause:**
1. Under `utf8mb4`, each character allocates up to 4 bytes ($255 \times 4 = 1020\text{ bytes}$).
2. When a table was created without an explicit engine declaration on a server with `default_storage_engine=MyISAM`, MariaDB allocated the table under the **MyISAM** engine.
3. MyISAM enforces a strict hard limit of **1000 bytes** per index entry.
4. Because $1020 > 1000$, table creation aborted immediately.

---

### 2.2. Second Failure — MySQL/MariaDB Error 1005 / Errno 150 (Foreign Key Failure)
**Observed Error:**
```text
0001_01_01_000000_create_users_table ........ DONE
0001_01_01_000001_create_cache_table ........ DONE
0001_01_01_000002_create_jobs_table ......... DONE
2026_10_26_000001_add_taskyar_columns_to_users_table ... DONE
2026_10_26_000002_create_tasks_table ........ FAIL

SQLSTATE[HY000]: General error: 1005
Can't create table `fileruni_taskyar`.`tasks`
(errno: 150 "Foreign key constraint is incorrectly formed")

ALTER TABLE `tasks`
ADD CONSTRAINT `tasks_user_id_foreign`
FOREIGN KEY (`user_id`)
REFERENCES `users` (`id`)
ON DELETE CASCADE
```

**Root Cause:**
1. In the first batch of migrations, `0001_01_01_000000_create_users_table` created the `users` table without specifying `$table->engine = 'InnoDB'`.
2. As a result, the `users` table was instantiated as a **MyISAM** table.
3. In migration `2026_10_26_000002_create_tasks_table`, Laravel defined a foreign key constraint:
   `FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE`
4. In MySQL and MariaDB, the **MyISAM engine does not support foreign key constraints or referential integrity**. Furthermore, an InnoDB table cannot create a foreign key referencing a MyISAM table.
5. MariaDB halted table creation with error 1005 / errno 150.

---

## 3. Engineering Solution: Dual-Layer InnoDB Enforcement

To permanently eliminate this vulnerability without requiring hosting administrators to alter global server settings, TaskYar Web 2.0 implements a dual-layer enforcement architecture:

### 3.1. Layer 1: Blueprint-Level Explicit Engine Declaration
Every table creation in `database/migrations` now explicitly sets:
```php
Schema::create('table_name', function (Blueprint $table) {
    $table->engine = 'InnoDB';
    // ...
});
```
According to Laravel's `MySqlGrammar::compileCreateEngine()`, setting `$blueprint->engine = 'InnoDB'` guarantees that `engine = InnoDB` is appended to the SQL `CREATE TABLE` statement regardless of server defaults.

### 3.2. Layer 2: Automatic In-Flight Conversion of Pre-Existing MyISAM Tables
For environments where migrations were previously interrupted and tables like `users` were left in MyISAM format, each migration now checks and automatically executes:
```php
if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'])) {
    if (Schema::hasTable('users')) {
        DB::statement('ALTER TABLE `users` ENGINE = InnoDB');
    }
}
```
This guarantees that pre-existing parent tables are converted to InnoDB before dependent child tables add foreign key constraints.

---

## 4. Verification Evidence on Real MariaDB with MyISAM Default

The fix was rigorously verified against a real MariaDB instance with `default_storage_engine=MyISAM` globally active.

### 4.1. Server Variable State
```sql
SHOW GLOBAL VARIABLES LIKE 'default_storage_engine';
+------------------------+--------+
| Variable_name          | Value  |
+------------------------+--------+
| default_storage_engine | MyISAM |
+------------------------+--------+
```

### 4.2. Verified Table Storage Engines (information_schema.tables)
Every single table was confirmed to be `InnoDB`:
```text
Table 'cache':                      Engine = InnoDB
Table 'cache_locks':                Engine = InnoDB
Table 'categories':                 Engine = InnoDB
Table 'failed_jobs':                Engine = InnoDB
Table 'job_batches':                Engine = InnoDB
Table 'jobs':                       Engine = InnoDB
Table 'migrations':                 Engine = InnoDB
Table 'password_reset_tokens':      Engine = InnoDB
Table 'sessions':                   Engine = InnoDB
Table 'subtasks':                   Engine = InnoDB
Table 'tags':                       Engine = InnoDB
Table 'tasks':                      Engine = InnoDB
Table 'task_recurrence_exceptions': Engine = InnoDB
Table 'task_tag':                   Engine = InnoDB
Table 'users':                      Engine = InnoDB
```

### 4.3. Verified Foreign Key Constraints (information_schema.KEY_COLUMN_USAGE)
All 11 foreign key constraints successfully formed in MariaDB:
1. `categories.user_id` -> `users.id` (`categories_user_id_foreign`)
2. `subtasks.task_id` -> `tasks.id` (`subtasks_task_id_foreign`)
3. `subtasks.user_id` -> `users.id` (`subtasks_user_id_foreign`)
4. `tags.user_id` -> `users.id` (`tags_user_id_foreign`)
5. `tasks.category_id` -> `categories.id` (`tasks_category_id_foreign`)
6. `tasks.recurrence_parent_id` -> `tasks.id` (`tasks_recurrence_parent_id_foreign`)
7. `tasks.user_id` -> `users.id` (`tasks_user_id_foreign`)
8. `task_recurrence_exceptions.task_id` -> `tasks.id` (`task_recurrence_exceptions_task_id_foreign`)
9. `task_recurrence_exceptions.user_id` -> `users.id` (`task_recurrence_exceptions_user_id_foreign`)
10. `task_tag.tag_id` -> `tags.id` (`task_tag_tag_id_foreign`)
11. `task_tag.task_id` -> `tasks.id` (`task_tag_task_id_foreign`)
