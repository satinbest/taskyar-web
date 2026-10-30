<template>
  <div
    :id="id"
    class="app-select-wrapper"
    ref="wrapperRef"
    :class="{
      'is-open': isOpen,
      'is-disabled': disabled,
      'drop-up': dropUp,
      'is-block': block,
      'variant-form': variant === 'form'
    }"
  >
    <!-- Trigger Button -->
    <button
      type="button"
      :id="id ? id + '-trigger' : undefined"
      class="app-select-trigger"
      :disabled="disabled"
      @click="toggleDropdown"
      @keydown="handleKeydown"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
    >
      <span class="app-select-label">{{ selectedLabel }}</span>
      <span class="app-select-arrow" :class="{ 'rotated': isOpen }">
        <AppIcon name="arrow-down-01" size="14" />
      </span>
    </button>

    <!-- Teleported Floating Dropdown Menu -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="app-select-menu"
        :class="{ 'drop-up': isDroppedUp, 'variant-form': variant === 'form' }"
        :style="menuStyle"
        role="listbox"
        :aria-activedescendant="highlightedOptionId"
        tabindex="-1"
        dir="rtl"
        @keydown="handleKeydown"
      >
        <div
          v-for="(option, idx) in options"
          :key="option.value"
          :id="'select-opt-' + option.value"
          :class="[
            'app-select-option',
            option.value === modelValue ? 'is-selected' : '',
            highlightedIndex === idx ? 'is-highlighted' : '',
            option.disabled ? 'is-disabled' : ''
          ]"
          role="option"
          :aria-selected="option.value === modelValue"
          @click="selectOption(option)"
          @mouseenter="highlightedIndex = idx"
        >
          <span class="option-text">{{ option.label }}</span>
          <span v-if="option.value === modelValue" class="option-check">
            <AppIcon name="tick-circle" size="14" />
          </span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    required: true
  },
  placeholder: {
    type: String,
    default: 'انتخاب کنید...'
  },
  id: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  dropUp: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'pill' // 'pill' or 'form'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const wrapperRef = ref(null);
const menuRef = ref(null);
const highlightedIndex = ref(-1);
const isDroppedUp = ref(false);
const menuStyle = ref({});

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue) || null;
});

const selectedLabel = computed(() => {
  return selectedOption.value ? selectedOption.value.label : props.placeholder;
});

const highlightedOptionId = computed(() => {
  if (highlightedIndex.value >= 0 && props.options[highlightedIndex.value]) {
    return 'select-opt-' + props.options[highlightedIndex.value].value;
  }
  return undefined;
});

function updatePosition() {
  if (!wrapperRef.value || !isOpen.value) return;

  const triggerEl = wrapperRef.value.querySelector('.app-select-trigger') || wrapperRef.value;
  const rect = triggerEl.getBoundingClientRect();
  const margin = 8;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const estimatedHeight = Math.min(props.options.length * 36 + 16, 230);

  const flipUp = props.dropUp || (spaceBelow < estimatedHeight + 12 && spaceAbove > spaceBelow);
  isDroppedUp.value = flipUp;

  // Target width matches trigger but has reasonable constraints
  const minWidth = Math.max(rect.width, 130);
  const maxWidth = Math.min(340, window.innerWidth - 16);
  const targetWidth = Math.min(Math.max(rect.width, minWidth), maxWidth);

  // Persian RTL alignment: align right edge of menu with right edge of trigger
  let left = rect.right - targetWidth;
  if (left < margin) {
    left = margin;
  } else if (left + targetWidth > window.innerWidth - margin) {
    left = window.innerWidth - targetWidth - margin;
  }

  const topPos = flipUp ? null : Math.round(rect.bottom + 6);
  const bottomPos = flipUp ? Math.round(window.innerHeight - rect.top + 6) : null;

  menuStyle.value = {
    position: 'fixed',
    zIndex: 4500,
    width: `${Math.round(targetWidth)}px`,
    minWidth: `${Math.round(minWidth)}px`,
    maxWidth: `${maxWidth}px`,
    left: `${Math.round(left)}px`,
    top: topPos !== null ? `${topPos}px` : 'auto',
    bottom: bottomPos !== null ? `${bottomPos}px` : 'auto'
  };
}

function toggleDropdown() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    const idx = props.options.findIndex(opt => opt.value === props.modelValue);
    highlightedIndex.value = idx >= 0 ? idx : 0;
    nextTick(() => {
      updatePosition();
      addListeners();
      requestAnimationFrame(updatePosition);
    });
  } else {
    removeListeners();
  }
}

function closeDropdown() {
  isOpen.value = false;
  highlightedIndex.value = -1;
  removeListeners();
}

function selectOption(option) {
  if (option.disabled) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
  closeDropdown();
}

function handleKeydown(e) {
  if (props.disabled) return;

  if (!isOpen.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      toggleDropdown();
    }
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeDropdown();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (highlightedIndex.value < props.options.length - 1) {
      highlightedIndex.value++;
    } else {
      highlightedIndex.value = 0;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (highlightedIndex.value > 0) {
      highlightedIndex.value--;
    } else {
      highlightedIndex.value = props.options.length - 1;
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (highlightedIndex.value >= 0 && props.options[highlightedIndex.value]) {
      selectOption(props.options[highlightedIndex.value]);
    }
  }
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeDropdown();
  }
}

function handleClickOutside(e) {
  if (!isOpen.value) return;
  const inWrapper = wrapperRef.value && wrapperRef.value.contains(e.target);
  const inMenu = menuRef.value && menuRef.value.contains(e.target);
  if (!inWrapper && !inMenu) {
    closeDropdown();
  }
}

function handleScrollOrResize() {
  if (isOpen.value) {
    updatePosition();
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

onUnmounted(() => {
  removeListeners();
});
</script>

<style scoped>
.app-select-wrapper {
  position: relative;
  display: inline-block;
  user-select: none;
}

.app-select-wrapper.is-block {
  display: block;
  width: 100%;
}

.app-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border, #E2E8F0);
  border-radius: 9999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #1E293B);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  direction: rtl;
  white-space: nowrap;
  width: 100%;
}

/* Form Variant */
.app-select-wrapper.variant-form .app-select-trigger {
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12.5px;
  background: var(--bg-card, var(--surface-solid, #FFFFFF));
}

.app-select-trigger:hover:not(:disabled) {
  border-color: var(--primary, #6D28D9);
}

.is-open .app-select-trigger {
  border-color: var(--primary, #6D28D9);
  box-shadow: 0 0 0 3px var(--primary-light, rgba(109, 40, 217, 0.15));
}

.app-select-arrow {
  color: var(--text-muted, #64748B);
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.app-select-arrow.rotated {
  transform: rotate(180deg);
  color: var(--primary, #6D28D9);
}

.is-disabled .app-select-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<!-- Teleported Global Styles -->
<style>
.app-select-menu {
  position: fixed;
  max-height: 230px;
  overflow-y: auto;
  background: var(--surface-solid, #FFFFFF);
  border: 1px solid var(--border, rgba(226, 232, 240, 0.95));
  border-radius: 12px;
  box-shadow: 0 16px 36px -4px rgba(15, 23, 42, 0.18), 0 4px 10px -2px rgba(15, 23, 42, 0.08);
  padding: 6px;
  direction: rtl;
  user-select: none;
  font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
  animation: selectMenuFadeIn 0.14s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-select-menu.drop-up {
  animation: selectMenuFadeUp 0.14s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes selectMenuFadeIn {
  from {
    opacity: 0.9;
    transform: translateY(-5px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes selectMenuFadeUp {
  from {
    opacity: 0.9;
    transform: translateY(5px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.app-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #1E293B);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.app-select-option:hover,
.app-select-option.is-highlighted {
  background: var(--primary-light, #EDE9FE);
  color: var(--primary, #6D28D9);
}

.app-select-option.is-selected {
  font-weight: 700;
  color: var(--primary, #6D28D9);
  background: var(--primary-light, rgba(109, 40, 217, 0.08));
}

.option-check {
  display: flex;
  align-items: center;
  color: var(--primary, #6D28D9);
  margin-right: 8px;
  flex-shrink: 0;
}

.app-select-option.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
