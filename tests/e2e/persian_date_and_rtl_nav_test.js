import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'C:/Users/Hossein/.gemini/antigravity-ide/brain/c1fb8e4a-9951-49d4-9deb-ae472df51094/screenshots';

async function runPersianDateAndRtlNavTest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  const log = (step, passed, note = '') => {
    results.push({ step, passed, note });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${step}${note ? ' - ' + note : ''}`);
  };

  const consoleErrors = [];

  console.log('Launching Chrome browser for Persian Creation Date & RTL Navigation Test...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  try {
    // 1. Authenticate / Register a user
    const testEmail = `navtest_${Date.now()}@taskyar.ir`;
    await page.goto(`${APP_URL}/register`, { waitUntil: 'networkidle0' });
    await page.type('#nameInput', 'کاربر تست نویگیشن');
    await page.type('#emailInput', testEmail);
    await page.type('#passwordInput', 'Secret123!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.main-content', { timeout: 10000 });
    log('1. User Registration & Redirect to /app', true, `URL: ${page.url()}`);

    // Wait for task cards
    await page.waitForSelector('.task-card', { timeout: 5000 });

    // =========================================================================
    // PART 1: Persian Jalali Creation Date in Detail Drawer
    // =========================================================================
    // Click on the first task card to open Detail Drawer
    await page.click('.task-card');
    await page.waitForSelector('.detail-drawer.open', { timeout: 5000 });

    const createdAtText = await page.$eval('.drawer-created-at', el => el.innerText.trim());
    const createdAtTitle = await page.$eval('.drawer-created-at', el => el.getAttribute('title') || '');
    log('2a. Detail Drawer Opened & Creation Date Read', true, `Text: "${createdAtText}", Title: "${createdAtTitle}"`);

    // Verify format: "ایجاد شده: ۴ آبان ۱۴۰۵"
    const hasJalaliKeyword = createdAtText.startsWith('ایجاد شده:');
    const hasPersianDigits = /[۰-۹]/.test(createdAtText);
    const hasNoEnglishDigits = !/[0-9]/.test(createdAtText);
    const hasPersianMonth = /(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/.test(createdAtText);

    log('2b. Creation Date Has "ایجاد شده:" Prefix', hasJalaliKeyword, createdAtText);
    log('2c. Creation Date Uses Persian Digits (۰-۹)', hasPersianDigits, createdAtText);
    log('2d. Creation Date Contains NO English Digits', hasNoEnglishDigits, createdAtText);
    log('2e. Creation Date Uses Jalali Month Name', hasPersianMonth, createdAtText);

    // Save screenshot of Detail Drawer with Persian Creation Date
    const drawerScreenshotPath = path.join(SCREENSHOT_DIR, 'persian_creation_date_drawer.png');
    const drawerEl = await page.$('.detail-drawer');
    await drawerEl.screenshot({ path: drawerScreenshotPath });
    log('2f. Screenshot Saved: Detail Drawer Creation Date', fs.existsSync(drawerScreenshotPath), drawerScreenshotPath);

    // Close the drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.btn-drawer-close');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // =========================================================================
    // PART 2: Week Board RTL Navigation
    // =========================================================================
    // Switch to Week Board
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.includes('برد ۷ روز هفته'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.week-board-container.active', { timeout: 5000 });
    log('3a. Navigated to Week Board', true);

    const initialWeekRange = await page.$eval('.week-range-label', el => el.innerText.trim());
    log('3b. Initial Week Range Read', true, initialWeekRange);

    // Verify positions of right and left buttons in week toolbar
    const weekNavBtns = await page.$$eval('.week-toolbar .month-nav-btn', btns => btns.map(b => {
      const rect = b.getBoundingClientRect();
      const svgPath = b.querySelector('path')?.getAttribute('d') || '';
      return {
        title: b.getAttribute('title'),
        ariaLabel: b.getAttribute('aria-label'),
        x: rect.x,
        svgPath
      };
    }));

    // In RTL, 1st button is on the RIGHT (higher x than left button)
    const rightWeekBtn = weekNavBtns[0]; // prev-btn
    const leftWeekBtn = weekNavBtns[1];  // next-btn
    const rightIsPrev = rightWeekBtn.title === 'هفته قبل' && rightWeekBtn.x > leftWeekBtn.x;
    const rightPointsRight = rightWeekBtn.svgPath.includes('M9 18l6-6-6-6') || rightWeekBtn.svgPath.includes('14.4302'); // Chevron/arrow pointing right
    const leftPointsLeft = leftWeekBtn.svgPath.includes('M15 18l-6-6 6-6') || leftWeekBtn.svgPath.includes('9.57'); // Chevron/arrow pointing left

    log('3c. Right Week Button is "هفته قبل" & Positioned on the Right', rightIsPrev, `Right X: ${rightWeekBtn.x}, Left X: ${leftWeekBtn.x}`);
    log('3d. Right Week Button Has Right-Pointing Chevron (›)', rightPointsRight);
    log('3e. Left Week Button Has Left-Pointing Chevron (‹)', leftPointsLeft);

    // Click Right Button (هفته قبل) -> Should move 7 days backward
    await page.click('.week-toolbar .month-nav-btn.prev-btn');
    await new Promise(r => setTimeout(r, 300));
    const prevWeekRange = await page.$eval('.week-range-label', el => el.innerText.trim());
    log('3f. Clicked Right Button (هفته قبل) -> Moved to Earlier Week', prevWeekRange !== initialWeekRange, `From: "${initialWeekRange}" To: "${prevWeekRange}"`);

    // Verify "این هفته" button appears and returns to current week
    await page.waitForSelector('.week-toolbar .btn-add', { timeout: 2000 });
    await page.click('.week-toolbar .btn-add');
    await new Promise(r => setTimeout(r, 300));
    const resetWeekRange = await page.$eval('.week-range-label', el => el.innerText.trim());
    log('3g. Clicked "این هفته" Button -> Returned to Current Week', resetWeekRange === initialWeekRange, resetWeekRange);

    // Click Left Button (هفته بعد) -> Should move 7 days forward
    await page.click('.week-toolbar .month-nav-btn.next-btn');
    await new Promise(r => setTimeout(r, 300));
    const nextWeekRange = await page.$eval('.week-range-label', el => el.innerText.trim());
    log('3h. Clicked Left Button (هفته بعد) -> Moved to Later Week', nextWeekRange !== initialWeekRange, `Next Range: "${nextWeekRange}"`);

    // Reset back to current week
    await page.click('.week-toolbar .btn-add');
    await new Promise(r => setTimeout(r, 300));

    // Screenshot Week Board
    const weekScreenshotPath = path.join(SCREENSHOT_DIR, 'week_board_navigated.png');
    await page.screenshot({ path: weekScreenshotPath });
    log('3i. Screenshot Saved: Week Board Navigation', fs.existsSync(weekScreenshotPath), weekScreenshotPath);

    // =========================================================================
    // PART 3: Month Board RTL Navigation
    // =========================================================================
    // Switch to Month Board
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.includes('برد ۳۰ روزه'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.month-board-container.active', { timeout: 5000 });
    log('4a. Navigated to Month Board', true);

    const initialMonthTitle = await page.$eval('.month-title', el => el.innerText.trim());
    log('4b. Initial Month Title Read', true, initialMonthTitle);

    // Verify positions of right and left buttons in month toolbar
    const monthNavBtns = await page.$$eval('.month-toolbar .month-nav-btn', btns => btns.map(b => {
      const rect = b.getBoundingClientRect();
      const svgPath = b.querySelector('path')?.getAttribute('d') || '';
      return {
        title: b.getAttribute('title'),
        ariaLabel: b.getAttribute('aria-label'),
        x: rect.x,
        svgPath
      };
    }));

    const rightMonthBtn = monthNavBtns[0]; // prev-btn
    const leftMonthBtn = monthNavBtns[1];  // next-btn
    const rightMonthIsPrev = rightMonthBtn.title === 'ماه قبل' && rightMonthBtn.x > leftMonthBtn.x;
    const rightMonthPointsRight = rightMonthBtn.svgPath.includes('M9 18l6-6-6-6') || rightMonthBtn.svgPath.includes('14.4302');
    const leftMonthPointsLeft = leftMonthBtn.svgPath.includes('M15 18l-6-6 6-6') || leftMonthBtn.svgPath.includes('9.57');

    log('4c. Right Month Button is "ماه قبل" & Positioned on the Right', rightMonthIsPrev, `Right X: ${rightMonthBtn.x}, Left X: ${leftMonthBtn.x}`);
    log('4d. Right Month Button Has Right-Pointing Chevron (›)', rightMonthPointsRight);
    log('4e. Left Month Button Has Left-Pointing Chevron (‹)', leftMonthPointsLeft);

    // Click Right Button (ماه قبل) -> In Aban 1405, should navigate to Mehr 1405
    await page.click('.month-toolbar .month-nav-btn.prev-btn');
    await new Promise(r => setTimeout(r, 300));
    const prevMonthTitle = await page.$eval('.month-title', el => el.innerText.trim());
    const isMehr = prevMonthTitle.includes('مهر');
    log('4f. Clicked Right Button (ماه قبل) -> Navigated to مهر ۱۴۰۵', isMehr, `Result: "${prevMonthTitle}"`);

    // Repeated clicks to test Esfand/Farvardin year boundary navigation
    // Current is Mehr (month 7). Click prev 7 times: Shahrivar, Mordad, Tir, Khordad, Ordibehesht, Farvardin, then Esfand of previous year!
    for (let i = 0; i < 7; i++) {
      await page.click('.month-toolbar .month-nav-btn.prev-btn');
      await new Promise(r => setTimeout(r, 100));
    }
    const esfandPrevYearTitle = await page.$eval('.month-title', el => el.innerText.trim());
    const isEsfand = esfandPrevYearTitle.includes('اسفند');
    log('4g. Navigated Across Year Boundary to اسفند of Previous Year', isEsfand, `Result: "${esfandPrevYearTitle}"`);

    // Click Left Button (ماه بعد) -> Should move from Esfand to Farvardin of next year
    await page.click('.month-toolbar .month-nav-btn.next-btn');
    await new Promise(r => setTimeout(r, 300));
    const farvardinTitle = await page.$eval('.month-title', el => el.innerText.trim());
    const isFarvardin = farvardinTitle.includes('فروردین');
    log('4h. Clicked Left Button (ماه بعد) Across Year Boundary -> Navigated to فروردین', isFarvardin, `Result: "${farvardinTitle}"`);

    // Click "امروز" button -> Returns to current month (آبان ۱۴۰۵)
    await page.click('.month-toolbar .btn-add');
    await new Promise(r => setTimeout(r, 300));
    const todayMonthTitle = await page.$eval('.month-title', el => el.innerText.trim());
    log('4i. Clicked "امروز" Button -> Returned to Current Month', todayMonthTitle === initialMonthTitle, todayMonthTitle);

    // Screenshot Month Board
    const monthScreenshotPath = path.join(SCREENSHOT_DIR, 'month_board_navigated.png');
    await page.screenshot({ path: monthScreenshotPath });
    log('4j. Screenshot Saved: Month Board Navigation', fs.existsSync(monthScreenshotPath), monthScreenshotPath);

    // =========================================================================
    // PART 4: Day Detail View Navigation
    // =========================================================================
    // Click on today's cell in Month Board to open DayDetailView
    await page.click('.month-cell.is-today');
    await page.waitForSelector('.day-detail-container', { timeout: 5000 });
    log('5a. Opened Day Detail View from Month Cell', true);

    const initialDayDate = await page.$eval('.day-detail-date', el => el.innerText.trim());
    log('5b. Initial Day Date Read', true, initialDayDate);

    // Click Right Button (روز قبل) -> Moves to previous day (-1 day)
    await page.click('.day-detail-nav .month-nav-btn.prev-btn');
    await new Promise(r => setTimeout(r, 300));
    const prevDayDate = await page.$eval('.day-detail-date', el => el.innerText.trim());
    log('5c. Clicked Right Button (روز قبل) -> Navigated to Earlier Day', prevDayDate !== initialDayDate, `From: "${initialDayDate}" To: "${prevDayDate}"`);

    // Click Left Button (روز بعد) -> Moves to next day (+1 day)
    await page.click('.day-detail-nav .month-nav-btn.next-btn');
    await new Promise(r => setTimeout(r, 300));
    const currentDayDate = await page.$eval('.day-detail-date', el => el.innerText.trim());
    log('5d. Clicked Left Button (روز بعد) -> Navigated Forward', currentDayDate === initialDayDate, currentDayDate);

    // Return to month board
    await page.click('.btn-back');
    await page.waitForSelector('.month-board-container.active', { timeout: 5000 });
    log('5e. Returned to Month Board via Back Button', true);

    // =========================================================================
    // PART 5: Mobile Viewport (375x812) Responsive Check
    // =========================================================================
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 400));

    // Verify Month Board at mobile width
    const mobileMonthTitle = await page.$eval('.month-title', el => el.innerText.trim());
    log('6a. Mobile Viewport 375px Month Board Rendered', Boolean(mobileMonthTitle), mobileMonthTitle);

    const mobileMonthScreenshotPath = path.join(SCREENSHOT_DIR, 'month_board_mobile_375.png');
    await page.screenshot({ path: mobileMonthScreenshotPath });
    log('6b. Screenshot Saved: Mobile Month Board', fs.existsSync(mobileMonthScreenshotPath), mobileMonthScreenshotPath);

    // Switch to Week Board at mobile width
    await page.evaluate(() => {
      // Toggle sidebar or click weekboard
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.includes('برد ۷ روز هفته'));
      if (btn) btn.click();
    });
    await page.waitForSelector('.week-board-container.active', { timeout: 5000 });
    const mobileWeekScreenshotPath = path.join(SCREENSHOT_DIR, 'week_board_mobile_375.png');
    await page.screenshot({ path: mobileWeekScreenshotPath });
    log('6c. Screenshot Saved: Mobile Week Board', fs.existsSync(mobileWeekScreenshotPath), mobileWeekScreenshotPath);

    // =========================================================================
    // PART 6: Console Error Check
    // =========================================================================
    log('7. Browser Console Errors Check (Zero Errors Expected)', consoleErrors.length === 0, consoleErrors.join(' | ') || 'Clean console');

  } catch (err) {
    log('FATAL TEST ERROR', false, err.stack || err.message);
  } finally {
    await browser.close();
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('\n=======================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log(`STATUS: ${failedCount === 0 ? 'ALL VERIFICATIONS PASSED' : 'SOME VERIFICATIONS FAILED'}`);
  console.log('=======================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPersianDateAndRtlNavTest().catch(err => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
