import assert from 'assert';
import { parsePersianQuickTask } from '../../resources/js/utils/quickParser.js';
import { getLocalISODate, addDaysISO } from '../../resources/js/utils/jalali.js';

console.log('Running Offline Persian Natural-Language Quick Entry Parser Tests...');

const refDate = new Date(2026, 9, 26, 12, 0, 0); // Monday, 2026-10-26 (۴ آبan ۱۴۰۵)
const todayISO = getLocalISODate(refDate);

// 1. «فردا ساعت ۹ جلسه»
const p1 = parsePersianQuickTask('فردا ساعت ۹ جلسه', refDate);
assert.strictEqual(p1.title, 'جلسه');
assert.strictEqual(p1.dueDate, addDaysISO(todayISO, 1));
assert.strictEqual(p1.dueTime, '09:00');
assert.strictEqual(p1.hasParsedIntent, true);
console.log('  ✓ «فردا ساعت ۹ جلسه» -> فردا، ۰۹:۰۰، جلسه');

// 2. «پسفردا ساعت ۱۸ ورزش مهم»
const p2 = parsePersianQuickTask('پسفردا ساعت ۱۸ ورزش مهم', refDate);
assert.strictEqual(p2.title, 'ورزش');
assert.strictEqual(p2.dueDate, addDaysISO(todayISO, 2));
assert.strictEqual(p2.dueTime, '18:00');
assert.strictEqual(p2.important, true);
console.log('  ✓ «پسفردا ساعت ۱۸ ورزش مهم» -> پس‌فردا، ۱۸:۰۰، مهم، ورزش');

// 3. «هر دوشنبه ساعت ۸ کلاس #دانشگاه»
const p3 = parsePersianQuickTask('هر دوشنبه ساعت ۸ کلاس #دانشگاه', refDate);
assert.strictEqual(p3.title, 'کلاس');
assert.strictEqual(p3.dueTime, '08:00');
assert.deepStrictEqual(p3.recurrence, { pattern: 'weekly', interval: 1, weekdays: [2] });
assert.deepStrictEqual(p3.tags, ['دانشگاه']);
console.log('  ✓ «هر دوشنبه ساعت ۸ کلاس #دانشگاه» -> تکرار دوشنبه‌ها، ۰۸:۰۰، #دانشگاه');

// 4. «هر روز صبح ورزش»
const p4 = parsePersianQuickTask('هر روز صبح ورزش', refDate);
assert.strictEqual(p4.title, 'ورزش');
assert.strictEqual(p4.dueTime, '09:00');
assert.strictEqual(p4.recurrence.pattern, 'daily');
console.log('  ✓ «هر روز صبح ورزش» -> تکرار روزانه، ۰۹:۰۰، ورزش');

// 5. «ساعت ۸ و نیم جلسه فوری»
const p5 = parsePersianQuickTask('ساعت ۸ و نیم جلسه فوری', refDate);
assert.strictEqual(p5.title, 'جلسه');
assert.strictEqual(p5.dueTime, '08:30');
assert.strictEqual(p5.important, true);
console.log('  ✓ «ساعت ۸ و نیم جلسه فوری» -> ۰۸:۳۰، مهم، جلسه');

// 6. «شنبه آینده ساعت ۱۴ خرید»
const p6 = parsePersianQuickTask('شنبه آینده ساعت ۱۴ خرید', refDate);
assert.strictEqual(p6.title, 'خرید');
assert.strictEqual(p6.dueTime, '14:00');
assert.strictEqual(p6.hasParsedIntent, true);
console.log('  ✓ «شنبه آینده ساعت ۱۴ خرید» -> شنبه آینده، ۱۴:۰۰، خرید');

// 7. Plain text without dates or times
const p7 = parsePersianQuickTask('خرید میوه و نان برای خانه', refDate);
assert.strictEqual(p7.title, 'خرید میوه و نان برای خانه');
assert.strictEqual(p7.hasParsedIntent, false);
assert.strictEqual(p7.dueTime, null);
console.log('  ✓ متن ساده بدون قید زمان با موفقیت بدون تغییر باقی ماند');

console.log('\nALL 7 QUICK ENTRY PARSER TESTS PASSED CLEANLY!\n');
