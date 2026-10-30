import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'C:/Users/Hossein/.gemini/antigravity-ide/brain/c1fb8e4a-9951-49d4-9deb-ae472df51094/screenshots';

async function runDrawerTimePickerTest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  const log = (step, passed, note = '') => {
    results.push({ step, passed, note });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${step}${note ? ' - ' + note : ''}`);
  };

  const consoleErrors = [];

  console.log('Launching Chrome browser for Detail Drawer Time Picker & About Polish Test...');
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
    const testEmail = `polish_${Date.now()}@taskyar.ir`;
    await page.goto(`${APP_URL}/register`, { waitUntil: 'networkidle0' });
    await page.type('#nameInput', 'کاربر تست پالیش');
    await page.type('#emailInput', testEmail);
    await page.type('#passwordInput', 'Secret123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/app'), { timeout: 8000 });
    await page.waitForSelector('.main-content', { timeout: 8000 });
    log('1. User Registration & Redirect to /app', true, `URL: ${page.url()}`);

    // Wait for task cards to load
    await page.waitForSelector('.task-card', { timeout: 5000 });

    // 2. Test About Modal (Developer Info & Email)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.btn-header-action, .header-quick-menu button'));
      const aboutBtn = btns.find(b => b.textContent.includes('درباره'));
      if (aboutBtn) aboutBtn.click();
    });

    await page.waitForSelector('.modal-overlay.show .about-card', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 400));
    const aboutHtml = await page.evaluate(() => {
      const card = document.querySelector('.about-card');
      return card ? card.innerHTML : '';
    });

    const hasDeveloperName = aboutHtml.includes('حسین محمدپور');
    const hasDeveloperEmail = aboutHtml.includes('info@hosseinmohammadpour.ir');
    const hasMailtoLink = aboutHtml.includes('mailto:info@hosseinmohammadpour.ir');
    const hasVersionDistinction = aboutHtml.includes('۲.۰.۰') && aboutHtml.includes('۱.۱.۰');

    log('2a. About Modal Developer Name (حسین محمدپور)', hasDeveloperName);
    log('2b. About Modal Clickable Email (mailto:info@hosseinmohammadpour.ir)', hasDeveloperEmail && hasMailtoLink);
    log('2c. About Modal Version Distinction (Web 2.0 vs Desktop 1.1.0)', hasVersionDistinction);

    const aboutScreenshotPath = path.join(SCREENSHOT_DIR, 'about_modal_updated.png');
    await page.screenshot({ path: aboutScreenshotPath });
    log('2d. About Modal Screenshot Saved', true, aboutScreenshotPath);

    // Close about modal
    await page.evaluate(() => {
      const btn = document.querySelector('.about-card .modal-actions button') || document.querySelector('.about-card button');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // 3. Open Detail Drawer by clicking first task card
    await page.waitForSelector('.task-card', { timeout: 4000 });
    await page.click('.task-card:first-child');
    await page.waitForSelector('.detail-drawer.open', { timeout: 4000 });
    log('3. Open Task Detail Drawer', true);

    // 4. Test Viewport 1440 × 900 (Desktop)
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 200));

    // Record initial drawer scroll position
    const initialScrollTop = await page.evaluate(() => {
      const scrollable = document.querySelector('.detail-drawer .overflow-y-auto');
      return scrollable ? scrollable.scrollTop : 0;
    });

    // Open time picker inside drawer
    await page.click('.detail-drawer .time-picker-trigger');
    await page.waitForSelector('.time-picker-floating-panel', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));

    // Verify popover position and absence of drawer scrolling
    const panelMetrics1440 = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      const drawer = document.querySelector('.detail-drawer');
      const scrollable = document.querySelector('.detail-drawer .overflow-y-auto');
      const rect = panel.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        drawerScrollTop: scrollable ? scrollable.scrollTop : 0,
        isInsideDrawerDOM: drawer ? drawer.contains(panel) : false
      };
    });

    const isTeleportedToBody = !panelMetrics1440.isInsideDrawerDOM;
    const isWithinViewport1440 = panelMetrics1440.left >= 0 && panelMetrics1440.right <= 1440 && panelMetrics1440.top >= 0 && panelMetrics1440.bottom <= 900;
    const noDrawerScrollJump1440 = panelMetrics1440.drawerScrollTop === initialScrollTop;

    log('4a. Time Picker Teleported Outside Drawer DOM', isTeleportedToBody);
    log('4b. Time Picker Positioned Within 1440x900 Viewport', isWithinViewport1440, `top: ${panelMetrics1440.top}, left: ${panelMetrics1440.left}`);
    log('4c. Zero Unexpected Drawer Scrolling', noDrawerScrollJump1440);

    const screenshot1440 = path.join(SCREENSHOT_DIR, 'drawer_time_picker_desktop_1440.png');
    await page.screenshot({ path: screenshot1440 });
    log('4d. Screenshot 1440x900 Captured', true, screenshot1440);

    // Test time selection in compact grid (select hour 14, then minute 30)
    // Click on hour 14 button
    await page.evaluate(() => {
      const hourBtns = Array.from(document.querySelectorAll('.time-grid-hours .time-grid-btn'));
      // Find button for hour 14 (which is "۱۴")
      const target = hourBtns.find(b => b.textContent.includes('۱۴'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // After hour click, minute grid should be active. Click on minute 30 button ("۳۰")
    await page.evaluate(() => {
      const minBtns = Array.from(document.querySelectorAll('.time-grid-minutes .time-grid-btn'));
      const target = minBtns.find(b => b.textContent.includes('۳۰'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 200));

    // Click confirm button
    await page.click('.btn-panel-confirm');
    await new Promise(r => setTimeout(r, 300));

    // Verify time was applied to trigger in drawer
    const updatedDrawerTime = await page.evaluate(() => {
      const trigger = document.querySelector('.detail-drawer .time-picker-trigger');
      return trigger ? trigger.textContent.trim() : '';
    });
    const timeSelectedCorrectly = updatedDrawerTime.includes('۱۴:۳۰');
    log('4e. Time Selection in Compact Grid (14:30)', timeSelectedCorrectly, `Trigger text: "${updatedDrawerTime}"`);

    // 5. Test Drawer Scrolled (Top, Middle, Bottom)
    // Scroll drawer down and reopen time picker
    await page.evaluate(() => {
      const scrollable = document.querySelector('.detail-drawer .overflow-y-auto');
      if (scrollable) scrollable.scrollTop = 150;
    });
    await new Promise(r => setTimeout(r, 200));

    await page.click('.detail-drawer .time-picker-trigger');
    await page.waitForSelector('.time-picker-floating-panel', { timeout: 3000 });

    const scrolledMetrics = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      const rect = panel.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right
      };
    });
    const scrolledWithinViewport = scrolledMetrics.top >= 0 && scrolledMetrics.bottom <= 900;
    log('5a. Time Picker Position with Scrolled Drawer', scrolledWithinViewport, `top: ${scrolledMetrics.top}`);

    const screenshotScrolled = path.join(SCREENSHOT_DIR, 'drawer_time_picker_scrolled.png');
    await page.screenshot({ path: screenshotScrolled });
    log('5b. Screenshot Scrolled Drawer Captured', true, screenshotScrolled);

    // Helper to ensure detail drawer is open
    const ensureDrawer = async () => {
      const open = await page.evaluate(() => !!document.querySelector('.detail-drawer.open'));
      if (!open) {
        await page.click('.task-card:first-child');
        await page.waitForSelector('.detail-drawer.open', { timeout: 4000 });
      }
    };

    // Close picker cleanly via close button
    await page.click('.time-panel-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // 6. Test Viewport 1280 × 800 (Laptop)
    await page.setViewport({ width: 1280, height: 800 });
    await new Promise(r => setTimeout(r, 200));
    await ensureDrawer();
    await page.click('.detail-drawer .time-picker-trigger');
    await page.waitForSelector('.time-picker-floating-panel', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));

    const panelMetrics1280 = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      const rect = panel.getBoundingClientRect();
      return {
        isWithin: rect.left >= 0 && rect.right <= 1280 && rect.top >= 0 && rect.bottom <= 800
      };
    });
    log('6a. Viewport 1280x800 Fit', panelMetrics1280.isWithin);
    const screenshot1280 = path.join(SCREENSHOT_DIR, 'drawer_time_picker_1280.png');
    await page.screenshot({ path: screenshot1280 });
    await page.click('.time-panel-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // 7. Test Viewport 768 × 1024 (Tablet)
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 200));
    await ensureDrawer();
    await page.click('.detail-drawer .time-picker-trigger');
    await page.waitForSelector('.time-picker-floating-panel', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));

    const panelMetrics768 = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      const rect = panel.getBoundingClientRect();
      return {
        isWithin: rect.left >= 0 && rect.right <= 768 && rect.top >= 0 && rect.bottom <= 1024
      };
    });
    log('7a. Viewport 768x1024 Fit', panelMetrics768.isWithin);
    const screenshot768 = path.join(SCREENSHOT_DIR, 'drawer_time_picker_768.png');
    await page.screenshot({ path: screenshot768 });
    await page.click('.time-panel-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // 8. Test Viewport 375 × 812 (Mobile)
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise(r => setTimeout(r, 200));
    await ensureDrawer();
    await page.click('.detail-drawer .time-picker-trigger');
    await page.waitForSelector('.time-picker-floating-panel', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));

    const panelMetrics375 = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        isWithin: rect.left >= 0 && rect.right <= 375 && rect.top >= 0 && rect.bottom <= 812
      };
    });
    log('8a. Viewport 375x812 (Mobile) Fit & No Overflow', panelMetrics375.isWithin, `left: ${panelMetrics375.left}, right: ${panelMetrics375.right}`);
    const screenshot375 = path.join(SCREENSHOT_DIR, 'drawer_time_picker_mobile_375.png');
    await page.screenshot({ path: screenshot375 });
    log('8b. Screenshot 375x812 Mobile Captured', true, screenshot375);
    await page.click('.time-panel-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // 9. Close Detail Drawer & Test AddTaskBar (Regression Check)
    await page.setViewport({ width: 1440, height: 900, isMobile: false });
    await new Promise(r => setTimeout(r, 200));

    // Close detail drawer
    await page.evaluate(() => {
      const btn = document.querySelector('.detail-drawer .drawer-header .btn-icon-text') || document.querySelector('.detail-drawer .drawer-header button');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Click time picker in bottom AddTaskBar
    await page.click('#newTaskTime');
    await page.waitForSelector('.time-picker-floating-panel', { timeout: 3000 });

    const addBarMetrics = await page.evaluate(() => {
      const panel = document.querySelector('.time-picker-floating-panel');
      const trigger = document.querySelector('#newTaskTime');
      const pRect = panel.getBoundingClientRect();
      const tRect = trigger.getBoundingClientRect();
      // Verify panel opened ABOVE the trigger (drop-up)
      return {
        openedAbove: pRect.bottom <= tRect.top + 5,
        isWithinViewport: pRect.top >= 0 && pRect.bottom <= 900
      };
    });
    log('9a. AddTaskBar Time Picker Regression: Opened Above Bottom Bar', addBarMetrics.openedAbove && addBarMetrics.isWithinViewport);

    const screenshotAddBar = path.join(SCREENSHOT_DIR, 'addbar_time_picker_regression.png');
    await page.screenshot({ path: screenshotAddBar });
    log('9b. Screenshot AddBar Time Picker Captured', true, screenshotAddBar);
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // 10. Theme Switching Verification
    const themeDots = await page.$$('.theme-dot');
    log('10a. Theme Switching (4 Themes Available)', themeDots.length === 4);
    for (let i = 0; i < themeDots.length; i++) {
      await themeDots[i].click();
      await new Promise(r => setTimeout(r, 150));
    }
    log('10b. Theme Switching Cycled All 4 Themes Without Error', true);

    // 11. Console Errors Check
    log('11. Browser Console Clean (Zero Unhandled Errors)', consoleErrors.length === 0, consoleErrors.join('; '));

  } catch (err) {
    console.error('Test execution failed with error:', err);
    log('Fatal Error', false, err.message);
  } finally {
    await browser.close();
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log('\n=======================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log(`STATUS: ${failedCount === 0 ? 'ALL VERIFICATIONS PASSED' : 'SOME CHECKS FAILED'}`);
  console.log('=======================================\n');

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'drawer_time_picker_test_report.json'),
    JSON.stringify(results, null, 2)
  );

  if (failedCount > 0) {
    process.exit(1);
  }
}

runDrawerTimePickerTest();
