/**
 * TaskYar Web 2.0 - Offline Persian Natural-Language Quick Task Parser
 * Deterministic rule-based parser without external AI or network calls.
 */

import {
  getLocalISODate,
  addDaysISO,
  normalizeDigits,
  isoToJalali,
  persianWeekdayIndex,
  PERSIAN_WEEKDAY_NAMES
} from './jalali.js';

const WEEKDAY_MAP = {
  'شنبه': 0,
  'یکشنبه': 1,
  'یک‌شنبه': 1,
  'دوشنبه': 2,
  'سه‌شنبه': 3,
  'سه شنبه': 3,
  'چهارشنبه': 4,
  'پنج‌شنبه': 5,
  'پنج شنبه': 5,
  'جمعه': 6
};

/**
 * Parse Persian natural language string into structured task properties.
 */
export function parsePersianQuickTask(rawInput, referenceDate = new Date()) {
  if (!rawInput || typeof rawInput !== 'string') {
    return null;
  }

  let text = rawInput.trim();
  if (!text) return null;

  // Normalized version for numeric regex matching
  let normText = normalizeDigits(text);

  let dueDate = null;
  let dueTime = null;
  let important = false;
  let recurrence = null;
  const tags = [];
  const matched = {};

  // 1. Extract hashtags: e.g. #کار #پروژه #دانشگاه
  const tagMatches = normText.match(/#([\p{L}\p{N}_]+)/gu);
  if (tagMatches) {
    tagMatches.forEach(tag => {
      const cleanTag = tag.replace('#', '').trim();
      if (cleanTag) tags.push(cleanTag);
    });
    normText = normText.replace(/#([\p{L}\p{N}_]+)/gu, ' ');
  }

  // 2. Extract Priority / Important keywords
  if (/(?:^|\s)(?:مهم|فوری|ضروری|با اولویت بالا)(?:\s|$)/u.test(normText)) {
    important = true;
    matched.priorityText = 'مهم';
    normText = normText.replace(/(?:^|\s)(?:مهم|فوری|ضروری|با اولویت بالا)(?:\s|$)/u, ' ');
  }

  // 3. Extract Recurrence Phrases
  // «هر روز» -> daily
  if (/(?:^|\s)هر\s*روز(?:\s|$)/u.test(normText)) {
    recurrence = { pattern: 'daily', interval: 1 };
    matched.recurrenceText = 'هر روز';
    normText = normText.replace(/(?:^|\s)هر\s*روز(?:\s|$)/u, ' ');
  }
  // «هر هفته» -> weekly
  else if (/(?:^|\s)هر\s*هفته(?:\s|$)/u.test(normText)) {
    recurrence = { pattern: 'weekly', interval: 1 };
    matched.recurrenceText = 'هر هفته';
    normText = normText.replace(/(?:^|\s)هر\s*هفته(?:\s|$)/u, ' ');
  }
  // «هر ماه» -> monthly
  else if (/(?:^|\s)هر\s*ماه(?:\s|$)/u.test(normText)) {
    recurrence = { pattern: 'monthly', interval: 1 };
    matched.recurrenceText = 'هر ماه';
    normText = normText.replace(/(?:^|\s)هر\s*ماه(?:\s|$)/u, ' ');
  }
  // «هر سال» -> yearly
  else if (/(?:^|\s)هر\s*سال(?:\s|$)/u.test(normText)) {
    recurrence = { pattern: 'yearly', interval: 1 };
    matched.recurrenceText = 'هر سال';
    normText = normText.replace(/(?:^|\s)هر\s*سال(?:\s|$)/u, ' ');
  }
  // «هر شنبه» / «هر دوشنبه» etc.
  else {
    const everyWeekdayMatch = normText.match(/(?:^|\s)هر\s*(شنبه|یک‌?شنبه|دوشنبه|سه‌?\s*شنبه|چهارشنبه|پنج‌?\s*شنبه|جمعه)(?:\s|$)/u);
    if (everyWeekdayMatch) {
      const wName = everyWeekdayMatch[1].replace(/\s+/g, '');
      const wIdx = WEEKDAY_MAP[wName] ?? WEEKDAY_MAP[everyWeekdayMatch[1]];
      if (wIdx !== undefined) {
        recurrence = {
          pattern: 'weekly',
          interval: 1,
          weekdays: [wIdx]
        };
        matched.recurrenceText = `هر ${everyWeekdayMatch[1]}`;
        normText = normText.replace(everyWeekdayMatch[0], ' ');
      }
    }
  }

  const todayISO = getLocalISODate(referenceDate);

  // 4. Extract Relative Dates
  // «پس‌فردا» / «پسفردا» / «پس فردا»
  if (/(?:^|\s)(?:پس‌?فردا|پس\s+فردا)(?:\s|$)/u.test(normText)) {
    dueDate = addDaysISO(todayISO, 2);
    matched.dateText = 'پس‌فردا';
    normText = normText.replace(/(?:^|\s)(?:پس‌?فردا|پس\s+فردا)(?:\s|$)/u, ' ');
  }
  // «فردا»
  else if (/(?:^|\s)فردا(?:\s|$)/u.test(normText)) {
    dueDate = addDaysISO(todayISO, 1);
    matched.dateText = 'فردا';
    normText = normText.replace(/(?:^|\s)فردا(?:\s|$)/u, ' ');
  }
  // «امروز»
  else if (/(?:^|\s)امروز(?:\s|$)/u.test(normText)) {
    dueDate = todayISO;
    matched.dateText = 'امروز';
    normText = normText.replace(/(?:^|\s)امروز(?:\s|$)/u, ' ');
  }
  // «دیروز»
  else if (/(?:^|\s)دیروز(?:\s|$)/u.test(normText)) {
    dueDate = addDaysISO(todayISO, -1);
    matched.dateText = 'دیروز';
    normText = normText.replace(/(?:^|\s)دیروز(?:\s|$)/u, ' ');
  }
  // Weekday with «آینده» or «بعد» (e.g. «شنبه آینده», «دوشنبه بعد»)
  else {
    const nextWeekdayMatch = normText.match(/(?:^|\s)(شنبه|یک‌?شنبه|دوشنبه|سه‌?\s*شنبه|چهارشنبه|پنج‌?\s*شنبه|جمعه)\s+(?:آینده|بعد)(?:\s|$)/u);
    if (nextWeekdayMatch) {
      const rawName = nextWeekdayMatch[1];
      const normalizedWName = rawName.replace(/\s+/g, '');
      const targetWIdx = WEEKDAY_MAP[normalizedWName] ?? WEEKDAY_MAP[rawName];
      if (targetWIdx !== undefined) {
        const currentWIdx = persianWeekdayIndex(referenceDate);
        let daysToAdd = (targetWIdx - currentWIdx + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // Next week
        dueDate = addDaysISO(todayISO, daysToAdd);
        matched.dateText = `${rawName} آینده`;
        normText = normText.replace(nextWeekdayMatch[0], ' ');
      }
    }
    // «این شنبه» / «این دوشنبه»
    else {
      const thisWeekdayMatch = normText.match(/(?:^|\s)این\s+(شنبه|یک‌?شنبه|دوشنبه|سه‌?\s*شنبه|چهارشنبه|پنج‌?\s*شنبه|جمعه)(?:\s|$)/u);
      if (thisWeekdayMatch) {
        const rawName = thisWeekdayMatch[1];
        const normalizedWName = rawName.replace(/\s+/g, '');
        const targetWIdx = WEEKDAY_MAP[normalizedWName] ?? WEEKDAY_MAP[rawName];
        if (targetWIdx !== undefined) {
          const currentWIdx = persianWeekdayIndex(referenceDate);
          let daysToAdd = targetWIdx - currentWIdx;
          dueDate = addDaysISO(todayISO, daysToAdd);
          matched.dateText = `این ${rawName}`;
          normText = normText.replace(thisWeekdayMatch[0], ' ');
        }
      }
      // Standalone weekday (e.g. «دوشنبه ساعت ۱۰ جلسه»)
      else {
        const standaloneWeekdayMatch = normText.match(/(?:^|\s)(شنبه|یک‌?شنبه|دوشنبه|سه‌?\s*شنبه|چهارشنبه|پنج‌?\s*شنبه|جمعه)(?:\s|$)/u);
        if (standaloneWeekdayMatch) {
          const rawName = standaloneWeekdayMatch[1];
          const normalizedWName = rawName.replace(/\s+/g, '');
          const targetWIdx = WEEKDAY_MAP[normalizedWName] ?? WEEKDAY_MAP[rawName];
          if (targetWIdx !== undefined) {
            const currentWIdx = persianWeekdayIndex(referenceDate);
            let daysToAdd = (targetWIdx - currentWIdx + 7) % 7;
            if (daysToAdd === 0 && !normText.includes('ساعت')) {
              // Same day
              daysToAdd = 0;
            }
            dueDate = addDaysISO(todayISO, daysToAdd);
            matched.dateText = rawName;
            normText = normText.replace(standaloneWeekdayMatch[0], ' ');
          }
        }
      }
    }
  }

  // 5. Extract Time Expressions
  // «ساعت ۸ و نیم» / «ساعت ۸ و ربع»
  const halfQuarterMatch = normText.match(/(?:^|\s)ساعت\s*(\d{1,2})\s*و\s*(نیم|ربع)(?:\s|$)/u);
  if (halfQuarterMatch) {
    let hour = Number(halfQuarterMatch[1]);
    const minutes = halfQuarterMatch[2] === 'نیم' ? '30' : '15';
    // Check for evening/night modifiers
    if (/(?:عصر|غروب|شب)/u.test(normText) && hour < 12) {
      hour += 12;
    }
    dueTime = `${String(hour).padStart(2, '0')}:${minutes}`;
    matched.timeText = `ساعت ${halfQuarterMatch[1]} و ${halfQuarterMatch[2]}`;
    normText = normText.replace(halfQuarterMatch[0], ' ');
  } else {
    // «ساعت ۱۴:۳۰» or «ساعت ۹»
    const explicitTimeMatch = normText.match(/(?:^|\s)ساعت\s*(\d{1,2})(?::(\d{1,2}))?(?:\s|$)/u);
    if (explicitTimeMatch) {
      let hour = Number(explicitTimeMatch[1]);
      const minute = explicitTimeMatch[2] ? explicitTimeMatch[2].padStart(2, '0') : '00';
      if (/(?:عصر|غروب|شب)/u.test(normText) && hour < 12) {
        hour += 12;
      }
      dueTime = `${String(hour).padStart(2, '0')}:${minute}`;
      matched.timeText = explicitTimeMatch[0].trim();
      normText = normText.replace(explicitTimeMatch[0], ' ');
    } else {
      // Standalone time: «14:30» or «09:00»
      const digitalTimeMatch = normText.match(/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)/u);
      if (digitalTimeMatch) {
        let hour = Number(digitalTimeMatch[1]);
        const minute = digitalTimeMatch[2];
        if (hour >= 0 && hour <= 23 && Number(minute) >= 0 && Number(minute) <= 59) {
          dueTime = `${String(hour).padStart(2, '0')}:${minute}`;
          matched.timeText = `${digitalTimeMatch[1]}:${digitalTimeMatch[2]}`;
          normText = normText.replace(digitalTimeMatch[0], ' ');
        }
      } else {
        // Broad time keywords: «صبح» (09:00), «ظهر» (12:00), «عصر» (17:00), «غروب» (19:00), «شب» (21:00)
        if (/(?:^|\s)صبح(?:\s|$)/u.test(normText)) {
          dueTime = '09:00';
          matched.timeText = 'صبح (۰۹:۰۰)';
          normText = normText.replace(/(?:^|\s)صبح(?:\s|$)/u, ' ');
        } else if (/(?:^|\s)ظهر(?:\s|$)/u.test(normText)) {
          dueTime = '12:00';
          matched.timeText = 'ظهر (۱۲:۰۰)';
          normText = normText.replace(/(?:^|\s)ظهر(?:\s|$)/u, ' ');
        } else if (/(?:^|\s)عصر(?:\s|$)/u.test(normText)) {
          dueTime = '17:00';
          matched.timeText = 'عصر (۱۷:۰۰)';
          normText = normText.replace(/(?:^|\s)عصر(?:\s|$)/u, ' ');
        } else if (/(?:^|\s)غروب(?:\s|$)/u.test(normText)) {
          dueTime = '19:00';
          matched.timeText = 'غروب (۱۹:۰۰)';
          normText = normText.replace(/(?:^|\s)غروب(?:\s|$)/u, ' ');
        } else if (/(?:^|\s)شب(?:\s|$)/u.test(normText)) {
          dueTime = '21:00';
          matched.timeText = 'شب (۲۱:۰۰)';
          normText = normText.replace(/(?:^|\s)شب(?:\s|$)/u, ' ');
        }
      }
    }
  }

  // 6. Final Clean Title
  const cleanedTitle = normText
    .replace(/[،,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If title became completely empty, fallback to original trimmed text
  const finalTitle = cleanedTitle || rawInput.trim();

  // Calculate confidence score
  let detectedSignals = 0;
  if (dueDate) detectedSignals++;
  if (dueTime) detectedSignals++;
  if (important) detectedSignals++;
  if (recurrence) detectedSignals++;
  if (tags.length > 0) detectedSignals++;

  const confidence = detectedSignals > 0 ? Math.min(1, 0.4 + detectedSignals * 0.2) : 0.2;

  return {
    rawInput,
    title: finalTitle,
    dueDate: dueDate || todayISO,
    dueTime,
    important,
    tags,
    recurrence,
    matched,
    hasParsedIntent: detectedSignals > 0,
    confidence
  };
}

export const parsePersianQuickEntry = parsePersianQuickTask;
