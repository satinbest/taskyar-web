# راهنمای جامع استقرار تسک‌یار ۲.۰ بر روی هاست اشتراکی DirectAdmin
# (TaskYar Web 2.0 DirectAdmin Shared Hosting Deployment Guide)

این راهنما فرآیند استقرار مرحله‌به‌مرحله نسخه انتشار (Release Candidate) سامانه **تسک‌یار وب ۲.۰** را بر روی محیط‌های هاست اشتراکی لینوکسی با کنترل‌پنل **DirectAdmin** و وب‌سرور **Apache / LiteSpeed** تشریح می‌کند.

---

## ۱. پیش‌نیازها و مشخصات سرور میزبان (Server Prerequisites)

| مؤلفه | حداقل نسخه موردنیاز | توضیحات |
| :--- | :--- | :--- |
| **نسخه PHP** | PHP 8.3 یا PHP 8.4 | فعال‌سازی از بخش PHP Version Selector در DirectAdmin |
| **پایگاه داده** | MySQL 8.0+ یا MariaDB 10.5+ | ایجاد از بخش MySQL Management در DirectAdmin |
| **ماژول‌های ضروری PHP** | `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `curl` | در تمام هاست‌های استاندارد فعال است |
| **وب‌سرور** | Apache 2.4+ یا LiteSpeed Enterprise | پشتیبانی از فایل‌های `.htaccess` و ماژول `mod_rewrite` |
| **دسترسی Root / SSH** | نیازی نیست (No Root Required) | کلیه مراحل با File Manager و Cron Jobs قابل انجام است |
| **محیط Node.js / NPM** | نیازی نیست (No Node on Server) | تمامی دارایی‌ها روی سیستم توسعه‌دهنده بیلد می‌شوند |
| **سرویس Redis / Docker** | نیازی نیست | سشن‌ها و کش‌ها از درایور دیتابیس یا فایل استفاده می‌کنند |

---

## ۲. آماده‌سازی پکیج استقرار بر روی رایانه توسعه‌دهنده (Local Preparation)

تسک‌یار به گونه‌ای مهندسی شده که نیازی به اجرای دستورات سنگین `composer` یا `npm` روی هاست اشتراکی ندارد.

### گام ۲.۱: کامپایل دارایی‌های فرانت‌اند
در رایانه خود، دستور زیر را اجرا کنید:
```bash
npm run build
```
این دستور فایل‌های بهینه‌سازی‌شده JS و CSS را در پوشه `public/build/` با ابعاد کم‌حجم تولید می‌کند.

### گام ۲.۲: نصب وابستگی‌های PHP نسخه پروداکشن
```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

### گام ۲.۳: فشرده‌سازی پکیج استقرار
یک فایل آرشیو ZIP از کل پروژه تهیه نمایید؛ موارد زیر **نباید** درون فایل زیپ قرار گیرند:
- پوشه `node_modules/`
- فایل `.env` لوکال (یک فایل `.env.example` ارسال کنید)
- پوشه `.git/` و فایل‌های مخزن گیت
- پوشه `tests/` (برای پروداکشن مورد نیاز نیست)

---

## ۳. ساختار استقرار در دایرکت ادمین (Deployment Architecture)

در هاست اشتراکی، **هرگز نباید ریشه پروژه لاراول را مستقیماً درون `public_html` قرار داد**، زیرا این کار باعث افشای فایل حساس `.env` و کدهای هسته سامانه می‌شود.

دو روش استاندارد برای استقرار امن وجود دارد:

---

### روش الف (توصیه‌شده): تفکیک دوپوشه‌ای خارج از ریشه وب (Two-Directory Separation)

این روش بر روی ۱۰۰٪ هاست‌های اشتراکی و نمایندگی‌ها با هر نوع محدودیت کار می‌کند.

```text
/home/username/
├── taskyar_core/                 <--- کدهای هسته لاراول خارج از دسترس عموم وب
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── storage/
│   ├── vendor/
│   ├── artisan
│   └── .env                      <--- کاملاً محافظت‌شده و غیرقابل‌مشاهده از طریق اینترنت
│
└── domains/yourdomain.com/public_html/    <--- محتویات پوشه public پروژه
    ├── .htaccess
    ├── index.php                 <--- اصلاح مسیر ارجاع به taskyar_core
    ├── favicon.ico
    ├── robots.txt
    ├── manifest.webmanifest
    ├── sw.js
    ├── fonts/
    ├── icons/
    └── build/                    <--- فایل‌های کامپایل‌شده فرانت‌اند
```

#### نحوه پیاده‌سازی روش الف:
1. در File Manager دایرکت‌ادمین، به شاخه اصلی اکانت (`/home/username/`) بروید.
2. یک پوشه با نام `taskyar_core` ایجاد کرده و کل پروژه (به جز محتویات پوشه `public`) را در آن آپلود و اکسترکت کنید.
3. محتویات پوشه `public` پروژه را مستقیماً داخل `public_html` (یا ریشه دامنه موردنظر) قرار دهید.
4. فایل `public_html/index.php` را ویرایش کرده و مسیرهای ارجاع به لودر و لاراول را به صورت زیر تنظیم کنید:

```php
<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// ارجاع به پوشه هسته تسک‌یار خارج از ریشه وب
if (file_exists($maintenance = __DIR__.'/../../taskyar_core/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../../taskyar_core/vendor/autoload.php';

$app = require_once __DIR__.'/../../taskyar_core/bootstrap/app.php';

$handle = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $handle->handle(
    $request = Request::capture()
)->send();

$handle->terminate($request, $response);
```

---

### روش ب (روش سریع): تنظیم Document Root به پوشه `public`

اگر هاست اشتراکی شما در دایرکت‌ادمین اجازه تغییر Document Root دامنه را می‌دهد:
1. در DirectAdmin به بخش **Domain Setup** بروید.
2. بر روی دامنه خود کلیک کرده و مسیر پوشه ریشه وب را از `public_html` به `public_html/public` تغییر دهید.
3. کل فایل زیپ پروژه را درون `public_html` اکسترکت نمایید. در این حالت، وب‌سرور فقط به پوشه `public` دسترسی دارد و فایل‌های ریشه امن باقی می‌مانند.

---

## ۴. پیکربندی پایگاه داده MySQL در دایرکت‌ادمین

1. در کنترل‌پنل DirectAdmin، به مسیر **MySQL Management** بروید.
2. گزینه **Create new Database** را انتخاب کنید.
3. نام پایگاه داده، نام کاربر و یک رمز عبور تصادفی قوی و امن (حداقل ۲۰ کاراکتر) تعیین و ذخیره کنید.
4. دسترسی‌های کاربر به پایگاه داده را روی `ALL PRIVILEGES` قرار دهید.

---

## ۵. تنظیم فایل محیطی پروداکشن (`.env`)

در پوشه `taskyar_core` (یا ریشه پروژه)، یک فایل `.env` ایجاد کرده و مقادیر زیر را به دقت تنظیم نمایید:

```ini
APP_NAME=TaskYar
APP_ENV=production
APP_KEY=base64:کلید_رمزنگاری_تولیدشده_با_دستور_آرتیزان
APP_DEBUG=false
APP_URL=https://yourdomain.com

LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=username_taskyar
DB_USERNAME=username_taskyaruser
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD

BROADCAST_CONNECTION=log
CACHE_STORE=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=database
SESSION_LIFETIME=43200
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
```

> [!IMPORTANT]
> حتماً مقدار `APP_DEBUG` برابر با `false` باشد تا خطاهای سیستمی و اطلاعات حساس دیتابیس به کاربران نمایش داده نشود.
> همچنین `SESSION_SECURE_COOKIE=true` باعث انتقال امن کوکی‌های احراز هویت تحت پروتکل HTTPS می‌شود.

---

## ۶. صدور مجوزهای دسترسی پوشه‌ها (File Permissions)

وب‌سرور آپاچی/لایت‌اسپید نیاز به دسترسی نوشتن در پوشه‌های کش و ذخیره‌سازی دارد.
در File Manager دایرکت ادمین:
- پوشه `taskyar_core/storage/` و تمام زیرپوشه‌های آن: مجوز `775` یا `755` (توسط مالک اکانت قابل نوشتن).
- پوشه `taskyar_core/bootstrap/cache/`: مجوز `775` یا `755`.

---

## ۷. اجرای مایگریشن‌ها و فعال‌سازی کش پروداکشن

برای راه‌اندازی اولیه دیتابیس و بهینه‌سازی سرعت:

### اگر به SSH دسترسی دارید:
وارد پوشه پروژه شده و دستورات زیر را اجرا کنید:
```bash
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### اگر دسترسی SSH ندارید (اجرا از طریق Cron Job موقت یا اسکریپت روت):
می‌توانید یک کرون جاب یک‌باره در دایرکت ادمین تعریف کنید:
```bash
/usr/local/bin/php /home/username/taskyar_core/artisan migrate --force
```
پس از دریافت ایمیل اتمام موفقیت‌آمیز، کرون جاب مربوطه را حذف کنید.

---

## ۸. زمان‌بندی خودکار تسک‌ها (Cron Job Setup)

جهت پاکسازی توکن‌های منقضی، آرشیو لاگ‌ها و مدیریت رویدادهای زمان‌بندی‌شده لاراول:
1. در DirectAdmin به بخش **Cron Jobs** بروید.
2. یک کرون جاب جدید با دوره زمانی هر ۱ دقیقه (`* * * * *`) ایجاد کنید:
```bash
* * * * * /usr/local/bin/php /home/username/taskyar_core/artisan schedule:run >> /dev/null 2>&1
```

---

## ۹. اعتبارسنجی نهایی عملکرد PWA و سرویس‌ورکر

1. به آدرس دامنه خود با پروتکل `https://` مراجعه فرمایید (SSL رایگان Let's Encrypt از بخش SSL Certificates دایرکت‌ادمین فعال باشد).
2. با فشردن کلید F12 کنسول مرورگر را بررسی نمایید:
   - پیام `[PWA] Service Worker registered with scope: https://yourdomain.com/` باید در کنسول ثبت شده باشد.
   - کش نسخه `taskyar-v2.0.0-rc1` باید در تب Application -> Cache Storage ثبت شود.
3. بنر نصب PWA تسک‌یار و کارکرد آفلاین را مورد آزمایش قرار دهید.
