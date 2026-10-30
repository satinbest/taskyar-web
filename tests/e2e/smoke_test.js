import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = 'C:/Users/Hossein/.gemini/antigravity-ide/brain/066ea5f9-2089-4e68-9136-450e3e311075/screenshots';

async function fillAndSubmitModal(page, { tab, name, email, password }) {
  if (tab) {
    await page.evaluate((targetTabName) => {
      const modal = document.querySelector('#authModal .modal-card');
      if (!modal) return;
      const tabBtns = Array.from(modal.querySelectorAll('div button'));
      const targetTab = tabBtns.find(b => b.textContent.trim() === targetTabName);
      if (targetTab) targetTab.click();
    }, tab === 'register' ? 'ثبت‌نام' : 'ورود');
    await new Promise(r => setTimeout(r, 400));
  }

  await page.evaluate(({ name, email, password }) => {
    const modal = document.querySelector('#authModal .modal-card');
    if (!modal) return;

    const nameInput = modal.querySelector('input[placeholder*="علی"]');
    const emailInput = modal.querySelector('input[type="email"]');
    const passInput = modal.querySelector('input[type="password"]');

    if (nameInput && name) {
      nameInput.value = name;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (emailInput && email) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (passInput && password) {
      passInput.value = password;
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  }, { name, email, password });
}

async function runSmokeTest() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  const log = (step, passed, note = '') => {
    results.push({ step, passed, note });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${step}${note ? ' - ' + note : ''}`);
  };

  console.log('Launching Chrome browser...');
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
    // 1. Initial Page Load
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    log('1. Page Load', true, 'App loaded successfully');

    const authModalVisible = await page.$('#authModal.show');
    if (!authModalVisible) {
      const logoutBtn = await page.$('button[title="خروج از حساب کاربری"]');
      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForSelector('#authModal.show');
      }
    }

    // 2. User 1 Registration & Login
    const timestamp = Date.now();
    const user1Email = `user1_${timestamp}@taskyar.ir`;
    const user1Pass = 'Password123!';

    await fillAndSubmitModal(page, {
      tab: 'register',
      name: 'کاربر اول تستی',
      email: user1Email,
      password: user1Pass
    });

    await page.waitForFunction(() => !document.querySelector('#authModal.show'), { timeout: 8000 });
    log('2. User 1 Registration & Login', true, `Registered as ${user1Email}`);
    await new Promise(r => setTimeout(r, 1000));

    // 3. Capture Screenshots (Desktop & Mobile)
    const desktopScreenshotPath = path.join(SCREENSHOT_DIR, 'myday_desktop.png');
    await page.screenshot({ path: desktopScreenshotPath });
    log('3a. Desktop Screenshot', true, `Saved to ${desktopScreenshotPath}`);

    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise(r => setTimeout(r, 500));
    const mobileScreenshotPath = path.join(SCREENSHOT_DIR, 'myday_mobile.png');
    await page.screenshot({ path: mobileScreenshotPath });
    log('3b. Mobile Screenshot', true, `Saved to ${mobileScreenshotPath}`);

    await page.setViewport({ width: 1280, height: 800, isMobile: false });
    await new Promise(r => setTimeout(r, 500));

    // 4. Task Creation
    const testTaskTitle = 'خرید کتاب لاراول و معماری وب';
    await page.evaluate((title) => {
      const titleInput = document.querySelector('#newTaskInput');
      const timeInput = document.querySelector('#newTaskTime');
      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (timeInput) {
        timeInput.value = '15:45';
        timeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const addBtn = document.querySelector('.add-task-bar .btn-add');
      if (addBtn) addBtn.click();
    }, testTaskTitle);

    // Wait for the new task card to appear
    await page.waitForFunction((expectedTitle) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return titles.some(t => t.textContent.includes(expectedTitle));
    }, { timeout: 5000 }, testTaskTitle);
    log('4. Task Creation', true, `Created: "${testTaskTitle}"`);

    // 5. Task Editing
    // Click specifically on the created task card
    await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll('.task-card'));
      const card = cards.find(c => c.querySelector('.task-title')?.textContent.includes(title));
      if (card) card.click();
    }, testTaskTitle);
    await page.waitForSelector('.detail-drawer.open', { timeout: 3000 });

    const editedTitle = 'خرید کتاب پیشرفته لاراول (ویرایش شده)';
    await page.evaluate((newTitle) => {
      const input = document.querySelector('.drawer-title-input');
      if (input) {
        input.value = newTitle;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, editedTitle);
    await new Promise(r => setTimeout(r, 1200));

    const cardUpdated = await page.evaluate((newTitle) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return titles.some(t => t.textContent.includes(newTitle));
    }, editedTitle);
    log('5. Task Editing', cardUpdated, `Updated card title to: "${editedTitle}"`);

    // 6. Task Completion
    await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll('.task-card'));
      const card = cards.find(c => c.querySelector('.task-title')?.textContent.includes(title));
      const checkbox = card?.querySelector('.custom-checkbox');
      if (checkbox) checkbox.click();
    }, editedTitle);
    await new Promise(r => setTimeout(r, 1200));

    const taskCompleted = await page.evaluate((title) => {
      const completedCards = Array.from(document.querySelectorAll('.task-card.completed'));
      return completedCards.some(c => c.querySelector('.task-title')?.textContent.includes(title));
    }, editedTitle);
    log('6. Task Completion', taskCompleted, 'Task checked and moved to completed section');

    // 7. Task Deletion
    // Click card to open drawer
    await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll('.task-card.completed'));
      const card = cards.find(c => c.querySelector('.task-title')?.textContent.includes(title));
      if (card) card.click();
    }, editedTitle);
    await page.waitForSelector('.detail-drawer.open', { timeout: 3000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.detail-drawer button'));
      const del = btns.find(b => b.textContent.includes('حذف'));
      if (del) del.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const taskDeleted = await page.evaluate((title) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return !titles.some(t => t.textContent.includes(title));
    }, editedTitle);
    log('7. Task Deletion', taskDeleted, 'Task deleted and removed from view');

    // 8. Logout User 1
    const logoutBtn = await page.$('button[title="خروج از حساب کاربری"]');
    await logoutBtn.click();
    await page.waitForSelector('#authModal.show', { timeout: 5000 });
    log('8. Logout', true, 'Logged out and returned to auth modal');

    // 9. Login with Second Account (User 2)
    const user2Email = `user2_${timestamp}@taskyar.ir`;
    await fillAndSubmitModal(page, {
      tab: 'register',
      name: 'کاربر دوم ایزوله',
      email: user2Email,
      password: 'Password456!'
    });
    await page.waitForFunction(() => !document.querySelector('#authModal.show'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));

    // Verify User 2 cannot see User 1's created task or deleted task
    const user2SeesUser1 = await page.evaluate((title) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return titles.some(t => t.textContent.includes(title));
    }, editedTitle);
    log('9. User Isolation (User 2 does not see User 1 tasks)', !user2SeesUser1, 'User 2 workspace is completely private');

    // 10. Create Task for User 2
    const user2TaskTitle = 'برنامه کاملاً انحصاری کاربر دوم';
    await page.evaluate((title) => {
      const titleInput = document.querySelector('#newTaskInput');
      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const addBtn = document.querySelector('.add-task-bar .btn-add');
      if (addBtn) addBtn.click();
    }, user2TaskTitle);
    await page.waitForFunction((title) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return titles.some(t => t.textContent.includes(title));
    }, { timeout: 5000 }, user2TaskTitle);
    log('10. User 2 Task Creation', true, `Created: "${user2TaskTitle}"`);

    // Logout User 2
    const logoutBtn2 = await page.$('button[title="خروج از حساب کاربری"]');
    await logoutBtn2.click();
    await page.waitForSelector('#authModal.show', { timeout: 5000 });

    // 11. Login back as User 1
    await fillAndSubmitModal(page, {
      tab: 'login',
      email: user1Email,
      password: user1Pass
    });
    await page.waitForFunction(() => !document.querySelector('#authModal.show'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));

    // Verify User 1 cannot see User 2's task
    const user1SeesUser2 = await page.evaluate((title) => {
      const titles = Array.from(document.querySelectorAll('.task-card .task-title'));
      return titles.some(t => t.textContent.includes(title));
    }, user2TaskTitle);
    log('11. User Isolation Roundtrip (User 1 does not see User 2 tasks)', !user1SeesUser2, 'User 1 cannot see User 2 tasks');

  } catch (err) {
    console.error('Smoke test error:', err);
    log('Smoke Test Error', false, err.message);
  } finally {
    await browser.close();
  }

  const allPassed = results.every(r => r.passed);
  console.log('\n=======================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED: ${results.filter(r => r.passed).length}`);
  console.log(`FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`STATUS: ${allPassed ? 'ALL VERIFICATIONS PASSED' : 'SOME VERIFICATIONS FAILED'}`);
  console.log('=======================================');

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'smoke_test_report.json'),
    JSON.stringify({ results, allPassed, timestamp: new Date().toISOString() }, null, 2)
  );

  process.exit(allPassed ? 0 : 1);
}

runSmokeTest();
