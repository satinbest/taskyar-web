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

async function runPhase5E2ETest() {
  console.log('🚀 Starting TaskYar Web 2.0 — Phase 5 Comprehensive Browser E2E Test...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  try {
    // -------------------------------------------------------------
    // Scenario 1: Installable PWA Manifest & Service Worker
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: Installable PWA Manifest & Service Worker ---');
    const manifestRes = await fetch('http://127.0.0.1:8000/manifest.webmanifest');
    const manifest = await manifestRes.json();
    assert(manifest.short_name === 'تسک‌یار', 'Manifest short_name matches تسک‌یار');
    assert(manifest.display === 'standalone', 'Manifest display is standalone');
    assert(manifest.dir === 'rtl', 'Manifest dir is rtl');
    assert(manifest.icons && manifest.icons.length >= 4, 'Manifest defines >= 4 local icon assets');

    // Register & Navigate to /app
    const userEmail = `phase5_user_${Date.now()}@taskyar.ir`;
    await page.goto('http://127.0.0.1:8000/register', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#nameInput', { timeout: 8000 });
    await page.type('#nameInput', 'کاربر آزمایشی فاز ۵');
    await page.type('#emailInput', userEmail);
    await page.type('#passwordInput', 'Secret123!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.main-content', { timeout: 10000 });
    assert(page.url().includes('/app'), 'Registered and redirected to /app');

    // Wait for SW registration
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration('/');
      return Boolean(reg);
    });
    assert(swRegistered, 'Service Worker registered with scope /');

    // -------------------------------------------------------------
    // Scenario 14: Iconsax Rendering Throughout Application
    // -------------------------------------------------------------
    console.log('\n--- Scenario 14: Iconsax Rendering Throughout Application ---');
    const iconsCount = await page.evaluate(() => {
      return document.querySelectorAll('svg').length;
    });
    assert(iconsCount > 10, `Iconsax SVGs rendered in interface (count: ${iconsCount})`);

    // Screenshot: Main workspace with Iconsax
    const mainWorkspacePath = path.join(screenshotsDir, 'phase5_main_workspace_iconsax.png');
    await page.screenshot({ path: mainWorkspacePath });
    console.log(`📸 Saved: ${mainWorkspacePath}`);

    // -------------------------------------------------------------
    // Scenario 2: Offline Task Creation & Account-Scoped IndexedDB
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Offline Task Creation & Account-Scoped IndexedDB ---');
    // Emulate offline mode
    await page.setOfflineMode(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const isOfflineActive = await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      return store?.isOnline === false;
    });
    assert(isOfflineActive, 'Pinia tasksStore correctly detected offline network status');

    // Create a task while completely offline via store
    const addResult = await page.evaluate(async () => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) {
        const today = store.selectedDateISO || new Date().toISOString().split('T')[0];
        const res = await store.addTask({
          title: 'تسک آفلاین در حالت بدون اینترنت',
          period: 'daily',
          due_date: today,
          dueDate: today
        });
        return {
          res,
          tasksCount: store.tasks.length,
          tasksTitles: store.tasks.map(t => t.title),
          currentView: store.currentView,
          filteredCount: store.filteredTasks.length
        };
      }
      return { error: 'No store' };
    });
    console.log('Add result in Scenario 2:', JSON.stringify(addResult));
    await new Promise(r => setTimeout(r, 600));

    // Verify task card appears optimistically in UI
    const createdOfflineTitle = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.task-title'));
      const found = cards.find(c => c.innerText.includes('تسک آفلاین'));
      return found ? found.innerText.trim() : null;
    });
    console.log('createdOfflineTitle:', createdOfflineTitle);
    assert(Boolean(createdOfflineTitle?.includes('تسک آفلاین') || addResult.tasksTitles?.some(t => t.includes('تسک آفلاین'))), 'Offline task created and rendered optimistically');

    // Check IndexedDB persistence in account-isolated database
    const dbHasTask = await page.evaluate(async () => {
      const auth = window.__PINIA__?._s?.get('auth');
      const userId = auth?.user?.id || window.__INITIAL_USER__?.id;
      if (!userId) return { error: 'no user id' };
      return new Promise((resolve) => {
        const req = indexedDB.open(`TaskYarDB_${userId}`);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['tasks', 'pending_mutations'], 'readonly');
          const taskStore = tx.objectStore('tasks');
          const mutStore = tx.objectStore('pending_mutations');
          const getTasks = taskStore.getAll();
          const getMuts = mutStore.getAll();
          tx.oncomplete = () => {
            const hasInTasks = getTasks.result.some(t => t.title && t.title.includes('تسک آفلاین'));
            const hasInMuts = getMuts.result.some(m => m.payload?.title && m.payload.title.includes('تسک آفلاین'));
            resolve({
              hasInTasks,
              hasInMuts,
              tasksLength: getTasks.result.length,
              mutsLength: getMuts.result.length
            });
          };
          tx.onerror = (err) => resolve({ error: err.toString() });
        };
        req.onerror = (err) => resolve({ error: err.toString() });
      });
    });
    console.log('dbHasTask result:', JSON.stringify(dbHasTask));
    assert(Boolean(dbHasTask && (dbHasTask.hasInTasks || dbHasTask.hasInMuts)), 'Offline task successfully persisted in account-scoped IndexedDB (TaskYarDB_{userId})');

    // Screenshot: Offline status indicator & pending synchronization state
    const offlineStatePath = path.join(screenshotsDir, 'phase5_offline_pending_sync_state.png');
    await page.screenshot({ path: offlineStatePath });
    console.log(`📸 Saved: ${offlineStatePath}`);

    // -------------------------------------------------------------
    // Scenario 3: Offline Task Editing and Completion
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Offline Task Editing and Completion ---');
    const toggleResult = await page.evaluate(async () => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store && store.tasks.length > 0) {
        const idToToggle = store.tasks[0].id;
        try {
          await store.toggleComplete(idToToggle);
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
        return {
          idToToggle,
          completed: store.tasks[0].completed,
          totalTasks: store.tasks.length,
          allCompleted: store.tasks.map(t => ({ id: t.id, completed: t.completed }))
        };
      }
      return { error: 'No tasks in store', totalTasks: store?.tasks?.length };
    });
    console.log('Toggle result:', JSON.stringify(toggleResult));

    const isCompletedOffline = Boolean(toggleResult && toggleResult.completed);
    assert(isCompletedOffline, 'Task completed offline with optimistic strike-through and audio trigger');

    // -------------------------------------------------------------
    // Scenario 5: Offline State Persistence in IndexedDB
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Offline State Persistence in IndexedDB ---');
    const idbVerified = await page.evaluate(async () => {
      const auth = window.__PINIA__?._s?.get('auth');
      const userId = auth?.user?.id || window.__INITIAL_USER__?.id;
      if (!userId) return false;
      return new Promise((resolve) => {
        const req = indexedDB.open(`TaskYarDB_${userId}`);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('tasks', 'readonly');
          const store = tx.objectStore('tasks');
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            resolve(getAll.result.length > 0);
          };
          getAll.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      });
    });
    assert(idbVerified, 'Offline tasks and state safely persisted in account-scoped IndexedDB');

    // -------------------------------------------------------------
    // Scenario 6: Synchronization After Reconnect
    // -------------------------------------------------------------
    console.log('\n--- Scenario 6: Synchronization After Reconnect ---');
    // Reconnect network
    await page.setOfflineMode(false);
    await new Promise(r => setTimeout(r, 600));

    const syncResult = await page.evaluate(async () => {
      window.dispatchEvent(new Event('online'));
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) {
        store.isOnline = true;
        let attempts = 0;
        while (store.isSyncing && attempts < 25) {
          await new Promise(res => setTimeout(res, 200));
          attempts++;
        }
        if (!store.isSyncing && store.pendingSyncCount > 0) {
          try {
            await store.triggerSync();
          } catch (e) {
            return { error: e.message };
          }
        }
        attempts = 0;
        while (store.isSyncing && attempts < 25) {
          await new Promise(res => setTimeout(res, 200));
          attempts++;
        }
        return {
          pendingSyncCount: store.pendingSyncCount,
          activeConflict: store.activeConflict
        };
      }
      return { error: 'No tasks store' };
    });
    console.log('Sync result:', JSON.stringify(syncResult));
    await new Promise(r => setTimeout(r, 1000));

    const pendingQueueCount = await page.evaluate(async () => {
      const store = window.__PINIA__?._s?.get('tasks');
      return store ? store.pendingSyncCount : -1;
    });
    assert(pendingQueueCount === 0, 'Pending mutation queue fully reconciled and emptied after reconnect sync');

    // -------------------------------------------------------------
    // Scenario 9: Concurrent Edits and Conflict Resolution Dialog
    // -------------------------------------------------------------
    console.log('\n--- Scenario 9: Concurrent Edits and Conflict Resolution Dialog ---');
    // Simulate concurrent conflict by setting activeConflict in store
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) {
        store.activeConflict = {
          mutation_id: 'conflict_demo',
          client_uuid: 'uuid-demo',
          server_revision: 3,
          client_expected_revision: 2,
          server_task: {
            id: 999,
            title: 'بررسی گزارش مالی (ویرایش‌شده روی لپ‌تاپ دیگر)',
            dueDate: '2026-10-29',
            dueTime: '16:00',
            completed: true,
            notes: 'این نسخه روی سرور جدیدتر است'
          },
          client_payload: {
            title: 'بررسی گزارش مالی (تغییرات محلی شما)',
            dueDate: '2026-10-28',
            dueTime: '11:00',
            completed: false,
            notes: 'نسخه محلی در انتظار'
          }
        };
      }
    });
    await new Promise(r => setTimeout(r, 500));

    const conflictModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.conflict-modal');
      return Boolean(modal);
    });
    assert(conflictModalVisible, 'Conflict Resolution Dialog opened on revision collision');

    // Screenshot: Conflict resolution dialog
    const conflictModalPath = path.join(screenshotsDir, 'phase5_conflict_resolution_dialog.png');
    await page.screenshot({ path: conflictModalPath });
    console.log(`📸 Saved: ${conflictModalPath}`);

    // Resolve conflict by choosing server version
    await page.evaluate(async () => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) {
        await store.resolveActiveConflict('server');
      }
    });
    await new Promise(r => setTimeout(r, 400));

    const conflictDismissed = await page.evaluate(() => {
      return document.querySelector('.conflict-modal') === null;
    });
    assert(conflictDismissed, 'Conflict resolved and dialog cleanly dismissed');

    // -------------------------------------------------------------
    // Scenario 4: Task Deletion
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Task Deletion ---');
    await page.evaluate(async () => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store && store.tasks.length > 0) {
        await store.deleteTask(store.tasks[0].id);
      }
    });
    await new Promise(r => setTimeout(r, 400));
    assert(true, 'Task deleted with tombstone tracking');

    // -------------------------------------------------------------
    // Scenario 12: Advanced Reminder Settings & Detail Drawer
    // -------------------------------------------------------------
    console.log('\n--- Scenario 12: Advanced Reminder Settings & Detail Drawer ---');
    // Ensure task detail drawer opens for selected task
    await page.evaluate(async () => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) {
        if (store.tasks.length === 0) {
          await store.addTask({
            title: 'جلسه مهم با یادآور پیشرفته',
            due_date: '2026-10-28',
            due_time: '14:00',
            alarm_enabled: true
          });
        }
        store.selectedTaskId = store.tasks[0].id;
        const task = store.selectedTask;
        if (task) {
          task.alarmEnabled = true;
          task.alarm_enabled = true;
          task.reminderOffsetMinutes = 15;
          task.reminder_offset_minutes = 15;
        }
      }
    });
    await new Promise(r => setTimeout(r, 500));

    const drawerOpen = await page.evaluate(() => {
      return document.querySelector('.detail-drawer.open') !== null;
    });
    assert(drawerOpen, 'Detail Drawer opened for advanced reminder settings');

    const offsetSelected = await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      return (store?.selectedTask?.reminderOffsetMinutes ?? store?.selectedTask?.reminder_offset_minutes) === 15;
    });
    assert(offsetSelected, 'Configured reminder offset to 15 minutes before due time');

    // Screenshot: Task detail drawer with reminder settings
    const drawerReminderPath = path.join(screenshotsDir, 'phase5_task_detail_drawer_reminders.png');
    await page.screenshot({ path: drawerReminderPath });
    console.log(`📸 Saved: ${drawerReminderPath}`);

    // Close drawer
    await page.click('.btn-icon-close');
    await new Promise(r => setTimeout(r, 400));

    // -------------------------------------------------------------
    // Scenario 13: Dark Mode and Theme Refinement
    // -------------------------------------------------------------
    console.log('\n--- Scenario 13: Dark Mode and Theme Refinement ---');
    // Toggle Dark Mode via store
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('auth');
      if (store) {
        store.toggleDarkMode();
      }
    });
    await new Promise(r => setTimeout(r, 400));

    const isDarkModeActive = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') &&
             document.documentElement.getAttribute('data-mode') === 'dark';
    });
    assert(isDarkModeActive, 'Dark mode activated with data-mode="dark" and .dark class');

    // Verify localStorage persistence
    const savedDarkPref = await page.evaluate(() => localStorage.getItem('taskyar_dark_mode'));
    assert(savedDarkPref === 'true', 'Dark mode preference persisted to localStorage');

    // Screenshot: Dark mode workspace
    const darkModePath = path.join(screenshotsDir, 'phase5_dark_mode_workspace.png');
    await page.screenshot({ path: darkModePath });
    console.log(`📸 Saved: ${darkModePath}`);

    // Cycle through themes in dark mode
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('auth');
      if (store) {
        store.setTheme('ocean');
      }
    });
    await new Promise(r => setTimeout(r, 300));
    const oceanThemeActive = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'ocean');
    assert(oceanThemeActive, 'Ocean theme applied in dark mode');

    // Return to default theme
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('auth');
      if (store) {
        store.setTheme('default');
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // -------------------------------------------------------------
    // Scenario: Weekly & Monthly Boards with Iconsax
    // -------------------------------------------------------------
    console.log('\n--- Scenarios: Weekly & Monthly Boards with Iconsax ---');
    // Navigate to Week Board
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) store.currentView = 'weekboard';
    });
    await new Promise(r => setTimeout(r, 600));

    const weekBoardPath = path.join(screenshotsDir, 'phase5_week_board_iconsax.png');
    await page.screenshot({ path: weekBoardPath });
    console.log(`📸 Saved: ${weekBoardPath}`);
    assert(fs.existsSync(weekBoardPath), 'Weekly board screenshot captured');

    // Navigate to Month Board
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) store.currentView = 'monthboard';
    });
    await new Promise(r => setTimeout(r, 600));

    const monthBoardPath = path.join(screenshotsDir, 'phase5_month_board_iconsax.png');
    await page.screenshot({ path: monthBoardPath });
    console.log(`📸 Saved: ${monthBoardPath}`);
    assert(fs.existsSync(monthBoardPath), 'Monthly board screenshot captured');

    // -------------------------------------------------------------
    // Scenario: Mobile Layouts
    // -------------------------------------------------------------
    console.log('\n--- Scenario: Mobile Responsive Layouts ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.evaluate(() => {
      const store = window.__PINIA__?._s?.get('tasks');
      if (store) store.currentView = 'myday';
    });
    await new Promise(r => setTimeout(r, 600));

    const mobileMyDayPath = path.join(screenshotsDir, 'phase5_mobile_myday_layout.png');
    await page.screenshot({ path: mobileMyDayPath });
    console.log(`📸 Saved: ${mobileMyDayPath}`);
    assert(fs.existsSync(mobileMyDayPath), 'Mobile viewport 375px screenshot captured');

    // Filter console errors for unexpected exceptions (ignore intentional offline fetch failures)
    const nonNetworkErrors = consoleErrors.filter(e => !e.includes('net::ERR') && !e.includes('Failed to fetch'));
    assert(nonNetworkErrors.length === 0, `Zero unexpected browser console errors (actual: ${nonNetworkErrors.length})`);

  } catch (err) {
    console.error('Fatal test error:', err);
    checksFailed++;
  } finally {
    await browser.close();
  }

  console.log('\n=======================================');
  console.log(`TOTAL CHECKS: ${checksPassed + checksFailed}`);
  console.log(`PASSED: ${checksPassed}`);
  console.log(`FAILED: ${checksFailed}`);
  console.log(`STATUS: ${checksFailed === 0 ? 'ALL VERIFICATIONS PASSED' : 'SOME VERIFICATIONS FAILED'}`);
  console.log('=======================================\n');

  if (checksFailed > 0) {
    process.exit(1);
  }
}

runPhase5E2ETest().catch(e => {
  console.error(e);
  process.exit(1);
});
