<template>
  <div class="auth-page-container">
    <div class="auth-card">
      <!-- Brand Header -->
      <div class="auth-brand">
        <div class="auth-logo">
          <span>ت</span>
        </div>
        <h1 class="auth-title">تسک‌یار وب</h1>
        <p class="auth-subtitle">مدیریت هوشمند برنامه‌ها، اهداف و زمان</p>
      </div>

      <!-- Card Title & Description -->
      <div class="auth-header">
        <h2>ورود به حساب کاربری</h2>
        <p>اطلاعات کاربری خود را برای دسترسی به فضای کاری وارد کنید</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="auth-error-box" role="alert">
        <AppIcon name="warning-2" size="18" color="#ef4444" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="auth-form" novalidate>
        <div class="form-group">
          <label for="emailInput">آدرس ایمیل</label>
          <div class="input-wrapper">
            <input
              id="emailInput"
              type="email"
              v-model="email"
              placeholder="example@gmail.com"
              dir="ltr"
              autocomplete="email"
              required
              :disabled="loading"
              class="auth-input"
            />
            <span class="input-icon">
              <AppIcon name="user" size="18" color="var(--text-muted)" />
            </span>
          </div>
        </div>

        <div class="form-group">
          <div class="flex justify-between items-center">
            <label for="passwordInput">رمز عبور</label>
          </div>
          <div class="input-wrapper">
            <input
              id="passwordInput"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="حداقل ۶ کاراکتر"
              dir="ltr"
              autocomplete="current-password"
              required
              :disabled="loading"
              class="auth-input"
            />
            <button
              type="button"
              class="password-toggle-btn"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'"
              tabindex="-1"
            >
              <AppIcon :name="showPassword ? 'eye-slash' : 'eye'" size="18" color="var(--text-muted)" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="auth-submit-btn"
        >
          <span v-if="loading" class="auth-spinner"></span>
          <span>{{ loading ? 'در حال ورود...' : 'ورود به برنامه' }}</span>
        </button>
      </form>

      <!-- Footer Navigation Link -->
      <div class="auth-footer">
        <span>حساب کاربری ندارید؟</span>
        <router-link to="/register" class="auth-switch-link">ثبت‌نام رایگان</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';

const router = useRouter();
const authStore = useAuthStore();
const tasksStore = useTasksStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'لطفاً ایمیل و رمز عبور را وارد کنید.';
    return;
  }

  errorMessage.value = '';
  loading.value = true;

  try {
    await authStore.login(email.value.trim(), password.value);
    await tasksStore.fetchTasks();
    router.push('/app');
  } catch (err) {
    if (err.data?.errors) {
      const firstKey = Object.keys(err.data.errors)[0];
      errorMessage.value = err.data.errors[firstKey][0];
    } else {
      errorMessage.value = err.message || 'ایمیل یا رمز عبور اشتباه است.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-gradient, linear-gradient(135deg, #F5F3FF 0%, #E0E7FF 50%, #FCE7F3 100%));
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  box-shadow: 0 20px 40px -10px rgba(109, 40, 217, 0.12), 0 0 0 1px rgba(109, 40, 217, 0.05);
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
}

.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24px;
}

.auth-logo {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 900;
  box-shadow: 0 10px 20px -5px rgba(109, 40, 217, 0.35);
  margin-bottom: 12px;
}

.auth-title {
  font-size: 22px;
  font-weight: 900;
  color: #1E293B;
  margin-bottom: 4px;
}

.auth-subtitle {
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
}

.auth-header {
  margin-bottom: 20px;
  text-align: right;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  padding-top: 18px;
}

.auth-header h2 {
  font-size: 16px;
  font-weight: 800;
  color: #1E293B;
  margin-bottom: 4px;
}

.auth-header p {
  font-size: 12px;
  color: #64748B;
  line-height: 1.5;
}

.auth-error-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 12px;
  padding: 10px 14px;
  color: #DC2626;
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 18px;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: right;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-input {
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  padding: 11px 16px 11px 40px;
  font-size: 13px;
  color: #1E293B;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.auth-input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #94A3B8;
  pointer-events: none;
  display: flex;
  align-items: center;
}

.password-toggle-btn {
  position: absolute;
  left: 12px;
  color: #94A3B8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.15s;
}

.password-toggle-btn:hover {
  color: #475569;
}

.auth-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  padding: 13px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px -4px rgba(109, 40, 217, 0.3);
  transition: all 0.2s;
  margin-top: 8px;
}

.auth-submit-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 12px 20px -4px rgba(109, 40, 217, 0.38);
}

.auth-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #64748B;
}

.auth-switch-link {
  color: #7C3AED;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.15s;
}

.auth-switch-link:hover {
  color: #5B21B6;
  text-decoration: underline;
}
</style>
