# TaskYar Web 2.0 — Iconsax Design System Specification

**Standard:** Iconsax Exclusive Vector Library  
**Status:** Active Design System Standard (Phase 5+)  
**Component Wrapper:** `resources/js/components/AppIcon.vue`  
**Package:** `iconsax` (Official npm package, locally bundled free assets)

---

## 1. Overview & Architectural Mandate

In TaskYar Web 2.0, **Iconsax is the exclusive interface icon standard**. All legacy inline SVGs, disparate icon styles, and ad-hoc icons across views and components have been systematically migrated to Iconsax to provide a unified, premium visual identity.

### Key Architectural Tenets:
1. **Zero External Runtime Requests:** All icons are locally bundled. The application operates 100% offline without remote CDN or license-check network requests.
2. **Zero-Latency In-Memory Rendering:** Core application icons are compiled in an optimized SVG dictionary (`resources/js/icons/iconsaxData.js`) directly extracted from the installed `iconsax` distribution, rendering synchronously on the very first frame without layout shift or fetch latency.
3. **Web Component Fallback:** Native `<iconsax-icon>` custom element is configured in Vue via `vite.config.js` (`isCustomElement: (tag) => tag === 'iconsax-icon'`) and registered at entry in `resources/js/app.js`.
4. **Theme & Dark Mode Awareness:** All icons use CSS `currentColor`, dynamically inheriting the active palette across default Purple, Ocean, Sunset, Emerald, and Dark modes.

---

## 2. Component Wrapper: `AppIcon.vue`

`AppIcon.vue` is registered globally as `<AppIcon />`.

### Component Props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `String` | *required* | Canonical Iconsax icon name or alias (e.g. `'sun'`, `'calendar'`, `'myday'`). |
| `type` | `String` | `'linear'` | Iconsax variant: `'linear'` (default), `'bulk'` (active navigation), `'bold'`, `'twotone'`. |
| `size` | `Number \| String` | `20` | Render size in pixels (e.g. `16`, `18`, `20`, `22`, `24`). |
| `color` | `String` | `'currentColor'` | CSS color value. Defaults to inheriting parent text/theme color. |
| `flipRtl` | `Boolean` | `false` | Mirrors on X-axis for RTL directional navigation when appropriate. |
| `label` | `String` | `null` | Accessibility label. Sets `role="img"` and `aria-label` when provided. |

### Visual Sizing Standard:
- **Small Controls / Metadata:** `14–16px` (chips, metadata tags, action triggers)
- **Standard Controls / Menus:** `18–20px` (buttons, dropdown arrows, headers)
- **Navigation & Primary Actions:** `20–24px` (sidebar items, task completion checkboxes, primary buttons)

---

## 3. Comprehensive Icon Mapping Inventory

| UI Area | Logical Function | Iconsax Canonical Name | Variant | Size (px) | Notes |
|---|---|---|---|---|---|
| **Sidebar** | روز من (My Day) | `sun` | `bulk` (active) / `linear` | 20 | Daylight theme alignment |
| **Sidebar** | برد ۷ روز هفته (Weekly Board) | `calendar` | `bulk` (active) / `linear` | 20 | 7-day grid representation |
| **Sidebar** | برد ۳۰ روزه ماه (Monthly Board) | `calendar-2` | `bulk` (active) / `linear` | 20 | Monthly calendar grid |
| **Sidebar** | مهم و ستاره‌دار (Important) | `star` | `bulk` (active) / `linear` | 20 | Priority recognition |
| **Sidebar** | آمار و پیشرفت (Analytics) | `status-up` | `bulk` (active) / `linear` | 20 | Analytics & productivity metrics |
| **Sidebar** | کارهای روزانه (Daily Horizon) | `calendar-1` | `bulk` (active) / `linear` | 20 | Daily horizon planner |
| **Sidebar** | برنامه‌های هفتگی (Weekly Horizon) | `clock` | `bulk` (active) / `linear` | 20 | Time-based weekly tasks |
| **Sidebar** | اهداف ماهیانه (Monthly Horizon) | `calendar-tick` | `bulk` (active) / `linear` | 20 | Completed monthly goals |
| **Sidebar** | همه وظایف (All Tasks) | `task-square` | `bulk` (active) / `linear` | 20 | General task collection |
| **Sidebar** | خروج از حساب (Logout) | `logout-01` | `linear` | 16 | Account session termination |
| **Sidebar** | جستجو (Search) | `search-normal` | `linear` | 18 | Quick search field |
| **Sidebar / Drawer** | دسته‌ها (Categories) | `folder` / `folder-add` | `linear` | 16–18 | User category classification |
| **Sidebar / Drawer** | برچسب‌ها (Tags) | `tag` / `tag-2` | `linear` | 14–16 | Multi-tag tagging |
| **Header** | منوی موبایل (Hamburger) | `task-square` | `linear` | 20 | Drawer toggle on small viewports |
| **Header** | میانبرها (Shortcuts) | `command` | `linear` | 18 | Keyboard helper modal |
| **Header** | درباره (About) | `info-circle` | `linear` | 18 | License & developer details |
| **Header** | حالت شب / روز (Dark Mode) | `moon` / `sun` | `linear` | 18 | Dynamic theme mode toggle |
| **Header** | وضعیت اتصال (Sync Status) | `cloud-connection` / `cloud-cross` | `linear` | 16 | Online / Offline sync indicator |
| **Task Cards** | انجام کار (Checkbox) | `tick-circle` | `bulk` (done) / `linear` | 20 | Task completion toggle |
| **Task Cards** | علامت ستاره (Important) | `star` | `bulk` (active) / `linear` | 20 | Task priority flag |
| **Task Cards** | تکرار (Recurrence Glyph) | `repeat` | `linear` | 14 | Indicates recurring series |
| **Task Cards** | تاریخ موعد (Due Date) | `calendar-1` | `linear` | 12 | Jalali deadline chip |
| **Task Cards** | ساعت / آلارم (Due Time) | `clock` / `notification-bing` | `linear` | 12 | Time & alarm status |
| **Add Task Bar** | افزودن کار جدید (Add) | `add` | `linear` | 20 | Primary creation trigger |
| **Add Task Bar** | تنظیم تکرار (Recurrence) | `repeat` | `linear` | 16 | Recurrence modal opener |
| **Add Task Bar** | زنگ هشدار (Alarm) | `notification` | `bulk` (on) / `linear` | 16 | Pre-creation alarm toggle |
| **Detail Drawer** | بستن کشو (Close) | `close-circle` | `linear` | 20 | Dismiss detail view |
| **Detail Drawer** | حذف کار (Delete) | `trash` | `linear` | 16 | Permanent / tombstone deletion |
| **Calendar Nav** | ماه/هفته قبل (RTL Previous) | `arrow-right-01` | `linear` | 16–18 | Directional backward nav |
| **Calendar Nav** | ماه/هفته بعد (RTL Next) | `arrow-left-01` | `linear` | 16–18 | Directional forward nav |
| **Dropdowns** | پیکان باز/بسته (Chevron) | `arrow-down-01` / `arrow-up-01` | `linear` | 14 | AppSelect & category menus |
| **Auth** | کاربر / نام (User) | `user` | `linear` | 18 | Login & register inputs |
| **Auth** | نمایش/مخفی رمز (Password) | `eye` / `eye-slash` | `linear` | 18 | Secure credential toggle |
| **Auth** | ارسال فرم (Submit) | `login-01` / `arrow-left-01` | `linear` | 18 | Authentication action |
| **Modals** | خطا / هشدار (Warning) | `warning-2` | `linear` / `bulk` | 18–22 | Alert banners and conflict modal |
| **Reminders** | تعویق (Snooze) | `timer` | `linear` | 16 | Alarm snooze selection |
