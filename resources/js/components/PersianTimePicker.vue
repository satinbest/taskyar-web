<template>
  <div class="persian-time-picker-wrapper" ref="wrapperRef">
    <!-- Trigger Button / Display -->
    <button
      type="button"
      ref="triggerRef"
      :id="id"
      :class="['time-picker-trigger', isOpen ? 'open' : '', modelValue ? 'has-value' : '', customClass]"
      :disabled="disabled"
      @click="toggleDropdown"
      :title="title || 'انتخاب ساعت انجام و آلارم'"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
    >
      <span class="time-picker-icon">
        <AppIcon name="clock" size="15" />
      </span>
      <span class="time-picker-text">
        {{ displayTime }}
      </span>
      <span v-if="modelValue && !disabled" class="time-clear-btn" @click.stop="clearTime" title="پاک کردن ساعت">
        ✕
      </span>
    </button>

    <!-- Teleported Floating Popover / Mobile Bottom-Sheet -->
    <Teleport to="body">
      <!-- Mobile Backdrop -->
      <div
        v-if="isOpen && isMobile"
        class="time-picker-backdrop"
        @click="closeDropdown"
      ></div>

      <div
        v-if="isOpen"
        ref="popoverRef"
        class="time-picker-floating-panel time-picker-popover"
        :class="{ 'is-mobile-sheet': isMobile }"
        :style="popoverStyle"
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب ساعت و زمان"
        dir="rtl"
        @keydown.esc="closeDropdown"
      >
        <!-- Mobile drag handle indicator -->
        <div v-if="isMobile" class="time-sheet-handle-bar">
          <div class="time-sheet-handle"></div>
        </div>

        <!-- Header -->
        <div class="time-panel-header">
          <div class="time-panel-title">
            <span class="time-title-dot"></span>
            <span>انتخاب زمان (۲۴ ساعته)</span>
          </div>
          <button type="button" class="time-panel-close-btn" @click="closeDropdown" title="بستن">✕</button>
        </div>

        <!-- Mode Switcher Display (Hour / Minute Tabs) -->
        <div class="time-segmented-display">
          <button
            type="button"
            :class="['time-segment-btn', activeTab === 'hour' ? 'active' : '']"
            @click="activeTab = 'hour'"
          >
            <span class="segment-label">ساعت</span>
            <span class="segment-value">{{ toPersianDigits(String(selectedHour).padStart(2, '0')) }}</span>
          </button>
          <span class="time-segment-colon">:</span>
          <button
            type="button"
            :class="['time-segment-btn', activeTab === 'minute' ? 'active' : '']"
            @click="activeTab = 'minute'"
          >
            <span class="segment-label">دقیقه</span>
            <span class="segment-value">{{ toPersianDigits(String(selectedMinute).padStart(2, '0')) }}</span>
          </button>
        </div>

        <!-- Compact Hour Grid (Zero Scrolling, 6 columns x 4 rows) -->
        <div v-if="activeTab === 'hour'" class="time-grid-container">
          <div class="time-grid-header">ساعت مورد نظر را انتخاب کنید:</div>
          <div class="time-grid-hours">
            <button
              v-for="h in hoursList"
              :key="'h-' + h"
              type="button"
              :class="['time-grid-btn', selectedHour === h ? 'selected' : '']"
              @click="onHourClick(h)"
            >
              {{ toPersianDigits(String(h).padStart(2, '0')) }}
            </button>
          </div>
        </div>

        <!-- Compact Minute Grid (Zero Scrolling, 4 columns x 3 rows) -->
        <div v-else class="time-grid-container">
          <div class="time-grid-header">دقیقه مورد نظر را انتخاب کنید:</div>
          <div class="time-grid-minutes">
            <button
              v-for="m in minutesList"
              :key="'m-' + m"
              type="button"
              :class="['time-grid-btn', selectedMinute === m ? 'selected' : '']"
              @click="onMinuteClick(m)"
            >
              {{ toPersianDigits(String(m).padStart(2, '0')) }}
            </button>
          </div>
        </div>

        <!-- Quick Presets -->
        <div class="time-panel-presets">
          <button type="button" class="preset-btn" @click="setTimeNow">الان</button>
          <button type="button" class="preset-btn" @click="setPreset('09:00')">۰۹:۰۰</button>
          <button type="button" class="preset-btn" @click="setPreset('14:00')">۱۴:۰۰</button>
          <button type="button" class="preset-btn" @click="setPreset('18:00')">۱۸:۰۰</button>
          <button type="button" class="preset-btn" @click="setPreset('21:00')">۲۱:۰۰</button>
        </div>

        <!-- Footer Actions -->
        <div class="time-panel-footer">
          <button v-if="modelValue" type="button" class="btn-panel-clear" @click="clearTime">پاک کردن</button>
          <button type="button" class="btn-panel-confirm" @click="confirmTime">تأیید</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { toPersianDigits, normalizeDigits } from '@/utils/jalali';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '--:--'
  },
  title: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  customClass: {
    type: String,
    default: ''
  },
  dropUp: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const isMobile = ref(false);
const wrapperRef = ref(null);
const triggerRef = ref(null);
const popoverRef = ref(null);
const activeTab = ref('hour'); // 'hour' | 'minute'

// Popover viewport coordinates
const popoverTop = ref(0);
const popoverLeft = ref(0);

const hoursList = Array.from({ length: 24 }, (_, i) => i);
const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const selectedHour = ref(9);
const selectedMinute = ref(0);

function checkMobile() {
  isMobile.value = window.innerWidth <= 640;
}

// Parse incoming HH:mm modelValue
watch(
  () => props.modelValue,
  (val) => {
    if (val && typeof val === 'string' && val.includes(':')) {
      const parts = normalizeDigits(val).split(':').map(Number);
      if (!isNaN(parts[0]) && parts[0] >= 0 && parts[0] <= 23) {
        selectedHour.value = parts[0];
      }
      if (!isNaN(parts[1]) && parts[1] >= 0 && parts[1] <= 59) {
        selectedMinute.value = parts[1];
      }
    }
  },
  { immediate: true }
);

const displayTime = computed(() => {
  if (!props.modelValue) return props.placeholder;
  const normalized = normalizeDigits(props.modelValue);
  const parts = normalized.split(':');
  if (parts.length === 2) {
    const h = toPersianDigits(parts[0].padStart(2, '0'));
    const m = toPersianDigits(parts[1].padStart(2, '0'));
    return `${h}:${m}`;
  }
  return toPersianDigits(props.modelValue);
});

const popoverStyle = computed(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 4500,
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
    zIndex: 4500,
    top: `${popoverTop.value}px`,
    left: `${popoverLeft.value}px`
  };
});

function updatePosition() {
  checkMobile();
  if (isMobile.value) return;
  if (!triggerRef.value || !isOpen.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const popoverWidth = (popoverRef.value?.offsetWidth) || 280;
  const popoverHeight = (popoverRef.value?.offsetHeight) || 320;
  const margin = 10;

  // RTL alignment: default aligns right edge of popover with right edge of trigger
  let left = rect.right - popoverWidth;

  // Horizontal clamp
  if (left < margin) {
    left = margin;
  } else if (left + popoverWidth > window.innerWidth - margin) {
    left = window.innerWidth - popoverWidth - margin;
  }

  // Vertical placement calculation
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top;
  if (props.dropUp || (spaceBelow < popoverHeight + margin && spaceAbove >= popoverHeight + margin)) {
    top = rect.top - popoverHeight - 10;
  } else if (spaceBelow >= popoverHeight + margin) {
    top = rect.bottom + 8;
  } else {
    top = Math.max(margin, Math.min(window.innerHeight - popoverHeight - margin, rect.bottom + 8));
  }

  popoverTop.value = Math.round(top);
  popoverLeft.value = Math.round(left);
}

function handleScrollOrResize() {
  if (isOpen.value) {
    checkMobile();
    updatePosition();
  }
}

function toggleDropdown() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    checkMobile();
    activeTab.value = 'hour';
    nextTick(() => {
      updatePosition();
      addListeners();
      requestAnimationFrame(() => {
        updatePosition();
      });
    });
  } else {
    removeListeners();
  }
}

function closeDropdown() {
  isOpen.value = false;
  removeListeners();
}

function onHourClick(h) {
  selectedHour.value = h;
  emitNormalizedTime();
  // Automatically guide user to minute selection
  activeTab.value = 'minute';
}

function onMinuteClick(m) {
  selectedMinute.value = m;
  emitNormalizedTime();
}

function setPreset(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  selectedHour.value = h;
  selectedMinute.value = m;
  emitNormalizedTime();
}

function setTimeNow() {
  const now = new Date();
  selectedHour.value = now.getHours();
  selectedMinute.value = Math.floor(now.getMinutes() / 5) * 5;
  emitNormalizedTime();
}

function emitNormalizedTime() {
  const h = String(selectedHour.value).padStart(2, '0');
  const m = String(selectedMinute.value).padStart(2, '0');
  const formatted = `${h}:${m}`;
  emit('update:modelValue', formatted);
  emit('change', formatted);
}

function confirmTime() {
  emitNormalizedTime();
  closeDropdown();
}

function clearTime() {
  emit('update:modelValue', '');
  emit('change', '');
  closeDropdown();
}

function handleOutsideClick(e) {
  if (!isOpen.value) return;

  const clickedTrigger = triggerRef.value && triggerRef.value.contains(e.target);
  const clickedPopover = popoverRef.value && popoverRef.value.contains(e.target);

  if (!clickedTrigger && !clickedPopover) {
    closeDropdown();
  }
}

function handleWindowKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeDropdown();
  }
}

function addListeners() {
  document.addEventListener('pointerdown', handleOutsideClick, true);
  window.addEventListener('keydown', handleWindowKeyDown, true);
  window.addEventListener('resize', handleScrollOrResize, { passive: true });
  window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
}

function removeListeners() {
  document.removeEventListener('pointerdown', handleOutsideClick, true);
  window.removeEventListener('keydown', handleWindowKeyDown, true);
  window.removeEventListener('resize', handleScrollOrResize);
  window.removeEventListener('scroll', handleScrollOrResize, true);
}

onMounted(() => {
  checkMobile();
});

onUnmounted(() => {
  removeListeners();
});
</script>

<style scoped>
.persian-time-picker-wrapper {
  position: relative;
  display: inline-flex;
}

.time-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: 9999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #1E293B);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  direction: ltr;
  user-select: none;
}

.time-picker-trigger:hover:not(:disabled) {
  background: #FFFFFF;
  border-color: var(--primary, #6D28D9);
}

.time-picker-trigger.open {
  background: #FFFFFF;
  border-color: var(--primary, #6D28D9);
  box-shadow: 0 0 0 3px rgba(109, 40, 217, 0.15);
}

.time-picker-trigger.has-value {
  color: var(--primary, #6D28D9);
  border-color: rgba(109, 40, 217, 0.35);
  background: #FFFFFF;
}

.time-picker-icon {
  display: flex;
  align-items: center;
  color: var(--primary, #6D28D9);
}

.time-picker-text {
  font-family: inherit;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.time-clear-btn {
  font-size: 11px;
  color: var(--text-muted, #64748B);
  margin-left: 2px;
  padding: 2px 4px;
  border-radius: 50%;
  transition: color 0.15s;
}

.time-clear-btn:hover {
  color: #DC2626;
}
</style>

<!-- Teleported Popover Global/Floating Styles -->
<style>
.time-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 4499;
  animation: timeFadeIn 0.18s ease;
}

@keyframes timeFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.time-picker-floating-panel {
  position: fixed;
  z-index: 4500 !important;
  width: 284px;
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border, rgba(226, 232, 240, 0.95));
  border-radius: 18px;
  box-shadow: 0 18px 40px -6px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(109, 40, 217, 0.06);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  direction: rtl;
  font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
  user-select: none;
  animation: timeFloatingFade 0.16s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes timeFloatingFade {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Mobile Bottom Sheet Layout */
.time-picker-floating-panel.is-mobile-sheet {
  border-radius: 24px 24px 0 0 !important;
  border-bottom: none !important;
  padding: 12px 18px 24px 18px !important;
  animation: timeSheetSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes timeSheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.time-sheet-handle-bar {
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
}

.time-sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 9999px;
  background: var(--border, #CBD5E1);
}

.time-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border, #F1F5F9);
}

.time-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-main, #1E293B);
}

.time-title-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary, #6D28D9);
}

.time-panel-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748B);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.15s;
}

.time-panel-close-btn:hover {
  color: #1E293B;
  background: var(--bg-hover, #F1F5F9);
}

/* Mode Switcher Display */
.time-segmented-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg-input, #F8FAFC);
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--border, #E2E8F0);
}

.time-segment-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 4px 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.time-segment-btn.active {
  background: var(--surface-solid, #FFFFFF);
  border-color: var(--primary, #6D28D9);
  box-shadow: 0 2px 6px rgba(109, 40, 217, 0.12);
}

.segment-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted, #64748B);
}

.time-segment-btn.active .segment-label {
  color: var(--primary, #6D28D9);
}

.segment-value {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-main, #1E293B);
}

.time-segment-btn.active .segment-value {
  color: var(--primary, #6D28D9);
}

.time-segment-colon {
  font-size: 20px;
  font-weight: 900;
  color: var(--primary, #6D28D9);
  margin-top: -4px;
}

/* Grids */
.time-grid-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-grid-header {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, #64748B);
}

.time-grid-hours {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
}

.time-grid-minutes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.time-grid-btn {
  padding: 7px 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-main, #1E293B);
  background: var(--bg-input, #F8FAFC);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.time-picker-floating-panel.is-mobile-sheet .time-grid-btn {
  padding: 10px 0;
  font-size: 14px;
  border-radius: 10px;
}

.time-grid-btn:hover {
  background: var(--primary-light, #EDE9FE);
  color: var(--primary, #6D28D9);
  border-color: var(--primary, #6D28D9);
}

.time-grid-btn.selected {
  background: var(--primary, #6D28D9);
  color: #FFFFFF;
  border-color: var(--primary, #6D28D9);
  box-shadow: 0 2px 6px rgba(109, 40, 217, 0.3);
}

/* Presets */
.time-panel-presets {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 1px solid var(--border, #F1F5F9);
}

.preset-btn {
  flex: 1;
  min-width: 44px;
  padding: 5px 0;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-input, #F1F5F9);
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-muted, #475569);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.preset-btn:hover {
  background: var(--primary-light, #EDE9FE);
  color: var(--primary, #6D28D9);
}

/* Footer Actions */
.time-panel-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-panel-clear {
  background: transparent;
  border: 1px solid var(--border, #E2E8F0);
  color: #DC2626;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-panel-clear:hover {
  background: #FEF2F2;
  border-color: #F87171;
}

.btn-panel-confirm {
  background: var(--primary, #6D28D9);
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(109, 40, 217, 0.25);
}

.btn-panel-confirm:hover {
  opacity: 0.92;
}
</style>
