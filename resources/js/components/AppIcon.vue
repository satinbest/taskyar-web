<template>
  <span
    class="app-icon"
    :class="[
      'app-icon--' + canonicalName,
      'app-icon--' + resolvedType,
      flipRtl ? 'app-icon--flip-rtl' : ''
    ]"
    :style="wrapperStyle"
    :role="label ? 'img' : 'presentation'"
    :aria-label="label || undefined"
    :aria-hidden="label ? 'false' : 'true'"
  >
    <!-- 1. Instant local SVG rendering from bundled Iconsax vector dictionary -->
    <svg
      v-if="rawSvg"
      :viewBox="svgViewBox"
      :width="computedSize"
      :height="computedSize"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="app-icon-svg"
      v-html="svgInnerContent"
    />
    <!-- 2. Fallback to native Iconsax Web Component if dynamic icon name requested -->
    <iconsax-icon
      v-else
      :name="canonicalName"
      :type="resolvedType"
      :size="computedSize"
      :color="color || 'currentColor'"
    />
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { ICONSAX_DATA, ICON_ALIASES } from '@/icons/iconsaxData';

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'linear', // 'linear' or 'bulk'
    validator: (v) => ['linear', 'bulk', 'bold', 'broken', 'outline', 'twotone'].includes(v)
  },
  size: {
    type: [Number, String],
    default: 20
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  flipRtl: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: null
  }
});

const canonicalName = computed(() => {
  const raw = (props.name || '').toLowerCase().trim();
  return ICON_ALIASES[raw] || raw;
});

const resolvedType = computed(() => {
  return props.type || 'linear';
});

const computedSize = computed(() => {
  const s = parseInt(props.size, 10);
  return isNaN(s) ? 20 : s;
});

const wrapperStyle = computed(() => {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${computedSize.value}px`,
    height: `${computedSize.value}px`,
    color: props.color || 'currentColor',
    flexShrink: 0,
    lineHeight: 1
  };
});

const rawSvg = computed(() => {
  const icon = ICONSAX_DATA[canonicalName.value];
  if (!icon) return null;
  return icon[resolvedType.value] || icon.linear || icon.bulk || null;
});

const svgViewBox = computed(() => {
  if (!rawSvg.value) return '0 0 24 24';
  const match = rawSvg.value.match(/viewBox="([^"]+)"/);
  return match ? match[1] : '0 0 24 24';
});

const svgInnerContent = computed(() => {
  if (!rawSvg.value) return '';
  // Extract content between <svg ...> and </svg>
  return rawSvg.value
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '');
});
</script>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  pointer-events: none;
  user-select: none;
  flex-shrink: 0;
  line-height: 1;
  transition: transform 0.15s ease, color 0.15s ease;
}

.app-icon-svg {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  color: inherit;
  pointer-events: none;
}

/* RTL mirroring applies strictly to this icon only when flipRtl is true */
.app-icon--flip-rtl {
  transform: scaleX(-1);
}
</style>
