# راهنمای جامع عیب‌یابی و بازیابی امن مایگریشن‌های ناقص
# TaskYar Web 2.0 — Partial Migration Recovery & Database Repair Guide

این سند راهنمای رسمی برای رفع وضعیت خطای جاری در پایگاه داده سرور پروداکشن دایرکت‌ادمین (`fileruni_taskyar`) و تشریح سناریوهای مختلف بازیابی بر روی MariaDB 10.6.23 با موتور پیش‌فرض MyISAM است.

---

## ۱. کالبدشکافی وضعیت خطای جاری سرور شما

در دو تلاش گذشته، فرآیند راه‌اندازی با دو خطای کاملاً مرتبط متوقف شد:

### خطای اول: سقف کلید ۱۰۰۰ بایتی در MyISAM
```text
SQLSTATE[42000]: 1071 Specified key was too long; max key length is 1000 bytes
```
*علت:* جدول `password_reset_tokens` با موتور پیش‌فرض MyISAM ساخته می‌شد و فیلد ۲۵۵ کاراکتری ایمیل تحت `utf8mb4` نیاز به ۱۰۲۰ بایت داشت ($255 \times 4 = 1020$). سقف MyISAM برابر ۱۰۰۰ بایت است.

### خطای دوم: شکست کلید خارجی تسک به کاربر (Errno 150)
```text
0001_01_01_000000_create_users_table ........ DONE
0001_01_01_000001_create_cache_table ........ DONE
0001_01_01_000002_create_jobs_table ......... DONE
2026_10_26_000001_add_taskyar_columns_to_users_table ... DONE
2026_10_26_000002_create_tasks_table ........ FAIL

SQLSTATE[HY000]: General error: 1005 Can't create table `fileruni_taskyar`.`tasks`
(errno: 150 "Foreign key constraint is incorrectly formed")
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
```
*علت:* جدول `users` به دلیل پیش‌فرض سرور با موتور **MyISAM** ساخته شده بود. موتور MyISAM از کلید خارجی پشتیبانی نمی‌کند و اجازه نمی‌دهد جدول تسک‌ها به آن کلید خارجی متصل کند.

---

## ۲. راهکار خودکار پکیج جدید (`RC1-MariaDB10623-Verified`)

پکیج جدید دو محافظت حیاتی دارد:
1. **ساخت صریح جداول با InnoDB:** دستور `$table->engine = 'InnoDB';` در تمامی فایل‌ها اعمال شده تا جداول با موتور استاندارد و تراکنشی ساخته شوند.
2. **تبدیل در لحظه جداول قبلی:** حتی اگر جدول `users` از قبل روی MyISAM باقی مانده باشد، مایگریشن قبل از ساخت تسک‌ها دستور زیر را اجرا می‌کند:
   ```sql
   ALTER TABLE `users` ENGINE = InnoDB;
   ```
   بنابراین خطای ۱۵۰ به هیچ عنوان تکرار نخواهد شد.

---

## ۳. نحوه تشخیص وضعیت با ابزار عیب‌یابی

وارد پوشه برنامه شوید و دستور زیر را اجرا کنید:
```bash
cd /home/fileruni/domains/taskyar.3aw.ir/taskyar_core
/usr/local/php-8.4/bin/php artisan taskyar:diagnose
```

این دستور وضعیت دیتابیس را بررسی کرده و نوع موتور تک‌تک جداول را نمایش می‌دهد.

---

## ۴. سناریوهای بازیابی

### سناریوی ب (Scenario B) — دیتابیس نیمه‌کاره کنونی شما (بدون داده کاربر)
جداول `users`، `cache`، `jobs` ساخته شده‌اند اما به دلیل شکست تسک‌ها، داده واقعی در سیستم نیست.

**روش اول (بازیابی مستقیم و خودکار - پیشنهادی):**
فقط کافیست دستور مایگریشن را بزنید:
```bash
/usr/local/php-8.4/bin/php artisan migrate --force
```
پکیج جدید:
- جدول `users` را به صورت خودکار به InnoDB تبدیل می‌کند.
- جدول `tasks` و کلید خارجی آن را بدون خطای ۱۵۰ می‌سازد.
- باقی جداول را با موتور InnoDB کامل می‌کند.

**روش دوم (شروع کاملاً تمیز - Clean Slate):**
اگر مایلید دیتابیس بدون هیچ اثر قبلی و از صفر ساخته شود:
1. در پنل DirectAdmin به بخش **phpMyAdmin** بروید.
2. دیتابیس `fileruni_taskyar` را باز کنید، تمام جداول موجود را انتخاب و **Drop** نمایید.
3. سپس دستور زیر را در ترمینال بزنید:
   ```bash
   /usr/local/php-8.4/bin/php artisan migrate --force
   ```

---

### سناریوی ج (Scenario C) — دیتابیس فعال حاوی اطلاعات کاربران
اگر در آینده کاربران روی سامانه ثبت‌نام کرده و تسک ثبت کرده باشند:
- **هرگز** دستورات `migrate:fresh` یا `db:wipe` را نزنید.
- ابتدا از طریق phpMyAdmin یا `mysqldump` بکاپ بگیرید:
  ```bash
  mysqldump -u fileruni_taskyaruser -p fileruni_taskyar > backup_before_fix.sql
  ```
- سپس برای اعمال تغییرات تنها دستور زیر را اجرا نمایید:
  ```bash
  /usr/local/php-8.4/bin/php artisan migrate --force
  ```

---

### سناریوی د (Scenario D) — ناهمگونی تاریخچه با ساختار دیتابیس
اگر جداول ساخته شده‌اند اما در جدول `migrations` ثبت نشده‌اند:
```bash
/usr/local/php-8.4/bin/php artisan taskyar:diagnose --repair
```
این دستور ابتدا تمام جداول MyISAM را به InnoDB تبدیل کرده و سپس سوابق مفقوده را همگام می‌کند.

---

## ۵. چک‌لیست تأیید نهایی پس از بازیابی

```bash
# ۱. تأیید اجرای کامل مایگریشن‌ها
/usr/local/php-8.4/bin/php artisan migrate:status

# ۲. بازبینی موتور جداول (باید تماماً InnoDB باشند)
/usr/local/php-8.4/bin/php artisan taskyar:diagnose

# ۳. کش کردن پروداکشن
/usr/local/php-8.4/bin/php artisan config:cache
/usr/local/php-8.4/bin/php artisan route:cache
/usr/local/php-8.4/bin/php artisan view:cache
```
