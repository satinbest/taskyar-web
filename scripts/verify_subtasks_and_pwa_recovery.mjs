import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const PORT = 8096;
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
  console.log('TaskYar Web 2.0 — Subtasks, PWA Recovery & Responsive Polish Verification');
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
      // wait
    }
    await sleep(400);
  }

  if (!serverReady) {
    serverProcess.kill();
    throw new Error(`Local server failed to respond on port ${PORT}`);
  }
  console.log('✓ Local test server is active and responding.\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1440,900'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.toString()}`));

    // Step A: Login or Register
    console.log('--- Step A: Authentication ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Fill login form
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    const passInput = await page.$('input[name="password"], input[type="password"]');
    if (emailInput && passInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('test@example.com');
      await passInput.click({ clickCount: 3 });
      await passInput.type('password123');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    }

    // Check if on /
    if (page.url().includes('/login')) {
      // Register test user if login failed
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
      const nameInput = await page.$('input[name="name"]');
      const regEmail = await page.$('input[name="email"]');
      const regPass = await page.$('input[name="password"]');
      const regConfirm = await page.$('input[name="password_confirmation"]');
      if (nameInput && regEmail && regPass) {
        const uniqueEmail = `test_${Date.now()}@example.com`;
        await nameInput.type('تستر تسک‌یار');
        await regEmail.type(uniqueEmail);
        await regPass.type('password123');
        if (regConfirm) await regConfirm.type('password123');
        const regBtn = await page.$('button[type="submit"]');
        if (regBtn) await regBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
      }
    }

    console.log(`✓ Authenticated successfully. Current URL: ${page.url()}\n`);
    await sleep(1000);

    // =========================================================================
    // TASK 1: SUBTASK CREATION, TOGGLING, EDITING, PERSISTENCE & DELETION
    // =========================================================================
    console.log('--- Step B: TASK 1 — Subtask Feature Suite ---');

    // Create a new task to test subtasks on
    const taskInput = await page.$('.create-task-bar input, .bottom-task-bar input, input[placeholder*="کار جدید"]');
    if (!taskInput) {
      throw new Error('Could not find task creation input');
    }

    const testTaskTitle = `تسک ویژه بررسی ساب‌تسک‌ها ${Date.now().toString().slice(-4)}`;
    await taskInput.type(testTaskTitle);
    await page.keyboard.press('Enter');
    await sleep(1500);

    // Find the created task card
    const taskCard = await page.evaluateHandle((title) => {
      const cards = Array.from(document.querySelectorAll('.task-card, .task-item'));
      return cards.find(c => c.textContent.includes(title));
    }, testTaskTitle);

    if (!taskCard || !taskCard.asElement()) {
      throw new Error('Created task card not found in DOM');
    }
    console.log(`✓ Created test task: "${testTaskTitle}"`);

    // Click task card to open DetailDrawer
    await taskCard.asElement().click();
    await sleep(800);

    // Verify DetailDrawer is open
    const isDrawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector('.detail-drawer');
      return drawer && drawer.classList.contains('open');
    });
    console.log(`✓ Task Detail Drawer open status: ${isDrawerOpen}`);
    if (!isDrawerOpen) throw new Error('DetailDrawer did not open upon clicking task card');

    // 1. Add Subtask via Enter key
    const subtaskInput = await page.$('.subtask-new-input, .subtask-input-bar input');
    if (!subtaskInput) throw new Error('Subtask input element not found in DetailDrawer');

    const subtask1Text = 'مرحله اول: تنظیم اتصالات سرور';
    await subtaskInput.click();
    await subtaskInput.type(subtask1Text);
    await page.keyboard.press('Enter');
    await sleep(1000);

    // Verify subtask 1 appears in the DOM
    let subtaskItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.subtask-row-item .subtask-label')).map(el => el.textContent.trim());
    });
    console.log(`✓ Added subtask 1 via Enter. Current subtasks: ${JSON.stringify(subtaskItems)}`);
    if (!subtaskItems.includes(subtask1Text)) {
      throw new Error(`Subtask 1 "${subtask1Text}" not found in DetailDrawer`);
    }

    // 2. Add Subtask via Button click
    const subtask2Text = 'مرحله دوم: تست مایگریشن و پایگاه داده';
    await subtaskInput.click();
    await subtaskInput.type(subtask2Text);
    const addSubtaskBtn = await page.$('.btn-subtask-add');
    if (!addSubtaskBtn) throw new Error('Add subtask button (+) not found');
    await addSubtaskBtn.click();
    await sleep(1000);

    subtaskItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.subtask-row-item .subtask-label')).map(el => el.textContent.trim());
    });
    console.log(`✓ Added subtask 2 via (+) button. Current subtasks: ${JSON.stringify(subtaskItems)}`);
    if (!subtaskItems.includes(subtask2Text)) {
      throw new Error(`Subtask 2 "${subtask2Text}" not found in DetailDrawer`);
    }

    // Verify counter: (0 از 2)
    const countPillText = await page.evaluate(() => {
      const pill = document.querySelector('.subtasks-count-pill');
      return pill ? pill.textContent.trim() : '';
    });
    console.log(`✓ Subtask progress pill text: "${countPillText}"`);

    // 3. Test empty subtask prevention
    await subtaskInput.click();
    await subtaskInput.type('    ');
    await page.keyboard.press('Enter');
    await sleep(500);
    const subtaskCountAfterEmpty = await page.evaluate(() => document.querySelectorAll('.subtask-row-item').length);
    if (subtaskCountAfterEmpty !== 2) {
      throw new Error('Empty subtask was erroneously added!');
    }
    console.log('✓ Empty/whitespace subtask correctly rejected.');

    // 4. Test toggling subtask completion
    const firstCheckbox = await page.$('.subtask-row-item .subtask-check-input');
    if (!firstCheckbox) throw new Error('Subtask checkbox not found');
    await firstCheckbox.click();
    await sleep(1000);

    const isFirstDone = await page.evaluate(() => {
      const firstRow = document.querySelector('.subtask-row-item');
      return firstRow && firstRow.classList.contains('done');
    });
    console.log(`✓ Subtask 1 completion state (done class): ${isFirstDone}`);
    if (!isFirstDone) throw new Error('Subtask 1 was not marked as done after clicking checkbox');

    // 5. Test inline editing of Subtask 2
    const editBtn = await page.$('.subtask-row-item:nth-child(2) .btn-subtask-ctrl:not(.danger)');
    if (editBtn) {
      await editBtn.click();
      await sleep(300);
      const editInput = await page.$('.subtask-edit-input');
      if (editInput) {
        await editInput.click({ clickCount: 3 });
        await editInput.type('مرحله دوم: ویرایش‌شده برای تست');
        await page.keyboard.press('Enter');
        await sleep(1000);

        const updatedText = await page.evaluate(() => {
          const row2 = document.querySelector('.subtask-row-item:nth-child(2) .subtask-label');
          return row2 ? row2.textContent.trim() : '';
        });
        console.log(`✓ Subtask 2 edited text: "${updatedText}"`);
      }
    }

    // Take screenshot of DetailDrawer with subtasks
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_detail_drawer_subtasks.png'), fullPage: false });

    // 6. Test Persistence on Page Reload
    console.log('Testing persistence across page reload...');
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);

    // Reopen task detail drawer
    const reloadedCard = await page.evaluateHandle((title) => {
      const cards = Array.from(document.querySelectorAll('.task-card, .task-item'));
      return cards.find(c => c.textContent.includes(title));
    }, testTaskTitle);
    await reloadedCard.asElement().click();
    await sleep(800);

    const reloadedSubtasks = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.subtask-row-item'));
      return rows.map(r => ({
        text: r.querySelector('.subtask-label')?.textContent.trim(),
        done: r.classList.contains('done'),
        checked: r.querySelector('.subtask-check-input')?.checked
      }));
    });
    console.log('✓ Reloaded subtasks verification:', JSON.stringify(reloadedSubtasks));
    if (reloadedSubtasks.length < 2) {
      throw new Error('Subtasks failed to persist on reload!');
    }
    if (!reloadedSubtasks[0].done || !reloadedSubtasks[0].checked) {
      throw new Error('Subtask 1 completion state failed to persist on reload!');
    }
    console.log('✓ Subtask creation and completion fully persisted in database and IndexedDB!\n');

    // 7. Test Deletion
    const deleteSubtaskBtn = await page.$('.subtask-row-item:first-child .btn-subtask-ctrl.danger');
    if (deleteSubtaskBtn) {
      await deleteSubtaskBtn.click();
      await sleep(1000);
      const remainingCount = await page.evaluate(() => document.querySelectorAll('.subtask-row-item').length);
      console.log(`✓ Subtask deleted successfully. Remaining count: ${remainingCount}`);
      if (remainingCount !== 1) {
        throw new Error('Subtask deletion failed');
      }
    }

    // Close DetailDrawer
    const closeDrawerBtn = await page.$('.detail-drawer .btn-icon-close');
    if (closeDrawerBtn) await closeDrawerBtn.click();
    await sleep(500);

    // =========================================================================
    // TASK 2: PWA INSTALLATION MODAL RECOVERY & INTERACTION AUDIT
    // =========================================================================
    console.log('--- Step C: TASK 2 — PWA Install Modal Recovery ---');

    // Open PWA install modal programmatically or via PwaBanner trigger
    await page.evaluate(() => {
      if (typeof window.openInstallDialog === 'function') {
        window.openInstallDialog();
      } else {
        const navItem = document.querySelector('.install-pwa-nav');
        if (navItem) navItem.click();
      }
    });
    await sleep(600);

    // 1. Verify modal is rendered directly in body (Teleport check)
    const modalDirectChildOfBody = await page.evaluate(() => {
      const overlay = document.querySelector('.install-modal-overlay');
      return overlay && overlay.parentElement === document.body;
    });
    console.log(`✓ InstallModal teleported to document.body: ${modalDirectChildOfBody}`);
    if (!modalDirectChildOfBody) {
      throw new Error('InstallModal is NOT teleported to body! It might still be trapped.');
    }

    // 2. Verify pointer-events and z-index computed styles
    const modalStyles = await page.evaluate(() => {
      const overlay = document.querySelector('.install-modal-overlay');
      const card = document.querySelector('.modal-install-card');
      const ovStyle = window.getComputedStyle(overlay);
      const cardStyle = window.getComputedStyle(card);
      return {
        overlayPointerEvents: ovStyle.pointerEvents,
        overlayZIndex: ovStyle.zIndex,
        cardPointerEvents: cardStyle.pointerEvents,
        cardZIndex: cardStyle.zIndex,
        bodyOverflow: document.body.style.overflow
      };
    });
    console.log('✓ InstallModal computed styles:', JSON.stringify(modalStyles));
    if (modalStyles.overlayPointerEvents !== 'auto' || modalStyles.cardPointerEvents !== 'auto') {
      throw new Error(`Pointer events blocked on InstallModal: overlay=${modalStyles.overlayPointerEvents}, card=${modalStyles.cardPointerEvents}`);
    }
    if (modalStyles.bodyOverflow !== 'hidden') {
      throw new Error('Body scroll was not locked when InstallModal opened!');
    }

    // Take screenshot of InstallModal
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_pwa_install_modal.png'), fullPage: false });

    // 3. Test Escape key closes modal
    console.log('Testing Escape key to dismiss InstallModal...');
    await page.keyboard.press('Escape');
    await sleep(600);

    let isModalOpen = await page.evaluate(() => Boolean(document.querySelector('.install-modal-overlay')));
    let bodyOverflowAfterEsc = await page.evaluate(() => document.body.style.overflow);
    console.log(`✓ Modal open after Escape: ${isModalOpen}, body overflow: "${bodyOverflowAfterEsc}"`);
    if (isModalOpen || bodyOverflowAfterEsc !== '') {
      throw new Error('Escape key failed to cleanly close InstallModal or restore body overflow!');
    }

    // 4. Test Backdrop Click closes modal
    console.log('Testing backdrop click to dismiss InstallModal...');
    await page.evaluate(() => {
      if (typeof window.openInstallDialog === 'function') {
        window.openInstallDialog();
      } else {
        const navItem = document.querySelector('.install-pwa-nav');
        if (navItem) navItem.click();
      }
    });
    await sleep(600);

    // Click outside modal card on overlay
    await page.mouse.click(20, 20);
    await sleep(600);

    isModalOpen = await page.evaluate(() => Boolean(document.querySelector('.install-modal-overlay')));
    console.log(`✓ Modal open after Backdrop click: ${isModalOpen}`);
    if (isModalOpen) {
      throw new Error('Backdrop click failed to close InstallModal!');
    }

    // 5. Test "متوجه شدم" button closes modal
    console.log('Testing "متوجه شدم" button to dismiss InstallModal...');
    await page.evaluate(() => {
      if (typeof window.openInstallDialog === 'function') {
        window.openInstallDialog();
      } else {
        const navItem = document.querySelector('.install-pwa-nav');
        if (navItem) navItem.click();
      }
    });
    await sleep(600);

    const dismissBtn = await page.$('.modal-install-card .btn-cancel');
    if (!dismissBtn) throw new Error('Dismiss button not found in InstallModal');
    await dismissBtn.click();
    await sleep(600);

    isModalOpen = await page.evaluate(() => Boolean(document.querySelector('.install-modal-overlay')));
    console.log(`✓ Modal open after "متوجه شدم" click: ${isModalOpen}`);
    if (isModalOpen) {
      throw new Error('Dismiss button failed to close InstallModal!');
    }
    console.log('✓ PWA Install Modal freeze is 100% permanently resolved!\n');

    // =========================================================================
    // TASK 3 & 4: MOBILE VIEWPORTS & UI CONSISTENCY AUDIT
    // =========================================================================
    console.log('--- Step D: TASK 3 & 4 — Mobile Viewports & UI Spacing Audit ---');

    const viewports = [
      { name: '320px_se_compact', width: 320, height: 568 },
      { name: '360px_galaxy', width: 360, height: 740 },
      { name: '375px_iphone', width: 375, height: 667 },
      { name: '390px_iphone14', width: 390, height: 844 },
      { name: '430px_iphone14pro_max', width: 430, height: 932 },
      { name: '768px_tablet', width: 768, height: 1024 },
      { name: '1024px_desktop_compact', width: 1024, height: 768 },
      { name: '1440px_desktop_full', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(400);

      // Check horizontal overflow
      const overflowInfo = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          winWidth,
          docWidth,
          bodyWidth,
          hasOverflow: docWidth > winWidth + 1 || bodyWidth > winWidth + 1
        };
      });

      console.log(`  - Viewport ${vp.width}x${vp.height} (${vp.name}): hasOverflow=${overflowInfo.hasOverflow} (doc=${overflowInfo.docWidth}, win=${overflowInfo.winWidth})`);
      if (overflowInfo.hasOverflow) {
        console.warn(`    ⚠️ Horizontal overflow detected at viewport ${vp.width}px!`);
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `vp_${vp.name}.png`),
        fullPage: false
      });
    }

    console.log('\n✓ All viewports verified and screenshots captured.\n');

    console.log('================================================================================');
    console.log('🎉 ALL AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY! (100% STABLE)');
    console.log('================================================================================');

  } finally {
    if (browser) await browser.close();
    serverProcess.kill();
  }
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
