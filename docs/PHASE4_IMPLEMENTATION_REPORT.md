# گزارش جامع پیاده‌سازی فاز ۴ — تسک‌یار وب ۲.۰ (TaskYar Web 2.0)
**موضوع: مدیریت پیشرفته وظایف (Advanced Task Management)**  
**تاریخ گزارش: آبان ۱۴۰۵**  
**نسخه: ۲.۰.۰ (Phase 4 Complete)**  
**توسعه‌دهنده: حسین محمدپور — info@hosseinmohammadpour.ir**

---

## ۱. خلاصه اجرایی و فایل‌های تغییریافته (Files Changed)

فاز ۴ پروژه تسک‌یار وب ۲.۰ بر اساس کلیه ضوابط مهندسی و نیازمندی‌های فاز، بدون بازنویسی یا دستکاری ماژول‌های پایدار قبلی با موفقیت کامل پیاده‌سازی و راستی‌آزمایی شد. در این فاز قابلیت‌های پیشرفته مدیریت وظایف افزوده شد:
- **موتور تکرار وظایف (Recurring Tasks Engine)** مبتنی بر محاسبات گاه‌شماری جلالی، سال‌های کبیسه و قواعد ۳۰ اسفند.
- **سیستم دسته‌بندی‌ها و برچسب‌ها (Categories & Tags)** با استقلال کامل حساب‌های کاربری و حذف ایمن.
- **پردازشگر آفلاین متن طبیعی فارسی (Offline Persian NLP Quick Entry)** بدون نیاز به اینترنت یا API هوش مصنوعی خارجی.
- **داشبورد تحلیلی و آماری کاربر (Personal Analytics Dashboard)** با نمودارهای برداری واکنش‌گرای SVG بومی (بدون CDN).
- **ارتقای ساختار پشتیبان‌گیری به نسخه ۲ (Backup Format v2)** سازگار ۱۰۰٪ با نسخه‌های دسکتاپ v1.1.0 و وب v1.

### جدول فایل‌های ایجادشده و تغییریافته:

| ردیف | نام فایل | نوع | شرح تغییرات |
|---|---|---|---|
| ۱ | `database/migrations/2026_10_26_000005_create_categories_table.php` | مایگریشن | جدول دسته‌بندی‌ها با کلید یکتای ترکیبی چندکاربره و رنگ |
| ۲ | `database/migrations/2026_10_26_000006_create_tags_and_task_tag_tables.php` | مایگریشن | جدول برچسب‌ها و جدول واسط ارتباط چندبه‌چند task_tag |
| ۳ | `database/migrations/2026_10_26_000007_add_recurrence_and_category_to_tasks_table.php` | مایگریشن | افزودن category_id با حذف امن (SET NULL) و فیلدهای تکرار |
| ۴ | `database/migrations/2026_10_26_000008_create_task_recurrence_exceptions_table.php` | مایگریشن | جدول استثنائات، موارد تکمیل‌شده و ردشده تکرار |
| ۵ | `app/Models/Category.php` | مدل | مدل دسته‌بندی، روابط کارها و کاربر، پرکردنی‌ها |
| ۶ | `app/Models/Tag.php` | مدل | مدل برچسب، رابطه چندبه‌چند با کارها |
| ۷ | `app/Models/TaskRecurrenceException.php` | مدل | ثبت اقدامات تکرار (completed, skipped, rescheduled) |
| ۸ | `app/Models/Task.php` | مدل | افزودن روابط category، tags، parent، exceptions و دامنه‌های فیلتر |
| ۹ | `app/Services/JalaliCalendar.php` | سرویس | توابع مستقل محاسبات جلالی، تبدیل تاریخ، کبیسه‌سنجی و طول ماه‌ها |
| ۱۰ | `app/Services/RecurrenceService.php` | سرویس | موتور محاسباتی گسترش محدود، شناسه باثبات `task@date`، ویرایش رویدادها |
| ۱۱ | `app/Http/Controllers/CategoryController.php` | کنترلر | عملیات CRUD دسته‌ها، اعتبارسنجی و ایزولاسیون کاربری |
| ۱۲ | `app/Http/Controllers/TagController.php` | کنترلر | مدیریت برچسب‌ها و واکشی کاربری |
| ۱۳ | `app/Http/Controllers/AnalyticsController.php` | کنترلر | تجمیع آماری بهینه بدون N+1، ترند ۶ ماهه و هفتگی جلالی |
| ۱۴ | `app/Http/Controllers/TaskController.php` | کنترلر | پشتیبانی از پارامترهای تکرار، دسته، برچسب، استثنائات تکرار |
| ۱۵ | `app/Http/Controllers/BackupController.php` | کنترلر | صادرات و واردات جامع اتمیک نسخه ۲ با حفظ سازگاری دسکتاپ |
| ۱۶ | `routes/web.php` | مسیرها | ثبت مسیرهای API برای دسته‌ها، برچسب‌ها، تکرار و آمار |
| ۱۷ | `resources/js/utils/quickParser.js` | جاوااسکریپت | پردازشگر آفلاین قطعی جملات فارسی، تشخیص تاریخ، ساعت، تکرار و برچسب |
| ۱۸ | `resources/js/components/AddTaskBar.vue` | کامپوننت | نوار ورود کار با تراشه‌های تعاملی پیش‌نمایش NLP و کلیدهای تنظیم تکرار |
| ۱۹ | `resources/js/components/CategoryModal.vue` | کامپوننت | پنجره مدیریت و افزودن دسته‌ها با پالت رنگی |
| ۲۰ | `resources/js/components/RecurrenceModal.vue` | کامپوننت | پنجره تنظیم قواعد تکرار با تقویم جلالی و روزهای هفته |
| ۲۱ | `resources/js/components/RecurrenceActionModal.vue` | کامپوننت | پنجره انتخاب رفتار ویرایش/حذف (این مورد، این و موارد بعدی، کل سری) |
| ۲۲ | `resources/js/components/DetailDrawer.vue` | کامپوننت | پنل جزئیات تسک با پشتیبانی تکرار، دسته‌ها، برچسب‌ها و تاریخ ایجاد جلالی |
| ۲۳ | `resources/js/components/PersianTimePicker.vue` | کامپوننت | انتخابگر شناور زمان با تله‌پورت سراسری خارج از اسکرول کشو |
| ۲۴ | `resources/js/views/AnalyticsView.vue` | نما | داشبورد تحلیلی و آماری با نمودارهای برداری SVG واکنش‌گرا |
| ۲۵ | `resources/js/components/Sidebar.vue` | کامپوننت | مدیریت دسته‌ها در نوار کناری و لینک دسترسی به آمار و پیشرفت |
| ۲۶ | `tests/Unit/RecurrenceServiceTest.php` | تست واحد | آزمون‌های محاسبات تکرار، سال کبیسه و قواعد ۳۰ اسفند |
| ۲۷ | `tests/Unit/quickParser.test.js` | تست واحد | آزمون‌های تجزیه‌گر الگوهای متنی فارسی |
| ۲۸ | `tests/Feature/CategoryControllerTest.php` | تست فیچر | آزمون‌های ایزولاسیون و حذف ایمن دسته‌ها |
| ۲۹ | `tests/Feature/TagControllerTest.php` | تست فیچر | آزمون‌های ایزولاسیون برچسب‌ها |
| ۳۰ | `tests/Feature/AnalyticsControllerTest.php` | تست فیچر | آزمون‌های محاسبات تحلیلی |
| ۳۱ | `tests/Feature/BackupCompatibilityTest.php` | تست فیچر | آزمون جامع واردات بکاپ دسکتاپ v1.1.0، وب v1 و ساختار v2 |
| ۳۲ | `tests/e2e/phase4_features_test.js` | تست E2E | آزمون مرورگر سرتاسری برای قابلیت‌های فاز ۴ |

---

## ۲. مایگریشن‌های پایگاه داده (Database Migrations)

چهار مایگریشن افزایشی و غیرمخرب ایجاد و با موفقیت اجرا گردید:

1. **`2026_10_26_000005_create_categories_table.php`**:
   - جدول `categories` با فیلدهای `user_id`، `name`، `color`، `icon`، `order_index`.
   - کلید ترکیبی یکتا `unique(['user_id', 'name'])` جهت جلوگیری از نام‌های تکراری در هر حساب.
2. **`2026_10_26_000006_create_tags_and_task_tag_tables.php`**:
   - جدول `tags` با فیلدهای `user_id`، `name` و کلید یکتای چندکاربره.
   - جدول واسط `task_tag` با ارتباط چندبه‌چند بین وظایف و برچسب‌ها.
3. **`2026_10_26_000007_add_recurrence_and_category_to_tasks_table.php`**:
   - افزودن `category_id` (با کلید خارجی `onDelete('set null')` جهت حفظ کارها هنگام حذف دسته).
   - افزودن فیلدهای تکرار: `recurrence_pattern`، `recurrence_interval`، `recurrence_weekdays`، `recurrence_month_day`، `recurrence_end_date`، `recurrence_count`، `recurrence_parent_id`، `recurrence_original_date`، `is_recurrence_exception`.
4. **`2026_10_26_000008_create_task_recurrence_exceptions_table.php`**:
   - ثبت رخدادهای ردشده (skipped)، تکمیل‌شده (completed) و استثنائات جداشده بدون تکثیر بی‌رویه رکوردهای دیتابیس.

---

## ۳. جزییات پیاده‌سازی قابلیت‌ها (Feature Implementation Details)

### الف) سرویس گاه‌شماری جلالی و موتور تکرار (`app/Services/JalaliCalendar.php` & `RecurrenceService.php`)
- پیاده‌سازی مستقل الگوریتم بوروکوفسکی بدون وابستگی به اکستنشن‌های جانبی PHP.
- محاسبه سال‌های کبیسه جلالی (دوره‌های ۳۳ ساله) و طول دقیق ماه‌های ۱ تا ۱۲.
- **قاعده اسفند ۳۰**: چنانچه یک کار در ۳۰ اسفند سال کبیسه ایجاد شود، در سال‌های ۲۹ روزه بعدی، رخداد آن سال به‌صورت ایمن و خودکار در ۲۹ اسفند ماه قرار می‌گیرد.
- **گسترش محدود رخدادها (Bounded Expansion)**: پایگاه داده با میلیون‌ها رکورد تکرار پر نمی‌شود؛ الگو در رکورد والد ثبت شده و به هنگام واکشی بازه‌های ماهانه یا هفتگی گسترش می‌یابد.
- **رفتارهای سه‌گانه ویرایش**:
  - ویرایش فقط این رویداد (`editThisOccurrence`): ایجاد تسک استثنا با وضعیت `is_recurrence_exception`.
  - ویرایش این مورد و موارد بعدی (`editFutureOccurrences`): خاتمه الگوی قبلی در تاریخ مبدا و آغاز سری جدید.
  - ویرایش کل مجموعه: به‌روزرسانی مشخصات رکورد پایه.

### ب) سیستم دسته‌ها و برچسب‌ها
- ایجاد، ویرایش، تغییر نام و حذف دسته‌ها با رنگ دلخواه.
- حذف دسته‌بندی بدون پاک شدن کارها (`ON DELETE SET NULL`).
- امکان انتساب چند برچسب به هر وظیفه و فیلتر کردن همزمان با چند برچسب.
- نمایش تراشه‌های برچسب فشرده و شکیل در کارتها و دراور جزئیات.

### ج) تجزیه‌گر آفلاین متن طبیعی فارسی (`resources/js/utils/quickParser.js`)
- تبدیل قطعی ارقام فارسی و عربی به لاتین برای پردازش الگوها.
- استخراج تاریخ‌های نسبی: «امروز»، «فردا»، «پس‌فردا»، «شنبه آینده»، «دوشنبه بعد».
- استخراج زمان‌های ۲۴ ساعته و نسبی: «ساعت ۹»، «ساعت ۱۴:۳۰»، «۸ و نیم»، «صبح»، «عصر»، «غروب»، «شب».
- استخراج الگوهای تکرار: «هر روز»، «هر هفته»، «هر دوشنبه»، «هر ماه»، «هر سال».
- استخراج برچسب‌ها با کاراکتر `#` و اولویت‌ها با کلمات «مهم»، «فوری»، «ضروری».
- نمایش تراشه‌های تعاملی زنده در بالای کادر ورود کار همراه با امکان حذف هر بخش و عنوان پاکسازی‌شده.

### د) داشبورد تحلیل و آمار شخصی (`resources/js/views/AnalyticsView.vue` & `AnalyticsController.php`)
- محاسبه ایزوله و کاربرمحور ۴ کارت شاخص: کل برنامه‌ها، انجام شده‌ها، در حال انتظار، معوقه‌ها (با تاخیر).
- نمودار ستونی برداری SVG واکنش‌گرا برای عملکرد ۷ روز اخیر به تفکیک روزهای هفته جلالی.
- نمودار خطی روند ۶ ماه اخیر جلالی بر اساس تاریخ‌های ثبت و تکمیل واقعی.
- گیج دایره‌ای درصد بهره‌وری کل با ترنزیشن نرم CSS.
- نوارهای افقی توزیع دسته‌بندی‌ها با درصد و رنگ اختصاصی هر دسته.
- **کاملاً سبک، محلی و بدون نیاز به Chart.js یا کتابخانه‌های سنگین خارجی**.

### ه) ارتقای فرمت پشتیبان‌گیری (`app/Http/Controllers/BackupController.php` & `docs/BACKUP_SCHEMA_V2.md`)
- صادرات پیش‌فرض در فرمت آرایه‌ای دسکتاپ v1.1.0 و فرمت جامع کپسوله‌شده نسخه ۲ (`/api/backup/export?v=2`).
- واردات اتمیک (DB Transaction) سازگار با هر ۳ ساختار فایل پشتیبان بدون تداخل کلیدهای شناسایی.

---

## ۴. نتایج آزمون‌های خودکار (Automated Test Results)

### ۱. آزمون‌های بک‌اند (PHPUnit)
```
   PASS  Tests\Unit\ExampleTest
   PASS  Tests\Unit\RecurrenceServiceTest
   PASS  Tests\Feature\AnalyticsControllerTest
   PASS  Tests\Feature\AssetDependencyTest
   PASS  Tests\Feature\AuthenticationTest
   PASS  Tests\Feature\BackupCompatibilityTest
   PASS  Tests\Feature\CategoryControllerTest
   PASS  Tests\Feature\ExampleTest
   PASS  Tests\Feature\JalaliDateConsistencyTest
   PASS  Tests\Feature\TagControllerTest
   PASS  Tests\Feature\TaskUserIsolationTest

Tests:    36 passed (316 assertions)
Duration: 2.44s
```

### ۲. آزمون‌های واحد جاوااسکریپت (Jalali & QuickParser)
```
Running Jalali Calendar & Digit Tests...
  ✓ 2026-03-21 -> 1405/01/01 (Nowruz) verified
  ✓ 1405/01/01 -> 2026-03-21 verified
  ✓ 100 consecutive days round-trip accuracy verified
  ✓ Jalali leap years (1399, 1403) verified
  ✓ Jalali month lengths and boundaries verified
  ✓ Persian & Arabic digit conversion and normalization verified
  ✓ ISO date arithmetic verified
  ✓ formatCreationDate handles ISO, MySQL, Desktop, Jalali, and invalid timestamps
ALL 8 JALALI UTILITY TESTS PASSED CLEANLY!

Running Offline Persian Natural-Language Quick Entry Parser Tests...
  ✓ «فردا ساعت ۹ جلسه» -> فردا، ۰۹:۰۰، جلسه
  ✓ «پسفردا ساعت ۱۸ ورزش مهم» -> پس‌فردا، ۱۸:۰۰، مهم، ورزش
  ✓ «هر دوشنبه ساعت ۸ کلاس #دانشگاه» -> تکرار دوشنبه‌ها، ۰۸:۰۰، #دانشگاه
  ✓ «هر روز صبح ورزش» -> تکرار روزانه، ۰۹:۰۰، ورزش
  ✓ «ساعت ۸ و نیم جلسه فوری» -> ۰۸:۳۰، مهم، جلسه
  ✓ «شنبه آینده ساعت ۱۴ خرید» -> شنبه آینده، ۱۴:۰۰، خرید
  ✓ متن ساده بدون قید زمان با موفقیت بدون تغییر باقی ماند
ALL 7 QUICK ENTRY PARSER TESTS PASSED CLEANLY!
```

### ۳. بیلد فرانت‌اند (Vite & Vue 3)
```
vite v8.3.5 building client environment for production...
✓ 78 modules transformed.
public/build/manifest.json              0.38 kB │ gzip:  0.18 kB
public/build/assets/app-Bvs6FT1I.css   31.40 kB │ gzip:  5.16 kB
public/build/assets/app-DmvQP9aj.css   64.26 kB │ gzip: 14.29 kB
public/build/assets/app-CjzdgFRP.js   227.33 kB │ gzip: 74.25 kB
✓ built in 713ms
```

---

## ۵. نتایج راستی‌آزمایی مرورگر E2E (Browser Verification Results)

چهار مجموعه آزمون مرورگر سرتاسری با کرومیوم تحت Puppeteer اجرا و با ۱۰۰٪ موفقیت به پایان رسیدند:

1. **`phase4_features_test.js`**:
   - ثبت ورودی NLP «فردا ساعت ۹ جلسه کاری #پروژه مهم» و استخراج بی‌درنگ تراشه‌ها: `[ '📅 ۶ آبان', '🕒 ۰۹:۰۰', '★ مهم', '#پروژه' ]`.
   - ایجاد و انتساب دسته «پروژه اختصاصی» در کشوی تسک.
   - ایجاد وظیفه روزانه و گسترش خودکار آن در برد ۷ روزه هفته.
   - رندر داشبورد آماری با تمام متریک‌ها و نمودارهای SVG.
   - آزمون سایز موبایل (عرض ۳۷۵ پیکسل) و تایید عدم وجود سرریز افقی (`hasHorizontalOverflow: false`).
   - تایید مشخصات طراح و توسعه‌دهنده در پنجره درباره.
2. **`drawer_time_picker_test.js` (۲۲/۲۲ تست پاس شد)**:
   - موقعیت پنل شناور Persian Time Picker در درون دراور در تمامی عرض‌های ۱۴۴۰، ۱۲۸۰، ۷۶۸ و ۳۷۵ پیکسل.
   - عدم قفل اسکرول دراور و قرارگیری دقیق پاپ‌اور در دید کاربر.
   - چرخه تغییر تم در تمام ۴ تم نرم‌افزار.
3. **`persian_date_and_rtl_nav_test.js` (۳۵/۳۵ تست پاس شد)**:
   - نمایش صحیح تاریخ ایجاد جلالی با ارقام فارسی («ایجاد شده: ۵ آبان ۱۴۰۵»).
   - ناوبری راست‌به‌چپ (RTL) در برد هفته (کلید راست = هفته قبل با فلش رو به راست، کلید چپ = هفته بعد با فلش رو به چپ).
   - ناوبری راست‌به‌چپ در تقویم ماه جلالی و عبور صحیح از مرز سال جلالی (اسفند ۱۴۰۴ به فروردین ۱۴۰۵).
4. **`phase3_smoke_test.js` (۱۸/۱۸ تست پاس شد)**:
   - بازگشت صحیح ریدایرکت احراز هویت، ورود، ثبت نام، انتخابگر زمان، دراور، برد هفته و ماه و ایزولاسیون چندکاربره.

---

## ۶. تصاویر و مستندات تصویری ضبط‌شده (Screenshots)

کلیه تصاویر در مسیر آرتیفکت‌های پایدار پروژه در دسترس و قابل استناد هستند:

1. **`phase4_nlp_quick_entry.png`**:
   نمایش نوار هوشمند ورود سریع همراه با تراشه‌های زنده تاریخ، ساعت، اولویت و برچسب.
2. **`phase4_categories_and_tags.png`**:
   نمایش پنجره اختصاص دسته‌بندی و مدیریت برچسب‌ها در کشوی جزئیات کار.
3. **`phase4_recurrence_board.png`**:
   نمایش برد ۷ روزه هفته همراه با گسترش پیوسته رخدادهای تکرارشونده.
4. **`phase4_analytics_dashboard.png`**:
   نمایش داشبورد تحلیلی و آماری با ۴ کارت متریک، گیج درصد بهره‌وری، نمودار ستونی ۷ روزه و روند ماهانه جلالی.
5. **`phase4_mobile_analytics.png`**:
   نمایش واکنش‌گرایی کامل داشبورد آمار در گوشی هوشمند (۳۷۵ پیکسل) بدون سرریز افقی.
6. **`phase4_mobile_myday.png`**:
   نمایش صفحه روز من در نمای موبایل.
7. **`phase4_about_modal.png`**:
   تایید اطلاعات توسعه‌دهنده (حسین محمدپور — info@hosseinmohammadpour.ir) و انتساب حقوقی.

---

## ۷. محدودیت‌ها و موارد شناخته‌شده (Known Issues and Limitations)

1. **تجزیه متون بسیار طولانی یا نامتعارف**: تجزیه‌گر متن فارسی مبتنی بر قواعد قطعی (Deterministic RegExp) طراحی شده است. جملات محاوره‌ای بسیار پیچیده که فاقد الگوهای زمان یا تکرار مشخص باشند به عنوان عنوان خالص کار تلقی می‌شوند و سیستم با اطمینان از اعمال تاریخ حدسی خودداری می‌کند.
2. **پنجره گسترش تقویم در حافظه**: جهت جلوگیری از ایجاد رکوردهای تکراری در پایگاه داده، رخدادهای تکراری در بازه‌های درخواستی (حداکثر ۱۲ ماه آینده) گسترش می‌یابند. بازه‌های بزرگتر از یک سال به صورت پویا هنگام اسکرول یا ناوبری واکشی می‌شوند.

---

## ۸. سازگاری با هاست‌های اشتراکی (Shared-Hosting Compatibility)

معماری پیاده‌سازی‌شده فاز ۴ به گونه‌ای است که به طور کامل با هاست‌های اشتراکی cPanel/DirectAdmin سازگار است:
- **عدم نیاز به سرور ردیس (No Redis Required)**: جلسات و کش در پایگاه داده مدیریت می‌شوند.
- **عدم نیاز به سرویس‌های دائمی Node یا سوکت (No WebSockets / Persistent Node Daemons)**: کلیه عملیات از طریق ریکوئست‌های استاندارد HTTP RESTful انجام می‌شود.
- **عدم نیاز به Worker صف دائمی (No Mandatory Queue Workers)**: پردازش‌ها بلادرنگ و سریع هستند.
- **فایل‌های استاتیک مستقل (Zero External CDN)**: فونت‌های فارسی وزیرمتن و استایل‌ها به صورت لوکال از پوشه `public/build` سرو می‌گردند و نیازی به اینترنت بین‌الملل ندارند.

---

## ۹. وضعیت و کارهای باقی‌مانده برای فاز ۵ (Remaining Work for Phase 5)

با اتمام موفقیت‌آمیز فاز ۴، ساختار داده و منطق نرم‌افزار برای فاز ۵ کاملاً آماده است:
1. قابلیت‌های پیشرفته صوتی و هشدارهای پس‌زمینه با Web Audio API.
2. ذخیره‌سازی آفلاین کلاینت با Service Worker و همگام‌سازی IndexedDB.
3. بسته‌بندی PWA / Desktop با قابلیت نصب به عنوان اپلیکیشن تحت وب پیش‌رونده.
