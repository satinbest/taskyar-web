# ممیزی جامع هشدارهای کنسول مرورگر و ریشه‌یابی خطاها
# TaskYar Web 2.0 — Browser Console & Header Audit Report

---

## ۱. خلاصه نتایج ممیزی کنسول مرورگر (Console Audit Summary)

پس از اجرای کامل آزمون‌های خودکار در مرورگر واقعی Google Chrome، وضعیت خطاهای کنسول به شرح زیر مستند گردید:

| نوع پیام در کنسول | وضعیت قبل از بازمهندسی | وضعیت پس از بازمهندسی | نتیجه ممیزی |
| :--- | :---: | :---: | :---: |
| خطای `DataCloneError` در IndexedDB | **حضور مکرر و بحرانی** | **صفر (کاملاً ریشه‌کن شد)** | **PASS** |
| خطای ۴۰۴ در آیکون‌های PWA (`/icons/...`) | **۲ خطای مکرر** | **صفر (کاملاً برطرف شد)** | **PASS** |
| استثناهای مدیریت‌نشده (`Uncaught Exception`) | وجود داشت | **صفر** | **PASS** |
| رجکشن‌های پرامیس (`Unhandled Promise Rejection`) | وجود داشت | **صفر** | **PASS** |
| خطای ثبت سرویس‌ورکر | وجود نداشت | **صفر** | **PASS** |

---

## ۲. ریشه‌یابی هشدارهای Permissions-Policy (Issue E)

### پیام‌های ثبت‌شده:
```text
Error with Permissions-Policy header: Unrecognized feature: 'run-ad-auction'.
Error with Permissions-Policy header: Unrecognized feature: 'join-ad-interest-group'.
Error with Permissions-Policy header: Unrecognized feature: 'private-aggregation'.
Error with Permissions-Policy header: Unrecognized feature: 'attribution-reporting'.
```

### تحلیل و منشأ فنی:
* چهار قابلیت فوق (`run-ad-auction`، `join-ad-interest-group`، `private-aggregation`، `attribution-reporting`) متعلق به پروژه **Privacy Sandbox** شرکت گوگل برای جایگزینی کوکی‌های شخص ثالث (Third-Party Cookies) هستند.
* این هدرها در هیچ کجای کدهای لاراول، ویو یا دایرکتوری‌های پروژه تسک‌یار تعریف نشده‌اند.
* **منشأ اصلی:** سرویس‌های کلودفلر (Cloudflare)، پروکسی‌های معکوس یا قالب‌های پیش‌فرض وب‌سرور لایت‌اسپید/آپاچی در هاست اشتراکی به طور خودکار این هدر را ارسال می‌کنند.
* مرورگرهایی که نسخه قدیمی‌تری دارند یا نسخه‌هایی از مرورگرها که این فیچرهای آزمایشی در آن‌ها غیرفعال است، با دیدن نام این قابلیت‌ها در هدر، هشدار اخطاری «Unrecognized feature» صادر می‌کنند.

### اقدام اصلاحی در لایه نرم‌افزار:
در فایل `public/.htaccess` دستور زیر اضافه شد تا در صورت فعال بودن `mod_headers`، هدرهای استاندارد معتبر جایگزین شوند و تداخل‌های ناخواسته از بین بروند:
```apache
<IfModule mod_headers.c>
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>
```
*توجه: در صورتی که هاست از CDN کلودفلر استفاده می‌کند، غیرفعال کردن گزینه‌های Privacy Sandbox در پنل کلودفلر این هشدارها را در تمامی مرورگرها به طور کامل برطرف می‌سازد.*

---

## ۳. بررسی هشدار نقض مجوز Unload توسط اسکریپت اینسپکتور (Issue F)

### پیام ثبت‌شده:
```text
[Violation] Permissions policy violation:
unload is not allowed in this document.
inspector.b9415ea5.js
```

### تحلیل و ممیزی منشأ اسکریپت:
1. **جستجوی متنی در کدهای پروژه:**
   عبارت‌های `inspector.`، `inspector.b9415ea5.js` و شنونده‌های `addEventListener('unload')` در تمامی فایل‌های PHP، جاوااسکریپت، ویو و حتی پکیج‌های کامپایل‌شده جستجو شدند؛ **هیچ فایلی با این نام یا با این رفتار در کدهای تسک‌یار وجود ندارد.**
2. **منشأ قطعی:**
   این پیام مستقیماً از **افزونه‌های مرورگر (Browser Extensions)** نظیر Vue Devtools، اکستنشن‌های مدیریت پسورد (LastPass/Bitwarden) یا اکستنشن‌های توسعه‌دهنده تزریق می‌شود که به منظور ثبت بسته‌شدن تب از متد منسوخ‌شده `window.addEventListener('unload')` استفاده می‌کنند.
3. در نسخه‌های جدید مرورگر گوگل کروم، رویداد `unload` به دلایل پرفورمنس و امنیت حافظه منسوخ و مسدود شده است. کروم به هنگام اجرای کدهای این افزونه‌ها پیام Violation را با نام فایل داخلی افزونه ثبت می‌کند.
4. **تأیید صحت در آزمون بی‌سر:**
   در آزمون مستقل مرورگر کروم بدون افزونه (`--disable-extensions`)، فایل `inspector.b9415ea5.js` هرگز لود نشده و هیچ خطایی صادر نگردید.
