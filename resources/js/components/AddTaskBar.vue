<template>
  <div class="add-task-wrapper" dir="rtl">
    <!-- Live NLP Quick Entry Preview Chips -->
    <div v-if="parsedPreview.hasEntities" class="quick-entry-preview">
      <span class="preview-label">تشخیص خودکار:</span>

      <span v-if="parsedPreview.dueDate" class="nlp-chip date">
        <AppIcon name="calendar-1" size="14" /> {{ parsedPreview.dateTextFa }}
        <button type="button" @click="clearParsed('date')" title="حذف">✕</button>
      </span>

      <span v-if="parsedPreview.dueTime" class="nlp-chip time">
        <AppIcon name="clock" size="14" /> {{ toPersianDigits(parsedPreview.dueTime) }}
        <button type="button" @click="clearParsed('time')" title="حذف">✕</button>
      </span>

      <span v-if="parsedPreview.recurrencePattern && parsedPreview.recurrencePattern !== 'none'" class="nlp-chip recurrence">
        <AppIcon name="repeat" size="14" /> {{ parsedPreview.recurrenceLabelFa }}
        <button type="button" @click="clearParsed('recurrence')" title="حذف">✕</button>
      </span>

      <span v-if="parsedPreview.important" class="nlp-chip important">
        <AppIcon name="star" type="bulk" size="14" /> مهم
        <button type="button" @click="clearParsed('important')" title="حذف">✕</button>
      </span>

      <span v-for="tag in parsedPreview.tags" :key="tag" class="nlp-chip tag">
        <AppIcon name="tag" size="12" /> #{{ tag }}
        <button type="button" @click="removeParsedTag(tag)" title="حذف">✕</button>
      </span>
    </div>

    <div class="add-task-bar">
      <!-- Input Row -->
      <div class="add-task-input-row">
        <AppIcon name="add" size="20" color="var(--primary)" class="add-icon-lead" />

        <!-- Main Input with Real-time NLP parsing -->
        <input
          type="text"
          id="newTaskInput"
          ref="inputRef"
          v-model="rawInput"
          placeholder="یک کار جدید اضافه کنید (مثال: فردا ساعت ۹ جلسه)..."
          @keydown.enter="submitTask"
        />

        <button type="button" class="btn-add" @click="submitTask">افزودن</button>
      </div>

      <!-- Controls Row -->
      <div class="add-task-controls-row">
        <!-- Category Selector Trigger -->
        <div class="relative category-selector">
          <button
            type="button"
            ref="catBtnRef"
            class="cat-select-btn"
            @click="toggleCatDropdown"
            :title="'دسته‌بندی: ' + selectedCategoryName"
            aria-label="انتخاب دسته‌بندی"
            aria-haspopup="dialog"
            :aria-expanded="catDropdownOpen"
          >
            <span
              class="cat-dot"
              :style="{ backgroundColor: selectedCategoryColor }"
            ></span>
            <span class="cat-label">{{ selectedCategoryName }}</span>
          </button>
        </div>

        <!-- Teleported Category Dropdown / Mobile Bottom Sheet -->
        <Teleport to="body">
          <div
            v-if="catDropdownOpen"
            class="cat-picker-backdrop"
            @click="catDropdownOpen = false"
          ></div>

          <div
            v-if="catDropdownOpen"
            class="cat-picker-panel"
            :class="{ 'is-mobile-sheet': isMobileCat }"
            :style="catPopoverStyle"
            role="dialog"
            aria-modal="true"
            aria-label="انتخاب دسته‌بندی"
            dir="rtl"
            @keydown.esc="catDropdownOpen = false"
          >
            <!-- Mobile drag handle -->
            <div v-if="isMobileCat" class="cat-sheet-handle-bar">
              <div class="cat-sheet-handle"></div>
            </div>

            <!-- Header -->
            <div class="cat-sheet-header">
              <div class="cat-sheet-title">
                <AppIcon name="folder" size="18" color="var(--primary)" />
                <span>انتخاب دسته‌بندی</span>
              </div>
              <button type="button" class="cat-sheet-close-btn" @click="catDropdownOpen = false" title="بستن">✕</button>
            </div>

            <!-- List -->
            <div class="cat-sheet-list">
              <div
                class="cat-sheet-item cat-dropdown-item"
                :class="{ active: selectedCategoryId === null }"
                @click="selectCategory(null)"
              >
                <span class="cat-dot" style="background-color: #94a3b8;"></span>
                <span class="cat-sheet-item-name">بدون دسته‌بندی</span>
                <span v-if="selectedCategoryId === null" class="cat-sheet-check">✓</span>
              </div>

              <div
                v-for="cat in tasksStore.categories"
                :key="cat.id"
                class="cat-sheet-item cat-dropdown-item"
                :class="{ active: selectedCategoryId === cat.id }"
                @click="selectCategory(cat.id)"
              >
                <span class="cat-dot" :style="{ backgroundColor: cat.color || '#3b82f6' }"></span>
                <span class="cat-sheet-item-name">{{ cat.name }}</span>
                <span v-if="selectedCategoryId === cat.id" class="cat-sheet-check">✓</span>
              </div>
            </div>

            <div class="cat-sheet-footer">
              <button
                type="button"
                class="cat-manage-action-btn cat-manage-btn"
                @click="openCategoryManager"
              >
                <AppIcon name="setting-2" size="16" />
                <span>+ مدیریت دسته‌ها</span>
              </button>
            </div>
          </div>
        </Teleport>

        <!-- Recurrence Button -->
        <button
          type="button"
          id="newTaskRecurrenceBtn"
          :class="['recurrence-trigger-btn', hasRecurrence ? 'active' : '']"
          @click="openRecurrenceModal"
          :title="recurrenceTooltip"
          aria-label="تنظیم تکرار برنامه"
        >
          <span class="recurrence-icon inline-flex items-center">
            <AppIcon name="repeat" :type="hasRecurrence ? 'bulk' : 'linear'" size="16" />
          </span>
          <span class="recurrence-text">{{ recurrenceButtonLabel }}</span>
          <span v-if="hasRecurrence" class="recurrence-active-dot"></span>
        </button>

        <!-- Date Picker -->
        <JalaliDatePicker
          id="newTaskDate"
          v-model="dueDate"
          placeholder="تاریخ"
        />

        <!-- Time Picker (Compact Icon-Only When Empty) -->
        <PersianTimePicker
          id="newTaskTime"
          v-model="dueTime"
          title="انتخاب ساعت"
          :compact="true"
          :drop-up="true"
        />

        <!-- Alarm Toggle -->
        <button
          type="button"
          id="newTaskAlarmBtn"
          :class="['alarm-toggle-btn', alarmEnabled ? 'active' : '']"
          @click="toggleAlarm"
          title="فعال‌سازی آلارم سر ساعت"
        >
          <AppIcon name="notification" :type="alarmEnabled ? 'bulk' : 'linear'" size="15" />
          <span>آلارم</span>
        </button>

        <!-- Period Horizon -->
        <AppSelect
          id="newTaskPeriod"
          v-model="period"
          :options="periodOptions"
          :drop-up="true"
        />
      </div>
    </div>

    <!-- Recurrence Modal Component -->
    <RecurrenceModal
      :is-open="recurrenceModalOpen"
      :initial-pattern="recurrenceRule.recurrence_pattern"
      :initial-interval="recurrenceRule.recurrence_interval"
      :initial-weekdays="recurrenceRule.recurrence_weekdays"
      :initial-end-date="recurrenceRule.recurrence_end_date"
      :initial-count="recurrenceRule.recurrence_count"
      @close="recurrenceModalOpen = false"
      @save="onRecurrenceSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { getLocalISODate, toPersianDigits, formatPersianShortDate } from '@/utils/jalali';
import { parsePersianQuickEntry } from '@/utils/quickParser';
import JalaliDatePicker from '@/components/JalaliDatePicker.vue';
import PersianTimePicker from '@/components/PersianTimePicker.vue';
import AppSelect from '@/components/AppSelect.vue';
import RecurrenceModal from '@/components/RecurrenceModal.vue';

const tasksStore = useTasksStore();

const rawInput = ref('');
const dueDate = ref(getLocalISODate());
const dueTime = ref('');
const alarmEnabled = ref(false);
const period = ref('daily');
const selectedCategoryId = ref(null);
const catDropdownOpen = ref(false);
const catBtnRef = ref(null);
const isMobileCat = ref(false);
const catPopoverTop = ref(0);
const catPopoverLeft = ref(0);
const inputRef = ref(null);

function checkMobileCat() {
  if (typeof window !== 'undefined') {
    isMobileCat.value = window.innerWidth <= 640;
  }
}

function updateCatPosition() {
  checkMobileCat();
  if (isMobileCat.value || !catBtnRef.value) return;
  const rect = catBtnRef.value.getBoundingClientRect();
  catPopoverLeft.value = Math.max(12, rect.right - 180);
  catPopoverTop.value = Math.max(12, rect.top - 230);
}

function toggleCatDropdown() {
  catDropdownOpen.value = !catDropdownOpen.value;
  if (catDropdownOpen.value) {
    nextTick(() => {
      updateCatPosition();
    });
  }
}

const catPopoverStyle = computed(() => {
  if (isMobileCat.value) {
    return {
      position: 'fixed',
      zIndex: 10050,
      bottom: '0',
      left: '0',
      right: '0',
      top: 'auto',
      width: '100%',
      maxWidth: '100%',
      margin: '0 auto',
      borderRadius: '24px 24px 0 0',
      boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.28)'
    };
  }
  return {
    position: 'fixed',
    zIndex: 10050,
    top: `${catPopoverTop.value}px`,
    left: `${catPopoverLeft.value}px`,
    width: '180px'
  };
});

const recurrenceModalOpen = ref(false);
const recurrenceRule = ref({
  recurrence_pattern: 'none',
  recurrence_interval: 1,
  recurrence_weekdays: null,
  recurrence_end_date: null,
  recurrence_count: null
});

// Dismissed NLP entities during live typing
const dismissedEntities = ref(new Set());

const periodOptions = [
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهیانه' }
];

// Live NLP parsing
const parsedResult = computed(() => {
  return parsePersianQuickEntry(rawInput.value);
});

const parsedPreview = computed(() => {
  const p = parsedResult.value;
  if (!p) {
    return {
      hasEntities: false,
      dueDate: null,
      dateTextFa: '',
      dueTime: null,
      recurrencePattern: null,
      recurrenceLabelFa: '',
      important: false,
      tags: []
    };
  }

  const dismissed = dismissedEntities.value;

  const validDate = p.dueDate && !dismissed.has('date') ? p.dueDate : null;
  const validTime = p.dueTime && !dismissed.has('time') ? p.dueTime : null;
  const recPat = p.recurrence?.pattern || p.recurrence_pattern;
  const validRecurrence = recPat && recPat !== 'none' && !dismissed.has('recurrence') ? recPat : null;
  const validImportant = p.important && !dismissed.has('important');
  const validTags = (p.tags || []).filter(t => !dismissed.has(`tag_${t}`));

  const hasEntities = Boolean(validDate || validTime || validRecurrence || validImportant || validTags.length > 0);

  let recurrenceLabelFa = '';
  if (validRecurrence === 'daily') recurrenceLabelFa = 'روزانه';
  else if (validRecurrence === 'weekly') recurrenceLabelFa = 'هفتگی';
  else if (validRecurrence === 'monthly') recurrenceLabelFa = 'ماهانه';

  return {
    hasEntities,
    dueDate: validDate,
    dateTextFa: validDate ? formatPersianShortDate(validDate) : '',
    dueTime: validTime,
    recurrencePattern: validRecurrence,
    recurrenceLabelFa,
    important: validImportant,
    tags: validTags
  };
});

function clearParsed(field) {
  dismissedEntities.value.add(field);
}

function removeParsedTag(tag) {
  dismissedEntities.value.add(`tag_${tag}`);
}

watch(rawInput, (newVal) => {
  if (!newVal.trim()) {
    dismissedEntities.value.clear();
  }
});

// Auto-fill inputs when NLP detects entities
watch(() => parsedPreview.value.dueDate, (newDate) => {
  if (newDate) dueDate.value = newDate;
});

watch(() => parsedPreview.value.dueTime, (newTime) => {
  if (newTime) {
    dueTime.value = newTime;
    alarmEnabled.value = true;
  }
});

watch(() => parsedPreview.value.recurrencePattern, (newPattern) => {
  if (newPattern) {
    recurrenceRule.value.recurrence_pattern = newPattern;
    if (newPattern === 'weekly' && parsedResult.value.recurrence_weekdays) {
      recurrenceRule.value.recurrence_weekdays = parsedResult.value.recurrence_weekdays;
    }
  }
});

const selectedCategory = computed(() => {
  if (!selectedCategoryId.value) return null;
  return tasksStore.categories.find(c => c.id === selectedCategoryId.value) || null;
});

const selectedCategoryName = computed(() => {
  return selectedCategory.value ? selectedCategory.value.name : 'دسته';
});

const selectedCategoryColor = computed(() => {
  return selectedCategory.value ? selectedCategory.value.color || '#3b82f6' : '#94a3b8';
});

function selectCategory(id) {
  selectedCategoryId.value = id;
  catDropdownOpen.value = false;
}

function openCategoryManager() {
  catDropdownOpen.value = false;
  tasksStore.categoryModalOpen = true;
}

const hasRecurrence = computed(() => {
  return recurrenceRule.value.recurrence_pattern && recurrenceRule.value.recurrence_pattern !== 'none';
});

const recurrenceButtonLabel = computed(() => {
  if (!hasRecurrence.value) return 'تکرار';
  switch (recurrenceRule.value.recurrence_pattern) {
    case 'daily': return 'روزانه';
    case 'weekly': return 'هفتگی';
    case 'monthly': return 'ماهانه';
    case 'yearly': return 'سالانه';
    default: return 'تکرارشونده';
  }
});

const recurrenceTooltip = computed(() => {
  if (!hasRecurrence.value) return 'تنظیم تکرار خودکار (روزانه، هفتگی، ماهانه)';
  return `الگوی تکرار فعال است: ${recurrenceButtonLabel.value}`;
});

function openRecurrenceModal() {
  recurrenceModalOpen.value = true;
}

function onRecurrenceSaved(rule) {
  recurrenceRule.value = rule;
}

watch(() => tasksStore.currentView, (view) => {
  if (['daily', 'weekly', 'monthly'].includes(view)) {
    period.value = view;
  }
  if (view === 'myday') {
    dueDate.value = getLocalISODate();
  }
  if (view === 'daydetail' && tasksStore.selectedDateISO) {
    dueDate.value = tasksStore.selectedDateISO;
  }
});

function toggleAlarm() {
  alarmEnabled.value = !alarmEnabled.value;
  if (alarmEnabled.value && !dueTime.value) {
    const nextHour = new Date(Date.now() + 3600000);
    dueTime.value = String(nextHour.getHours()).padStart(2, '0') + ':00';
  }
}

async function submitTask() {
  const preview = parsedPreview.value;
  let finalTitle = rawInput.value.trim();

  // If NLP extracted entities and preview has them, clean the title
  if (preview.hasEntities && parsedResult.value.title) {
    finalTitle = parsedResult.value.title;
  }

  if (!finalTitle) return;

  const finalDueDate = preview.dueDate || dueDate.value || getLocalISODate();
  const finalDueTime = preview.dueTime || dueTime.value || '';
  const finalImportant = preview.important || tasksStore.currentView === 'important';

  const payload = {
    title: finalTitle,
    period: period.value,
    dueDate: finalDueDate,
    due_date: finalDueDate,
    dueTime: finalDueTime,
    due_time: finalDueTime,
    alarmEnabled: (alarmEnabled.value || Boolean(preview.dueTime)) && Boolean(finalDueTime),
    alarm_enabled: (alarmEnabled.value || Boolean(preview.dueTime)) && Boolean(finalDueTime),
    important: finalImportant,
    myDay: finalDueDate === getLocalISODate(),
    my_day: finalDueDate === getLocalISODate(),
    category_id: selectedCategoryId.value,
    tags: preview.tags || [],
    notes: '',
  };

  // Add recurrence fields if active
  if (hasRecurrence.value) {
    payload.recurrence_pattern = recurrenceRule.value.recurrence_pattern;
    payload.recurrence_interval = recurrenceRule.value.recurrence_interval || 1;
    payload.recurrence_weekdays = recurrenceRule.value.recurrence_weekdays;
    payload.recurrence_end_date = recurrenceRule.value.recurrence_end_date;
    payload.recurrence_count = recurrenceRule.value.recurrence_count;
  }

  await tasksStore.addTask(payload);

  // Reset inputs
  rawInput.value = '';
  dueTime.value = '';
  alarmEnabled.value = false;
  dismissedEntities.value.clear();
  recurrenceRule.value = {
    recurrence_pattern: 'none',
    recurrence_interval: 1,
    recurrence_weekdays: null,
    recurrence_end_date: null,
    recurrence_count: null
  };

  if (tasksStore.currentView === 'myday') {
    dueDate.value = getLocalISODate();
  }
}

function handleGlobalClick(e) {
  if (!e.target.closest('.category-selector') && !e.target.closest('.cat-picker-panel')) {
    catDropdownOpen.value = false;
  }
}

onMounted(() => {
  tasksStore.fetchCategories();
  checkMobileCat();
  document.addEventListener('click', handleGlobalClick);
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', checkMobileCat);
    window.addEventListener('scroll', updateCatPosition, true);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkMobileCat);
    window.removeEventListener('scroll', updateCatPosition, true);
  }
});

defineExpose({
  focus: () => inputRef.value?.focus()
});
</script>

<style scoped>
.quick-entry-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 12px;
  margin-bottom: 4px;
  background: var(--bg-card);
  border: 1px dashed var(--primary);
  border-radius: 10px;
  font-size: 11.5px;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

.preview-label {
  color: var(--primary);
  font-weight: 700;
  font-size: 11px;
}

.nlp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-input);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.nlp-chip.date {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-color: rgba(59, 130, 246, 0.3);
}

.nlp-chip.time {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.3);
}

.nlp-chip.recurrence {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  border-color: rgba(139, 92, 246, 0.3);
}

.nlp-chip.important {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.3);
}

.nlp-chip.tag {
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
  border-color: rgba(14, 165, 233, 0.3);
}

.nlp-chip button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  font-size: 10px;
  opacity: 0.6;
}

.nlp-chip button:hover {
  opacity: 1;
}

.category-selector {
  position: relative;
}

.cat-select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.cat-select-btn:hover {
  border-color: var(--primary);
}

.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-label {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-dropdown {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 6px;
  width: 170px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 6px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-main);
  cursor: pointer;
}

.cat-dropdown-item:hover {
  background: var(--bg-input);
}

.cat-dropdown-item.active {
  background: var(--primary);
  color: #fff;
}

.cat-dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

.cat-manage-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 11.5px;
  font-weight: 600;
  padding: 6px 8px;
  text-align: right;
  cursor: pointer;
  border-radius: 6px;
}

.cat-manage-btn:hover {
  background: var(--bg-input);
}

.recurrence-trigger-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 12px;
  background: var(--bg-input, #F8FAFC);
  border: 1px solid var(--border-color, #E2E8F0);
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted, #64748B);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  user-select: none;
}

.recurrence-trigger-btn:hover:not(:disabled) {
  border-color: var(--primary, #6D28D9);
  color: var(--primary, #6D28D9);
  background: var(--primary-light, #EDE9FE);
  transform: translateY(-1px);
}

.recurrence-trigger-btn.active {
  background: rgba(109, 40, 217, 0.12);
  border-color: var(--primary, #7C3AED);
  color: var(--primary, #6D28D9);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(109, 40, 217, 0.18);
}

.recurrence-trigger-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recurrence-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary, #6D28D9);
  display: inline-block;
  margin-right: 2px;
}

.add-task-input-row,
.add-task-controls-row {
  display: contents;
}

@media (max-width: 768px) {
  .add-task-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .add-task-input-row input[type="text"] {
    flex: 1;
    min-width: 0;
  }

  .add-task-controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .add-task-controls-row::-webkit-scrollbar {
    display: none;
  }

  .add-icon-lead {
    flex-shrink: 0;
  }
}
</style>

<style>
/* Teleported Category Panel & Mobile Bottom Sheet Styles */
.cat-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 10049;
  animation: catFadeIn 0.18s ease;
}

@keyframes catFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cat-picker-panel {
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  padding: 8px;
  z-index: 10050;
  animation: catPopIn 0.15s ease-out;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

[data-mode="dark"] .cat-picker-panel,
.dark .cat-picker-panel {
  background: #0F172A;
  border-color: rgba(51, 65, 85, 0.8);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}

@keyframes catPopIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile Bottom Sheet Layout */
.cat-picker-panel.is-mobile-sheet {
  border-radius: 24px 24px 0 0 !important;
  border-bottom: none !important;
  padding: 12px 18px 24px 18px !important;
  animation: catSheetSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes catSheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.cat-sheet-handle-bar {
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
}

.cat-sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 9999px;
  background: var(--border, #CBD5E1);
}

.cat-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 6px;
}

.cat-sheet-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.cat-sheet-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
}

.cat-sheet-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}

.cat-sheet-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-main);
  transition: all 0.15s;
}

.cat-sheet-item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

.cat-sheet-item.active {
  background: var(--primary-light, #ede9fe);
  color: var(--primary);
  font-weight: 700;
}

[data-mode="dark"] .cat-sheet-item.active,
.dark .cat-sheet-item.active {
  background: rgba(109, 40, 217, 0.25);
  color: var(--primary);
}

.cat-sheet-item-name {
  flex: 1;
}

.cat-sheet-check {
  font-size: 12px;
  font-weight: bold;
  color: var(--primary);
}

.cat-sheet-footer {
  border-top: 1px solid var(--border);
  padding-top: 6px;
  margin-top: 4px;
}

.cat-manage-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  transition: background 0.15s;
}

.cat-manage-action-btn:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
}
</style>
