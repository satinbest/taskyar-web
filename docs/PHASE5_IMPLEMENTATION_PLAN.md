# TaskYar Web 2.0 — Phase 5: Implementation Plan
**Iconsax Design Standard, PWA, Account-Scoped Offline Sync & Advanced Reminders**

**Date:** October 2026  
**Auditor / Architect:** Senior Full-Stack Engineer  
**Status:** In Progress — Stage 0 Baseline Established  

---

## 1. Baseline Verification & Phase 4 Audit (Stage 0)

Before commencing Phase 5 architecture, the Phase 4 baseline was verified:
- **Backend PHPUnit:** 36 tests, 316 assertions, 100% passing.
- **Jalali Unit Suite:** 8 tests covering calendar math, digit conversions, and `formatCreationDate`.
- **Persian NLP Quick Parser Suite:** 7 tests covering relative dates, weekdays, 24h times, recurrence, and hashtags.
- **Browser E2E Tests:**
  - `drawer_time_picker_test.js`: 22/22 checks passing.
  - `persian_date_and_rtl_nav_test.js`: 35/35 checks passing.
  - `phase3_smoke_test.js`: 18/18 checks passing.
  - `phase4_features_test.js`: NLP preview, category/tags, week board recurrence expansion, analytics dashboard, mobile responsiveness, and developer attribution all passing.
- **Production Asset Build:** Vite production build compiles in ~700ms with zero errors.
- **Developer Info:** About modal confirms حسین محمدپور (`info@hosseinmohammadpour.ir`).

---

## 2. Phase 5 Architecture & Stage Breakdown

```
Phase 5 Architecture
├── Stage 1: Iconsax Design Standard
│   ├── Package: iconsax (free locally bundled icons, zero external network requests)
│   ├── Vue Configuration: compilerOptions.isCustomElement = (tag) => tag === 'iconsax-icon'
│   ├── Wrapper: resources/js/components/AppIcon.vue
│   │   ├── Props: name, type ('linear' | 'bulk'), size, color, flipRtl, label
│   │   ├── Optimization: Precompiled in-memory SVG dictionary for zero-latency offline rendering
│   │   └── Fallback: <iconsax-icon> web component
│   └── System Audit: Replace all interface icons across 20+ components & views
│
├── Stage 2: Installable Progressive Web App (PWA)
│   ├── Manifest: public/manifest.webmanifest (name, short_name, theme_color, standalone, RTL dir)
│   ├── Assets: public/icons/icon-192x192.png, icon-512x512.png, maskable
│   ├── Service Worker: public/sw.js (cache-first for static shell & assets, network-first for API)
│   ├── Cache Versioning: Automatic cache eviction on new versions, update-available UI banner
│   └── Shared Hosting Compatibility: Zero Node daemon, static file serving
│
├── Stage 3: Account-Scoped Offline Storage (IndexedDB)
│   ├── Engine: resources/js/utils/offlineDb.js (native IndexedDB wrapper)
│   ├── Namespace: TaskYarDB_{userId} (strict multi-user isolation on logout/switch)
│   ├── Object Stores:
│   │   ├── tasks, subtasks, categories, tags, recurrence_exceptions
│   │   └── pending_mutations, sync_meta
│   ├── Offline Operations: Create, edit, complete, delete, tag, and categorize while offline
│   └── UI State: Live Online/Offline indicator and pending sync badge in MainHeader
│
├── Stage 4: Reliable Offline Synchronization
│   ├── Protocol: Bounded mutation queue with client_uuid, idempotency keys, and revision checking
│   ├── Server Endpoint: POST /api/sync (batch atomic processing within DB::transaction)
│   ├── Conflict Handling: HTTP 409 Conflict detection
│   ├── Conflict UI: ConflictResolutionModal.vue (Keep Local, Keep Server, Review Differences)
│   └── Reconnection: Automatic sync attempt on 'online' event + manual "همگام‌سازی" button
│
├── Stage 5: Advanced Reminders
│   ├── Offsets: Configurable reminder offsets (at due time, 5m, 15m, 30m, 1h, 1d before)
│   ├── Snooze Options: 5m, 10m, 15m, 1h snooze directly from in-app alarm and notifications
│   ├── Recurring Reminders: Automatic calculation of next reminder for recurring series
│   ├── Notification Permission: Web Notifications API integration with graceful fallback to in-app audio/modal
│   └── Deduplication: Unique notification tags and reminder_triggered timestamp tracking
│
├── Stage 6: Dark Mode & Theme Refinement
│   ├── Theme Modes: Light, Dark, System Preference
│   ├── Preserved Themes: Purple (default), Ocean, Sunset, Emerald + Dark variants
│   ├── Tokens: Centralized CSS variables for surfaces, text, borders, glassmorphism in Dark Mode
│   └── Contrast: Accessible contrast ratios and theme-aware Iconsax colors
│
├── Stage 7: Security, Performance & Shared Hosting Audit
│   ├── Multi-user IndexedDB separation
│   ├── CSRF token freshness on reconnect
│   ├── Migration: Add reminder offset and snooze columns
│   └── Zero permanent background daemons (compatible with cPanel/DirectAdmin)
│
└── Stage 8: Verification & Evidence
    ├── Unit, feature, and Puppeteer browser E2E tests
    └── Comprehensive documentation suite
```

---

## 3. Database Migration Design (Non-Destructive)

A new migration `2026_10_26_000009_add_advanced_reminders_and_sync_meta_to_tasks.php` adds:
- `reminder_offset_minutes`: `integer` nullable (default `0` = at due time; negative values for before due time, e.g., `-15` for 15 minutes before).
- `snooze_until`: `timestamp` nullable.
- `last_synced_at`: `timestamp` nullable.
- `sync_status`: `string(20)` default `'synced'`.

---

## 4. IndexedDB Schema Specification

- Database Name: `TaskYarDB_{userId}` (Version 1)
- Stores:
  1. `tasks`: KeyPath `id`, Index on `dueDate`, `completed`, `client_uuid`, `period`
  2. `categories`: KeyPath `id`
  3. `tags`: KeyPath `id`
  4. `recurrence_exceptions`: KeyPath `[task_id, occurrence_date]`
  5. `pending_mutations`: KeyPath `mutation_id`, Index on `created_at`, `client_uuid`
  6. `sync_meta`: KeyPath `key`

---

## 5. Verification & Safety Constraints

1. **Iconsax Exclusivity:** All icons across every view must render through `AppIcon.vue` using genuine Iconsax linear or bulk variants.
2. **Zero Remote Dependencies:** Icons, manifest, service worker, fonts, and scripts must load 100% locally.
3. **Multi-User Isolation:** On logout, the IndexedDB connection for that user is closed; cached tasks from User 1 must never be visible to User 2.
4. **No Silent Data Loss:** Conflict resolution modal prompts the user whenever the server revision differs from the local base revision.
