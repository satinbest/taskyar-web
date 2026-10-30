# راهنمای محیط توسعه محلی تسک‌یار وب ۲.۰ (Development Guide)

این راهنما تمامی پیش‌نیازها، مراحل راه‌اندازی، دستورات تست و توسعه محلی پروژه **تسک‌یار وب ۲.۰** را تشریح می‌کند.

---

## ۱. پیش‌نیازهای سیستمی توسعه‌دهنده

- **PHP:** نسخه ۸.۴ یا بالاتر (توصیه شده: PHP 8.4.1+)
- **Composer:** نسخه ۲.۷ یا بالاتر
- **Node.js:** نسخه ۲۰ یا بالاتر (LTS)
- **NPM:** نسخه ۱۰ یا بالاتر
- **دیتابیس محلی:** SQLite (پیش‌فرض برای توسعه سریع بدون نیاز به سرور دیتابیس) یا MySQL 8.0+ / MariaDB 10.6+

---

## ۲. راه‌اندازی گام‌به‌گام پروژه

### ۱. دریافت مخزن و نصب وابستگی‌ها
```bash
git clone https://github.com/satinbest/taskyar-web.git
cd taskyar

# نصب وابستگی‌های PHP
composer install

# نصب وابستگی‌های JavaScript
npm install
```

### ۲. پیکربندی فایل محیطی (.env)
```bash
cp .env.example .env
php artisan key:generate
```

برای استفاده از SQLite در محیط محلی، فایل `.env` را به صورت زیر تنظیم کنید:
```env
DB_CONNECTION=sqlite
# مقادیر DB_HOST, DB_DATABASE و غیره را کامنت کنید
```
سپس فایل دیتابیس SQLite را بسازید:
```bash
# در لینوکس / مک:
touch database/database.sqlite

# در ویندوز پاورشل:
New-Item -ItemType File -Path database/database.sqlite -Force
```

### ۳. اجرای مایگریشن‌ها و داده‌های اولیه
```bash
php artisan migrate
```

---

## ۳. اجرای سرورهای توسعه (Dev Servers)

برای کار با پروژه نیاز به اجرای هم‌زمان دو سرور دارید:
1. **سرور بک‌اند لاراول:**
   ```bash
   php artisan serve
   # در آدرس http://127.0.0.1:8000
   ```
2. **سرور بیلد سریع فرانت‌اند (Vite HMR):**
   ```bash
   npm run dev
   # در آدرس http://127.0.0.1:5173 با پشتیبانی از Hot Module Replacement
   ```

اکنون آدرس `http://127.0.0.1:8000` را در مرورگر باز کنید.

---

## ۴. اجرای آزمون‌ها و سنجش کیفیت کد

### الف) آزمون‌های واحد و یکپارچگی لاراول (PHPUnit):
```bash
# اجرای سریع و فشرده کلیه تست‌ها
php artisan test --compact

# اجرای تست‌های مشخص
php artisan test --filter=SubtaskTest
php artisan test --filter=RecurrenceServiceTest
```

### ب) بررسی و اصلاح استاندارد کد با Laravel Pint:
```bash
# بررسی و تصحیح خودکار فرمت فایل‌های تغییریافته
vendor/bin/pint --dirty --format agent

# تست فرمت کل فایل‌ها
vendor/bin/pint --test
```

### ج) کامپایل نهایی فرانت‌اند (Production Build Check):
```bash
npm run build
```

### د) اجرای آزمون‌های خودکار مرورگر (E2E با Puppeteer):
```bash
# تست جامع زیرتسک‌ها، بازیابی مودال PWA و رسپانسیو
node scripts/verify_subtasks_and_pwa_recovery.mjs

# تست میانبرها و وب‌اپلیکیشن
node scripts/verify_pwa_and_shortcuts.mjs

# تست موتور تکرار و انتخاب‌گرهای تاریخ و ساعت
node scripts/verify_recurrence_and_pickers.mjs
```

---

## ۵. بسته‌بندی ریلیز پروداکشن (Release Packaging)

برای ایجاد بسته زیپ قابل نصب در هاست اشتراکی دایرکت‌ادمین بدون نیاز به Composer یا NPM در سرور:
```bash
node scripts/package_final_release.mjs
```
این دستور:
1. فایل‌های فرانت‌اند را کامپایل می‌کند.
2. پکیج‌های توسعه را از `vendor` حذف و پکیج‌های پروداکشن بهینه‌سازی‌شده را نصب می‌کند.
3. آرشیو `releases/TaskYar-Web-2.0-Stable-Production.zip` را تولید کرده و چک‌سام SHA-256 آن را می‌سازد.
4. وابستگی‌های توسعه محلی را دوباره بازیابی می‌کند.
5. آرشیو تولیدشده را با اسکریپت `scripts/verify_final_release.mjs` راستی‌آزمایی می‌کند.
