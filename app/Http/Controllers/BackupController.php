<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Subtask;
use App\Models\Tag;
use App\Models\Task;
use App\Models\TaskRecurrenceException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BackupController extends Controller
{
    /**
     * Export all tasks, categories, tags, reminders, and recurrence exceptions.
     */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Export Categories
        $categories = Category::where('user_id', $user->id)
            ->orderBy('order_index', 'asc')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => (int) $c->id,
                    'name' => (string) $c->name,
                    'color' => (string) ($c->color ?: '#6D28D9'),
                    'icon' => $c->icon,
                    'order_index' => (int) $c->order_index,
                ];
            });

        // 2. Export Tags
        $tags = Tag::where('user_id', $user->id)
            ->get()
            ->map(function ($t) {
                return [
                    'id' => (int) $t->id,
                    'name' => (string) $t->name,
                    'color' => $t->color,
                ];
            });

        // 3. Export Tasks with Category, Tags, Recurrence, and Reminders
        $tasks = Task::with(['subtasks', 'category', 'tags'])
            ->where('user_id', $user->id)
            ->orderBy('id', 'asc')
            ->get();

        $todayISO = date('Y-m-d');
        $tasksData = [];

        foreach ($tasks as $t) {
            $subtasks = [];
            foreach ($t->subtasks as $st) {
                $subtasks[] = [
                    'text' => $st->text,
                    'done' => (bool) $st->is_done,
                ];
            }

            $taskTags = $t->tags->pluck('name')->toArray();

            $tasksData[] = [
                'id' => (int) $t->id,
                'title' => (string) $t->title,
                'period' => in_array($t->period, ['daily', 'weekly', 'monthly']) ? $t->period : 'daily',
                'dueDate' => $t->due_date ? (string) $t->due_date : '',
                'dueTime' => $t->due_time ? (string) $t->due_time : '',
                'alarmEnabled' => (bool) $t->alarm_enabled,
                'alarmTriggered' => (bool) $t->alarm_triggered,
                'reminderOffsetMinutes' => (int) ($t->reminder_offset_minutes ?: 0),
                'snoozeUntil' => $t->snooze_until ? (string) $t->snooze_until : null,
                'completed' => (bool) $t->completed,
                'important' => (bool) $t->important,
                'myDay' => $t->due_date === $todayISO,
                'notes' => (string) ($t->notes ?? ''),
                'category' => $t->category ? $t->category->name : null,
                'category_id' => $t->category_id,
                'tags' => $taskTags,
                'recurrence_pattern' => $t->recurrence_pattern ?: 'none',
                'recurrence_interval' => (int) ($t->recurrence_interval ?: 1),
                'recurrence_weekdays' => $t->recurrence_weekdays,
                'recurrence_month_day' => $t->recurrence_month_day,
                'recurrence_end_date' => $t->recurrence_end_date ? (string) $t->recurrence_end_date : null,
                'recurrence_count' => $t->recurrence_count,
                'subtasks' => $subtasks,
                'createdAt' => is_object($t->created_at) ? $t->created_at->format('Y-m-d H:i:s') : (string) ($t->created_at ?: 'امروز'),
            ];
        }

        // 4. Export Recurrence Exceptions (for v2 format)
        $exceptions = TaskRecurrenceException::where('user_id', $user->id)
            ->get()
            ->map(function ($e) {
                return [
                    'task_id' => (int) $e->task_id,
                    'occurrence_date' => $e->occurrence_date instanceof \DateTimeInterface
                        ? $e->occurrence_date->format('Y-m-d')
                        : substr((string) $e->occurrence_date, 0, 10),
                    'action' => (string) $e->action,
                    'completed_at' => $e->completed_at ? $e->completed_at->toIso8601String() : null,
                ];
            });

        if ($request->input('v') == '2' || $request->input('format') === 'envelope') {
            return response()->json([
                'version' => 2,
                'source' => 'TaskYar Web 2.0',
                'exported_at' => now()->toIso8601String(),
                'user_preferences' => [
                    'theme' => $user->theme ?: 'default',
                ],
                'categories' => $categories,
                'tags' => $tags,
                'tasks' => $tasksData,
                'recurrence_exceptions' => $exceptions,
            ], 200, [
                'Content-Disposition' => 'attachment; filename="taskyar_backup_v2_'.$todayISO.'.json"',
            ]);
        }

        return response()->json($tasksData, 200, [
            'Content-Disposition' => 'attachment; filename="taskyar_backup_'.$todayISO.'.json"',
        ]);
    }

    /**
     * Atomically import tasks from Desktop v1.1.0, Web v1, or Version 2 backup payloads.
     */
    public function import(Request $request): JsonResponse
    {
        $user = $request->user();
        $rawContent = null;

        if ($request->hasFile('backup_file')) {
            $request->validate([
                'backup_file' => ['required', 'file', 'max:10240'], // Max 10MB
            ], [
                'backup_file.max' => 'حجم فایل پشتیبان نباید بیشتر از ۱۰ مگابایت باشد.',
            ]);

            $file = $request->file('backup_file');
            $rawContent = file_get_contents($file->getRealPath());
        } elseif ($request->isJson() || is_array($request->input('tasks')) || is_array($request->all())) {
            $rawContent = $request->getContent();
        }

        if (! $rawContent) {
            return response()->json([
                'message' => 'فایل یا داده پشتیبان ارسال نشده است.',
            ], 422);
        }

        // Payload size safety check (max 10MB raw content)
        if (strlen($rawContent) > 10 * 1024 * 1024) {
            return response()->json([
                'message' => 'حجم داده‌های ارسالی پشتیبان فراتر از حد مجاز (۱۰ مگابایت) است.',
            ], 422);
        }

        $decoded = json_decode($rawContent, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            return response()->json([
                'message' => 'فرمت فایل پشتیبان معتبر نیست.',
            ], 422);
        }

        $items = isset($decoded['tasks']) && is_array($decoded['tasks']) ? $decoded['tasks'] : $decoded;

        if (! is_array($items) || count($items) === 0) {
            return response()->json([
                'message' => 'هیچ کاری در فایل پشتیبان یافت نشد.',
            ], 422);
        }

        // Cap maximum task elements to prevent memory exhaustion DoS
        if (count($items) > 5000) {
            return response()->json([
                'message' => 'تعداد کارهای موجود در فایل پشتیبان بیش از سقف مجاز (۵۰۰۰ کار) است.',
            ], 422);
        }

        $importedCount = 0;
        $todayISO = date('Y-m-d');
        $taskIdMap = []; // old ID -> new task model ID

        DB::beginTransaction();

        try {
            // 1. Process Categories if Version 2 envelope
            $categoryMap = []; // Name -> ID
            if (! empty($decoded['categories']) && is_array($decoded['categories'])) {
                foreach ($decoded['categories'] as $catData) {
                    $cName = trim((string) ($catData['name'] ?? ''));
                    if ($cName === '') {
                        continue;
                    }

                    $category = Category::firstOrCreate([
                        'user_id' => $user->id,
                        'name' => $cName,
                    ], [
                        'color' => $catData['color'] ?? '#6D28D9',
                        'icon' => $catData['icon'] ?? null,
                        'order_index' => (int) ($catData['order_index'] ?? 0),
                    ]);

                    $categoryMap[$cName] = $category->id;
                }
            }

            // 2. Process Tags if Version 2 envelope
            $tagMap = []; // Name -> ID
            if (! empty($decoded['tags']) && is_array($decoded['tags'])) {
                foreach ($decoded['tags'] as $tagData) {
                    $tName = trim(ltrim((string) ($tagData['name'] ?? ''), '#'));
                    if ($tName === '') {
                        continue;
                    }

                    $tag = Tag::firstOrCreate([
                        'user_id' => $user->id,
                        'name' => $tName,
                    ], [
                        'color' => $tagData['color'] ?? null,
                    ]);

                    $tagMap[$tName] = $tag->id;
                }
            }

            // 3. Process Tasks
            foreach ($items as $idx => $item) {
                if (! is_array($item)) {
                    continue;
                }

                $title = isset($item['title']) ? trim((string) $item['title']) : '';
                if ($title === '') {
                    continue;
                }

                $period = isset($item['period']) && in_array($item['period'], ['daily', 'weekly', 'monthly'])
                    ? $item['period']
                    : 'daily';

                $dueDate = ! empty($item['dueDate']) ? (string) $item['dueDate'] : (! empty($item['due_date']) ? (string) $item['due_date'] : null);
                if ($dueDate && ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate)) {
                    $dueDate = null;
                }

                $dueTime = ! empty($item['dueTime']) ? (string) $item['dueTime'] : (! empty($item['due_time']) ? (string) $item['due_time'] : null);
                if ($dueTime && ! preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $dueTime)) {
                    $dueTime = null;
                }

                $completed = ! empty($item['completed']);
                $important = ! empty($item['important']);
                $alarmEnabled = ! empty($item['alarmEnabled']) || ! empty($item['alarm_enabled']);
                $reminderOffset = (int) ($item['reminderOffsetMinutes'] ?? $item['reminder_offset_minutes'] ?? 0);
                $snoozeUntil = ! empty($item['snoozeUntil']) ? (string) $item['snoozeUntil'] : (! empty($item['snooze_until']) ? (string) $item['snooze_until'] : null);
                $notes = isset($item['notes']) ? (string) $item['notes'] : '';

                // Category Resolution
                $categoryId = null;
                if (! empty($item['category']) && is_string($item['category'])) {
                    $catName = trim($item['category']);
                    if (! isset($categoryMap[$catName])) {
                        $newCat = Category::firstOrCreate([
                            'user_id' => $user->id,
                            'name' => $catName,
                        ]);
                        $categoryMap[$catName] = $newCat->id;
                    }
                    $categoryId = $categoryMap[$catName];
                }

                // Recurrence Parameters
                $recPattern = in_array($item['recurrence_pattern'] ?? '', ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'])
                    ? $item['recurrence_pattern']
                    : 'none';
                $recInterval = max(1, (int) ($item['recurrence_interval'] ?? 1));
                $recWeekdays = isset($item['recurrence_weekdays']) && is_array($item['recurrence_weekdays'])
                    ? $item['recurrence_weekdays']
                    : null;
                $recMonthDay = isset($item['recurrence_month_day']) ? (int) $item['recurrence_month_day'] : null;
                $recEndDate = ! empty($item['recurrence_end_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $item['recurrence_end_date'])
                    ? $item['recurrence_end_date']
                    : null;
                $recCount = isset($item['recurrence_count']) ? (int) $item['recurrence_count'] : null;

                $task = Task::create([
                    'user_id' => $user->id,
                    'category_id' => $categoryId,
                    'title' => mb_substr($title, 0, 500),
                    'period' => $period,
                    'due_date' => $dueDate,
                    'due_time' => $dueTime,
                    'alarm_enabled' => $alarmEnabled,
                    'alarm_triggered' => false,
                    'reminder_offset_minutes' => $reminderOffset,
                    'snooze_until' => $snoozeUntil,
                    'completed' => $completed,
                    'completed_at' => $completed ? now() : null,
                    'important' => $important,
                    'my_day' => ($dueDate === $todayISO),
                    'notes' => $notes,
                    'recurrence_pattern' => $recPattern,
                    'recurrence_interval' => $recInterval,
                    'recurrence_weekdays' => $recWeekdays,
                    'recurrence_month_day' => $recMonthDay,
                    'recurrence_end_date' => $recEndDate,
                    'recurrence_count' => $recCount,
                    'order_index' => $idx,
                ]);

                if (! empty($item['id'])) {
                    $taskIdMap[$item['id']] = $task->id;
                }

                // Tags resolution
                if (! empty($item['tags']) && is_array($item['tags'])) {
                    $taskTagIds = [];
                    foreach ($item['tags'] as $tagName) {
                        $cleanName = trim(ltrim((string) $tagName, '#'));
                        if ($cleanName === '') {
                            continue;
                        }

                        if (! isset($tagMap[$cleanName])) {
                            $newTag = Tag::firstOrCreate([
                                'user_id' => $user->id,
                                'name' => $cleanName,
                            ]);
                            $tagMap[$cleanName] = $newTag->id;
                        }
                        $taskTagIds[] = $tagMap[$cleanName];
                    }
                    if (count($taskTagIds) > 0) {
                        $task->tags()->sync($taskTagIds);
                    }
                }

                // Subtasks
                if (! empty($item['subtasks']) && is_array($item['subtasks'])) {
                    foreach ($item['subtasks'] as $sIdx => $st) {
                        $stText = is_array($st) ? ($st['text'] ?? '') : (string) $st;
                        $stDone = is_array($st) ? (! empty($st['done']) || ! empty($st['is_done'])) : false;

                        if (trim($stText) !== '') {
                            Subtask::create([
                                'task_id' => $task->id,
                                'user_id' => $user->id,
                                'text' => mb_substr(trim($stText), 0, 500),
                                'is_done' => $stDone,
                                'order_index' => $sIdx,
                            ]);
                        }
                    }
                }

                $importedCount++;
            }

            // 4. Restore Recurrence Exceptions if provided
            if (! empty($decoded['recurrence_exceptions']) && is_array($decoded['recurrence_exceptions'])) {
                foreach ($decoded['recurrence_exceptions'] as $exc) {
                    $oldTaskId = $exc['task_id'] ?? null;
                    $newTaskId = $taskIdMap[$oldTaskId] ?? null;
                    $occDate = $exc['occurrence_date'] ?? null;

                    if ($newTaskId && $occDate && preg_match('/^\d{4}-\d{2}-\d{2}$/', $occDate)) {
                        TaskRecurrenceException::updateOrCreate([
                            'task_id' => $newTaskId,
                            'occurrence_date' => $occDate,
                        ], [
                            'user_id' => $user->id,
                            'action' => in_array($exc['action'] ?? '', ['completed', 'skipped', 'rescheduled']) ? $exc['action'] : 'completed',
                            'completed_at' => ! empty($exc['completed_at']) ? $exc['completed_at'] : now(),
                        ]);
                    }
                }
            }

            // 5. Restore User Preferences (e.g. theme) if present
            if (! empty($decoded['user_preferences']['theme'])) {
                $th = $decoded['user_preferences']['theme'];
                if (in_array($th, ['default', 'ocean', 'sunset', 'emerald', 'dark'])) {
                    $user->theme = $th;
                    $user->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'count' => $importedCount,
                'message' => "اطلاعات با موفقیت بازیابی شد ({$importedCount} کار).",
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'خطا در پردازش و ذخیره نسخه پشتیبان: '.$e->getMessage(),
            ], 500);
        }
    }
}
