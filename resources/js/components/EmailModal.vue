<template>
  <div :class="['modal-overlay', isOpen ? 'show' : '']" @click.self="$emit('close')">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="emailModalTitle" style="text-align: right;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 id="emailModalTitle" style="font-size: 16px; font-weight: 800;">ارسال پشتیبان به ایمیل</h3>
        <button class="btn-icon-text" style="padding: 4px 8px;" @click="$emit('close')" aria-label="بستن">✕</button>
      </div>
      <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.6;">
        آدرس ایمیل خود را وارد کنید. برنامه لیست کامل کارها را در کلیپ‌بورد کپی کرده، فایل پشتیبان JSON را دانلود می‌کند و نرم‌افزار ایمیل را برایتان باز می‌کند:
      </p>
      <input
        type="email"
        v-model="email"
        class="drawer-title-input"
        placeholder="example@gmail.com"
        dir="ltr"
        style="text-align:left;"
      />
      <div class="modal-actions">
        <button style="background: var(--primary); color: white;" @click="handleSend">
          آماده‌سازی و ارسال به ایمیل
        </button>
        <button style="background: #F1F5F9; color: var(--text-main);" @click="$emit('close')">
          انصراف
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { useAuthStore } from '@/stores/auth';
import { getLocalISODate, formatPersianShortDate, toPersianDigits } from '@/utils/jalali';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const tasksStore = useTasksStore();
const authStore = useAuthStore();
const email = ref(authStore.user?.email || localStorage.getItem('persian_todo_backup_email') || '');

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    e.preventDefault();
    emit('close');
  }
}

watch(() => props.isOpen, (open) => {
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

function handleSend() {
  const targetEmail = email.value.trim();
  if (!targetEmail) {
    alert('لطفاً آدرس ایمیل را وارد کنید.');
    return;
  }
  localStorage.setItem('persian_todo_backup_email', targetEmail);

  // Trigger JSON file download
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasksStore.tasks, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `taskyar_backup_${getLocalISODate()}.json`;
  a.click();

  const persianToday = new Intl.DateTimeFormat('fa-IR').format(new Date());
  const summaryLines = tasksStore.tasks.map((t, idx) => {
    const dateStr = (t.dueDate || t.due_date) ? formatPersianShortDate(t.dueDate || t.due_date) : 'بدون تاریخ';
    const timeStr = (t.dueTime || t.due_time) ? toPersianDigits(t.dueTime || t.due_time) : '';
    return `${toPersianDigits(idx + 1)}. [${t.completed ? '✔' : ' '}] ${t.title} (${dateStr}${timeStr ? ' ' + timeStr : ''})`;
  }).join('\n');

  const fullBackupText = `پشتیبان کارهای تسک‌یار (${persianToday}):\n\n${summaryLines}\n\n--- JSON DATA ---\n${JSON.stringify(tasksStore.tasks)}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(fullBackupText).catch(() => {});
  }

  const subject = encodeURIComponent(`پشتیبان تسک‌یار - ${persianToday}`);
  const body = encodeURIComponent(`خلاصه وظایف ثبت شده در تسک‌یار (${persianToday}):\n\n${summaryLines}\n\n(نکته: فایل JSON کامل نیز دانلود شد و متن کامل در کلیپ‌بورد کپی شده است).`);
  window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;

  emit('close');
}
</script>
