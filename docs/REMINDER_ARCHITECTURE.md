# TaskYar Web 2.0 — Reminder Architecture & Notification Design

## 1. Overview & Browser Constraints

TaskYar Web 2.0 extends the desktop version's alarm capabilities to modern web standards while adhering strictly to browser realities:
1. **Web Notifications API**: Standard browser notifications when the browser/tab is active.
2. **Audio Synthesizer Fallback**: Web Audio API oscillator beeps (sine/triangle 880Hz) when notification permissions are denied or throttled.
3. **No Unrealistic Service Worker Claims**: Browser service workers do not support arbitrary background execution or waking up the CPU while the browser is closed without Push notifications.
4. **Zero-Daemon Shared Hosting Compatibility**: Does not rely on persistent Node processes, WebSockets, or Redis daemons.

---

## 2. Configurable Reminder Offsets & Snooze Options

### 2.1 Reminder Offsets
Configured per task via the Task Detail Drawer (`resources/js/components/DetailDrawer.vue`):
- **Exact time (به موقع)**: 0 minutes
- **5 minutes before (۵ دقیقه قبل)**: 5 minutes
- **15 minutes before (۱۵ دقیقه قبل)**: 15 minutes
- **30 minutes before (۳۰ دقیقه قبل)**: 30 minutes
- **1 hour before (۱ ساعت قبل)**: 60 minutes
- **1 day before (۱ روز قبل)**: 1440 minutes

### 2.2 Snooze Durations
When an alarm triggers, the user can choose from 4 snooze presets:
- **۵ دقیقه (5 minutes)**
- **۱۰ دقیقه (10 minutes)**
- **۱۵ دقیقه (15 minutes)**
- **۱ ساعت (1 hour)**

---

## 3. Storage & Data Schema

The reminder metadata is saved both locally in IndexedDB and on the backend database:
- `reminder_offset_minutes` (`integer`, default `0`)
- `snooze_until` (`datetime/ISO string`, nullable)
- `alarm_enabled` (`boolean`, default `false`)
- `alarm_triggered` (`boolean`, default `false`)

---

## 4. Evaluation Engine (`tasksStore.checkAlarms`)

An interval timer (`setInterval` every 10 seconds in `WorkspaceView.vue`) evaluates active tasks:
1. Filters for uncompleted tasks with `alarm_enabled: true`.
2. Considers both `snooze_until` (if present) and the calculated reminder trigger timestamp (`due_date` + `due_time` - `reminder_offset_minutes`).
3. If trigger time is reached or passed (within a 10-minute validity window):
   - Plays alarm sound (`playAlarmBeep()`).
   - Dispatches browser system notification via `new Notification()`.
   - Opens in-app Alarm Modal with task title, snooze options, and complete action.
   - Prevents duplicate alarms using client-side `triggeredAlarmsSet`.
