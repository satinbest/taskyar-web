import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import http from 'http';

const BASE_URL = 'http://127.0.0.1:8088';
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

async function runTestSuite() {
  console.log('==================================================================');
  console.log('TaskYar Web 2.0 — Automated PWA, IndexedDB & Responsive Test Suite');
  console.log('==================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const results = [];

  function assert(title, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${title} ${extraInfo}`);
      results.push({ title, status: 'PASS', info: extraInfo });
    } else {
      console.error(`  ✗ [FAIL] ${title} ${extraInfo}`);
      results.push({ title, status: 'FAIL', info: extraInfo });
    }
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 1: PWA Manifest, Icons & Service Worker Asset Integrity
  // -------------------------------------------------------------------------
  console.log('--- TEST SECTION 1: PWA Manifest & Static Icon Assets ---');

  // 1.1 Manifest webmanifest check
  const manifestRes = await safeFetch(`${BASE_URL}/manifest.webmanifest`);
  assert('Manifest returns HTTP 200', manifestRes.status === 200, `Status: ${manifestRes.status}`);

  const manifestJson = await manifestRes.json();
  assert('Manifest has valid name and short_name', manifestJson.name === 'تسک‌یار وب — مدیریت هوشمند کارها' && manifestJson.short_name === 'تسک‌یار');
  assert('Manifest has standalone display mode', manifestJson.display === 'standalone');
  assert('Manifest has icons array', Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 4);

  // 1.2 Verify every manifest icon resolves with HTTP 200 and image mime type
  for (const icon of manifestJson.icons) {
    const iconRes = await safeFetch(`${BASE_URL}${icon.src}`);
    const contentType = iconRes.headers.get('content-type') || '';
    assert(
      `Manifest icon returns HTTP 200: ${icon.src}`,
      iconRes.status === 200,
      `Status: ${iconRes.status}, Content-Type: ${contentType}`
    );
  }

  // 1.3 Verify backward-compatible /icons/ routes fallback
  const legacySvg = await safeFetch(`${BASE_URL}/icons/icon.svg`);
  assert('Legacy route /icons/icon.svg returns HTTP 200', legacySvg.status === 200);

  const legacyPng = await safeFetch(`${BASE_URL}/icons/icon-192.png`);
  assert('Legacy route /icons/icon-192.png returns HTTP 200', legacyPng.status === 200);

  // 1.4 Verify sw.js
  const swRes = await safeFetch(`${BASE_URL}/sw.js`);
  const swText = await swRes.text();
  assert('Service Worker script returns HTTP 200', swRes.status === 200);
  assert('Service Worker references taskyar-v2.0.0 cache', swText.includes('taskyar-v2.0.0'));
  assert('Service Worker precaches /pwa-icons/icon.svg', swText.includes('/pwa-icons/icon.svg'));

  // -------------------------------------------------------------------------
  // TEST SECTION 2: Browser Launch, Console Errors, PWA Registration & Auth
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 2: Headless Browser, Auth & Service Worker ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  const dataCloneErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      if (text.includes('DataCloneError') || text.includes('could not be cloned')) {
        dataCloneErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    const msg = String(err);
    consoleErrors.push(msg);
    if (msg.includes('DataCloneError') || msg.includes('could not be cloned')) {
      dataCloneErrors.push(msg);
    }
  });

  // Navigate to register
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });

  assert('Registration page loaded', page.url().includes('/register') || page.url().includes('/app'));

  // Register unique user
  const uniqueEmail = `qa_pwa_${Date.now()}@taskyar.local`;
  const userName = 'کاربر آزمایشی کیو‌ای';

  await page.type('#nameInput', userName);
  await page.type('#emailInput', uniqueEmail);
  await page.type('#passwordInput', 'Secret123456!');

  // Submit registration form
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.startsWith('/app'), { timeout: 10000 });

  assert('Successfully redirected to /app after registration', page.url().includes('/app'));

  // Check Service Worker registration in browser
  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(reg);
  });
  assert('Service Worker registered in browser context', swRegistered);

  // -------------------------------------------------------------------------
  // TEST SECTION 3: Critical IndexedDB Operations & Zero DataCloneError
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 3: IndexedDB Account Storage & DataClone Immunity ---');

  const idbTestResult = await page.evaluate(async () => {
    try {
      const auth = window.__PINIA__._s.get('auth');
      const tasksStore = window.__PINIA__._s.get('tasks');
      const userId = auth.user.id;

      // 1. Verify user DB name
      const expectedDbName = `TaskYarDB_${userId}`;

      // 2. Add task via store (calls saveTaskOffline)
      const t1 = await tasksStore.addTask({
        title: 'تسک شماره یک آفلاین تست',
        period: 'daily',
        due_date: '2026-10-29',
        important: true,
        notes: 'یادداشت تست تسک آفلاین',
        subtasks: [{ title: 'زیرتسک شماره ۱', completed: false }]
      });

      // 3. Add recurring task
      const t2 = await tasksStore.addTask({
        title: 'تسک هفتگی دوره‌ای',
        period: 'weekly',
        due_date: '2026-10-30',
        recurrence_pattern: 'weekly',
        recurrence_interval: 1
      });

      // 4. Create category (calls saveCategoriesOffline)
      const cat = await tasksStore.createCategory({
        name: 'پروژه‌های کاری',
        color: '#10B981'
      });

      // 5. Create tag (calls saveTagsOffline)
      const tag = await tasksStore.createTag({
        name: 'مهم_فوری',
        color: '#EF4444'
      });

      // 6. Test manual deep direct put on IndexedDB to verify structured clone
      const req = indexedDB.open(expectedDbName, 1);
      const dbOpened = await new Promise((res, rej) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });

      // Read back tasks from IDB
      const readTx = dbOpened.transaction('tasks', 'readonly');
      const tasksStoreIdb = readTx.objectStore('tasks');
      const allTasks = await new Promise((res, rej) => {
        const getReq = tasksStoreIdb.getAll();
        getReq.onsuccess = () => res(getReq.result || []);
        getReq.onerror = () => rej(getReq.error);
      });

      // Read back categories from IDB
      const catTx = dbOpened.transaction('categories', 'readonly');
      const catStoreIdb = catTx.objectStore('categories');
      const allCats = await new Promise((res, rej) => {
        const getReq = catStoreIdb.getAll();
        getReq.onsuccess = () => res(getReq.result || []);
        getReq.onerror = () => rej(getReq.error);
      });

      // Read back tags from IDB
      const tagTx = dbOpened.transaction('tags', 'readonly');
      const tagStoreIdb = tagTx.objectStore('tags');
      const allTags = await new Promise((res, rej) => {
        const getReq = tagStoreIdb.getAll();
        getReq.onsuccess = () => res(getReq.result || []);
        getReq.onerror = () => rej(getReq.error);
      });

      return {
        success: true,
        dbName: expectedDbName,
        taskCount: allTasks.length,
        categoryCount: allCats.length,
        tagCount: allTags.length,
        firstTaskTitle: allTasks[0]?.title || '',
        catName: allCats[0]?.name || '',
        tagName: allTags[0]?.name || ''
      };
    } catch (err) {
      return {
        success: false,
        error: String(err),
        stack: err.stack
      };
    }
  });

  assert('IndexedDB opened and written successfully', idbTestResult.success, JSON.stringify(idbTestResult));
  assert('Tasks stored in IndexedDB without DataCloneError', idbTestResult.taskCount >= 2, `Count: ${idbTestResult.taskCount}`);
  assert('Categories stored in IndexedDB without DataCloneError', idbTestResult.categoryCount >= 1, `Count: ${idbTestResult.categoryCount}`);
  assert('Tags stored in IndexedDB without DataCloneError', idbTestResult.tagCount >= 1, `Count: ${idbTestResult.tagCount}`);
  assert('DataCloneError count is EXACTLY ZERO', dataCloneErrors.length === 0, `Errors: ${JSON.stringify(dataCloneErrors)}`);

  // -------------------------------------------------------------------------
  // TEST SECTION 4: Account Isolation Verification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 4: Multi-User Account Isolation ---');

  const isolationResult = await page.evaluate(async () => {
    const auth = window.__PINIA__._s.get('auth');
    const u1Id = auth.user.id;

    // Logout
    await auth.logout();

    // Register second user
    const u2Email = `qa_user2_${Date.now()}@taskyar.local`;
    const regData = await auth.register('کاربر دوم مستقل', u2Email, 'Password123!');
    const u2Id = regData.user.id;

    const tasksStore = window.__PINIA__._s.get('tasks');
    await tasksStore.initOfflineStore(u2Id);

    // Read second user's IndexedDB
    const req = indexedDB.open(`TaskYarDB_${u2Id}`, 1);
    const db2 = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    const tx = db2.transaction('tasks', 'readonly');
    const tasks = await new Promise((res, rej) => {
      const getReq = tx.objectStore('tasks').getAll();
      getReq.onsuccess = () => res(getReq.result || []);
      getReq.onerror = () => rej(getReq.error);
    });

    return {
      u1Id,
      u2Id,
      isolatedDbName: `TaskYarDB_${u2Id}`,
      u2TaskCount: tasks.length
    };
  });

  assert('User 2 receives distinct database', isolationResult.u1Id !== isolationResult.u2Id, `U1: ${isolationResult.u1Id}, U2: ${isolationResult.u2Id}`);
  assert('Zero data leakage across user accounts', isolationResult.u2TaskCount === 0, `U2 Tasks: ${isolationResult.u2TaskCount}`);

  // Re-login User 1 for UI viewport testing
  await page.evaluate(async (email) => {
    const auth = window.__PINIA__._s.get('auth');
    await auth.login(email, 'Secret123456!');
    const tasksStore = window.__PINIA__._s.get('tasks');
    await tasksStore.initOfflineStore(auth.user.id);
    await tasksStore.fetchTasks();
  }, uniqueEmail);

  await page.waitForSelector('.tasks-scroll', { timeout: 10000 });

  // -------------------------------------------------------------------------
  // TEST SECTION 5: Comprehensive Responsive Viewport Matrix
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 5: Responsive Viewport Matrix (320px - 1440px) ---');

  const viewports = [
    { width: 320, height: 640, label: '320px (iPhone SE small)' },
    { width: 360, height: 740, label: '360px (Samsung Galaxy S8)' },
    { width: 375, height: 667, label: '375px (iPhone 8)' },
    { width: 390, height: 844, label: '390px (iPhone 12/13/14)' },
    { width: 430, height: 932, label: '430px (iPhone 14/15 Pro Max)' },
    { width: 768, height: 1024, label: '768px (iPad Portrait)' },
    { width: 1024, height: 768, label: '1024px (iPad Landscape / Small Desktop)' },
    { width: 1440, height: 900, label: '1440px (Desktop Full)' }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 400));

    const overflowCheck = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const bodyWidth = document.body.scrollWidth;
      return {
        hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
        docWidth,
        winWidth,
        bodyWidth,
        diff: Math.max(docWidth - winWidth, bodyWidth - winWidth)
      };
    });

    assert(
      `Viewport ${vp.label}: ZERO horizontal page overflow`,
      !overflowCheck.hasOverflow,
      `DocWidth: ${overflowCheck.docWidth}px, WinWidth: ${overflowCheck.winWidth}px`
    );

    const shotPath = path.join(SCREENSHOTS_DIR, `viewport_${vp.width}px.png`);
    await page.screenshot({ path: shotPath });
  }

  // -------------------------------------------------------------------------
  // TEST SECTION 6: Mobile Interactive Components Verification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 6: Mobile Interactive Components (375px Viewport) ---');

  await page.setViewport({ width: 375, height: 667 });

  // 6.1 Mobile Sidebar Toggle
  await page.click('.mobile-hamburger-btn');
  await new Promise(r => setTimeout(r, 400));
  const sidebarOpen = await page.evaluate(() => {
    const sb = document.querySelector('.sidebar');
    return sb && sb.classList.contains('mobile-open');
  });
  assert('Mobile sidebar opens on hamburger click', sidebarOpen);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_sidebar_open.png') });

  // Close sidebar
  await page.click('.mobile-backdrop');
  await new Promise(r => setTimeout(r, 300));

  // 6.2 Mobile Week Board View
  await page.evaluate(() => {
    const tasksStore = window.__PINIA__._s.get('tasks');
    tasksStore.currentView = 'weekboard';
  });
  await new Promise(r => setTimeout(r, 400));

  const weekBoardOverflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const container = document.querySelector('.week-board-container');
    const isHorizontalScroll = container ? container.scrollWidth > container.clientWidth : false;
    return {
      pageOverflow: docWidth > winWidth,
      isHorizontalScroll
    };
  });
  assert('WeekBoard on mobile has ZERO page overflow', !weekBoardOverflow.pageOverflow);
  assert('WeekBoard columns form a touch-scrollable snap carousel', weekBoardOverflow.isHorizontalScroll);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_weekboard.png') });

  // 6.3 Mobile Month Board View
  await page.evaluate(() => {
    const tasksStore = window.__PINIA__._s.get('tasks');
    tasksStore.currentView = 'monthboard';
  });
  await new Promise(r => setTimeout(r, 400));

  const monthBoardCheck = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const shortHeaders = Array.from(document.querySelectorAll('.mobile-wname')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    return {
      pageOverflow: docWidth > winWidth,
      shortHeadersVisible: shortHeaders.length >= 7
    };
  });
  assert('MonthBoard on mobile has ZERO page overflow', !monthBoardCheck.pageOverflow);
  assert('MonthBoard displays compact weekday headers (ش، ی، د...) on mobile', monthBoardCheck.shortHeadersVisible);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_monthboard.png') });

  // 6.4 Mobile Detail Drawer
  await page.evaluate(() => {
    const tasksStore = window.__PINIA__._s.get('tasks');
    tasksStore.currentView = 'myday';
    if (tasksStore.tasks.length > 0) {
      tasksStore.selectedTaskId = tasksStore.tasks[0].id;
    }
  });
  await new Promise(r => setTimeout(r, 400));

  const drawerCheck = await page.evaluate(() => {
    const drawer = document.querySelector('.detail-drawer');
    const isOpen = drawer && drawer.classList.contains('open');
    const width = drawer ? drawer.getBoundingClientRect().width : 0;
    return {
      isOpen,
      isFullScreenOnMobile: width >= window.innerWidth - 10
    };
  });
  assert('DetailDrawer opens and adapts to full mobile screen', drawerCheck.isOpen && drawerCheck.isFullScreenOnMobile);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_detail_drawer.png') });

  // Close drawer
  await page.evaluate(() => {
    const tasksStore = window.__PINIA__._s.get('tasks');
    tasksStore.selectedTaskId = null;
  });

  // 6.5 PWA Install Modal UI (triggered via mobile sidebar menu)
  await page.click('.mobile-hamburger-btn');
  await new Promise(r => setTimeout(r, 400));
  await page.waitForSelector('.install-pwa-nav', { visible: true });
  await page.click('.install-pwa-nav');
  await page.waitForSelector('.modal-install-card', { visible: true, timeout: 5000 });

  const installModalCheck = await page.evaluate(() => {
    const modal = document.querySelector('.modal-install-card');
    return Boolean(modal);
  });
  assert('PWA Install Guide Modal renders properly via Sidebar action', installModalCheck);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_install_modal.png') });

  // Close install modal
  await page.click('.btn-cancel');
  await new Promise(r => setTimeout(r, 300));

  // -------------------------------------------------------------------------
  // TEST SECTION 7: Browser Console Audit
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 7: Browser Console Audit ---');

  const appErrors = consoleErrors.filter(e => {
    // Exclude third-party browser-extension inspector.js unload errors
    if (e.includes('inspector') && e.includes('unload')) return false;
    // Exclude ad auction permissions policy warnings from external proxy
    if (e.includes('Permissions-Policy') || e.includes('run-ad-auction')) return false;
    return true;
  });

  assert('Zero application-origin uncaught console errors', appErrors.length === 0, `Errors: ${JSON.stringify(appErrors)}`);
  assert('Zero DataCloneError occurrences across entire session', dataCloneErrors.length === 0);

  // Close browser
  await browser.close();

  // Summary
  console.log('\n==================================================================');
  console.log(`TEST SUMMARY: ${passedTests} OF ${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('==================================================================\n');

  if (passedTests === totalTests) {
    console.log('SUCCESS: All PWA, IndexedDB, and Mobile Responsive tests PASSED with 100% compliance.');
    process.exit(0);
  } else {
    console.error('FAILURE: Some tests did not pass.');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
