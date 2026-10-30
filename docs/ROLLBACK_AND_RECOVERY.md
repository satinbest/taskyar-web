# راهنمای بازگشت به نسخه قبل و بازیابی در شرایط بحرانی (Rollback & Disaster Recovery)
# TaskYar Web 2.0 Release Candidate

این مستند دستورالعمل‌های گام‌به‌گام و عملیاتی بازگشت به نسخه قبل (Rollback)، پشتیبان‌گیری منظم و بازیابی اضطراری (Disaster Recovery) سامانه تسک‌یار وب ۲.۰ را شرح می‌دهد.

---

## ۱. سیاست‌های پشتیبان‌گیری پیش از ارتقا (Pre-Deployment Backup Strategy)

همیشه پیش از انجام هرگونه ارتقا یا اعمال تغییر بر روی محیط پروداکشن، دو نسخه پشتیبان مجزا تهیه فرمایید:

### الف: پشتیبان پایگاه داده (Database Dump)
از طریق phpMyAdmin در DirectAdmin یا خط فرمان:
```bash
mysqldump -u username_taskyaruser -p username_taskyar --single-transaction --quick --routines > pre_upgrade_backup_$(date +%Y%m%d_%H%M%S).sql
```

### ب: پشتیبان فایل‌های کدهای پیشین (Codebase Archive)
تهیه آرشیو زیپ از پوشه کدهای جاری سرور:
```bash
tar -czf pre_upgrade_code_$(date +%Y%m%d_%H%M%S).tar.gz taskyar_core/ domains/yourdomain.com/public_html/
```

---

## ۲. سناریوهای بازگشت به نسخه قبل (Rollback Scenarios)

### سناریو ۱: شکست در اجرای مایگریشن‌های دیتابیس (Migration Failure)
اگر در هنگام اجرای `php artisan migrate` خطایی رخ داد:
1. بلافاصله سامانه را در حالت تعمیر قرار دهید تا از ورود اطلاعات نامعتبر جلوگیری شود:
   ```bash
   php artisan down --secret="secret-admin-key" --render="errors::503"
   ```
2. دستور عقب‌گرد آخرین دسته مایگریشن را اجرا نمایید:
   ```bash
   php artisan migrate:rollback --step=1 --force
   ```
3. در صورت بروز تناقض شدید ساختاری، دامپ پشتیبان دیتابیس مرحله ۱ را بازیابی کنید:
   ```bash
   mysql -u username_taskyaruser -p username_taskyar < pre_upgrade_backup_*.sql
   ```
4. پس از اطمینان از سلامت دیتابیس، کش‌ها را پاکسازی کرده و سایت را مجدداً بالا بیاورید:
   ```bash
   php artisan optimize:clear
   php artisan up
   ```

---

### سناریو ۲: وجود باگ در کدهای جدید یا خطای رندر فرانت‌اند (Bad Release)
اگر انتشار نسخه جدید با خطای سیستمی در فرانت‌اند یا بک‌اند مواجه شد:
1. آرشیو فایل‌های کدهای قبلی (`pre_upgrade_code_*.tar.gz`) را اکسترکت و جایگزین پوشه‌های جاری نمایید.
2. کش‌های لاراول را بروزرسانی کنید:
   ```bash
   php artisan optimize:clear
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
3. در صورت نیاز به بازیابی کش مرورگر کاربران، نسخه Service Worker در `public/sw.js` را یک عدد افزایش دهید تا مرورگرها فایل‌های کلاینت جدید را مجدداً دانلود نمایند.

---

### سناریو ۳: خرابی نشست‌ها یا ناتوانی کاربران در ورود (Session / Auth Desync)
اگر کلید `APP_KEY` به اشتباه تغییر کرده باشد یا کوکی‌های سشن مخدوش شده باشند:
1. اطمینان حاصل کنید `APP_KEY` دقیقاً همان کلید استفاده شده در زمان ساخت دیتابیس است.
2. جدول سشن‌های دیتابیس را پاکسازی کنید:
   ```sql
   TRUNCATE TABLE sessions;
   ```
3. سشن‌های فایل را در صورت فعال بودن درایور فایلی پاک کنید:
   ```bash
   rm -f storage/framework/sessions/*
   ```
4. کش پیکربندی را نوسازی نمایید:
   ```bash
   php artisan config:cache
   ```

---

## ۳. بازیابی داده‌های کاربران از فایل‌های پشتیبان تسک‌یار (User Data Restore)

تسک‌یار دارای موتور بازیابی دوگانه است:
1. **بازیابی درون‌برنامه‌ای (In-App JSON Restore):**
   - کاربر می‌تواند از منوی سایدبار گزینه «بازیابی» را انتخاب کرده و فایل پشتیبان ساختاریافته JSON (نسخه v1 یا v2) را انتخاب کند.
   - سامانه به صورت اتمیک و در یک تراکنش ایمن (`DB::transaction`) کلیه تسک‌ها، زیرتسک‌ها، دسته‌بندی‌ها، برچسب‌ها و استثناهای تکرار را بدون تداخل با حساب‌های دیگر بازگردانی می‌کند.
2. **بازیابی اضطراری از دیتابیس سرور:**
   - با دستور خط فرمان:
     ```bash
     mysql -u username_taskyaruser -p username_taskyar < backup_file.sql
     ```

---

## ۴. ثبت وقایع و گزارش خطا (Incident Logging)
در هنگام رخداد بحران، لاگ خطاهای سرور را در مسیر زیر بررسی نمایید:
- لاگ‌های لاراول: `taskyar_core/storage/logs/laravel-YYYY-MM-DD.log`
- لاگ وب‌سرور دایرکت‌ادمین: `/var/log/httpd/domains/yourdomain.com.error.log`
- لاگ خطاهای PHP-FPM: از بخش Log Viewer در دایرکت ادمین
