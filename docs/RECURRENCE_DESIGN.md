# TaskYar Web 2.0 — Recurrence Design Specification

**Document Version:** 1.0.0 (Phase 4)  
**Author:** Senior Full-Stack Engineer  
**Scope:** Recurrence Data Architecture, Jalali Calendar Clamping, Occurrence Lifecycle, and Isolation  

---

## 1. Overview & Architectural Principles

TaskYar Web 2.0 supports robust, user-scoped recurring tasks. Unlike naive implementations that generate unlimited future rows in the database, TaskYar uses a **rule-based bounded occurrence expansion architecture**:

1. **Zero Row Proliferation:** A recurring task is stored as a single parent task record containing a recurrence rule.
2. **Deterministic Bounded Expansion:** When a view (such as My Day, Week Board, Month Board, or Analytics) requests tasks for a date window `[from, to]`, occurrences are generated in-memory using `RecurrenceService`.
3. **Stable Occurrence Identifiers:** Every expanded occurrence has a deterministic composite ID in the format:
   $$\text{occurrence\_id} = \text{\{task\_id\}}@\text{\{YYYY-MM-DD\}}$$
   Example: `15@2026-10-26`. The underlying database ID remains accessible via `realTaskId = 15`.
4. **Exception Tracking Without Duplication:** Individual completed or skipped occurrences are recorded in `task_recurrence_exceptions`.
5. **Detached Modifications:** If the user selects "Edit this occurrence only", the specific occurrence is skipped in the parent series and a detached instance task is created with `recurrence_parent_id = parent.id` and `is_recurrence_exception = true`.

---

## 2. Recurrence Patterns & Frequency Options

| Pattern | Parameters | Description |
|---|---|---|
| `none` | — | Standard non-recurring task. |
| `daily` | `interval` (default 1) | Repeats every $N$ days. |
| `weekly` | `interval`, `weekdays` | Repeats every $N$ weeks on selected Persian weekdays (`0`=شنبه, `1`=یکشنبه, ..., `6`=جمعه). |
| `monthly` | `interval`, `month_day` | Repeats every $N$ Jalali months on the specified day of the Persian month (1–31). |
| `yearly` | `interval`, `month_day` | Repeats every $N$ Jalali years on the specified Jalali month and day. |
| `custom` | `interval`, `frequency`, options | Arbitrary intervals with optional end date or occurrence count. |

---

## 3. Jalali Calendar Clamping & Leap-Year Rules

The Persian solar calendar (Jalali) has variable month lengths:
- **Months 1 to 6 (Farvardin to Shahrivar):** Always 31 days.
- **Months 7 to 11 (Mehr to Bahman):** Always 30 days.
- **Month 12 (Esfand):** 29 days in ordinary years; 30 days in leap years (*Kabiseh*).

### 3.1. Monthly Clamping (Day 31 Rule)
- If a task is scheduled on day **31** (e.g. 31 Shahrivar):
  - In months 7 through 11 (which have 30 days), the occurrence date clamps to **Day 30** (e.g. 30 Mehr).
  - In month 12 (Esfand), the occurrence date clamps to **Day 29** in ordinary years, or **Day 30** in leap years.
  - In months 1 through 6, it resumes on **Day 31**.

### 3.2. Yearly Clamping (Esfand 30 Rule)
- If a task is scheduled on **Esfand 30** during a leap year (e.g. 1403):
  - In normal years (such as 1404 and 1405), Esfand has only 29 days. The recurrence engine **clamps the occurrence to Esfand 29** so the user never misses their yearly task.
  - In the subsequent leap year (1408), it automatically fires on **Esfand 30**.

---

## 4. Editing and Completion Semantics

When interacting with an occurrence `task_id@occurrence_date`:

1. **Complete Occurrence:**
   - Adds a record to `task_recurrence_exceptions`: `action = 'completed'`, `completed_at = now()`.
   - The occurrence displays as completed in that specific date's view. Future occurrences remain pending.
2. **Uncomplete Occurrence:**
   - Removes the exception record from `task_recurrence_exceptions`.
3. **Skip Occurrence:**
   - Adds a record to `task_recurrence_exceptions`: `action = 'skipped'`.
   - The occurrence is completely hidden from that day's task list.
4. **Edit This Occurrence Only:**
   - Calls `RecurrenceService::editThisOccurrence()`.
   - The original occurrence is marked as `skipped` in the parent series.
   - A new detached task is inserted with `recurrence_parent_id = parent.id`, `recurrence_original_date = occurrence_date`, `is_recurrence_exception = true`, and the user's specific modifications.
5. **Edit This and Future Occurrences:**
   - Calls `RecurrenceService::editFutureOccurrences()`.
   - The parent task's `recurrence_end_date` is set to the day before `occurrence_date`.
   - A brand new recurring series task is created with `due_date = occurrence_date` and the updated parameters.
6. **Edit Entire Series:**
   - Updates the parent task directly (`title`, `time`, `category`, `notes`, etc.), immediately updating all non-detached occurrences.

---

## 5. Security & Isolation

- All queries for parent tasks, exceptions, and detached occurrences strictly include `where('user_id', auth()->id())`.
- Deleting a parent task automatically deletes all associated exceptions and detached instances via database foreign key cascades.
