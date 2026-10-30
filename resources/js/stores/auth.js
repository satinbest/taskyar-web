import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiRequest } from '@/api/client';
import { closeUserDb, openUserDb } from '@/utils/offlineDb';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(window.__INITIAL_USER__ || null);
    const theme = ref(user.value?.theme || localStorage.getItem('taskyar_theme') || 'default');
    const darkMode = ref(localStorage.getItem('taskyar_dark_mode') === 'true');
    const authModalOpen = ref(!user.value);
    const authModalTab = ref('login'); // 'login' or 'register'

    const isAuthenticated = computed(() => Boolean(user.value));

    function applyTheme(themeName) {
        theme.value = themeName;
        localStorage.setItem('taskyar_theme', themeName);
        if (themeName === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', themeName);
        }
    }

    function applyDarkMode(isDark) {
        darkMode.value = isDark;
        localStorage.setItem('taskyar_dark_mode', String(isDark));
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-mode', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.removeAttribute('data-mode');
        }
    }

    function toggleDarkMode() {
        applyDarkMode(!darkMode.value);
    }

    async function setTheme(themeName) {
        applyTheme(themeName);
        if (isAuthenticated.value) {
            try {
                await apiRequest('/api/auth/theme', {
                    method: 'PATCH',
                    body: { theme: themeName }
                });
            } catch (err) {
                console.error('Failed to update theme on server:', err);
            }
        }
    }

    async function login(email, password) {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        user.value = data.user;
        if (typeof window !== 'undefined') {
            window.__INITIAL_USER__ = data.user;
        }
        if (data.user?.id) {
            await openUserDb(data.user.id);
        }
        if (data.user?.theme) {
            applyTheme(data.user.theme);
        }
        authModalOpen.value = false;
        return data;
    }

    async function register(name, email, password) {
        const data = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: { name, email, password }
        });
        user.value = data.user;
        if (typeof window !== 'undefined') {
            window.__INITIAL_USER__ = data.user;
        }
        if (data.user?.id) {
            await openUserDb(data.user.id);
        }
        if (data.user?.theme) {
            applyTheme(data.user.theme);
        }
        authModalOpen.value = false;
        return data;
    }

    async function logout() {
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch (err) {
            console.warn('Logout API error:', err);
        }
        user.value = null;
        if (typeof window !== 'undefined') {
            window.__INITIAL_USER__ = null;
        }
        authModalOpen.value = true;
        authModalTab.value = 'login';
        closeUserDb();
    }

    async function checkAuth() {
        try {
            const data = await apiRequest('/api/auth/me');
            user.value = data.user;
            if (typeof window !== 'undefined') {
                window.__INITIAL_USER__ = data.user;
            }
            if (data.user?.id) {
                await openUserDb(data.user.id);
            }
            if (data.user?.theme) {
                applyTheme(data.user.theme);
            }
        } catch (err) {
            user.value = null;
        }
    }

    function openAuthModal(tab = 'login') {
        authModalTab.value = tab;
        authModalOpen.value = true;
    }

    function closeAuthModal() {
        if (isAuthenticated.value) {
            authModalOpen.value = false;
        }
    }

    // Initialize theme & dark mode on load
    applyTheme(theme.value);
    applyDarkMode(darkMode.value);

    if (typeof window !== 'undefined') {
        window.addEventListener('taskyar:unauthorized', () => {
            if (user.value) {
                user.value = null;
                window.__INITIAL_USER__ = null;
                openAuthModal('login');
                closeUserDb();
            }
        });
    }

    return {
        user,
        theme,
        darkMode,
        isAuthenticated,
        authModalOpen,
        authModalTab,
        login,
        register,
        logout,
        checkAuth,
        setTheme,
        applyTheme,
        applyDarkMode,
        toggleDarkMode,
        openAuthModal,
        closeAuthModal
    };
});
