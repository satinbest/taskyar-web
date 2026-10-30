import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const PORT = 8092;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.resolve('docs/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function safeFetch(urlStr) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const req = http.get({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      headers: { 'Connection': 'close' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: { get: (name) => res.headers[name.toLowerCase()] },
          text: async () => data,
          json: async () => JSON.parse(data)
        });
      });
    });
    req.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('================================================================================');
  console.log('TaskYar Web 2.0 — Recurrence Bar, Modal, Date/Time Pickers & Mobile UX Suite');
  console.log('================================================================================\n');

  // 1. Start local PHP test server
  console.log(`Starting local Laravel test server on port ${PORT}...`);
  const serverProcess = spawn('php', ['artisan', 'serve', `--port=${PORT}`], {
    cwd: process.cwd(),
    stdio: 'ignore',
    detached: false
  });

  let serverReady = false;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await safeFetch(`${BASE_URL}/login`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // Retry
    }
    await sleep(400);
  }

  if (!serverReady) {
    serverProcess.kill();
    throw new Error(`Failed to connect to local Laravel server on port ${PORT}`);
  }
  console.log('Local test server is running.\n');

  let totalTests = 0;
  let passedTests = 0;
  const testResults = [];

  function assert(title, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${title} ${extraInfo}`);
      testResults.push({ title, status: 'PASS', info: extraInfo });
    } else {
      console.error(`  ✗ [FAIL] ${title} ${extraInfo}`);
      testResults.push({ title, status: 'FAIL', info: extraInfo });
    }
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 850 });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(String(err)));

    // -------------------------------------------------------------------------
    // TEST 1: Register and login to workspace
    // -------------------------------------------------------------------------
    console.log('--- 1. Authentication & Workspace Setup ---');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    const userEmail = `qa_recurrence_${Date.now()}@taskyar.local`;
    await page.type('#nameInput', 'مهندس تست تکرار');
    await page.type('#emailInput', userEmail);
    await page.type('#passwordInput', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/app'), { timeout: 10000 });
    assert('Registration successful & redirected to /app', page.url().includes('/app'));

    await page.waitForSelector('.add-task-bar', { timeout: 8000 });
    assert('Add Task Bar is rendered', true);

    // -------------------------------------------------------------------------
    // TEST 2: Inspect Recurrence Button in Bottom Bar
    // -------------------------------------------------------------------------
    console.log('\n--- 2. AddTaskBar Recurrence Button UI & State ---');
    const recurrenceBtn = await page.$('#newTaskRecurrenceBtn');
    assert('Recurrence button exists in AddTaskBar', recurrenceBtn !== null);

    const btnText = await page.$eval('#newTaskRecurrenceBtn .recurrence-text', el => el.textContent.trim());
    assert('Recurrence button displays Persian label "تکرار"', btnText === 'تکرار', `(Got: "${btnText}")`);

    const hasSvgIcon = await page.$eval('#newTaskRecurrenceBtn svg', el => {
      const rect = el.getBoundingClientRect();
      const hasPaths = el.querySelectorAll('path').length > 0;
      return rect.width > 0 && rect.height > 0 && hasPaths;
    });
    assert('Recurrence button has rendered SVG icon with visible paths', hasSvgIcon);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_recurrence_button_normal.png') });

    // -------------------------------------------------------------------------
    // TEST 3: Open Recurrence Modal & Spacing Audit
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Recurrence Modal Spacing & Layout Audit ---');
    await page.click('#newTaskRecurrenceBtn');
    await page.waitForSelector('.recurrence-modal', { visible: true, timeout: 3000 });
    assert('Recurrence modal opened on button click', true);

    const modalTitle = await page.$eval('#recurrenceModalTitle', el => el.textContent.trim());
    assert('Recurrence modal has Persian title "تنظیم تکرار برنامه"', modalTitle === 'تنظیم تکرار برنامه');

    const modalBodyStyle = await page.$eval('.recurrence-modal .modal-body', el => {
      const cs = window.getComputedStyle(el);
      return {
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingRight: cs.paddingRight,
        paddingLeft: cs.paddingLeft
      };
    });
    assert('Modal body has generous padding (>= 20px)', parseInt(modalBodyStyle.paddingTop) >= 20);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_recurrence_modal_initial.png') });

    // -------------------------------------------------------------------------
    // TEST 4: AppSelect Floating UI Teleport & Smart Flip
    // -------------------------------------------------------------------------
    console.log('\n--- 4. AppSelect Teleport, Placement & Z-Index ---');
    await page.click('#recurrencePatternSelect .app-select-trigger');
    await page.waitForSelector('.app-select-menu', { visible: true, timeout: 2000 });

    const isTeleportedToBody = await page.evaluate(() => {
      const menu = document.querySelector('.app-select-menu');
      return menu && menu.parentElement === document.body;
    });
    assert('AppSelect dropdown is teleported directly to <body>', isTeleportedToBody);

    const menuZIndex = await page.$eval('.app-select-menu', el => {
      return parseInt(window.getComputedStyle(el).zIndex, 10);
    });
    assert('AppSelect dropdown z-index is 4500 (above modal 2000)', menuZIndex >= 4500, `(z-index: ${menuZIndex})`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_recurrence_dropdown_teleported.png') });

    // Select 'weekly' option
    await page.click('#select-opt-weekly');
    await sleep(200);

    const selectedLabel = await page.$eval('#recurrencePatternSelect .app-select-label', el => el.textContent.trim());
    assert('Selected frequency is "هفتگی"', selectedLabel === 'هفتگی');

    // -------------------------------------------------------------------------
    // TEST 5: Weekdays Selection Grid & Live Summary
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Weekday Chips & Dynamic Summary ---');
    await page.waitForSelector('.weekday-grid', { visible: true });
    const weekdayChipsCount = await page.$$eval('.weekday-chip', els => els.length);
    assert('All 7 Persian weekdays are displayed (شنبه تا جمعه)', weekdayChipsCount === 7);

    // Click Saturday (0), Monday (2), Wednesday (4)
    const chips = await page.$$('.weekday-chip');
    await chips[0].click(); // شنبه
    await chips[2].click(); // دوشنبه
    await chips[4].click(); // چهارشنبه
    await sleep(200);

    const activeChipsCount = await page.$$eval('.weekday-chip.is-active', els => els.length);
    assert('3 weekdays are marked active', activeChipsCount === 3);

    const summaryFa = await page.$eval('.summary-text', el => el.textContent.trim());
    assert('Summary contains weekly pattern and chosen days', summaryFa.includes('هر هفته') && summaryFa.includes('شنبه') && summaryFa.includes('دوشنبه') && summaryFa.includes('چهارشنبه'), `(Summary: "${summaryFa}")`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_recurrence_weekdays_selected.png') });

    // -------------------------------------------------------------------------
    // TEST 6: Jalali DatePicker Above Modal with z-index 4500
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Jalali DatePicker Rendered Above Modal ---');
    // Change end condition to until_date
    await page.click('#recurrenceEndTypeSelect .app-select-trigger');
    await page.waitForSelector('#select-opt-until_date', { visible: true });
    await page.click('#select-opt-until_date');
    await sleep(200);

    await page.waitForSelector('.end-condition-box .date-picker-input', { visible: true });
    assert('JalaliDatePicker input is visible inside end condition box', true);

    // Open DatePicker inside modal
    await page.click('.end-condition-box .date-picker-input');
    await page.waitForSelector('.jdp-popup.show', { visible: true, timeout: 2000 });

    const jdpZIndex = await page.$eval('.jdp-popup.show', el => {
      return parseInt(window.getComputedStyle(el).zIndex, 10);
    });
    assert('JalaliDatePicker popup z-index is 4500 (ABOVE modal backdrop 2000)', jdpZIndex >= 4500, `(z-index: ${jdpZIndex})`);

    const modalBackdropZIndex = await page.$eval('.modal-backdrop', el => {
      return parseInt(window.getComputedStyle(el).zIndex, 10);
    });
    assert('DatePicker zIndex (4500) > ModalBackdrop zIndex (2000)', jdpZIndex > modalBackdropZIndex, `(${jdpZIndex} > ${modalBackdropZIndex})`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_recurrence_datepicker_above_modal.png') });

    // Select day in the calendar
    const dayBtn = await page.$('.jdp-day:not(.jdp-empty)');
    if (dayBtn) {
      await dayBtn.click();
      await sleep(200);
    }

    // Check datepicker closed but RecurrenceModal STAYS open
    const isDatePickerStillOpen = await page.$('.jdp-popup.show') !== null;
    const isRecurrenceModalStillOpen = await page.$('.recurrence-modal') !== null;
    assert('DatePicker closed after selection', !isDatePickerStillOpen);
    assert('RecurrenceModal remains open after date selection', isRecurrenceModalStillOpen);

    // -------------------------------------------------------------------------
    // TEST 7: Save Recurrence & Verify Active Button in AddTaskBar
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Save Recurrence & Bottom Bar Active State ---');
    await page.click('.recurrence-modal .btn-save');
    await sleep(300);

    const isModalClosed = await page.$('.recurrence-modal') === null;
    assert('RecurrenceModal closed after clicking Save', isModalClosed);

    const btnLabelAfter = await page.$eval('#newTaskRecurrenceBtn .recurrence-text', el => el.textContent.trim());
    assert('Recurrence button label now displays "هفتگی"', btnLabelAfter === 'هفتگی', `(Got: "${btnLabelAfter}")`);

    const hasActiveDot = await page.$('#newTaskRecurrenceBtn .recurrence-active-dot') !== null;
    assert('Recurrence button has active purple dot indicator', hasActiveDot);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_addtaskbar_recurrence_active.png') });

    // Submit a task with this recurrence
    await page.type('#newTaskInput', 'تست کار تکرارشونده هفتگی');
    await page.click('.btn-add');
    await sleep(700);

    // Verify task is added to list and has recurrence indicator
    await page.waitForSelector('.task-title', { timeout: 3000 });
    const taskTitleAdded = await page.$eval('.task-title', el => el.textContent.trim()).catch(() => '');
    assert('Recurring task was submitted and rendered in task list', taskTitleAdded.includes('تست کار تکرارشونده هفتگی'), `(Task Title: "${taskTitleAdded}")`);

    const hasCardRecurrenceIcon = await page.$('.task-card [title*="تکرار"], .task-card svg') !== null;
    assert('TaskCard displays recurrence indicator', hasCardRecurrenceIcon);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_recurring_task_in_list.png') });

    // -------------------------------------------------------------------------
    // TEST 8: PersianTimePicker Interaction
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Persian TimePicker Controls & Interaction ---');
    await page.$eval('#newTaskTime', el => el.click());
    await page.waitForSelector('.time-picker-floating-panel', { visible: true, timeout: 3000 });

    const timeZIndex = await page.$eval('.time-picker-floating-panel', el => {
      return parseInt(window.getComputedStyle(el).zIndex, 10);
    });
    assert('PersianTimePicker popup z-index is 4500', timeZIndex >= 4500, `(z-index: ${timeZIndex})`);

    // Switch between hour and minute
    const hourBtns = await page.$$('.time-grid-hours .time-grid-btn');
    assert('24-hour grid contains 24 selectable buttons', hourBtns.length === 24);

    // Click hour 14 (idx 14)
    await hourBtns[14].click();
    await sleep(200);

    // Minute grid should now be active
    const minuteBtns = await page.$$('.time-grid-minutes .time-grid-btn');
    assert('5-minute interval grid contains 12 selectable buttons', minuteBtns.length === 12);
    await minuteBtns[6].click(); // 30 mins
    await sleep(200);

    await page.click('.btn-panel-confirm');
    await sleep(200);

    const timeVal = await page.$eval('#newTaskTime .time-picker-text', el => el.textContent.trim());
    assert('TimePicker displays selected Persian time (۱۴:۳۰)', timeVal.includes('۱۴:۳۰') || timeVal.includes('14:30'), `(Got: "${timeVal}")`);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_timepicker_selected.png') });

    // -------------------------------------------------------------------------
    // TEST 9: Mobile Viewport Responsiveness Audit Across 5 Viewports
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Mobile Viewport Responsiveness Audit ---');
    const viewports = [
      { name: '430px (iPhone 14 Pro Max)', width: 430, height: 932 },
      { name: '390px (iPhone 12/13/14)', width: 390, height: 844 },
      { name: '375px (iPhone SE/Standard)', width: 375, height: 667 },
      { name: '360px (Android Compact)', width: 360, height: 740 },
      { name: '320px (Ultra Compact)', width: 320, height: 568 }
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(300);

      // Scroll bottom bar into view if needed
      await page.evaluate(() => {
        const btn = document.querySelector('#newTaskRecurrenceBtn');
        if (btn) btn.scrollIntoView({ block: 'nearest' });
      });

      // Open Recurrence modal in mobile viewport
      await page.evaluate(() => document.querySelector('#newTaskRecurrenceBtn').click());
      await page.waitForSelector('.recurrence-modal', { visible: true });
      await sleep(400); // allow animation to settle

      const isMobileSheet = await page.$eval('.recurrence-modal', el => {
        const rect = el.getBoundingClientRect();
        return rect.width <= window.innerWidth && Math.abs(rect.bottom - window.innerHeight) <= 4;
      });
      assert(`[${vp.name}] Recurrence modal presents as mobile bottom-sheet at bottom of screen`, isMobileSheet);

      // Check handle bar
      const hasHandle = await page.$('.sheet-handle-bar') !== null;
      assert(`[${vp.name}] Mobile bottom-sheet has drag handle indicator`, hasHandle);

      if (vp.width === 375) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_mobile_recurrence_bottomsheet_375.png') });
      }

      // Close modal
      await page.evaluate(() => document.querySelector('.btn-close').click());
      await sleep(350);

      // Open DatePicker in mobile viewport
      await page.evaluate(() => {
        const input = document.querySelector('#newTaskDate');
        if (input) {
          input.scrollIntoView({ block: 'nearest', inline: 'center' });
          input.click();
        }
      });
      await page.waitForSelector('.jdp-popup.show', { visible: true, timeout: 3000 });
      await sleep(300);

      const isDateMobileSheet = await page.$eval('.jdp-popup.show', el => {
        return el.classList.contains('is-mobile-sheet');
      });
      assert(`[${vp.name}] JalaliDatePicker presents as mobile bottom sheet (.is-mobile-sheet)`, isDateMobileSheet);

      const hasDateBackdrop = await page.$('.jdp-backdrop') !== null;
      assert(`[${vp.name}] JalaliDatePicker has semi-transparent mobile backdrop`, hasDateBackdrop);

      if (vp.width === 375) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_mobile_datepicker_bottomsheet_375.png') });
      }

      // Close datepicker via backdrop or link
      await page.evaluate(() => {
        const bd = document.querySelector('.jdp-backdrop');
        if (bd) bd.click();
        else {
          const closeBtn = document.querySelector('.jdp-link.muted');
          if (closeBtn) closeBtn.click();
        }
      });
      await sleep(350);

      // Open TimePicker in mobile viewport
      await page.evaluate(() => {
        const btn = document.querySelector('#newTaskTime');
        if (btn) {
          btn.scrollIntoView({ block: 'nearest', inline: 'center' });
          btn.click();
        }
      });
      await page.waitForSelector('.time-picker-floating-panel', { visible: true, timeout: 3000 });
      await sleep(300);

      const isTimeMobileSheet = await page.$eval('.time-picker-floating-panel', el => {
        return el.classList.contains('is-mobile-sheet');
      });
      assert(`[${vp.name}] PersianTimePicker presents as mobile bottom sheet (.is-mobile-sheet)`, isTimeMobileSheet);

      if (vp.width === 375) {
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_mobile_timepicker_bottomsheet_375.png') });
      }

      await page.evaluate(() => {
        const btn = document.querySelector('.time-panel-close-btn');
        if (btn) btn.click();
      });
      await sleep(300);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Escape Key Overlay Hierarchy Test
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Escape Key Overlay Hierarchy Test ---');
    await page.setViewport({ width: 1280, height: 850 });
    await sleep(300);

    // Open Recurrence modal
    await page.click('#newTaskRecurrenceBtn');
    await page.waitForSelector('.recurrence-modal', { visible: true });

    // Set frequency to daily and endType to until_date
    await page.click('#recurrencePatternSelect .app-select-trigger');
    await page.waitForSelector('#select-opt-daily', { visible: true });
    await page.click('#select-opt-daily');
    await sleep(200);

    await page.click('#recurrenceEndTypeSelect .app-select-trigger');
    await page.waitForSelector('#select-opt-until_date', { visible: true });
    await page.click('#select-opt-until_date');
    await sleep(200);

    // Open DatePicker inside modal
    await page.click('.end-condition-box .date-picker-input');
    await page.waitForSelector('.jdp-popup.show', { visible: true });

    // Press Escape once
    await page.keyboard.press('Escape');
    await sleep(300);

    const isDatePickerClosed = await page.$('.jdp-popup.show') === null;
    const isModalOpenAfterEsc1 = await page.$('.recurrence-modal') !== null;
    assert('1st Escape closes child JalaliDatePicker', isDatePickerClosed);
    assert('RecurrenceModal STAYS OPEN after 1st Escape', isModalOpenAfterEsc1);

    // Press Escape second time
    await page.keyboard.press('Escape');
    await sleep(300);

    const isModalClosedAfterEsc2 = await page.$('.recurrence-modal') === null;
    assert('2nd Escape closes parent RecurrenceModal', isModalClosedAfterEsc2);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('================================================================================\n');

  } finally {
    if (browser) await browser.close();
    serverProcess.kill();
  }
}

runVerification().catch(err => {
  console.error('\nVerification failed with exception:', err);
  process.exit(1);
});
