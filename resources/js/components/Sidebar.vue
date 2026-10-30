<template>
  <aside class="sidebar" dir="rtl">
    <div class="profile-area">
      <div class="avatar" :title="authStore.user?.name || 'تسک‌یار'">
        {{ (authStore.user?.name ? authStore.user.name.charAt(0) : 'ت') }}
      </div>
      <div class="app-title flex-1">
        <h1>تسک‌یار وب</h1>
        <p v-if="authStore.user">{{ authStore.user.name }}</p>
        <p v-else>مدیریت هوشمند کارها و زمان</p>
      </div>
      <button
        class="text-xs text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
        @click="handleLogout"
        title="خروج از حساب کاربری"
        aria-label="خروج از حساب کاربری"
      >
        <AppIcon name="logout-01" size="16" />
      </button>

      <!-- Mobile Close Drawer Button -->
      <button class="mobile-close-sidebar-btn" @click="$emit('close-mobile')" title="بستن منو" aria-label="بستن منو">
        <AppIcon name="close-circle" size="18" />
      </button>
    </div>

    <div class="search-box">
      <input
        type="text"
        id="searchInput"
        v-model="tasksStore.searchQuery"
        placeholder="جستجوی کارها..."
      />
      <AppIcon name="search-normal" size="18" />
    </div>

    <!-- Active Category / Tag Filter Banner -->
    <div
      v-if="tasksStore.selectedCategoryFilter !== null || tasksStore.selectedTagFilter !== null"
      class="active-filter-banner"
    >
      <span class="text-xs font-semibold">فیلتر فعال:</span>
      <span v-if="activeCategoryName" class="filter-pill">
        {{ activeCategoryName }}
        <button @click="tasksStore.selectedCategoryFilter = null">✕</button>
      </span>
      <span v-if="activeTagName" class="filter-pill">
        #{{ activeTagName }}
        <button @click="tasksStore.selectedTagFilter = null">✕</button>
      </span>
      <button class="clear-filters-btn" @click="clearAllFilters">حذف فیلترها</button>
    </div>

    <ul class="nav-list">
      <li
        :class="['nav-item', tasksStore.currentView === 'myday' ? 'active' : '']"
        @click="switchView('myday')"
      >
        <div class="nav-item-right">
          <AppIcon name="sun" :type="tasksStore.currentView === 'myday' ? 'bulk' : 'linear'" size="20" />
          <span>روز من</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.myday) }}</span>
      </li>

      <li
        :class="['nav-item', tasksStore.currentView === 'weekboard' ? 'active' : '']"
        @click="switchView('weekboard')"
      >
        <div class="nav-item-right">
          <AppIcon name="calendar" :type="tasksStore.currentView === 'weekboard' ? 'bulk' : 'linear'" size="20" />
          <span>برد ۷ روز هفته</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.weekboard) }}</span>
      </li>

      <li
        :class="['nav-item', tasksStore.currentView === 'monthboard' ? 'active' : '']"
        @click="switchView('monthboard')"
      >
        <div class="nav-item-right">
          <AppIcon name="calendar-2" :type="tasksStore.currentView === 'monthboard' ? 'bulk' : 'linear'" size="20" />
          <span>برد ۳۰ روزه ماه</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.monthboard) }}</span>
      </li>

      <li
        :class="['nav-item', tasksStore.currentView === 'important' ? 'active' : '']"
        @click="switchView('important')"
      >
        <div class="nav-item-right">
          <AppIcon name="star" :type="tasksStore.currentView === 'important' ? 'bulk' : 'linear'" size="20" />
          <span>مهم و ستاره‌دار</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.important) }}</span>
      </li>

      <!-- Personal Analytics Navigation Item -->
      <li
        :class="['nav-item', tasksStore.currentView === 'analytics' ? 'active' : '']"
        @click="switchView('analytics')"
      >
        <div class="nav-item-right">
          <AppIcon name="status-up" :type="tasksStore.currentView === 'analytics' ? 'bulk' : 'linear'" size="20" />
          <span>آمار و پیشرفت</span>
        </div>
      </li>

      <!-- Install Web App Option (when not standalone) -->
      <li
        v-if="!isStandalone"
        class="nav-item install-pwa-nav"
        @click="handleInstallClick"
        title="نصب وب‌اپلیکیشن تسک‌یار"
      >
        <div class="nav-item-right">
          <AppIcon name="document-download" type="bulk" size="20" color="var(--primary)" />
          <span style="color: var(--primary); font-weight: 700;">نصب برنامه (PWA)</span>
        </div>
        <span class="badge" style="background: var(--primary); color: white;">+</span>
      </li>

      <!-- Shortcuts Guide (F1) -->
      <li
        class="nav-item"
        @click="handleShortcutsClick"
        title="راهنمای کلیدهای میانبر و ژست‌های لمسی (F1)"
      >
        <div class="nav-item-right">
          <AppIcon name="keyboard" size="20" />
          <span>کلیدهای میانبر</span>
        </div>
        <span class="badge" style="background: var(--bg-hover); color: var(--text-muted); font-size: 11px;">F1</span>
      </li>

      <div class="nav-section-title">افق زمانی برنامه‌ها</div>

      <li
        :class="['nav-item', tasksStore.currentView === 'daily' ? 'active' : '']"
        @click="switchView('daily')"
      >
        <div class="nav-item-right">
          <AppIcon name="calendar-1" :type="tasksStore.currentView === 'daily' ? 'bulk' : 'linear'" size="20" />
          <span>کارهای روزانه</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.daily) }}</span>
      </li>

      <li
        :class="['nav-item', tasksStore.currentView === 'weekly' ? 'active' : '']"
        @click="switchView('weekly')"
      >
        <div class="nav-item-right">
          <AppIcon name="clock" :type="tasksStore.currentView === 'weekly' ? 'bulk' : 'linear'" size="20" />
          <span>برنامه‌های هفتگی</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.weekly) }}</span>
      </li>

      <li
        :class="['nav-item', tasksStore.currentView === 'monthly' ? 'active' : '']"
        @click="switchView('monthly')"
      >
        <div class="nav-item-right">
          <AppIcon name="calendar-tick" :type="tasksStore.currentView === 'monthly' ? 'bulk' : 'linear'" size="20" />
          <span>اهداف ماهیانه</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.monthly) }}</span>
      </li>

      <li
        :class="['nav-item', tasksStore.currentView === 'all' ? 'active' : '']"
        @click="switchView('all')"
      >
        <div class="nav-item-right">
          <AppIcon name="task-square" :type="tasksStore.currentView === 'all' ? 'bulk' : 'linear'" size="20" />
          <span>همه وظایف</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.badges.all) }}</span>
      </li>

      <!-- Categories Section in Sidebar -->
      <div class="flex items-center justify-between px-3 mt-4 mb-2">
        <span class="nav-section-title p-0 m-0">دسته‌بندی‌ها</span>
        <button
          type="button"
          class="text-xs text-primary font-bold hover:underline"
          @click="tasksStore.categoryModalOpen = true"
          title="مدیریت دسته‌ها"
        >
          + جدید
        </button>
      </div>

      <li
        v-for="cat in tasksStore.categories"
        :key="cat.id"
        :class="['nav-item cat-nav-item', tasksStore.selectedCategoryFilter === cat.id ? 'active' : '']"
        @click="filterByCategory(cat.id)"
      >
        <div class="nav-item-right">
          <span
            class="cat-color-dot"
            :style="{ backgroundColor: cat.color || '#3b82f6' }"
          ></span>
          <span>{{ cat.name }}</span>
        </div>
        <span class="badge">{{ toPersianDigits(tasksStore.categoryCounts[cat.id] || 0) }}</span>
      </li>
    </ul>

    <div class="sidebar-footer">
      <button class="btn-icon-text" @click="$emit('export')" title="دانلود فایل پشتیبان">
        <AppIcon name="document-download" size="16" />
        ذخیره فایل
      </button>
      <button class="btn-icon-text" @click="$emit('email-backup')" title="ارسال پشتیبان به ایمیل">
        <AppIcon name="notification" size="16" />
        بکاپ ایمیل
      </button>
      <label class="btn-icon-text cursor-pointer" title="بازگردانی اطلاعات از فایل">
        <AppIcon name="document-upload" size="16" />
        بازیابی
        <input type="file" hidden accept=".json" @change="$emit('import', $event)">
      </label>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { toPersianDigits } from '@/utils/jalali';
import { isStandalone, openInstallDialog } from '@/pwa';

const router = useRouter();
const authStore = useAuthStore();
const tasksStore = useTasksStore();

const emit = defineEmits(['export', 'email-backup', 'import', 'close-mobile', 'open-shortcuts']);

const activeCategoryName = computed(() => {
  if (tasksStore.selectedCategoryFilter === null) return '';
  if (tasksStore.selectedCategoryFilter === 'uncategorized') return 'بدون دسته';
  const c = tasksStore.categories.find(cat => cat.id === tasksStore.selectedCategoryFilter);
  return c ? c.name : '';
});

const activeTagName = computed(() => {
  if (tasksStore.selectedTagFilter === null) return '';
  const t = tasksStore.tags.find(tag => tag.id === tasksStore.selectedTagFilter);
  return t ? t.name : '';
});

function switchView(view) {
  tasksStore.currentView = view;
  emit('close-mobile');
}

function handleInstallClick() {
  openInstallDialog();
  emit('close-mobile');
}

function handleShortcutsClick() {
  emit('open-shortcuts');
  emit('close-mobile');
}

function filterByCategory(catId) {
  if (tasksStore.selectedCategoryFilter === catId) {
    tasksStore.selectedCategoryFilter = null;
  } else {
    tasksStore.selectedCategoryFilter = catId;
  }
  emit('close-mobile');
}

function clearAllFilters() {
  tasksStore.selectedCategoryFilter = null;
  tasksStore.selectedTagFilter = null;
}

async function handleLogout() {
  if (tasksStore.pendingSyncCount > 0) {
    const confirmLogout = window.confirm('شما ' + tasksStore.pendingSyncCount + ' تغییر همگام‌سازی‌نشده دارید که روی این دستگاه ذخیره شده است. با خروج از حساب، این تغییرات تا ورود مجدد شما به همین مرورگر همگام نخواهند شد. آیا مایل به خروج هستید؟');
    if (!confirmLogout) return;
  }
  await authStore.logout();
  tasksStore.reset();
  router.push('/login');
}
</script>

<style scoped>
.mobile-close-sidebar-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.active-filter-banner {
  margin: 6px 12px;
  padding: 6px 10px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px dashed rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--primary);
  color: #fff;
}

.filter-pill button {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0;
  font-size: 10px;
}

.clear-filters-btn {
  background: none;
  border: none;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  text-decoration: underline;
  margin-right: auto;
}

.cat-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-nav-item {
  font-size: 12.5px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    right: -300px;
    bottom: 0;
    width: 280px;
    height: 100vh;
    z-index: 1050;
    border-radius: 0;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar.mobile-open {
    right: 0;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
  }

  .mobile-close-sidebar-btn {
    display: block;
  }
}
</style>
