<template>
  <div class="month-board-container active">
    <!-- Toolbar -->
    <div class="month-toolbar">
      <button
        type="button"
        class="month-nav-btn prev-btn"
        @click="shiftMonth(-1)"
        title="ماه قبل"
        aria-label="ماه قبل"
      >
        <AppIcon name="arrow-right-01" size="16" />
      </button>
      <div class="month-title">
        {{ PERSIAN_MONTH_NAMES[currentJm - 1] }} {{ toPersianDigits(currentJy) }}
        <small>({{ toPersianDigits(monthLength) }} روز — {{ toPersianDigits(totalMonthTasks) }} کار)</small>
      </div>
      <button
        type="button"
        class="month-nav-btn next-btn"
        @click="shiftMonth(1)"
        title="ماه بعد"
        aria-label="ماه بعد"
      >
        <AppIcon name="arrow-left-01" size="16" />
      </button>
      <button type="button" class="btn-add" style="padding: 4px 14px; font-size: 11.5px;" @click="goToday">امروز</button>
    </div>

    <!-- 7-Column Month Grid -->
    <div class="month-grid" :style="{ '--rows': totalRows }">
      <!-- Weekday Headers -->
      <div
        v-for="(wName, idx) in PERSIAN_WEEKDAY_NAMES"
        :key="'head-' + idx"
        :class="['month-weekday', idx === 6 ? 'friday' : '']"
      >
        <span class="desktop-wname">{{ wName }}</span>
        <span class="mobile-wname">{{ ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'][idx] }}</span>
      </div>

      <!-- Empty Offset Cells -->
      <div
        v-for="e in startOffset"
        :key="'empty-' + e"
        class="month-cell empty"
      ></div>

      <!-- Day Cells -->
      <div
        v-for="d in monthLength"
        :key="'day-' + d"
        :class="[
          'month-cell',
          getDayISO(d) === todayISO ? 'is-today' : '',
          getDayCol(d) === 6 ? 'friday' : '',
          getDayTasks(getDayISO(d)).length ? 'has-tasks' : ''
        ]"
        @click="openDayDetail(getDayISO(d))"
        :title="formatJalaliLong(getDayISO(d), true) + ' — ' + toPersianDigits(getDayTasks(getDayISO(d)).length) + ' کار'"
      >
        <div class="month-cell-head">
          <span class="month-day-num">{{ toPersianDigits(d) }}</span>
          <span v-if="getDayTasks(getDayISO(d)).length" class="month-count">
            {{ toPersianDigits(getDayTasks(getDayISO(d)).length) }}
          </span>
        </div>

        <div class="month-cell-tasks">
          <div
            v-for="t in getDayTasks(getDayISO(d)).slice(0, 2)"
            :key="t.id"
            :class="['month-chip', t.completed ? 'done' : '']"
          >
            {{ t.title }}
          </div>
          <div v-if="getDayTasks(getDayISO(d)).length > 2" class="month-more">
            +{{ toPersianDigits(getDayTasks(getDayISO(d)).length - 2) }} مورد دیگر
          </div>
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
  isoToJalali,
  jalaliToISO,
  jalaliMonthLength,
  jalaliToGregorian,
  persianWeekdayIndex,
  toPersianDigits,
  formatJalaliLong,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES
} from '@/utils/jalali';

const tasksStore = useTasksStore();
const todayISO = getLocalISODate();
const todayJalali = isoToJalali(todayISO) || { jy: 1405, jm: 1, jd: 1 };

const currentJy = ref(todayJalali.jy);
const currentJm = ref(todayJalali.jm);

const monthLength = computed(() => {
  return jalaliMonthLength(currentJy.value, currentJm.value);
});

const startOffset = computed(() => {
  const g = jalaliToGregorian(currentJy.value, currentJm.value, 1);
  return persianWeekdayIndex(new Date(g.gy, g.gm - 1, g.gd));
});

const totalRows = computed(() => {
  return Math.ceil((startOffset.value + monthLength.value) / 7);
});

function getDayISO(d) {
  return jalaliToISO(currentJy.value, currentJm.value, d);
}

function getDayCol(d) {
  return (startOffset.value + d - 1) % 7;
}

function shiftMonth(delta) {
  let jy = currentJy.value;
  let jm = currentJm.value + delta;
  while (jm > 12) {
    jm -= 12;
    jy++;
  }
  while (jm < 1) {
    jm += 12;
    jy--;
  }
  currentJy.value = jy;
  currentJm.value = jm;
}

function goToday() {
  const j = isoToJalali(getLocalISODate());
  if (j) {
    currentJy.value = j.jy;
    currentJm.value = j.jm;
  }
}

const totalMonthTasks = computed(() => {
  const fromISO = jalaliToISO(currentJy.value, currentJm.value, 1);
  const toISO = jalaliToISO(currentJy.value, currentJm.value, monthLength.value);
  return tasksStore.tasks.filter(t => {
    const d = t.dueDate || t.due_date;
    return d && d >= fromISO && d <= toISO;
  }).length;
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

function openDayDetail(iso) {
  tasksStore.selectedDateISO = iso;
  tasksStore.currentView = 'daydetail';
}
</script>

<style scoped>
.mobile-wname {
  display: none;
}
.desktop-wname {
  display: inline;
}

@media (max-width: 640px) {
  .mobile-wname {
    display: inline;
  }
  .desktop-wname {
    display: none;
  }
  .month-board-container {
    padding: 0 8px 14px;
  }
  .month-toolbar {
    padding: 0 4px;
    gap: 6px;
  }
  .month-title {
    font-size: 13.5px;
  }
  .month-title small {
    display: none;
  }
  .month-grid {
    gap: 3px;
  }
  .month-cell {
    padding: 4px 2px;
    min-height: 44px;
  }
  .month-day-num {
    font-size: 11px;
  }
  .month-count {
    font-size: 8.5px;
    padding: 1px 4px;
  }
  .month-cell-tasks {
    display: none;
  }
}
</style>
