# راهنمای مشارکت در توسعه تسک‌یار وب (Contributing Guide)

از علاقه شما به مشارکت در پروژه متن‌باز **تسک‌یار وب (TaskYar Web)** بسیار سپاسگزاریم! این پروژه با هدف ارائه یک نرم‌افزار مدیریت وظایف ایرانی، سریع، مستقل و منطبق با فرهنگ و تقویم فارسی توسعه داده می‌شود.

---

## ۱. چرخه توسعه و قوانین کدنویسی

### معماری و زبان‌ها:
- **بک‌اند:** Laravel 11/12 بر بستر **PHP 8.4**
- **فرانت‌اند:** **Vue 3** با Composition API و `<script setup>`
- **مدیریت وضعیت:** **Pinia**
- **طراحی و استایل:** **Tailwind CSS** و استایل‌های متغیرمحور در `resources/css/taskyar.css`
- **زبان و تقویم:** راست‌چین (RTL)، تقویم جلالی، فونت محلی وزیرمتن (بدون CDN)

### استانداردهای کد:
1. **فرمت کد PHP:** پروژه از **Laravel Pint** استفاده می‌کند. پیش از ثبت هرگونه کامیت، دستور زیر را اجرا کنید:
   ```bash
   vendor/bin/pint --format agent
   ```
2. **کد فرانت‌اند:** از ساختارهای تمیز Composition API، متغیرهای واکنشی `ref` و `computed` و نام‌گذاری با مسما استفاده کنید.
3. **تست‌ها:** هر قابلیت جدید یا رفع باگ باید همراه با تست‌های رگرسیون مرتبط در دایرکتوری `tests/` باشد. اجرای تست‌ها با:
   ```bash
   php artisan test --compact
   ```
4. **ساخت فرانت‌اند:** مطمئن شوید دستور ساخت Vite بدون خطا یا اخطار به پایان می‌رسد:
   ```bash
   npm run build
   ```

---

## ۲. راه‌اندازی محیط توسعه محلی

1. مخزن را فورک کرده و در سیستم خود کلون کنید:
   ```bash
   git clone https://github.com/satinbest/taskyar-web.git
   cd taskyar
   ```
2. وابستگی‌های بک‌اند و فرانت‌اند را نصب کنید:
   ```bash
   composer install
   npm install
   ```
3. فایل تنظیمات محیطی را ایجاد کنید:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. پایگاه داده را تنظیم و مایگریشن‌ها را اجرا نمایید (دیتابیس SQLite برای توسعه محلی یا MariaDB):
   ```bash
   touch database/database.sqlite
   php artisan migrate
   ```
5. سرورهای توسعه را اجرا کنید:
   ```bash
   # ترمینال اول
   php artisan serve

   # ترمینال دوم
   npm run dev
   ```

---

## ۳. فرآیند ارسال Pull Request

1. یک برنچ جدید با نام توصیفی برای قابلیت یا باگ خود ایجاد کنید:
   ```bash
   git checkout -b feature/awesome-feature
   # یا
   git checkout -b fix/subtask-checkbox-bug
   ```
2. تغییرات خود را با کامیت‌های تفکیک‌شده و پیام‌های استاندارد (Conventional Commits) ثبت نمایید:
   - `feat: add export to excel feature`
   - `fix: resolve mobile drawer backdrop scroll issue`
   - `docs: update directadmin install instructions`
3. برنچ خود را به گیت‌هاب پوش کرده و از طریق رابط کاربری گیت‌هاب، یک Pull Request به سمت شاخه `main` باز کنید.
4. لطفاً در متن PR، تغییرات اعمال‌شده و نحوه تست و آزمون آن را به طور کامل شرح دهید.
