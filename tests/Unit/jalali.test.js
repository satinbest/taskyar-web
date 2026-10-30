import {
    gregorianToJalali,
    jalaliToGregorian,
    isLeapJalali,
    jalaliMonthLength,
    isoToJalali,
    jalaliToISO,
    toPersianDigits,
    normalizeDigits,
    formatJalaliLong,
    addDaysISO
} from '../../resources/js/utils/jalali.js';
import assert from 'assert';

console.log('Running Jalali Calendar & Digit Tests...');

// 1. Gregorian to Jalali conversion test
const j1 = gregorianToJalali(2026, 3, 21); // Nowruz 1405
assert.strictEqual(j1.jy, 1405);
assert.strictEqual(j1.jm, 1);
assert.strictEqual(j1.jd, 1);
console.log('  ✓ 2026-03-21 -> 1405/01/01 (Nowruz) verified');

// 2. Jalali to Gregorian conversion test
const g1 = jalaliToGregorian(1405, 1, 1);
assert.strictEqual(g1.gy, 2026);
assert.strictEqual(g1.gm, 3);
assert.strictEqual(g1.gd, 21);
console.log('  ✓ 1405/01/01 -> 2026-03-21 verified');

// 3. Round-trip accuracy across 100 consecutive days
let testDate = new Date(2026, 0, 1);
for (let i = 0; i < 100; i++) {
    const gy = testDate.getFullYear();
    const gm = testDate.getMonth() + 1;
    const gd = testDate.getDate();
    const j = gregorianToJalali(gy, gm, gd);
    const gBack = jalaliToGregorian(j.jy, j.jm, j.jd);
    assert.strictEqual(gBack.gy, gy);
    assert.strictEqual(gBack.gm, gm);
    assert.strictEqual(gBack.gd, gd);
    testDate.setDate(testDate.getDate() + 1);
}
console.log('  ✓ 100 consecutive days round-trip accuracy verified');

// 4. Leap years test
assert.strictEqual(isLeapJalali(1399), true, '1399 is a leap year');
assert.strictEqual(isLeapJalali(1400), false, '1400 is not a leap year');
assert.strictEqual(isLeapJalali(1403), true, '1403 is a leap year');
assert.strictEqual(isLeapJalali(1404), false, '1404 is not a leap year');
console.log('  ✓ Jalali leap years (1399, 1403) verified');

// 5. Month lengths & boundaries
assert.strictEqual(jalaliMonthLength(1405, 1), 31, 'Farvardin has 31 days');
assert.strictEqual(jalaliMonthLength(1405, 6), 31, 'Shahrivar has 31 days');
assert.strictEqual(jalaliMonthLength(1405, 7), 30, 'Mehr has 30 days');
assert.strictEqual(jalaliMonthLength(1405, 11), 30, 'Bahman has 30 days');
assert.strictEqual(jalaliMonthLength(1405, 12), 29, 'Esfand has 29 days in normal year');
assert.strictEqual(jalaliMonthLength(1403, 12), 30, 'Esfand has 30 days in leap year');
console.log('  ✓ Jalali month lengths and boundaries verified');

// 6. Persian digits formatting & normalization
assert.strictEqual(toPersianDigits(1405), '۱۴۰۵');
assert.strictEqual(toPersianDigits('09:30'), '۰۹:۳۰');
assert.strictEqual(normalizeDigits('۱۴۰۵-۰۷-۱۵'), '1405-07-15');
assert.strictEqual(normalizeDigits('١٤٠٥'), '1405'); // Arabic to ASCII
console.log('  ✓ Persian & Arabic digit conversion and normalization verified');

// 7. addDaysISO
assert.strictEqual(addDaysISO('2026-03-21', 1), '2026-03-22');
assert.strictEqual(addDaysISO('2026-03-21', -1), '2026-03-20');
console.log('  ✓ ISO date arithmetic verified');

// 8. formatCreationDate tests
import { formatCreationDate } from '../../resources/js/utils/jalali.js';

// ISO date string
assert.strictEqual(formatCreationDate('2026-10-26'), '۴ آبان ۱۴۰۵');
// MySQL / Laravel datetime
assert.strictEqual(formatCreationDate('2026-10-26 15:30:00'), '۴ آبان ۱۴۰۵');
assert.strictEqual(formatCreationDate('2026-10-26 15:30:00', { withTime: true }), '۴ آبان ۱۴۰۵ - ۱۵:۳۰');
// Desktop format
assert.strictEqual(formatCreationDate('15:30:00 26-10-2026'), '۴ آبان ۱۴۰۵');
assert.strictEqual(formatCreationDate('15:30:00 26-10-2026', { withTime: true }), '۴ آبان ۱۴۰۵ - ۱۵:۳۰');
// Jalali slash string
assert.strictEqual(formatCreationDate('1405/08/04'), '۴ آبان ۱۴۰۵');
assert.strictEqual(formatCreationDate('۱۴۰۵/۰۸/۰۴'), '۴ آبان ۱۴۰۵');
// Special strings
assert.strictEqual(formatCreationDate('امروز'), 'امروز');
assert.strictEqual(formatCreationDate(null), '');
assert.strictEqual(formatCreationDate(''), '');
assert.strictEqual(formatCreationDate('invalid-timestamp'), '');
console.log('  ✓ formatCreationDate handles ISO, MySQL, Desktop, Jalali, and invalid timestamps');

console.log('\nALL 8 JALALI UTILITY TESTS PASSED CLEANLY!\n');

