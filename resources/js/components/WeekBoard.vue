<template>
  <div class="week-board-wrapper">
    <!-- Week Navigation Toolbar -->
    <div class="week-toolbar">
      <button
        type="button"
        class="month-nav-btn prev-btn"
        @click="shiftWeek(-1)"
        title="هفته قبل"
        aria-label="هفته قبل"
      >
        <AppIcon name="arrow-right-01" size="16" />
      </button>
      <div class="week-title">
        <span>برد ۷ روز هفته</span>
        <small class="week-range-label">{{ weekRangeLabel }}</small>
      </div>
      <button
        type="button"
        class="month-nav-btn next-btn"
        @click="shiftWeek(1)"
        title="هفته بعد"
        aria-label="هفته بعد"
      >
        <AppIcon name="arrow-left-01" size="16" />
      </button>
      <button v-if="weekOffset !== 0" type="button" class="btn-add" style="padding: 4px 12px; font-size: 11px;" @click="resetToCurrentWeek">
        این هفته
      </button>
    </div>

    <!-- Mobile Day Tabs Quick Selector -->
    <div class="mobile-week-tabs">
      <button
        v-for="day in weekDays"
        :key="'tab-' + day.iso"
        type="button"
        :class="['mobile-day-tab', activeMobileDayISO === day.iso ? 'active' : '', day.isToday ? 'is-today' : '']"
        @click="selectMobileDay(day.iso)"
      >
        <span class="tab-day-name">{{ day.dayName }}</span>
        <span class="tab-count-badge">({{ toPersianDigits(getDayTasks(day.iso).length) }})</span>
      </button>
    </div>

    <!-- 7 Day Columns Grid (Desktop: 7 Columns, Mobile: Horizontal Snap Cards) -->
    <div ref="weekContainerRef" class="week-board-container active">
      <div
        v-for="day in weekDays"
        :key="day.iso"
        :id="'day-col-' + day.iso"
        :class="['day-column-card', day.isToday ? 'is-today' : '']"
      >
        <div class="day-col-header">
          <div>
            <div class="day-col-title">{{ day.dayName }}</div>
            <div class="day-col-sub">{{ day.dateLabel }}</div>
          </div>
          <span v-if="day.isToday" class="today-badge">امروز</span>
          <span v-else class="badge">{{ toPersianDigits(getDayTasks(day.iso).length) }}</span>
        </div>

        <div class="day-col-tasks">
          <div v-if="getDayTasks(day.iso).length === 0" class="day-empty">
            بدون برنامه
          </div>

          <div
            v-for="t in getDayTasks(day.iso)"
            :key="t.id"
            :class="['day-mini-task', t.completed ? 'completed' : '']"
            @click="openDrawer(t.id)"
          >
            <div class="mini-top">
              <input
                type="checkbox"
                :checked="t.completed"
                @click.stop="tasksStore.toggleComplete(t.id)"
              />
              <span class="mini-title">{{ t.title }}</span>
              <button
                v-if="t.important"
                class="text-amber-500 text-xs ml-auto shrink-0"
                title="مهم"
                @click.stop="tasksStore.toggleImportant(t.id)"
              >
                ★
              </button>
            </div>
            <div class="mini-meta">
              <span>{{ t.dueTime ? '⏰ ' + toPersianDigits(t.dueTime) : '' }}</span>
              <span v-if="t.alarmEnabled || t.alarm_enabled" class="mini-alarm" title="آلارم فعال">🔔</span>
            </div>
          </div>
        </div>

        <div class="day-col-footer">
          <input
            type="text"
            placeholder="+ کار جدید"
            :title="'افزودن کار در ' + day.dayName"
            @keydown.enter="quickAddForDay(day.iso, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import {
  getLocalISODate,
  toPersianDigits,
  isoToJalali,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES
} from '@/utils/jalali';

const tasksStore = useTasksStore();
const weekOffset = ref(0);
const activeMobileDayISO = ref(getLocalISODate());
const weekContainerRef = ref(null);

function selectMobileDay(iso) {
  activeMobileDayISO.value = iso;
  const targetEl = document.getElementById('day-col-' + iso);
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}

function shiftWeek(delta) {
  weekOffset.value += delta;
}

function resetToCurrentWeek() {
  weekOffset.value = 0;
}

const weekDays = computed(() => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  now.setDate(now.getDate() + (weekOffset.value * 7));
  const todayISO = getLocalISODate(new Date());

  const dayIndexFromSaturday = (now.getDay() + 1) % 7;
  const saturday = new Date(now);
  saturday.setHours(12, 0, 0, 0);
  saturday.setDate(now.getDate() - dayIndexFromSaturday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    const iso = getLocalISODate(d);
    const dayName = PERSIAN_WEEKDAY_NAMES[i];
    const j = isoToJalali(iso);
    const dateLabel = j ? `${toPersianDigits(j.jd)} ${PERSIAN_MONTH_NAMES[j.jm - 1]}` : iso;

    days.push({
      iso,
      dayName,
      dateLabel,
      isToday: iso === todayISO
    });
  }
  return days;
});

const weekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return '';
  const first = weekDays.value[0];
  const last = weekDays.value[6];
  return `از ${first.dateLabel} تا ${last.dateLabel}`;
});

function getDayTasks(iso) {
  const q = tasksStore.searchQuery.trim().toLowerCase();
  return tasksStore.tasks.filter(t => {
    const d = t.dueDate || t.due_date;
    if (d !== iso) return false;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

function openDrawer(taskId) {
  tasksStore.selectedTaskId = taskId;
}

async function quickAddForDay(isoDate, event) {
  const val = event.target.value.trim();
  if (!val) return;

  await tasksStore.addTask({
    title: val,
    dueDate: isoDate,
    due_date: isoDate,
    period: 'weekly',
    myDay: isoDate === getLocalISODate(),
    my_day: isoDate === getLocalISODate()
  });

  event.target.value = '';
}
</script>

<style scoped>
.week-board-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 8px;
}

.week-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 4px 20px 0;
}

.week-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
}

.week-range-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.mobile-week-tabs {
  display: none;
}

@media (max-width: 768px) {
  .mobile-week-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .mobile-week-tabs::-webkit-scrollbar {
    display: none;
  }
  .mobile-day-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 20px;
    background: var(--bg-hover, #F1F5F9);
    border: 1px solid var(--border);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .mobile-day-tab.active {
    background: var(--primary);
    color: #FFFFFF;
    border-color: var(--primary);
  }
  .mobile-day-tab.is-today:not(.active) {
    border-color: var(--primary);
    color: var(--primary);
  }
  .tab-count-badge {
    font-size: 10px;
    opacity: 0.85;
  }

  .week-board-container {
    display: flex !important;
    overflow-x: auto !important;
    scroll-snap-type: x mandatory !important;
    gap: 12px !important;
    padding: 6px 14px 20px !important;
    -webkit-overflow-scrolling: touch;
  }
  .day-column-card {
    min-width: min(310px, calc(100vw - 44px)) !important;
    max-width: 330px !important;
    scroll-snap-align: start;
    flex-shrink: 0;
  }
  .week-toolbar {
    padding: 4px 12px 0;
  }
  .week-title {
    font-size: 13.5px;
  }
}
</style>
