<template>
  <aside :class="['detail-drawer', isOpen ? 'open' : '']" dir="rtl" aria-label="جزئیات و تنظیمات کار">
    <div class="drawer-header">
      <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">جزئیات و تنظیمات کار</span>
      <button class="btn-icon-text btn-icon-close" style="padding: 4px 8px;" @click="close" title="بستن کشو" aria-label="بستن کشو">
        <AppIcon name="close-circle" size="18" />
      </button>
    </div>

    <div v-if="task" class="flex flex-col flex-1 overflow-y-auto gap-3">
      <!-- Title Input -->
      <input
        type="text"
        class="drawer-title-input"
        :value="task.title"
        @change="updateTitle($event.target.value)"
      />

      <!-- Recurring Occurrence Notice Banner -->
      <div v-if="task.is_occurrence" class="occurrence-banner">
        <div class="flex items-center gap-1.5 font-bold text-xs text-purple-700 dark:text-purple-300">
          <AppIcon name="repeat" size="14" />
          <span>این رویداد تکرارشونده مربوط به تاریخ {{ occurrenceDateFa }} است.</span>
        </div>
        <div class="flex gap-2 mt-2">
          <button
            type="button"
            class="occurrence-btn"
            @click="handleDetachOccurrence"
          >
            🎯 جداسازی و ویرایش مستقل
          </button>
          <button
            type="button"
            class="occurrence-btn danger"
            @click="handleSkipOccurrence"
          >
            ⏭️ رد کردن این رویداد
          </button>
        </div>
      </div>

      <!-- Date, Time & Alarm -->
      <div class="drawer-box">
        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted);">زمان‌بندی و یادآور (آلارم)</span>
        <div class="drawer-row">
          <span>تاریخ انجام:</span>
          <JalaliDatePicker
            :model-value="task.dueDate || task.due_date || ''"
            @update:model-value="updateDate"
          />
        </div>
        <div class="drawer-row">
          <span>ساعت:</span>
          <PersianTimePicker
            :model-value="task.dueTime || task.due_time || ''"
            @update:model-value="updateTime"
          />
        </div>
        <div class="drawer-row">
          <span>زنگ هشدار سر ساعت:</span>
          <button
            type="button"
            :class="['alarm-toggle-btn', isAlarmActive ? 'active' : '']"
            @click="toggleAlarm"
          >
            <AppIcon name="notification" :type="isAlarmActive ? 'bulk' : 'linear'" size="14" />
            <span>{{ isAlarmActive ? 'فعال است' : 'غیرفعال' }}</span>
          </button>
        </div>
        <div v-if="isAlarmActive" class="drawer-row" style="margin-top: 6px;">
          <span>زمان هشدار:</span>
          <AppSelect
            class="flex-1"
            variant="form"
            :model-value="Number(task.reminderOffsetMinutes ?? task.reminder_offset_minutes ?? 0)"
            :options="reminderOffsetOptions"
            @update:model-value="updateReminderOffset"
          />
        </div>
      </div>

      <!-- Recurrence Settings -->
      <div class="drawer-box">
        <div class="flex items-center justify-between">
          <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted);">تکرار برنامه</span>
          <button
            v-if="!task.is_occurrence"
            type="button"
            class="text-xs text-primary font-semibold hover:underline"
            @click="recurrenceModalOpen = true"
          >
            تنظیم تکرار
          </button>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <AppIcon name="repeat" size="14" />
          <span class="text-xs font-semibold text-main">{{ recurrenceDescriptionFa }}</span>
        </div>
      </div>

      <!-- Category & Tags -->
      <div class="drawer-box">
        <div class="flex items-center justify-between">
          <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted);">دسته‌بندی و برچسب‌ها</span>
          <button
            type="button"
            class="text-xs text-primary font-semibold hover:underline"
            @click="tasksStore.categoryModalOpen = true"
          >
            مدیریت دسته‌ها
          </button>
        </div>

        <!-- Category Dropdown -->
        <div class="drawer-row mt-1">
          <span>دسته:</span>
          <AppSelect
            class="flex-1"
            variant="form"
            :model-value="task.category_id || task.category?.id || ''"
            :options="categoryOptions"
            @update:model-value="updateCategory"
          />
        </div>

        <!-- Tags Chips & Input -->
        <div class="mt-2">
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="tag in taskTags"
              :key="tag.id || tag.name || tag"
              class="drawer-tag-chip"
            >
              #{{ tag.name || tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                title="حذف برچسب"
              >✕</button>
            </span>
          </div>

          <div class="flex gap-2">
            <input
              type="text"
              v-model="newTagInput"
              class="form-input flex-1 text-xs"
              placeholder="برچسب جدید بنویسید و Enter بزنید..."
              @keydown.enter="handleAddTag"
            />
            <button
              type="button"
              class="btn-add text-xs px-3 py-1"
              @click="handleAddTag"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <!-- Subtasks -->
      <div class="drawer-box subtasks-box">
        <div class="subtasks-box-header">
          <span class="subtasks-box-title">
            <span>مراحل انجام (Subtasks)</span>
            <span v-if="totalSubtasksCount > 0" class="subtasks-count-pill">
              {{ toPersianDigits(completedSubtasksCount) }} از {{ toPersianDigits(totalSubtasksCount) }}
            </span>
          </span>
          <span v-if="totalSubtasksCount > 0 && completedSubtasksCount === totalSubtasksCount" class="subtasks-all-done-tag">
            <AppIcon name="tick-circle" size="13" color="#10B981" />
            <span>تکمیل</span>
          </span>
        </div>

        <div v-if="subtasksList.length > 0" class="subtasks-list-container">
          <div
            v-for="sub in subtasksList"
            :key="sub.id"
            class="subtask-row-item"
            :class="{ 'done': sub.is_done || sub.done }"
          >
            <input
              type="checkbox"
              class="subtask-check-input"
              :checked="Boolean(sub.is_done || sub.done)"
              :aria-label="`علامت‌زدن ${sub.text || sub.title}`"
              @change="handleToggleSubtask(sub.id)"
            />

            <!-- Editing input vs text display -->
            <div class="subtask-text-container" @dblclick="startEditSubtask(sub)">
              <input
                v-if="editingSubtaskId === sub.id"
                ref="editSubtaskInputRef"
                v-model="editingSubtaskText"
                type="text"
                class="subtask-edit-input"
                @keydown.enter.prevent="saveEditSubtask(sub.id)"
                @keydown.esc.prevent="cancelEditSubtask"
                @blur="saveEditSubtask(sub.id)"
              />
              <span
                v-else
                class="subtask-label"
                :title="'برای ویرایش دوبار کلیک کنید'"
              >
                {{ sub.text || sub.title }}
              </span>
            </div>

            <div class="subtask-item-actions">
              <button
                v-if="editingSubtaskId !== sub.id"
                type="button"
                class="btn-subtask-ctrl"
                title="ویرایش مرحله"
                aria-label="ویرایش مرحله"
                @click="startEditSubtask(sub)"
              >
                <AppIcon name="edit-2" size="13" />
              </button>
              <button
                type="button"
                class="btn-subtask-ctrl danger"
                title="حذف مرحله"
                aria-label="حذف مرحله"
                @click="handleDeleteSubtask(sub.id)"
              >
                <AppIcon name="close-circle" size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="subtask-input-bar">
          <input
            v-model="newSubtaskText"
            type="text"
            class="subtask-new-input"
            placeholder="افزودن مرحله جدید (Enter برای ثبت)..."
            :disabled="isAddingSubtask"
            @keydown.enter.prevent="handleAddSubtask"
          />
          <button
            type="button"
            class="btn-subtask-add"
            :disabled="isAddingSubtask || !newSubtaskText.trim()"
            title="افزودن مرحله"
            aria-label="افزودن مرحله"
            @click="handleAddSubtask"
          >
            <AppIcon v-if="!isAddingSubtask" name="add" size="16" />
            <span v-else style="font-size: 11px;">...</span>
          </button>
        </div>
      </div>

      <!-- Period Horizon -->
      <div class="drawer-box">
        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted);">افق زمانی</span>
        <AppSelect
          style="width: 100%;"
          :model-value="task.period || 'daily'"
          :options="periodOptions"
          @update:model-value="updatePeriod"
        />
      </div>

      <!-- Notes Textarea -->
      <div class="drawer-box" style="flex: 1;">
        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted);">یادداشت و توضیحات</span>
        <textarea
          class="drawer-notes"
          placeholder="توضیحات تکمیلی را اینجا بنویسید..."
          :value="task.notes"
          @input="updateNotes($event.target.value)"
        ></textarea>
      </div>

      <div class="drawer-footer">
        <span
          class="drawer-created-at"
          style="font-size: 11px; color: var(--text-muted);"
          :title="creationTimeTooltip"
        >
          {{ creationDateText }}
        </span>
        <button class="btn-delete" @click="handleDelete">
          <AppIcon name="trash" size="15" />
          <span>{{ task.is_occurrence ? 'رد کردن این رویداد' : 'حذف کار' }}</span>
        </button>
      </div>
    </div>

    <!-- Recurrence Modal in Drawer -->
    <RecurrenceModal
      :is-open="recurrenceModalOpen"
      :initial-pattern="task?.recurrence_pattern || 'none'"
      :initial-interval="task?.recurrence_interval || 1"
      :initial-weekdays="task?.recurrence_weekdays || []"
      :initial-end-date="task?.recurrence_end_date"
      :initial-count="task?.recurrence_count"
      @close="recurrenceModalOpen = false"
      @save="onRecurrenceSaved"
    />
  </aside>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import JalaliDatePicker from '@/components/JalaliDatePicker.vue';
import PersianTimePicker from '@/components/PersianTimePicker.vue';
import AppSelect from '@/components/AppSelect.vue';
import RecurrenceModal from '@/components/RecurrenceModal.vue';
import { formatCreationDate, formatPersianShortDate, toPersianDigits } from '@/utils/jalali';

const tasksStore = useTasksStore();
const newSubtaskText = ref('');
const isAddingSubtask = ref(false);
const editingSubtaskId = ref(null);
const editingSubtaskText = ref('');
const editSubtaskInputRef = ref(null);
const newTagInput = ref('');
const recurrenceModalOpen = ref(false);

const subtasksList = computed(() => {
  if (!task.value) return [];
  return task.value.subtasks || [];
});

const totalSubtasksCount = computed(() => subtasksList.value.length);
const completedSubtasksCount = computed(() => {
  return subtasksList.value.filter(s => Boolean(s.is_done || s.done)).length;
});

const periodOptions = [
  { value: 'daily', label: 'کار روزانه' },
  { value: 'weekly', label: 'برنامه هفتگی' },
  { value: 'monthly', label: 'هدف ماهیانه' }
];

const reminderOffsetOptions = [
  { value: 0, label: 'سر ساعت موعد' },
  { value: 5, label: '۵ دقیقه قبل' },
  { value: 15, label: '۱۵ دقیقه قبل' },
  { value: 30, label: '۳۰ دقیقه قبل' },
  { value: 60, label: '۱ ساعت قبل' },
  { value: 1440, label: '۱ روز قبل' }
];

const categoryOptions = computed(() => {
  const list = [{ value: '', label: 'بدون دسته‌بندی' }];
  for (const cat of tasksStore.categories) {
    list.push({ value: cat.id, label: cat.name });
  }
  return list;
});

const isOpen = computed(() => Boolean(tasksStore.selectedTaskId));
const task = computed(() => tasksStore.selectedTask);

const occurrenceDateFa = computed(() => {
  if (!task.value?.occurrence_date) return '';
  return formatPersianShortDate(task.value.occurrence_date);
});

const taskTags = computed(() => {
  return task.value?.tags || [];
});

const recurrenceDescriptionFa = computed(() => {
  if (!task.value) return 'بدون تکرار';
  const pat = task.value.recurrence_pattern;
  if (!pat || pat === 'none') return 'بدون تکرار (یک‌باره)';

  const intervalFa = toPersianDigits(task.value.recurrence_interval || 1);
  if (pat === 'daily') {
    return task.value.recurrence_interval > 1 ? `هر ${intervalFa} روز یک‌بار` : 'تکرار هر روز';
  }
  if (pat === 'weekly') {
    return task.value.recurrence_interval > 1 ? `هر ${intervalFa} هفته یک‌بار` : 'تکرار هر هفته';
  }
  if (pat === 'monthly') {
    return task.value.recurrence_interval > 1 ? `هر ${intervalFa} ماه یک‌بار` : 'تکرار هر ماه';
  }
  if (pat === 'yearly') {
    return task.value.recurrence_interval > 1 ? `هر ${intervalFa} سال یک‌بار` : 'تکرار سالانه';
  }
  return 'تکرارشونده';
});

const creationDateText = computed(() => {
  if (!task.value) return '';
  const raw = task.value.created_at || task.value.createdAt;
  if (!raw) return '';
  const formatted = formatCreationDate(raw);
  return formatted ? `ایجاد شده: ${formatted}` : '';
});

const creationTimeTooltip = computed(() => {
  if (!task.value) return '';
  const raw = task.value.created_at || task.value.createdAt;
  if (!raw) return '';
  const withTime = formatCreationDate(raw, { withTime: true });
  return withTime ? `زمان ایجاد: ${withTime}` : '';
});

const isAlarmActive = computed(() => {
  return Boolean(task.value?.alarmEnabled || task.value?.alarm_enabled);
});

function close() {
  tasksStore.selectedTaskId = null;
}

function updateTitle(val) {
  if (task.value && val.trim()) {
    tasksStore.updateTask(task.value.id, { title: val.trim() });
  }
}

function updateDate(val) {
  if (task.value) {
    tasksStore.updateTask(task.value.id, {
      dueDate: val,
      due_date: val,
      alarm_triggered: false
    });
  }
}

function updateTime(val) {
  if (task.value) {
    tasksStore.updateTask(task.value.id, {
      dueTime: val,
      due_time: val,
      alarm_triggered: false
    });
  }
}

function toggleAlarm() {
  if (!task.value) return;
  const current = isAlarmActive.value;
  const newTime = (!current && !(task.value.dueTime || task.value.due_time)) ? '09:00' : (task.value.dueTime || task.value.due_time);

  tasksStore.updateTask(task.value.id, {
    alarmEnabled: !current,
    alarm_enabled: !current,
    dueTime: newTime,
    due_time: newTime,
    alarm_triggered: false
  });
}

function updateReminderOffset(val) {
  if (task.value) {
    tasksStore.updateTask(task.value.id, {
      reminderOffsetMinutes: Number(val),
      reminder_offset_minutes: Number(val),
      alarm_triggered: false
    });
  }
}

function updatePeriod(val) {
  if (task.value) {
    tasksStore.updateTask(task.value.id, { period: val });
  }
}

function updateNotes(val) {
  if (task.value) {
    tasksStore.updateTask(task.value.id, { notes: val });
  }
}

function updateCategory(catId) {
  if (!task.value) return;
  tasksStore.updateTask(task.value.id, {
    category_id: catId ? parseInt(catId, 10) : null
  });
}

function onRecurrenceSaved(rule) {
  if (!task.value) return;
  tasksStore.updateTask(task.value.id, rule);
}

async function handleAddTag() {
  const text = newTagInput.value.trim().replace(/^#/, '');
  if (!text || !task.value) return;

  const currentTags = (task.value.tags || []).map(t => (typeof t === 'string' ? t : t.name));
  if (!currentTags.includes(text)) {
    const updated = [...currentTags, text];
    await tasksStore.updateTask(task.value.id, { tags: updated });
  }
  newTagInput.value = '';
}

async function removeTag(tagToRemove) {
  if (!task.value) return;
  const nameToRemove = typeof tagToRemove === 'string' ? tagToRemove : tagToRemove.name;
  const updated = (task.value.tags || [])
    .map(t => (typeof t === 'string' ? t : t.name))
    .filter(name => name !== nameToRemove);
  await tasksStore.updateTask(task.value.id, { tags: updated });
}

async function handleDetachOccurrence() {
  if (!task.value || !task.value.is_occurrence) return;
  if (confirm('آیا می‌خواهید این رویداد را از مجموعه تکرارشونده جدا کرده و به یک کار مستقل تبدیل کنید؟')) {
    await tasksStore.editThisOccurrence(task.value.parent_id, task.value.occurrence_date, {
      title: task.value.title,
      due_time: task.value.due_time || task.value.dueTime
    });
  }
}

async function handleSkipOccurrence() {
  if (!task.value || !task.value.is_occurrence) return;
  if (confirm('آیا مطمئن هستید که می‌خواهید این یک مورد از برنامه را رد (Skip) کنید؟')) {
    await tasksStore.skipOccurrence(task.value.parent_id, task.value.occurrence_date);
  }
}

async function handleAddSubtask() {
  const t = newSubtaskText.value.trim();
  if (!t || !task.value || isAddingSubtask.value) return;

  isAddingSubtask.value = true;
  newSubtaskText.value = '';
  try {
    await tasksStore.addSubtask(task.value.id, t);
  } catch (err) {
    console.error('Error adding subtask:', err);
  } finally {
    isAddingSubtask.value = false;
  }
}

async function handleToggleSubtask(subtaskId) {
  if (!task.value) return;
  await tasksStore.toggleSubtask(task.value.id, subtaskId);
}

function startEditSubtask(sub) {
  editingSubtaskId.value = sub.id;
  editingSubtaskText.value = sub.text || sub.title || '';
  nextTick(() => {
    if (editSubtaskInputRef.value) {
      if (Array.isArray(editSubtaskInputRef.value)) {
        editSubtaskInputRef.value[0]?.focus();
      } else {
        editSubtaskInputRef.value.focus();
      }
    }
  });
}

function cancelEditSubtask() {
  editingSubtaskId.value = null;
  editingSubtaskText.value = '';
}

async function saveEditSubtask(subtaskId) {
  if (!editingSubtaskId.value) return;
  const newText = editingSubtaskText.value.trim();
  const targetId = editingSubtaskId.value;
  cancelEditSubtask();
  if (!newText) return;
  await tasksStore.updateSubtask(targetId, newText);
}

async function handleDeleteSubtask(subtaskId) {
  await tasksStore.deleteSubtask(subtaskId);
}

async function handleDelete() {
  if (!task.value) return;
  if (task.value.is_occurrence) {
    return handleSkipOccurrence();
  }
  if (confirm('این کار حذف شود؟')) {
    await tasksStore.deleteTask(task.value.id);
  }
}
</script>

<style scoped>
.occurrence-banner {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
}

.occurrence-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.occurrence-btn:hover {
  border-color: var(--primary);
}

.occurrence-btn.danger {
  color: #ef4444;
}

.occurrence-btn.danger:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
}

.form-select {
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-main);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  outline: none;
}

.form-select:focus {
  border-color: var(--primary);
}

.drawer-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.drawer-tag-chip button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  font-size: 10px;
  opacity: 0.6;
}

.drawer-tag-chip button:hover {
  opacity: 1;
}

.form-input {
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-main);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
}

.form-input:focus {
  border-color: var(--primary);
}

.subtasks-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtasks-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subtasks-box-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
}

.subtasks-count-pill {
  font-size: 10.5px;
  background: var(--bg-hover, rgba(241, 245, 249, 0.8));
  color: var(--text-muted);
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
}

.subtasks-all-done-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 700;
  color: #10b981;
}

.subtasks-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subtask-row-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--bg-hover, rgba(248, 250, 252, 0.8));
  border: 1px solid var(--border, #f1f5f9);
  transition: all 0.15s ease;
}

.subtask-row-item:hover {
  border-color: var(--border-hover, #e2e8f0);
}

.subtask-row-item.done {
  opacity: 0.7;
}

.subtask-check-input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary, #7c3aed);
  cursor: pointer;
  flex-shrink: 0;
}

.subtask-text-container {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.subtask-label {
  font-size: 12px;
  color: var(--text-main);
  word-break: break-word;
  line-height: 1.4;
  display: block;
}

.subtask-row-item.done .subtask-label {
  text-decoration: line-through;
  color: var(--text-muted);
}

.subtask-edit-input {
  width: 100%;
  font-size: 12px;
  padding: 2px 6px;
  border: 1px solid var(--primary, #7c3aed);
  border-radius: 4px;
  background: var(--bg-card, #ffffff);
  color: var(--text-main);
  outline: none;
}

.subtask-item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.btn-subtask-ctrl {
  background: none;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-subtask-ctrl:hover {
  color: var(--primary, #7c3aed);
  background: rgba(124, 58, 237, 0.08);
}

.btn-subtask-ctrl.danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.subtask-input-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.subtask-new-input {
  flex: 1;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--bg-input, #ffffff);
  color: var(--text-main);
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.subtask-new-input:focus {
  border-color: var(--primary, #7c3aed);
}

.btn-subtask-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  background: var(--primary, #7c3aed);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-subtask-add:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-subtask-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .detail-drawer {
    position: fixed !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100vh !important;
    height: 100dvh !important;
    border-radius: 0 !important;
    z-index: 1070 !important;
    padding: 16px 14px 24px !important;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.35) !important;
  }
}
</style>
