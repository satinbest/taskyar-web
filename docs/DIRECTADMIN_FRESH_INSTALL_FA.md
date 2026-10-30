# راهنمای نصب تازه تسک‌یار ۲.۰ در دایرکت‌ادمین (ماریا دی‌بی ۱۰.۶.۲۳)
# TaskYar Web 2.0 — DirectAdmin Fresh Installation Guide (MariaDB 10.6.23 / MyISAM Default)

این راهنما فرآیند راه‌اندازی نسخه استاندارد لاراول **تسک‌یار وب ۲.۰ (نسخه تأییدشده MariaDB 10.6.23)** را بر روی هاست اشتراکی دایرکت‌ادمین تشریح می‌کند.

---

## ۱. مشخصات هاست و دیتابیس

- **کنترل‌پنل:** DirectAdmin
- **مفسر PHP اختصاصی لاراول:** `/usr/local/php-8.4/bin/php`
- **پایگاه داده سرور:** MariaDB 10.6.23
- **موتور پیش‌فرض سرور:** MyISAM (پکیج تسک‌یار به صورت خودکار و صریح از **InnoDB** استفاده می‌کند)
- **میزبان دیتابیس (DB_HOST):** `localhost`
- **نام دیتابیس پروداکشن:** `fileruni_taskyar`
- **پورت دیتابیس:** `3306`
- **پیش‌نیازها در سرور:** پکیج شامل تمام فایل‌های کامپایل‌شده فرانت‌اند و کدهای کامپوزر پروداکشن است؛ **نیازی به اجرای composer یا npm روی سرور نیست.**

---

## ۲. چینش استاندارد پوشه‌ها

```text
/home/fileruni/domains/taskyar.3aw.ir/
├── taskyar_core/               <-- کدهای اصلی لاراول (امن و خارج از دید وب)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/                 <-- ریشه وب
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   ├── artisan
│   └── .env
└── public_html/ -> taskyar_core/public (پیوند نمادین)
```

---

## ۳. مراحل گام‌به‌گام نصب

### گام اول: ساخت یا پاکسازی دیتابیس
1. در پنل DirectAdmin به منوی **Account Manager** > **MySQL Management** بروید.
2. دیتابیس `fileruni_taskyar` را انتخاب کنید. اگر از تلاش‌های قبلی حاوی جداول ناقص است:
   - در صورت نداشتن دیتای واقعی، جداول قبلی را حذف (Drop) کنید یا دیتابیس را پاک نمایید.

---

### گام دوم: آپلود و استخراج بسته انتشار
1. فایل زیپ `TaskYar-Web-2.0-RC1-MariaDB10623-Verified.zip` را در مسیر زیر آپلود کنید:
   `/home/fileruni/domains/taskyar.3aw.ir/`
2. آن را Extract کرده و نام پوشه استخراج‌شده را به `taskyar_core` تغییر دهید.
3. پیوند نمادین را ایجاد یا بررسی کنید:
   ```bash
   ln -s /home/fileruni/domains/taskyar.3aw.ir/taskyar_core/public /home/fileruni/domains/taskyar.3aw.ir/public_html
   ```

---

### گام سوم: پیکربندی فایل `.env`
وارد پوشه `taskyar_core` شده و فایل `.env` را با مقادیر زیر تنظیم نمایید:

```dotenv
APP_NAME=TaskYar
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://taskyar.3aw.ir

APP_LOCALE=fa
APP_FALLBACK_LOCALE=fa
APP_FAKER_LOCALE=fa_IR

APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=fileruni_taskyar
DB_USERNAME=fileruni_taskyaruser
DB_PASSWORD="YOUR_REAL_PASSWORD"
DB_ENGINE=InnoDB

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
CACHE_STORE=file
```

---

### گام چهارم: اجرای دستورات نصب در ترمینال DirectAdmin

وارد پوشه `taskyar_core` شوید:
```bash
cd /home/fileruni/domains/taskyar.3aw.ir/taskyar_core
```

دستورات زیر را به ترتیب با PHP 8.4 اختصاصی اجرا کنید:

1. **تولید کلید امنیتی لاراول:**
   ```bash
   /usr/local/php-8.4/bin/php artisan key:generate --force
   ```

2. **بررسی اتصال و وضعیت سرور ماریا دی‌بی:**
   ```bash
   /usr/local/php-8.4/bin/php artisan taskyar:diagnose
   ```
   *این دستور وضعیت سرور، پیش‌فرض MyISAM، و وضعیت جداول را نمایش می‌دهد.*

3. **اجرای مایگریشن‌ها و ایجاد جداول با موتور InnoDB:**
   ```bash
   /usr/local/php-8.4/bin/php artisan migrate --force
   ```
   *تمام ۱۳ مایگریشن بدون خطای ۱۰۷۱ و بدون خطای ۱۵۰ با وضعیت DONE به پایان می‌رسند.*

4. **تأیید وضعیت نهایی دیتابیس:**
   ```bash
   /usr/local/php-8.4/bin/php artisan taskyar:diagnose
   ```
   *تأیید می‌کند تمام ۱۵ جدول با موتور InnoDB و کلیدهای خارجی فعال ثبت شده‌اند.*

5. **ایجاد کش‌های پروداکشن برای سرعت و کارایی بالا:**
   ```bash
   /usr/local/php-8.4/bin/php artisan config:cache
   /usr/local/php-8.4/bin/php artisan route:cache
   /usr/local/php-8.4/bin/php artisan view:cache
   ```

6. **تنظیم دسترسی پوشه‌های ذخیره‌سازی:**
   ```bash
   chmod -R 775 storage bootstrap/cache
   ```

---

### گام پنجم: تنظیم کران‌جاب (Cron Job)
در پنل DirectAdmin به منوی **Advanced Features** > **Cron Jobs** رفته و دستور زیر را روی هر دقیقه (`* * * * *`) ثبت نمایید:
```bash
/usr/local/php-8.4/bin/php /home/fileruni/domains/taskyar.3aw.ir/taskyar_core/artisan schedule:run >> /dev/null 2>&1
```
