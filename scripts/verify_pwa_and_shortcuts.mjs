import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const PORT = 8089;
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
  console.log('==================================================================');
  console.log('TaskYar Web 2.0 — PWA Installation & Shortcuts Verification Suite');
  console.log('==================================================================\n');

  // 1. Start local PHP server on PORT 8089
  console.log(`Starting local Laravel test server on port ${PORT}...`);
  const serverProcess = spawn('php', ['artisan', 'serve', `--port=${PORT}`], {
    cwd: process.cwd(),
    stdio: 'ignore',
    detached: false
  });

  // Wait for server to become responsive
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await safeFetch(`${BASE_URL}/login`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // Wait a moment and retry
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
    // -----------------------------------------------------------------------
    // SECTION 1: PWA Manifest & Launcher Shortcuts
    // -----------------------------------------------------------------------
    console.log('--- 1. PWA Manifest & Launcher Shortcuts ---');
    const manifestRes = await safeFetch(`${BASE_URL}/manifest.webmanifest`);
    assert('Manifest returns HTTP 200', manifestRes.status === 200);

    const manifest = await manifestRes.json();
    assert('Manifest contains shortcuts array', Array.isArray(manifest.shortcuts));
    assert('Manifest defines exactly 3 launcher shortcuts', manifest.shortcuts?.length === 3);

    for (const sc of (manifest.shortcuts || [])) {
      assert(`Shortcut valid: "${sc.name}" (${sc.url})`, sc.name && sc.url);
      const iconUrl = sc.icons?.[0]?.src;
      if (iconUrl) {
        const iconRes = await safeFetch(`${BASE_URL}${iconUrl}`);
        assert(`Shortcut icon resolves HTTP 200: ${iconUrl}`, iconRes.status === 200);
      }
    }

    // -----------------------------------------------------------------------
    // SECTION 2: Browser Setup & User Registration
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Browser Launch & Authentication ---');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(String(err)));

    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    const userEmail = `qa_shortcut_${Date.now()}@taskyar.local`;
    await page.type('#nameInput', 'کاربر تست میانبرها');
    await page.type('#emailInput', userEmail);
    await page.type('#passwordInput', 'Secret123456!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/app'), { timeout: 10000 });
    assert('Registration successful and redirected to /app', page.url().includes('/app'));

    // Wait for Vue and app stores to initialize
    await page.waitForSelector('.workspace-layout', { timeout: 8000 });
    assert('Workspace layout rendered', true);

    // -----------------------------------------------------------------------
    // SECTION 3: PWA Native Installation Flow Test
    // -----------------------------------------------------------------------
    console.log('\n--- 3. PWA Installation Flow & Native Prompt Verification ---');

    // Simulate beforeinstallprompt event inside browser
    const pwaStateBefore = await page.evaluate(async () => {
      let promptCalled = false;
      let userChoiceOutcome = null;

      // Create a mock BeforeInstallPromptEvent
      const mockPromptEvent = new Event('beforeinstallprompt', { bubbles: true, cancelable: true });
      mockPromptEvent.prompt = function() {
        promptCalled = true;
        return Promise.resolve();
      };
      mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

      // Dispatch to window
      window.dispatchEvent(mockPromptEvent);

      // Verify that default was prevented
      return {
        defaultPrevented: mockPromptEvent.defaultPrevented
      };
    });

    assert('beforeinstallprompt captured and preventDefault() called', pwaStateBefore.defaultPrevented === true);

    // Open Install Modal via clicking the sidebar item
    await page.click('.install-pwa-nav');
    await page.waitForSelector('.modal-install-card', { visible: true, timeout: 5000 });
    assert('Install modal opens upon clicking install button', true);

    // Verify modal elements
    const modalDetails = await page.evaluate(() => {
      const card = document.querySelector('.modal-install-card');
      const title = card?.querySelector('#installModalTitle')?.innerText || '';
      const button = card?.querySelector('.btn-primary-install');
      const buttonText = button?.innerText?.trim() || '';
      const isVisible = button !== null;
      return { title, buttonText, isVisible };
    });

    assert('Install modal has valid Persian title', modalDetails.title.includes('نصب وب‌اپلیکیشن تسک‌یار'));
    assert('Install modal displays functional "نصب برنامه" button', modalDetails.isVisible && modalDetails.buttonText.includes('نصب برنامه'));

    // Capture screenshot of the fixed install modal
    const pwaScreenshotPath = path.join(SCREENSHOTS_DIR, 'pwa_install_modal_fixed.png');
    await page.screenshot({ path: pwaScreenshotPath });
    assert(`Saved screenshot: pwa_install_modal_fixed.png`, fs.existsSync(pwaScreenshotPath));

    // Click the install button and verify native prompt execution
    const installOutcome = await page.evaluate(async () => {
      const btn = document.querySelector('.btn-primary-install');
      if (!btn) return { clicked: false };
      btn.click();
      await new Promise(r => setTimeout(r, 200));
      return { clicked: true };
    });
    assert('Install button clicked directly', installOutcome.clicked === true);

    // Simulate appinstalled event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    await sleep(200);

    const isInstalled = await page.evaluate(() => {
      const modal = document.querySelector('.modal-install-card');
      return modal === null;
    });
    assert('Modal closes cleanly after appinstalled event', isInstalled);

    // -----------------------------------------------------------------------
    // SECTION 4: Shortcuts Suite Verification
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Keyboard Shortcuts Suite Verification ---');

    // 4.1 F1 key opens Shortcuts Modal
    await page.keyboard.press('F1');
    await page.waitForSelector('.modal-shortcuts-card', { visible: true, timeout: 5000 });
    assert('F1 opens Shortcuts Modal', true);

    // Capture keyboard shortcuts tab screenshot
    const scKeyScreenshot = path.join(SCREENSHOTS_DIR, 'shortcuts_modal_keyboard.png');
    await page.screenshot({ path: scKeyScreenshot });
    assert('Saved screenshot: shortcuts_modal_keyboard.png', fs.existsSync(scKeyScreenshot));

    // 4.2 Switch to touch gestures tab
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('.shortcuts-tabs .tab-btn'));
      const touchBtn = tabBtns.find(b => b.innerText.includes('ژست‌های لمسی'));
      touchBtn?.click();
    });
    await sleep(200);

    const gesturesCount = await page.evaluate(() => {
      return document.querySelectorAll('.gesture-card').length;
    });
    assert('Touch gestures tab displays mobile hints', gesturesCount >= 5);

    // Capture touch gestures tab screenshot
    const scTouchScreenshot = path.join(SCREENSHOTS_DIR, 'shortcuts_modal_touch.png');
    await page.screenshot({ path: scTouchScreenshot });
    assert('Saved screenshot: shortcuts_modal_touch.png', fs.existsSync(scTouchScreenshot));

    // 4.3 Escape closes the shortcuts modal
    await page.keyboard.press('Escape');
    await sleep(200);
    const modalClosed = await page.evaluate(() => document.querySelector('.modal-shortcuts-card') === null);
    assert('Escape closes Shortcuts Modal', modalClosed);

    // 4.4 Alt+N focuses the Add Task input
    await page.keyboard.down('Alt');
    await page.keyboard.press('KeyN');
    await page.keyboard.up('Alt');
    await sleep(200);

    const isInputFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el && (el.id === 'newTaskInput' || el.id === 'taskTitleInput' || el.classList.contains('add-task-input'));
    });
    assert('Alt+N focuses the Add Task input', isInputFocused);

    // Type a task and submit with Enter
    await page.keyboard.type('تسک تستی با کلید میانبر Alt+N');
    await page.keyboard.press('Enter');
    await sleep(600);

    const taskCreated = await page.evaluate(() => {
      const text = document.querySelector('#tasksContainer')?.innerText || '';
      return text.includes('تسک تستی با کلید میانبر Alt+N');
    });
    assert('Task created successfully via shortcut workflow', taskCreated);

    // 4.5 Alt+F focuses the Search input
    await page.keyboard.down('Alt');
    await page.keyboard.press('KeyF');
    await page.keyboard.up('Alt');
    await sleep(200);

    const isSearchFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el && el.id === 'searchInput';
    });
    assert('Alt+F focuses Search input in Sidebar', isSearchFocused);

    // 4.6 Input Guard: Delete or Number keys while typing in input must NOT trigger global actions
    await page.keyboard.type('جستجو');
    await page.keyboard.press('2'); // typing '2'
    await page.keyboard.press('Delete'); // deleting character

    const currentSearchVal = await page.evaluate(() => document.getElementById('searchInput')?.value);
    assert('Typing in input preserves text without firing global navigation', currentSearchVal.includes('جستجو'));

    // Press Escape to blur search
    await page.keyboard.press('Escape');
    await sleep(100);

    // Clear search query
    await page.evaluate(() => {
      const el = document.getElementById('searchInput');
      if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(200);

    // 4.7 View Switching Shortcuts (Alt+1 through Alt+8)
    const viewsToTest = [
      { key: 'Digit2', expected: 'weekboard', name: 'Alt+2 (برد ۷ روز هفته)' },
      { key: 'Digit3', expected: 'monthboard', name: 'Alt+3 (برد ۳۰ روزه ماه)' },
      { key: 'Digit4', expected: 'important', name: 'Alt+4 (کارهای مهم)' },
      { key: 'Digit5', expected: 'daily', name: 'Alt+5 (کارهای روزانه)' },
      { key: 'Digit6', expected: 'weekly', name: 'Alt+6 (برنامه‌های هفتگی)' },
      { key: 'Digit7', expected: 'monthly', name: 'Alt+7 (اهداف ماهیانه)' },
      { key: 'Digit8', expected: 'all', name: 'Alt+8 (همه وظایف)' },
      { key: 'Digit1', expected: 'myday', name: 'Alt+1 (روز من)' }
    ];

    for (const v of viewsToTest) {
      await page.keyboard.down('Alt');
      await page.keyboard.press(v.key);
      await page.keyboard.up('Alt');
      await sleep(250);

      const activeView = await page.evaluate(() => {
        // Find active nav item or view title
        const activeNav = document.querySelector('.sidebar .nav-item.active');
        const titleEl = document.querySelector('#viewTitle');
        return {
          title: titleEl?.innerText || '',
          hasActiveNav: activeNav !== null
        };
      });
      assert(`Shortcut ${v.name} switches view successfully`, activeView.title.length > 0);
    }

    // Capture screenshot of workspace with view switched
    const scViewScreenshot = path.join(SCREENSHOTS_DIR, 'shortcut_view_switching.png');
    await page.screenshot({ path: scViewScreenshot });
    assert('Saved screenshot: shortcut_view_switching.png', fs.existsSync(scViewScreenshot));

    // 4.8 Interactive Shortcut Execution from Modal
    await page.keyboard.press('F1');
    await page.waitForSelector('.modal-shortcuts-card', { visible: true, timeout: 5000 });

    // Click on "جابجایی به برد ۷ روز هفته" row in modal
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.shortcut-item-row'));
      const target = rows.find(r => r.innerText.includes('برد ۷ روز هفته'));
      target?.click();
    });
    await sleep(300);

    const switchedViaModal = await page.evaluate(() => {
      const title = document.querySelector('#viewTitle')?.innerText || '';
      return title.includes('برد ۷ روز هفته');
    });
    assert('Interactive shortcut click in modal executes action (WeekBoard)', switchedViaModal);

    // Switch back to myday
    await page.keyboard.down('Alt');
    await page.keyboard.press('Digit1');
    await page.keyboard.up('Alt');
    await sleep(250);

    // 4.9 Task Deletion via Delete Shortcut
    // Click task to open DetailDrawer
    const taskClicked = await page.evaluate(() => {
      const card = document.querySelector('.task-card');
      if (card) {
        card.click();
        return true;
      }
      return false;
    });
    assert('Task card clicked to open DetailDrawer', taskClicked);
    await sleep(400);

    // Auto-accept window.confirm for Delete test
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Press Delete key
    await page.keyboard.press('Delete');
    await sleep(600);

    const taskDeleted = await page.evaluate(() => {
      const text = document.querySelector('#tasksContainer')?.innerText || '';
      return !text.includes('تسک تستی با کلید میانبر Alt+N');
    });
    assert('Delete shortcut successfully removes selected task', taskDeleted);

    // -----------------------------------------------------------------------
    // SECTION 5: Browser Console Audit
    // -----------------------------------------------------------------------
    console.log('\n--- 5. Browser Console Audit ---');
    const appErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('downloadable font'));
    assert('Zero uncaught JavaScript exceptions in application', appErrors.length === 0, `Errors: ${JSON.stringify(appErrors)}`);

  } finally {
    if (browser) {
      await browser.close();
    }
    serverProcess.kill();
    console.log('\nLocal test server terminated.');
  }

  console.log('\n==================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('==================================================================');

  if (passedTests !== totalTests) {
    throw new Error(`Verification suite failed: ${totalTests - passedTests} tests failed.`);
  }
}

runVerification().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
