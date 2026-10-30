<template>
  <div v-if="isOpen" class="modal-overlay show" @click.self="$emit('close')" dir="rtl">
    <div class="modal-card modal-card-lg modal-shortcuts-card" role="dialog" aria-modal="true" aria-labelledby="shortcutsModalTitle">
      <div class="modal-card-header">
        <h3 id="shortcutsModalTitle" class="flex items-center gap-2">
          <AppIcon name="keyboard" type="bulk" size="22" color="var(--primary)" />
          <span>راهنمای میانبرها و ژست‌های تسک‌یار</span>
        </h3>
        <button type="button" class="btn-icon-text" style="padding: 4px 8px;" @click="$emit('close')" title="بستن" aria-label="بستن">
          <AppIcon name="close-circle" size="18" />
        </button>
      </div>

      <div class="modal-card-body">
        <!-- Tab selector between Keyboard and Mobile Gestures -->
        <div class="shortcuts-tabs">
          <button
            type="button"
            :class="['tab-btn', activeTab === 'keyboard' ? 'active' : '']"
            @click="activeTab = 'keyboard'"
          >
            <AppIcon name="keyboard" size="16" />
            <span>کلیدهای میانبر کیبورد</span>
          </button>
          <button
            type="button"
            :class="['tab-btn', activeTab === 'touch' ? 'active' : '']"
            @click="activeTab = 'touch'"
          >
            <AppIcon name="finger-cricle" size="16" />
            <span>ژست‌های لمسی (موبایل)</span>
          </button>
        </div>

        <!-- 1. Keyboard Shortcuts Panel -->
        <div v-if="activeTab === 'keyboard'" class="tab-content">
          <p class="section-intro">
            برای افزایش سرعت عملکرد می‌توانید از کلیدهای ترکیبی زیر استفاده نمایید (با پشتیبانی کامل از کیبورد فارسی و انگلیسی). با کلیک روی هر مورد، عمل مربوطه فوراً اجرا می‌شود:
          </p>

          <div class="shortcuts-category-block" v-for="cat in SHORTCUT_CATEGORIES" :key="cat.id">
            <h4 class="category-title">{{ cat.label }}</h4>
            <div class="shortcuts-list">
              <div
                v-for="sc in getShortcutsByCategory(cat.id)"
                :key="sc.id"
                class="shortcut-item-row"
                @click="executeShortcut(sc)"
                :title="'اجرای فوری: ' + sc.title"
              >
                <div class="shortcut-info">
                  <span class="shortcut-title">{{ sc.title }}</span>
                  <span class="shortcut-desc">{{ sc.description }}</span>
                </div>
                <div class="shortcut-keys">
                  <span class="kbd-badge">{{ sc.primaryKey }}</span>
                  <span v-if="sc.secondaryKey" class="kbd-badge-secondary">{{ sc.secondaryKey }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Touch Gestures & Mobile Hints Panel -->
        <div v-else class="tab-content">
          <p class="section-intro">
            در دستگاه‌های لمسی و گوشی‌های هوشمند نیازی به کیبورد فیزیکی ندارید؛ تمامی قابلیت‌ها با ژست‌های لمسی روان در دسترس هستند:
          </p>

          <div class="gestures-grid">
            <div v-for="(g, idx) in MOBILE_GESTURES" :key="idx" class="gesture-card">
              <div class="gesture-header">
                <span class="gesture-badge">{{ g.badge }}</span>
                <span class="gesture-title">{{ g.title }}</span>
              </div>
              <p class="gesture-desc">{{ g.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-card-footer">
        <button type="button" class="btn-primary" style="background: var(--primary); color: #FFFFFF;" @click="$emit('close')">
          متوجه شدم
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import {
  SHORTCUT_CATEGORIES,
  SHORTCUT_DEFINITIONS,
  MOBILE_GESTURES
} from '@/utils/shortcuts';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'execute']);

const activeTab = ref('keyboard');

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    e.preventDefault();
    emit('close');
  }
}

watch(() => props.isOpen, (open) => {
  if (typeof document === 'undefined') return;
  if (open) {
    activeTab.value = 'keyboard';
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

function getShortcutsByCategory(catId) {
  return SHORTCUT_DEFINITIONS.filter(s => s.category === catId);
}

function executeShortcut(sc) {
  emit('execute', sc);
  emit('close');
}
</script>

<style scoped>
.modal-shortcuts-card {
  max-width: 620px;
  width: 95vw;
}

.shortcuts-tabs {
  display: flex;
  gap: 8px;
  background: var(--bg-hover, rgba(241, 245, 249, 0.7));
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: var(--bg-card, #FFFFFF);
  color: var(--primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.section-intro {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-bottom: 14px;
  line-height: 1.5;
}

.shortcuts-category-block {
  margin-bottom: 16px;
}

.category-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
  padding-right: 4px;
  border-right: 3px solid var(--primary);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shortcut-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-card, #FFFFFF);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.shortcut-item-row:hover {
  background: var(--bg-hover, #F8FAFC);
  border-color: var(--primary-light, #DDD6FE);
  transform: translateY(-1px);
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.shortcut-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.kbd-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: var(--bg-hover, #F1F5F9);
  border: 1px solid var(--border);
  border-bottom: 2px solid var(--border-dark, #CBD5E1);
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--primary);
  font-family: inherit;
  direction: ltr;
}

.kbd-badge-secondary {
  display: inline-flex;
  align-items: center;
  padding: 3px 6px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 6px;
  font-size: 10.5px;
  color: var(--text-muted);
  direction: ltr;
}

.gestures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.gesture-card {
  padding: 12px;
  background: var(--bg-card, #FFFFFF);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.gesture-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.gesture-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(109, 40, 217, 0.1);
  color: var(--primary);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.gesture-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.gesture-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

.modal-card-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.btn-primary {
  border: none;
  border-radius: 10px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px -2px rgba(109, 40, 217, 0.3);
}

@media (max-width: 640px) {
  .shortcut-item-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .shortcut-keys {
    align-self: flex-end;
  }
}
</style>
