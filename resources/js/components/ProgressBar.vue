<template>
  <div class="progress-wrapper">
    <div class="progress-info">
      <span class="progress-label">میزان پیشرفت لیست فعلی</span>
      <span class="progress-stats">{{ progressText }}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: tasksStore.progressPercent + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { toPersianDigits } from '@/utils/jalali';

const tasksStore = useTasksStore();

const progressText = computed(() => {
  const total = tasksStore.filteredTasks.length;
  const done = tasksStore.completedTasks.length;
  const pct = tasksStore.progressPercent;
  return `${toPersianDigits(pct)}٪ (${toPersianDigits(done)} از ${toPersianDigits(total)} انجام شده)`;
});
</script>
