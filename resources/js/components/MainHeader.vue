<template>
  <header class="main-header">
    <div class="flex items-center gap-3">
      <!-- Mobile Sidebar Toggle -->
      <button
        class="mobile-hamburger-btn"
        @click="$emit('toggle-sidebar')"
        title="منوی برنامه‌ها"
        aria-label="منوی برنامه‌ها"
      >
        <AppIcon name="task-square" size="20" />
      </button>

      <div class="header-title">
        <h2 id="viewTitle">{{ viewTitleText }}</h2>
        <div class="header-date" id="persianDate">{{ currentPersianDate }}</div>
      </div>
    </div>

    <div class="header-controls">
      <div class="header-quick-menu" title="منوی دسترسی سریع">
        <!-- Online/Offline Sync Status -->
        <button
          class="btn-header-action sync-status-btn"
          :class="{ 'is-offline': !tasksStore.isOnline, 'is-syncing': tasksStore.isSyncing, 'has-pending': tasksStore.pendingSyncCount > 0 }"
          @click="tasksStore.syncWithServer()"
          :title="syncStatusTooltip"
        >
          <AppIcon :name="tasksStore.isOnline ? (tasksStore.isSyncing ? 'refresh-circle' : 'cloud-connection') : 'cloud-cross'" size="18" />
          <span class="sync-status-text">{{ syncStatusText }}</span>
        </button>

        <!-- Dark Mode Toggle -->
        <button
          class="btn-header-action dark-mode-toggle"
          @click="authStore.toggleDarkMode()"
          :title="authStore.darkMode ? 'تغییر به حالت روز' : 'تغییر به حالت شب'"
        >
          <AppIcon :name="authStore.darkMode ? 'sun' : 'moon'" size="18" />
          <span>{{ authStore.darkMode ? 'روز' : 'شب' }}</span>
        </button>

        <button
          class="btn-header-action"
          @click="$emit('open-shortcuts')"
          title="راهنمای کلیدهای میانبر (Ctrl+/)"
        >
          <AppIcon name="command" size="18" />
          <span>میانبرها</span>
        </button>

        <button
          class="btn-header-action"
          @click="$emit('open-about')"
          title="درباره تسک‌یار"
        >
          <AppIcon name="info-circle" size="18" />
          <span>درباره</span>
        </button>
      </div>

      <div class="theme-switcher" title="تغییر تم رنگی">
        <div
          :class="['theme-dot', authStore.theme === 'default' ? 'active' : '']"
          style="background: linear-gradient(135deg, #6D28D9, #FCE7F3);"
          @click="authStore.setTheme('default')"
          title="تم بنفش (پیش‌فرض)"
        ></div>
        <div
          :class="['theme-dot', authStore.theme === 'ocean' ? 'active' : '']"
          style="background: linear-gradient(135deg, #0284C7, #DCFCE7);"
          @click="authStore.setTheme('ocean')"
          title="تم اقیانوس"
        ></div>
        <div
          :class="['theme-dot', authStore.theme === 'sunset' ? 'active' : '']"
          style="background: linear-gradient(135deg, #E11D48, #FEF3C7);"
          @click="authStore.setTheme('sunset')"
          title="تم غروب"
        ></div>
        <div
          :class="['theme-dot', authStore.theme === 'emerald' ? 'active' : '']"
          style="background: linear-gradient(135deg, #059669, #E0F2FE);"
          @click="authStore.setTheme('emerald')"
          title="تم زمرد"
        ></div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { formatJalaliLong, toPersianDigits } from '@/utils/jalali';

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

const authStore = useAuthStore();
const tasksStore = useTasksStore();

defineEmits(['open-shortcuts', 'open-about', 'toggle-sidebar']);

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
</style>
