<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="dismiss">
    <div class="modal-box conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflictModalTitle" dir="rtl">
      <!-- Header -->
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <AppIcon name="warning-2" type="bulk" size="24" color="#E11D48" />
          <h2 id="conflictModalTitle" class="modal-title text-rose-600">تعارض در همگام‌سازی کار</h2>
        </div>
        <button class="btn-close" @click="dismiss" title="بستن" aria-label="بستن">
          <AppIcon name="close-circle" size="18" />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body space-y-4">
        <p class="text-sm text-muted">
          نسخه این کار روی سرور در دستگاه دیگری تغییر یافته است. برای جلوگیری از بازنویسی ناخواسته، نحوه اعمال تغییرات را مشخص کنید:
        </p>

        <!-- Side-by-side Comparison -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <!-- Server Version Card -->
          <div class="comparison-card server-card">
            <div class="comparison-header">
              <span class="badge badge-server">نسخه سرور (دستگاه دیگر)</span>
              <span class="revision-badge">نسخه {{ toPersianDigits(conflictData?.server_revision || 1) }}</span>
            </div>
            <div class="comparison-body space-y-2">
              <div>
                <span class="field-label">عنوان:</span>
                <span class="field-val font-bold">{{ conflictData?.server_task?.title }}</span>
              </div>
              <div v-if="conflictData?.server_task?.dueDate">
                <span class="field-label">تاریخ موعد:</span>
                <span class="field-val">{{ formatJalaliDate(conflictData?.server_task?.dueDate) }}</span>
              </div>
              <div v-if="conflictData?.server_task?.dueTime">
                <span class="field-label">ساعت:</span>
                <span class="field-val">{{ toPersianDigits(conflictData?.server_task?.dueTime) }}</span>
              </div>
              <div>
                <span class="field-label">وضعیت:</span>
                <span class="field-val">{{ conflictData?.server_task?.completed ? 'تکمیل شده' : 'در حال انتظار' }}</span>
              </div>
              <div v-if="conflictData?.server_task?.notes">
                <span class="field-label">یادداشت:</span>
                <span class="field-val text-muted">{{ conflictData?.server_task?.notes }}</span>
              </div>
            </div>
          </div>

          <!-- Local Version Card -->
          <div class="comparison-card local-card">
            <div class="comparison-header">
              <span class="badge badge-local">نسخه محلی شما (تغییرات شما)</span>
              <span class="revision-badge">نسخه در انتظار</span>
            </div>
            <div class="comparison-body space-y-2">
              <div>
                <span class="field-label">عنوان:</span>
                <span class="field-val font-bold">{{ conflictData?.client_payload?.title }}</span>
              </div>
              <div v-if="conflictData?.client_payload?.dueDate || conflictData?.client_payload?.due_date">
                <span class="field-label">تاریخ موعد:</span>
                <span class="field-val">
                  {{ formatJalaliDate(conflictData?.client_payload?.dueDate || conflictData?.client_payload?.due_date) }}
                </span>
              </div>
              <div v-if="conflictData?.client_payload?.dueTime || conflictData?.client_payload?.due_time">
                <span class="field-label">ساعت:</span>
                <span class="field-val" dir="ltr">
                  {{ toPersianDigits(conflictData?.client_payload?.dueTime || conflictData?.client_payload?.due_time) }}
                </span>
              </div>
              <div>
                <span class="field-label">وضعیت:</span>
                <span class="field-val">{{ conflictData?.client_payload?.completed ? 'تکمیل شده' : 'در حال انتظار' }}</span>
              </div>
              <div v-if="conflictData?.client_payload?.notes">
                <span class="field-label">یادداشت:</span>
                <span class="field-val text-muted">{{ conflictData?.client_payload?.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-footer flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          class="btn-choice btn-server"
          @click="resolveChoice('server')"
        >
          نگه‌داشتن نسخه سرور
        </button>

        <button
          type="button"
          class="btn-choice btn-local"
          @click="resolveChoice('local')"
        >
          نگه‌داشتن نسخه محلی من
        </button>

        <button
          type="button"
          class="btn-choice btn-cancel"
          @click="dismiss"
        >
          بررسی بعداً
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { toPersianDigits, formatJalaliDate } from '@/utils/jalali';

const tasksStore = useTasksStore();

const isOpen = computed(() => tasksStore.activeConflict !== null);
const conflictData = computed(() => tasksStore.activeConflict);

function dismiss() {
  tasksStore.dismissConflict();
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault();
    dismiss();
  }
}

watch(isOpen, (open) => {
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

async function resolveChoice(choice) {
  await tasksStore.resolveActiveConflict(choice);
}
</script>

<style scoped>
.conflict-modal {
  max-width: 620px;
}

.comparison-card {
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  background: var(--bg-hover, #f8fafc);
}

.server-card {
  border-right: 4px solid #3b82f6;
}

.local-card {
  border-right: 4px solid var(--primary, #6d28d9);
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--border);
}

.badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 11px;
}

.badge-server {
  background: #dbeafe;
  color: #1e40af;
}

.badge-local {
  background: var(--primary-light, #ede9fe);
  color: var(--primary, #6d28d9);
}

.revision-badge {
  color: var(--text-muted);
  font-size: 10.5px;
}

.field-label {
  color: var(--text-muted);
  margin-left: 6px;
  display: inline-block;
}

.field-val {
  color: var(--text-main);
}

.btn-choice {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-server {
  background: #3b82f6;
  color: #ffffff;
}

.btn-server:hover {
  background: #2563eb;
}

.btn-local {
  background: var(--primary, #6d28d9);
  color: #ffffff;
}

.btn-local:hover {
  opacity: 0.9;
}

.btn-cancel {
  background: var(--bg-hover, #f1f5f9);
  color: var(--text-muted);
}
</style>
