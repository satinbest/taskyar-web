# TaskYar Web 2.0 — Phase 4: Advanced Task Management Implementation Plan

**Date:** October 2026  
**Auditor / Architect:** Senior Full-Stack Engineer  
**Status:** In Progress — Phase 4 Foundation  

---

## 1. Baseline Verification & Phase 3 Audit (Stage 0)

Before modifying the application, all previous deliverables and Phase 3 polish items were verified:
- **Backend PHPUnit:** 22 tests, 230 assertions, 100% passing.
- **Jalali Unit Suite:** 8 tests covering calendar math, digit conversions, and `formatCreationDate`.
- **Browser E2E Tests:**
  - `drawer_time_picker_test.js`: 22/22 checks passing.
  - `persian_date_and_rtl_nav_test.js`: 35/35 checks passing.
- **Production Asset Build:** Vite production build compiles in ~410ms with zero errors.
- **Developer Info:** About modal confirms حسین محمدپور (`info@hosseinmohammadpour.ir`).
- **Creation Date & RTL Navigation:** Confirmed fully resolved in previous turn.

---

## 2. Stage Breakdown & Architecture

```
Phase 4 Architecture
├── Stage 1: Recurring Tasks Engine
│   ├── Migration: recurrence fields on tasks & task_recurrence_exceptions table
│   ├── Backend: RecurrenceService, occurrence expansion, exception handlers
│   ├── Frontend: RecurrenceModal, occurrence actions (this, future, series, skip)
│   └── Jalali Calendar: Month length & leap year clamping (Esfand 30 rules)
├── Stage 2: Categories & Tags System
│   ├── Migration: categories, tags, task_tag pivot tables
│   ├── Backend: CategoryController, TagController, user-scoped CRUD & policies
│   ├── Frontend: CategoryManagerModal, TagChips, category & tag filter bars
│   └── Safety: Category deletion with SET NULL on tasks (no task loss)
├── Stage 3: Offline Persian Natural-Language Quick Entry
│   ├── Engine: Deterministic rule-based parser in resources/js/utils/quickParser.js
│   ├── Persian NLP: Relative dates, weekdays, 24h times, recurrence, hashtags
│   ├── UI: Interactive interpretation preview banner in AddTaskBar with chip overrides
│   └── Unit Tests: Comprehensive test matrix for NLP patterns and edge cases
├── Stage 4: Personal Analytics Dashboard
│   ├── Route: /analytics ("آمار و پیشرفت") in Sidebar
│   ├── Backend: AnalyticsController with fast user-scoped aggregation queries
│   ├── Frontend: AnalyticsView.vue with lightweight zero-CDN responsive SVG charts
│   └── Metrics: Completion rates, weekly/monthly trends, category distribution
├── Stage 5: UX & Component Integration
│   ├── AddTaskBar & DetailDrawer: Recurrence picker, category selector, tag input
│   ├── Boards: Category tags & recurrence glyphs on TaskCards and MiniCards
│   ├── Theme Support: All 4 themes (Purple, Ocean, Sunset, Emerald) + Dark Mode
│   └── Mobile: 100% responsive down to 375px width
├── Stage 6: Backup & Data Compatibility
│   ├── Desktop v1.1.0 compatibility preserved
│   ├── Web v1 backup format preserved
│   ├── Version 2 schema: includes categories, tags, recurrence, exceptions
│   └── Atomic imports with user-scoping and collision prevention
├── Stage 7: Security & Performance Audit
│   ├── Ownership checks across categories, tags, recurrence exceptions
│   └── Query performance, indexes, and expansion limits
└── Stage 8: Automated & Browser Testing + Documentation
    ├── Unit, feature, and E2E browser tests
    └── Complete Phase 4 technical documentation suite
```

---

## 3. Detailed Data Models

### 3.1. Recurrence
- `tasks`:
  - `recurrence_pattern`: `enum('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')`
  - `recurrence_interval`: `unsignedInteger` (default 1)
  - `recurrence_weekdays`: `json` nullable (array of Jalali weekdays `0` to `6`)
  - `recurrence_month_day`: `unsignedTinyInteger` nullable (Jalali day 1–31)
  - `recurrence_end_date`: `date` nullable
  - `recurrence_count`: `unsignedInteger` nullable
  - `recurrence_parent_id`: `foreignId` nullable references `tasks(id)` ON DELETE CASCADE
  - `recurrence_original_date`: `date` nullable
  - `is_recurrence_exception`: `boolean` (default false)
- `task_recurrence_exceptions`:
  - `id`: primary key
  - `task_id`: `foreignId` references `tasks(id)` ON DELETE CASCADE
  - `user_id`: `foreignId` references `users(id)` ON DELETE CASCADE
  - `occurrence_date`: `date`
  - `action`: `enum('completed', 'skipped', 'rescheduled')`
  - `completed_at`: `timestamp` nullable
  - Unique constraint: `[task_id, occurrence_date]`

### 3.2. Categories
- `categories`:
  - `id`: primary key
  - `user_id`: `foreignId` references `users(id)` ON DELETE CASCADE
  - `name`: `string(100)`
  - `color`: `string(30)` nullable (default `#6D28D9`)
  - `order_index`: `integer` (default 0)
  - Unique constraint: `[user_id, name]`
- `tasks.category_id`: `foreignId` nullable references `categories(id)` ON DELETE SET NULL

### 3.3. Tags
- `tags`:
  - `id`: primary key
  - `user_id`: `foreignId` references `users(id)` ON DELETE CASCADE
  - `name`: `string(50)`
  - `color`: `string(30)` nullable
  - Unique constraint: `[user_id, name]`
- `task_tag`:
  - `task_id`: `foreignId` references `tasks(id)` ON DELETE CASCADE
  - `tag_id`: `foreignId` references `tags(id)` ON DELETE CASCADE
  - Primary key: `[task_id, tag_id]`

---

## 4. Verification & Safety Constraints

1. Shared hosting compatibility: zero persistent daemons or background queue dependencies.
2. Non-destructive migrations: all columns added as nullable or with safe defaults.
3. Strict user scoping: every query filtered by `auth()->id()`.
4. Jalali leap-year rules: 30-day Esfand in leap years, 29-day in normal years; 31 days in months 1–6, 30 days in months 7–11.
