# TaskYar Web 2.0 — UI & Design Reference Manual

**Source of Truth:** `reference/taskyar-main/renderer/css/style.css` & screenshots in `reference/taskyar-main/docs/screenshots/`  
**Target:** 100% faithful replication in Vue 3 + Tailwind CSS with dark mode extension.

---

## 1. Visual Identity & Aesthetic Philosophy

TaskYar Desktop v1.1.0 uses a modern **Glassmorphic** design language:
- Translucent frosted-glass panels (`backdrop-filter: blur(16px)`).
- Soft pastel background gradients customized per theme.
- Generous rounded corners (`border-radius: 20px`).
- Elegant micro-interactions, subtle shadows, and Persian typography powered by **Vazirmatn**.

---

## 2. Design Tokens & Color Palettes

### 2.1. Theme Variables

#### 1. Default (Purple / بنفش) — Primary
- `--primary`: `#6D28D9` (Deep violet)
- `--primary-light`: `#EDE9FE` (Soft violet tint)
- `--bg-gradient`: `linear-gradient(135deg, #F5F3FF 0%, #E0E7FF 50%, #FCE7F3 100%)`
- Accent / Star color: `#EAB308` (Yellow star)

#### 2. Ocean (آبی اقیانوسی)
- `--primary`: `#0284C7` (Sky blue)
- `--primary-light`: `#E0F2FE` (Soft sky tint)
- `--bg-gradient`: `linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #DCFCE7 100%)`

#### 3. Sunset (قرمز غروب)
- `--primary`: `#E11D48` (Rose red)
- `--primary-light`: `#FFE4E6` (Soft rose tint)
- `--bg-gradient`: `linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 50%, #FEF3C7 100%)`

#### 4. Emerald (سبز زمردی)
- `--primary`: `#059669` (Emerald green)
- `--primary-light`: `#D1FAE5` (Soft mint tint)
- `--bg-gradient`: `linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #E0F2FE 100%)`

#### 5. Dark Mode (حالت شب — Web 2.0 Extension)
- `--primary`: `#8B5CF6` (Vibrant purple for contrast on dark)
- `--primary-light`: `rgba(139, 92, 246, 0.2)`
- `--bg-gradient`: `linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #111827 100%)`
- `--surface`: `rgba(30, 41, 59, 0.82)`
- `--surface-solid`: `#1E293B`
- `--text-main`: `#F8FAFC`
- `--text-muted`: `#94A3B8`
- `--border`: `rgba(51, 65, 85, 0.8)`

### 2.2. Common Surface, Shadow & Border Tokens (Light Themes)
- `--surface`: `rgba(255, 255, 255, 0.86)` with `backdrop-filter: blur(16px)`
- `--surface-solid`: `#FFFFFF`
- `--text-main`: `#1E293B` (Slate 800)
- `--text-muted`: `#64748B` (Slate 500)
- `--border`: `rgba(226, 232, 240, 0.85)`
- `--shadow-sm`: `0 2px 8px -2px rgba(15, 23, 42, 0.05)`
- `--shadow-md`: `0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`
- `--radius-lg`: `20px` (Main containers, cards)
- `--radius-md`: `14px` (Buttons, inputs, inner boxes)
- `--radius-sm`: `10px` (Pills, small badges)
- `--transition`: `all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`

---

## 3. Typography & Numerals

- **Font Family:** `'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif`
- **Direction:** `rtl`
- **Font Weights Used:**
  - 400 (Regular): Secondary text, notes, placeholder text
  - 500 (Medium): Standard buttons, dates, badges
  - 600 (SemiBold): Task titles, input labels, shortcut keys
  - 700 (Bold): Headers, active navigation items, drawer titles
  - 800 (ExtraBold): Main view titles (`23px`), App title (`15.5px`), modal headings (`18px`)
- **Persian Numerals:** All dates, badges, hours, and counters must be formatted with Eastern Arabic/Persian digits (`۰, ۱, ۲, ۳, ۴, ۵, ۶, ۷, ۸, ۹`).

---

## 4. Layout & Component Geometry

### 4.1. Application Container
- **App Layout:** Full viewport height (`height: 100vh`), `overflow: hidden`, `display: flex`, `gap: 16px`, `padding: 16px`.
- **Responsive Web Behavior:**
  - Desktop (>1024px): Preserves the fixed sidebar + main content + slide-in detail drawer layout.
  - Tablet (768px–1024px): Collapsible sidebar with icon rail or hamburger toggle.
  - Mobile (<768px): Bottom navigation bar or drawer sidebar, bottom sheet for task details.

### 4.2. Right Sidebar (`.sidebar`)
- **Width:** `275px` fixed.
- **Background:** `var(--surface)` with `backdrop-filter: blur(16px)` and `border: 1px solid rgba(255, 255, 255, 0.6)`.
- **Border Radius:** `20px`.
- **Profile Area:**
  - Avatar: `42px x 42px`, `border-radius: 14px`, gradient from `var(--primary)` to `#A855F7`, white letter 'ت' (`font-size: 18px`, `font-weight: 700`).
  - Title: `15.5px`, bold. Subtitle: `11px`, muted.
- **Search Box:** Height ~38px, input with search SVG icon on the right side.
- **Navigation List:**
  - Item height: `padding: 10px 12px`, `border-radius: 10px`.
  - Icon: `18px x 18px`.
  - Text: `13px`, medium.
  - Badge: `min-width: 22px`, `border-radius: 20px`, `font-size: 11px`. When active, background becomes `var(--primary)` and text is white.
- **Sidebar Footer:** Grid with 3 action buttons (`ذخیره فایل`, `بکاپ ایمیل`, `بازیابی`).

### 4.3. Main Content Area (`.main-content`)
- **Flex:** `flex: 1`, flex column, relative positioning.
- **Border Radius:** `20px`.
- **Main Header:**
  - Padding: `22px 28px 14px`.
  - Title: `23px`, extra bold (`font-weight: 800`).
  - Persian Date: `12.5px`, muted (`font-weight: 500`).
  - Quick Header Actions: 3 pill buttons (`پشتیبان‌گیری`, `میانبرها`, `درباره`) with icons.
  - Theme Switcher: Container with 4 theme dots (`20px x 20px`, rounded-full, with 2px ring when active).
- **Progress Bar (`.progress-wrapper`):**
  - Track height: `8px`, `background: rgba(100, 116, 139, 0.12)`, `border-radius: 10px`.
  - Fill: `background: linear-gradient(90deg, var(--primary), #A855F7)`, `border-radius: 10px`, smooth transition.
  - Progress text: `0% (X از Y انجام شده)`.
- **Add Task Floating Bar (`.add-task-bar`):**
  - Positioned at the bottom of the main content area (`padding: 12px 18px`).
  - Elements: Plus SVG, Title input, Jalali date pill input, Time pill input, Alarm toggle button, Period dropdown pill, Add button (`افزودن`, primary color).

### 4.4. Left Detail Drawer (`.detail-drawer`)
- **Position:** Absolute left side (in RTL, slides out over the left area), `width: 380px`, `height: 100%`.
- **Transform:** `translateX(-100%)` when closed; `translateX(0)` when open.
- **Background:** `var(--surface-solid)` with border and drop shadow.
- **Content:**
  - Drawer Header: Title and close button `✕`.
  - Task Title Input: Large text input.
  - Schedule & Alarm Box: Jalali date, time, alarm toggle with active state indicator.
  - Subtasks Box: Checklist items with checkboxes, strikethrough, delete button, and quick add subtask field (`+`).
  - Time Horizon Dropdown: Daily, Weekly, Monthly.
  - Notes Textarea: Multi-line text field.
  - Footer: Persian Jalali creation timestamp (`ایجاد شده: ۴ آبان ۱۴۰۵`) using Persian numerals (`۰–۹`) with full 24-hr time tooltip (`زمان ایجاد: ۴ آبان ۱۴۰۵ - ۱۶:۲۳`), and red Delete button (`حذف کار`).
  - Creation date is formatted presentation-side via `formatCreationDate()`, preserving raw database `created_at` ISO format.

### 4.5. 7-Day Week Board (`.week-board-container`)
- 7 equal columns (`flex: 1 1 0`), fitting 100% of the screen without horizontal scrolling.
- **RTL Navigation Toolbar:**
  - **Right Arrow (`prev-btn` on the right):** Right-pointing SVG chevron (`>`), shifts 7 days backward (earlier dates), labeled «هفته قبل».
  - **Center Title:** Bold `برد ۷ روز هفته` and range label (e.g. `از ۲ آبان تا ۸ آبان`).
  - **Left Arrow (`next-btn` on the left):** Left-pointing SVG chevron (`<`), shifts 7 days forward (later dates), labeled «هفته بعد».
  - **«این هفته» Button:** Resets view to current week offset (0).
- Each column has:
  - Header with day name (e.g. `شنبه`), date label (e.g. `۲ آبان`), and today badge or task count.
  - Task list container for compact mini-cards (`.day-mini-task`).
  - Footer with quick add input (`+ کار جدید`).

### 4.6. 30-Day Month Board (`.month-board-container`)
- **RTL Navigation Toolbar:**
  - **Right Arrow (`prev-btn` on the right):** Right-pointing SVG chevron (`>`), shifts -1 month (earlier month, e.g. آبان -> مهر), labeled «ماه قبل».
  - **Center Title:** Jalali month name and Persian year (e.g. `آبان ۱۴۰۵`), day length and task count in Persian digits.
  - **Left Arrow (`next-btn` on the left):** Left-pointing SVG chevron (`<`), shifts +1 month (later month, e.g. آبان -> آذر), labeled «ماه بعد».
  - **«امروز» Button:** Instantly jumps to the current Jalali month and year.
  - **Year Boundary Handling:** Seamless transition across Esfand (month 12) and Farvardin (month 1) with automatic year decrement/increment and leap-year calculations.
- 7 weekday header labels (`شنبه` through `جمعه`). Friday has distinctive red/pink accent styling.
- 5 or 6 grid rows corresponding to the exact number of weeks in that Jalali month.
- Cells display day number, badge, task chips, and "+N more" overflow link.
- Clicking any date cell opens `DayDetailView` with matching right/left day navigation (`روز قبل`, `روز بعد`).

### 4.7. Modals
- Centered overlay (`background: rgba(15, 23, 42, 0.45)`, `backdrop-filter: blur(8px)`).
- Modal card: `background: var(--surface-solid)`, `border-radius: 20px`, `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`.
- Alarm Modal: Pulsing alarm icon, highlighted task banner, primary action button, snooze button.

### 4.8. Persian Time Picker (`PersianTimePicker.vue`) & Styled Select (`AppSelect.vue`)
- **PersianTimePicker:**
  - Replaced browser-native `<input type="time">`.
  - **Vue Teleport to `<body>`**: Eliminates parent container clipping and prevents drawer scroll expansion.
  - **Viewport-Aware Positioning**: Calculates trigger bounds using `getBoundingClientRect()`, clamps popover strictly within window bounds (`[10, innerWidth - margin]`, `[10, innerHeight - margin]`), and updates on window resize and scroll events.
  - **Zero-Nested-Scroll Compact Interface**:
    - Segmented interactive time display (`ساعت` / `دقیقه`).
    - 6×4 compact button grid for all 24 hours (`۰۰` through `۲۳`). Selecting an hour automatically advances the tab to minute selection.
    - 4×3 compact button grid for minutes (`۰۰` through `۵۵` in 5-minute steps).
    - Quick preset buttons: `الان`, `۰۹:۰۰`, `۱۴:۰۰`, `۱۸:۰۰`, `۲۱:۰۰`.
    - Action buttons: `پاک کردن` and `تأیید`.
  - **Escape Key Isolation**: Capture-phase event handler calls `e.stopImmediatePropagation()`, closing only the time picker popover without dismissing the parent detail drawer.
  - **Normalized Output**: Emits normalized ASCII `HH:mm` format for API persistence while displaying Persian digits.
- **AppSelect:**
  - Custom styled dropdown replacing unstyled `<select>`.
  - Border radius `14px`, theme-aware hover effects, rotating chevron indicator.
  - Keyboard accessible (Up/Down arrow navigation, Enter/Space selection, Escape dismissal).
  - Outside click dismissal listener.
  - Drop-up support (`:drop-up="true"`) for bottom floating bars.

### 4.9. Dedicated Authentication Layout (`LoginPage.vue` & `RegisterPage.vue`)
- **Aesthetic:** Clean, pastel-purple glassmorphic background matching TaskYar brand.
- **Card Geometry:** Centered `max-width: 440px`, padding `36px`, border-radius `24px`, subtle shadow.
- **Brand Header:** Violet-to-purple gradient avatar with "ت" logo, bold "تسک‌یار وب" title, and descriptive subtitle.
- **Inputs:** Accessible floating style, clear labels, show/hide password toggle button with SVG icons.
- **Validation:** Server and client inline error banners in soft red tint (`#FEF2F2`) with red border (`#FCA5A5`).
- **Complete Isolation:** Main workspace does not render behind the auth card, ensuring zero state leak.

### 4.10. Responsive Mobile System
- **Desktop (>1024px):** Fixed 275px sidebar + flexible workspace + 380px slide-in detail drawer.
- **Tablet (768px–1024px):** Compact margins, collapsible layout, touch-friendly tap targets.
- **Mobile (<768px):**
  - Slide-out drawer sidebar with dark backdrop overlay (`rgba(15, 23, 42, 0.4)`).
  - Hamburger menu toggle button in header.
  - Full-width task cards and detail drawer expanding to 100vw.
  - Add task bar responsive wrapping and horizontal scrolling for week board columns.

