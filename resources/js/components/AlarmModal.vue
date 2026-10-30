<template>
  <div :class="['modal-overlay', tasksStore.alarmModalOpen ? 'show' : '']" role="dialog" aria-modal="true" aria-label="یادآور انجام کار">
    <div class="modal-card" dir="rtl">
      <div class="alarm-ring-icon">
        <AppIcon name="notification-bing" type="bulk" size="38" color="var(--primary)" />
      </div>
      <h3 style="font-size: 18px; font-weight: 800; margin-top: 8px;">یادآور زمان انجام کار!</h3>
      <p style="font-size: 15px; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 10px 14px; border-radius: 12px; margin: 12px 0;">
        {{ tasksStore.activeAlarmTask?.title }}
      </p>
      <p style="font-size: 12.5px; color: var(--text-muted);">
        ساعت مقرر: <span dir="ltr" class="inline-block">{{ toPersianDigits(tasksStore.activeAlarmTask?.dueTime || tasksStore.activeAlarmTask?.due_time || '') }}</span>
      </p>

      <!-- Advanced Snooze Options -->
      <div class="snooze-section" style="margin: 14px 0 6px 0;">
        <span style="font-size: 11.5px; color: var(--text-muted); display: block; margin-bottom: 6px;">به تعویق انداختن هشدار:</span>
        <div class="flex gap-2 justify-center flex-wrap">
          <button type="button" class="snooze-pill" @click="tasksStore.snoozeAlarm(5)">۵ دقیقه دیگر</button>
          <button type="button" class="snooze-pill" @click="tasksStore.snoozeAlarm(10)">۱۰ دقیقه دیگر</button>
          <button type="button" class="snooze-pill" @click="tasksStore.snoozeAlarm(15)">۱۵ دقیقه دیگر</button>
          <button type="button" class="snooze-pill" @click="tasksStore.snoozeAlarm(60)">۱ ساعت دیگر</button>
        </div>
      </div>

      <div class="modal-actions" style="margin-top: 14px;">
        <button style="background: var(--primary); color: white; width: 100%; padding: 10px; border-radius: 10px; font-weight: 700;" @click="tasksStore.dismissAlarm()">
          متوجه شدم (بستن)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, onUnmounted } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { toPersianDigits } from '@/utils/jalali';

const tasksStore = useTasksStore();

function handleKeyDown(e) {
  if (e.key === 'Escape' && tasksStore.alarmModalOpen) {
    e.preventDefault();
    tasksStore.dismissAlarm();
  }
}

watch(() => tasksStore.alarmModalOpen, (open) => {
  if (typeof document === 'undefined') return;
  if (open) {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
  } else {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleKeyDown);
  }
}, { immediate: true });

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<style scoped>
.snooze-pill {
  background: var(--bg-hover, #f1f5f9);
  color: var(--text-main, #0f172a);
  border: 1px solid var(--border, #e2e8f0);
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.snooze-pill:hover {
  background: var(--primary-light, #ede9fe);
  color: var(--primary, #6d28d9);
  border-color: var(--primary, #6d28d9);
}
</style>
