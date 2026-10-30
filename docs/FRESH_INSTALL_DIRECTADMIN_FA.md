# راهنمای جامع نصب تازه تسک‌یار وب ۲.۰ در دایرکت‌ادمین
## TaskYar Web 2.0 RC4 — DirectAdmin Complete Fresh Installation Guide

این راهنما، فرآیند کامل، گام‌به‌گام و استاندارد نصب نسخه **TaskYar Web 2.0 (RC4 PWA & Shortcuts Fixed)** را از ابتدا (Fresh Install) بر روی هاست اشتراکی مجهز به پنل مدیریت **DirectAdmin** شرح می‌دهد.

---

## ۱. پیش‌نیازهای محیط هاستینگ (Prerequisites)

برای اجرای بی‌نقص تسک‌یار وب ۲.۰، سرور هاست باید شرایط زیر را دارا باشد:

- **نسخه PHP CLI:** نسخه PHP 8.4 در مسیر:
  ```text
  /usr/local/php-8.4/bin/php
  ```
- **افزونه‌های ضروری PHP:** `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `curl`
- **پایگاه‌داده:** MariaDB 10.6.23 (یا MySQL 8.0+)
  - **موتور پیش‌فرض سرور:** حتی اگر موتور پیش‌فرض سرور هاست `MyISAM` باشد، کلیه مایگریشن‌های تسک‌یار صریحاً جداول را با موتور قدرتمند و تراکنشی `InnoDB` ایجاد می‌کنند.
- **ریشه وب (Document Root):** وب‌سرور باید ترافیک دامنه را به پوشه `public` پروژه هدایت کند (از طریق Symlink یا تنظیم مستقیم ریشه داکیومنت در DirectAdmin).
- **پشتیبانی کامل از HTTPS:** فعال بودن گواهینامه امنیتی SSL (مانند Let's Encrypt) بر روی دامنه `https://taskyar.3aw.ir`، زیرا سرویس‌ورکر و PWA صرفاً بر بستر پروتکل امن HTTPS فعال می‌شوند.
- **بدون نیاز به ابزارهای ساخت در هاست:** تمامی وابستگی‌های PHP در پوشه `vendor` و کدهای کامپایل‌شده فرانت‌اند در پوشه `public/build` درون بسته آرشیو قرار داده شده‌اند. **هیچ نیازی به اجرای `composer` یا `npm` روی سرور هاستینگ نیست.**

---

## ۲. هشدار حیاتی نسخه پشتیبان و خطر از دست رفتن داده‌ها (Backup & Data-Loss Warning)

> [!CAUTION]
> **هشدار جدی از دست رفتن داده‌ها:**  
> نصب از صفر (Fresh Install) یا حذف جداول پایگاه داده منجر به **حذف دائمی** تمام حساب‌های کاربری، وظایف، دسته‌بندی‌ها، برچسب‌ها و یادآورهای ثبت‌شده قبلی خواهد شد.  
> اگر قصد حفظ داده‌های فعلی را دارید، اکیداً از دستورات مخرب دیتابیس نظیر `migrate:fresh` خودداری کرده و طبق سند [DIRECTADMIN_UPDATE_FA.md](file:///d:/taskyar/docs/DIRECTADMIN_UPDATE_FA.md) صرفاً کدهای برنامه را بروزرسانی فرمایید.

### شیوه تهیه پشتیبان فوری از دیتابیس:
قبل از هر اقدامی، با ورود به phpMyAdmin:
1. دیتابیس `fileruni_taskyar` را انتخاب کنید.
2. به زبانه **Export** بروید.
3. با انتخاب روش **Quick** و فرمت **SQL**، فایل خروجی را در رایانه خود ذخیره نمایید.

---

## ۳. آماده‌سازی پایگاه‌داده در phpMyAdmin (Database Preparation)

1. وارد کنترل‌پنل دایرکت‌ادمین شده و به **phpMyAdmin** بروید.
2. دیتابیس مورد نظر (`fileruni_taskyar`) را باز کنید.
3. در صورت نصب کاملاً جدید:
   - اگر از قبل جداولی در این دیتابیس وجود دارد و قصد پاک‌سازی کامل را دارید: تمام جداول را علامت زده و گزینه **Drop** را انتخاب کنید (با تاییدیه کامل).
   - هیچ نیازی به تغییر تنظیمات سراسری سرور یا تغییر موتور پیش‌فرض سرور از MyISAM به InnoDB نیست؛ کدهای مایگریشن لاراول در تسک‌یار به صورت خودکار دایرکتیو `$table->engine = 'InnoDB';` را بر روی تک‌تک جداول اعمال می‌کنند.
4. اطمینان حاصل کنید Collation دیتابیس بر روی `utf8mb4_unicode_ci` تنظیم باشد.

---

## ۴. آپلود و استخراج بسته انتشار (Uploading & Extracting Release)

مسیر استقرار استاندارد بر روی دایرکت‌ادمین:
```text
/home/fileruni/domains/taskyar.3aw.ir/
```

### گام‌های آپلود:
1. فایل پکیج `TaskYar-Web-2.0-RC4-PWA-Shortcuts-Fixed.zip` را در دایرکتوری فوق آپلود کنید.
2. فایل را با ابزار File Manager یا دستور ترمینال استخراج کنید:
   ```bash
   cd /home/fileruni/domains/taskyar.3aw.ir
   unzip -o TaskYar-Web-2.0-RC4-PWA-Shortcuts-Fixed.zip
   ```
3. این دستور پوشه‌ای با نام `TaskYar-Web-2.0` ایجاد می‌کند. نام آن را به `taskyar_core` تغییر دهید:
   ```bash
   mv TaskYar-Web-2.0 taskyar_core
   ```

### اتصال ریشه وب (`public_html`):
به منظور ایزوله‌سازی امنیتی هسته برنامه، از یکی از دو روش زیر استفاده کنید:

#### روش الف (پیشنهادی) — پیوند نمادین (Symlink):
```bash
cd /home/fileruni/domains/taskyar.3aw.ir
mv public_html public_html_old_backup
ln -s /home/fileruni/domains/taskyar.3aw.ir/taskyar_core/public /home/fileruni/domains/taskyar.3aw.ir/public_html
```

#### روش ب — انتقال مستقیم محتویات public:
در صورتی که امکان ساخت پیوند نمادین در هاست شما وجود ندارد:
```bash
cp -r /home/fileruni/domains/taskyar.3aw.ir/taskyar_core/public/* /home/fileruni/domains/taskyar.3aw.ir/public_html/
cp /home/fileruni/domains/taskyar.3aw.ir/taskyar_core/public/.htaccess /home/fileruni/domains/taskyar.3aw.ir/public_html/.htaccess
```
*(و مسیر فایل‌های لاراول در `public_html/index.php` به پوشه `taskyar_core` ارجاع داده می‌شود).*

---

## ۵. پیکربندی فایل محیطی (`.env`)

وارد پوشه هسته برنامه شوید:
```bash
cd /home/fileruni/domains/taskyar.3aw.ir/taskyar_core
cp .env.example .env
```
فایل `.env` را باز کرده و مقادیر زیر را به دقت تنظیم نمایید:

```dotenv
APP_NAME=TaskYar
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://taskyar.3aw.ir

APP_LOCALE=fa
APP_FALLBACK_LOCALE=fa
APP_FAKER_LOCALE=fa_IR

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=fileruni_taskyar
DB_USERNAME=fileruni_taskyaruser
DB_PASSWORD="YOUR_ACTUAL_DB_PASSWORD"
DB_ENGINE=InnoDB

SESSION_DRIVER=file
SESSION_LIFETIME=120
CACHE_STORE=file
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
```

> [!IMPORTANT]
> در هاست‌های دایرکت‌ادمین اشتراکی، برای اتصال مستقیم سوکت MariaDB مقدار `DB_HOST` باید حتماً `localhost` باشد (از `127.0.0.1` استفاده نکنید).

---

## ۶. اجرای دستورات آرتیران به ترتیب دقیق (Artisan Execution Order)

وارد مسیر هسته برنامه شوید:
```bash
cd /home/fileruni/domains/taskyar.3aw.ir/taskyar_core
```

دستورات زیر را **دقیقاً به ترتیب** و با مفسر اختصاصی PHP 8.4 اجرا نمایید:

### گام ۶.۱: پاک‌سازی کش‌های باقیمانده و ناسازگار
```bash
/usr/local/php-8.4/bin/php artisan config:clear
/usr/local/php-8.4/bin/php artisan cache:clear
/usr/local/php-8.4/bin/php artisan route:clear
/usr/local/php-8.4/bin/php artisan view:clear
```
- **خروجی مورد انتظار:** پیام `Configuration cache cleared!`, `Application cache cleared!` برای هر دستور.

### گام ۶.۲: تولید کلید اختصاصی برنامه (در صورت خالی بودن APP_KEY)
```bash
/usr/local/php-8.4/bin/php artisan key:generate --force
```
- **خروجی مورد انتظار:** پیام `Application key set successfully.`

### گام ۶.۳: بررسی اتصال دیتابیس با دستور تشخیصی تسک‌یار
```bash
/usr/local/php-8.4/bin/php artisan taskyar:diagnose
```
- **خروجی مورد انتظار:** تایید اتصال موفق به دیتابیس `fileruni_taskyar` و گزارش آماده بودن برای ساخت جداول.

### گام ۶.۴: اجرای مایگریشن‌ها و ایجاد ساختار بانک اطلاعاتی
```bash
/usr/local/php-8.4/bin/php artisan migrate --force
```
- **خروجی مورد انتظار:** اجرای تمامی مایگریشن‌ها و نمایش علامت `DONE` در مقابل هر جدول:
  ```text
  0001_01_01_000000_create_users_table ........................... DONE
  0001_01_01_000001_create_cache_table ........................... DONE
  0001_01_01_000002_create_jobs_table ............................ DONE
  2026_10_26_000001_add_taskyar_columns_to_users_table .......... DONE
  2026_10_26_000002_create_tasks_table ........................... DONE
  2026_10_26_000003_create_categories_table ...................... DONE
  2026_10_26_000004_create_tags_table ............................ DONE
  2026_10_26_000005_create_task_tag_table ........................ DONE
  2026_10_26_000006_create_reminders_table ....................... DONE
  2026_10_26_000007_create_recurrence_patterns_table ............. DONE
  2026_10_26_000008_create_recurrence_exceptions_table ........... DONE
  2026_10_26_000009_create_task_attachments_table ................ DONE
  2026_10_26_000010_create_activity_logs_table ................... DONE
  ```

### گام ۶.۵: بررسی وضعیت نهایی مایگریشن‌ها
```bash
/usr/local/php-8.4/bin/php artisan migrate:status
```
- **خروجی مورد انتظار:** ستون Ran برای تمام ردیف‌ها مقدار `Yes` داشته باشد.

### گام ۶.۶: ایجاد پیوند پوشه رسانه‌ها (Storage Link)
```bash
/usr/local/php-8.4/bin/php artisan storage:link
```
- **خروجی مورد انتظار:** `The [public/storage] link has been connected to [storage/app/public].`

### گام ۶.۷: ساخت کش‌های بهینه‌سازی شده پروداکشن
```bash
/usr/local/php-8.4/bin/php artisan config:cache
/usr/local/php-8.4/bin/php artisan route:cache
/usr/local/php-8.4/bin/php artisan view:cache
```
- **خروجی مورد انتظار:** پیام‌های تایید موفقیت کش برای هر بخش.

### گام ۶.۸: اطمینان از خروج از حالت تعمیرات (Maintenance Mode)
```bash
/usr/local/php-8.4/bin/php artisan up
```
- **خروجی مورد انتظار:** `Application is now live.`

### گام ۶.۹: اصلاح نهایی مجوز دسترسی فایل‌ها
```bash
chmod -R 775 storage bootstrap/cache
```

---

## ۷. راستی‌آزمایی ساختار دیتابیس و انجین InnoDB (Database Verification)

برای اطمینان ۱۰۰٪ از اینکه تمام جداول با انجین `InnoDB` ساخته شده‌اند، دستور SQL زیر را در زبانه SQL در phpMyAdmin اجرا نمایید:

```sql
SELECT 
    table_name AS 'جدول',
    engine AS 'موتور دیتابیس',
    table_collation AS 'انکودینگ',
    table_rows AS 'تعداد رکورد'
FROM information_schema.tables
WHERE table_schema = 'fileruni_taskyar';
```
- **نتیجه مورد انتظار:** ستون موتور دیتابیس (`engine`) برای کلیه جداول باید بدون استثنا مقدار **InnoDB** باشد.

برای تایید کلیدهای خارجی (Foreign Keys):
```sql
SELECT 
    constraint_name,
    table_name,
    column_name,
    referenced_table_name,
    referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'fileruni_taskyar' 
  AND referenced_table_name IS NOT NULL;
```
- **نتیجه مورد انتظار:** برقراری روابط `tasks_user_id_foreign`، `task_tag_task_id_foreign` و سایر کلیدها.

---

## ۸. راستی‌آزمایی وب‌اپلیکیشن پیش‌رونده (PWA Verification)

1. **بررسی اتصال HTTPS:** آدرس `https://taskyar.3aw.ir` را باز کرده و علامت قفل سبز/امن را تایید کنید.
2. **بررسی فایل مانیفست:** مسیر `https://taskyar.3aw.ir/manifest.webmanifest` را در مرورگر باز کنید؛ پاسخ باید حاوی JSON معتبر با آیکون‌های `/pwa-icons/` و آرایه ۳ میانبر لانچر باشد.
3. **بررسی آیکون‌ها:** آدرس‌های زیر باید همگی کد HTTP 200 برگردانند:
   - `https://taskyar.3aw.ir/pwa-icons/icon-192.png`
   - `https://taskyar.3aw.ir/pwa-icons/icon-maskable-192.png`
   - `https://taskyar.3aw.ir/pwa-icons/icon-512.png`
   - `https://taskyar.3aw.ir/pwa-icons/icon.svg`
4. **بررسی سرویس ورکر:** با باز کردن ابزار توسعه مرورگر (F12 > Application > Service Workers)، وضعیت سرویس ورکر باید `activated and is running` با دامنه `https://taskyar.3aw.ir/` باشد.
5. **بررسی نصب نیتیو PWA:**
   - با کلیک روی آیتم «نصب برنامه (PWA)» در سایدبار یا بنر شناور، مدال فارسی نصب باز می‌شود.
   - در مرورگرهای کروم، اج و اندروید، دکمه **«نصب برنامه»** فعال شده و با فشردن آن دیالوگ بومی مرورگر باز می‌گردد.
   - در آیفون/سافاری، راهنمای ۳ مرحله‌ای افزودن به صفحه اصلی نمایش داده می‌شود.
6. **بررسی کارکرد آفلاین:** در زبانه Network گزینه Offline را فعال کنید؛ برنامه با بهره‌گیری از کش داخلی و IndexedDB بدون اینترنت بارگذاری شده و وظایف را ذخیره می‌کند.

---

## ۹. فهرست و بررسی عملکرد کلیدهای میانبر (Shortcuts Verification)

تسک‌یار وب ۲.۰ مجهز به موتور جامع کلیدهای میانبر با پشتیبانی از چیدمان فارسی و انگلیسی کیبورد است:

| کلید میانبر | عملکرد مورد انتظار | تست و راستی‌آزمایی |
|---|---|---|
| `Alt + N` (یا `Ctrl + N` یا `Alt + د`) | انتقال فوکوس به نوار ثبت کار جدید | زدن کلید در هر نما، فیلد ثبت تسک را فوکوس می‌کند |
| `Alt + F` (یا کلید `/` یا `Alt + ب`) | انتقال فوکوس به فیلد جستجو در سایدبار | فیلد جستجو فعال و آماده تایپ می‌شود |
| `Alt + 1` (یا `Alt + ۱`) | جابجایی آنی به نمای **روز من** | برد به لیست وظایف امروز سوئیچ می‌کند |
| `Alt + 2` (یا `Alt + ۲`) | جابجایی آنی به نمای **برد ۷ روز هفته** | برد به کانبان هفتگی افقی سوئیچ می‌کند |
| `Alt + 3` (یا `Alt + ۳`) | جابجایی آنی به نمای **برد ۳۰ روزه ماه** | تقویم ماهانه جلالی فعال می‌شود |
| `Alt + 4` (یا `Alt + ۴`) | جابجایی آنی به نمای **کارهای مهم** | وظایف ستاره‌دار نمایش داده می‌شوند |
| `Alt + 5` (یا `Alt + ۵`) | جابجایی آنی به نمای **برنامه‌های روزانه** | افق زمانی روزانه فعال می‌شود |
| `Alt + 6` (یا `Alt + ۶`) | جابجایی آنی به نمای **برنامه‌های هفتگی** | افق زمانی هفتگی فعال می‌شود |
| `Alt + 7` (یا `Alt + ۷`) | جابجایی آنی به نمای **اهداف ماهیانه** | افق زمانی ماهانه فعال می‌شود |
| `Alt + 8` (یا `Alt + ۸`) | جابجایی آنی به نمای **همه وظایف** | کل لیست کارها بدون فیلتر نمایش داده می‌شود |
| `Delete` | حذف وظیفه باز شده در کشوی جزئیات | در صورت باز بودن کشو، پیام تایید حذف نمایش داده می‌شود |
| `F1` (یا `Ctrl + /` یا کلید `?`) | باز/بسته کردن مدال راهنمای میانبرها | پنجره کامل کلیدها و ژست‌های لمسی باز می‌شود |
| `Esc` | بستن پنجره‌ها، کشو و سایدبار | لایه‌های باز به ترتیب بسته و فیلد تایپ بلر می‌شود |
| `Ctrl + B` (یا `Ctrl + Shift + S`) | دانلود فوری فایل بکاپ JSON | فایل بکاپ تسک‌ها مستقیماً دانلود می‌شود |

> [!NOTE]
> در زمان تایپ متون داخل فیلدهای ورودی، تمامی میانبرهای تک‌کلیدی به صورت خودکار غیرفعال می‌شوند تا هیچ تداخلی با نوشتن متن فارسی ایجاد نشود.

---

## ۱۰. راهنمای عیب‌یابی مشکلات متداول (Troubleshooting)

### خطای HTTP 500 (Internal Server Error)
- دسترسی فایل `.env` و مجوزهای پوشه ذخیره‌سازی را بررسی کنید:
  `chmod -R 775 storage bootstrap/cache`
- بررسی آخرین خطاهای ثبت‌شده در فایل لاگ:
  `tail -n 50 /home/fileruni/domains/taskyar.3aw.ir/taskyar_core/storage/logs/laravel.log`

### خطای عدم اتصال به دیتابیس (SQLSTATE[HY000] [2002])
- مقدار `DB_HOST` در فایل `.env` حتماً باید `localhost` باشد. استفاده از `127.0.0.1` به دلیل غیرفعال بودن اتصالات راه دور شبکه محلی در دایرکت‌ادمین منجر به خطای ۲۰۰۲ می‌شود.

### خطای Foreign Key Constraint در هنگام ساخت جداول
- اطمینان حاصل کنید هیچ جدولی از قبل با موتور MyISAM در دیتابیس باقی نمانده باشد. تمام جداول باید InnoDB باشند.

### عدم نمایش آیکون‌ها و خطای ۴۰۴
- وب‌سرور آپاچی دارای آلیاس پیش‌فرض `/icons/` است؛ در تسک‌یار ۲.۰ کلیه آیکون‌ها به مسیر `/pwa-icons/` منتقل شده‌اند. در صورت استفاده از ساختار پوشه مجزا، اطمینان حاصل کنید فایل `.htaccess` درون `public_html` فعال باشد.

### خطای DataCloneError در کنسول مرورگر
- این خطا در نسخه جدید به طور کامل با الگوریتم عقیم‌سازی داده و نرمالایزر اختصاصی برطرف شده است. در صورت مشاهده، یک‌بار حافظه کش مرورگر را با `Ctrl + F5` تخلیه کنید.

---

## ۱۱. چک‌لیست تایید نهایی راه‌اندازی (Final Acceptance Checklist)

- [ ] دیتابیس `fileruni_taskyar` آماده و تمامی جداول با موتور `InnoDB` ایجاد شده‌اند.
- [ ] فایل `.env` با مقادیر پروداکشن و `APP_DEBUG=false` پیکربندی شده است.
- [ ] کلید برنامه (`APP_KEY`) با دستور `artisan key:generate` تولید شده است.
- [ ] تمامی ۱۳ مایگریشن با وضعیت `DONE` بدون خطا پایان یافته‌اند.
- [ ] کش‌های `config`, `route`, `view` با موفقیت ساخته شده‌اند.
- [ ] مجوز دسترسی `775` برای `storage` و `bootstrap/cache` اعمال شده است.
- [ ] حساب کاربری مدیر در صفحه `/register` ایجاد شده و ورود با موفقیت انجام می‌شود.
- [ ] ایجاد، ویرایش، تیک زدن و حذف وظیفه به صورت آنلاین و آفلاین کار می‌کند.
- [ ] آیکون‌ها و مانیفست PWA با کد HTTP 200 لود می‌شوند و مدال نصب کار می‌کند.
- [ ] کلیدهای میانبر (مانند `F1`, `Alt+1..8`, `Alt+N`, `Alt+F`) عملکرد صحیح دارند.
- [ ] زمان‌بند کران‌جاب در دایرکت‌ادمین برای اجرای خودکار یادآورها ثبت شده است.
