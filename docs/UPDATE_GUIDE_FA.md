# راهنمای به‌روزرسانی تسک‌یار وب در هاست دایرکت‌ادمین (Update Guide)

این سند مراحل ایمن و استاندارد ارتقا و به‌روزرسانی پروژه **تسک‌یار وب** به نسخه‌های جدید را بدون خطر از بین رفتن داده‌ها شرح می‌دهد.

---

## ۱. فایل‌ها و داده‌هایی که هرگز نباید حذف شوند (Persistent Data)

هنگام به‌روزرسانی برنامه، موارد زیر حاوی اطلاعات کاربران و پیکربندی محرمانه سرور شما هستند و باید حفظ شوند:
1. **فایل محیطی (`.env`):** کلید `APP_KEY` و مشخصات اتصال دیتابیس در این فایل است. اگر `APP_KEY` تغییر کند، تمام سشن‌ها و داده‌های رمزنگاری‌شده آسیب می‌بینند.
2. **پوشه ذخیره‌سازی (`storage/`):** فایل‌های آپلودشده کاربران و لاگ‌های سرور.
3. **پایگاه داده MariaDB:** تمامی جداول و اطلاعات ثبت‌شده وظایف.

---

## ۲. مراحل گام‌به‌گام به‌روزرسانی با دسترسی SSH یا Terminal

### گام اول: تهیه نسخه پشتیبان (Backup)
پیش از اعمال هرگونه تغییر، از پایگاه‌داده و فایل `.env` خود پشتیبان تهیه کنید:
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM/taskyar_core
cp .env .env.backup.$(date +%F)

# پشتیبان‌گیری سریع از دیتابیس در phpMyAdmin یا با mysqldump
mysqldump -u DB_USER -p DB_NAME > db_backup_$(date +%F).sql
```

### گام دوم: فعال‌سازی حالت تعمیرات (Maintenance Mode)
```bash
/usr/local/php-8.4/bin/php artisan down --message="در حال به‌روزرسانی تسک‌یار به نسخه جدید..."
```

### گام سوم: استخراج بسته جدید و جایگزینی فایل‌ها
بسته جدید `TaskYar-Web-2.0-Stable-Production.zip` را در مسیر دامنه آپلود کرده و اکسترکت کنید:
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM
unzip -o TaskYar-Web-2.0-Stable-Production.zip -d update_temp/

# به‌روزرسانی کدهای اصلی بدون دستکاری .env و storage
cp -r update_temp/TaskYar-Web-2.0/app taskyar_core/
cp -r update_temp/TaskYar-Web-2.0/bootstrap taskyar_core/
cp -r update_temp/TaskYar-Web-2.0/config taskyar_core/
cp -r update_temp/TaskYar-Web-2.0/database taskyar_core/
cp -r update_temp/TaskYar-Web-2.0/resources taskyar_core/
cp -r update_temp/TaskYar-Web-2.0/routes taskyar_core/
cp -r update_temp/TaskYar-Web-2.0/vendor taskyar_core/
cp update_temp/TaskYar-Web-2.0/composer.json taskyar_core/
cp update_temp/TaskYar-Web-2.0/composer.lock taskyar_core/

# به‌روزرسانی است‌های فرانت‌اند در public_html
cp -r update_temp/TaskYar-Web-2.0/public/* public_html/
cp update_temp/TaskYar-Web-2.0/public/.htaccess public_html/

# پاک‌سازی پوشه موقت آپدیت
rm -rf update_temp
```

### گام چهارم: اجرای مایگریشن‌های جدید دیتابیس
```bash
cd /home/USERNAME/domains/YOURDOMAIN.COM/taskyar_core
/usr/local/php-8.4/bin/php artisan migrate --force
```

### گام پنجم: تازه‌سازی کش‌ها و خروج از حالت تعمیرات
```bash
/usr/local/php-8.4/bin/php artisan config:cache
/usr/local/php-8.4/bin/php artisan route:cache
/usr/local/php-8.4/bin/php artisan view:cache

# بازگشت به وضعیت آنلاین
/usr/local/php-8.4/bin/php artisan up
```

اکنون سامانه با موفقیت به نسخه جدید ارتقا یافته است.
