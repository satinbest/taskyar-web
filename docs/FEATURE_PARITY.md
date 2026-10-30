# TaskYar Web 2.0 — Feature Parity Specification

This document maps every feature, screen, modal, and interaction from **TaskYar Desktop v1.1.0** to its corresponding implementation in **TaskYar Web 2.0**, along with all required new capabilities.

---

## 1. Feature-by-Feature Parity Matrix

| Feature / Capability | TaskYar Desktop v1.1.0 | TaskYar Web 2.0 | Implementation Phase & Status |
|---|---|---|---|
| **Multi-User Isolation** | ❌ No (Single desktop user) | ✅ Yes | **Phase 2 (Completed):** Session-based auth, policy authorization, every DB query filtered by `auth()->id()`. |
| **Persian / RTL Interface** | ✅ Full Persian RTL | ✅ Full Persian RTL | **Phase 2 (Completed):** HTML `dir="rtl"`, CSS RTL layout, Vazirmatn font locally bundled. |
| **Self-Hosted Assets** | ⚠️ Partial (Vazirmatn from CDN) | ✅ 100% Self-Hosted | **Phase 2 (Completed):** Zero external CDN requests; audited via automated tests. |
| **My Day (`روز من`) View** | ✅ Yes | ✅ Yes | **Phase 2 (Completed):** Real-time filter for today's tasks, midnight rollover check, progress bar. |
| **Task Creation Bar** | ✅ Yes (Bottom bar) | ✅ Yes (Bottom floating bar) | **Phase 2 (Completed):** Title input, datepicker, time input, alarm toggle, period select, enter key submit. |
| **Task Details Drawer** | ✅ Yes (Left slide-in) | ✅ Yes (Slide-in drawer) | **Phase 2 (Completed):** Title, date, time, alarm toggle, subtasks checklist, notes textarea, delete button. |
| **Subtasks (Checklist)** | ✅ Yes | ✅ Yes | **Phase 2 (Completed):** Add, toggle completion, delete subtask items, progress fraction display (`2/3`). |
| **Jalali Datepicker** | ✅ Custom popup picker | ✅ Vue Jalali Component | **Phase 2 (Completed):** Popup picker matching exact aesthetics, leap-year calculations, today button. |
| **Task Search** | ✅ Instant client-side search | ✅ Instant client-side search | **Phase 2 (Completed):** Real-time title matching with keyboard shortcut. |
| **Audio Alerts** | ✅ Web Audio API synthesis | ✅ Web Audio API synthesis | **Phase 2 (Completed):** Sine sweep for completion, triple triangle beep for alarms. Zero audio assets. |
| **Alarm Ringing Modal** | ✅ Yes | ✅ Yes | **Phase 2 (Completed):** Modal with pulsating bell icon, task title, time, "متوجه شدم", and 5-min snooze. |
| **JSON Export** | ✅ File dialog / blob download | ✅ Server Atomic Export | **Phase 2 (Completed):** 100% desktop schema compatibility verified by round-trip tests. |
| **JSON Import** | ✅ File dialog / input | ✅ Server Atomic Import | **Phase 2 (Completed):** Atomic DB transaction with strict user isolation, verified by tests. |
| **Email Backup** | ✅ Mailto + clipboard | ✅ Mailto + clipboard | **Phase 2 (Completed):** Prepares summary, copies text, opens user's email client. |
| **Original 4 Color Themes** | ✅ Default, Ocean, Sunset, Emerald | ✅ Default, Ocean, Sunset, Emerald | **Phase 2 (Completed):** Identical color hex codes, gradients, and CSS variables. |
| **7-Day Week Board (`برد ۷ روزه`)** | ✅ Yes | ✅ Yes | **Phase 3 (Completed):** 7 day columns (Saturday to Friday), today badge, quick add in column footers, task card chips, details drawer integration. |
| **30-Day Month Board (`برد ۳۰ روزه`)** | ✅ Yes | ✅ Yes | **Phase 3 (Completed):** 5–6 row Jalali grid (36 cells), Friday styling, day badges, task chips, month shifting, jump to today. |
| **Day Detail View (`جزئیات روز`)** | ✅ Yes | ✅ Yes | **Phase 3 (Completed):** Opened via month board click, back to month board navigation, previous/next day navigation, full task CRUD for specific day. |
| **Horizon Views (Important, Daily, Weekly, Monthly, All)** | ✅ Yes | ✅ Yes | **Phase 3 (Completed):** Sidebar filter views with real-time counter badges, search integration, keyboard navigation. |
| **Dedicated Auth Routes (`/login`, `/register`, `/app`)** | ❌ No (Desktop single user) | ✅ Yes | **Phase 3 (Completed):** Dedicated glassmorphic auth pages, server-side authoritative route protection (`guest`/`auth` middleware), Vue Router guards, zero background workspace rendering on login. |
| **Persian Time Picker Component** | ⚠️ Native HTML time input | ✅ Custom Vue Component | **Phase 3 (Completed):** Replaced native `<input type="time">` in AddTaskBar and DetailDrawer with `PersianTimePicker.vue` (Persian numerals, 24-hour selection, normalized `HH:mm` output, popover drop-up). |
| **Styled AppSelect Dropdown** | ⚠️ Native HTML `<select>` | ✅ Custom Vue Component | **Phase 3 (Completed):** Replaced native selects with `AppSelect.vue` (styled trigger, animated popover menu, RTL alignment, keyboard navigation, drop-up support). |
| **Responsive Mobile Layout** | ❌ Desktop fixed | ✅ Full Responsive RTL | **Phase 3 (Completed):** Mobile slide-out drawer sidebar, hamburger toggle in header, backdrop overlay, touch-friendly task controls, verified at 375px/768px/1280px/1440px. |
| **Dark Mode** | ❌ Not in v1.1.0 | ⏳ Phase 4 | **Phase 4:** High-contrast dark mode tailored for late-night productivity. |
| **Recurring Tasks** | ❌ Manual re-entry only | ⏳ Phase 4 | **Phase 4:** Recurrence engine (daily, weekly, monthly, custom days) with automatic recurrence. |
| **Categories & Tags** | ❌ Only 3 fixed periods | ⏳ Phase 4 | **Phase 4:** Custom user categories and color-coded tags for flexible organization. |
| **Persian NLP Quick Entry** | ❌ Not available | ⏳ Phase 4 | **Phase 4:** Client-side rule-based Persian parser ("فردا ساعت ۱۰ جلسه مهم #کار"). |
| **Personal Analytics** | ❌ Only progress bar | ⏳ Phase 4 | **Phase 4:** Completion trends, weekly streaks, category breakdown, productivity reports. |
| **PWA & Offline Sync** | ❌ Desktop only | ⏳ Phase 4 | **Phase 4:** Installable Web App, Service Worker, IndexedDB caching, conflict-aware sync. |
| **Advanced Reminders** | ⚠️ Only in-app timer | ⏳ Phase 4 | **Phase 4:** Web Notifications, Service Worker scheduled notifications, browser background push. |

---

## 2. Screens and Modals Specification

### 2.1. Primary Views
1. **My Day (`myday`):**
   - Filters tasks where `dueDate === todayISO`.
   - Dynamic header with long Persian date (`شنبه ۲ آبان ۱۴۰۵`).
   - Progress bar with percentage and `X از Y انجام شده`.
   - Active tasks listed first; completed tasks listed below divider.
2. **7-Day Week Board (`weekboard`):**
   - 7 columns representing Saturday through Friday.
   - Column header displays Persian day name, date abbreviation, and task count badge (or `امروز` badge).
   - Scrollable task chips inside each column.
   - Column footer contains quick add input field (`+ کار جدید`) with Enter key submission.
3. **30-Day Month Board (`monthboard`):**
   - Jalali calendar grid (5 or 6 rows, 7 columns).
   - Month toolbar with Previous Month (`›`), Month Title (`آبان ۱۴۰۵`), Next Month (`‹`), and `امروز` jump button.
   - Days display Persian day number, task count badge, up to 2 task chips, and `+N مورد دیگر` chip.
   - Friday column is visually styled with light red tint.
   - Clicking any day navigates to **Day Detail View**.
4. **Day Detail View (`daydetail`):**
   - Header with `→ بازگشت به برد ماه`, previous day button, selected day title, and next day button.
   - Full task list for the selected day with add task bar defaulting to that date.
5. **Categorized Horizon Views:**
   - **Important (`important`):** Tasks marked with `important === true`.
   - **Daily (`daily`):** Tasks marked with `period === 'daily'`.
   - **Weekly (`weekly`):** Tasks marked with `period === 'weekly'`.
   - **Monthly (`monthly`):** Tasks marked with `period === 'monthly'`.
   - **All Tasks (`all`):** Comprehensive list of all user tasks.

### 2.2. Modal Windows
1. **Alarm Ringing Modal (`#alarmModal`):**
   - Pulsing bell animation.
   - Displays task title and scheduled time.
   - Action buttons: `متوجه شدم` (clears alarm interval), `یادآوری ۵ دقیقه دیگر` (snoozes for 5 minutes).
2. **Email Backup Modal (`#emailModal`):**
   - Email address input field.
   - Copies text summary and raw JSON to clipboard.
   - Triggers file download and opens `mailto:` protocol.
3. **Backup Settings Modal (`#backupSettingsModal`):**
   - Toggle automated backup.
   - Interval selector (15 min, 30 min, 1 hour, 2 hours, 24 hours).
   - Web 2.0 version displays automated cloud sync status and last backup timestamp.
4. **Keyboard Shortcuts Modal (`#shortcutsModal`):**
   - Displays shortcut matrix for desktop and web power users.
5. **About Modal (`#aboutModal`):**
   - Displays TaskYar brand, version 2.0, developer credit (Mohammad Nabi Shahzamani), MIT license notice, and web migration notes.

---

## 3. Keyboard Shortcuts Mapping

| Action | Desktop v1.1.0 Key | Web 2.0 Primary Key | Web 2.0 Fallback / Secondary Key |
|---|---|---|---|
| New Task | `Ctrl + N` | `Alt + N` / Click Input | Focuses bottom add task input bar |
| Focus Search | `Ctrl + F` | `Alt + F` / `/` | Focuses search bar |
| Manual Backup (JSON) | `Ctrl + S` | `Ctrl + Shift + S` / Menu | Exports JSON file |
| Import Backup | `Ctrl + O` | `Ctrl + Shift + O` / Menu | Opens import dialog |
| Backup Settings | `Ctrl + B` | `Alt + B` | Opens backup settings modal |
| Quick Backup Now | `Ctrl + Shift + B` | `Ctrl + Shift + B` | Triggers immediate backup |
| Switch: My Day | `Alt + 1` | `Alt + 1` | Navigates to My Day view |
| Switch: Week Board | `Alt + 2` | `Alt + 2` | Navigates to 7-Day Week Board |
| Switch: Month Board | `Alt + 3` | `Alt + 3` | Navigates to 30-Day Month Board |
| Switch: Important | `Alt + 4` | `Alt + 4` | Navigates to Important view |
| Switch: Daily | `Alt + 5` | `Alt + 5` | Navigates to Daily view |
| Switch: Weekly | `Alt + 6` | `Alt + 6` | Navigates to Weekly view |
| Switch: Monthly | `Alt + 7` | `Alt + 7` | Navigates to Monthly view |
| Switch: All Tasks | `Alt + 8` | `Alt + 8` | Navigates to All Tasks view |
| Delete Selected Task | `Delete` | `Delete` | Deletes task when drawer is open |
| Close Drawer / Modal | `Escape` | `Escape` | Closes topmost open overlay |
| Help & Shortcuts | `F1` | `F1` / `?` | Opens shortcuts modal |

---

## 4. Extended Features Architecture

### 4.1. Persian Natural Language Quick Add (Rule-Based, Zero AI API)
- Pure client-side regex and dictionary tokenizer.
- Examples parsed:
  - `جلسه با تیم فردا ساعت ۱۰:۳۰ مهم` -> Title: "جلسه با تیم", Date: Tomorrow, Time: "10:30", Important: true.
  - `پرداخت صورتحساب پس‌فردا ساعت ۱۸ #مالی` -> Title: "پرداخت صورتحساب", Date: Day after tomorrow, Time: "18:00", Tag: "مالی".
  - `تماس با پشتیبانی شنبه آینده ساعت ۹` -> Title: "تماس با پشتیبانی", Date: Next Saturday, Time: "09:00".

### 4.2. Recurring Tasks Engine
- Rules: Daily (`هر روز`), Weekdays (`روزهای کاری`), Weekly (`هفتگی`), Monthly (`ماهیانه`), Custom Interval.
- On completion of a recurring task, the system automatically marks the current instance complete and schedules the next occurrence based on the recurrence pattern.

### 4.3. Offline PWA & Conflict-Aware Synchronization
- Client uses IndexedDB to store full user dataset.
- Service Worker caches all static assets (HTML, CSS, JS, fonts).
- Mutations are assigned a client UUID and timestamp.
- When connection is restored, changes sync with Laravel API using last-write-wins with conflict detection.
