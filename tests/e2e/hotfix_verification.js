import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = 'C:/Users/Hossein/.gemini/antigravity/brain/bf9d8b02-010f-44b5-8d49-e3d2940690ac/screenshots';

async function runHotfixVerification() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  const log = (step, passed, note = '') => {
    results.push({ step, passed, note });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${step}${note ? ' - ' + note : ''}`);
  };

  const consoleErrors = [];

  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'taskyar_hotfix_'));
  console.log('Launching Chrome for Hotfix Verification (Header & Recurrence Spacing)...');
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

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon.ico')) {
        consoleErrors.push(txt);
      }
    }
  });

  try {
    // 1. Authenticate user
    const testEmail = `hotfix_${Date.now()}@taskyar.ir`;
    await page.goto(`${APP_URL}/register`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#nameInput', { timeout: 10000 });

    await page.evaluate((email) => {
      const nameInput = document.querySelector('#nameInput');
      const emailInput = document.querySelector('#emailInput');
      const passInput = document.querySelector('#passwordInput');
      nameInput.value = 'تست هاتفیکس موبایل';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.value = 'Secret123!';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));

      const submitBtn = document.querySelector('button[type="submit"]');
      submitBtn.click();
    }, testEmail);

    await page.waitForFunction(() => window.location.pathname.includes('/app'), { timeout: 10000 });
    await page.waitForSelector('.main-content', { timeout: 10000 });
    await page.waitForSelector('.tasks-scroll', { timeout: 10000 });
    log('1. User Registration & App Load', true, `URL: ${page.url()}`);

    // Wait for initial render
    await new Promise(r => setTimeout(r, 1000));

    // 2. Viewport Matrix Tests for Header (320px, 360px, 375px, 390px, 430px, 768px, 1440px)
    const viewports = [
      { name: '320px', width: 320, height: 600 },
      { name: '360px', width: 360, height: 740 },
      { name: '375px', width: 375, height: 667 },
      { name: '390px', width: 390, height: 844 },
      { name: '430px', width: 430, height: 932 },
      { name: '768px', width: 768, height: 1024 },
      { name: '1440px', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 250));

      const metrics = await page.evaluate((isDesktop) => {
        const titleEl = document.querySelector('#viewTitle');
        const titleVisible = titleEl && titleEl.offsetWidth > 0;
        const titleText = titleEl ? titleEl.innerText.trim() : '';

        const bodyScrollWidth = document.documentElement.scrollWidth;
        const windowInnerWidth = window.innerWidth;
        const hasHorizontalOverflow = bodyScrollWidth > windowInnerWidth + 1;

        // Header action buttons
        const actionBtns = Array.from(document.querySelectorAll('.main-header .btn-header-action'));
        const visibleBtns = actionBtns.filter(b => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });

        const btnSizes = visibleBtns.map(b => {
          const r = b.getBoundingClientRect();
          return {
            w: Math.round(r.width),
            h: Math.round(r.height),
            title: b.getAttribute('title') || b.className
          };
        });

        // Theme switcher
        const themeBtn = document.querySelector('.theme-switcher');
        const themeRect = themeBtn ? themeBtn.getBoundingClientRect() : null;

        // Mobile more menu button
        const moreBtn = document.querySelector('.more-menu-btn');
        const moreBtnVisible = moreBtn && moreBtn.offsetWidth > 0;

        return {
          titleVisible,
          titleText,
          hasHorizontalOverflow,
          bodyScrollWidth,
          windowInnerWidth,
          btnSizes,
          themeSize: themeRect ? { w: Math.round(themeRect.width), h: Math.round(themeRect.height) } : null,
          moreBtnVisible
        };
      }, vp.width >= 640);

      const buttonsSatisfied = metrics.btnSizes.every(b => b.w >= 34 && b.h >= 34);
      const passed = !metrics.hasHorizontalOverflow && metrics.titleVisible && buttonsSatisfied;
      log(`2. Viewport ${vp.name} Header Check`, passed,
        `Overflow: ${metrics.hasHorizontalOverflow ? 'YES' : 'NO'}, Title: "${metrics.titleText}", VisibleBtns: ${metrics.btnSizes.length} (${metrics.btnSizes.map(b => `${b.w}x${b.h}`).join(', ')}), MoreBtn: ${metrics.moreBtnVisible ? 'YES' : 'NO'}`);
    }

    // 3. Capture 320px Header in Light & Dark Mode
    await page.setViewport({ width: 320, height: 600 });
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_header_320px_light.png') });
    log('3. Captured 320px Header (Light Mode)', true);

    // Toggle Dark Mode via header button
    const darkModeBtn = await page.$('.btn-header-action.dark-mode-toggle');
    if (darkModeBtn) {
      await darkModeBtn.click();
      await new Promise(r => setTimeout(r, 350));
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      log('4. Toggle Dark Mode (320px)', isDark, 'Dark class applied to html');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_header_320px_dark.png') });
      log('5. Captured 320px Header (Dark Mode)', true);

      // Revert back to light mode
      await darkModeBtn.click();
      await new Promise(r => setTimeout(r, 350));
    }

    // 4. Test Mobile Overflow (More) Menu at 390px
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 250));

    const moreBtn = await page.$('.more-menu-btn');
    if (moreBtn) {
      await moreBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const popoverVisible = await page.evaluate(() => {
        const pop = document.querySelector('.header-more-popover');
        if (!pop) return false;
        const rect = pop.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      log('6. Mobile More Menu Open', popoverVisible, 'Popover displayed correctly');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_header_more_menu_390px.png') });

      // Click Shortcuts in More Menu
      const shortcutsItem = await page.$('.more-popover-item.shortcuts-btn');
      if (shortcutsItem) {
        await shortcutsItem.click();
        await new Promise(r => setTimeout(r, 400));

        const shortcutsModalVisible = await page.evaluate(() => {
          const m = document.querySelector('.modal-shortcuts-card');
          return !!m;
        });
        log('7. Shortcuts Modal Opened from More Menu', shortcutsModalVisible);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_shortcuts_modal_from_more_menu.png') });

        // Close shortcuts modal via Escape
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 350));
      }

      // Re-open More Menu and click About
      await moreBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const aboutItem = await page.$('.more-popover-item.about-btn');
      if (aboutItem) {
        await aboutItem.click();
        await new Promise(r => setTimeout(r, 400));

        const aboutModalVisible = await page.evaluate(() => {
          const m = document.querySelector('.about-card');
          return !!m;
        });
        log('8. About Modal Opened from More Menu', aboutModalVisible);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_about_modal_from_more_menu.png') });

        // Close about modal via Escape
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 350));
      }
    }

    // 5. Desktop Header at 1440px
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_header_desktop_1440px.png') });
    log('9. Desktop Header (1440px) Captured', true);

    // 6. Recurrence Modal Spacing Audit at 390px (Mobile Bottom Sheet)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 300));

    // Open recurrence modal from bottom bar recurrence trigger button
    const recTriggerBtn = await page.$('.recurrence-trigger-btn');
    if (recTriggerBtn) {
      await recTriggerBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.recurrence-modal');
      return !!modal;
    });

    log('10. Recurrence Modal Open (Mobile 390px)', modalVisible);

    if (modalVisible) {
      // Select weekly pattern via AppSelect to reveal chips and interval controls
      const trigger = await page.$('#recurrencePatternSelect-trigger, .recurrence-modal .app-select-trigger');
      if (trigger) {
        await trigger.click();
        await new Promise(r => setTimeout(r, 200));
        const weeklyOpt = await page.$('#select-opt-weekly');
        if (weeklyOpt) {
          await weeklyOpt.click();
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Audit Spacing and Elements
      const spacingAudit = await page.evaluate(() => {
        const modal = document.querySelector('.recurrence-modal');
        const modalBody = document.querySelector('.recurrence-body-content') || document.querySelector('.modal-body');
        const intervalRow = document.querySelector('.interval-row');
        const weekdayGrid = document.querySelector('.weekday-grid');
        const weekdayChips = Array.from(document.querySelectorAll('.weekday-chip'));
        const endConditionBox = document.querySelector('.end-condition-box');
        const summaryCard = document.querySelector('.summary-card');
        const modalFooter = document.querySelector('.modal-footer');

        const chipSizes = weekdayChips.map(c => {
          const r = c.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        });

        const computed = {
          modalPadding: modal ? window.getComputedStyle(modal).padding : null,
          intervalPadding: intervalRow ? window.getComputedStyle(intervalRow).padding : null,
          weekdayGap: weekdayGrid ? window.getComputedStyle(weekdayGrid).gap : null,
          chipsMinHeight: chipSizes.length > 0 ? Math.min(...chipSizes.map(c => c.h)) : 0,
          endConditionBoxPadding: endConditionBox ? window.getComputedStyle(endConditionBox).padding : null,
          summaryCardPadding: summaryCard ? window.getComputedStyle(summaryCard).padding : null,
          footerPadding: modalFooter ? window.getComputedStyle(modalFooter).padding : null
        };
        return computed;
      });

      log('11. Recurrence Modal Spacing Audit',
        spacingAudit.chipsMinHeight >= 38 && spacingAudit.intervalPadding !== null,
        `Chips Min Height: ${spacingAudit.chipsMinHeight}px, Interval Pad: ${spacingAudit.intervalPadding}, EndBox Pad: ${spacingAudit.endConditionBoxPadding}, Summary Pad: ${spacingAudit.summaryCardPadding}`);

      // Capture Mobile Recurrence Modal (Light Mode)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_recurrence_modal_mobile_390px.png') });
      log('12. Captured Mobile Recurrence Modal (Light Mode)', true);

      // Toggle Dark Mode while modal is open
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await new Promise(r => setTimeout(r, 200));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_recurrence_modal_dark_390px.png') });
      log('13. Captured Mobile Recurrence Modal (Dark Mode)', true);

      // Revert dark mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme');
      });

      // Desktop Recurrence Modal
      await page.setViewport({ width: 1440, height: 900 });
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_recurrence_modal_desktop_1440px.png') });
      log('14. Captured Desktop Recurrence Modal (1440px)', true);

      // Close modal
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 300));
    }

    // 7. Verify Sync Button Click
    const syncBtn = await page.$('.btn-header-action.sync-status-btn');
    if (syncBtn) {
      await syncBtn.click();
      await new Promise(r => setTimeout(r, 500));
      log('15. Sync Button Clicked Successfully', true);
    }

    // 8. Console Errors Check
    log('16. Zero Console Errors Check', consoleErrors.length === 0,
      consoleErrors.length > 0 ? `Errors: ${consoleErrors.join(' | ')}` : 'Clean console');

  } catch (err) {
    console.error('Test execution error:', err);
    log('Test Execution', false, err.message);
  } finally {
    await browser.close();
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch (e) {}
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n================================`);
  console.log(`HOTFIX VERIFICATION SUMMARY: ${passedCount}/${results.length} PASSED`);
  console.log(`================================\n`);

  if (consoleErrors.length > 0) {
    console.log('Console Errors Detected:', consoleErrors);
  }
}

runHotfixVerification();
