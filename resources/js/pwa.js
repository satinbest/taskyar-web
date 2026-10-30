import { ref, computed } from 'vue';

export const swRegistration = ref(null);
export const updateAvailable = ref(false);
export const hasNativePrompt = ref(false);
export const isStandalone = ref(false);
export const isIos = ref(false);
export const showInstallModal = ref(false);
export const isInstalling = ref(false);
export const installOutcome = ref(null);

// Un-proxied module-level reference to the native BeforeInstallPromptEvent
// Storing this outside Vue reactivity guarantees prompt() is invoked on the authentic browser host object
let rawDeferredPrompt = null;

// Backward-compatibility alias for components expecting installPromptEvent
export const installPromptEvent = computed(() => (hasNativePrompt.value ? rawDeferredPrompt : null));

export function initPwa() {
  if (typeof window === 'undefined') return;

  // 1. Detect iOS / iPadOS
  if (typeof navigator !== 'undefined') {
    isIos.value =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // 2. Detect standalone display mode
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true ||
    (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'))
  ) {
    isStandalone.value = true;
  }

  // Listen for display mode changes (e.g. user launches standalone window)
  try {
    const mq = window.matchMedia('(display-mode: standalone)');
    if (mq.addEventListener) {
      mq.addEventListener('change', (e) => {
        if (e.matches) {
          isStandalone.value = true;
          hasNativePrompt.value = false;
          showInstallModal.value = false;
        }
      });
    }
  } catch (err) {
    // Ignore matchMedia listener failure on legacy engines
  }

  // 3. Capture native install prompt on supported Chromium browsers
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser mini-infobar from showing immediately
    e.preventDefault();
    // Safely store the un-proxied native event
    rawDeferredPrompt = e;
    hasNativePrompt.value = true;
    console.log('[PWA] beforeinstallprompt event captured and preserved');
  });

  // 4. Listen for successful installation completion
  window.addEventListener('appinstalled', () => {
    rawDeferredPrompt = null;
    hasNativePrompt.value = false;
    isStandalone.value = true;
    showInstallModal.value = false;
    console.log('[PWA] App successfully installed on device');
  });

  // 5. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        swRegistration.value = reg;
        console.log('[PWA] Service Worker registered with scope:', reg.scope);

        if (reg.waiting) {
          updateAvailable.value = true;
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateAvailable.value = true;
              console.log('[PWA] Update available (waiting worker ready)');
            }
          });
        });
      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    });

    let hadPreviousController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing && hadPreviousController) {
        refreshing = true;
        window.location.reload();
      }
      hadPreviousController = true;
    });
  }
}

export function applyUpdate() {
  if (swRegistration.value && swRegistration.value.waiting) {
    swRegistration.value.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

/**
 * Triggers the native browser installation prompt from an explicit user gesture.
 * Invokes prompt() directly on the native un-proxied BeforeInstallPromptEvent.
 */
export async function triggerNativeInstall() {
  if (!rawDeferredPrompt) {
    console.warn('[PWA] No native deferred install prompt available.');
    showInstallModal.value = true;
    return false;
  }

  isInstalling.value = true;
  const promptEvent = rawDeferredPrompt;

  try {
    // 1. Invoke prompt synchronously within the user gesture execution context
    await promptEvent.prompt();

    // 2. Await user choice
    const choice = await promptEvent.userChoice;
    console.log('[PWA] User response to install prompt:', choice?.outcome);
    installOutcome.value = choice?.outcome;

    // Once prompt() has been called, the event is consumed and cannot be reused
    rawDeferredPrompt = null;
    hasNativePrompt.value = false;

    if (choice?.outcome === 'accepted') {
      showInstallModal.value = false;
      return true;
    } else {
      console.log('[PWA] User dismissed install prompt');
      return false;
    }
  } catch (err) {
    console.error('[PWA] Failed to invoke native prompt():', err);
    rawDeferredPrompt = null;
    hasNativePrompt.value = false;
    return false;
  } finally {
    isInstalling.value = false;
  }
}

// Backward-compatibility alias
export const promptInstall = triggerNativeInstall;

export function openInstallDialog() {
  showInstallModal.value = true;
}
