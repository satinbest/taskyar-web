<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>تسک‌یار - مدیریت هوشمند کارها</title>
    <!-- PWA & Mobile Web Standards -->
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="theme-color" content="#6D28D9">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="تسک‌یار">
    <link rel="apple-touch-icon" href="/pwa-icons/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/pwa-icons/icon-192.png">
    <link rel="icon" type="image/svg+xml" href="/pwa-icons/icon.svg">
    <!-- Self-hosted Vazirmatn font: zero external CDN -->
    <link rel="stylesheet" href="/fonts/vazirmatn/vazirmatn.css">
    <script>
        window.__INITIAL_USER__ = {!! json_encode(auth()->user()) !!};
        window.__CSRF_TOKEN__ = "{{ csrf_token() }}";
        // Immediate Anti-FOUC Theme & Dark Mode Initialization
        (function() {
            try {
                var userTheme = window.__INITIAL_USER__ && window.__INITIAL_USER__.theme;
                var savedTheme = userTheme || localStorage.getItem('taskyar_theme') || 'default';
                if (savedTheme && savedTheme !== 'default') {
                    document.documentElement.setAttribute('data-theme', savedTheme);
                }
                var savedDark = localStorage.getItem('taskyar_dark_mode');
                var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var isDark = savedDark !== null ? (savedDark === 'true') : systemDark;
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-mode', 'dark');
                }
            } catch(e) {}
        })();
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
