# TaskYar Web 2.0 — Shared Hosting Deployment Architecture

**Target Environments:** DirectAdmin, cPanel, Plesk, standard Linux shared hosting with Apache/LiteSpeed + PHP 8.2+ + MySQL 8.0/MariaDB.  
**Strict Mandate:** Zero Node.js in production, zero Redis, zero Docker, zero permanent background workers, zero external CDN links.

---

## 1. Directory Structure & Document Root Isolation

In shared hosting environments, placing the entire Laravel application inside `public_html/` is a severe security vulnerability that risks exposing `.env`, database credentials, and framework internals.

### Recommended Shared Hosting Layout:
```text
/home/username/
├── taskyar_core/                 <-- Laravel project core (OUTSIDE web root)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── lang/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   ├── artisan
│   ├── composer.json
│   └── .env                      <-- Sensitive environment configuration
│
└── public_html/                  <-- Public Document Root ONLY
    ├── build/                    <-- Pre-compiled Vite assets (JS, CSS)
    ├── fonts/
    │   └── vazirmatn/            <-- Self-hosted Vazirmatn font files
    ├── icons/                    <-- PWA icons (192, 512, maskable)
    ├── .htaccess                 <-- Security rules and rewrite engine
    ├── favicon.ico
    ├── index.php                 <-- Modified public front controller
    ├── manifest.webmanifest      <-- PWA manifest
    ├── robots.txt
    └── sw.js                     <-- Offline Service Worker
```

### Front Controller Adaptation (`public_html/index.php`)
```php
<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../taskyar_core/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../taskyar_core/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
(require_once __DIR__.'/../taskyar_core/bootstrap/app.php')
    ->handleRequest(Request::capture());
```

---

## 2. Server Requirements & PHP Configuration

- **PHP Version:** **PHP 8.3 or 8.4** (Laravel 13 strictly requires PHP >= 8.3.0. In cPanel or DirectAdmin, select PHP 8.3 or 8.4 via "MultiPHP Manager" / "Select PHP Version". If the host only provides PHP 8.2, Laravel 11 LTS should be targeted instead).
- **SPA & Route Architecture (Phase 3):**
  - Dedicated routes `/login`, `/register`, and `/app` are handled authoritatively by Laravel backend routing before reaching Vue Router.
  - Apache mod_rewrite rule `RewriteRule ^ index.php [L]` ensures direct navigation to `/login`, `/register`, or `/app` resolves to the front controller.
- **Required Extensions:**
  - `BCMath` (used for Jalali calendar computations)
  - `Ctype`
  - `cURL`
  - `DOM`
  - `Fileinfo`
  - `JSON`
  - `Mbstring`
  - `OpenSSL`
  - `PCRE`
  - `PDO` & `pdo_mysql`
  - `Tokenizer`
  - `XML`
- **PHP INI Recommendations:**
  - `memory_limit`: 128M or 256M
  - `upload_max_filesize`: 10M (sufficient for JSON backups)
  - `post_max_size`: 12M
  - `max_execution_time`: 60 seconds
  - `date.timezone`: `Asia/Tehran`

---

## 3. Production Environment Configuration (`.env`)

```env
APP_NAME=TaskYar
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://yourdomain.com

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yourusername_taskyar
DB_USERNAME=yourusername_taskyaruser
DB_PASSWORD=your_secure_password_here

# Zero Redis / Horizon: Database driver for sessions and cache
BROADCAST_CONNECTION=log
CACHE_STORE=database
QUEUE_CONNECTION=sync
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

---

## 4. Apache & LiteSpeed Security Rules (`.htaccess`)

Place the following `.htaccess` inside `public_html/` to enforce HTTPS, protect sensitive files, enable GZIP compression, and route all requests through `index.php`:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Enforce HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>

# Block access to hidden files and sensitive extensions (Apache 2.4 / LiteSpeed)
<FilesMatch "^\.|\.(env|json|lock|log|git|md|yml|yaml)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>

# Enable Browser Caching for Self-Hosted Static Assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

---

## 5. File System Permissions

- All directories: `755` (`chmod 755`)
- All files: `644` (`chmod 644`)
- Laravel writable directories:
  ```bash
  chmod -R 775 taskyar_core/storage
  chmod -R 775 taskyar_core/bootstrap/cache
  ```

---

## 6. Background Scheduling via cPanel / DirectAdmin Cron

Because shared hosting does not permit running persistent daemon processes (such as `php artisan queue:work` or `horizon`), all background tasks (daily rollover processing, scheduled reminders, recurring task generations, backup cleanups) are driven by a single standard cron job.

### Cron Command (Run Every Minute):
```bash
* * * * * cd /home/username/taskyar_core && php artisan schedule:run >> /dev/null 2>&1
```

---

## 7. Build and Deployment Pipeline

### Local Development Workflow:
1. Make code changes in Vue frontend (`resources/js/`) and Laravel backend.
2. Compile and minify production assets locally:
   ```bash
   npm run build
   ```
   This generates pre-hashed production bundles in `public/build/`.
3. Verify that `public/fonts/vazirmatn/` contains all self-hosted font files.
4. Prepare deployment bundle (excluding `node_modules`, `.git`, local tests).
5. Upload `taskyar_core/` to `/home/username/taskyar_core/`.
6. Upload compiled `public/` files into `/home/username/public_html/`.
7. Run migrations via terminal or web installer:
   ```bash
   php artisan migrate --force
   ```
8. Clear and cache configuration:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
