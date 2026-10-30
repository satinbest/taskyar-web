<template>
  <header class="main-header">
    <div class="header-brand-group flex items-center gap-1.5 sm:gap-3 min-w-0 max-w-[95px] sm:max-w-none">
      <!-- Mobile Sidebar Toggle -->
      <button
        class="mobile-hamburger-btn shrink-0"
        @click="$emit('toggle-sidebar')"
        title="منوی برنامه‌ها"
        aria-label="منوی برنامه‌ها"
      >
        <AppIcon name="task-square" size="20" />
      </button>

      <div class="header-title min-w-0">
        <h2 id="viewTitle" class="truncate">{{ viewTitleText }}</h2>
        <div class="header-date truncate" id="persianDate">{{ currentPersianDate }}</div>
      </div>
    </div>

    <div class="header-controls shrink-0">
      <div class="header-quick-menu" title="منوی دسترسی سریع">
        <!-- Online/Offline Sync Status -->
        <button
          class="btn-header-action sync-status-btn"
          :class="{ 'is-offline': !tasksStore.isOnline, 'is-syncing': tasksStore.isSyncing, 'has-pending': tasksStore.pendingSyncCount > 0 }"
          @click="tasksStore.syncWithServer()"
          :title="syncStatusTooltip"
          aria-label="وضعیت همگام‌سازی"
        >
          <AppIcon :name="tasksStore.isOnline ? (tasksStore.isSyncing ? 'refresh-circle' : 'cloud-connection') : 'cloud-cross'" size="18" />
          <span class="sync-status-text">{{ syncStatusText }}</span>
        </button>

        <!-- Dark Mode Toggle -->
        <button
          class="btn-header-action dark-mode-toggle"
          @click="authStore.toggleDarkMode()"
          :title="authStore.darkMode ? 'تغییر به حالت روز' : 'تغییر به حالت شب'"
          aria-label="تغییر حالت شب و روز"
        >
          <AppIcon :name="authStore.darkMode ? 'sun' : 'moon'" size="18" />
          <span>{{ authStore.darkMode ? 'روز' : 'شب' }}</span>
        </button>

        <button
          class="btn-header-action shortcuts-btn"
          @click="$emit('open-shortcuts')"
          title="راهنمای کلیدهای میانبر (Ctrl+/)"
          aria-label="راهنمای کلیدهای میانبر"
        >
          <AppIcon name="command" size="18" />
          <span>میانبرها</span>
        </button>

        <button
          class="btn-header-action about-btn"
          @click="$emit('open-about')"
          title="درباره تسک‌یار"
          aria-label="درباره تسک‌یار"
        >
          <AppIcon name="info-circle" size="18" />
          <span>درباره</span>
        </button>
      </div>

      <div class="theme-switcher-container relative" ref="themeContainerRef">
        <div class="theme-switcher" title="تغییر تم رنگی">
          <button
            v-for="t in themeList"
            :key="t.id"
            type="button"
            :class="[
              'theme-dot',
              authStore.theme === t.id ? 'active' : '',
              authStore.theme !== t.id ? 'mobile-hidden-dot' : ''
            ]"
            :style="{ background: t.bg }"
            @click="handleThemeClick(t.id)"
            :title="t.title"
            :aria-label="t.title"
          ></button>
        </div>

        <!-- Mobile Theme Dropdown Popover -->
        <div
          v-if="themeMenuOpen"
          class="theme-mobile-popover"
          @click.stop
        >
          <div class="theme-popover-header">
            <span>انتخاب تم رنگی</span>
            <button type="button" class="theme-popover-close" @click="themeMenuOpen = false">✕</button>
          </div>
          <div class="theme-popover-list">
            <button
              v-for="t in themeList"
              :key="'pop-' + t.id"
              type="button"
              :class="['theme-popover-item', authStore.theme === t.id ? 'active' : '']"
              @click="selectTheme(t.id)"
            >
              <span class="theme-dot" :style="{ background: t.bg }"></span>
              <span class="theme-popover-label">{{ t.name }}</span>
              <span v-if="authStore.theme === t.id" class="theme-check">✓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { formatJalaliLong, toPersianDigits } from '@/utils/jalali';

const authStore = useAuthStore();
const tasksStore = useTasksStore();

defineEmits(['open-shortcuts', 'open-about', 'toggle-sidebar']);

const themeContainerRef = ref(null);
const themeMenuOpen = ref(false);

const themeList = [
  { id: 'default', name: 'بنفش', bg: 'linear-gradient(135deg, #6D28D9, #FCE7F3)', title: 'تم بنفش (پیش‌فرض)' },
  { id: 'ocean', name: 'اقیانوس', bg: 'linear-gradient(135deg, #0284C7, #DCFCE7)', title: 'تم اقیانوس' },
  { id: 'sunset', name: 'غروب', bg: 'linear-gradient(135deg, #E11D48, #FEF3C7)', title: 'تم غروب' },
  { id: 'emerald', name: 'زمرد', bg: 'linear-gradient(135deg, #059669, #E0F2FE)', title: 'تم زمرد' }
];

function handleThemeClick(themeId) {
  if (typeof window !== 'undefined' && window.innerWidth <= 640) {
    themeMenuOpen.value = !themeMenuOpen.value;
  } else {
    authStore.setTheme(themeId);
  }
}

function selectTheme(themeId) {
  authStore.setTheme(themeId);
  themeMenuOpen.value = false;
}

function handleDocumentClick(e) {
  if (themeMenuOpen.value && themeContainerRef.value && !themeContainerRef.value.contains(e.target)) {
    themeMenuOpen.value = false;
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && themeMenuOpen.value) {
    themeMenuOpen.value = false;
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleDocumentClick);
    window.removeEventListener('keydown', handleKeyDown);
  }
});

const syncStatusText = computed(() => {
  if (tasksStore.isOnline === false) return 'آفلاین';
  if (tasksStore.isSyncing) return 'همگام‌سازی...';
  if ((tasksStore.pendingSyncCount || 0) > 0) return `${toPersianDigits(tasksStore.pendingSyncCount)} تغییر`;
  return 'همگام';
});

const syncStatusTooltip = computed(() => {
  if (tasksStore.isOnline === false) return 'در حالت آفلاین کار می‌کنید. تغییرات به صورت محلی ذخیره شده و پس از اتصال همگام می‌شوند.';
  if (tasksStore.isSyncing) return 'در حال ارسال و دریافت تغییرات با سرور...';
  if ((tasksStore.pendingSyncCount || 0) > 0) return `${toPersianDigits(tasksStore.pendingSyncCount)} تغییر محلی آماده ارسال. کلیک برای همگام‌سازی دستی.`;
  return 'همه اطلاعات با سرور همگام است. کلیک برای بروزرسانی.';
});

const viewTitles = {
  myday: 'روز من',
  weekboard: 'برد ۷ روز هفته',
  monthboard: 'برد ۳۰ روزه ماه',
  daydetail: 'تسک‌های روز',
  important: 'مهم و ستاره‌دار',
  daily: 'کارهای روزانه',
  weekly: 'برنامه‌های هفتگی',
  monthly: 'اهداف ماهیانه',
  all: 'همه وظایف'
};

const viewTitleText = computed(() => {
  if (tasksStore.currentView === 'daydetail' && tasksStore.selectedDateISO) {
    return `تسک‌های ${formatJalaliLong(tasksStore.selectedDateISO, true)}`;
  }
  return viewTitles[tasksStore.currentView] || 'تسک‌یار';
});

const currentPersianDate = computed(() => {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  } catch (e) {
    return '';
  }
});
</script>

<style scoped>
.mobile-hamburger-btn {
  display: none;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px;
  color: var(--text-main);
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .mobile-hamburger-btn {
    display: inline-flex;
  }
}

.theme-switcher-container {
  display: inline-flex;
  align-items: center;
}

@media (max-width: 640px) {
  .mobile-hidden-dot {
    display: none !important;
  }
  
  .theme-switcher {
    padding: 3px !important;
    gap: 0 !important;
    cursor: pointer;
  }
}

@media (max-width: 480px) {
  .header-brand-group {
    max-width: 135px !important;
    flex-shrink: 1 !important;
  }
}

@media (max-width: 360px) {
  .main-header {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    padding: 6px 6px !important;
    gap: 2px !important;
  }
  .header-brand-group {
    max-width: 85px !important;
    flex: 0 1 auto !important;
  }
  .header-date {
    display: none !important;
  }
  .header-title h2 {
    font-size: 12.5px !important;
  }
  .mobile-hamburger-btn {
    padding: 3px !important;
  }
  .header-controls {
    gap: 2px !important;
  }
  .header-quick-menu {
    padding: 1px 2px !important;
    gap: 1px !important;
  }
  .btn-header-action {
    padding: 3px !important;
    min-width: 24px !important;
    min-height: 24px !important;
  }
  .theme-dot {
    width: 15px !important;
    height: 15px !important;
  }
}

.theme-mobile-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 170px;
  background: var(--surface-solid, #ffffff);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 10050;
  animation: themeFadeIn 0.15s ease-out;
}

[data-mode="dark"] .theme-mobile-popover,
.dark .theme-mobile-popover {
  background: #0f172a;
  border-color: rgba(51, 65, 85, 0.8);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}

@keyframes themeFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.theme-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px 6px;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.theme-popover-close {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
}

.theme-popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.theme-popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  text-align: right;
  width: 100%;
  transition: all 0.15s;
}

.theme-popover-item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

.theme-popover-item.active {
  background: var(--primary-light, #ede9fe);
  border-color: var(--primary);
  color: var(--primary);
}

.theme-popover-label {
  flex: 1;
}

.theme-check {
  font-size: 11px;
  color: var(--primary);
  font-weight: bold;
}
</style>
