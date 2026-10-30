<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="close">
    <div class="modal-box category-modal" role="dialog" aria-modal="true" aria-labelledby="categoryModalTitle" dir="rtl">
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <AppIcon name="folder" type="bulk" size="22" color="var(--primary)" />
          <h2 id="categoryModalTitle" class="modal-title">مدیریت دسته‌بندی‌ها</h2>
        </div>
        <button class="btn-close" @click="close" title="بستن" aria-label="بستن">
          <AppIcon name="close-circle" size="18" />
        </button>
      </div>

      <div class="modal-body space-y-4">
        <!-- Add / Edit Form -->
        <div class="category-form-box">
          <span class="form-title">
            {{ editingId ? 'ویرایش دسته' : 'افزودن دسته جدید' }}
          </span>

          <div class="flex gap-2 items-center">
            <input
              type="text"
              v-model="catName"
              class="form-input flex-1"
              placeholder="نام دسته (مثلاً: کاری، شخصی، دانشگاه)..."
              @keydown.enter="saveCategory"
            />
            <button
              type="button"
              class="btn-save"
              :disabled="!catName.trim()"
              @click="saveCategory"
            >
              {{ editingId ? 'ذخیره' : 'افزودن' }}
            </button>
            <button
              v-if="editingId"
              type="button"
              class="btn-cancel"
              @click="cancelEdit"
            >
              انصراف
            </button>
          </div>

          <!-- Color Palette Picker -->
          <div class="color-picker-row">
            <span class="text-xs text-muted">رنگ نشانگر:</span>
            <div class="flex gap-2">
              <button
                v-for="c in colorPalette"
                :key="c"
                type="button"
                :class="['color-circle', selectedColor === c ? 'active' : '']"
                :style="{ backgroundColor: c }"
                @click="selectedColor = c"
                :title="c"
              ></button>
            </div>
          </div>
        </div>

        <!-- Categories List -->
        <div class="categories-list-box">
          <span class="form-title">دسته‌های موجود</span>

          <div v-if="tasksStore.categories.length === 0" class="empty-cats">
            هنوز هیچ دسته‌ای ایجاد نشده است.
          </div>

          <div v-else class="space-y-1 max-h-60 overflow-y-auto">
            <div
              v-for="cat in tasksStore.categories"
              :key="cat.id"
              class="category-list-item"
            >
              <div class="flex items-center gap-2 flex-1">
                <span
                  class="cat-color-dot"
                  :style="{ backgroundColor: cat.color || '#3b82f6' }"
                ></span>
                <span class="cat-name">{{ cat.name }}</span>
                <span class="cat-count">
                  ({{ toPersianDigits(tasksStore.categoryCounts[cat.id] || 0) }} کار)
                </span>
              </div>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="btn-icon"
                  @click="startEdit(cat)"
                  title="ویرایش"
                  aria-label="ویرایش"
                >
                  <AppIcon name="edit" size="16" />
                </button>
                <button
                  type="button"
                  class="btn-icon text-red-500"
                  @click="promptDelete(cat)"
                  title="حذف"
                  aria-label="حذف"
                >
                  <AppIcon name="trash" size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- In-App Safe Deletion Confirmation Dialog -->
      <div v-if="catToDelete" class="cat-delete-confirm-overlay" @click.self="catToDelete = null">
        <div class="cat-delete-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="catDelTitle">
          <div class="cat-delete-icon">
            <AppIcon name="trash" type="bulk" size="30" color="#ef4444" />
          </div>
          <h3 id="catDelTitle" class="cat-delete-title">تأیید حذف دسته‌بندی</h3>
          <p class="cat-delete-msg">
            آیا از حذف دسته‌بندی «<strong>{{ catToDelete.name }}</strong>» اطمینان دارید؟
          </p>
          <div class="cat-delete-safe-banner">
            <AppIcon name="info-circle" size="16" color="#0284c7" />
            <span>وظایف مرتبط با این دسته حذف نخواهند شد و به عنوان «بدون دسته‌بندی» باقی می‌مانند.</span>
          </div>
          <div class="cat-delete-actions">
            <button
              type="button"
              class="btn-cancel-delete"
              :disabled="isDeleting"
              @click="catToDelete = null"
            >
              انصراف
            </button>
            <button
              type="button"
              class="btn-confirm-delete"
              :disabled="isDeleting"
              @click="confirmDeleteCat"
            >
              {{ isDeleting ? 'در حال حذف...' : 'بله، حذف دسته' }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="close">بستن</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { toPersianDigits } from '@/utils/jalali';

const props = defineProps({
  isOpen: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const tasksStore = useTasksStore();

const colorPalette = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red/Rose
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b'  // Slate
];

const catName = ref('');
const selectedColor = ref(colorPalette[0]);
const editingId = ref(null);
const catToDelete = ref(null);
const isDeleting = ref(false);

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    e.preventDefault();
    if (catToDelete.value) {
      catToDelete.value = null;
    } else {
      close();
    }
  }
}

watch(() => props.isOpen, (open) => {
  if (typeof document === 'undefined') return;
  if (open) {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    tasksStore.fetchCategories();
    cancelEdit();
    catToDelete.value = null;
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

function startEdit(cat) {
  editingId.value = cat.id;
  catName.value = cat.name;
  selectedColor.value = cat.color || colorPalette[0];
}

function cancelEdit() {
  editingId.value = null;
  catName.value = '';
  selectedColor.value = colorPalette[0];
}

async function saveCategory() {
  const name = catName.value.trim();
  if (!name) return;

  try {
    if (editingId.value) {
      await tasksStore.updateCategory(editingId.value, {
        name,
        color: selectedColor.value
      });
    } else {
      await tasksStore.createCategory({
        name,
        color: selectedColor.value
      });
    }
    cancelEdit();
  } catch (err) {
    alert('خطا در ذخیره دسته: ' + (err.message || 'نام تکراری است'));
  }
}

function promptDelete(cat) {
  catToDelete.value = cat;
}

// Keep deleteCat as alias for backwards compatibility
function deleteCat(cat) {
  promptDelete(cat);
}

async function confirmDeleteCat() {
  if (!catToDelete.value) return;
  const cat = catToDelete.value;
  isDeleting.value = true;
  try {
    await tasksStore.deleteCategory(cat.id);
    if (editingId.value === cat.id) {
      cancelEdit();
    }
    catToDelete.value = null;
  } catch (err) {
    alert('خطا در حذف دسته: ' + (err.message || 'مشکلی رخ داد'));
  } finally {
    isDeleting.value = false;
  }
}

function close() {
  cancelEdit();
  emit('close');
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-box.category-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-main);
  animation: modalScale 0.2s ease-out;
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.category-header-icon {
  font-size: 18px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 20px;
}

.category-form-box {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-muted);
}

.form-input {
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.form-input:focus {
  border-color: var(--primary);
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.color-circle:hover {
  transform: scale(1.15);
}

.color-circle.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--primary);
  transform: scale(1.15);
}

.categories-list-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-cats {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px;
}

.category-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
}

.cat-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-name {
  font-size: 13px;
  font-weight: 600;
}

.cat-count {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 13px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: #fff;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* In-App Category Delete Confirmation */
.cat-delete-confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: var(--radius-lg, 20px);
  animation: catConfirmFade 0.15s ease-out;
}

@keyframes catConfirmFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cat-delete-confirm-box {
  background: var(--surface-solid, #ffffff);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

[data-mode="dark"] .cat-delete-confirm-box,
.dark .cat-delete-confirm-box {
  background: #0f172a;
  border-color: rgba(51, 65, 85, 0.8);
}

.cat-delete-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-mode="dark"] .cat-delete-icon,
.dark .cat-delete-icon {
  background: rgba(239, 68, 68, 0.2);
}

.cat-delete-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.cat-delete-msg {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.5;
  margin: 0;
}

.cat-delete-safe-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(2, 132, 199, 0.08);
  border: 1px solid rgba(2, 132, 199, 0.25);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 11.5px;
  color: #0369a1;
  text-align: right;
  line-height: 1.4;
}

[data-mode="dark"] .cat-delete-safe-banner,
.dark .cat-delete-safe-banner {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}

.cat-delete-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
}

.btn-cancel-delete {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-main);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel-delete:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

.btn-confirm-delete {
  flex: 1.2;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #dc2626;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-confirm-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-confirm-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
