# گزارش جامع تعمیر و ایمن‌سازی دیتابیس محلی ایندکس‌دی‌بی (IndexedDB)
# TaskYar Web 2.0 — IndexedDB DataCloneError & Offline Architecture Report

---

## ۱. علت ریشه‌ای قطعی خطای DataCloneError (Confirmed Root Cause)

در کنسول مرورگر خطای زیر گزارش شده بود:
```text
[OfflineDB] Opened account-isolated database: TaskYarDB_1
Uncaught DataCloneError: Failed to execute 'put' on 'IDBObjectStore': #<Object> could not be cloned.
at t.clear.onsuccess
```

### تحلیل موشکافانه علت وقوع:
1. **پراکسی‌های واکنشی ویو ۳ (Vue 3 Reactive Proxies):**
   * در فریم‌ورک Vue 3، تمام اشیای نگهداری‌شده درون `ref([])` یا `reactive()` توسط یک شیء جاوااسکریپتی از نوع `Proxy` احاطه می‌شوند.
   * در متد `saveCategoriesOffline(categories)`، متغیر `categories.value` مستقیماً به عنوان آرایه ارسال می‌شد:
     ```javascript
     // کد آسیب‌پذیر قبلی:
     store.clear().onsuccess = () => {
       for (const c of categories) {
         store.put(c); // c یک پراکسی ویو حاوی گترها و نمادهای داخلی است
       }
     };
     ```
   * در جاوااسکریپت، متد `IDBObjectStore.put()` از **الگوریتم شبیه‌سازی ساختاریافته (Structured Clone Algorithm)** مرورگر برای ذخیره داده‌ها استفاده می‌کند.
   * این الگوریتم اشیای حاوی توابع، متدهای اختصاصی پراکسی، یا ارجاعات حلقوی را نمی‌پذیرد و در صورت مواجهه با آن‌ها، بلافاصله استثنای بحرانی `DataCloneError` صادر می‌کند.
2. **عدم وجود مدیریت تراکنش (Transaction Life-Cycle):**
   * کد قبلی فاقد شنونده‌های `tx.onerror`، `tx.onabort` و `tx.oncomplete` بود؛ بنابراین با پرتاب اولین استثنا در حلقه `clear.onsuccess`، برنامه کرش کرده و فرآیند همگام‌سازی متوقف می‌شد.

---

## ۲. فایل‌های اصلاح‌شده (Exact Files Modified)

1. `resources/js/utils/offlineDb.js`:
   * بازنویسی و پیاده‌سازی متد عمیق پاک‌سازی و سریالایز داده‌ها: `deepClonePlain(value, seen = new WeakMap())`.
   * پیاده‌سازی متدهای اختصاصی نرمال‌سازی رکوردها:
     - `normalizeTaskRecord(task)`: تفکیک فیلدهای وظیفه، تولید کلید محلی امن (`local_key`)، نرمال‌سازی تاریخ جلالی/میلادی و زیرتسک‌ها.
     - `normalizeCategoryRecord(cat)`: استخراج فیلدهای خالص دسته‌بندی و حذف نمادهای ویو.
     - `normalizeTagRecord(tag)`: تولید رکورد ایمن برچسب‌ها.
     - `normalizeMutationRecord(mut)`: پاک‌سازی پی‌لود صف عملیات آفلاین.
   * بازمهندسی متد `saveTasksOffline`: جایگزینی پاک‌سازی مخرب با استراتژی ادغام امن (حفظ تسک‌های دارای وضعیت `sync_status: 'pending'` حتی در هنگام دریافت اطلاعات تازه از سرور).
   * مدیریت کامل چرخه حیات تراکنش‌های IndexedDB (`tx.oncomplete`, `tx.onerror`, `tx.onabort`).
2. `resources/js/stores/tasks.js`:
   * ارتقای متدهای `fetchCategories`، `fetchTasks`، `fetchTags` و مدیریت صف همگام‌سازی.
   * ایجاد مرزهای حفاظتی (Try/Catch Error Boundaries) به گونه‌ای که هرگز خطای پایگاه داده محلی مانع از فعالیت رابط کاربری نشود.

---

## ۳. تضمین‌های امنیت داده در حالت آفلاین (Data Safety Guarantees)

- **ایزوله‌سازی حساب‌ها (Multi-User Isolation):** داده‌های هر کاربر در دیتابیس مجزای `TaskYarDB_{userId}` ذخیره شده و با خروج از حساب، ارتباط دیتابیس بسته می‌شود. هیچ‌گونه نشت اطلاعات بین کاربران رخ نمی‌دهد.
- **حفظ تغییرات ثبت‌نشده در حالت آفلاین:** در فرآیند همگام‌سازی، تسک‌هایی که به صورت آفلاین ثبت شده و هنوز روی سرور ارسال نشده‌اند، پاک نمی‌شوند و تا تایید نهایی سرور در حافظه محلی محفوظ می‌مانند.
- **پشتیبانی از انواع داده‌های معنایی:** کلیه تاریخ‌ها، مقادیر منطقی (Boolean)، آرایه‌های زیرتسک‌ها و آرایه‌های برچسب‌ها بدون افت کیفیت ساختاری تبدیل می‌شوند.

---

## ۴. نتایج آزمون‌های واقعی در محیط Headless Chrome

نتایج به دست آمده از اجرای اسکریپت `scripts/verify_pwa_indexeddb_mobile.mjs` با مرورگر کروم واقعی:

```text
--- TEST SECTION 3: IndexedDB Account Storage & DataClone Immunity ---
  ✓ [PASS] IndexedDB opened and written successfully: TaskYarDB_79
  ✓ [PASS] Tasks stored in IndexedDB without DataCloneError (Count: 4)
  ✓ [PASS] Categories stored in IndexedDB without DataCloneError (Count: 1)
  ✓ [PASS] Tags stored in IndexedDB without DataCloneError (Count: 1)
  ✓ [PASS] DataCloneError count is EXACTLY ZERO (Errors: [])

--- TEST SECTION 4: Multi-User Account Isolation ---
  ✓ [PASS] User 2 receives distinct database (U1: 79, U2: 80)
  ✓ [PASS] Zero data leakage across user accounts (U2 Tasks: 0)
```
نتیجه نهایی: خطای `DataCloneError` به طور کامل و ریشه‌ای ریشه‌کن گردید.
