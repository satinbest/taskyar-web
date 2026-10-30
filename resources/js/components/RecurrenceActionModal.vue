<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="cancel">
    <div class="modal-box recurrence-action-modal" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="actionModalTitle">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <div class="header-icon-badge" :class="mode === 'delete' ? 'is-danger' : 'is-primary'">
            <AppIcon :name="mode === 'delete' ? 'trash' : 'edit'" type="bulk" size="18" :color="mode === 'delete' ? '#ef4444' : 'var(--primary)'" />
          </div>
          <h3 id="actionModalTitle" class="modal-title">
            {{ mode === 'delete' ? 'حذف کار تکرارشونده' : 'ویرایش کار تکرارشونده' }}
          </h3>
        </div>
        <button class="btn-close" @click="cancel" title="انصراف" aria-label="انصراف">
          <AppIcon name="close-circle" size="18" />
        </button>
      </div>

      <div class="modal-body space-y-3">
        <p class="text-xs text-muted leading-relaxed">
          این کار بخشی از یک مجموعه تکرارشونده است. مایلید این عملیات چگونه اعمال شود؟
        </p>

        <div class="action-options space-y-2">
          <!-- Option 1: Only this occurrence -->
          <button
            type="button"
            class="action-option-btn"
            @click="choose('this')"
          >
            <div class="option-icon">
              <AppIcon name="calendar-tick" type="bulk" size="20" color="var(--primary)" />
            </div>
            <div class="option-content">
              <span class="option-title">فقط همین یک مورد</span>
              <span class="option-desc">تغییر فقط روی رویداد تاریخ {{ occurrenceDateFa }} اعمال خواهد شد.</span>
            </div>
          </button>

          <!-- Option 2: This and future occurrences -->
          <button
            type="button"
            class="action-option-btn"
            @click="choose('future')"
          >
            <div class="option-icon">
              <AppIcon name="arrow-left-01" type="bulk" size="20" color="var(--primary)" />
            </div>
            <div class="option-content">
              <span class="option-title">این مورد و تمام موارد بعدی</span>
              <span class="option-desc">از این تاریخ به بعد، تغییرات جایگزین شده و رویدادهای گذشته دست‌نخورده می‌مانند.</span>
            </div>
          </button>

          <!-- Option 3: Entire series -->
          <button
            type="button"
            :class="['action-option-btn', mode === 'delete' ? 'danger' : '']"
            @click="choose('all')"
          >
            <div class="option-icon">
              <AppIcon name="repeat" type="bulk" size="20" :color="mode === 'delete' ? '#ef4444' : 'var(--primary)'" />
            </div>
            <div class="option-content">
              <span class="option-title">کل مجموعه (تمام تکرارها)</span>
              <span class="option-desc">تغییر روی تعریف اصلی کار و تمام دوره‌های گذشته و آینده اعمال خواهد شد.</span>
            </div>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="cancel">انصراف</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue';
import { formatPersianShortDate } from '@/utils/jalali';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  mode: { type: String, default: 'edit' }, // 'edit' or 'delete'
  occurrenceDate: { type: String, default: '' }
});

const emit = defineEmits(['close', 'select']);

const occurrenceDateFa = computed(() => {
  return props.occurrenceDate ? formatPersianShortDate(props.occurrenceDate) : '';
});

function cancel() {
  emit('close');
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    e.preventDefault();
    cancel();
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

function choose(scope) {
  emit('select', scope); // 'this', 'future', 'all'
  emit('close');
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-box.recurrence-action-modal {
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border, rgba(226, 232, 240, 0.9));
  border-radius: var(--radius-lg, 18px);
  width: 100%;
  max-width: 440px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-main, #1E293B);
  animation: modalScale 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, rgba(226, 232, 240, 0.8));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
}

.header-icon-badge.is-primary {
  background: var(--primary-light, #EDE9FE);
}

.header-icon-badge.is-danger {
  background: rgba(239, 68, 68, 0.12);
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--text-main, #1E293B);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted, #64748B);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-close:hover {
  background: var(--bg-hover, #F1F5F9);
  color: var(--text-main, #1E293B);
}

.modal-body {
  padding: 20px;
}

.action-option-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border, #E2E8F0);
  background: var(--bg-input, #F8FAFC);
  color: var(--text-main, #1E293B);
  text-align: right;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-option-btn:hover {
  border-color: var(--primary, #6D28D9);
  background: var(--primary-light, #EDE9FE);
  transform: translateY(-1px);
}

.action-option-btn.danger:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.option-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.option-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main, #1E293B);
}

.option-desc {
  font-size: 11px;
  color: var(--text-muted, #64748B);
  line-height: 1.5;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border, rgba(226, 232, 240, 0.8));
  display: flex;
  justify-content: flex-end;
  background: var(--surface-solid, #FFFFFF);
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border, #E2E8F0);
  color: var(--text-muted, #64748B);
  padding: 6px 18px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: var(--bg-hover, #F1F5F9);
  color: var(--text-main, #1E293B);
}
</style>
