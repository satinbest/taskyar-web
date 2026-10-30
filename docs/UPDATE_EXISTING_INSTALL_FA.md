# راهنمای به‌روزرسانی نصب‌های موجود تسک‌یار ۲.۰ در دایرکت‌ادمین
# TaskYar Web 2.0 RC1 — Update Existing Installation Guide

این راهنما شیوه به‌روزرسانی امن نسخه‌های موجود تسک‌یار وب ۲.۰ در کنترل‌پنل دایرکت‌ادمین (DirectAdmin) به نسخه اصلاح‌شده (`RC1 Fixed`) را شرح می‌دهد. در این فرآیند، فایل‌های حساس پیکربندی (`.env`) و داده‌های ذخیره‌شده کاربران در پوشه `storage/` کاملاً دست‌نخورده باقی می‌مانند.

---

## ۱. اصول ایمنی حیاتی قبل از شروع به‌روزرسانی

> [!CAUTION]
> **قوانین غیرقابل نقض حین به‌روزرسانی:**
> 1. **هرگز** فایل `.env` پروداکشن را حذف یا با فایل نمونه جایگزین نکنید.
> 2. **هرگز** دستور `php artisan key:generate` را در یک سیستم فعال با کاربران و تسک‌های موجود اجرا نکنید (تغییر کلید باعث ابطال سشن‌ها و رمزگشایی‌ناپذیر شدن اطلاعات حساس می‌شود).
> 3. **هرگز** پوشه `storage/` شامل فایل‌های آپلودی و لاگ‌ها را پاک نکنید.
> 4. **هرگز** دستورات `migrate:fresh` یا `db:wipe` را روی دیتابیس فعال پروداکشن نزنید.

---

## ۲. گام‌های عملیاتی به‌روزرسانی

### گام اول: تهیه نسخه پشتیبان (Backup)
پیش از هر کاری، از فایل‌های فعلی و دیتابیس بکاپ بگیرید:
1. در پنل DirectAdmin به بخش **Create/Restore Backups** بروید و یک فول بکاپ بگیرید.
2. یا از طریق ترمینال:
   ```bash
   mysqldump -u fileruni_taskyaruser -p fileruni_taskyar > /home/fileruni/backup_before_update.sql
   ```

---

### گام دوم: دانلود و استخراج فایل پکیج جدید
1. فایل `TaskYar-Web-2.0-RC1-Standard-Laravel-Fixed.zip` را در مسیر ریشه دامنه آپلود نمایید:
   `/home/fileruni/domains/taskyar.3aw.ir/`
2. یک پوشه موقت برای استخراج بسازید یا فایل را مستقیماً استخراج کنید:
   ```bash
   cd /home/fileruni/domains/taskyar.3aw.ir
   unzip TaskYar-Web-2.0-RC1-Standard-Laravel-Fixed.zip -d update_temp
   ```

---

### گام سوم: جایگزینی فایل‌های کد و وابستگی‌ها
فایل‌های کد جدید را با نسخه فعلی جایگزین نمایید، در حالی که `.env` و `storage` محافظت می‌شوند:

```bash
# وارد پوشه موقت شوید
cd /home/fileruni/domains/taskyar.3aw.ir/update_temp/TaskYar-Web-2.0

# کپی فایل‌های بهینه‌شده به پوشه اصلی پروژه
cp -rf app bootstrap config database docs public resources routes vendor artisan composer.json composer.lock ../taskyar_core/

# حذف پوشه موقت پس از اتمام کپی
cd /home/fileruni/domains/taskyar.3aw.ir
rm -rf update_temp
```

---

### گام چهارم: اجرای مایگریشن‌های پیشرو و عیب‌یابی
وارد پوشه اصلی پروژه شوید:
```bash
cd /home/fileruni/domains/taskyar.3aw.ir/taskyar_core
```

دستورات زیر را با مفسر PHP 8.4 اجرا نمایید:

1. **عیب‌یابی سلامت دیتابیس:**
   ```bash
   /usr/local/php-8.4/bin/php artisan taskyar:diagnose
   ```

2. **اجرای مایگریشن‌های جدید و اصلاحی:**
   ```bash
   /usr/local/php-8.4/bin/php artisan migrate --force
   ```

3. **پاکسازی کش‌های قبلی و ساخت کش‌های تازه پروداکشن:**
   ```bash
   /usr/local/php-8.4/bin/php artisan optimize:clear
   /usr/local/php-8.4/bin/php artisan config:cache
   /usr/local/php-8.4/bin/php artisan route:cache
   /usr/local/php-8.4/bin/php artisan view:cache
   ```

4. **تأیید دسترسی‌های فایل:**
   ```bash
   chmod -R 775 storage bootstrap/cache
   ```

---

## ۳. تأیید پس از به‌روزرسانی
1. مرورگر خود را باز کرده و با زدن کلید‌های `Ctrl + F5` کش مرورگر را پاک کنید.
2. وارد حساب کاربری خود شوید.
3. ایجاد، ویرایش و وضعیت تسک‌ها، دسته‌بندی‌ها و تقویم فارسی را تست نمایید.
4. اطمینان حاصل کنید هیچ خطای ۵۰۰ یا ناهماهنگی در دارایی‌های فرانت‌اند مشاهده نمی‌شود.
