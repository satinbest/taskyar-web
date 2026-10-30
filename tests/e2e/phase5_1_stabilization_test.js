import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = 'C:\\Users\\Hossein\\.gemini\\antigravity-ide\\brain\\c1fb8e4a-9951-49d4-9deb-ae472df51094\\screenshots';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

let checksPassed = 0;
let checksFailed = 0;

function assert(condition, message) {
  if (condition) {
    checksPassed++;
    console.log(`[PASS] ${message}`);
  } else {
    checksFailed++;
    console.error(`[FAIL] ${message}`);
  }
}

async function runPhase51StabilizationTest() {
  console.log('🚀 Starting TaskYar Web 2.0 — Phase 5.1 UI Stabilization & Persian RTL Verification...\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  try {
    // -----------------------------------------------------------------------
    // Step 1: Login & Access Dashboard
    // -----------------------------------------------------------------------
    console.log('--- Step 1: Login & Access Dashboard ---');
    const userEmail = `user_stab_${Date.now()}@taskyar.com`;
    await page.goto('http://127.0.0.1:8000/register', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#nameInput', { timeout: 8000 });
    await page.type('#nameInput', 'کاربر تثبیت فاز ۵');
    await page.type('#emailInput', userEmail);
    await page.type('#passwordInput', 'Secret123!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.main-content', { timeout: 12000 });
    assert(page.url().includes('/app'), 'Successfully authenticated to workspace');

    // -----------------------------------------------------------------------
    // Step 2: Priority 1 — Persian RTL Orientation & No Mirroring Verification
    // -----------------------------------------------------------------------
    console.log('\n--- Step 2: Priority 1 — Persian RTL Orientation Verification ---');

    const htmlDir = await page.$eval('html', el => el.getAttribute('dir'));
    assert(htmlDir === 'rtl', 'Document direction is dir="rtl"');

    // Inspect CSS transforms on containers
    const transformAudit = await page.evaluate(() => {
      const selectors = [
        'html',
        'body',
        '.sidebar',
        '.main-content',
        '.app-title',
        '#viewTitle',
        '.task-card',
        '.add-task-bar',
        '.nav-item'
      ];
      const results = {};
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const style = window.getComputedStyle(el);
          results[sel] = {
            transform: style.transform,
            direction: style.direction
          };
        }
      }
      return results;
    });

    for (const [sel, info] of Object.entries(transformAudit)) {
      const isMirrored = info.transform.includes('matrix(-1') || info.transform.includes('scaleX(-1)');
      assert(!isMirrored, `Selector ${sel} has normal orientation (transform: ${info.transform})`);
    }

    // Capture Screenshot 1: Main Dashboard with correctly oriented Persian text
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_main_dashboard.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_main_dashboard.png');

    // -----------------------------------------------------------------------
    // Step 3: Additional Priority — Search Icon Dimensions & Alignment
    // -----------------------------------------------------------------------
    console.log('\n--- Step 3: Search Icon Sizing & RTL Alignment ---');
    const searchIconMetrics = await page.evaluate(() => {
      const searchBox = document.querySelector('.search-box');
      const iconWrapper = searchBox?.querySelector('.app-icon');
      const svg = iconWrapper?.querySelector('svg');
      if (!iconWrapper || !svg) return null;
      const boxRect = searchBox.getBoundingClientRect();
      const iconRect = iconWrapper.getBoundingClientRect();
      return {
        boxWidth: boxRect.width,
        iconWidth: iconRect.width,
        iconHeight: iconRect.height,
        iconRight: boxRect.right - iconRect.right
      };
    });

    assert(searchIconMetrics !== null, 'Search icon found in sidebar');
    if (searchIconMetrics) {
      assert(
        searchIconMetrics.iconWidth >= 16 && searchIconMetrics.iconWidth <= 24,
        `Search icon width is controlled (~18-20px, actual: ${searchIconMetrics.iconWidth}px)`
      );
      assert(
        searchIconMetrics.iconHeight >= 16 && searchIconMetrics.iconHeight <= 24,
        `Search icon height is controlled (~18-20px, actual: ${searchIconMetrics.iconHeight}px)`
      );
    }

    // Focus search input and capture screenshot
    await page.focus('#searchInput');
    await page.type('#searchInput', 'تسک');
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_search_control.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_search_control.png');
    // Clear search
    await page.$eval('#searchInput', el => el.value = '');
    await page.evaluate(() => {
      const input = document.querySelector('#searchInput');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // -----------------------------------------------------------------------
    // Step 4: Priority 2 & 3 — Recurrence Modal Redesign & Styled AppSelect
    // -----------------------------------------------------------------------
    console.log('\n--- Step 4: Priority 2 & 3 — Recurrence Modal & Dropdowns ---');

    // Open recurrence modal from Add Task Bar
    await page.click('#newTaskRecurrenceBtn');
    await page.waitForSelector('.recurrence-modal', { visible: true });
    assert(await page.$('.recurrence-modal') !== null, 'Recurrence modal opened');

    // 4.1 Daily Mode
    await page.click('#recurrencePatternSelect .app-select-trigger');
    await page.waitForSelector('#select-opt-daily', { visible: true });

    // Capture Screenshot 7: Styled recurrence dropdown opened
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_dropdown_recurrence.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_dropdown_recurrence.png');

    await page.click('#select-opt-daily');
    await new Promise(r => setTimeout(r, 200));

    // In daily mode, interval is visible, weekday chips are hidden
    const isDailyWeekdayVisible = await page.evaluate(() => {
      return document.querySelector('.weekday-grid') !== null;
    });
    assert(!isDailyWeekdayVisible, 'Weekday chips are hidden in Daily mode');

    // Capture Screenshot 2: Recurrence modal — Daily mode
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_recurrence_daily.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_recurrence_daily.png');

    // 4.2 Weekly Mode
    await page.click('#recurrencePatternSelect .app-select-trigger');
    await page.click('#select-opt-weekly');
    await new Promise(r => setTimeout(r, 200));

    const isWeeklyWeekdayVisible = await page.evaluate(() => {
      return document.querySelector('.weekday-grid') !== null;
    });
    assert(isWeeklyWeekdayVisible, 'Weekday chips (7 days) are visible in Weekly mode');

    // Select some weekdays (e.g. Saturday & Monday)
    await page.evaluate(() => {
      const chips = document.querySelectorAll('.weekday-chip');
      if (chips[0]) chips[0].click(); // Shanbeh
      if (chips[2]) chips[2].click(); // Doshanbeh
    });

    // Capture Screenshot 3: Recurrence modal — Weekly mode
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_recurrence_weekly.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_recurrence_weekly.png');

    // 4.3 Monthly Mode
    await page.click('#recurrencePatternSelect .app-select-trigger');
    await page.click('#select-opt-monthly');
    await new Promise(r => setTimeout(r, 200));

    const isMonthlyNoteVisible = await page.evaluate(() => {
      return document.querySelector('.calendar-note') !== null;
    });
    assert(isMonthlyNoteVisible, 'Jalali calendar note is visible in Monthly mode');

    // Capture Screenshot 4: Recurrence modal — Monthly mode
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_recurrence_monthly.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_recurrence_monthly.png');

    // 4.4 Custom Mode
    await page.click('#recurrencePatternSelect .app-select-trigger');
    await page.click('#select-opt-custom');
    await new Promise(r => setTimeout(r, 200));

    // Capture Screenshot 5: Recurrence modal — Custom mode
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_recurrence_custom.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_recurrence_custom.png');

    // Close recurrence modal
    await page.click('.btn-close');
    await new Promise(r => setTimeout(r, 300));

    // -----------------------------------------------------------------------
    // Step 5: Recurrence Action Modal
    // -----------------------------------------------------------------------
    console.log('\n--- Step 5: Recurrence Action Dialog ---');
    // Open action modal via direct state trigger in browser
    await page.evaluate(() => {
      // Find tasks store or dispatch action modal
      const app = document.querySelector('#app')?.__vue_app__;
      if (app) {
        const store = app.config.globalProperties.$pinia?.state?.value?.tasks;
        if (store) {
          store.recurrenceActionModalOpen = true;
          store.recurrenceActionTask = {
            id: 9999,
            title: 'برنامه تکراری نمونه',
            occurrence_date: '2026-10-30'
          };
          store.recurrenceActionMode = 'edit';
        }
      }
    });

    await page.waitForSelector('.recurrence-action-modal', { timeout: 3000 }).catch(() => {});
    const actionModalExists = await page.$('.recurrence-action-modal');
    if (actionModalExists) {
      // Capture Screenshot 6: Recurrence action dialog
      await page.screenshot({
        path: path.join(screenshotsDir, 'phase5_1_recurrence_action_modal.png'),
        fullPage: false
      });
      console.log('📸 Captured: phase5_1_recurrence_action_modal.png');
      await page.click('.btn-cancel');
      await new Promise(r => setTimeout(r, 300));
    }

    // -----------------------------------------------------------------------
    // Step 6: Task Detail Drawer & Dropdowns (Category, Reminder Offset)
    // -----------------------------------------------------------------------
    console.log('\n--- Step 6: Detail Drawer Dropdowns (Category & Reminder) ---');

    let taskCard = await page.$('.task-card');
    if (!taskCard) {
      await page.evaluate(async () => {
        const store = window.__PINIA__?._s?.get('tasks');
        if (store) {
          const d = new Date();
          const localToday = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          await store.addTask({
            title: 'کار آزمایشی تنظیمات دراور',
            period: 'daily',
            dueDate: localToday,
            due_date: localToday,
            alarmEnabled: true,
            alarm_enabled: true,
            dueTime: '14:30',
            due_time: '14:30'
          });
        }
      });
      await page.waitForSelector('.task-card', { timeout: 8000 });
      taskCard = await page.$('.task-card');
    }
    assert(taskCard !== null, 'Task card rendered in list');
    if (taskCard) {
      await page.evaluate(() => {
        const first = document.querySelector('.task-card');
        if (first) first.click();
      });
      await page.waitForSelector('.detail-drawer.open', { visible: true, timeout: 6000 });
      assert(await page.$('.detail-drawer.open') !== null, 'Detail drawer opened');

      // Enable alarm to show reminder offset dropdown
      const isAlarmActive = await page.evaluate(() => {
        const btn = document.querySelector('.alarm-toggle-btn');
        return btn?.classList.contains('active');
      });
      if (!isAlarmActive) {
        await page.click('.alarm-toggle-btn');
        await new Promise(r => setTimeout(r, 400));
      }

      // Open reminder offset dropdown
      const reminderSelects = await page.$$('.drawer-row .app-select-trigger');
      if (reminderSelects.length > 0) {
        await reminderSelects[0].click();
        await new Promise(r => setTimeout(r, 200));

        // Capture Screenshot 9: Reminder dropdown opened
        await page.screenshot({
          path: path.join(screenshotsDir, 'phase5_1_dropdown_reminder.png'),
          fullPage: false
        });
        console.log('📸 Captured: phase5_1_dropdown_reminder.png');
        // Close dropdown
        await page.click('.drawer-header');
        await new Promise(r => setTimeout(r, 200));
      }

      // Open category dropdown in drawer
      if (reminderSelects.length > 1) {
        await reminderSelects[1].click();
        await new Promise(r => setTimeout(r, 200));

        // Capture Screenshot 8: Category dropdown opened
        await page.screenshot({
          path: path.join(screenshotsDir, 'phase5_1_dropdown_category.png'),
          fullPage: false
        });
        console.log('📸 Captured: phase5_1_dropdown_category.png');
        // Close dropdown
        await page.click('.drawer-header');
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // -----------------------------------------------------------------------
    // Step 7: Dark Mode Recurrence Modal
    // -----------------------------------------------------------------------
    console.log('\n--- Step 7: Dark Mode Recurrence Modal ---');
    // Ensure drawer is closed
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) store.selectedTaskId = null;
    });
    await new Promise(r => setTimeout(r, 400));

    // Toggle dark mode via store
    await page.evaluate(() => {
      const auth = window.__PINIA__?._s?.get('auth');
      if (auth) auth.applyDarkMode(true);
    });
    await new Promise(r => setTimeout(r, 400));

    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-mode') === 'dark' || document.documentElement.classList.contains('dark');
    });
    assert(isDarkMode, 'Dark mode activated');

    // Open recurrence modal in dark mode
    await page.evaluate(() => document.querySelector('#newTaskRecurrenceBtn')?.click());
    await page.waitForSelector('.recurrence-modal', { visible: true });

    // Capture Screenshot 10: Dark-mode recurrence modal
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_recurrence_dark.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_recurrence_dark.png');

    await page.evaluate(() => document.querySelector('.recurrence-modal .btn-close')?.click());
    await new Promise(r => setTimeout(r, 400));

    // Switch back to light mode for standard mobile tests
    await page.evaluate(() => {
      const auth = window.__PINIA__?._s?.get('auth');
      if (auth) auth.applyDarkMode(false);
    });
    await new Promise(r => setTimeout(r, 300));

    // -----------------------------------------------------------------------
    // Step 8: Mobile Responsiveness Verification (375 × 812)
    // -----------------------------------------------------------------------
    console.log('\n--- Step 8: Mobile Viewport Verification (375 × 812) ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 400));

    // 8.1 Mobile Recurrence Modal
    await page.evaluate(() => document.querySelector('#newTaskRecurrenceBtn')?.click());
    await page.waitForSelector('.recurrence-modal', { visible: true });

    // Check no horizontal scroll in modal
    const modalOverflow = await page.evaluate(() => {
      const modal = document.querySelector('.recurrence-modal');
      return modal ? modal.scrollWidth > modal.clientWidth : false;
    });
    assert(!modalOverflow, 'Mobile recurrence modal fits 375px without horizontal overflow');

    // Capture Screenshot 11: Mobile recurrence modal
    await page.screenshot({
      path: path.join(screenshotsDir, 'phase5_1_recurrence_mobile.png'),
      fullPage: false
    });
    console.log('📸 Captured: phase5_1_recurrence_mobile.png');

    await page.evaluate(() => document.querySelector('.recurrence-modal .btn-close')?.click());
    await new Promise(r => setTimeout(r, 400));

    // 8.2 Mobile Task Detail Drawer
    const mobileTaskCard = await page.$('.task-card');
    if (mobileTaskCard) {
      await mobileTaskCard.click();
      await page.waitForSelector('.detail-drawer.open', { visible: true });

      // Capture Screenshot 12: Mobile task detail drawer
      await page.screenshot({
        path: path.join(screenshotsDir, 'phase5_1_drawer_mobile.png'),
        fullPage: false
      });
      console.log('📸 Captured: phase5_1_drawer_mobile.png');

      await page.evaluate(() => {
        const store = window.__PINIA__?._s?.get('tasks');
        if (store) store.selectedTaskId = null;
      });
      await new Promise(r => setTimeout(r, 300));
    }

    // -----------------------------------------------------------------------
    // Step 9: Multi-Viewport Responsive Matrix (768, 1280, 1440)
    // -----------------------------------------------------------------------
    console.log('\n--- Step 9: Multi-Viewport Matrix (768, 1280, 1440) ---');
    const viewports = [
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'desktop_1280', width: 1280, height: 800 },
      { name: 'desktop_1440', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 200));

      const hasHorizOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasHorizOverflow, `No horizontal page overflow at ${vp.width}x${vp.height}`);
    }

    console.log('\n======================================================');
    console.log(`Phase 5.1 Verification Finished: ${checksPassed} PASSED, ${checksFailed} FAILED`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Fatal error during test:', err);
    checksFailed++;
  } finally {
    await browser.close();
  }
}

runPhase51StabilizationTest();
