# راهنمای نصب تازه تسک‌یار وب روی هاست اشتراکی دایرکت‌ادمین
## TaskYar Web 2.0.2 — Fresh Installation Guide (DirectAdmin)

این سند راهنمای کامل و گام‌به‌گام نصب نسخه مستقل و کامل **تسک‌یار وب ۲.۰.۲ (TaskYar Web 2.0.2)** روی هاست اشتراکی دایرکت‌ادمین (DirectAdmin) با پایگاه‌داده MariaDB و PHP 8.4 است.

---

## ۱. پیش‌نیازهای سرور و مشخصات محیط

- **کنترل‌پنل:** دایرکت‌ادمین (DirectAdmin)
- **نسخه PHP مورد نیاز:** **PHP 8.4**
- **مسیر مفسر خط فرمان PHP سرور:**
  ```bash
  /usr/local/php-8.4/bin/php
  ```
- **پایگاه‌داده:** **MariaDB 10.6+** یا **MySQL 8.0+**
- **موتور ذخیره‌سازی جداول:** **InnoDB** (الزامی — مایگریشن‌های تسک‌یار صریحاً انجین InnoDB را تعیین می‌کنند تا حتی اگر انجین پیش‌فرض سرور MyISAM باشد، هیچ خطایی رخ ندهد)
- **اکستنشن‌های الزامی PHP:** `pdo_mysql`, `mbstring`, `bcmath`, `curl`, `xml`, `zip`, `fileinfo`

---

## ۲. ایجاد پایگاه‌داده در دایرکت‌ادمین

1. وارد کنترل‌پنل **DirectAdmin** شوید.
2. به بخش **MySQL Management** (یا **Databases**) بروید.
3. روی گزینه **Create new Database** کلیک کنید.
4. اطلاعات زیر را مشخص فرمایید:
   - **Database Name:** نام دیتابیس دلخواه (مثلاً `fileruni_taskyar`)
   - **Database User:** نام کاربری پایگاه‌داده
   - **Password:** رمز عبور قوی و امن
5. اطلاعات ثبت‌شده را یادداشت نمایید تا در فایل `.env` وارد شوند.

---

## ۳. بارگذاری و استخراج بسته کامل برنامه

1. بسته رسمی کامل را دانلود کنید:
   ```text
   TaskYar-Web-v2.0.2-Stable-Full.zip
   ```
2. در دایرکت‌ادمین به بخش **File Manager** بروید.
3. وارد پوشه دامنه یا ساب‌دامین خود شوید (مثلاً `domains/taskyar.3aw.ir/public_html`).
4. بسته فشرده `TaskYar-Web-v2.0.2-Stable-Full.zip` را در این مسیر بارگذاری (Upload) کنید.
5. روی فایل زیپ کلیک راست کرده و گزینه **Extract** را انتخاب نمایید.
6. فایل‌های برنامه مستقیماً شامل هسته لاراول، پوشه `public`، وابستگی‌های کامل در `vendor/` و فایل‌های فرانت‌اند استخراج خواهند شد.

---

## ۴. تنظیم Document Root و وب‌سرور

در لاراول، پوشه عمومی وب باید پوشه `public` باشد.

### حالت اول: تنظیم از طریق کنترل‌پنل (پیشنهادی)
در بخش **Domain Setup** در دایرکت‌ادمین، مسیر ریشه وب (Document Root) ساب‌دامین را به پوشه `public` تغییر دهید (مثلاً `.../public_html/public`).

### حالت دوم: استفاده از فایل `.htaccess` استاندارد در ریشه
در صورتی که امکان تغییر داکیومنت روت وجود ندارد، فایل `.htaccess` موجود در ریشه پروژه تمام درخواست‌ها را به صورت امن و خودکار به پوشه `public/` هدایت می‌کند. همچنین فایل `public/.htaccess` تنظیمات مربوط به کش، PWA و مسیریابی SPA را انجام می‌دهد.

---

## ۵. تنظیم فایل محیطی (`.env`)

1. در فایل منیجر، فایل نمونه `.env.example` را کپی کرده و نام آن را به `.env` تغییر دهید.
2. فایل `.env` را باز کرده و پارامترهای پایگاه داده و آدرس سایت را تنظیم نمایید:

```env
APP_NAME="تسک‌یار"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://taskyar.3aw.ir

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fileruni_taskyar
DB_USERNAME=your_database_username
DB_PASSWORD="your_database_password"
DB_ENGINE=InnoDB

SESSION_DRIVER=file
SESSION_LIFETIME=120
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

---

## ۶. صدور کلید امنیتی و اجرای مایگریشن‌ها

وارد ترمینال دایرکت‌ادمین (یا SSH) شوید، به پوشه پروژه بروید و دستورات زیر را با مسیر صریح PHP 8.4 اجرا نمایید:

```bash
# ۱. تولید کلید رمزنگاری اپلیکیشن
/usr/local/php-8.4/bin/php artisan key:generate --force

# ۲. ساخت جداول پایگاه‌داده (با موتور تضمین‌شده InnoDB)
/usr/local/php-8.4/bin/php artisan migrate --force

# ۳. ایجاد پیوند نمادین پوشه ذخیره‌سازی
/usr/local/php-8.4/bin/php artisan storage:link

# ۴. بهینه‌سازی و کش فایل‌های پیکربندی و مسیرها
/usr/local/php-8.4/bin/php artisan optimize
```

> [!NOTE]
> در صورتی که هاست شما فاقد دسترسی ترمینال یا SSH است:
> ۱. کلید `APP_KEY` را می‌توانید با اجرای یک کران‌جاب یک‌دقیقه‌ای در دایرکت‌ادمین با دستور فوق تولید کنید.
> ۲. دستور مایگریشن را نیز می‌توان از طریق همان کران‌جاب موقت اجرا نمود:
> `/usr/local/php-8.4/bin/php /home/fileruni/domains/3aw.ir/public_html/taskyar/artisan migrate --force`

---

## ۷. بررسی نهایی و اعتبارسنجی PWA

1. سایت خود را با پروتکل امن `https://` در مرورگر باز کنید.
2. در صفحه ثبت‌نام (`/register`)، اولین حساب کاربری مدیر/کاربر را ثبت نمایید.
3. پنجره راهنمای نصب PWA در گوشی و دسکتاپ ظاهر شده و اپلیکیشن با امکان کارکرد آفلاین و تقویم بومی جلالی آماده استفاده است.
