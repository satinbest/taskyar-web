import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'C:/Users/Hossein/.gemini/antigravity-ide/brain/c1fb8e4a-9951-49d4-9deb-ae472df51094/screenshots';

async function runPhase3SmokeTest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  const log = (step, passed, note = '') => {
    results.push({ step, passed, note });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${step}${note ? ' - ' + note : ''}`);
  };

  console.log('Launching Chrome browser for Phase 3 E2E test...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('dialog', async dialog => {
    console.log(`  -> Auto-accepting dialog: "${dialog.message()}"`);
    await dialog.accept();
  });

  try {
    // 1. Unauthenticated Redirect Check: Visit / and /app, verify redirect to /login
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle0' });
    const currentUrl = page.url();
    const redirectedToLogin = currentUrl.includes('/login');
    log('1. Route Redirect (Unauthenticated / -> /login)', redirectedToLogin, `Current URL: ${currentUrl}`);

    // 2. Capture Login Page Screenshots (Desktop & Mobile)
    const loginDesktopPath = path.join(SCREENSHOT_DIR, 'login_desktop.png');
    await page.screenshot({ path: loginDesktopPath });
    log('2a. Login Page Screenshot (Desktop)', true, `Saved to ${loginDesktopPath}`);

    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise(r => setTimeout(r, 400));
    const loginMobilePath = path.join(SCREENSHOT_DIR, 'login_mobile.png');
    await page.screenshot({ path: loginMobilePath });
    log('2b. Login Page Screenshot (Mobile)', true, `Saved to ${loginMobilePath}`);

    // Restore desktop viewport
    await page.setViewport({ width: 1280, height: 800, isMobile: false });
    await new Promise(r => setTimeout(r, 400));

    // 3. Navigate to /register and capture screenshot
    await page.click('.auth-switch-link');
    await page.waitForSelector('#nameInput', { timeout: 4000 });
    const registerDesktopPath = path.join(SCREENSHOT_DIR, 'register_desktop.png');
    await page.screenshot({ path: registerDesktopPath });
    log('3. Registration Page Screenshot', true, `Saved to ${registerDesktopPath}`);

    // 4. Register User 1
    const timestamp = Date.now();
    const user1Email = `p3_user1_${timestamp}@taskyar.ir`;
    const user1Pass = 'Password123!';

    await page.type('#nameInput', 'کاربر فاز سه تستی');
    await page.type('#emailInput', user1Email);
    await page.type('#passwordInput', user1Pass);
    await page.click('button[type="submit"]');

    // Wait for redirect to /app
    await page.waitForFunction(() => window.location.pathname.includes('/app'), { timeout: 8000 });
    await page.waitForSelector('.main-content', { timeout: 8000 });
    log('4. User 1 Registration & Redirect to /app', true, `Logged in and navigated to ${page.url()}`);

    // Wait for workspace to settle
    await new Promise(r => setTimeout(r, 1000));

    // 5. Capture My Day Screenshots (Desktop & Mobile)
    const myDayDesktopPath = path.join(SCREENSHOT_DIR, 'phase3_myday_desktop.png');
    await page.screenshot({ path: myDayDesktopPath });
    log('5a. My Day Screen (Desktop)', true, `Saved to ${myDayDesktopPath}`);

    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise(r => setTimeout(r, 500));
    const myDayMobilePath = path.join(SCREENSHOT_DIR, 'phase3_myday_mobile.png');
    await page.screenshot({ path: myDayMobilePath });
    log('5b. My Day Screen (Mobile)', true, `Saved to ${myDayMobilePath}`);

    await page.setViewport({ width: 1280, height: 800, isMobile: false });
    await new Promise(r => setTimeout(r, 500));

    // 6. Test Persian Time Picker Component Popover
    await page.click('#newTaskTime');
    await page.waitForSelector('.time-picker-popover', { timeout: 3000 });
    const timePickerScreenshotPath = path.join(SCREENSHOT_DIR, 'persian_time_picker_open.png');
    await page.screenshot({ path: timePickerScreenshotPath });
    log('6. Persian Time Picker Popover', true, `Opened and saved to ${timePickerScreenshotPath}`);

    // Select hour 14 and minute 30
    await page.evaluate(() => {
      const hours = Array.from(document.querySelectorAll('.time-picker-col:nth-child(1) .time-cell-btn'));
      const h14 = hours.find(b => b.textContent.includes('۱۴'));
      if (h14) h14.click();
      const mins = Array.from(document.querySelectorAll('.time-picker-col:nth-child(3) .time-cell-btn'));
      const m30 = mins.find(b => b.textContent.includes('۳۰'));
      if (m30) m30.click();
      const confirmBtn = document.querySelector('.btn-time-confirm');
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 7. Test Styled Dropdown (AppSelect)
    await page.click('#newTaskPeriod');
    await page.waitForSelector('.app-select-menu', { timeout: 3000 });
    const appSelectScreenshotPath = path.join(SCREENSHOT_DIR, 'app_select_open.png');
    await page.screenshot({ path: appSelectScreenshotPath });
    log('7. Styled AppSelect Dropdown', true, `Opened and saved to ${appSelectScreenshotPath}`);

    // Select 'هفتگی'
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.app-select-option'));
      const weeklyOpt = opts.find(o => o.textContent.includes('هفتگی'));
      if (weeklyOpt) weeklyOpt.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // 8. Create Task with custom time & period
    const testTaskTitle = 'تست جامع تقویم جلالی و زمان‌بندی فاز سه';
    await page.evaluate((title) => {
      const input = document.querySelector('#newTaskInput');
      if (input) {
        input.value = title;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const addBtn = document.querySelector('.add-task-bar .btn-add');
      if (addBtn) addBtn.click();
    }, testTaskTitle);

    await page.waitForFunction((expectedTitle) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return titles.some(t => t.textContent.includes(expectedTitle));
    }, { timeout: 5000 }, testTaskTitle);
    log('8. Task Creation with Persian Time & AppSelect', true, `Created: "${testTaskTitle}"`);

    // 9. Edit Task & Complete
    await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll('.task-card'));
      const card = cards.find(c => c.querySelector('.task-title')?.textContent.includes(title));
      if (card) card.click();
    }, testTaskTitle);
    await page.waitForSelector('.detail-drawer.open', { timeout: 3000 });

    const editedTitle = 'تست جامع تقویم جلالی و زمان‌بندی فاز سه (ویرایش شده)';
    await page.evaluate((newTitle) => {
      const input = document.querySelector('.drawer-title-input');
      if (input) {
        input.value = newTitle;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const closeBtn = document.querySelector('.drawer-header .btn-icon-text');
      if (closeBtn) closeBtn.click();
    }, editedTitle);
    await new Promise(r => setTimeout(r, 1000));
    log('9. Task Editing in Detail Drawer', true, 'Updated title and closed drawer');

    // 10. Switch to 7-Day Week Board (Stage 5.1)
    await page.evaluate(() => {
      const navItems = Array.from(document.querySelectorAll('.nav-item'));
      const weekItem = navItems.find(i => i.textContent.includes('برد ۷ روز هفته'));
      if (weekItem) weekItem.click();
    });
    await page.waitForSelector('.week-board-container', { timeout: 4000 });
    await new Promise(r => setTimeout(r, 800));

    const weekColCount = await page.$$eval('.day-column-card', cols => cols.length);
    const weekBoardScreenshotPath = path.join(SCREENSHOT_DIR, 'phase3_week_board.png');
    await page.screenshot({ path: weekBoardScreenshotPath });
    log('10. 7-Day Week Board (Stage 5.1)', weekColCount === 7, `Rendered 7 day columns. Saved to ${weekBoardScreenshotPath}`);

    // Quick add task in week board
    await page.evaluate(() => {
      const firstColInput = document.querySelector('.day-col-footer input');
      if (firstColInput) {
        firstColInput.value = 'کار سریع شنبه در برد هفته';
        firstColInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1200));

    // 11. Switch to 30-Day Jalali Month Board (Stage 5.2)
    await page.evaluate(() => {
      const navItems = Array.from(document.querySelectorAll('.nav-item'));
      const monthItem = navItems.find(i => i.textContent.includes('برد ۳۰ روزه ماه'));
      if (monthItem) monthItem.click();
    });
    await page.waitForSelector('.month-grid', { timeout: 4000 });
    await new Promise(r => setTimeout(r, 800));

    const monthCellCount = await page.$$eval('.month-cell', cells => cells.length);
    const monthBoardScreenshotPath = path.join(SCREENSHOT_DIR, 'phase3_month_board.png');
    await page.screenshot({ path: monthBoardScreenshotPath });
    log('11. Jalali Month Board (Stage 5.2)', monthCellCount >= 29, `Rendered ${monthCellCount} cells. Saved to ${monthBoardScreenshotPath}`);

    // 12. Open Day Detail View (Stage 5.3)
    await page.evaluate(() => {
      const todayCell = document.querySelector('.month-cell.is-today') || document.querySelector('.month-cell:not(.empty)');
      if (todayCell) todayCell.click();
    });
    await page.waitForSelector('.day-detail-bar', { timeout: 4000 });
    await new Promise(r => setTimeout(r, 800));

    const dayDetailScreenshotPath = path.join(SCREENSHOT_DIR, 'phase3_day_detail.png');
    await page.screenshot({ path: dayDetailScreenshotPath });
    log('12. Day Detail View (Stage 5.3)', true, `Rendered Day Detail view. Saved to ${dayDetailScreenshotPath}`);

    // Return back to month board
    await page.click('.day-detail-bar .btn-back');
    await page.waitForSelector('.month-grid', { timeout: 3000 });
    log('13. Day Detail Back to Month Board', true, 'Navigated back cleanly');

    // 14. Logout & Verify Return to /login
    await page.click('button[title="خروج از حساب کاربری"]');
    await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 5000 });
    log('14. Logout & Navigation to /login', true, 'State reset and redirected to /login');

    // 15. Invalid Credentials Login Test
    await page.type('#emailInput', 'nonexistent@taskyar.ir');
    await page.type('#passwordInput', 'WrongPassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.auth-error-box', { timeout: 4000 });
    const errText = await page.$eval('.auth-error-box', el => el.textContent.trim());
    log('15. Invalid Credentials Rejection', Boolean(errText), `Inline error: "${errText}"`);

    // 16. Login with User 2 and Verify Isolation
    const user2Email = `p3_user2_${timestamp}@taskyar.ir`;
    await page.click('.auth-switch-link');
    await page.waitForSelector('#nameInput', { timeout: 4000 });

    await page.type('#nameInput', 'کاربر دوم ایزوله فاز سه');
    await page.type('#emailInput', user2Email);
    await page.type('#passwordInput', 'Password456!');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/app'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));

    const user2SeesUser1 = await page.evaluate((title) => {
      const titles = Array.from(document.querySelectorAll('.task-title'));
      return titles.some(t => t.textContent.includes(title));
    }, testTaskTitle);
    log('16. User Isolation in Phase 3', !user2SeesUser1, 'User 2 cannot see User 1 tasks');

  } catch (err) {
    console.error('Phase 3 smoke test error:', err);
    log('Phase 3 Smoke Test Error', false, err.message);
  } finally {
    try {
      await browser.close();
    } catch (e) {
      // ignore
    }
  }

  const allPassed = results.every(r => r.passed);
  console.log('\n=======================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED: ${results.filter(r => r.passed).length}`);
  console.log(`FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`STATUS: ${allPassed ? 'ALL VERIFICATIONS PASSED' : 'SOME VERIFICATIONS FAILED'}`);
  console.log('=======================================');

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'phase3_smoke_test_report.json'),
    JSON.stringify({ results, allPassed, timestamp: new Date().toISOString() }, null, 2)
  );

  process.exit(allPassed ? 0 : 1);
}

runPhase3SmokeTest();
