import fs from 'fs';
import path from 'path';
import https from 'https';
import { spawnSync } from 'child_process';

const REPO_OWNER = 'satinbest';
const REPO_NAME = 'taskyar-web';
const TAG_NAME = 'v2.0.2';
const RELEASE_TITLE = 'تسک‌یار وب ۲.۰.۲ — TaskYar Web 2.0.2 (Mobile UI Hotfix)';
const RELEASES_DIR = path.resolve('releases');

const ASSETS = [
  {
    path: path.join(RELEASES_DIR, 'TaskYar-Web-v2.0.2-Stable-Full.zip'),
    type: 'application/zip',
    desc: 'بسته کامل پروداکشن (Stand-alone Full Release) شامل تمامی وابستگی‌های PHP 8.4 در vendor/ و است‌های بیلدشده'
  },
  {
    path: path.join(RELEASES_DIR, 'TaskYar-Web-2.0-Mobile-UI-Hotfix.zip'),
    type: 'application/zip',
    desc: 'بسته به‌روزرسانی سبک (۱۹۱ کیلوبایت) برای ارتقای آسان هاست‌های قبلی بدون نیاز به دانلود مجدد vendor'
  },
  {
    path: path.join(RELEASES_DIR, 'SHA256SUMS.txt'),
    type: 'text/plain',
    desc: 'کدهای هش اعتبارسنجی بسته‌ها'
  }
];

function getGitAuthToken() {
  const res = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8'
  });

  if (res.status !== 0 || !res.stdout) {
    throw new Error('Failed to retrieve GitHub credentials from git credential manager.');
  }

  const lines = res.stdout.split('\n');
  let password = '';
  for (const line of lines) {
    if (line.startsWith('password=')) {
      password = line.slice('password='.length).trim();
      break;
    }
  }

  if (!password) {
    throw new Error('GitHub credential token not found in git credential response.');
  }

  return password;
}

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = [];
      res.on('data', chunk => body.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(body);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: buffer.toString('utf8'),
          raw: buffer
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function uploadAsset(uploadUrlTemplate, filePath, contentType, token) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const cleanUploadUrl = uploadUrlTemplate.replace(/\{(\?name,label|.*)\}/, '');
    const targetUrl = new URL(`${cleanUploadUrl}?name=${encodeURIComponent(fileName)}`);

    const options = {
      hostname: targetUrl.hostname,
      path: targetUrl.pathname + targetUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'TaskYar-Publisher',
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': fileStats.size,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    console.log(`Uploading asset ${fileName} (${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)...`);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to upload ${fileName}: HTTP ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function publish() {
  console.log('=================================================================================');
  console.log(`Publishing Official GitHub Release [${TAG_NAME}] for ${REPO_OWNER}/${REPO_NAME}`);
  console.log('=================================================================================\n');

  const token = getGitAuthToken();
  console.log('✓ Successfully authenticated via Git Credential Manager.');

  const releaseNotes = `## نسخه ۲.۰.۲ تسک‌یار وب — انتشار بهینه‌سازی رابط کاربری موبایل و فواصل تکرار
### TaskYar Web 2.0.2 — Mobile UI Hotfix & Recurrence Spacing Refinement

این انتشار شامل بهینه‌سازی‌های جامع ارگونومی برای صفحات نمایش موبایل، اصلاح فاصله‌گذاری و ریتم عمودی پنجره تنظیم تکرار کارها، و ارائه بسته ارتقای افزایشی فوق‌العاده سبک جهت استقرار سریع روی هاست‌های اشتراکی می‌باشد.

---

### تغییرات و بهینه‌سازی‌های کلیدی (Key Improvements)

1. **ارتقای هدر و دسترسی‌پذیری آیکون‌ها در موبایل (\`MainHeader.vue\` & \`taskyar.css\`):**
   - **جداسازی هوشمند اکشن‌های موبایل:** دکمه‌های پرکاربرد (همگام‌سازی ابری، سوییچ دارک‌مود و دات رنگی تم فعال) با اندازه لمسی استاندارد **۳۶ الی ۳۸ پیکسل** به صورت مستقیم در دسترس کاربر قرار دارند.
   - **منوی کشویی سه‌نقطه («سایر امکانات و دسترسی سریع»):** با آیکون استاندارد Iconsax \`more\` برای انتقال تمیز دیالوگ‌های راهنمای میانبرها و درباره تسک‌یار بدون فشردگی دکمه‌ها.
   - **کنتراست بالای دارک‌مود:** آیکون خورشید در حالت تاریک با رنگ طلایی چشم‌نواز (\`#F59E0B\`) و آیکون ماه در حالت روشن با رنگ بنفش (\`#6D28D9\`) هایلایت شده و خوانایی پس‌زمینه هدر در شب تضمین شده است.
   - **بدون اسکرول افقی:** تضمین عدم هرگونه اسکرول افقی یا بیرون‌زدگی در تمامی نمایشگرها از ۳۲۰px تا ۱۴۴۰px.

2. **فاصله‌گذاری استاندارد و ریتم عمودی پنجره تکرار (\`RecurrenceModal.vue\`):**
   - فاصله‌گذاری دقیق بر اساس ریتم عمودی استاندارد (۸px برای المان‌های مرتبط، ۱۰px برچسب‌ها، ۱۶ تا ۲۰px برای فرم‌ها، ۲۰ تا ۲۴px برای سکشن‌های اصلی).
   - تراشه‌های انتخاب روزهای هفته با ارتفاع ارگونومیک ۴۰ تا ۴۴ پیکسل و گپ ۸ پیکسلی برای لمس آسان با انگشت.
   - پدینگ استاندارد کادرهای بازه زمانی و خلاصه تکرار (۱۲ تا ۱۶ پیکسل و ۱۶ تا ۲۰ پیکسل) به همراه پشتیبانی کامل از حالت شب.

3. **ابطال هوشمند کش و به‌روزرسانی آنی PWA (\`public/sw.js\`):**
   - ثبت نسخه کش جدید \`taskyar-v2.0.2-mobile-hotfix\` در سرویس‌ورکر جهت دریافت خودکار آخرین تغییرات روی دستگاه‌های کلاینت.

---

### بسته‌های پیوست جهت دانلود (Release Assets)

| نام فایل | حجم | کاربرد |
| :--- | :--- | :--- |
| **\`TaskYar-Web-v2.0.2-Stable-Full.zip\`** | ۱۳.۴ مگابایت | **بسته کامل پروداکشن (نصب تازه یا ارتقای استاندارد):** شامل تمامی فایل‌های سورس لاراول، وابستگی‌های کامل PHP 8.4 در \`vendor/\`، است‌های کامپایل‌شده Vite و بدون نیاز به نصب کامپوزر روی هاست |
| **\`TaskYar-Web-2.0-Mobile-UI-Hotfix.zip\`** | ۱۹۱ کیلوبایت | **بسته به‌روزرسانی سبک (هاست‌های فعلی):** جهت ارتقای سریع کدهای فرانت‌اند و بلید روی نصب‌های قبلی بدون نیاز به دانلود مجدد vendor |
| **\`SHA256SUMS.txt\`** | متنی | کدهای هش اعتبارسنجی SHA-256 جهت اطمینان از صحت فایل‌های دریافتی |

---

### راهنماهای نصب و ارتقا (Documentation)
- [راهنمای جامع نصب تازه روی هاست دایرکت‌ادمین](https://github.com/satinbest/taskyar-web/blob/main/docs/INSTALL_FRESH_FA.md)
- [راهنمای جامع ارتقای ایمن و بدون ریسک درجا](https://github.com/satinbest/taskyar-web/blob/main/docs/UPGRADE_TO_V2.0.2_FA.md)

---

### نحوه به‌روزرسانی هاست‌های فعلی (DirectAdmin / cPanel)
1. فایل \`TaskYar-Web-2.0-Mobile-UI-Hotfix.zip\` را در پوشه ریشه پروژه در فایل‌منیجر هاست آپلود و Extract (Overwrite) کنید.
2. دستور پاک‌سازی کش لاراول را با PHP 8.4 اجرا نمایید:
   \`\`\`bash
   /usr/local/php-8.4/bin/php artisan optimize:clear
   \`\`\`
3. در مرورگر کلاینت یک بار صفحه را تازه‌سازی (Ctrl+F5) کنید.

مستندات کامل در [UPDATE_INSTRUCTIONS_FA.md](https://github.com/satinbest/taskyar-web/blob/main/UPDATE_INSTRUCTIONS_FA.md) و [CHANGELOG.md](https://github.com/satinbest/taskyar-web/blob/main/CHANGELOG.md) در دسترس است.
`;

  // Check if release exists
  const checkOptions = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${TAG_NAME}`,
    method: 'GET',
    headers: {
      'User-Agent': 'TaskYar-Publisher',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };

  const checkRes = await httpsRequest(checkOptions);
  let release;

  if (checkRes.statusCode === 200) {
    console.log(`Release ${TAG_NAME} already exists. Updating release details...`);
    release = JSON.parse(checkRes.data);
    const updatePayload = JSON.stringify({
      name: RELEASE_TITLE,
      body: releaseNotes
    });
    const updateOptions = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}`,
      method: 'PATCH',
      headers: {
        'User-Agent': 'TaskYar-Publisher',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    const updateRes = await httpsRequest(updateOptions, updatePayload);
    if (updateRes.statusCode >= 200 && updateRes.statusCode < 300) {
      console.log('✓ Release title and notes updated successfully.');
      release = JSON.parse(updateRes.data);
    }
  } else {
    console.log(`Creating new GitHub Release ${TAG_NAME}...`);
    const createPayload = JSON.stringify({
      tag_name: TAG_NAME,
      target_commitish: 'main',
      name: RELEASE_TITLE,
      body: releaseNotes,
      draft: false,
      prerelease: false
    });

    const createOptions = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'TaskYar-Publisher',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const createRes = await httpsRequest(createOptions, createPayload);
    if (createRes.statusCode !== 201) {
      throw new Error(`Failed to create release: HTTP ${createRes.statusCode} - ${createRes.data}`);
    }
    release = JSON.parse(createRes.data);
    console.log(`✓ Release created successfully! ID: ${release.id}`);
  }

  // Upload assets
  if (release.upload_url) {
    const existingAssets = release.assets || [];

    for (const asset of ASSETS) {
      if (!fs.existsSync(asset.path)) {
        console.warn(`Asset not found: ${asset.path}, skipping...`);
        continue;
      }
      const fileName = path.basename(asset.path);
      const existing = existingAssets.find(a => a.name === fileName);
      if (existing) {
        if (fileName === 'SHA256SUMS.txt') {
          console.log(`Replacing ${fileName} with latest version...`);
          const delOptions = {
            hostname: 'api.github.com',
            path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${existing.id}`,
            method: 'DELETE',
            headers: {
              'User-Agent': 'TaskYar-Publisher',
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28'
            }
          };
          await httpsRequest(delOptions);
          await uploadAsset(release.upload_url, asset.path, asset.type, token);
          console.log(`✓ Replaced ${fileName}`);
        } else {
          console.log(`Asset ${fileName} already attached to release.`);
        }
      } else {
        await uploadAsset(release.upload_url, asset.path, asset.type, token);
        console.log(`✓ Attached ${fileName}`);
      }
    }
  }

  console.log('\n=================================================================================');
  console.log(`🎉 OFFICIAL GITHUB RELEASE PUBLISHED SUCCESSFULLY!`);
  console.log(`Tag:     ${TAG_NAME}`);
  console.log(`Release: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${TAG_NAME}`);
  console.log('=================================================================================\n');
}

publish().catch(err => {
  console.error('Release failed:', err);
  process.exit(1);
});
