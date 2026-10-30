# TaskYar Web 2.0 — PWA Architecture Specification

**Status:** Production Standard (Phase 5+)  
**Service Worker Scope:** `/`  
**Manifest:** `/manifest.webmanifest`  
**Offline Engine:** Progressive Web App Service Worker (`/sw.js`) + Account-Scoped IndexedDB Layer

---

## 1. Architectural Overview

TaskYar Web 2.0 implements an installable, offline-resilient Progressive Web App (PWA) tailored to the Persian locale and Jalali calendar system.

### Principles:
1. **Self-Contained & Zero CDN:** All PWA icons (192px, 512px, maskable, apple-touch-icon, svg), web fonts (Vazirmatn), and application shell scripts are served strictly from the local origin.
2. **Strict Privacy Boundary:** The Service Worker cache handles **only** static application shell assets, CSS, JS, fonts, and icons. **Private user data from `/api/*` is strictly excluded from public service worker caches** to prevent multi-user leakage and cache poisoning on shared computers. User data persistence is handled in account-scoped IndexedDB namespaces (`TaskYarDB_{userId}`).
3. **Graceful Degradation:** When offline, the Service Worker intercepts navigation requests and returns the cached single-page application shell (`/app`), enabling the Vue client and Pinia stores to immediately initialize from local IndexedDB data.
4. **Lifecycle & Safe Activation:** New Service Worker versions install in the background. When an update is detected, an accessible Persian notification banner (`PwaBanner.vue`) appears, allowing the user to seamlessly activate the update via `SKIP_WAITING` without abrupt page disruption.

---

## 2. Web App Manifest Specification

Located at `/manifest.webmanifest` and linked from `resources/views/app.blade.php`:

```json
{
  "name": "تسک‌یار وب — مدیریت هوشمند کارها",
  "short_name": "تسک‌یار",
  "description": "سامانه مدرن مدیریت وظایف روزانه، هفتگی و ماهانه منطبق بر تقویم جلالی با قابلیت کارکرد آفلاین و یادآورهای هوشمند",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#0F172A",
  "theme_color": "#6D28D9",
  "dir": "rtl",
  "lang": "fa-IR",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

---

## 3. Caching Strategy Matrix

| Resource Type | Request Pattern | Strategy | Cache Target | Cache Busting / Expiration |
|---|---|---|---|---|
| **App Shell (HTML)** | `mode === 'navigate'` (`/app`, `/login`, `/register`) | **Network-First** with cached shell fallback | `taskyar-shell-v*` | Dynamic update on navigation |
| **Vite JS/CSS Bundles** | `/build/assets/*` | **Stale-While-Revalidate** / Cache-First | `taskyar-static-v*` | Content-hash fingerprinting |
| **Web Fonts** | `/fonts/vazirmatn/*` | **Cache-First** | `taskyar-static-v*` | Versioned with CACHE_VERSION |
| **PWA Icons & Favicon** | `/icons/*`, `favicon.ico` | **Cache-First** | `taskyar-static-v*` | Versioned with CACHE_VERSION |
| **Private Data APIs** | `/api/tasks`, `/api/categories`, etc. | **Network Only** (Pass-through) | **IndexedDB** (`TaskYarDB_{userId}`) | **Never stored in SW Cache** |

---

## 4. Installability & Browser Constraints

- **Supported Desktop & Mobile Browsers:** Google Chrome, Microsoft Edge, Brave, Opera, Samsung Internet, and Android WebViews support native installation through the `beforeinstallprompt` event and manifest criteria.
- **Safari / iOS Support:** Safari on iOS does not support `beforeinstallprompt`. Installation is performed manually via the "Add to Home Screen" (اشتراک‌گذاری -> افزودن به صفحه اصلی) action, supported by `<meta name="apple-mobile-web-app-capable" content="yes">` and `/icons/apple-touch-icon.png`.
- **Honest Limitations:** PWA installation requires HTTPS (or `localhost`/`127.0.0.1` during development). Browsers running in private/incognito mode or certain embedded in-app browsers do not support PWA installation.
