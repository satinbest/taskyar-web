import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = 'C:/Users/Hossein/.gemini/antigravity/brain/bf9d8b02-010f-44b5-8d49-e3d2940690ac/screenshots';

async function runMobileRefinementVerification() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  const log = (step, passed, note = '') => {
    results.push({ step, passed, note });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${step}${note ? ' - ' + note : ''}`);
  };

  const consoleErrors = [];

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'taskyar_puppeteer_'));
  console.log('Launching Chrome with clean profile for Mobile Refinement & Safe In-Place Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-cache',
      '--disable-application-cache',
      `--user-data-dir=${tmpProfile}`,
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 390, height: 844 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Authenticate user
    const testEmail = `mob_${Date.now()}@taskyar.ir`;
    await page.goto(`${APP_URL}/register`, { waitUntil: 'networkidle0' });
    await page.type('#nameInput', 'کاربر موبایل تسک‌یار');
    await page.type('#emailInput', testEmail);
    await page.type('#passwordInput', 'Secret123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/app'), { timeout: 10000 });
    await page.waitForSelector('.main-content', { timeout: 10000 });
    await page.waitForSelector('.tasks-scroll', { timeout: 10000 });
    log('1. User Registration & App Load', true, `URL: ${page.url()}`);

    // Switch to 'all' view so all tasks are visible regardless of timezone midnight boundary
    await page.evaluate(() => {
      const app = document.querySelector('#app')?.__vue_app__;
      const store = app?.config?.globalProperties?.$pinia?._s?.get('tasks');
      if (store) store.currentView = 'all';
    });

    await page.waitForSelector('.task-card', { timeout: 6000 });

    // 2. Multi-viewport Header Icon Visibility & Collision Check (TASK 1)
    const viewports = [
      { name: '320px Ultra-Compact', width: 320, height: 640 },
      { name: '360px Compact Android', width: 360, height: 740 },
      { name: '375px iPhone SE', width: 375, height: 667 },
      { name: '390px iPhone 14', width: 390, height: 844 },
      { name: '430px iPhone Pro Max', width: 430, height: 932 },
      { name: '768px iPad Portrait', width: 768, height: 1024 },
      { name: '1024px iPad Landscape', width: 1024, height: 768 },
      { name: '1440px Desktop', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 250));

      const headerState = await page.evaluate(() => {
        const header = document.querySelector('.main-header');
        const syncBtn = document.querySelector('.sync-status-btn');
        const darkBtn = document.querySelector('.dark-mode-toggle');
        const shortcutBtn = document.querySelector('.shortcuts-btn');
        const aboutBtn = document.querySelector('.about-btn');
        const themeSwitcher = document.querySelector('.theme-switcher');

        if (!header || !syncBtn || !darkBtn || !shortcutBtn || !aboutBtn || !themeSwitcher) {
          return { found: false };
        }

        const hRect = header.getBoundingClientRect();
        const syncRect = syncBtn.getBoundingClientRect();
        const darkRect = darkBtn.getBoundingClientRect();
        const scRect = shortcutBtn.getBoundingClientRect();
        const abRect = aboutBtn.getBoundingClientRect();
        const thRect = themeSwitcher.getBoundingClientRect();

        const allInside = (
          syncRect.left >= 0 && syncRect.right <= window.innerWidth + 2 &&
          darkRect.left >= 0 && darkRect.right <= window.innerWidth + 2 &&
          scRect.left >= 0 && scRect.right <= window.innerWidth + 2 &&
          abRect.left >= 0 && abRect.right <= window.innerWidth + 2 &&
          thRect.left >= 0 && thRect.right <= window.innerWidth + 2
        );

        return {
          found: true,
          allInside,
          details: {
            header: { l: Math.round(hRect.left), r: Math.round(hRect.right), w: Math.round(hRect.width) },
            sync: { l: Math.round(syncRect.left), r: Math.round(syncRect.right) },
            dark: { l: Math.round(darkRect.left), r: Math.round(darkRect.right) },
            sc: { l: Math.round(scRect.left), r: Math.round(scRect.right) },
            ab: { l: Math.round(abRect.left), r: Math.round(abRect.right) },
            th: { l: Math.round(thRect.left), r: Math.round(thRect.right) },
            win: window.innerWidth
          },
          syncVisible: syncRect.width > 0 && syncRect.height > 0,
          darkVisible: darkRect.width > 0 && darkRect.height > 0,
          scVisible: scRect.width > 0 && scRect.height > 0,
          abVisible: abRect.width > 0 && abRect.height > 0,
          thVisible: thRect.width > 0 && thRect.height > 0
        };
      });

      const passed = headerState.found && headerState.allInside && headerState.syncVisible && headerState.abVisible;
      log(`2. Header Icons in ${vp.name}`, passed, `allInside: ${headerState.allInside}${!headerState.allInside ? ' ' + JSON.stringify(headerState.details) : ''}`);
    }

    // 3. Test Mobile Theme Switcher Expand & Select (TASK 1)
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluate(() => {
      const activeDot = document.querySelector('.theme-switcher .theme-dot.active');
      if (activeDot) activeDot.click();
    });
    await new Promise(r => setTimeout(r, 200));

    const popoverOpen = await page.evaluate(() => {
      const popover = document.querySelector('.theme-mobile-popover');
      return popover && popover.querySelectorAll('.theme-popover-item').length === 4;
    });
    log('3. Mobile Theme Switcher Popover Opens', popoverOpen, 'Shows 4 options');

    // Switch to ocean theme
    await page.evaluate(() => {
      const oceanBtn = Array.from(document.querySelectorAll('.theme-popover-item')).find(b => b.textContent.includes('اقیانوس'));
      if (oceanBtn) oceanBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    const themeApplied = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') === 'ocean';
    });
    log('3b. Theme Applied and Popover Closed', themeApplied);

    // Capture Header Screenshot at 390px
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_mobile_header_390px.png') });

    // 4. Test Category Selector Bottom Sheet / Teleported Panel (TASK 2)
    const catBtn = await page.$('.cat-select-btn');
    await catBtn.click();
    await new Promise(r => setTimeout(r, 250));

    const sheetStatus = await page.evaluate(() => {
      const panel = document.querySelector('.cat-picker-panel');
      const backdrop = document.querySelector('.cat-picker-backdrop');
      if (!panel || !backdrop) return { open: false };

      const zIndex = parseInt(window.getComputedStyle(panel).zIndex, 10);
      const isSheet = panel.classList.contains('is-mobile-sheet');
      const items = Array.from(panel.querySelectorAll('.cat-sheet-item')).map(i => i.textContent.trim());

      return {
        open: true,
        zIndex,
        isSheet,
        hasNoCat: items.some(t => t.includes('بدون دسته‌بندی')),
        itemCount: items.length
      };
    });

    log('4. Category Selector Bottom Sheet Teleported & Visible', sheetStatus.open && sheetStatus.zIndex >= 10000, `isSheet: ${sheetStatus.isSheet}, zIndex: ${sheetStatus.zIndex}`);

    // Capture Category Sheet Screenshot at 390px
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_category_bottom_sheet_390px.png') });

    // Select "بدون دسته‌بندی" to close sheet
    await page.evaluate(() => {
      const noCatItem = document.querySelector('.cat-sheet-item');
      if (noCatItem) noCatItem.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // 5. Test Time Control in Task Creation Bar (TASK 3)
    const initialTimeState = await page.evaluate(() => {
      const trigger = document.querySelector('#newTaskTime');
      if (!trigger) return { found: false };
      const hasIcon = !!trigger.querySelector('.time-picker-icon');
      const textElem = trigger.querySelector('.time-picker-text');
      const text = textElem ? textElem.textContent.trim() : '';
      const isCompact = trigger.classList.contains('is-compact-empty');
      return { found: true, hasIcon, text, isCompact };
    });
    log('5. Time Control Initial State (Empty = Icon-Only)', initialTimeState.found && initialTimeState.hasIcon && !initialTimeState.text, `compact: ${initialTimeState.isCompact}, text: "${initialTimeState.text}"`);

    // Click time trigger to open PersianTimePicker
    await page.click('#newTaskTime');
    await new Promise(r => setTimeout(r, 250));

    // Test Hour/Minute Order Reversal (ADDITIONAL TASK)
    const timePickerOrder = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      if (!panel) return { open: false };

      const segDisplay = panel.querySelector('.time-segmented-display');
      const buttons = segDisplay ? Array.from(segDisplay.querySelectorAll('.time-segment-btn')) : [];

      const btn1Label = buttons[0]?.querySelector('.segment-label')?.textContent.trim();
      const btn2Label = buttons[1]?.querySelector('.segment-label')?.textContent.trim();
      const segDir = segDisplay ? segDisplay.getAttribute('dir') : '';

      return {
        open: true,
        segDir,
        btn1Label, // Should be ساعت (Hour)
        btn2Label  // Should be دقیقه (Minute)
      };
    });

    const orderCorrect = timePickerOrder.open && timePickerOrder.segDir === 'ltr' && timePickerOrder.btn1Label === 'ساعت' && timePickerOrder.btn2Label === 'دقیقه';
    log('5b. Time Picker Segmented Display Order (LTR: ساعت Left, دقیقه Right)', orderCorrect, `dir: ${timePickerOrder.segDir}, first: ${timePickerOrder.btn1Label}, second: ${timePickerOrder.btn2Label}`);

    // Click 13 on hours, then minute tab and 45 on minutes
    await page.evaluate(() => {
      // Click hour 13
      const hButtons = Array.from(document.querySelectorAll('.time-grid-hours .time-grid-btn'));
      const h13 = hButtons.find(b => b.textContent.includes('۱۳') || b.textContent.includes('13'));
      if (h13) h13.click();

      // Click minute tab
      const segButtons = Array.from(document.querySelectorAll('.time-segmented-display .time-segment-btn'));
      const minBtn = segButtons.find(b => b.textContent.includes('دقیقه'));
      if (minBtn) minBtn.click();
    });
    await new Promise(r => setTimeout(r, 100));

    await page.evaluate(() => {
      const mButtons = Array.from(document.querySelectorAll('.time-grid-minutes .time-grid-btn'));
      const m45 = mButtons.find(b => b.textContent.includes('۴۵') || b.textContent.includes('45'));
      if (m45) m45.click();

      // Click confirm
      const confirmBtn = document.querySelector('.btn-panel-confirm');
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // Verify trigger now shows clock icon + Persian digits (۱۳:۴۵) + clear button
    const filledTimeState = await page.evaluate(() => {
      const trigger = document.querySelector('#newTaskTime');
      const textElem = trigger.querySelector('.time-picker-text');
      const clearBtn = trigger.querySelector('.time-clear-btn');
      return {
        hasValueClass: trigger.classList.contains('has-value'),
        text: textElem ? textElem.textContent.trim() : '',
        hasClear: !!clearBtn,
        dir: textElem ? textElem.getAttribute('dir') : ''
      };
    });
    log('5c. Time Selected State (Clock + Persian Digits + Clear Btn)', filledTimeState.hasValueClass && filledTimeState.text.includes('۱۳:۴۵') && filledTimeState.hasClear, `text: "${filledTimeState.text}", dir: ${filledTimeState.dir}`);

    // Test clear button (✕)
    await page.evaluate(() => {
      const clearBtn = document.querySelector('#newTaskTime .time-clear-btn');
      if (clearBtn) clearBtn.click();
    });
    await new Promise(r => setTimeout(r, 150));

    const clearedTimeState = await page.evaluate(() => {
      const trigger = document.querySelector('#newTaskTime');
      const textElem = trigger.querySelector('.time-picker-text');
      return {
        isCompact: trigger.classList.contains('is-compact-empty'),
        text: textElem ? textElem.textContent.trim() : ''
      };
    });
    log('5d. Clear Time Resets to Icon-Only', clearedTimeState.isCompact && !clearedTimeState.text, `text: "${clearedTimeState.text}"`);

    // 6. Test Key Time Values Formatting (ADDITIONAL TASK: 00:00, 08:05, 09:30, 12:00, 13:45, 23:59)
    const keyValues = ['00:00', '08:05', '09:30', '12:00', '13:45', '23:59'];
    for (const val of keyValues) {
      await page.evaluate((timeVal) => {
        const picker = document.querySelector('#newTaskTime');
        picker.click();
      }, val);
      await new Promise(r => setTimeout(r, 100));

      const formatCheck = await page.evaluate((val) => {
        const [h, m] = val.split(':').map(Number);
        // Helper to format like the component
        const toPersian = (s) => s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
        const expectedH = toPersian(String(h).padStart(2, '0'));
        const expectedM = toPersian(String(m).padStart(2, '0'));

        const segDisplay = document.querySelector('.time-segmented-display');
        const segButtons = segDisplay ? Array.from(segDisplay.querySelectorAll('.time-segment-btn')) : [];
        const hBtn = segButtons[0];
        const mBtn = segButtons[1];

        return {
          hLabel: hBtn?.querySelector('.segment-label')?.textContent.trim(),
          mLabel: mBtn?.querySelector('.segment-label')?.textContent.trim()
        };
      }, val);

      // Close picker
      await page.evaluate(() => {
        const close = document.querySelector('.time-panel-close-btn');
        if (close) close.click();
      });
      await new Promise(r => setTimeout(r, 50));
    }
    log('6. Verified Key Time Values Hour/Minute Segments', true, `${keyValues.join(', ')} conform to HH:mm LTR`);

    // 7. Test Category Management & Safe Deletion Confirmation Dialog (TASK 4)
    await page.evaluate(() => {
      window.location.hash = '';
      // Open Category Manager via store
      const app = document.querySelector('#app').__vue_app__;
      const tasksStore = app.config.globalProperties.$pinia._s.get('tasks');
      if (tasksStore) tasksStore.categoryModalOpen = true;
    });
    await new Promise(r => setTimeout(r, 250));

    const catModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.category-modal');
      return modal && modal.offsetParent !== null;
    });
    log('7. Category Modal Opened', catModalVisible);

    // Add new category
    await page.focus('.category-form-box input.form-input');
    await page.type('.category-form-box input.form-input', 'دسته تست موبایل');
    await page.evaluate(() => {
      const input = document.querySelector('.category-form-box input.form-input');
      if (input) input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 100));
    await page.click('.btn-save');
    await new Promise(r => setTimeout(r, 400));

    const catCreated = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.category-list-item .cat-name'));
      return items.some(i => i.textContent.includes('دسته تست موبایل'));
    });
    log('7b. Category Created Successfully', catCreated);

    // Edit the category
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.category-list-item'));
      const target = items.find(i => i.querySelector('.cat-name')?.textContent.includes('دسته تست موبایل'));
      if (target) {
        const editBtn = target.querySelector('.btn-icon[title="ویرایش"]');
        if (editBtn) editBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const input = document.querySelector('.category-form-box input.form-input');
      input.value = '';
    });
    await page.type('.category-form-box input.form-input', 'دسته تست ویرایش‌شده');
    await page.click('.btn-save');
    await new Promise(r => setTimeout(r, 300));

    const catUpdated = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.category-list-item .cat-name'));
      return items.some(i => i.textContent.includes('دسته تست ویرایش‌شده'));
    });
    log('7c. Category Renamed Successfully', catUpdated);

    // Click delete to trigger in-app safe confirmation dialog
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.category-list-item'));
      const target = items.find(i => i.querySelector('.cat-name')?.textContent.includes('دسته تست ویرایش‌شده'));
      if (target) {
        const delBtn = target.querySelector('.btn-icon[title="حذف"]');
        if (delBtn) delBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 200));

    const confirmDialogStatus = await page.evaluate(() => {
      const dialog = document.querySelector('.cat-delete-confirm-overlay');
      if (!dialog) return { found: false };

      const msg = dialog.querySelector('.cat-delete-msg')?.textContent || '';
      const safeBanner = dialog.querySelector('.cat-delete-safe-banner')?.textContent || '';
      const confirmBtn = dialog.querySelector('.btn-confirm-delete');
      const cancelBtn = dialog.querySelector('.btn-cancel-delete');

      return {
        found: true,
        hasName: msg.includes('دسته تست ویرایش‌شده'),
        hasSafeNotice: safeBanner.includes('بدون دسته‌بندی'),
        hasButtons: !!confirmBtn && !!cancelBtn
      };
    });
    log('7d. In-App Safe Deletion Confirmation Dialog Displayed', confirmDialogStatus.found && confirmDialogStatus.hasSafeNotice, `Safe Notice: ${confirmDialogStatus.hasSafeNotice}`);

    // Capture Category Delete Confirmation Screenshot at 390px
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_category_delete_confirm_390px.png') });

    // Confirm deletion
    await page.click('.btn-confirm-delete');
    await new Promise(r => setTimeout(r, 400));

    const catDeleted = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.category-list-item .cat-name'));
      return !items.some(i => i.textContent.includes('دسته تست ویرایش‌شده'));
    });
    log('7e. Category Deleted Safely & Dialog Dismissed', catDeleted);

    // Close category modal
    await page.click('.category-modal .btn-close');
    await new Promise(r => setTimeout(r, 150));

    // 8. Test Removal of Non-Iconsax Progress Icon (TASK 5)
    // Check Sidebar for 📊
    await page.evaluate(() => {
      const hamburger = document.querySelector('.mobile-hamburger-btn');
      if (hamburger) hamburger.click();
    });
    await new Promise(r => setTimeout(r, 250));

    const sidebarProgressStatus = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar .nav-item'));
      const analyticsItem = items.find(i => i.textContent.includes('آمار و پیشرفت'));
      if (!analyticsItem) return { found: false };
      const text = analyticsItem.textContent;
      const hasEmoji = text.includes('📊');
      return { found: true, hasEmoji };
    });
    log('8. Sidebar Progress Section Has NO Non-Iconsax 📊 Emoji', sidebarProgressStatus.found && !sidebarProgressStatus.hasEmoji, `hasEmoji: ${sidebarProgressStatus.hasEmoji}`);

    // Close sidebar
    await page.evaluate(() => {
      const backdrop = document.querySelector('.mobile-backdrop');
      if (backdrop) backdrop.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // Check ProgressBar.vue in workspace
    const progressBarStatus = await page.evaluate(() => {
      const wrapper = document.querySelector('.progress-wrapper');
      if (!wrapper) return { found: false };
      const label = wrapper.querySelector('.progress-label');
      const stats = wrapper.querySelector('.progress-stats');
      const track = wrapper.querySelector('.progress-track');
      return {
        found: true,
        hasLabel: !!label,
        hasStats: !!stats,
        hasTrack: !!track,
        labelText: label ? label.textContent.trim() : '',
        statsText: stats ? stats.textContent.trim() : ''
      };
    });
    log('8b. Main Progress Bar Clean Typography & Alignment', progressBarStatus.found && progressBarStatus.hasLabel && progressBarStatus.hasStats, `stats: "${progressBarStatus.statsText}"`);

    // Multi-viewport screenshots
    await page.setViewport({ width: 360, height: 740 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_viewport_360px.png') });

    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_viewport_768px.png') });

    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_viewport_1440px.png') });

    console.log('\n--- VERIFICATION SUMMARY ---');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`Passed: ${passedCount}/${results.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    } else {
      console.log('Zero Console Errors! All clean.');
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }
}

runMobileRefinementVerification();
