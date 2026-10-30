<template>
  <div class="pwa-banners-container" dir="rtl">
    <!-- 1. Update Available Banner -->
    <transition name="slide-fade">
      <div v-if="updateAvailable && !updateDismissed" class="pwa-banner pwa-update-banner" role="alert">
        <div class="banner-content">
          <AppIcon name="refresh-circle" type="bulk" size="22" color="#3B82F6" />
          <div class="banner-text">
            <span class="banner-title">نسخه جدید در دسترس است</span>
            <span class="banner-desc">به‌روزرسانی جدیدی از تسک‌یار وب آماده بارگذاری است.</span>
          </div>
        </div>
        <div class="banner-actions">
          <button type="button" class="btn-banner-action" @click="applyUpdate">
            بروزرسانی اکنون
          </button>
          <button type="button" class="btn-banner-close" @click="updateDismissed = true" title="بعداً" aria-label="بستن">
            <AppIcon name="close-circle" size="18" />
          </button>
        </div>
      </div>
    </transition>

    <!-- 2. Install App Banner -->
    <transition name="slide-fade">
      <div v-if="(hasNativePrompt || isIos) && !installDismissed && !isStandalone" class="pwa-banner pwa-install-banner" role="region" aria-label="نصب برنامه">
        <div class="banner-content">
          <img src="/pwa-icons/icon-192.png" alt="تسک‌یار" class="banner-icon-thumb" width="36" height="36" />
          <div class="banner-text">
            <span class="banner-title">نصب نسخه وب‌اپلیکیشن (PWA)</span>
            <span class="banner-desc">تسک‌یار را روی دستگاه خود نصب کنید تا سریع‌تر و آفلاین در دسترس باشد.</span>
          </div>
        </div>
        <div class="banner-actions">
          <button type="button" class="btn-banner-primary" @click="handleInstallClick">
            نصب برنامه
          </button>
          <button type="button" class="btn-banner-close" @click="installDismissed = true" title="انصراف" aria-label="بستن">
            <AppIcon name="close-circle" size="18" />
          </button>
        </div>
      </div>
    </transition>

    <!-- Install Details Modal (Safari iOS, Chrome Desktop, Help) -->
    <InstallModal
      :is-open="showInstallModal"
      @close="showInstallModal = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  updateAvailable,
  hasNativePrompt,
  isStandalone,
  isIos,
  showInstallModal,
  applyUpdate,
  triggerNativeInstall,
  openInstallDialog
} from '@/pwa';
import InstallModal from '@/components/InstallModal.vue';

const updateDismissed = ref(false);
const installDismissed = ref(false);

async function handleInstallClick() {
  if (hasNativePrompt.value) {
    const accepted = await triggerNativeInstall();
    if (!accepted && !isStandalone.value) {
      showInstallModal.value = true;
    }
  } else {
    showInstallModal.value = true;
  }
}
</script>

<style scoped>
.pwa-banners-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  left: 20px;
  max-width: 480px;
  margin-right: auto;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .pwa-banners-container {
    bottom: 80px;
    right: 12px;
    left: 12px;
    max-width: none;
    margin-right: 0;
  }
}

.pwa-banner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.banner-icon-thumb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(109, 40, 217, 0.2);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.banner-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-desc {
  font-size: 11px;
  color: var(--text-muted, #64748b);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-banner-primary {
  background: var(--primary, #6D28D9);
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-banner-primary:hover {
  opacity: 0.9;
}

.btn-banner-action {
  background: #3B82F6;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-banner-action:hover {
  opacity: 0.9;
}

.btn-banner-close {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.2s;
}

.btn-banner-close:hover {
  color: var(--text-main, #1e293b);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
