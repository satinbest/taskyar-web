<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="isOpen"
        class="modal-overlay install-modal-overlay show"
        role="dialog"
        aria-modal="true"
        aria-labelledby="installModalTitle"
        dir="rtl"
        @click.self="handleClose"
      >
        <div class="modal-card modal-install-card" @click.stop>
          <div class="modal-card-header">
            <h3 id="installModalTitle" class="flex items-center gap-2">
              <AppIcon name="document-download" type="bulk" size="22" color="var(--primary)" />
              <span>نصب وب‌اپلیکیشن تسک‌یار (PWA)</span>
            </h3>
            <button
              type="button"
              class="btn-icon-text btn-modal-close"
              title="بستن پنجره"
              aria-label="بستن پنجره"
              @click="handleClose"
            >
              <AppIcon name="close-circle" size="18" />
            </button>
          </div>

          <div class="modal-card-body">
            <!-- Brand Info -->
            <div class="install-brand-banner">
              <img src="/pwa-icons/icon-192.png" alt="تسک‌یار وب" class="install-app-icon" width="60" height="60" />
              <div class="install-brand-text">
                <h4>تسک‌یار وب ۲.۰</h4>
                <p>دسترسی سریع، بدون نیاز به استور و کارکرد کامل آفلاین</p>
              </div>
            </div>

            <!-- Case 1: Already Installed (Standalone) -->
            <div v-if="isStandalone" class="install-status-box success">
              <AppIcon name="tick-circle" type="bulk" size="24" color="#10B981" />
              <div class="status-text">
                <strong>برنامه قبلاً نصب شده است</strong>
                <p>تسک‌یار در حال حاضر به عنوان وب‌اپلیکیشن مستقل روی این دستگاه فعال است.</p>
              </div>
            </div>

            <!-- Case 2: Native Install Prompt Available (Chrome, Edge, Android) -->
            <div v-else-if="hasNativePrompt" class="install-native-box">
              <p class="install-desc">
                با کلیک بر روی دکمه زیر، پنجره استاندارد نصب مرورگر باز شده و تسک‌یار به لیست نرم‌افزارهای دستگاه شما افزوده خواهد شد:
              </p>
              <button
                type="button"
                class="btn-primary-install"
                :disabled="isInstalling"
                @click="handleNativeInstall"
              >
                <AppIcon name="document-download" size="18" />
                <span>{{ isInstalling ? 'در حال نصب...' : 'نصب برنامه' }}</span>
              </button>
            </div>

            <!-- Case 3: iOS Safari Instructions -->
            <div v-else-if="isIos" class="install-guide-box">
              <h5 class="guide-title">راهنمای نصب در آیفون و آیپد (سافاری):</h5>
              <ol class="ios-steps-list">
                <li>
                  <span class="step-badge">۱</span>
                  <span>در نوار پایین مرورگر سافاری، روی آیکون <strong>اشتراک‌گذاری (Share <span class="ios-icon">⎋</span>)</strong> ضربه بزنید.</span>
                </li>
                <li>
                  <span class="step-badge">۲</span>
                  <span>در منوی باز شده به پایین اسکرول کرده و گزینه <strong>«Add to Home Screen» (افزودن به صفحه اصلی <span class="ios-icon">⊞</span>)</strong> را انتخاب کنید.</span>
                </li>
                <li>
                  <span class="step-badge">۳</span>
                  <span>در گوشه بالای سمت راست روی گزینه <strong>«Add»</strong> بزنید تا آیکون تسک‌یار به صفحه برنامه‌های شما افزوده شود.</span>
                </li>
              </ol>
            </div>

            <!-- Case 4: Desktop Chrome / Edge / Other Browsers -->
            <div v-else class="install-guide-box">
              <h5 class="guide-title">نحوه نصب در مرورگر دسکتاپ و سایر مرورگرها:</h5>
              <ol class="ios-steps-list">
                <li>
                  <span class="step-badge">۱</span>
                  <span>در نوار آدرس بالای مرورگر (سمت راست آدرس)، روی آیکون <strong>نصب برنامه (Install <AppIcon name="document-download" size="14" />)</strong> کلیک کنید.</span>
                </li>
                <li>
                  <span class="step-badge">۲</span>
                  <span>یا از منوی سه‌نقطه بالای مرورگر (⋮) گزینه <strong>«Install TaskYar Web»</strong> یا <strong>«افزودن به صفحه اصلی»</strong> را انتخاب نمایید.</span>
                </li>
                <li>
                  <span class="step-badge">۳</span>
                  <span>پس از نصب، تسک‌یار با آیکون اختصاصی در لیست نرم‌افزارها و بدون نوارهای مرورگر اجرا می‌شود.</span>
                </li>
              </ol>
            </div>

            <!-- Feature highlights -->
            <div class="pwa-features-grid">
              <div class="pwa-feature-item">
                <AppIcon name="cloud-connection" size="18" color="var(--primary)" />
                <span>کارکرد آفلاین بدون اینترنت</span>
              </div>
              <div class="pwa-feature-item">
                <AppIcon name="notification" size="18" color="var(--primary)" />
                <span>یادآور و هشدارهای سر وقت</span>
              </div>
              <div class="pwa-feature-item">
                <AppIcon name="flash" size="18" color="var(--primary)" />
                <span>بارگذاری آنی و سرعت بالا</span>
              </div>
            </div>
          </div>

          <div class="modal-card-footer">
            <button type="button" class="btn-cancel" @click="handleClose">متوجه شدم</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { watch, onUnmounted } from 'vue';
import {
  hasNativePrompt,
  isStandalone,
  isIos,
  isInstalling,
  triggerNativeInstall
} from '@/pwa';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

function handleClose() {
  emit('close');
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    e.preventDefault();
    handleClose();
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

async function handleNativeInstall() {
  try {
    const accepted = await triggerNativeInstall();
    if (accepted) {
      handleClose();
    }
  } catch (err) {
    console.error('Install error:', err);
  }
}
</script>

<style scoped>
.install-modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(15, 23, 42, 0.55) !important;
  backdrop-filter: blur(8px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 100010 !important;
  pointer-events: auto !important;
  padding: 16px !important;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-install-card {
  position: relative !important;
  max-width: 480px;
  width: 100%;
  pointer-events: auto !important;
  z-index: 100011 !important;
  background: var(--bg-card, #ffffff);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-modal-close {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.btn-modal-close:hover {
  color: var(--text-main);
  background: var(--bg-hover, rgba(241, 245, 249, 0.8));
}

.install-brand-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--bg-hover, rgba(241, 245, 249, 0.7));
  border-radius: 14px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.install-app-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(109, 40, 217, 0.2);
  flex-shrink: 0;
}

.install-brand-text h4 {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 3px;
}

.install-brand-text p {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
}

.install-desc {
  font-size: 13px;
  color: var(--text-main);
  margin-bottom: 14px;
  line-height: 1.5;
}

.btn-primary-install {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px -2px rgba(109, 40, 217, 0.35);
  transition: all 0.2s;
}

.btn-primary-install:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.btn-primary-install:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.install-status-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.install-status-box.success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.status-text strong {
  display: block;
  font-size: 13.5px;
  color: #065F46;
  margin-bottom: 2px;
}

.status-text p {
  font-size: 12px;
  color: #047857;
  margin: 0;
}

.install-guide-box {
  background: var(--bg-card, #FFFFFF);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.guide-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
}

.ios-steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ios-steps-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
  color: var(--text-main);
  line-height: 1.5;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: var(--primary);
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.ios-icon {
  display: inline-block;
  font-size: 14px;
  font-weight: bold;
}

.pwa-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.pwa-feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 8px 4px;
  background: var(--bg-hover, rgba(241, 245, 249, 0.5));
  border-radius: 10px;
}

.pwa-feature-item span {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.modal-card-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-card);
}

.btn-cancel {
  background: var(--bg-hover, #F1F5F9);
  color: var(--text-main);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: var(--border);
}
</style>
