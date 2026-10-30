<template>
  <div class="day-detail-container flex flex-col flex-1 min-h-0">
    <!-- Day Detail Navigation Bar -->
    <div class="day-detail-bar">
      <button type="button" class="btn-back inline-flex items-center gap-1.5" @click="backToMonthBoard">
        <AppIcon name="arrow-right-01" size="14" />
        <span>بازگشت به برد ماه</span>
      </button>

      <div class="day-detail-nav">
        <button
          type="button"
          class="month-nav-btn prev-btn"
          @click="shiftDay(-1)"
          title="روز قبل"
          aria-label="روز قبل"
        >
          <AppIcon name="arrow-right-01" size="16" />
        </button>
        <span class="day-detail-date">{{ formattedDate }}</span>
        <button
          type="button"
          class="month-nav-btn next-btn"
          @click="shiftDay(1)"
          title="روز بعد"
          aria-label="روز بعد"
        >
          <AppIcon name="arrow-left-01" size="16" />
        </button>
      </div>

      <button
        v-if="tasksStore.selectedDateISO !== todayISO"
        type="button"
        class="btn-add"
        style="padding: 4px 12px; font-size: 11px;"
        @click="goToToday"
      >
        امروز
      </button>
      <div v-else style="width: 50px;"></div>
    </div>

    <!-- Tasks Scroll List for this Day -->
    <div class="tasks-scroll" id="tasksContainer">
      <div v-if="tasksStore.filteredTasks.length === 0" class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <p style="font-weight:600; font-size:15px;">هیچ کاری برای این روز ثبت نشده است</p>
        <p style="font-size:12px; margin-top:4px;">از کادر پایین می‌توانید برای این روز کار جدیدی تعریف کنید</p>
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
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { getLocalISODate, addDaysISO, formatJalaliLong, toPersianDigits } from '@/utils/jalali';
import TaskCard from '@/components/TaskCard.vue';

const tasksStore = useTasksStore();
const todayISO = getLocalISODate();

const formattedDate = computed(() => {
  return formatJalaliLong(tasksStore.selectedDateISO, true);
});

function backToMonthBoard() {
  tasksStore.currentView = 'monthboard';
}

function shiftDay(delta) {
  if (!tasksStore.selectedDateISO) return;
  tasksStore.selectedDateISO = addDaysISO(tasksStore.selectedDateISO, delta);
}

function goToToday() {
  tasksStore.selectedDateISO = getLocalISODate();
}
</script>

<style scoped>
.day-detail-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
</style>
