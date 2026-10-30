<template>
  <div class="workspace-layout flex w-full h-full gap-4 relative overflow-hidden" dir="rtl">
    <!-- Mobile Sidebar Backdrop -->
    <div
      v-if="mobileSidebarOpen"
      class="mobile-backdrop"
      @click="mobileSidebarOpen = false"
    ></div>

    <!-- Right Sidebar -->
    <Sidebar
      :class="{ 'mobile-open': mobileSidebarOpen }"
      @export="exportBackup"
      @email-backup="emailModalOpen = true"
      @import="importBackup"
      @close-mobile="mobileSidebarOpen = false"
      @open-shortcuts="shortcutsModalOpen = true"
    />

    <!-- Main Content -->
    <main class="main-content">
      <MainHeader
        @open-shortcuts="shortcutsModalOpen = true"
        @open-about="aboutModalOpen = true"
        @toggle-sidebar="mobileSidebarOpen = !mobileSidebarOpen"
      />

      <!-- Progress bar (hidden on week/month boards and analytics) -->
      <ProgressBar v-if="showProgressBar" />

      <!-- View Switcher -->
      <template v-if="tasksStore.currentView === 'analytics'">
        <AnalyticsView />
      </template>

      <template v-else-if="tasksStore.currentView === 'weekboard'">
        <WeekBoard />
      </template>

      <template v-else-if="tasksStore.currentView === 'monthboard'">
        <MonthBoard />
      </template>

      <template v-else-if="tasksStore.currentView === 'daydetail'">
        <DayDetailView />
      </template>

      <!-- Standard Tasks Scroll Area (My Day, Important, Daily, Weekly, Monthly, All) -->
      <div v-else class="tasks-scroll" id="tasksContainer">
        <!-- Empty State -->
        <div v-if="tasksStore.filteredTasks.length === 0" class="empty-state">
          <AppIcon name="task-square" type="bulk" size="48" color="var(--primary)" />
          <p style="font-weight:600; font-size:15px; margin-top: 12px;">هیچ کاری در این لیست وجود ندارد</p>
          <p style="font-size:12px; margin-top:4px;">از کادر پایین یک برنامه جدید به همراه تاریخ و ساعت اضافه کنید</p>
        </div>

        <!-- Active Tasks -->
        <TaskCard
          v-for="task in tasksStore.activeTasks"
          :key="task.id"
          :task="task"
        />

        <!-- Completed Tasks Section -->
        <template v-if="tasksStore.completedTasks.length > 0">
          <div class="section-divider">
            <span>انجام شده‌ها ({{ toPersianDigits(tasksStore.completedTasks.length) }})</span>
          </div>

          <TaskCard
            v-for="task in tasksStore.completedTasks"
            :key="task.id"
            :task="task"
          />
        </template>
      </div>

      <!-- Add Task Floating Bar (Available on lists & day detail) -->
      <AddTaskBar
        v-if="tasksStore.currentView !== 'weekboard' && tasksStore.currentView !== 'monthboard' && tasksStore.currentView !== 'analytics'"
        ref="addTaskBarRef"
      />
    </main>

    <!-- Left Detail Drawer -->
    <DetailDrawer />

    <!-- Modals -->
    <AlarmModal />
    <ConflictResolutionModal />
    <RecurrenceActionModal
      :is-open="tasksStore.recurrenceActionModalOpen"
      :mode="tasksStore.recurrenceActionMode || 'edit'"
      :occurrence-date="tasksStore.recurrenceActionTask?.occurrence_date || ''"
      @close="tasksStore.recurrenceActionModalOpen = false"
      @select="handleRecurrenceActionSelect"
    />
    <ShortcutsModal :is-open="shortcutsModalOpen" @close="shortcutsModalOpen = false" @execute="handleExecuteShortcut" />
    <AboutModal :is-open="aboutModalOpen" @close="aboutModalOpen = false" />
    <EmailModal :is-open="emailModalOpen" @close="emailModalOpen = false" />
    <CategoryModal :is-open="tasksStore.categoryModalOpen" @close="tasksStore.categoryModalOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { toPersianDigits, getLocalISODate } from '@/utils/jalali';
import { registerShortcuts } from '@/utils/shortcuts';

import Sidebar from '@/components/Sidebar.vue';
import MainHeader from '@/components/MainHeader.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import TaskCard from '@/components/TaskCard.vue';
import AddTaskBar from '@/components/AddTaskBar.vue';
import DetailDrawer from '@/components/DetailDrawer.vue';
import WeekBoard from '@/components/WeekBoard.vue';
import MonthBoard from '@/components/MonthBoard.vue';
import DayDetailView from '@/components/DayDetailView.vue';
import AnalyticsView from '@/views/AnalyticsView.vue';
import AlarmModal from '@/components/AlarmModal.vue';
import ConflictResolutionModal from '@/components/ConflictResolutionModal.vue';
import RecurrenceActionModal from '@/components/RecurrenceActionModal.vue';
import ShortcutsModal from '@/components/ShortcutsModal.vue';
import AboutModal from '@/components/AboutModal.vue';
import EmailModal from '@/components/EmailModal.vue';
import CategoryModal from '@/components/CategoryModal.vue';

import { apiRequest } from '@/api/client';

const authStore = useAuthStore();
const tasksStore = useTasksStore();

const shortcutsModalOpen = ref(false);
const aboutModalOpen = ref(false);
const emailModalOpen = ref(false);
const mobileSidebarOpen = ref(false);
const addTaskBarRef = ref(null);

const showProgressBar = computed(() => {
  return !['weekboard', 'monthboard', 'analytics'].includes(tasksStore.currentView);
});

let alarmInterval = null;
let lastKnownDateISO = getLocalISODate();

function exportBackup() {
  if (authStore.isAuthenticated) {
    window.location.href = '/api/backup/export?v=2';
  } else {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasksStore.tasks, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `taskyar_backup_${getLocalISODate()}.json`;
    a.click();
  }
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      const list = Array.isArray(imported) ? imported : (imported.tasks || []);

      if (!confirm(`آیا از بارگذاری ${list.length} کار از فایل پشتیبان اطمینان دارید؟`)) return;

      if (authStore.isAuthenticated) {
        const res = await apiRequest('/api/backup/import', {
          method: 'POST',
          body: imported
        });
        await tasksStore.fetchTasks();
        await tasksStore.fetchCategories();
        await tasksStore.fetchTags();
        alert(res.message || 'اطلاعات با موفقیت بازیابی شد.');
      } else {
        for (const item of list) {
          await tasksStore.addTask({
            title: item.title,
            period: item.period || 'daily',
            dueDate: item.dueDate || item.due_date || getLocalISODate(),
            due_date: item.dueDate || item.due_date || getLocalISODate(),
            dueTime: item.dueTime || item.due_time || '',
            due_time: item.dueTime || item.due_time || '',
            alarmEnabled: item.alarmEnabled || item.alarm_enabled || false,
            alarm_enabled: item.alarmEnabled || item.alarm_enabled || false,
            important: item.important || false,
            notes: item.notes || '',
            subtasks: item.subtasks || []
          });
        }
      }
    } catch (err) {
      alert('خطا در پردازش فایل پشتیبان: ' + (err.message || 'فرمت نامعتبر'));
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

let unregisterShortcuts = null;

function handleExecuteShortcut(sc) {
  if (sc.id === 'new_task') {
    addTaskBarRef.value?.focus();
  } else if (sc.id === 'search') {
    const searchEl = document.getElementById('searchInput');
    if (searchEl) {
      searchEl.focus();
    } else {
      mobileSidebarOpen.value = true;
      setTimeout(() => document.getElementById('searchInput')?.focus(), 250);
    }
  } else if (sc.view) {
    tasksStore.currentView = sc.view;
    if (mobileSidebarOpen.value) mobileSidebarOpen.value = false;
  } else if (sc.id === 'delete_task') {
    if (tasksStore.selectedTaskId) {
      const task = tasksStore.selectedTask;
      if (task) {
        if (task.is_occurrence) {
          tasksStore.openRecurrenceActionModal(task, 'delete');
        } else if (window.confirm('آیا از حذف این کار اطمینان دارید؟')) {
          tasksStore.deleteTask(task.id);
        }
      }
    }
  } else if (sc.id === 'backup') {
    exportBackup();
  }
}

onMounted(() => {
  if (authStore.user?.id) {
    tasksStore.initOfflineStore(authStore.user.id);
  }
  tasksStore.requestNotificationPermission();
  tasksStore.fetchTasks();
  tasksStore.fetchCategories();
  tasksStore.fetchTags();
  tasksStore.checkAlarms();
  alarmInterval = setInterval(() => {
    tasksStore.checkAlarms();
    const today = getLocalISODate();
    if (today !== lastKnownDateISO) {
      lastKnownDateISO = today;
    }
  }, 10000);

  // Register comprehensive keyboard shortcuts suite
  unregisterShortcuts = registerShortcuts({
    onNewTask: () => {
      addTaskBarRef.value?.focus();
    },
    onSearch: () => {
      const searchEl = document.getElementById('searchInput');
      if (searchEl) {
        searchEl.focus();
      } else if (!mobileSidebarOpen.value) {
        mobileSidebarOpen.value = true;
        setTimeout(() => document.getElementById('searchInput')?.focus(), 250);
      }
    },
    onSwitchView: (viewName) => {
      tasksStore.currentView = viewName;
      if (mobileSidebarOpen.value) mobileSidebarOpen.value = false;
    },
    onDeleteSelectedTask: async () => {
      if (tasksStore.selectedTaskId) {
        const task = tasksStore.selectedTask;
        if (task) {
          if (task.is_occurrence) {
            tasksStore.openRecurrenceActionModal(task, 'delete');
          } else {
            if (window.confirm('آیا از حذف این کار اطمینان دارید؟')) {
              await tasksStore.deleteTask(task.id);
            }
          }
        }
      }
    },
    onToggleHelp: () => {
      shortcutsModalOpen.value = !shortcutsModalOpen.value;
    },
    onClose: () => {
      if (mobileSidebarOpen.value) {
        mobileSidebarOpen.value = false;
        return;
      }
      if (tasksStore.selectedTaskId) {
        tasksStore.selectedTaskId = null;
        return;
      }
      if (tasksStore.recurrenceActionModalOpen) {
        tasksStore.recurrenceActionModalOpen = false;
        return;
      }
      if (tasksStore.recurrenceModalOpen) {
        tasksStore.recurrenceModalOpen = false;
        return;
      }
      if (shortcutsModalOpen.value) {
        shortcutsModalOpen.value = false;
        return;
      }
      if (aboutModalOpen.value) {
        aboutModalOpen.value = false;
        return;
      }
      if (emailModalOpen.value) {
        emailModalOpen.value = false;
        return;
      }
      if (tasksStore.categoryModalOpen) {
        tasksStore.categoryModalOpen = false;
        return;
      }
    },
    onBackup: () => {
      exportBackup();
    }
  });

  // Handle URL query parameters from PWA manifest launcher shortcuts
  try {
    const route = useRoute();
    const validViews = ['myday', 'weekboard', 'monthboard', 'important', 'daily', 'weekly', 'monthly', 'all', 'analytics'];
    if (route.query.view && validViews.includes(route.query.view)) {
      tasksStore.currentView = route.query.view;
    }
    if (route.query.action === 'new_task') {
      setTimeout(() => {
        addTaskBarRef.value?.focus();
      }, 300);
    }
  } catch (err) {
    // Route query parsing fallback
  }
});

async function handleRecurrenceActionSelect(scope) {
  const target = tasksStore.recurrenceActionTask;
  const mode = tasksStore.recurrenceActionMode || 'edit';
  if (!target) return;

  const parentId = target.parent_id || target.id;
  const occurrenceDate = target.occurrence_date || target.dueDate;

  if (mode === 'delete') {
    if (scope === 'this') {
      await tasksStore.skipOccurrence(parentId, occurrenceDate);
    } else if (scope === 'all') {
      await tasksStore.deleteTask(parentId);
    }
  }
}

onUnmounted(() => {
  if (alarmInterval) clearInterval(alarmInterval);
  if (unregisterShortcuts) unregisterShortcuts();
});
</script>

<style scoped>
.workspace-layout {
  height: 100%;
}

.mobile-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 1040;
  }
}
</style>
