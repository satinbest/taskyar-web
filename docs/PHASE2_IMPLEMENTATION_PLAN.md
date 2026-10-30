# TaskYar Web 2.0 — Phase 2 Stabilization Implementation Plan

## Objective
Execute surgical corrections to stabilize the Phase 2 foundation, resolve architectural and security vulnerabilities, introduce non-destructive database revisions for future offline sync, provide server-side atomic JSON backup routines with 100% round-trip desktop fidelity, and establish automated security and asset-integrity test suites.

---

## Action Items & Execution Schedule

### 1. Database Schema Stabilization
- [ ] Create non-destructive corrective migration: `2026_10_26_000004_add_offline_sync_and_revision_to_tasks_and_subtasks.php`.
- [ ] Add `client_uuid` (VARCHAR 36, nullable, indexed) to `tasks` and `subtasks`.
- [ ] Add `revision` (UNSIGNED INTEGER, default 1) to `tasks` and `subtasks`.
- [ ] Update [Task](file:///d:/taskyar/app/Models/Task.php) and [Subtask](file:///d:/taskyar/app/Models/Subtask.php) fillables, casts, and revision incrementing hooks.
- [ ] Run `php artisan migrate --force`.

### 2. Multi-User Security & Authorization
- [ ] Create [TaskPolicy](file:///d:/taskyar/app/Policies/TaskPolicy.php) enforcing `viewAny`, `view`, `create`, `update`, `delete`.
- [ ] Create [SubtaskPolicy](file:///d:/taskyar/app/Policies/SubtaskPolicy.php) verifying user ownership of both the subtask and parent task.
- [ ] Refactor [TaskController](file:///d:/taskyar/app/Http/Controllers/TaskController.php) and [SubtaskController](file:///d:/taskyar/app/Http/Controllers/SubtaskController.php) to use `Gate::authorize()` or `$this->authorize()`.
- [ ] Apply `throttle:10,1` middleware to `/api/auth/register` and `/api/auth/login` in `routes/web.php`.

### 3. Server-Side Atomic JSON Backup Engine
- [ ] Create [BackupController](file:///d:/taskyar/app/Http/Controllers/BackupController.php):
  - `GET /api/backup/export`: Serializes all tasks for the authenticated user into the exact JSON array expected by TaskYar Desktop v1.1.0 (`id`, `title`, `period`, `dueDate`, `dueTime`, `alarmEnabled`, `alarmTriggered`, `completed`, `important`, `myDay`, `notes`, `subtasks`, `createdAt`).
  - `POST /api/backup/import`: Accepts JSON payload/file, validates task items, runs inside an atomic `DB::transaction`, associating all records with `auth()->id()`.
- [ ] Update `Sidebar.vue` / `App.vue` to use the atomic server-side backup endpoints instead of the brittle client-side loop.

### 4. Offline Synchronization Architecture Specification
- [ ] Write [docs/OFFLINE_SYNC_DESIGN.md](file:///d:/taskyar/docs/OFFLINE_SYNC_DESIGN.md) covering:
  - Client-generated UUIDs.
  - Idempotent mutation protocol.
  - Revision increments and HTTP 409 conflict detection.
  - Per-account IndexedDB isolation.
  - Sensitive data eviction on logout.

### 5. Shared Hosting Hardening
- [ ] Update `public/.htaccess` with modern Apache 2.4 / LiteSpeed directives (`Require all denied`).
- [ ] Update `docs/SHARED_HOSTING.md` with tested deployment instructions.

### 6. Automated Testing & Verification
- [ ] Write `tests/Feature/BackupCompatibilityTest.php`:
  - Test export format against Desktop v1.1.0 JSON specification.
  - Test importing a real desktop v1.1.0 backup file into a user's account.
  - Test that User A importing a backup does not overwrite User B's data.
  - Test rejection of malformed backup files.
- [ ] Write `tests/Feature/AssetDependencyTest.php`:
  - Scans `public/build/`, `public/fonts/`, `resources/views/`, and `resources/js/` to assert zero external CDN URLs (`jsdelivr`, `googleapis`, `gstatic`, `unpkg`, `cdnjs`).
- [ ] Run PHP syntax checks across all modified PHP files (`php -l`).
- [ ] Recompile frontend via `npm run build`.
- [ ] Run complete PHPUnit test suite: `php artisan test --testdox`.

### 7. Documentation Synchronization
- [ ] Update all six Phase 1 documents and `docs/IMPLEMENTATION_LOG.md` to reflect actual verified state.
