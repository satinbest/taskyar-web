<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskRecurrenceException;

class RecurrenceService
{
    /**
     * Expand occurrences of a recurring task within a bounded date window.
     * Returns an array of occurrence representation objects.
     */
    public function expandOccurrences(Task $task, string $fromISO, string $toISO): array
    {
        if (! $task->recurrence_pattern || $task->recurrence_pattern === 'none') {
            return [];
        }

        $baseDate = $task->due_date ?: date('Y-m-d', strtotime($task->created_at));
        if (! $baseDate) {
            return [];
        }

        $exceptions = $task->recurrenceExceptions()
            ->get()
            ->keyBy(function ($e) {
                return $e->occurrence_date instanceof \DateTimeInterface
                    ? $e->occurrence_date->format('Y-m-d')
                    : substr((string) $e->occurrence_date, 0, 10);
            });

        $detachedExceptions = Task::where('recurrence_parent_id', $task->id)
            ->where('is_recurrence_exception', true)
            ->get()
            ->keyBy(function ($d) {
                return $d->recurrence_original_date instanceof \DateTimeInterface
                    ? $d->recurrence_original_date->format('Y-m-d')
                    : substr((string) $d->recurrence_original_date, 0, 10);
            });

        $occurrences = [];
        $pattern = $task->recurrence_pattern;
        $interval = max(1, $task->recurrence_interval ?: 1);
        $weekdays = $task->recurrence_weekdays ?: [JalaliCalendar::persianWeekdayIndex($baseDate)];
        $endDate = $task->recurrence_end_date;
        $maxCount = $task->recurrence_count;

        $baseJalali = JalaliCalendar::isoToJalali($baseDate);
        $monthDay = $task->recurrence_month_day ?: ($baseJalali ? $baseJalali['jd'] : 1);

        $currentDate = $baseDate;
        $count = 0;
        $maxIterations = 500; // Hard safety boundary

        if ($pattern === 'daily') {
            $dt = new \DateTime($baseDate);
            while ($count < $maxIterations) {
                $iso = $dt->format('Y-m-d');
                if ($endDate && $iso > $endDate) {
                    break;
                }
                if ($maxCount && $count >= $maxCount) {
                    break;
                }
                if ($iso > $toISO) {
                    break;
                }

                if ($iso >= $fromISO) {
                    $occurrences[] = $this->buildOccurrence($task, $iso, $exceptions, $detachedExceptions);
                }

                $dt->modify("+{$interval} days");
                $count++;
            }
        } elseif ($pattern === 'weekly') {
            $dt = new \DateTime($baseDate);
            // Walk day by day up to max window
            $toDateTime = new \DateTime($toISO);
            while ($dt <= $toDateTime && $count < $maxIterations) {
                $iso = $dt->format('Y-m-d');
                if ($endDate && $iso > $endDate) {
                    break;
                }
                if ($maxCount && $count >= $maxCount) {
                    break;
                }

                $wIndex = JalaliCalendar::persianWeekdayIndex($iso);
                if (in_array($wIndex, $weekdays)) {
                    if ($iso >= $fromISO && $iso >= $baseDate) {
                        $occurrences[] = $this->buildOccurrence($task, $iso, $exceptions, $detachedExceptions);
                    }
                    $count++;
                }

                $dt->modify('+1 day');
            }
        } elseif ($pattern === 'monthly') {
            $curJ = $baseJalali ?: JalaliCalendar::isoToJalali($baseDate);
            if ($curJ) {
                $curJy = $curJ['jy'];
                $curJm = $curJ['jm'];

                while ($count < $maxIterations) {
                    $monthLen = JalaliCalendar::jalaliMonthLength($curJy, $curJm);
                    // Handle clamping (e.g. day 31 in 30-day month or Esfand 30 in non-leap year)
                    $targetJd = min($monthDay, $monthLen);
                    $iso = JalaliCalendar::jalaliToISO($curJy, $curJm, $targetJd);

                    if ($endDate && $iso > $endDate) {
                        break;
                    }
                    if ($maxCount && $count >= $maxCount) {
                        break;
                    }
                    if ($iso > $toISO) {
                        break;
                    }

                    if ($iso >= $fromISO && $iso >= $baseDate) {
                        $occurrences[] = $this->buildOccurrence($task, $iso, $exceptions, $detachedExceptions);
                    }

                    $curJm += $interval;
                    while ($curJm > 12) {
                        $curJm -= 12;
                        $curJy++;
                    }
                    $count++;
                }
            }
        } elseif ($pattern === 'yearly') {
            $curJ = $baseJalali ?: JalaliCalendar::isoToJalali($baseDate);
            if ($curJ) {
                $curJy = $curJ['jy'];
                $curJm = $curJ['jm'];
                $curJd = $monthDay;

                while ($count < $maxIterations) {
                    $monthLen = JalaliCalendar::jalaliMonthLength($curJy, $curJm);
                    $targetJd = min($curJd, $monthLen);
                    $iso = JalaliCalendar::jalaliToISO($curJy, $curJm, $targetJd);

                    if ($endDate && $iso > $endDate) {
                        break;
                    }
                    if ($maxCount && $count >= $maxCount) {
                        break;
                    }
                    if ($iso > $toISO) {
                        break;
                    }

                    if ($iso >= $fromISO && $iso >= $baseDate) {
                        $occurrences[] = $this->buildOccurrence($task, $iso, $exceptions, $detachedExceptions);
                    }

                    $curJy += $interval;
                    $count++;
                }
            }
        }

        // Filter out skipped occurrences
        return array_values(array_filter($occurrences, function ($occ) {
            return $occ !== null;
        }));
    }

    private function buildOccurrence(Task $task, string $occurrenceDate, $exceptions, $detachedExceptions): ?array
    {
        // Check if there is a detached custom task for this date
        $detached = $detachedExceptions->get($occurrenceDate);
        if ($detached) {
            $detachedArray = $detached->toArray();
            $detachedArray['isRecurringInstance'] = true;
            $detachedArray['isDetached'] = true;
            $detachedArray['recurrenceOriginalDate'] = $occurrenceDate;

            return $detachedArray;
        }

        // Check if there is an exception for this occurrence
        $ex = $exceptions->get($occurrenceDate);
        if ($ex && $ex->action === 'skipped') {
            return null; // Omit skipped occurrence
        }

        $isCompleted = $ex && $ex->action === 'completed';
        $completedAt = $isCompleted ? ($ex->completed_at ? $ex->completed_at->toIso8601String() : null) : null;

        $taskArray = $task->toArray();
        $taskArray['id'] = $task->id.'@'.$occurrenceDate;
        $taskArray['realTaskId'] = $task->id;
        $taskArray['dueDate'] = $occurrenceDate;
        $taskArray['due_date'] = $occurrenceDate;
        $taskArray['completed'] = $isCompleted;
        $taskArray['completed_at'] = $completedAt;
        $taskArray['isRecurringInstance'] = true;
        $taskArray['recurrenceOriginalDate'] = $occurrenceDate;

        return $taskArray;
    }

    /**
     * Mark an individual occurrence as completed
     */
    public function completeOccurrence(Task $task, string $occurrenceDate, int $userId): TaskRecurrenceException
    {
        return TaskRecurrenceException::updateOrCreate(
            ['task_id' => $task->id, 'occurrence_date' => $occurrenceDate],
            [
                'user_id' => $userId,
                'action' => 'completed',
                'completed_at' => now(),
            ]
        );
    }

    /**
     * Uncomplete an individual occurrence
     */
    public function uncompleteOccurrence(Task $task, string $occurrenceDate, int $userId): void
    {
        TaskRecurrenceException::where('task_id', $task->id)
            ->where('occurrence_date', $occurrenceDate)
            ->delete();
    }

    /**
     * Skip an individual occurrence
     */
    public function skipOccurrence(Task $task, string $occurrenceDate, int $userId): TaskRecurrenceException
    {
        return TaskRecurrenceException::updateOrCreate(
            ['task_id' => $task->id, 'occurrence_date' => $occurrenceDate],
            [
                'user_id' => $userId,
                'action' => 'skipped',
            ]
        );
    }

    /**
     * Edit only this occurrence by skipping the series instance and creating a detached task.
     */
    public function editThisOccurrence(Task $task, string $occurrenceDate, array $changes, int $userId): Task
    {
        // 1. Skip the occurrence in the parent series
        $this->skipOccurrence($task, $occurrenceDate, $userId);

        // 2. Create the detached instance
        $detachedData = array_merge($task->only([
            'period',
            'due_time',
            'alarm_enabled',
            'important',
            'notes',
            'category_id',
        ]), $changes);

        $detachedData['user_id'] = $userId;
        $detachedData['period'] = $changes['period'] ?? $task->period ?: 'daily';
        $detachedData['important'] = (bool) ($changes['important'] ?? $task->important ?? false);
        $detachedData['alarm_enabled'] = (bool) ($changes['alarm_enabled'] ?? $task->alarm_enabled ?? false);
        $detachedData['title'] = $changes['title'] ?? $task->title;
        $detachedData['due_date'] = $changes['dueDate'] ?? $changes['due_date'] ?? $occurrenceDate;
        $detachedData['recurrence_parent_id'] = $task->id;
        $detachedData['recurrence_original_date'] = $occurrenceDate;
        $detachedData['is_recurrence_exception'] = true;
        $detachedData['recurrence_pattern'] = 'none';

        return Task::create($detachedData);
    }

    /**
     * Edit this and future occurrences:
     * Caps parent recurrence_end_date to day before occurrenceDate,
     * and spawns a new series starting from occurrenceDate with changes.
     */
    public function editFutureOccurrences(Task $task, string $occurrenceDate, array $changes, int $userId): Task
    {
        // 1. Cap previous series
        $dayBefore = date('Y-m-d', strtotime($occurrenceDate.' -1 day'));
        $task->update(['recurrence_end_date' => $dayBefore]);

        // 2. Spawn new recurring series
        $newSeriesData = array_merge($task->only([
            'title',
            'period',
            'due_time',
            'alarm_enabled',
            'important',
            'notes',
            'category_id',
            'recurrence_pattern',
            'recurrence_interval',
            'recurrence_weekdays',
            'recurrence_month_day',
            'recurrence_end_date',
            'recurrence_count',
        ]), $changes);

        $newSeriesData['user_id'] = $userId;
        $newSeriesData['period'] = $changes['period'] ?? $task->period ?: 'daily';
        $newSeriesData['important'] = (bool) ($changes['important'] ?? $task->important ?? false);
        $newSeriesData['alarm_enabled'] = (bool) ($changes['alarm_enabled'] ?? $task->alarm_enabled ?? false);
        $newSeriesData['due_date'] = $changes['dueDate'] ?? $changes['due_date'] ?? $occurrenceDate;
        $newSeriesData['recurrence_parent_id'] = null;
        $newSeriesData['is_recurrence_exception'] = false;

        return Task::create($newSeriesData);
    }
}
