<template>
  <div :class="['modal-overlay', isOpen ? 'show' : '']" @click.self="$emit('close')">
    <div class="modal-card about-card" role="dialog" aria-modal="true" aria-labelledby="aboutModalTitle" style="text-align: center; max-width: 420px; direction: rtl;">
      <div class="about-logo-circle" aria-hidden="true">ت</div>
      <h3 id="aboutModalTitle" style="font-size: 19px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">تسک‌یار وب (TaskYar Web)</h3>
      <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="font-size: 12px; color: var(--primary); background: var(--primary-light); font-weight: 800; padding: 2px 10px; border-radius: 9999px;">نسخه تحت وب ۲.۰.۰</span>
        <span style="font-size: 11px; color: var(--text-muted);">بر پایه نسخه دسکتاپ ۱.۱.۰</span>
      </div>
      
      <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.8; text-align: justify; margin: 0 0 16px 0;">
        سامانه مدرن مدیریت وظایف روزانه، هفتگی و ماهیانه منطبق بر تقویم جلالی (شمسی). طراحی‌شده با معماری چندکاربره، رابط کاربری تمام‌فارسی و محلی‌سازی کامل بدون نیاز به CDN یا سرورهای خارجی.
      </p>

      <!-- Developer Info Card -->
      <div class="about-info-box" style="background: #F8FAFC; padding: 14px; border-radius: 14px; border: 1px solid var(--border); font-size: 12.5px; color: var(--text-main); text-align: right; display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: var(--text-muted);">توسعه‌دهنده:</span>
          <span style="font-weight: 800; color: var(--primary);">حسین محمدپور</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: var(--text-muted);">ایمیل ارتباطی:</span>
          <a
            href="mailto:info@hosseinmohammadpour.ir"
            style="direction: ltr; font-weight: 700; color: var(--primary); text-decoration: none; unicode-bidi: embed;"
            class="about-email-link"
          >
            info@hosseinmohammadpour.ir
          </a>
        </div>
      </div>

      <!-- Legal / License Attribution -->
      <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6; text-align: center; margin-bottom: 16px; border-top: 1px dashed var(--border); padding-top: 10px;">
        منتشرشده تحت مجوز MIT © ۲۰۲۶<br>
        <span style="font-size: 10.5px; opacity: 0.85;">با احترام به طراح ایده اولیه نسخه دسکتاپ (v1.1.0)</span>
      </div>

      <div class="modal-actions" style="margin-top: 0;">
        <button style="background: var(--primary); color: white; width: 100%; padding: 10px; font-weight: 700; border-radius: 12px; cursor: pointer;" @click="$emit('close')">بستن پنجره</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    e.preventDefault();
    emit('close');
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
</script>
