# TaskYar Web 2.0 — Offline Persian Natural-Language Quick Entry Parser Specification

**Document Version:** 1.0.0 (Phase 4)  
**Implementation:** `resources/js/utils/quickParser.js`  
**Test Suite:** `tests/Unit/quickParser.test.js`  

---

## 1. Overview & Constraints

The Persian Quick Entry Parser is an **offline, deterministic rule-based natural language parser** designed to extract task parameters directly from unstructured Persian text:
- **Zero Cloud or Network Reliance:** Operates 100% locally in the browser runtime.
- **Zero External AI / LLM APIs:** Employs precise regular expressions, Jalali calendar math, and Persian linguistic patterns.
- **Non-Destructive & Transparent:** Displays an interactive preview banner of recognized values (date, time, recurrence, tags, priority) so the user can verify or override parsed parameters before task creation.
- **Ambiguity Fallback:** If no temporal or recurrence patterns are detected with high confidence, the system preserves the text as the task title without setting arbitrary dates.

---

## 2. Recognized Syntax & Linguistic Patterns

### 2.1. Relative Dates
- `امروز`: Sets due date to current day (`todayISO`).
- `فردا`: Sets due date to tomorrow (`today + 1`).
- `پس‌فردا` / `پسفردا` / `پس فردا`: Sets due date to day after tomorrow (`today + 2`).
- `دیروز`: Sets due date to yesterday (`today - 1`).

### 2.2. Persian Weekdays & Horizon Modifiers
- `[روز هفته] آینده` (e.g. `شنبه آینده`, `دوشنبه بعد`): Resolves to the specified day in the upcoming week.
- `این [روز هفته]` (e.g. `این سه‌شنبه`): Resolves to the specified day of the current Persian week.
- Standalone weekday (e.g. `دوشنبه ساعت ۱۰ جلسه`): Resolves to the upcoming occurrence of that weekday.

### 2.3. Time Expressions
- 24-Hour & 12-Hour Digits: `ساعت ۹` (09:00), `ساعت ۱۴:۳۰` (14:30), `14:30`.
- Colloquial Fractions: `ساعت ۸ و نیم` (08:30), `ساعت ۸ و ربع` (08:15).
- Period-of-Day Keywords:
  - `صبح` -> 09:00
  - `ظهر` -> 12:00
  - `عصر` -> 17:00
  - `غروب` -> 19:00
  - `شب` -> 21:00

### 2.4. Recurrence Phrases
- `هر روز`: Daily recurrence (`interval: 1`).
- `هر هفته`: Weekly recurrence (`interval: 1`).
- `هر [روز هفته]` (e.g. `هر دوشنبه`): Weekly recurrence restricted to specified Persian weekday index.
- `هر ماه`: Monthly recurrence on the current Jalali day.
- `هر سال`: Yearly recurrence on the current Jalali month and day.

### 2.5. Tags & Priority
- Hashtags: `#کار`, `#پروژه`, `#دانشگاه` automatically extract clean tag strings.
- Priority: Keywords `مهم`, `فوری`, `ضروری` set `important = true`.

---

## 3. Interactive User Feedback Loop

In `AddTaskBar.vue`:
1. As the user types, the parser analyzes the input in real-time.
2. If intentional patterns are detected (`hasParsedIntent = true`), a compact preview pill appears above the input:
   - 📅 `تاریخ: فردا`
   - 🕒 `ساعت: ۱۴:۳۰`
   - 🔁 `تکرار: هفتگی`
   - ⭐ `مهم`
   - 🏷️ `#کار`
3. The user can click any pill to dismiss or manually change the value using the existing styled date/time pickers.
4. When Enter is pressed, the task is saved with the verified properties.
