# راهنمای جامع نصب تسک‌یار وب ۲.۰ در دایرکت‌ادمین (DirectAdmin)
# TaskYar Web 2.0 — Production DirectAdmin Installation Guide

این راهنما برای راه‌اندازی نسخه استاندارد و نهایی **تسک‌یار وب ۲.۰ (نسخه پایدار v2.0.0)** بر روی هاست‌های اشتراکی مجهز به کنترل‌پنل **DirectAdmin** تهیه شده است.

---

## ۱. مشخصات و پیش‌نیازهای محیط میزبانی

- **کنترل‌پنل هاست:** DirectAdmin
- **مفسر خط فرمان PHP:** `/usr/local/php-8.4/bin/php` (نسخه ۸.۴.x)
- **اکستنشن‌های الزامی PHP:** `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `curl`, `fileinfo`, `bcmath`, `zip`
- **پایگاه‌داده:** MariaDB 10.6.23 یا MySQL 8.0+
- **انجین ذخیره‌سازی:** پشتیبانی از **InnoDB** (تمامی مایگریشن‌های تسک‌یار صریحاً از InnoDB استفاده می‌کنند)
- **میزبان دیتابیس (Host):** `localhost` (از `127.0.0.1` در هاست اشتراکی استفاده نکنید)
- **پروتکل ارتباطی:** **HTTPS الزامی است** (برای فعال‌سازی Service Worker و قابلیت‌های PWA)

---

## ۲. ساختار استقرار در هاست (Deployment Layout)

برای رعایت امنیت کامل فایل‌های لاراول و جلوگیری از دسترسی مستقیم کاربران وب به فایل‌های محرمانه (`.env`, `storage`, کدهای هسته)، ساختار زیر به کار گرفته می‌شود:

```text
/home/USERNAME/domains/YOURDOMAIN.COM/
├── taskyar_core/               <-- کدهای هسته لاراول و بسته انتشار
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/                 <-- است‌های فرانت‌اند کامپایل‌شده و آیکون‌ها
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── vendor/                 <-- کتابخانه‌های پروداکشن PHP
│   ├── .env                    <-- تنظیمات پایگاه‌داده و کلید برنامه
│   └── artisan
└── public_html/                <-- ریشه وب عمومی در دسترس کاربران اینترنت
    ├── build/                  <-- فایل‌های کامپایل‌شده Vite
    ├── fonts/                  <-- فونت محلی وزیرمتن
    ├── pwa-icons/              <-- آیکون‌های استاندارد PWA
    ├── .htaccess               <-- بازنویسی روت‌ها برای لاراول
    └── index.php               <-- بارگذار اولیه سیستم متصل به taskyar_core
```

---

## ۳. مراحل گام‌به‌گام نصب تازه (Clean Fresh Installation)

### مرحله اول: پاک‌سازی نصب‌های قبلی (در صورت وجود)
در محیط ترمینال SSH یا Terminal دایرکت‌ادمین:
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM
rm -rf taskyar_core
rm -rf public_html/*
rm -rf public_html/.* 2>/dev/null
```
در phpMyAdmin، دیتابیس مورد نظر را باز کرده و در صورت وجود جداول قبلی، آنها را Drop کنید.

---

### مرحله دوم: آپلود و استخراج بسته انتشار پایدار
1. فایل `TaskYar-Web-2.0-Stable-Production.zip` را در مسیر `/home/USERNAME/domains/YOURDOMAIN.COM/` آپلود نمایید.
2. دستورات زیر را برای استخراج و نام‌گذاری فولدر اجرا کنید:
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM
unzip TaskYar-Web-2.0-Stable-Production.zip
mv TaskYar-Web-2.0 taskyar_core
```

---

### مرحله سوم: اتصال `public_html` به پوشه وب برنامه
فایل‌های پوشه `public` پروژه را در `public_html` کپی کنید:
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM
cp -r taskyar_core/public/* public_html/
cp taskyar_core/public/.htaccess public_html/
```

سپس فایل `public_html/index.php` را باز کرده و مسیرها را به سمت `taskyar_core` تنظیم نمایید:
```php
<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../taskyar_core/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../taskyar_core/vendor/autoload.php';

(require_once __DIR__.'/../taskyar_core/bootstrap/app.php')
    ->handleRequest(Request::capture());
```

---

### مرحله چهارم: ساخت دیتابیس و پیکربندی `.env`
1. در DirectAdmin از بخش **MySQL Management** یک دیتابیس جدید و کاربر ایجاد نمایید.
2. در پوشه `taskyar_core`، فایل نمونه تنظیمات را کپی کنید:
   ```bash
   cd /home/USERNAME/domains/YOURDOMAIN.COM/taskyar_core
   cp .env.example .env
   ```
3. فایل `.env` را با اطلاعات دیتابیس خود مقداردهی کنید:
   ```env
   APP_NAME=TaskYar
   APP_ENV=production
   APP_KEY=
   APP_DEBUG=false
   APP_URL=https://YOURDOMAIN.COM

   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=DB_NAME_HERE
   DB_USERNAME=DB_USER_HERE
   DB_PASSWORD=DB_PASSWORD_HERE

   SESSION_DRIVER=file
   CACHE_STORE=file
   QUEUE_CONNECTION=sync
   ```

---

### مرحله پنجم: تولید کلید رمزنگاری و اجرای مایگریشن‌ها
با استفاده از مسیر صریح مفسر PHP 8.4 دستورات زیر را اجرا کنید:
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM/taskyar_core

# ۱. تولید کلید اختصاصی برنامه
/usr/local/php-8.4/bin/php artisan key:generate --force

# ۲. ایجاد پیوند نمادین پوشه ذخیره‌سازی
/usr/local/php-8.4/bin/php artisan storage:link

# ۳. اجرای مایگریشن‌ها و ایجاد جداول
/usr/local/php-8.4/bin/php artisan migrate:fresh --force

# ۴. ذخیره کش کانفیگ‌ها و روت‌ها برای نهایت سرعت
/usr/local/php-8.4/bin/php artisan config:cache
/usr/local/php-8.4/bin/php artisan route:cache
/usr/local/php-8.4/bin/php artisan view:cache
```

---

### مرحله ششم: تنظیم دسترسی‌های فایل (Permissions)
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM/taskyar_core
chmod -R 775 storage bootstrap/cache
```

---

### مرحله هفتم: تنظیم زمان‌بند خودکار لاراول (Cron Job)
در DirectAdmin به بخش **Cron Jobs** بروید و دستور زیر را برای اجرا در هر دقیقه تنظیم نمایید:
```bash
* * * * * /usr/local/php-8.4/bin/php /home/USERNAME/domains/YOURDOMAIN.COM/taskyar_core/artisan schedule:run >> /dev/null 2>&1
```
