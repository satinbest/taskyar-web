<?php

namespace App\Http\Controllers;

use App\Models\Subtask;
use App\Models\Tag;
use App\Models\Task;
use App\Services\RecurrenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function __construct(
        protected RecurrenceService $recurrenceService
    ) {}

    /**
     * List all tasks for the authenticated user with categories, tags, and expanded recurrence.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $query = Task::with(['subtasks', 'category', 'tags'])
            ->where('user_id', $userId);

        if ($request->filled('q')) {
            $q = mb_strtolower(trim($request->input('q')));
            $query->whereRaw('LOWER(title) LIKE ?', ["%{$q}%"]);
        }

        if ($request->filled('category_id')) {
            $catId = $request->input('category_id');
            if ($catId === 'uncategorized' || $catId === 'none') {
                $query->whereNull('category_id');
            } else {
                $query->where('category_id', $catId);
            }
        }

        if ($request->filled('tag_id')) {
            $tagId = $request->input('tag_id');
            $query->whereHas('tags', function ($q) use ($tagId) {
                $q->where('tags.id', $tagId);
            });
        }

        $tasks = $query->orderBy('due_date', 'asc')
            ->orderBy('due_time', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        // If date range is requested, expand recurring tasks into occurrences
        if ($request->filled('from') && $request->filled('to')) {
            $fromISO = $request->input('from');
            $toISO = $request->input('to');

            $expandedOccurrences = [];
            foreach ($tasks as $task) {
                if ($task->recurrence_pattern && $task->recurrence_pattern !== 'none' && ! $task->is_recurrence_exception) {
                    $occurrences = $this->recurrenceService->expandOccurrences($task, $fromISO, $toISO);
                    foreach ($occurrences as $occ) {
                        $expandedOccurrences[] = $occ;
                    }
                }
            }

            // Filter out base parent recurring tasks that have dueDate outside window or when expanded instances represent them
            $nonRecurringTasks = $tasks->filter(function ($t) {
                return ! $t->recurrence_pattern || $t->recurrence_pattern === 'none' || $t->is_recurrence_exception;
            })->values()->toArray();

            $merged = array_merge($nonRecurringTasks, $expandedOccurrences);

            return response()->json([
                'tasks' => $merged,
            ]);
        }

        return response()->json([
            'tasks' => $tasks,
        ]);
    }

    /**
     * Store a newly created task.
     */
    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Task::class);

        $userId = $request->user()->id;

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:500'],
            'period' => ['nullable', 'string', 'in:daily,weekly,monthly'],
            'due_date' => ['nullable', 'date'],
            'dueDate' => ['nullable', 'string'],
            'due_time' => ['nullable', 'string', 'max:10'],
            'dueTime' => ['nullable', 'string', 'max:10'],
            'alarm_enabled' => ['nullable', 'boolean'],
            'alarmEnabled' => ['nullable', 'boolean'],
            'important' => ['nullable', 'boolean'],
            'my_day' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'client_uuid' => ['nullable', 'string', 'max:36'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $userId)],
            'categoryId' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $userId)],
            'tags' => ['nullable', 'array'],
            'recurrence_pattern' => ['nullable', 'string', 'in:none,daily,weekly,monthly,yearly,custom'],
            'recurrencePattern' => ['nullable', 'string', 'in:none,daily,weekly,monthly,yearly,custom'],
            'recurrence_interval' => ['nullable', 'integer', 'min:1'],
            'recurrenceInterval' => ['nullable', 'integer', 'min:1'],
            'recurrence_weekdays' => ['nullable', 'array'],
            'recurrenceWeekdays' => ['nullable', 'array'],
            'recurrence_month_day' => ['nullable', 'integer', 'between:1,31'],
            'recurrenceMonthDay' => ['nullable', 'integer', 'between:1,31'],
            'recurrence_end_date' => ['nullable', 'date'],
            'recurrenceEndDate' => ['nullable', 'string'],
            'recurrence_count' => ['nullable', 'integer', 'min:1'],
            'recurrenceCount' => ['nullable', 'integer', 'min:1'],
            'reminder_offset_minutes' => ['nullable', 'integer', 'min:0'],
            'reminderOffsetMinutes' => ['nullable', 'integer', 'min:0'],
            'snooze_until' => ['nullable', 'date'],
            'snoozeUntil' => ['nullable', 'string'],
            'subtasks' => ['nullable', 'array'],
        ]);

        $dueDate = $validated['due_date'] ?? $validated['dueDate'] ?? null;
        if ($dueDate === '') {
            $dueDate = null;
        }

        $dueTime = $validated['due_time'] ?? $validated['dueTime'] ?? null;
        if ($dueTime === '') {
            $dueTime = null;
        }

        $alarmEnabled = $validated['alarm_enabled'] ?? $validated['alarmEnabled'] ?? false;
        $reminderOffset = (int) ($validated['reminder_offset_minutes'] ?? $validated['reminderOffsetMinutes'] ?? 0);
        $snoozeUntil = $validated['snooze_until'] ?? $validated['snoozeUntil'] ?? null;
        $todayISO = date('Y-m-d');

        $recPattern = $validated['recurrence_pattern'] ?? $validated['recurrencePattern'] ?? 'none';
        $recInterval = $validated['recurrence_interval'] ?? $validated['recurrenceInterval'] ?? 1;
        $recWeekdays = $validated['recurrence_weekdays'] ?? $validated['recurrenceWeekdays'] ?? null;
        $recMonthDay = $validated['recurrence_month_day'] ?? $validated['recurrenceMonthDay'] ?? null;
        $recEndDate = $validated['recurrence_end_date'] ?? $validated['recurrenceEndDate'] ?? null;
        if ($recEndDate === '') {
            $recEndDate = null;
        }
        $recCount = $validated['recurrence_count'] ?? $validated['recurrenceCount'] ?? null;

        $categoryId = $validated['category_id'] ?? $validated['categoryId'] ?? null;

        $task = Task::create([
            'user_id' => $userId,
            'category_id' => $categoryId,
            'title' => trim($validated['title']),
            'period' => $validated['period'] ?? 'daily',
            'due_date' => $dueDate,
            'due_time' => $dueTime,
            'alarm_enabled' => (bool) $alarmEnabled,
            'alarm_triggered' => false,
            'reminder_offset_minutes' => $reminderOffset,
            'snooze_until' => $snoozeUntil,
            'completed' => false,
            'important' => (bool) ($validated['important'] ?? false),
            'my_day' => $dueDate === $todayISO,
            'notes' => $validated['notes'] ?? '',
            'client_uuid' => $validated['client_uuid'] ?? null,
            'recurrence_pattern' => $recPattern,
            'recurrence_interval' => $recInterval,
            'recurrence_weekdays' => $recWeekdays,
            'recurrence_month_day' => $recMonthDay,
            'recurrence_end_date' => $recEndDate,
            'recurrence_count' => $recCount,
            'sync_status' => 'synced',
            'last_synced_at' => now(),
            'order_index' => 0,
        ]);

        // Sync tags
        if (! empty($validated['tags']) && is_array($validated['tags'])) {
            $tagIds = [];
            foreach ($validated['tags'] as $item) {
                if (is_numeric($item)) {
                    $ownedTag = Tag::where('user_id', $userId)->where('id', (int) $item)->first();
                    if ($ownedTag) {
                        $tagIds[] = $ownedTag->id;
                    }
                } elseif (is_string($item) && trim($item) !== '') {
                    $tag = Tag::firstOrCreate([
                        'user_id' => $userId,
                        'name' => trim(ltrim($item, '#')),
                    ]);
                    $tagIds[] = $tag->id;
                }
            }
            $task->tags()->sync($tagIds);
        }

        if (! empty($validated['subtasks']) && is_array($validated['subtasks'])) {
            foreach ($validated['subtasks'] as $idx => $st) {
                $text = is_array($st) ? ($st['text'] ?? '') : (string) $st;
                $isDone = is_array($st) ? ($st['done'] ?? false) : false;
                $subUuid = is_array($st) ? ($st['client_uuid'] ?? null) : null;
                if (trim($text) !== '') {
                    Subtask::create([
                        'task_id' => $task->id,
                        'user_id' => $userId,
                        'text' => trim($text),
                        'is_done' => (bool) $isDone,
                        'client_uuid' => $subUuid,
                        'order_index' => $idx,
                    ]);
                }
            }
        }

        return response()->json([
            'task' => $task->load(['subtasks', 'category', 'tags']),
            'message' => 'کار جدید با موفقیت اضافه شد.',
        ], 201);
    }

    /**
     * Display the specified task.
     */
    public function show(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'task' => $task->load(['subtasks', 'category', 'tags']),
        ]);
    }

    /**
     * Update the specified task.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        // Check for concurrent mutation revision conflict
        if ($request->filled('expected_revision') || $request->filled('expectedRevision')) {
            $expected = (int) ($request->input('expected_revision') ?? $request->input('expectedRevision'));
            if ($task->revision !== $expected) {
                return response()->json([
                    'error' => 'conflict',
                    'message' => 'تغییرات همزمان شناسایی شد. نسخه این تسک روی سرور به‌روزتر است.',
                    'server_task' => $task->load(['subtasks', 'category', 'tags']),
                    'client_expected_revision' => $expected,
                    'server_revision' => $task->revision,
                ], 409);
            }
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:500'],
            'period' => ['sometimes', 'string', 'in:daily,weekly,monthly'],
            'due_date' => ['nullable', 'date'],
            'dueDate' => ['nullable', 'string'],
            'due_time' => ['nullable', 'string', 'max:10'],
            'dueTime' => ['nullable', 'string', 'max:10'],
            'alarm_enabled' => ['nullable', 'boolean'],
            'alarmEnabled' => ['nullable', 'boolean'],
            'alarm_triggered' => ['nullable', 'boolean'],
            'alarmTriggered' => ['nullable', 'boolean'],
            'reminder_offset_minutes' => ['nullable', 'integer', 'min:0'],
            'reminderOffsetMinutes' => ['nullable', 'integer', 'min:0'],
            'snooze_until' => ['nullable', 'date'],
            'snoozeUntil' => ['nullable', 'string'],
            'completed' => ['nullable', 'boolean'],
            'important' => ['nullable', 'boolean'],
            'my_day' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $task->user_id)],
            'categoryId' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $task->user_id)],
            'tags' => ['nullable', 'array'],
            'recurrence_pattern' => ['nullable', 'string', 'in:none,daily,weekly,monthly,yearly,custom'],
            'recurrencePattern' => ['nullable', 'string', 'in:none,daily,weekly,monthly,yearly,custom'],
            'recurrence_interval' => ['nullable', 'integer', 'min:1'],
            'recurrenceInterval' => ['nullable', 'integer', 'min:1'],
            'recurrence_weekdays' => ['nullable', 'array'],
            'recurrenceWeekdays' => ['nullable', 'array'],
            'recurrence_month_day' => ['nullable', 'integer', 'between:1,31'],
            'recurrenceMonthDay' => ['nullable', 'integer', 'between:1,31'],
            'recurrence_end_date' => ['nullable', 'date'],
            'recurrenceEndDate' => ['nullable', 'string'],
            'recurrence_count' => ['nullable', 'integer', 'min:1'],
            'recurrenceCount' => ['nullable', 'integer', 'min:1'],
        ]);

        if (array_key_exists('title', $validated)) {
            $task->title = trim($validated['title']);
        }
        if (array_key_exists('period', $validated)) {
            $task->period = $validated['period'];
        }
        if (array_key_exists('due_date', $validated) || array_key_exists('dueDate', $validated)) {
            $val = $validated['due_date'] ?? $validated['dueDate'] ?? null;
            $task->due_date = $val === '' ? null : $val;
            $task->my_day = ($task->due_date === date('Y-m-d'));
        }
        if (array_key_exists('due_time', $validated) || array_key_exists('dueTime', $validated)) {
            $val = $validated['due_time'] ?? $validated['dueTime'] ?? null;
            $task->due_time = $val === '' ? null : $val;
        }
        if (array_key_exists('alarm_enabled', $validated) || array_key_exists('alarmEnabled', $validated)) {
            $task->alarm_enabled = (bool) ($validated['alarm_enabled'] ?? $validated['alarmEnabled']);
        }
        if (array_key_exists('alarm_triggered', $validated) || array_key_exists('alarmTriggered', $validated)) {
            $task->alarm_triggered = (bool) ($validated['alarm_triggered'] ?? $validated['alarmTriggered']);
        }
        if (array_key_exists('reminder_offset_minutes', $validated) || array_key_exists('reminderOffsetMinutes', $validated)) {
            $task->reminder_offset_minutes = (int) ($validated['reminder_offset_minutes'] ?? $validated['reminderOffsetMinutes'] ?? 0);
        }
        if (array_key_exists('snooze_until', $validated) || array_key_exists('snoozeUntil', $validated)) {
            $val = $validated['snooze_until'] ?? $validated['snoozeUntil'] ?? null;
            $task->snooze_until = $val === '' ? null : $val;
        }
        if (array_key_exists('completed', $validated)) {
            $task->completed = (bool) $validated['completed'];
            $task->completed_at = $task->completed ? now() : null;
        }
        if (array_key_exists('important', $validated)) {
            $task->important = (bool) $validated['important'];
        }
        if (array_key_exists('notes', $validated)) {
            $task->notes = $validated['notes'];
        }

        // Category
        if (array_key_exists('category_id', $validated) || array_key_exists('categoryId', $validated)) {
            $task->category_id = $validated['category_id'] ?? $validated['categoryId'] ?? null;
        }

        // Recurrence
        if (array_key_exists('recurrence_pattern', $validated) || array_key_exists('recurrencePattern', $validated)) {
            $task->recurrence_pattern = $validated['recurrence_pattern'] ?? $validated['recurrencePattern'] ?? 'none';
        }
        if (array_key_exists('recurrence_interval', $validated) || array_key_exists('recurrenceInterval', $validated)) {
            $task->recurrence_interval = (int) ($validated['recurrence_interval'] ?? $validated['recurrenceInterval'] ?? 1);
        }
        if (array_key_exists('recurrence_weekdays', $validated) || array_key_exists('recurrenceWeekdays', $validated)) {
            $task->recurrence_weekdays = $validated['recurrence_weekdays'] ?? $validated['recurrenceWeekdays'] ?? null;
        }
        if (array_key_exists('recurrence_month_day', $validated) || array_key_exists('recurrenceMonthDay', $validated)) {
            $task->recurrence_month_day = $validated['recurrence_month_day'] ?? $validated['recurrenceMonthDay'] ?? null;
        }
        if (array_key_exists('recurrence_end_date', $validated) || array_key_exists('recurrenceEndDate', $validated)) {
            $val = $validated['recurrence_end_date'] ?? $validated['recurrenceEndDate'] ?? null;
            $task->recurrence_end_date = $val === '' ? null : $val;
        }
        if (array_key_exists('recurrence_count', $validated) || array_key_exists('recurrenceCount', $validated)) {
            $task->recurrence_count = $validated['recurrence_count'] ?? $validated['recurrenceCount'] ?? null;
        }

        $task->save();

        // Sync tags if present
        if (array_key_exists('tags', $validated) && is_array($validated['tags'])) {
            $tagIds = [];
            foreach ($validated['tags'] as $item) {
                if (is_numeric($item)) {
                    $ownedTag = Tag::where('user_id', $task->user_id)->where('id', (int) $item)->first();
                    if ($ownedTag) {
                        $tagIds[] = $ownedTag->id;
                    }
                } elseif (is_string($item) && trim($item) !== '') {
                    $tag = Tag::firstOrCreate([
                        'user_id' => $task->user_id,
                        'name' => trim(ltrim($item, '#')),
                    ]);
                    $tagIds[] = $tag->id;
                }
            }
            $task->tags()->sync($tagIds);
        }

        return response()->json([
            'task' => $task->load(['subtasks', 'category', 'tags']),
            'message' => 'کار با موفقیت به‌روزرسانی شد.',
        ]);
    }

    /**
     * Remove the specified task.
     */
    public function destroy(Task $task): JsonResponse
    {
        Gate::authorize('delete', $task);

        $task->delete();

        return response()->json([
            'message' => 'کار با موفقیت حذف شد.',
        ]);
    }

    /**
     * Complete or uncomplete an individual occurrence of a recurring task.
     */
    public function toggleOccurrenceComplete(Request $request, Task $task, ?string $date = null): JsonResponse
    {
        Gate::authorize('update', $task);
        $userId = $request->user()->id;
        $date = $date ?: $request->input('occurrence_date');

        if (! $date) {
            return response()->json(['message' => 'تاریخ تکرار نامشخص است.'], 422);
        }

        $existing = $task->recurrenceExceptions()
            ->where('occurrence_date', $date)
            ->where('action', 'completed')
            ->first();

        if ($existing) {
            $this->recurrenceService->uncompleteOccurrence($task, $date, $userId);
            $completed = false;
        } else {
            $this->recurrenceService->completeOccurrence($task, $date, $userId);
            $completed = true;
        }

        return response()->json([
            'success' => true,
            'completed' => $completed,
            'occurrenceDate' => $date,
            'message' => $completed ? 'تکرار انجام شد.' : 'تکرار به حالت انجام نشده بازگشت.',
        ]);
    }

    /**
     * Skip an individual occurrence of a recurring task.
     */
    public function skipOccurrence(Request $request, Task $task, ?string $date = null): JsonResponse
    {
        Gate::authorize('update', $task);
        $userId = $request->user()->id;
        $date = $date ?: $request->input('occurrence_date');

        if (! $date) {
            return response()->json(['message' => 'تاریخ تکرار نامشخص است.'], 422);
        }

        $this->recurrenceService->skipOccurrence($task, $date, $userId);

        return response()->json([
            'success' => true,
            'occurrenceDate' => $date,
            'message' => 'این تکرار رد شد.',
        ]);
    }

    /**
     * Edit only this occurrence (creates a detached task instance).
     */
    public function editThisOccurrence(Request $request, Task $task, ?string $date = null): JsonResponse
    {
        Gate::authorize('update', $task);
        $userId = $request->user()->id;
        $date = $date ?: $request->input('occurrence_date');

        if (! $date) {
            return response()->json(['message' => 'تاریخ تکرار نامشخص است.'], 422);
        }

        $changesInput = $request->input('changes', $request->all());
        $request->merge($changesInput);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:500'],
            'due_date' => ['nullable', 'date'],
            'dueDate' => ['nullable', 'string'],
            'due_time' => ['nullable', 'string', 'max:10'],
            'dueTime' => ['nullable', 'string', 'max:10'],
            'important' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $userId)],
        ]);

        $detached = $this->recurrenceService->editThisOccurrence($task, $date, $validated, $userId);

        return response()->json([
            'task' => $detached->load(['subtasks', 'category', 'tags']),
            'message' => 'تغییرات فقط برای این تکرار اعمال شد.',
        ]);
    }

    /**
     * Edit this and future occurrences.
     */
    public function editFutureOccurrences(Request $request, Task $task, ?string $date = null): JsonResponse
    {
        Gate::authorize('update', $task);
        $userId = $request->user()->id;
        $date = $date ?: $request->input('from_date', $request->input('occurrence_date'));

        if (! $date) {
            return response()->json(['message' => 'تاریخ شروع تکرار نامشخص است.'], 422);
        }

        $changesInput = $request->input('changes', $request->all());
        $request->merge($changesInput);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:500'],
            'due_date' => ['nullable', 'date'],
            'dueDate' => ['nullable', 'string'],
            'due_time' => ['nullable', 'string', 'max:10'],
            'dueTime' => ['nullable', 'string', 'max:10'],
            'important' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $userId)],
            'recurrence_pattern' => ['nullable', 'string', 'in:none,daily,weekly,monthly,yearly,custom'],
            'recurrence_interval' => ['nullable', 'integer', 'min:1'],
            'recurrence_weekdays' => ['nullable', 'array'],
        ]);

        $newSeries = $this->recurrenceService->editFutureOccurrences($task, $date, $validated, $userId);

        return response()->json([
            'task' => $newSeries->load(['subtasks', 'category', 'tags']),
            'message' => 'تغییرات برای این تکرار و تکرارهای بعدی اعمال شد.',
        ]);
    }
}
