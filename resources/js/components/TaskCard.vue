<template>
  <div
    :class="[
      'task-card',
      task.completed ? 'completed' : '',
      tasksStore.selectedTaskId === task.id ? 'selected' : ''
    ]"
    @click="openDrawer"
    dir="rtl"
  >
    <div class="task-right">
      <div class="custom-checkbox" @click.stop="tasksStore.toggleComplete(task.id)">
        <AppIcon v-if="task.completed" name="tick-circle" type="bulk" size="18" />
      </div>

      <div class="task-info">
        <div class="flex items-center gap-2">
          <!-- Recurrence Icon -->
          <span
            v-if="isRecurring"
            class="text-xs text-purple-600 dark:text-purple-400 font-bold inline-flex items-center"
            :title="recurrenceTooltip"
          >
            <AppIcon name="repeat" size="14" />
          </span>

          <span class="task-title">{{ task.title }}</span>
        </div>

        <div class="task-meta">
          <span :class="['period-tag', periodInfo.cls]">{{ periodInfo.text }}</span>

          <!-- Category Badge -->
          <span
            v-if="categoryInfo"
            class="category-chip"
            :style="{ borderColor: categoryInfo.color, color: categoryInfo.color }"
          >
            <span class="cat-chip-dot" :style="{ backgroundColor: categoryInfo.color }"></span>
            {{ categoryInfo.name }}
          </span>

          <!-- Due Date -->
          <span v-if="task.dueDate || task.due_date" class="meta-chip">
            <AppIcon name="calendar-1" size="12" />
            {{ formatPersianShortDate(task.dueDate || task.due_date) }}
          </span>

          <!-- Due Time -->
          <span
            v-if="task.dueTime || task.due_time"
            :class="['meta-chip', (task.alarmEnabled || task.alarm_enabled) ? 'alarm-active' : '']"
          >
            <AppIcon :name="(task.alarmEnabled || task.alarm_enabled) ? 'notification-bing' : 'clock'" size="12" />
            {{ toPersianDigits(task.dueTime || task.due_time) }}
          </span>

          <!-- Subtasks -->
          <span v-if="subtasksTotal > 0">
            • مراحل: {{ toPersianDigits(subtasksDone) }}/{{ toPersianDigits(subtasksTotal) }}
          </span>

          <!-- Tags -->
          <span
            v-for="tag in taskTags"
            :key="tag.id || tag.name || tag"
            class="meta-tag-chip"
          >
            #{{ tag.name || tag }}
          </span>

          <span v-if="task.notes">• یادداشت</span>
        </div>
      </div>
    </div>

    <button
      :class="['star-btn', task.important ? 'important' : '']"
      @click.stop="tasksStore.toggleImportant(task.id)"
      title="مهم و ستاره‌دار"
    >
      <AppIcon name="star" :type="task.important ? 'bulk' : 'linear'" size="20" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { formatPersianShortDate, toPersianDigits } from '@/utils/jalali';

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
});

const tasksStore = useTasksStore();

const periodLabels = {
  daily: { text: 'روزانه', cls: 'period-daily' },
  weekly: { text: 'هفتگی', cls: 'period-weekly' },
  monthly: { text: 'ماهیانه', cls: 'period-monthly' }
};

const periodInfo = computed(() => {
  return periodLabels[props.task.period] || periodLabels.daily;
});

const isRecurring = computed(() => {
  return Boolean(
    props.task.is_occurrence ||
    (props.task.recurrence_pattern && props.task.recurrence_pattern !== 'none')
  );
});

const recurrenceTooltip = computed(() => {
  if (props.task.is_occurrence) return 'رویداد تکرارشونده';
  return 'کار تکرارشونده';
});

const categoryInfo = computed(() => {
  if (props.task.category) return props.task.category;
  if (props.task.category_id) {
    return tasksStore.categories.find(c => c.id === props.task.category_id) || null;
  }
  return null;
});

const taskTags = computed(() => {
  return (props.task.tags || []).slice(0, 3); // show up to 3 tags to keep card compact
});

const subtasksList = computed(() => props.task.subtasks || []);
const subtasksDone = computed(() => subtasksList.value.filter(s => s.is_done || s.done).length);
const subtasksTotal = computed(() => subtasksList.value.length);

function openDrawer() {
  tasksStore.selectedTaskId = props.task.id;
}
</script>

<style scoped>
.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  border: 1px solid transparent;
  background: rgba(148, 163, 184, 0.08);
}

.cat-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.meta-tag-chip {
  font-size: 10.5px;
  color: #0284c7;
  font-weight: 600;
}
</style>
