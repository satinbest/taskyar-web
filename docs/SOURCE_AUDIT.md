# TaskYar Web 2.0 — Comprehensive Source Code Audit

**Source of Truth:** `reference/taskyar-main/` (TaskYar Desktop v1.1.0)  
**Date of Audit:** October 2026  
**Auditor:** Full-Stack Engineering Team  

---

## 1. Executive Summary & Architecture Overview

TaskYar Desktop v1.1.0 is an Electron-based, single-window, Persian-language productivity application. It provides personal task scheduling, view boards (daily, weekly, monthly), subtasks, audio alarms, and automated backup to the local filesystem.

### Architectural Characteristics of v1.1.0:
- **Framework:** Electron 33.2.0 with Node.js 18+ runtime.
- **Frontend Architecture:** Pure Vanilla JavaScript (ES6+), HTML5, and CSS3. There is no frontend framework (no React, Vue, Angular, or jQuery) and **zero runtime npm dependencies**.
- **Window Management:** Single browser window (1180x780 default, min 1000x640) with Windows native application menu and single-instance lock (`app.requestSingleInstanceLock()`).
- **Data Persistence:** Client-side `localStorage` storing JSON arrays, supplemented by periodic automated dumps to JSON files in the user's `Documents\TaskYar_Backups` folder via Electron IPC.
- **Localization:** 100% Persian (RTL) with Jalali (Shamsi) calendar conversion derived from the `jalaali-js` algorithm. Web Audio API synthesized audio alerts (no audio files).

---

## 2. Source Code Breakdown & Analysis

### 2.1. `package.json` & Project Metadata
- **Package name:** `taskyar`
- **Product name:** `TaskYar`
- **Version:** `1.1.0`
- **Author:** Mohammad Nabi Shahzamani (`mnabishahzamani@gmail.com`, `https://github.com/mnabishahzamani-dev`)
- **License:** MIT License
- **App ID:** `ir.mnabishahzamani.taskyar`
- **Dependencies:** `electron` (^33.2.0) and `electron-builder` (^25.1.8) listed only under `devDependencies`. Zero runtime dependencies.

### 2.2. `main/main.js` (Electron Main Process — 352 lines)
The main process handles:
1. **Window Lifecycle:** Creates `BrowserWindow` with `nodeIntegration: false`, `contextIsolation: true`, and `preload.js`.
2. **Native Application Menu (`createApplicationMenu`):**
   - **فایل (File):** کار جدید (`CmdOrCtrl+N`), جستجو در کارها (`CmdOrCtrl+F`), ذخیره دستی فایل پشتیبان (`CmdOrCtrl+S`), بازیابی اطلاعات (`CmdOrCtrl+O`), خروج (`CmdOrCtrl+Q`).
   - **ویرایش (Edit):** Undo, Redo, Cut, Copy, Paste, Select All, حذف کار انتخاب‌شده (`Delete`).
   - **پشتیبان‌گیری (Backup):** تنظیمات و دوره زمانی (`CmdOrCtrl+B`), پشتیبان‌گیری هم‌اکنون (`CmdOrCtrl+Shift+B`), ذخیره دستی, بازیابی اطلاعات, باز کردن پوشه بکاپ‌ها, ارسال به ایمیل.
   - **نمایش (View):** Switch views for `myday` (Alt+1), `weekboard` (Alt+2), `monthboard` (Alt+3), `important` (Alt+4), `daily` (Alt+5), `weekly` (Alt+6), `monthly` (Alt+7), `all` (Alt+8); color theme switching (`default`, `ocean`, `sunset`, `emerald`); Zoom In/Out/Reset; Fullscreen; Reload (`CmdOrCtrl+R`).
   - **راهنما (Help):** راهنمای کلیدهای میانبر (`F1`), درباره تسک‌یار.
3. **IPC Handlers (`registerIpcHandlers`):**
   - `backup:get-default-folder`: Resolves `path.join(app.getPath('documents'), 'TaskYar_Backups')` and ensures directory exists.
   - `backup:select-folder`: Displays `dialog.showOpenDialog` for directory selection.
   - `backup:open-folder`: Invokes `shell.openPath` to open directory in Windows Explorer.
   - `backup:save-file`: Writes timestamped JSON backup files (`taskyar_autobackup_YYYY-MM-DD_HH-mm-ss.json` or `taskyar_backup_...`), maintains `taskyar_latest_backup.json`, and limits backup retention to the 25 most recent automatic files.
   - `backup:export-dialog`: Opens `dialog.showSaveDialog` with `.json` filter.
   - `backup:import-dialog`: Opens `dialog.showOpenDialog` to read `.json` file content.

### 2.3. `preload/preload.js` (Preload Context Bridge — 15 lines)
Exposes `window.electronAPI` to the renderer using `contextBridge`:
- `getDefaultFolder()`
- `selectFolder()`
- `openFolder(folderPath)`
- `saveBackupFile(payload)`
- `exportFileDialog(data)`
- `importFileDialog()`
- `onMenuAction(channel, callback)`

### 2.4. `renderer/index.html` (DOM Structure — 396 lines)
Configured with `<html lang="fa" dir="rtl">` and includes:
1. **Right Sidebar (`.sidebar`):**
   - Profile area (`.avatar` with letter 'ت', app title "تسک‌یار ویندوز", subtitle "مدیریت هوشمند کارها و زمان").
   - Instant search input (`#searchInput`).
   - Navigation links with badges (`myday`, `weekboard`, `monthboard`, `important`, `daily`, `weekly`, `monthly`, `all`).
   - Footer actions: ذخیره فایل (Export), بکاپ ایمیل (Email backup), بازیابی (Import with hidden file input).
2. **Main Content (`.main-content`):**
   - Main header: View title (`#viewTitle`), Persian full date (`#persianDate`), quick action buttons (تنظیمات پشتیبان‌گیری, میانبرها, درباره), and 4 theme dots.
   - Progress bar (`#progressWrapper`): Percentage display and fill track.
   - Three main view containers:
     - `#tasksContainer`: Standard vertical list of task cards with active/completed sections.
     - `#weekBoardContainer`: 7 horizontal day columns (Saturday to Friday).
     - `#monthBoardContainer`: 30-day Jalali calendar month grid.
   - Bottom Add-Task Bar (`.add-task-bar`): Input text, Jalali date picker input, time input, alarm toggle button, period select dropdown (`daily`, `weekly`, `monthly`), and submit button.
3. **Left Detail Drawer (`#detailDrawer`):**
   - Slide-in drawer with task title input, Jalali date input, time input, alarm toggle button, subtasks list and subtask quick add input, period select, notes textarea, created date label, and delete button.
4. **Modals:**
   - `#alarmModal`: Ringing alarm dialog with task title, time, "متوجه شدم" (dismiss), and "یادآوری ۵ دقیقه دیگر" (snooze).
   - `#emailModal`: Email recipient input with export and `mailto:` action.
   - `#backupSettingsModal`: Auto-backup checkbox, interval dropdown (15m, 30m, 1h, 2h, 24h), folder path display, change folder button, open folder button, backup status, manual backup trigger.
   - `#shortcutsModal`: 18 shortcut key listings.
   - `#aboutModal`: Version 1.1.0 info, description, developer copyright notice.
   - `#toastContainer`: Fixed toast notification container.

### 2.5. `renderer/js/utils.js` (Jalali & Utility Library — 229 lines)
- **Algorithm:** Mathematical Jalali/Gregorian conversions using astronomical leap year calculation arrays (`JALALI_BREAKS`).
- **Core Functions:**
  - `gregorianToJalali(gy, gm, gd)` -> `{ jy, jm, jd }`
  - `jalaliToGregorian(jy, jm, jd)` -> `{ gy, gm, gd }`
  - `isLeapJalali(jy)`
  - `jalaliMonthLength(jy, jm)`: 31 days for months 1-6; 30 days for months 7-11; 29 or 30 days for month 12 depending on leap year.
  - `isoToJalali(isoStr)` / `jalaliToISO(jy, jm, jd)`
  - `formatJalaliDate(jy, jm, jd)` -> `۱۴۰۳/۰۵/۱۲`
  - `formatJalaliLong(isoStr, withWeekday)` -> `شنبه ۲ آبan ۱۴۰۵`
  - `getCurrentPersianWeekDays()`: Computes the 7 days of the current Persian week starting from Saturday (`(now.getDay() + 1) % 7`).
  - `persianWeekdayIndex(dateObj)`: 0 = Saturday ... 6 = Friday.
  - `toPersianDigits(value)`: Converts `0-9` to `۰-۹`.
  - `escapeHTML(value)`: Sanitizes HTML strings.

### 2.6. `renderer/js/datepicker.js` (Jalali Datepicker — 196 lines)
- Singleton UI controller `JalaliPicker`.
- Attached to any input with class `.date-picker-input`.
- Stores raw Gregorian date string in `dataset.iso` (`YYYY-MM-DD`), displaying formatted Persian date in input text.
- Renders Persian header (Month & Year navigation, single-month shift, year shift), day names header (ش ی د س چ پ ج), month days grid, Friday styling, today selection, and footer (امروز, بستن).

### 2.7. `renderer/js/audio.js` (Web Audio API Synthesis — 45 lines)
- Zero external audio files or network requests.
- `playCompleteSound()`: Synthesizes a completion chime using `OscillatorNode` ('sine') ramping from 523.25 Hz (C5) to 783.99 Hz (G5) over 140ms with exponential gain fade.
- `playAlarmBeep()`: Synthesizes a triple alarm beep with 'triangle' oscillator at 880 Hz (A5), repeating 3 times at offsets 0ms, 220ms, and 440ms.

### 2.8. `renderer/js/state.js` (State Model & Defaults — 111 lines)
- Storage keys:
  - `persian_todo_tasks`: Array of task objects.
  - `persian_todo_backup_email`: String (email).
  - `taskyar_backup_settings`: Object `{ enabled, folderPath, intervalMinutes, lastBackupTimestamp, lastBackupDate, lastBackupFileName }`.
  - `taskyar_theme`: String (`default`, `ocean`, `sunset`, `emerald`).
- Defines initial seed tasks (`initialTasks`).
- Tracks active views, alarms, selected tasks, and month board state.

### 2.9. `renderer/js/app.js` (Application Controller — 1221 lines)
- **Lifecycle & Heartbeat:** Polling every 5,000ms checking alarms (`checkAlarms`) and calendar midnight rollovers (`handleDayRollover`).
- **Alarm Engine:** Matches `dueDate === todayISO` and `dueTime === currentHHMM`. Triggers modal, sound beeps every 2,000ms, and fires desktop `Notification`. Offers 5-minute snooze.
- **View Rendering:** Switches active view, updates badges, calculates completion percentage bar, sorts items by time, and builds cards.
- **7-Day Board:** Renders 7 day columns, handles quick task addition per column (`quickAddForDay`).
- **30-Day Month Board:** Renders 5-6 calendar rows, displays day task count, task chips, and "+N more" badge. Clicking a day opens `daydetail` view with next/previous day navigation.
- **Task Drawer:** Handles subtask CRUD, notes editing, schedule adjustments, and deletion.
- **Backup Management:** Timer-based periodic backup, manual export/import dialogs, email preparation.

### 2.10. `renderer/css/style.css` (Glassmorphism & Theming — 1177 lines)
- CSS Variables for 4 themes:
  - `default`: Purple gradient, primary `#6D28D9`, surface `#EDE9FE`.
  - `ocean`: Sky/teal gradient, primary `#0284C7`, surface `#E0F2FE`.
  - `sunset`: Rose/amber gradient, primary `#E11D48`, surface `#FFE4E6`.
  - `emerald`: Emerald/mint gradient, primary `#059669`, surface `#D1FAE5`.
- Frosted glass effect: `backdrop-filter: blur(16px)`, translucent white surfaces (`rgba(255,255,255,0.86)`), subtle borders (`rgba(226,232,240,0.85)`).
- Full RTL layout (`direction: rtl`).

---

## 3. Electron-Only Features vs. Web Realities

| Electron Feature in v1.1.0 | Mechanism in Desktop | Web 2.0 Equivalent Strategy |
|---|---|---|
| **Direct Filesystem Backup** | `fs.promises.writeFile` to `Documents\TaskYar_Backups` | Database persistence on server + Client-side JSON file download trigger (`Blob` / `a[download]`) + Server-side automatic backups |
| **Native Folder Selection Dialog** | `dialog.showOpenDialog({ properties: ['openDirectory'] })` | Not supported across web browsers without non-standard File System API. Replace with browser-standard file download / server backup storage |
| **Open Folder in Windows Explorer** | `shell.openPath` | Not available in browser security sandbox. Replace with in-browser backup history list & download links |
| **System Application Menu** | Electron `Menu.setApplicationMenu` | In-app responsive navigation bar, header quick actions, and modal dialogs |
| **Background Alarm Checking** | Desktop process `setInterval(5000)` running continuously | Client-side Service Worker / Web Notification API + Server-side reminder dispatcher (scheduled cron jobs) + In-app audio chime |
| **Desktop Notifications** | Electron `new Notification(...)` | Web Notifications API (`Notification.requestPermission`) + PWA Push Notifications |
| **Single-Instance Lock** | `app.requestSingleInstanceLock()` | Web browser tab management / standard web session |
| **Local Storage Isolation** | Single-user local `localStorage` | Multi-user authentication, MySQL database, user-isolated session cookies |

---

## 4. External Dependencies & URLs Found

In the original v1.1.0 source, the following external network requests were detected:
1. **`renderer/index.html` (Line 8):**
   `<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />`
   - **Audit Finding:** The original desktop app relies on an external CDN (`cdn.jsdelivr.net`) to render the Vazirmatn font.
   - **Web 2.0 Action Required:** Completely eliminate this CDN dependency. Self-host all Vazirmatn font files (`woff2`, `woff`) locally in `public/fonts/vazirmatn/` and bundle CSS locally.
2. **`main/main.js` & `README.md`:** Links to GitHub repository and developer email (`mnabishahzamani@gmail.com`). Attribution will be preserved in the Web 2.0 About modal and documentation under the original MIT license.

---

## 5. Security & Browser Sandbox Risks

1. **Audio Autoplay Policy:** Browsers block audio until the user has interacted with the document (clicked or tapped). The Web Audio API context must be created or resumed on the first user interaction.
2. **Tab Sleeping / Inactive Throttling:** Background browser tabs throttle timers (`setInterval`) to save CPU/battery. The alarm system in Web 2.0 must check for missed alarms whenever a tab becomes active (`visibilitychange` event) and utilize Web Notifications / Service Worker.
3. **Data Loss on Cache Clear:** Storing user data solely in `localStorage` in a browser exposes users to data loss when browser data is cleared. Web 2.0 must store data in a persistent relational database (MySQL/MariaDB) with offline synchronization via IndexedDB.
4. **Reserved Browser Keybindings:** `Ctrl+N` (new window), `Ctrl+F` (find in page), `Ctrl+S` (save page), `Ctrl+O` (open file), `Ctrl+Q` (quit) are handled by browsers. While `event.preventDefault()` can capture some shortcuts when the web app has focus, alternative web shortcuts or visible UI buttons must always be accessible.
