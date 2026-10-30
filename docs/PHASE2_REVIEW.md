# TaskYar Web 2.0 — Phase 2 Architecture Review & Stabilization Report

**Review Date:** October 2026  
**Status:** In Progress / Stabilization  
**Scope:** Architecture, Multi-User Isolation, Database Integrity, UI Fidelity, JSON Compatibility, Offline Synchronization Readiness, and Shared Hosting Constraints.

---

## 1. Executive Review & System Status

During Phase 2, the initial foundation of TaskYar Web 2.0 was established using Laravel 13, Vue 3 Composition API, Pinia, Tailwind CSS, and local Vazirmatn font assets. The application successfully compiles and passes preliminary tests.

However, an exhaustive audit against the original desktop source code (`reference/taskyar-main/`) and web enterprise standards reveals critical architectural gaps, security vulnerabilities, and compatibility limitations that must be addressed before proceeding to Phase 3.

---

## 2. Detailed Findings & Gap Analysis

### 2.1. Implemented Features (Verified Working)
- **Framework & Runtime:** Laravel 13 on PHP 8.4 with SQLite (dev/test) and MySQL/MariaDB schema compatibility.
- **Session Authentication:** Basic registration, login, and logout flow using Laravel's session driver with CSRF token validation.
- **Initial Task Seeding:** Automatically seeds the two original desktop sample tasks for newly registered users.
- **Task CRUD API:** Scoped task and subtask endpoints for creating, listing, updating, and deleting records.
- **Self-Hosted Vazirmatn Font:** All font weights downloaded locally in `public/fonts/vazirmatn/fonts/webfonts/`, eliminating the CDN leak present in the original desktop app.
- **Web Audio API Chime:** Client-side oscillator synthesis replicating the task completion sound and alarm beeps without audio files.
- **"My Day" View Componentry:** Recreated sidebar, header, progress bar, task cards, add bar, detail drawer, datepicker, and modals using original styling tokens.

### 2.2. Critical Architectural & Security Deficiencies Found

#### A. Missing Laravel Policies & Explicit Authorization
- **Issue:** `TaskController` and `SubtaskController` relied on manual inline checks (`$task->user_id !== $request->user()->id`). While functional in tests, this pattern does not leverage Laravel's formal Policy system (`TaskPolicy`, `SubtaskPolicy`), risking authorization bypass if new controller actions or route bindings are added.
- **Correction:** Implement formal Laravel Policies and bind them via `Authorize` middleware / `$this->authorize()`.

#### B. Lack of Rate Limiting on Authentication Endpoints
- **Issue:** `/api/auth/register` and `/api/auth/login` did not enforce rate limiting (`throttle`), exposing the application to credential stuffing and brute-force registration on public hosting.
- **Correction:** Apply `throttle:10,1` (10 requests per minute) to public auth endpoints.

#### C. Inadequate Offline Sync Foundations in Database
- **Issue:** The `tasks` and `subtasks` tables lacked `client_uuid` and `revision` / optimistic locking columns. If offline PWA synchronization were introduced, mutations generated offline could not be uniquely referenced without server auto-increment IDs, and concurrent edits would risk silent data loss.
- **Correction:** Create a non-destructive corrective migration adding `client_uuid` (indexed) and `revision` (integer, default 1) to both `tasks` and `subtasks`.

#### D. Fragile Client-Side JSON Backup Import
- **Issue:** In `App.vue`, importing a backup was implemented by looping through imported items in the browser and sending individual HTTP `POST` requests sequentially. An import containing 100+ tasks would issue hundreds of requests, risking timeouts, rate-limit rejection, and partial database corruption if interrupted.
- **Correction:** Implement atomic server-side backup import (`POST /api/backup/import`) and export (`GET /api/backup/export`) with database transactions, strict schema validation, and 100% round-trip compatibility with Desktop v1.1.0 backups.

#### E. Obsolete Apache 2.2 Directives in Documentation
- **Issue:** `docs/SHARED_HOSTING.md` recommended `Order allow,deny / Deny from all`, which are obsolete in Apache 2.4 / LiteSpeed and can trigger `500 Internal Server Error` on modern shared hosting.
- **Correction:** Modernize `.htaccess` and documentation to use Apache 2.4 `Require all denied`.

#### F. Automated Dependency Check Missing
- **Issue:** No automated test existed to verify that compiled production assets and views are free of external CDN references (`cdn.jsdelivr.net`, Google Fonts, remote script/style tags).
- **Correction:** Implement `AssetDependencyTest` to scan build artifacts and Blade templates during automated testing.

---

## 3. Required Corrections Matrix

| Component | Identified Problem | Corrective Action | Status |
|---|---|---|---|
| **Security** | Auth endpoints vulnerable to brute-force | Apply `throttle:10,1` rate-limiting middleware | Pending |
| **Security** | Ad-hoc manual ownership checks | Implement `TaskPolicy` and `SubtaskPolicy` | Pending |
| **Database** | Missing UUID and revision tracking for sync | Create corrective migration for `client_uuid` & `revision` | Pending |
| **Backup / Data** | Client-loop import risks partial writes | Implement atomic `BackupController` with DB transactions | Pending |
| **Testing** | No JSON import/export compatibility tests | Add PHPUnit round-trip tests for Desktop v1.1.0 format | Pending |
| **Testing** | No automated asset CDN audit | Add `AssetDependencyTest` scanning `public/` and `resources/` | Pending |
| **Hosting** | Obsolete Apache 2.2 directives | Update `.htaccess` and `docs/SHARED_HOSTING.md` to Apache 2.4 | Pending |
| **Offline Architecture** | Undocumented sync protocol | Produce `docs/OFFLINE_SYNC_DESIGN.md` | Pending |

---

## 4. Conclusion & Next Steps

Phase 2 will be certified as stabilized and complete once the corrective plan is fully implemented and all automated tests demonstrate zero regressions.
