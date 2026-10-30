<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Task;
use App\Models\TaskRecurrenceException;
use App\Services\JalaliCalendar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $todayISO = date('Y-m-d');

        // 1. High-level metric counts
        $totalRegularTasks = Task::where('user_id', $userId)
            ->where('is_recurrence_exception', false)
            ->count();

        $completedRegularTasks = Task::where('user_id', $userId)
            ->where('is_recurrence_exception', false)
            ->where('completed', true)
            ->count();

        $completedRecurrenceExceptions = TaskRecurrenceException::where('user_id', $userId)
            ->where('action', 'completed')
            ->count();

        $totalCompleted = $completedRegularTasks + $completedRecurrenceExceptions;
        $totalAll = $totalRegularTasks + $completedRecurrenceExceptions;
        $pendingTasks = max(0, $totalAll - $totalCompleted);

        $overdueTasks = Task::where('user_id', $userId)
            ->where('completed', false)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $todayISO)
            ->count();

        $completionRate = $totalAll > 0 ? (int) round(($totalCompleted / $totalAll) * 100) : 0;

        // 2. Category distribution
        $categories = Category::where('user_id', $userId)
            ->withCount('tasks')
            ->get();

        $uncategorizedCount = Task::where('user_id', $userId)
            ->whereNull('category_id')
            ->count();

        $categoryDistribution = [];
        foreach ($categories as $cat) {
            $count = $cat->tasks_count;
            $percent = $totalAll > 0 ? (int) round(($count / $totalAll) * 100) : 0;
            $categoryDistribution[] = [
                'id' => $cat->id,
                'name' => $cat->name,
                'color' => $cat->color ?: '#6D28D9',
                'count' => $count,
                'percent' => $percent,
            ];
        }

        if ($uncategorizedCount > 0) {
            $categoryDistribution[] = [
                'id' => null,
                'name' => 'بدون دسته‌بندی',
                'color' => '#94A3B8',
                'count' => $uncategorizedCount,
                'percent' => $totalAll > 0 ? (int) round(($uncategorizedCount / $totalAll) * 100) : 0,
            ];
        }

        // 3. Weekly Trend (Last 7 days) — Batched single aggregation
        $persianWeekdayNames = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        $persianMonthNames = [
            'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
        ];

        $sevenDaysAgo = date('Y-m-d 00:00:00', strtotime('-6 days'));

        $completedTasksDaily = Task::where('user_id', $userId)
            ->where('completed', true)
            ->where('completed_at', '>=', $sevenDaysAgo)
            ->selectRaw('DATE(completed_at) as date_val, count(*) as count')
            ->groupBy('date_val')
            ->pluck('count', 'date_val');

        $completedExceptionsDaily = TaskRecurrenceException::where('user_id', $userId)
            ->where('action', 'completed')
            ->where('completed_at', '>=', $sevenDaysAgo)
            ->selectRaw('DATE(completed_at) as date_val, count(*) as count')
            ->groupBy('date_val')
            ->pluck('count', 'date_val');

        $createdTasksDaily = Task::where('user_id', $userId)
            ->where('created_at', '>=', $sevenDaysAgo)
            ->selectRaw('DATE(created_at) as date_val, count(*) as count')
            ->groupBy('date_val')
            ->pluck('count', 'date_val');

        $weeklyTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $targetDate = date('Y-m-d', strtotime("-{$i} days"));
            $wIndex = JalaliCalendar::persianWeekdayIndex($targetDate);
            $j = JalaliCalendar::isoToJalali($targetDate);
            $dateLabel = $j ? "{$j['jd']} {$persianMonthNames[$j['jm'] - 1]}" : $targetDate;

            $completedCount = ($completedTasksDaily[$targetDate] ?? 0) + ($completedExceptionsDaily[$targetDate] ?? 0);
            $createdCount = $createdTasksDaily[$targetDate] ?? 0;

            $weeklyTrend[] = [
                'date' => $targetDate,
                'dayName' => $persianWeekdayNames[$wIndex],
                'dateLabel' => $dateLabel,
                'completed' => (int) $completedCount,
                'created' => (int) $createdCount,
            ];
        }

        // 4. Monthly Trend (Current Jalali month + previous 5 months) — Windowed batch aggregation
        $todayJalali = JalaliCalendar::isoToJalali($todayISO) ?: ['jy' => 1405, 'jm' => 8, 'jd' => 4];
        $curJy = $todayJalali['jy'];
        $curJm = $todayJalali['jm'];

        $monthsRanges = [];
        for ($i = 5; $i >= 0; $i--) {
            $targetJy = $curJy;
            $targetJm = $curJm - $i;
            while ($targetJm < 1) {
                $targetJm += 12;
                $targetJy--;
            }

            $monthLen = JalaliCalendar::jalaliMonthLength($targetJy, $targetJm);
            $startISO = JalaliCalendar::jalaliToISO($targetJy, $targetJm, 1);
            $endISO = JalaliCalendar::jalaliToISO($targetJy, $targetJm, $monthLen);
            $monthsRanges[] = [
                'targetJy' => $targetJy,
                'targetJm' => $targetJm,
                'start' => $startISO.' 00:00:00',
                'end' => $endISO.' 23:59:59',
            ];
        }

        $earliestMonthStart = $monthsRanges[0]['start'];
        $latestMonthEnd = $monthsRanges[count($monthsRanges) - 1]['end'];

        $monthlyCompletedTasks = Task::where('user_id', $userId)
            ->where('completed', true)
            ->whereBetween('completed_at', [$earliestMonthStart, $latestMonthEnd])
            ->pluck('completed_at')
            ->map(fn ($d) => substr((string) $d, 0, 19));

        $monthlyCompletedExceptions = TaskRecurrenceException::where('user_id', $userId)
            ->where('action', 'completed')
            ->whereBetween('completed_at', [$earliestMonthStart, $latestMonthEnd])
            ->pluck('completed_at')
            ->map(fn ($d) => substr((string) $d, 0, 19));

        $monthlyCreatedTasks = Task::where('user_id', $userId)
            ->whereBetween('created_at', [$earliestMonthStart, $latestMonthEnd])
            ->pluck('created_at')
            ->map(fn ($d) => substr((string) $d, 0, 19));

        $monthlyTrend = [];
        foreach ($monthsRanges as $range) {
            $start = $range['start'];
            $end = $range['end'];
            $tJy = $range['targetJy'];
            $tJm = $range['targetJm'];

            $compCount = $monthlyCompletedTasks->filter(fn ($t) => $t >= $start && $t <= $end)->count()
                + $monthlyCompletedExceptions->filter(fn ($t) => $t >= $start && $t <= $end)->count();
            $creatCount = $monthlyCreatedTasks->filter(fn ($t) => $t >= $start && $t <= $end)->count();

            $monthlyTrend[] = [
                'year' => $tJy,
                'month' => $tJm,
                'monthName' => $persianMonthNames[$tJm - 1],
                'label' => $persianMonthNames[$tJm - 1].' '.$tJy,
                'completed' => $compCount,
                'created' => $creatCount,
            ];
        }

        // 5. Important vs Regular
        $importantCount = Task::where('user_id', $userId)->where('important', true)->count();
        $normalCount = max(0, $totalRegularTasks - $importantCount);

        return response()->json([
            'summary' => [
                'total' => $totalAll,
                'completed' => $totalCompleted,
                'pending' => $pendingTasks,
                'overdue' => $overdueTasks,
                'rate' => $completionRate,
                'important' => $importantCount,
                'normal' => $normalCount,
            ],
            'weeklyTrend' => $weeklyTrend,
            'monthlyTrend' => $monthlyTrend,
            'categories' => $categoryDistribution,
        ]);
    }
}
