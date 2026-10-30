# TaskYar Web 2.0 — JSON Backup Schema Specification (Version 2)

**Document Version:** 2.0.0 (Phase 4)  
**Author:** Senior Full-Stack Engineer  
**Compatibility:** 100% Backward-Compatible with TaskYar Desktop v1.1.0 & TaskYar Web v1.0  

---

## 1. Overview & Architectural Compatibility

TaskYar Web 2.0 Version 2 backup format extends the backup structure to encompass:
- **Categories:** User categories with custom hex colors and display order.
- **Tags:** User tags for multi-dimensional task classification.
- **Recurring Task Rules:** Recurrence patterns, intervals, selected Persian weekdays, month days, and end dates.
- **Subtasks & Notes:** Full checklist items and descriptions.

### Backward-Compatibility Matrix

| Incoming Backup Format | Source | Handled By V2 Importer? | Result |
|---|---|---|---|
| Plain Task Array `[ { title, ... } ]` | TaskYar Desktop v1.1.0 | ✅ YES | Tasks and subtasks imported cleanly. |
| Object with `tasks` property `{ tasks: [...] }` | TaskYar Web 2.0 (Phase 2/3) | ✅ YES | Tasks and subtasks imported cleanly. |
| Version 2 Envelope `{ version: 2, categories: [], tags: [], tasks: [] }` | TaskYar Web 2.0 (Phase 4+) | ✅ YES | Categories, tags, recurrence rules, and tasks restored atomically. |

---

## 2. Version 2 Schema Definition

```json
{
  "version": 2,
  "source": "TaskYar Web 2.0",
  "exported_at": "2026-10-26T20:30:00+03:30",
  "categories": [
    {
      "id": 1,
      "name": "پروژه‌های کاری",
      "color": "#6D28D9",
      "order_index": 0
    }
  ],
  "tags": [
    {
      "id": 1,
      "name": "فوری",
      "color": "#EF4444"
    }
  ],
  "tasks": [
    {
      "id": 101,
      "title": "جلسه هفتگی تیم فنی",
      "period": "weekly",
      "dueDate": "2026-10-26",
      "dueTime": "10:00",
      "alarmEnabled": true,
      "alarmTriggered": false,
      "completed": false,
      "important": true,
      "myDay": true,
      "notes": "بررسی گزارش پیشرفت فاز چهارم",
      "category": "پروژه‌های کاری",
      "category_id": 1,
      "tags": ["فوری"],
      "recurrence_pattern": "weekly",
      "recurrence_interval": 1,
      "recurrence_weekdays": [2],
      "recurrence_month_day": null,
      "recurrence_end_date": "2027-01-01",
      "recurrence_count": null,
      "subtasks": [
        {
          "text": "آماده‌سازی اسلایدها",
          "done": true
        }
      ],
      "createdAt": "2026-10-26 09:30:00"
    }
  ]
}
```

---

## 3. Import Lifecycle & Safety Guarantees

1. **Strict User Scoping:**
   - Every imported category, tag, task, and subtask is assigned `user_id = auth()->id()`.
   - Incoming numeric IDs are never reused as database primary keys, eliminating collision risk.
2. **Atomic DB Transactions:**
   - The entire import operation runs within `DB::beginTransaction()`.
   - If any catastrophic validation error occurs, `DB::rollBack()` reverts all changes, preventing partial or corrupted data.
3. **Idempotent Category and Tag Mapping:**
   - Existing user categories and tags with the same name are reused via `firstOrCreate()`.
   - New categories or tags are automatically created.
4. **Non-Destructive Import:**
   - Importing tasks appends to the user's existing records without wiping prior data.
