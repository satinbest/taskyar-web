<template>
  <div class="relative inline-block" ref="containerRef">
    <input
      type="text"
      :id="id || undefined"
      :class="['input-pill date-picker-input cursor-pointer', inputClass]"
      readonly
      :placeholder="placeholder || 'تاریخ'"
      :value="displayValue"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    />

    <Teleport to="body">
      <!-- Mobile Backdrop -->
      <div
        v-if="isOpen && isMobile"
        class="jdp-backdrop"
        @click="close"
      ></div>

      <!-- Date Picker Popup / Mobile Bottom-Sheet -->
      <div
        v-if="isOpen"
        ref="popupRef"
        class="jdp-popup show"
        :class="{ 'is-mobile-sheet': isMobile }"
        :style="popupStyle"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب تاریخ خورشیدی"
        @mousedown.stop
      >
        <!-- Mobile drag handle indicator -->
        <div v-if="isMobile" class="jdp-sheet-handle-bar">
          <div class="jdp-sheet-handle"></div>
        </div>

        <div class="jdp-head">
          <button type="button" class="jdp-nav" @click="shiftMonth(-12)" title="سال قبل" aria-label="سال قبل">
            <AppIcon name="arrow-right-01" size="14" />
          </button>
          <button type="button" class="jdp-nav" @click="shiftMonth(-1)" title="ماه قبل" aria-label="ماه قبل">
            <AppIcon name="arrow-right-01" size="14" />
          </button>
          <div class="jdp-title">{{ monthTitle }}</div>
          <button type="button" class="jdp-nav" @click="shiftMonth(1)" title="ماه بعد" aria-label="ماه بعد">
            <AppIcon name="arrow-left-01" size="14" />
          </button>
          <button type="button" class="jdp-nav" @click="shiftMonth(12)" title="سال بعد" aria-label="سال بعد">
            <AppIcon name="arrow-left-01" size="14" />
          </button>
        </div>

        <div class="jdp-grid">
          <span
            v-for="(h, i) in weekHeaders"
            :key="i"
            :class="['jdp-wd', i === 6 ? 'friday' : '']"
            :title="weekTitles[i]"
          >
            {{ h }}
          </span>

          <span v-for="empty in offset" :key="'e-' + empty" class="jdp-empty"></span>

          <button
            v-for="d in monthDays"
            :key="'d-' + d.day"
            type="button"
            :class="[
              'jdp-day',
              d.isFriday ? 'friday' : '',
              d.isToday ? 'today' : '',
              d.isSelected ? 'selected' : ''
            ]"
            @click="selectDate(d.iso)"
          >
            {{ d.persianNum }}
          </button>
        </div>

        <div class="jdp-foot">
          <button type="button" class="jdp-link primary" @click="selectDate(todayISO)">امروز</button>
          <button type="button" class="jdp-link muted" @click="close">بستن</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  getLocalISODate,
  isoToJalali,
  jalaliToISO,
  jalaliMonthLength,
  jalaliToGregorian,
  persianWeekdayIndex,
  toPersianDigits,
  formatJalaliDate,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES
} from '@/utils/jalali';

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
    default: 'تاریخ'
  },
  inputClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const isMobile = ref(false);
const containerRef = ref(null);
const popupRef = ref(null);
const popupStyle = ref({});

const weekHeaders = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const weekTitles = PERSIAN_WEEKDAY_NAMES;

const view = ref({ jy: 1403, jm: 1 });
const todayISO = getLocalISODate();

function checkMobile() {
  isMobile.value = window.innerWidth <= 640;
}

const displayValue = computed(() => {
  if (!props.modelValue) return '';
  const j = isoToJalali(props.modelValue);
  return j ? formatJalaliDate(j.jy, j.jm, j.jd) : '';
});

const monthTitle = computed(() => {
  const { jy, jm } = view.value;
  return `${PERSIAN_MONTH_NAMES[jm - 1]} ${toPersianDigits(jy)}`;
});

const offset = computed(() => {
  const { jy, jm } = view.value;
  const first = jalaliToGregorian(jy, jm, 1);
  return persianWeekdayIndex(new Date(first.gy, first.gm - 1, first.gd));
});

const monthDays = computed(() => {
  const { jy, jm } = view.value;
  const len = jalaliMonthLength(jy, jm);
  const off = offset.value;
  const days = [];

  for (let d = 1; d <= len; d++) {
    const iso = jalaliToISO(jy, jm, d);
    const col = (off + d - 1) % 7;
    days.push({
      day: d,
      iso,
      persianNum: toPersianDigits(d),
      isFriday: col === 6,
      isToday: iso === todayISO,
      isSelected: iso === props.modelValue
    });
  }
  return days;
});

function toggle() {
  if (isOpen.value) {
    close();
  } else {
    open();
  }
}

function open() {
  checkMobile();
  const current = props.modelValue || todayISO;
  const j = isoToJalali(current);
  if (j) {
    view.value = { jy: j.jy, jm: j.jm };
  }
  isOpen.value = true;
  nextTick(() => {
    reposition();
    addListeners();
    requestAnimationFrame(reposition);
  });
}

function close() {
  isOpen.value = false;
  removeListeners();
}

function shiftMonth(delta) {
  let { jy, jm } = view.value;
  jm += delta;
  while (jm > 12) { jm -= 12; jy++; }
  while (jm < 1) { jm += 12; jy--; }
  view.value = { jy, jm };
}

function selectDate(iso) {
  emit('update:modelValue', iso);
  emit('change', iso);
  close();
}

function reposition() {
  checkMobile();
  if (!isOpen.value) return;

  if (isMobile.value) {
    popupStyle.value = {
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
    return;
  }

  if (!containerRef.value || !popupRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const w = popupRef.value.offsetWidth || 288;
  const h = popupRef.value.offsetHeight || 310;
  const margin = 10;

  // RTL alignment: align right edge of popup with right edge of input trigger
  let left = rect.right - w;
  if (left < margin) {
    left = margin;
  } else if (left + w > window.innerWidth - margin) {
    left = window.innerWidth - w - margin;
  }

  // Prefer opening upward if not enough space below
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  let top;
  if (spaceBelow < h + margin && spaceAbove >= h + margin) {
    top = rect.top - h - 8;
  } else if (spaceBelow >= h + margin) {
    top = rect.bottom + 8;
  } else {
    top = Math.max(margin, Math.min(rect.bottom + 8, window.innerHeight - h - margin));
  }

  popupStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    bottom: 'auto',
    width: `${w}px`,
    zIndex: 4500
  };
}

function handleClickOutside(e) {
  if (!isOpen.value) return;
  if (containerRef.value?.contains(e.target)) return;
  if (popupRef.value?.contains(e.target)) return;
  close();
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    close();
  }
}

function handleScrollOrResize() {
  if (isOpen.value) {
    reposition();
  }
}

function addListeners() {
  document.addEventListener('pointerdown', handleClickOutside, true);
  window.addEventListener('keydown', handleGlobalKeydown, true);
  window.addEventListener('resize', handleScrollOrResize, { passive: true });
  window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
}

function removeListeners() {
  document.removeEventListener('pointerdown', handleClickOutside, true);
  window.removeEventListener('keydown', handleGlobalKeydown, true);
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

<style>
/* Global overlay styling for Teleported DatePicker */
.jdp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 4499;
  animation: jdpFadeIn 0.18s ease;
}

@keyframes jdpFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.jdp-popup {
  position: fixed;
  z-index: 4500 !important;
  width: 290px;
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border, rgba(226, 232, 240, 0.95));
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
  display: none;
  direction: rtl;
  user-select: none;
  font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
}

.jdp-popup.show {
  display: block;
  animation: jdpPopIn 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes jdpPopIn {
  from { opacity: 0; transform: scale(0.96) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Mobile Bottom Sheet Presentation */
.jdp-popup.is-mobile-sheet {
  border-radius: 24px 24px 0 0 !important;
  border-bottom: none !important;
  padding: 12px 18px 24px 18px !important;
  animation: jdpSheetSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

@keyframes jdpSheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.jdp-sheet-handle-bar {
  display: flex;
  justify-content: center;
  padding-bottom: 10px;
}

.jdp-sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 9999px;
  background: var(--border, #CBD5E1);
}

.jdp-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.jdp-title {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main, #1E293B);
}

.jdp-nav {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted, #64748B);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.jdp-nav:hover {
  background: var(--bg-hover, #F1F5F9);
  color: var(--primary, #6D28D9);
}

.jdp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 10px;
}

.jdp-wd {
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted, #94A3B8);
  padding: 4px 0;
}

.jdp-wd.friday {
  color: #EF4444;
}

.jdp-empty {
  display: block;
}

.jdp-day {
  height: 36px;
  min-width: 34px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-main, #1E293B);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.jdp-popup.is-mobile-sheet .jdp-day {
  height: 42px;
  font-size: 14px;
  border-radius: 12px;
}

.jdp-day:hover {
  background: var(--primary-light, #EDE9FE);
  color: var(--primary, #6D28D9);
}

.jdp-day.friday {
  color: #DC2626;
}

.jdp-day.today {
  border: 1.5px solid var(--primary, #6D28D9);
  color: var(--primary, #6D28D9);
  font-weight: 800;
}

.jdp-day.selected {
  background: var(--primary, #6D28D9) !important;
  color: #FFFFFF !important;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(109, 40, 217, 0.35);
}

.jdp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border, #F1F5F9);
  padding-top: 10px;
  margin-top: 4px;
}

.jdp-link {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.jdp-link.primary {
  color: var(--primary, #6D28D9);
  background: var(--primary-light, rgba(109, 40, 217, 0.08));
}

.jdp-link.primary:hover {
  background: var(--primary-light, rgba(109, 40, 217, 0.16));
}

.jdp-link.muted {
  color: var(--text-muted, #64748B);
}

.jdp-link.muted:hover {
  background: var(--bg-hover, #F1F5F9);
  color: var(--text-main, #1E293B);
}
</style>
