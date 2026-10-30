import fs from 'fs';
import path from 'path';
import https from 'https';
import { spawnSync } from 'child_process';

const REPO_OWNER = 'satinbest';
const REPO_NAME = 'taskyar-web';
const TAG_NAME = 'v2.0.0';
const RELEASE_TITLE = 'TaskYar Web 2.0 — Stable Release';
const RELEASES_DIR = path.resolve('releases');
const ZIP_PATH = path.join(RELEASES_DIR, 'TaskYar-Web-2.0-Stable-Production.zip');
const CHECKSUM_PATH = path.join(RELEASES_DIR, 'SHA256SUMS.txt');

// 1. Retrieve GitHub Token securely from git-credential helper
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
  console.log(`Publishing Official Stable GitHub Release [${TAG_NAME}] for ${REPO_OWNER}/${REPO_NAME}`);
  console.log('=================================================================================\n');

  const token = getGitAuthToken();
  console.log('✓ Successfully authenticated via Git Credential Manager.');

  const releaseNotes = `## معرفی تسک‌یار وب ۲.۰ (TaskYar Web — Stable Release)

نسخه نهایی و پایدار **تسک‌یار وب ۲.۰** به عنوان سامانه مدرن، سریع و پیشرو مدیریت وظایف و برنامه‌ریزی روزانه با تقویم شمسی و رابط کاربری فارسی منتشر شد.

### قابلیت‌های برجسته (Key Features)
- 📅 **نماهای بصری و روان:** نمای روز من (My Day)، برد ۷ روز هفته (Week Board)، برد ۳۰ روزه ماه (Month Board) و فیلتر کارهای مهم.
- 🔁 **موتور پیشرفته تکرار کارها (Recurrence Engine):** تنظیم دوره‌های روزانه، هفتگی، ماهانه و سالیانه به همراه مدیریت استثنائات (Skip، Detach).
- 🪜 **سیستم مراحل فرعی (Subtasks):** ثبت سریع با کلید Enter، به‌روزرسانی آنی رابط کاربری (Optimistic UI)، ویرایش درون‌خطی و شمارنده پیشرفت هوشمند.
- 📴 **پشتیبانی کامل از PWA و کارکرد آفلاین:** نصب مستقل به عنوان نرم‌افزار بدون نیاز به استور، سرویس ورکر با کش بهینه، و ذخیره‌سازی محلی وظایف در IndexedDB.
- ⏰ **انتخاب‌گرهای بومی جلالی:** تقویم جلالی با محاسبات دقیق و انتخاب‌گر ۲۴ ساعته زمان با گام‌های ۵ دقیقه‌ای و تبدیل به باتم‌شیت در موبایل.
- ⚡ **کلیدهای میانبر فراگیر:** ناوبری با کلیدهای Alt+1..8، جستجوی سریع Alt+F، ایجاد تسک Alt+N و راهنمای کامل F1.
- 🎨 **تایپوگرافی محلی وزیرمتن:** عدم وابستگی به هیچ CDN خارجی و سرعت بارگذاری فوق‌العاده.
- 🛡️ **سازگاری قطعی با دایرکت‌ادمین و MariaDB:** اجرای امن مایگریشن‌ها با الزام صریح InnoDB حتی روی سرورهای با انجین پیش‌فرض MyISAM.

---

### بسته‌های پیوست جهت دانلود و استقرار (Download Assets)
- **\`TaskYar-Web-2.0-Stable-Production.zip\`**: بسته یکپارچه و کامل شامل هسته لاراول، تمامی وابستگی‌های پروداکشن PHP 8.4 در \`vendor/\`، است‌های کامپایل‌شده فرانت‌اند، فونت‌ها و آیکون‌ها (آماده استخراج و اجرا بدون نیاز به Composer یا npm در هاست).
- **\`SHA256SUMS.txt\`**: هش اعتبارسنجی جهت تضمین سلامت بسته دانلودی.

---

### راهنمای نصب و استقرار
مستندات گام‌به‌گام نصب در دایرکت‌ادمین در مستند [docs/INSTALL_DIRECTADMIN_FA.md](https://github.com/satinbest/taskyar-web/blob/main/docs/INSTALL_DIRECTADMIN_FA.md) در دسترس است.
`;

  // 2. Check if release already exists
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
    console.log(`Release ${TAG_NAME} already exists. Fetching existing release details...`);
    release = JSON.parse(checkRes.data);
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

  // 3. Upload assets
  if (release.upload_url) {
    const existingAssets = release.assets || [];

    // Upload ZIP
    const zipName = path.basename(ZIP_PATH);
    const existingZip = existingAssets.find(a => a.name === zipName);
    if (existingZip) {
      console.log(`Asset ${zipName} already attached to release.`);
    } else {
      await uploadAsset(release.upload_url, ZIP_PATH, 'application/zip', token);
      console.log(`✓ Attached ${zipName}`);
    }

    // Upload Checksums
    const sumName = path.basename(CHECKSUM_PATH);
    const existingSum = existingAssets.find(a => a.name === sumName);
    if (existingSum) {
      console.log(`Asset ${sumName} already attached to release.`);
    } else {
      await uploadAsset(release.upload_url, CHECKSUM_PATH, 'text/plain', token);
      console.log(`✓ Attached ${sumName}`);
    }
  }

  // 4. Update repository metadata (description, website, topics)
  console.log('\nConfiguring repository presentation (description, homepage, topics)...');
  try {
    const repoUpdatePayload = JSON.stringify({
      description: 'سامانه مدرن، سریع و پیشرو مدیریت وظایف روزانه، هفتگی و ماهانه بر پایه تقویم شمسی (PWA)',
      homepage: 'https://taskyar.3aw.ir'
    });

    const repoUpdateOptions = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}`,
      method: 'PATCH',
      headers: {
        'User-Agent': 'TaskYar-Publisher',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    await httpsRequest(repoUpdateOptions, repoUpdatePayload);
    console.log('✓ Updated repository description and homepage.');

    const topicsPayload = JSON.stringify({
      names: ['laravel', 'vue', 'task-manager', 'pwa', 'persian', 'jalali', 'rtl', 'taskyar']
    });

    const topicsOptions = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/topics`,
      method: 'PUT',
      headers: {
        'User-Agent': 'TaskYar-Publisher',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    await httpsRequest(topicsOptions, topicsPayload);
    console.log('✓ Configured repository topics.');
  } catch (err) {
    console.warn('Note: Could not update repository metadata (insufficient permissions or scope):', err.message);
  }

  console.log('\n=================================================================================');
  console.log('🎉 GITHUB RELEASE PUBLISHED SUCCESSFULLY!');
  console.log(`Release URL: ${release.html_url}`);
  console.log(`ZIP Asset:   https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG_NAME}/${path.basename(ZIP_PATH)}`);
  console.log('=================================================================================');
}

publish().catch(err => {
  console.error('\n❌ FAILED TO PUBLISH RELEASE:', err.message);
  process.exit(1);
});
