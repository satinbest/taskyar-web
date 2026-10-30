<template>
  <div
    v-if="isOpen"
    class="modal-backdrop"
    :class="{ 'is-mobile-backdrop': isMobile }"
    @click.self="close"
  >
    <div
      class="modal-box recurrence-modal"
      :class="{ 'is-mobile-sheet': isMobile }"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurrenceModalTitle"
    >
      <!-- Mobile drag handle indicator -->
      <div v-if="isMobile" class="sheet-handle-bar">
        <div class="sheet-handle"></div>
      </div>

      <!-- Modal Header -->
      <div class="modal-header">
        <div class="flex items-center gap-3">
          <div class="header-icon-badge">
            <AppIcon name="repeat" type="bulk" size="22" color="var(--primary)" />
          </div>
          <div>
            <h2 id="recurrenceModalTitle" class="modal-title">تنظیم تکرار برنامه</h2>
            <p class="modal-subtitle">تعیین دوره تکرار خودکار و موعد بعدی کار</p>
          </div>
        </div>
        <button class="btn-close" @click="close" title="بستن پنجره" aria-label="بستن">
          <AppIcon name="close-circle" size="20" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <div class="recurrence-body-content">
          <!-- Group 1: Recurrence Frequency -->
          <div class="form-group recurrence-section">
            <label class="form-label" id="recurrencePatternLabel">تواتر و دوره تکرار:</label>
            <AppSelect
              id="recurrencePatternSelect"
              variant="form"
              :block="true"
              v-model="frequencyMode"
              :options="frequencyOptions"
            />
          </div>

          <!-- Group 2: Interval Settings (Shown when not 'none') -->
          <div v-if="frequencyMode !== 'none'" class="form-group recurrence-section">
            <label class="form-label">فاصله زمانی تکرار:</label>
            <div class="interval-row">
              <span class="interval-prefix">هر</span>
              <input
                type="number"
                min="1"
                max="99"
                v-model.number="localInterval"
                class="form-input interval-input"
                aria-label="فاصله تکرار"
              />
              <!-- In custom mode let user pick the unit, otherwise show the fixed unit label -->
              <template v-if="frequencyMode === 'custom'">
                <div class="custom-unit-select">
                  <AppSelect
                    variant="form"
                    :block="true"
                    v-model="customUnit"
                    :options="customUnitOptions"
                  />
                </div>
                <span class="interval-suffix">یک‌بار</span>
              </template>
              <template v-else>
                <span class="interval-unit-badge">{{ intervalUnitLabel }} یک‌بار</span>
              </template>
            </div>
          </div>

          <!-- Group 3: Weekday Selection (Only for weekly or custom with weekly unit) -->
          <div v-if="isWeeklyActive" class="form-group recurrence-section">
            <div class="weekday-header flex items-center justify-between mb-1.5">
              <label class="form-label mb-0">روزهای هفته:</label>
              <span class="text-xs text-muted">انتخاب روزهای موعد تکرار</span>
            </div>
            <div class="weekday-grid">
              <button
                v-for="day in weekdayList"
                :key="day.id"
                type="button"
                :class="['weekday-chip', localWeekdays.includes(day.id) ? 'is-active' : '']"
                @click="toggleWeekday(day.id)"
                :title="day.fullName"
              >
                <span class="weekday-name">{{ day.shortName }}</span>
                <span v-if="localWeekdays.includes(day.id)" class="weekday-dot"></span>
              </button>
            </div>
            <p v-if="localWeekdays.length === 0" class="weekday-warning-text mt-2 text-xs text-amber-500">
              هیچ روزی انتخاب نشده است؛ کار در روز موعد اولیه تکرار خواهد شد.
            </p>
          </div>

          <!-- Group 4: Monthly / Yearly Jalali Settings Note -->
          <div v-if="isMonthlyOrYearlyActive" class="calendar-note">
            <AppIcon name="info-circle" type="bulk" size="20" color="var(--primary)" class="mt-0.5 flex-shrink-0" />
            <div class="calendar-note-text">
              <strong>محاسبه بر اساس گاه‌شمار خورشیدی:</strong>
              تکرار ماهانه و سالانه طبق تقویم جلالی انجام می‌شود. در ماه‌های ۳۰ یا ۲۹ روزه، روزهای انتهای ماه با آخرین روز ماه جاری هماهنگ می‌گردند.
            </div>
          </div>

          <!-- Group 5: Recurrence End Condition -->
          <div v-if="frequencyMode !== 'none'" class="form-group recurrence-section">
            <label class="form-label">شرط پایان تکرار:</label>
            <AppSelect
              id="recurrenceEndTypeSelect"
              variant="form"
              :block="true"
              v-model="endType"
              :options="endTypeOptions"
            />

            <!-- Nested until_date Jalali picker -->
            <div v-if="endType === 'until_date'" class="end-condition-box mt-3 p-4">
              <span class="block text-xs font-bold mb-2.5 text-muted">انتخاب تاریخ پایان تکرار (گاه‌شمار جلالی):</span>
              <JalaliDatePicker v-model="localEndDate" placeholder="انتخاب تاریخ پایان (جلالی)" />
            </div>

            <!-- Nested after_count stepper -->
            <div v-if="endType === 'after_count'" class="end-condition-box mt-3 p-4 flex items-center gap-3">
              <span class="text-xs font-bold text-muted">تکرار تا سقف:</span>
              <input
                type="number"
                min="1"
                max="365"
                v-model.number="localCount"
                class="form-input interval-input"
                aria-label="تعداد دفعات تکرار"
              />
              <span class="text-xs font-bold text-muted">مرتبه (رویداد)</span>
            </div>
          </div>

          <!-- Group 6: Live Persian Rule Summary Card -->
          <div class="summary-card">
            <div class="flex items-start gap-3">
              <div class="summary-icon-badge">
                <AppIcon name="calendar-tick" type="bulk" size="20" color="var(--primary)" />
              </div>
              <div class="flex-1 min-w-0">
                <span class="summary-title">خلاصه الگوی تکرار:</span>
                <p class="summary-text">{{ summaryText }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Group 7: Modal Footer Actions -->
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="close">انصراف</button>
        <button type="button" class="btn-save" @click="applyRecurrence">
          <AppIcon name="tick-circle" size="18" />
          <span>ذخیره و اعمال تنظیمات</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { toPersianDigits, formatPersianShortDate } from '@/utils/jalali';
import JalaliDatePicker from '@/components/JalaliDatePicker.vue';
import AppSelect from '@/components/AppSelect.vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  initialPattern: { type: String, default: 'none' },
  initialInterval: { type: Number, default: 1 },
  initialWeekdays: { type: Array, default: () => [] },
  initialEndDate: { type: String, default: null },
  initialCount: { type: Number, default: null }
});

const emit = defineEmits(['close', 'save']);

const isMobile = ref(false);

function checkMobile() {
  isMobile.value = typeof window !== 'undefined' && window.innerWidth <= 640;
}

const frequencyOptions = [
  { value: 'none', label: 'بدون تکرار (یک‌باره)' },
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' },
  { value: 'custom', label: 'سفارشی (پیشرفته)' }
];

const customUnitOptions = [
  { value: 'days', label: 'روز' },
  { value: 'weeks', label: 'هفته' },
  { value: 'months', label: 'ماه' },
  { value: 'years', label: 'سال' }
];

const endTypeOptions = [
  { value: 'never', label: 'بدون تاریخ پایان (همیشگی)' },
  { value: 'until_date', label: 'تا تاریخ مشخص' },
  { value: 'after_count', label: 'پس از تعداد دفعات مشخص' }
];

const weekdayList = [
  { id: 0, shortName: 'ش', fullName: 'شنبه' },
  { id: 1, shortName: 'ی', fullName: 'یکشنبه' },
  { id: 2, shortName: 'د', fullName: 'دوشنبه' },
  { id: 3, shortName: 'س', fullName: 'سه‌شنبه' },
  { id: 4, shortName: 'چ', fullName: 'چهارشنبه' },
  { id: 5, shortName: 'پ', fullName: 'پنج‌شنبه' },
  { id: 6, shortName: 'ج', fullName: 'جمعه' }
];

const fullWeekdayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const frequencyMode = ref('none');
const customUnit = ref('days');
const localInterval = ref(1);
const localWeekdays = ref([]);
const endType = ref('never');
const localEndDate = ref(null);
const localCount = ref(10);

watch(() => props.isOpen, (open) => {
  if (open) {
    checkMobile();
    document.body.style.overflow = 'hidden';

    const pat = props.initialPattern || 'none';
    const interval = props.initialInterval || 1;

    if (['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(pat)) {
      frequencyMode.value = pat;
    } else {
      frequencyMode.value = 'none';
    }

    localInterval.value = interval > 0 ? interval : 1;
    localWeekdays.value = Array.isArray(props.initialWeekdays) ? [...props.initialWeekdays] : [];

    if (props.initialEndDate) {
      endType.value = 'until_date';
      localEndDate.value = props.initialEndDate;
    } else if (props.initialCount && props.initialCount > 0) {
      endType.value = 'after_count';
      localCount.value = props.initialCount;
    } else {
      endType.value = 'never';
      localEndDate.value = null;
      localCount.value = 10;
    }
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  window.addEventListener('keydown', handleGlobalKey);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('keydown', handleGlobalKey);
  document.body.style.overflow = '';
});

function handleGlobalKey(e) {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
}

const isWeeklyActive = computed(() => {
  return frequencyMode.value === 'weekly' || (frequencyMode.value === 'custom' && customUnit.value === 'weeks');
});

const isMonthlyOrYearlyActive = computed(() => {
  return frequencyMode.value === 'monthly' || frequencyMode.value === 'yearly' ||
    (frequencyMode.value === 'custom' && (customUnit.value === 'months' || customUnit.value === 'years'));
});

const intervalUnitLabel = computed(() => {
  switch (frequencyMode.value) {
    case 'daily': return 'روز';
    case 'weekly': return 'هفته';
    case 'monthly': return 'ماه';
    case 'yearly': return 'سال';
    default: return 'دوره';
  }
});

function toggleWeekday(dayId) {
  const idx = localWeekdays.value.indexOf(dayId);
  if (idx > -1) {
    localWeekdays.value.splice(idx, 1);
  } else {
    localWeekdays.value.push(dayId);
    localWeekdays.value.sort((a, b) => a - b);
  }
}

const summaryText = computed(() => {
  if (frequencyMode.value === 'none') {
    return 'این برنامه فقط یک‌بار در موعد تعیین‌شده انجام می‌شود و تکرار نخواهد شد.';
  }

  const parts = [];
  const interval = localInterval.value || 1;

  if (frequencyMode.value === 'daily') {
    if (interval === 1) parts.push('هر روز');
    else parts.push(`هر ${toPersianDigits(interval)} روز یک‌بار`);
  } else if (frequencyMode.value === 'weekly') {
    if (interval === 1) parts.push('هر هفته');
    else parts.push(`هر ${toPersianDigits(interval)} هفته یک‌بار`);

    if (localWeekdays.value.length > 0) {
      const daysStr = localWeekdays.value.map(d => fullWeekdayNames[d]).join('، ');
      parts.push(`در روزهای ${daysStr}`);
    } else {
      parts.push('(در روز موعد اولیه)');
    }
  } else if (frequencyMode.value === 'monthly') {
    if (interval === 1) parts.push('هر ماه یک‌بار طبق گاه‌شمار خورشیدی');
    else parts.push(`هر ${toPersianDigits(interval)} ماه یک‌بار طبق گاه‌شمار خورشیدی`);
  } else if (frequencyMode.value === 'yearly') {
    if (interval === 1) parts.push('هر سال یک‌بار طبق تقویم جلالی');
    else parts.push(`هر ${toPersianDigits(interval)} سال یک‌بار طبق تقویم جلالی`);
  } else if (frequencyMode.value === 'custom') {
    const unitMap = { days: 'روز', weeks: 'هفته', months: 'ماه', years: 'سال' };
    const uName = unitMap[customUnit.value] || 'دوره';
    parts.push(`هر ${toPersianDigits(interval)} ${uName} یک‌بار`);

    if (customUnit.value === 'weeks' && localWeekdays.value.length > 0) {
      const daysStr = localWeekdays.value.map(d => fullWeekdayNames[d]).join('، ');
      parts.push(`در روزهای ${daysStr}`);
    }
  }

  if (endType.value === 'until_date' && localEndDate.value) {
    parts.push(`تا تاریخ ${formatPersianShortDate(localEndDate.value)}`);
  } else if (endType.value === 'after_count' && localCount.value > 0) {
    parts.push(`تا سقف ${toPersianDigits(localCount.value)} بار تکرار`);
  } else {
    parts.push('به صورت پیوسته (بدون پایان)');
  }

  return parts.join(' ') + '.';
});

function close() {
  emit('close');
}

function applyRecurrence() {
  let recurrencePattern = frequencyMode.value;
  let interval = localInterval.value > 0 ? localInterval.value : 1;
  let weekdays = isWeeklyActive.value ? [...localWeekdays.value] : null;
  let recurrenceEndDate = null;
  let recurrenceCount = null;

  if (recurrencePattern === 'none') {
    interval = 1;
    weekdays = null;
    recurrenceEndDate = null;
    recurrenceCount = null;
  } else {
    if (endType.value === 'until_date') {
      recurrenceEndDate = localEndDate.value;
    } else if (endType.value === 'after_count') {
      recurrenceCount = localCount.value > 0 ? localCount.value : null;
    }
  }

  emit('save', {
    recurrencePattern,
    recurrenceInterval: interval,
    recurrenceWeekdays: weekdays,
    recurrenceEndDate,
    recurrenceCount
  });

  close();
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: modalBackdropFadeIn 0.2s ease-out;
}

@keyframes modalBackdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-box.recurrence-modal {
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border, rgba(226, 232, 240, 0.95));
  border-radius: 20px;
  width: 100%;
  max-width: 510px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-main, #1E293B);
  z-index: 2001;
  animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-mode="dark"] .modal-box.recurrence-modal,
.dark .modal-box.recurrence-modal {
  background: #0f172a;
  border-color: rgba(51, 65, 85, 0.85);
  color: #F8FAFC;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, rgba(226, 232, 240, 0.85));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

[data-mode="dark"] .modal-header,
.dark .modal-header {
  background: #0f172a;
  border-bottom-color: rgba(51, 65, 85, 0.7);
}

.header-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--primary-light, #EDE9FE);
  flex-shrink: 0;
}

[data-mode="dark"] .header-icon-badge,
.dark .header-icon-badge {
  background: rgba(139, 92, 246, 0.2);
}

.modal-title {
  font-size: 16px;
  font-weight: 800;
  margin: 0;
  color: var(--text-main, #1E293B);
}

[data-mode="dark"] .modal-title,
.dark .modal-title {
  color: #F8FAFC;
}

.modal-subtitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted, #64748B);
  margin: 3px 0 0 0;
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
  background: var(--bg-hover, rgba(241, 245, 249, 0.8));
  color: var(--text-main, #1E293B);
}

[data-mode="dark"] .btn-close:hover,
.dark .btn-close:hover {
  background: rgba(30, 41, 59, 0.8);
  color: #F8FAFC;
}

.modal-body {
  padding: 24px;
  max-height: 72vh;
  overflow-y: auto;
}

.recurrence-body-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main, #1E293B);
}

[data-mode="dark"] .form-label,
.dark .form-label {
  color: #F8FAFC;
}

.interval-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--bg-input, #F8FAFC);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: 14px;
}

[data-mode="dark"] .interval-row,
.dark .interval-row {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(51, 65, 85, 0.7);
}

.interval-prefix,
.interval-suffix {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-muted, #64748B);
}

.interval-input {
  width: 80px;
  height: 42px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  border-radius: 10px;
}

.custom-unit-select {
  min-width: 130px;
}

.interval-unit-badge {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary, #6D28D9);
  background: var(--primary-light, #EDE9FE);
  padding: 9px 18px;
  border-radius: 10px;
  border: 1px solid rgba(109, 40, 217, 0.18);
}

[data-mode="dark"] .interval-unit-badge,
.dark .interval-unit-badge {
  background: rgba(139, 92, 246, 0.2);
  color: #C4B5FD;
  border-color: rgba(167, 139, 250, 0.3);
}

.weekday-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 2px;
}

.weekday-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 44px;
  background: var(--bg-input, #F8FAFC);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: 12px;
  color: var(--text-main, #1E293B);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-mode="dark"] .weekday-chip,
.dark .weekday-chip {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(51, 65, 85, 0.7);
  color: #F8FAFC;
}

.weekday-chip:hover {
  border-color: var(--primary, #6D28D9);
  background: var(--primary-light, #EDE9FE);
  color: var(--primary, #6D28D9);
}

[data-mode="dark"] .weekday-chip:hover,
.dark .weekday-chip:hover {
  background: rgba(139, 92, 246, 0.25);
  color: #FFFFFF;
}

.weekday-chip.is-active {
  background: var(--primary, #6D28D9);
  border-color: var(--primary, #6D28D9);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(109, 40, 217, 0.32);
}

.weekday-dot {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #FFFFFF;
}

.calendar-note {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

[data-mode="dark"] .calendar-note,
.dark .calendar-note {
  background: rgba(30, 58, 138, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
}

.calendar-note-text {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-muted, #475569);
}

[data-mode="dark"] .calendar-note-text,
.dark .calendar-note-text {
  color: #94A3B8;
}

.calendar-note-text strong {
  color: #2563EB;
  margin-left: 4px;
}

[data-mode="dark"] .calendar-note-text strong,
.dark .calendar-note-text strong {
  color: #60A5FA;
}

.end-condition-box {
  background: var(--bg-input, #F8FAFC);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: 14px;
}

[data-mode="dark"] .end-condition-box,
.dark .end-condition-box {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(51, 65, 85, 0.7);
}

.summary-card {
  background: var(--primary-light, rgba(245, 243, 255, 0.7));
  border: 1px dashed var(--primary, #6D28D9);
  border-radius: 16px;
  padding: 16px 20px;
}

[data-mode="dark"] .summary-card,
.dark .summary-card {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(167, 139, 250, 0.45);
}

.summary-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

[data-mode="dark"] .summary-icon-badge,
.dark .summary-icon-badge {
  background: rgba(15, 23, 42, 0.6);
}

.summary-title {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: var(--primary, #6D28D9);
  margin-bottom: 4px;
}

[data-mode="dark"] .summary-title,
.dark .summary-title {
  color: #C4B5FD;
}

.summary-text {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.75;
  color: var(--text-main, #1E293B);
  margin: 0;
}

[data-mode="dark"] .summary-text,
.dark .summary-text {
  color: #F8FAFC;
}

.form-input {
  border: 1px solid var(--border, #E2E8F0);
  background: var(--bg-card, #FFFFFF);
  color: var(--text-main, #1E293B);
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  outline: none;
  transition: all 0.15s ease;
}

[data-mode="dark"] .form-input,
.dark .form-input {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(51, 65, 85, 0.7);
  color: #F8FAFC;
}

.form-input:focus {
  border-color: var(--primary, #6D28D9);
  box-shadow: 0 0 0 3px var(--primary-light, rgba(109, 40, 217, 0.15));
}

.modal-footer {
  padding: 18px 24px;
  border-top: 1px solid var(--border, rgba(226, 232, 240, 0.85));
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--surface-solid, #FFFFFF);
}

[data-mode="dark"] .modal-footer,
.dark .modal-footer {
  background: #0f172a;
  border-top-color: rgba(51, 65, 85, 0.7);
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border, #E2E8F0);
  color: var(--text-muted, #64748B);
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

[data-mode="dark"] .btn-cancel,
.dark .btn-cancel {
  border-color: rgba(51, 65, 85, 0.8);
  color: #94A3B8;
}

.btn-cancel:hover {
  background: var(--bg-hover, #F1F5F9);
  color: var(--text-main, #1E293B);
}

[data-mode="dark"] .btn-cancel:hover,
.dark .btn-cancel:hover {
  background: rgba(30, 41, 59, 0.8);
  color: #F8FAFC;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary, #6D28D9);
  border: 1px solid var(--primary, #6D28D9);
  color: #FFFFFF;
  padding: 10px 26px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(109, 40, 217, 0.28);
  transition: all 0.15s ease;
}

.btn-save:hover {
  opacity: 0.94;
  transform: translateY(-1px);
}

/* Mobile Bottom Sheet Presentation */
.modal-backdrop.is-mobile-backdrop {
  align-items: flex-end !important;
  padding: 0 !important;
}

.modal-box.recurrence-modal.is-mobile-sheet {
  max-width: 100% !important;
  width: 100% !important;
  border-radius: 24px 24px 0 0 !important;
  border-bottom: none !important;
  max-height: 88vh !important;
  margin: 0 !important;
  animation: sheetSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes sheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle-bar {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px 0;
}

.sheet-handle {
  width: 44px;
  height: 4px;
  border-radius: 9999px;
  background: var(--border, #CBD5E1);
}

@media (max-width: 640px) {
  .modal-backdrop {
    align-items: flex-end !important;
    padding: 0 !important;
  }

  .modal-box.recurrence-modal {
    max-width: 100% !important;
    width: 100% !important;
    border-radius: 24px 24px 0 0 !important;
    border-bottom: none !important;
    max-height: 88vh !important;
    margin: 0 !important;
  }

  .modal-header {
    padding: 16px 20px !important;
  }

  .modal-body {
    padding: 20px 20px 24px !important;
  }

  .recurrence-body-content {
    gap: 18px !important;
  }

  .weekday-chip {
    height: 40px;
    font-size: 12.5px;
  }

  .modal-footer {
    padding: 16px 20px !important;
  }
}
</style>
