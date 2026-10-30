<template>
  <div id="authModal" :class="['modal-overlay', authStore.authModalOpen ? 'show' : '']">
    <div class="modal-card" style="max-width: 420px; text-align: right;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="avatar" style="width: 32px; height: 32px; font-size: 15px;">ت</div>
          <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main);">
            {{ authStore.authModalTab === 'login' ? 'ورود به تسک‌یار' : 'ساخت حساب جدید' }}
          </h3>
        </div>
        <button
          v-if="authStore.isAuthenticated"
          class="btn-icon-text"
          style="padding: 4px 8px;"
          @click="authStore.closeAuthModal()"
        >
          ✕
        </button>
      </div>

      <p style="font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px;">
        {{ authStore.authModalTab === 'login' ? 'برای مشاهده و مدیریت برنامه‌ها وارد حساب کاربری خود شوید:' : 'برای ایجاد فضای کاری اختصاصی و ایزوله ثبت‌نام کنید:' }}
      </p>

      <div style="display: flex; gap: 8px; margin-bottom: 16px; background: rgba(100, 116, 139, 0.08); padding: 4px; border-radius: 12px;">
        <button
          type="button"
          :class="['flex-1 py-1.5 rounded-lg text-xs font-bold transition', authStore.authModalTab === 'login' ? 'bg-white shadow text-purple-700' : 'text-slate-600']"
          @click="authStore.authModalTab = 'login'"
        >
          ورود
        </button>
        <button
          type="button"
          :class="['flex-1 py-1.5 rounded-lg text-xs font-bold transition', authStore.authModalTab === 'register' ? 'bg-white shadow text-purple-700' : 'text-slate-600']"
          @click="authStore.authModalTab = 'register'"
        >
          ثبت‌نام
        </button>
      </div>

      <div v-if="errorMessage" class="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3">
        <div v-if="authStore.authModalTab === 'register'" class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-700">نام و نام خانوادگی:</label>
          <input
            type="text"
            v-model="name"
            class="input-pill w-full bg-white border border-slate-200 py-2 px-3 text-xs"
            placeholder="مثال: علی رضایی"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-700">ایمیل:</label>
          <input
            type="email"
            v-model="email"
            class="input-pill w-full bg-white border border-slate-200 py-2 px-3 text-xs"
            dir="ltr"
            placeholder="example@gmail.com"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-slate-700">رمز عبور:</label>
          <input
            type="password"
            v-model="password"
            class="input-pill w-full bg-white border border-slate-200 py-2 px-3 text-xs"
            dir="ltr"
            placeholder="حداقل ۶ کاراکتر"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-add w-full py-2.5 mt-2 text-xs font-bold justify-center"
          style="background: var(--primary); color: white;"
        >
          {{ loading ? 'در حال پردازش...' : (authStore.authModalTab === 'login' ? 'ورود به برنامه' : 'ثبت‌نام و ورود') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';

const authStore = useAuthStore();
const tasksStore = useTasksStore();

const name = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

function handleKeyDown(e) {
  if (e.key === 'Escape' && authStore.authModalOpen && authStore.isAuthenticated) {
    e.preventDefault();
    authStore.closeAuthModal();
  }
}

watch(() => authStore.authModalOpen, (open) => {
  if (typeof document === 'undefined') return;
  if (open) {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
  } else {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleKeyDown);
  }
}, { immediate: true });

watch(() => authStore.authModalTab, () => {
  errorMessage.value = '';
});

async function handleSubmit() {
  errorMessage.value = '';
  loading.value = true;

  try {
    if (authStore.authModalTab === 'login') {
      await authStore.login(email.value, password.value);
    } else {
      await authStore.register(name.value, email.value, password.value);
    }
    // Refresh user's tasks
    await tasksStore.fetchTasks();
  } catch (err) {
    if (err.data?.errors) {
      const firstKey = Object.keys(err.data.errors)[0];
      errorMessage.value = err.data.errors[firstKey][0];
    } else {
      errorMessage.value = err.message || 'خطا در برقراری ارتباط.';
    }
  } finally {
    loading.value = false;
  }
}
</script>
