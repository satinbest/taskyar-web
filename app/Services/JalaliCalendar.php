<?php

namespace App\Services;

/**
 * TaskYar Web 2.0 - Jalali (Persian) Calendar Engine for PHP
 * Strict mathematical conversion using Borkowski algorithm (100% parity with jalali.js).
 */
class JalaliCalendar
{
    private static array $breaks = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
        1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
    ];

    public static function jalCal(int $jy, bool $withoutLeap): array
    {
        $bl = count(self::$breaks);
        $gy = $jy + 621;
        $leapJ = -14;
        $jp = self::$breaks[0];
        $jump = 0;

        if ($jy < $jp || $jy >= self::$breaks[$bl - 1]) {
            throw new \InvalidArgumentException('Invalid Jalali year '.$jy);
        }

        for ($i = 1; $i < $bl; $i++) {
            $jm = self::$breaks[$i];
            $jump = $jm - $jp;
            if ($jy < $jm) {
                break;
            }
            $leapJ = $leapJ + intdiv($jump, 33) * 8 + intdiv($jump % 33, 4);
            $jp = $jm;
        }

        $n = $jy - $jp;
        $leapJ = $leapJ + intdiv($n, 33) * 8 + intdiv($n % 33 + 3, 4);
        if (($jump % 33) === 4 && ($jump - $n) === 4) {
            $leapJ += 1;
        }

        $leapG = intdiv($gy, 4) - intdiv((intdiv($gy, 100) + 1) * 3, 4) - 150;
        $march = 20 + $leapJ - $leapG;

        if ($withoutLeap) {
            return ['gy' => $gy, 'march' => $march];
        }

        if (($jump - $n) < 6) {
            $n = $n - $jump + intdiv($jump + 4, 33) * 33;
        }

        $leap = (($n + 1) % 33 - 1) % 4;
        if ($leap === -1) {
            $leap = 4;
        }

        return ['leap' => $leap, 'gy' => $gy, 'march' => $march];
    }

    public static function isLeapJalali(int $jy): bool
    {
        return self::jalCal($jy, false)['leap'] === 0;
    }

    public static function jalaliMonthLength(int $jy, int $jm): int
    {
        if ($jm <= 6) {
            return 31;
        }
        if ($jm <= 11) {
            return 30;
        }

        return self::isLeapJalali($jy) ? 30 : 29;
    }

    public static function gregorianToJalali(int $gy, int $gm, int $gd): array
    {
        $d = intdiv(($gy + intdiv($gm - 8, 6) + 100100) * 1461, 4) +
            intdiv(153 * (($gm + 9) % 12) + 2, 5) + $gd - 34840408;
        $d = $d - intdiv(intdiv($gy + 100100 + intdiv($gm - 8, 6), 100) * 3, 4) + 752;

        $j = 4 * $d + 139361631;
        $j = $j + intdiv(intdiv(4 * $d + 183187720, 146097) * 3, 4) * 4 - 3908;
        $i = intdiv($j % 1461, 4) * 5 + 308;
        $d_gd = intdiv($i % 153, 5) + 1;
        $d_gm = intdiv($i, 153) % 12 + 1;
        $d_gy = intdiv($j, 1461) - 100100 + intdiv(8 - $d_gm, 6);

        $gy = $d_gy;
        $jy = $gy - 621;
        $r = self::jalCal($jy, false);
        $jdn1f = intdiv(($r['gy'] + intdiv(3 - 8, 6) + 100100) * 1461, 4) +
            intdiv(153 * ((3 + 9) % 12) + 2, 5) + $r['march'] - 34840408;
        $jdn1f = $jdn1f - intdiv(intdiv($r['gy'] + 100100 + intdiv(3 - 8, 6), 100) * 3, 4) + 752;

        $k = $d - $jdn1f;
        if ($k >= 0) {
            if ($k <= 185) {
                return ['jy' => $jy, 'jm' => 1 + intdiv($k, 31), 'jd' => ($k % 31) + 1];
            }
            $k -= 186;
        } else {
            $jy -= 1;
            $k += 179;
            if ($r['leap'] === 1) {
                $k += 1;
            }
        }

        return ['jy' => $jy, 'jm' => 7 + intdiv($k, 30), 'jd' => ($k % 30) + 1];
    }

    public static function jalaliToGregorian(int $jy, int $jm, int $jd): array
    {
        $r = self::jalCal($jy, true);
        $gy = $r['gy'];
        $march = $r['march'];

        $d = intdiv(($gy + intdiv(3 - 8, 6) + 100100) * 1461, 4) +
            intdiv(153 * ((3 + 9) % 12) + 2, 5) + $march - 34840408;
        $d = $d - intdiv(intdiv($gy + 100100 + intdiv(3 - 8, 6), 100) * 3, 4) + 752;
        $d = $d + ($jm - 1) * 31 - intdiv($jm, 7) * ($jm - 7) + $jd - 1;

        $j = 4 * $d + 139361631;
        $j = $j + intdiv(intdiv(4 * $d + 183187720, 146097) * 3, 4) * 4 - 3908;
        $i = intdiv($j % 1461, 4) * 5 + 308;
        $gd = intdiv($i % 153, 5) + 1;
        $gm = intdiv($i, 153) % 12 + 1;
        $gy = intdiv($j, 1461) - 100100 + intdiv(8 - $gm, 6);

        return ['gy' => $gy, 'gm' => $gm, 'gd' => $gd];
    }

    public static function isoToJalali(string $isoDate): ?array
    {
        $parts = explode('-', $isoDate);
        if (count($parts) !== 3) {
            return null;
        }

        return self::gregorianToJalali((int) $parts[0], (int) $parts[1], (int) $parts[2]);
    }

    public static function jalaliToISO(int $jy, int $jm, int $jd): string
    {
        $g = self::jalaliToGregorian($jy, $jm, $jd);

        return sprintf('%04d-%02d-%02d', $g['gy'], $g['gm'], $g['gd']);
    }

    /**
     * Persian weekday index: 0 = Saturday, 1 = Sunday, ..., 6 = Friday
     */
    public static function persianWeekdayIndex(string $isoDate): int
    {
        $dt = new \DateTime($isoDate);
        $w = (int) $dt->format('w'); // 0 = Sunday, 6 = Saturday

        return ($w + 1) % 7;
    }
}
