<template>
  <div class="analytics-container" dir="rtl">
    <!-- Header -->
    <div class="analytics-header">
      <div class="flex items-center gap-2">
        <AppIcon name="status-up" type="bulk" size="28" color="var(--primary)" />
        <div>
          <h2 class="analytics-title">گزارش تحلیلی و آمار کارها</h2>
          <p class="analytics-subtitle">بررسی روند پیشرفت، نرخ بهره‌وری و توزیع فعالیت‌ها</p>
        </div>
      </div>
      <button
        type="button"
        class="refresh-btn"
        :disabled="loading"
        @click="fetchAnalytics"
        title="به‌روزرسانی آمار"
      >
        <AppIcon name="refresh-circle" :class="['refresh-icon', loading ? 'spin' : '']" size="18" />
        <span>بروزرسانی</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !stats" class="analytics-loading">
      <span>در حال محاسبه شاخص‌های آماری...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="analytics-error">
      <span>{{ error }}</span>
      <button class="btn-retry" @click="fetchAnalytics">تلاش مجدد</button>
    </div>

    <!-- Analytics Dashboard Content -->
    <div v-else-if="stats" class="analytics-content space-y-6">
      <!-- 4 Stat Cards + Completion Gauge -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Tasks -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-blue-100 text-blue-600">
              <AppIcon name="task-square" type="bulk" size="22" color="#2563eb" />
            </span>
            <span class="stat-label">کل برنامه‌ها</span>
          </div>
          <div class="stat-value">{{ toPersianDigits(summary.total) }}</div>
          <div class="stat-sub">مجموع تسک‌های ثبت‌شده</div>
        </div>

        <!-- Completed Tasks -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-emerald-100 text-emerald-600">
              <AppIcon name="tick-circle" type="bulk" size="22" color="#059669" />
            </span>
            <span class="stat-label">انجام شده‌ها</span>
          </div>
          <div class="stat-value text-emerald-600">{{ toPersianDigits(summary.completed) }}</div>
          <div class="stat-sub">{{ toPersianDigits(summary.rate) }}٪ از کل اهداف</div>
        </div>

        <!-- Pending Tasks -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-amber-100 text-amber-600">
              <AppIcon name="clock" type="bulk" size="22" color="#d97706" />
            </span>
            <span class="stat-label">در حال انتظار</span>
          </div>
          <div class="stat-value text-amber-600">{{ toPersianDigits(summary.pending) }}</div>
          <div class="stat-sub">کارهای فعال و نیازمند پیگیری</div>
        </div>

        <!-- Overdue Tasks -->
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-rose-100 text-rose-600">
              <AppIcon name="warning-2" type="bulk" size="22" color="#e11d48" />
            </span>
            <span class="stat-label">معوقه (دارای تاخیر)</span>
          </div>
          <div class="stat-value text-rose-600">{{ toPersianDigits(summary.overdue) }}</div>
          <div class="stat-sub">مهلت گذشته و هنوز انجام‌نشده</div>
        </div>
      </div>

      <!-- Charts Section: Weekly Trend & Completion Rate Radial -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Weekly Trend Bar Chart (2 cols) -->
        <div class="chart-card lg:col-span-2">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">روند عملکرد هفت روز اخیر</h3>
              <p class="chart-desc">تعداد کارهای تکمیل‌شده در مقایسه با کارهای ثبت‌شده</p>
            </div>
            <div class="legend flex gap-3 text-xs">
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> انجام شده
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-blue-300 dark:bg-blue-600 inline-block"></span> ایجاد شده
              </span>
            </div>
          </div>

          <div class="chart-body">
            <!-- Responsive SVG Bar Chart -->
            <svg class="w-full h-48" viewBox="0 0 560 180">
              <!-- Grid lines -->
              <line x1="30" y1="20" x2="540" y2="20" stroke="var(--border-color)" stroke-dasharray="3,3" />
              <line x1="30" y1="70" x2="540" y2="70" stroke="var(--border-color)" stroke-dasharray="3,3" />
              <line x1="30" y1="120" x2="540" y2="120" stroke="var(--border-color)" stroke-dasharray="3,3" />
              <line x1="30" y1="140" x2="540" y2="140" stroke="var(--border-color)" stroke-width="1.5" />

              <!-- Day Columns -->
              <g v-for="(day, idx) in weeklyTrend" :key="idx">
                <!-- Created bar -->
                <rect
                  :x="50 + (idx * 70)"
                  :y="140 - getBarHeight(day.created, maxWeeklyTotal)"
                  width="18"
                  :height="getBarHeight(day.created, maxWeeklyTotal)"
                  rx="4"
                  fill="#93c5fd"
                />
                <!-- Done bar -->
                <rect
                  :x="70 + (idx * 70)"
                  :y="140 - getBarHeight(day.completed, maxWeeklyTotal)"
                  width="18"
                  :height="getBarHeight(day.completed, maxWeeklyTotal)"
                  rx="4"
                  fill="#10b981"
                />
                <!-- Day label -->
                <text
                  :x="69 + (idx * 70)"
                  y="160"
                  text-anchor="middle"
                  font-size="11"
                  fill="var(--text-muted)"
                  font-family="Vazirmatn, sans-serif"
                >
                  {{ day.dayName }}
                </text>
                <!-- Count label -->
                <text
                  v-if="day.completed > 0 || day.created > 0"
                  :x="69 + (idx * 70)"
                  :y="132 - Math.max(getBarHeight(day.created, maxWeeklyTotal), getBarHeight(day.completed, maxWeeklyTotal))"
                  text-anchor="middle"
                  font-size="10"
                  font-weight="bold"
                  fill="var(--text-muted)"
                  font-family="Vazirmatn, sans-serif"
                >
                  {{ toPersianDigits(day.completed) }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Completion Rate Gauge / Progress Card (1 col) -->
        <div class="chart-card flex flex-col items-center justify-center p-6 text-center">
          <h3 class="chart-title self-start mb-2">شاخص بهره‌وری کل</h3>
          <div class="gauge-wrapper relative my-2">
            <svg class="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="var(--border-color)"
                stroke-width="10"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="#10b981"
                stroke-width="10"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 48"
                :stroke-dashoffset="(2 * Math.PI * 48) * (1 - (summary.rate / 100))"
                style="transition: stroke-dashoffset 0.8s ease;"
              />
            </svg>
            <div class="gauge-center absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-bold font-vazir text-emerald-600">
                {{ toPersianDigits(summary.rate) }}٪
              </span>
              <span class="text-xs text-muted">میزان تحقق</span>
            </div>
          </div>
          <p class="text-xs text-muted mt-2">
            از مجموع {{ toPersianDigits(summary.total) }} کار، {{ toPersianDigits(summary.completed) }} کار با موفقیت به اتمام رسیده است.
          </p>
        </div>
      </div>

      <!-- Monthly Trend & Category Distribution -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Monthly Trend Line/Area Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">روند ۶ ماه گذشته (تقویم جلالی)</h3>
              <p class="chart-desc">حجم کل کارها و روند تکمیل ماهانه</p>
            </div>
          </div>

          <div class="chart-body">
            <svg class="w-full h-44" viewBox="0 0 460 160">
              <line x1="20" y1="125" x2="440" y2="125" stroke="var(--border-color)" stroke-width="1" />
              <g v-for="(m, idx) in monthlyTrend" :key="idx">
                <circle
                  :cx="45 + (idx * 74)"
                  :cy="125 - getBarHeight(m.completed, maxMonthlyTotal, 80)"
                  r="5"
                  fill="#3b82f6"
                  stroke="var(--bg-card)"
                  stroke-width="2"
                />
                <text
                  :x="45 + (idx * 74)"
                  :y="115 - getBarHeight(m.completed, maxMonthlyTotal, 80)"
                  text-anchor="middle"
                  font-size="10"
                  font-weight="bold"
                  fill="#3b82f6"
                  font-family="Vazirmatn, sans-serif"
                >
                  {{ toPersianDigits(m.completed) }}
                </text>
                <text
                  :x="45 + (idx * 74)"
                  y="145"
                  text-anchor="middle"
                  font-size="11"
                  fill="var(--text-muted)"
                  font-family="Vazirmatn, sans-serif"
                >
                  {{ m.monthName }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Categories Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">توزیع کارها بر اساس دسته‌بندی</h3>
              <p class="chart-desc">تفکیک فعالیت‌ها در دسته‌های تعریف‌شده</p>
            </div>
          </div>

          <div class="chart-body space-y-3 p-2">
            <div v-if="categories.length === 0" class="text-xs text-muted text-center py-8">
              هنوز دسته‌بندی خاصی برای کارها تعیین نشده است.
            </div>

            <div
              v-for="cat in categories"
              :key="cat.name"
              class="cat-bar-item"
            >
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span class="flex items-center gap-1.5">
                  <span
                    class="w-2.5 h-2.5 rounded-full"
                    :style="{ backgroundColor: cat.color || '#94a3b8' }"
                  ></span>
                  <span>{{ cat.name }}</span>
                </span>
                <span class="text-muted">
                  {{ toPersianDigits(cat.count) }} کار ({{ toPersianDigits(cat.percent) }}٪)
                </span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  class="h-2 rounded-full transition-all duration-500"
                  :style="{
                    width: cat.percent + '%',
                    backgroundColor: cat.color || '#3b82f6'
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiRequest } from '@/api/client';
import { toPersianDigits } from '@/utils/jalali';

const stats = ref(null);
const loading = ref(true);
const error = ref(null);

const summary = computed(() => {
  return stats.value?.summary || {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    rate: 0
  };
});

const weeklyTrend = computed(() => {
  return stats.value?.weeklyTrend || [];
});

const monthlyTrend = computed(() => {
  return stats.value?.monthlyTrend || [];
});

const categories = computed(() => {
  return stats.value?.categories || [];
});

async function fetchAnalytics() {
  loading.value = true;
  error.value = null;
  try {
    const data = await apiRequest('/api/analytics');
    stats.value = data;
  } catch (err) {
    error.value = 'خطا در بارگذاری اطلاعات آماری: ' + (err.message || 'خطای سرور');
  } finally {
    loading.value = false;
  }
}

const maxWeeklyTotal = computed(() => {
  if (!weeklyTrend.value || weeklyTrend.value.length === 0) return 5;
  const max = Math.max(
    ...weeklyTrend.value.map(d => Math.max(d.created || 0, d.completed || 0)),
    3
  );
  return max;
});

const maxMonthlyTotal = computed(() => {
  if (!monthlyTrend.value || monthlyTrend.value.length === 0) return 5;
  const max = Math.max(
    ...monthlyTrend.value.map(m => Math.max(m.created || 0, m.completed || 0)),
    3
  );
  return max;
});

function getBarHeight(val, max, heightLimit = 90) {
  if (!val || !max) return 0;
  return Math.max(4, Math.round((val / max) * heightLimit));
}

onMounted(() => {
  fetchAnalytics();
});
</script>

<style scoped>
.analytics-container {
  padding: 16px 20px;
  overflow-y: auto;
  height: 100%;
}

.analytics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.analytics-header-icon {
  font-size: 28px;
}

.analytics-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.analytics-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 2px 0 0 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.refresh-btn:hover {
  border-color: var(--primary);
}

.refresh-icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.stat-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}

.stat-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.chart-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin: 2px 0 0 0;
}

.analytics-loading,
.analytics-error {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.btn-retry {
  margin-top: 10px;
  padding: 6px 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
