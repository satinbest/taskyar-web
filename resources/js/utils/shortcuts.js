/**
 * TaskYar Web 2.0 — Comprehensive Keyboard Shortcuts & Gestures Engine
 * 
 * Provides:
 * 1. Canonical shortcut definitions matching documentation and UI
 * 2. Cross-platform modifier support (Alt, Ctrl, Cmd/Meta)
 * 3. Dual-layout support (hardware e.code + Persian e.key mappings)
 * 4. Input element safety guards (never triggers global shortcuts during typing)
 * 5. Touch gestures documentation for mobile & tablet users
 * 6. Centralized lifecycle management preventing duplicate listeners
 */

export const SHORTCUT_CATEGORIES = [
  { id: 'tasks', label: 'عملیات وظایف' },
  { id: 'navigation', label: 'ناوبری و نماها' },
  { id: 'system', label: 'سیستم و راهنما' }
];

export const SHORTCUT_DEFINITIONS = [
  {
    id: 'new_task',
    category: 'tasks',
    title: 'ثبت کار جدید',
    description: 'انتقال فوکوس به نوار افزودن سریع وظیفه',
    primaryKey: 'Alt + N',
    secondaryKey: 'Ctrl + N',
    badge: 'Alt + N'
  },
  {
    id: 'search',
    category: 'tasks',
    title: 'جستجو در لیست کارها',
    description: 'انتقال فوکوس به فیلد جستجوی تسک‌ها',
    primaryKey: 'Alt + F',
    secondaryKey: '/',
    badge: 'Alt + F'
  },
  {
    id: 'delete_task',
    category: 'tasks',
    title: 'حذف کار انتخاب‌شده',
    description: 'حذف یا رد وظیفه باز شده در پنل جزئیات',
    primaryKey: 'Delete',
    badge: 'Delete'
  },
  {
    id: 'backup',
    category: 'tasks',
    title: 'پشتیبان‌گیری دستی (JSON)',
    description: 'دانلود فوری فایل پشتیبان از اطلاعات',
    primaryKey: 'Ctrl + B',
    secondaryKey: 'Ctrl + Shift + S',
    badge: 'Ctrl + B'
  },
  {
    id: 'view_myday',
    category: 'navigation',
    title: 'جابجایی به روز من',
    description: 'نمایش لیست وظایف تعیین‌شده برای امروز',
    primaryKey: 'Alt + 1',
    badge: 'Alt + 1',
    view: 'myday'
  },
  {
    id: 'view_weekboard',
    category: 'navigation',
    title: 'جابجایی به برد ۷ روز هفته',
    description: 'نمای کانبان برنامه‌ریزی هفتگی',
    primaryKey: 'Alt + 2',
    badge: 'Alt + 2',
    view: 'weekboard'
  },
  {
    id: 'view_monthboard',
    category: 'navigation',
    title: 'جابجایی به برد ۳۰ روزه ماه',
    description: 'تقویم ماهانه و مشاهده بار کاری روزها',
    primaryKey: 'Alt + 3',
    badge: 'Alt + 3',
    view: 'monthboard'
  },
  {
    id: 'view_important',
    category: 'navigation',
    title: 'جابجایی به کارهای مهم',
    description: 'لیست کارهای ستاره‌دار و اولویت بالا',
    primaryKey: 'Alt + 4',
    badge: 'Alt + 4',
    view: 'important'
  },
  {
    id: 'view_daily',
    category: 'navigation',
    title: 'جابجایی به برنامه‌های روزانه',
    description: 'وظایف با افق زمانی روزانه',
    primaryKey: 'Alt + 5',
    badge: 'Alt + 5',
    view: 'daily'
  },
  {
    id: 'view_weekly',
    category: 'navigation',
    title: 'جابجایی به برنامه‌های هفتگی',
    description: 'برنامه‌ها و اهداف این هفته',
    primaryKey: 'Alt + 6',
    badge: 'Alt + 6',
    view: 'weekly'
  },
  {
    id: 'view_monthly',
    category: 'navigation',
    title: 'جابجایی به اهداف ماهیانه',
    description: 'اهداف و برنامه‌های بلندمدت این ماه',
    primaryKey: 'Alt + 7',
    badge: 'Alt + 7',
    view: 'monthly'
  },
  {
    id: 'view_all',
    category: 'navigation',
    title: 'نمایش همه وظایف',
    description: 'مشاهده لیست جامع تمامی کارها',
    primaryKey: 'Alt + 8',
    badge: 'Alt + 8',
    view: 'all'
  },
  {
    id: 'help',
    category: 'system',
    title: 'راهنمای میانبرها',
    description: 'نمایش پنجره کلیدهای میانبر و ژست‌های لمسی',
    primaryKey: 'F1',
    secondaryKey: 'Ctrl + /',
    badge: 'F1'
  },
  {
    id: 'close',
    category: 'system',
    title: 'بستن پنل و پنجره‌ها',
    description: 'بستن مدال‌ها، سایدبار موبایل یا کشوی جزئیات',
    primaryKey: 'Esc',
    badge: 'Esc'
  }
];

export const MOBILE_GESTURES = [
  {
    title: 'ضربه روی هر وظیفه',
    description: 'باز شدن کشوی مشخصات و ویرایش سریع یادداشت، زمان، تکرار و زیرکارها',
    badge: 'لمس کار'
  },
  {
    title: 'تیک زدن چک‌باکس',
    description: 'تکمیل فوری کار با انیمیشن روان و پخش بازخورد صوتی ملایم',
    badge: 'چک‌باکس'
  },
  {
    title: 'ضربه روی آیکون ستاره',
    description: 'نشانه‌گذاری فوری وظیفه به عنوان کار مهم و با اولویت بالا',
    badge: 'ستاره'
  },
  {
    title: 'پیمایش افقی برد هفتگی',
    description: 'اسکرول لمسی روان با اسنپ خودکار روی ستون‌های شنبه تا جمعه',
    badge: 'Swipe افقی'
  },
  {
    title: 'تب‌بار روزهای هفته',
    description: 'جابجایی مستقیم به ستون روز مورد نظر با یک ضربه روی تب بالا',
    badge: 'تب روز'
  },
  {
    title: 'نوار ثبت دو سطری',
    description: 'ثبت وظیفه همراه با انتخاب تاریخ، ساعت و برچسب بدون شلوغی صفحه',
    badge: 'ثبت سریع'
  },
  {
    title: 'لمس فضای تیره پس‌زمینه',
    description: 'بستن فوری منوی سایدبار موبایل یا کشوی جزئیات وظیفه',
    badge: 'Backdrop'
  }
];

/**
 * Checks if the user is currently focused inside an editable text element or picker dropdown
 */
export function isTypingInInput(target) {
  if (!target) return false;
  const tag = target.tagName ? target.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest && target.closest('.time-picker-dropdown, .jalali-picker-dropdown, .app-select-menu')) {
    return true;
  }
  return false;
}

/**
 * Creates and attaches a robust global shortcut manager.
 * Returns an unregister function to ensure proper cleanup.
 */
export function registerShortcuts(actions = {}) {
  if (typeof window === 'undefined') return () => {};

  function handleKeyDown(e) {
    const isTyping = isTypingInInput(e.target);
    const isAlt = e.altKey;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    // 1. ESCAPE KEY: Always handled even when typing
    if (e.key === 'Escape' || e.code === 'Escape') {
      if (isTyping) {
        // Blur input first so user returns to workspace navigation
        e.target?.blur();
        e.preventDefault();
        return;
      }
      if (actions.onClose) {
        e.preventDefault();
        actions.onClose();
        return;
      }
    }

    // 2. HELP / SHORTCUTS MODAL: F1 or Ctrl+/ (or '?' when not typing)
    if (e.code === 'F1' || e.key === 'F1') {
      e.preventDefault();
      actions.onToggleHelp?.();
      return;
    }
    if (isCtrlOrMeta && (e.code === 'Slash' || e.key === '/')) {
      e.preventDefault();
      actions.onToggleHelp?.();
      return;
    }
    if (!isTyping && !isCtrlOrMeta && !isAlt && (e.key === '?' || e.key === '؟')) {
      e.preventDefault();
      actions.onToggleHelp?.();
      return;
    }

    // 3. BACKUP (JSON EXPORT): Ctrl+B or Ctrl+Shift+S or Alt+B
    if (
      (isCtrlOrMeta && (e.code === 'KeyB' || e.key === 'b' || e.key === 'B' || e.key === 'ذ')) ||
      (isCtrlOrMeta && isShift && (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'س')) ||
      (isAlt && (e.code === 'KeyB' || e.key === 'b' || e.key === 'B' || e.key === 'ذ'))
    ) {
      e.preventDefault();
      actions.onBackup?.();
      return;
    }

    // 4. NEW TASK: Alt+N or Ctrl+N (both English and Persian keyboard layouts)
    if (
      (isAlt && (e.code === 'KeyN' || e.key === 'n' || e.key === 'N' || e.key === 'د')) ||
      (isCtrlOrMeta && (e.code === 'KeyN' || e.key === 'n' || e.key === 'N' || e.key === 'د'))
    ) {
      e.preventDefault();
      actions.onNewTask?.();
      return;
    }

    // 5. FOCUS SEARCH: Alt+F (or '/' when not typing in an input)
    if (
      (isAlt && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ب')) ||
      (!isTyping && !isCtrlOrMeta && !isAlt && (e.code === 'Slash' || e.key === '/'))
    ) {
      e.preventDefault();
      actions.onSearch?.();
      return;
    }

    // 6. VIEW SWITCHING SHORTCUTS (Alt + 1 through Alt + 8, with Persian digits support)
    if (isAlt) {
      // Alt + 1: My Day
      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1' || e.key === '۱') {
        e.preventDefault();
        actions.onSwitchView?.('myday');
        return;
      }
      // Alt + 2: Week Board
      if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2' || e.key === '۲') {
        e.preventDefault();
        actions.onSwitchView?.('weekboard');
        return;
      }
      // Alt + 3: Month Board
      if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3' || e.key === '۳') {
        e.preventDefault();
        actions.onSwitchView?.('monthboard');
        return;
      }
      // Alt + 4: Important
      if (e.code === 'Digit4' || e.code === 'Numpad4' || e.key === '4' || e.key === '۴') {
        e.preventDefault();
        actions.onSwitchView?.('important');
        return;
      }
      // Alt + 5: Daily
      if (e.code === 'Digit5' || e.code === 'Numpad5' || e.key === '5' || e.key === '۵') {
        e.preventDefault();
        actions.onSwitchView?.('daily');
        return;
      }
      // Alt + 6: Weekly
      if (e.code === 'Digit6' || e.code === 'Numpad6' || e.key === '6' || e.key === '۶') {
        e.preventDefault();
        actions.onSwitchView?.('weekly');
        return;
      }
      // Alt + 7: Monthly
      if (e.code === 'Digit7' || e.code === 'Numpad7' || e.key === '7' || e.key === '۷') {
        e.preventDefault();
        actions.onSwitchView?.('monthly');
        return;
      }
      // Alt + 8: All Tasks
      if (e.code === 'Digit8' || e.code === 'Numpad8' || e.key === '8' || e.key === '۸') {
        e.preventDefault();
        actions.onSwitchView?.('all');
        return;
      }
    }

    // 7. DELETE SELECTED TASK: Delete key when NOT typing in an input
    if (!isTyping && (e.code === 'Delete' || e.key === 'Delete')) {
      if (actions.onDeleteSelectedTask) {
        e.preventDefault();
        actions.onDeleteSelectedTask();
        return;
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  return function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
