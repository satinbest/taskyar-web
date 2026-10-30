<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Subtask;
use App\Models\Tag;
use App\Models\Task;
use App\Services\RecurrenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncController extends Controller
{
    public function __construct(
        protected RecurrenceService $recurrenceService
    ) {}

    /**
     * Batch synchronization endpoint for offline mutation queue and state reconciliation.
     * Guaranteed safe under shared hosting: simple HTTPS POST, atomic DB transaction.
     */
    public function sync(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id;

        $validated = $request->validate([
            'mutations' => ['nullable', 'array'],
            'mutations.*.id' => ['required_with:mutations', 'string'],
            'mutations.*.type' => [
                'required_with:mutations',
                'string',
                'in:create_task,update_task,delete_task,create_category,delete_category,toggle_occurrence,skip_occurrence',
            ],
            'mutations.*.client_uuid' => ['nullable', 'string', 'max:36'],
            'mutations.*.expected_revision' => ['nullable', 'integer'],
            'mutations.*.payload' => ['nullable', 'array'],
            'last_sync_timestamp' => ['nullable', 'string'],
        ]);

        $mutations = $validated['mutations'] ?? [];
        $lastSyncTimestamp = $validated['last_sync_timestamp'] ?? null;

        $applied = [];
        $conflicts = [];

        DB::beginTransaction();
        try {
            foreach ($mutations as $mut) {
                $mutId = $mut['id'];
                $type = $mut['type'];
                $clientUuid = $mut['client_uuid'] ?? null;
                $expectedRev = $mut['expected_revision'] ?? null;
                $payload = $mut['payload'] ?? [];

                switch ($type) {
                    case 'create_task':
                        // Idempotency check: if task already exists with this client_uuid for this user, do not duplicate
                        $existing = null;
                        if ($clientUuid) {
                            $existing = Task::where('user_id', $userId)
                                ->where('client_uuid', $clientUuid)
                                ->first();
                        }

                        if ($existing) {
                            $applied[] = [
                                'mutation_id' => $mutId,
                                'type' => $type,
                                'client_uuid' => $clientUuid,
                                'server_id' => $existing->id,
                                'revision' => $existing->revision,
                                'action' => 'already_exists',
                            ];
                            break;
                        }

                        $dueDate = $payload['due_date'] ?? $payload['dueDate'] ?? null;
                        if ($dueDate === '') {
                            $dueDate = null;
                        }
                        $dueTime = $payload['due_time'] ?? $payload['dueTime'] ?? null;
                        if ($dueTime === '') {
                            $dueTime = null;
                        }

                        // Validate category ownership
                        $categoryId = $payload['category_id'] ?? $payload['categoryId'] ?? null;
                        if ($categoryId && ! Category::where('user_id', $userId)->where('id', $categoryId)->exists()) {
                            $categoryId = null;
                        }

                        $newTask = Task::create([
                            'user_id' => $userId,
                            'category_id' => $categoryId,
                            'title' => trim($payload['title'] ?? 'کار جدید'),
                            'period' => $payload['period'] ?? 'daily',
                            'due_date' => $dueDate,
                            'due_time' => $dueTime,
                            'alarm_enabled' => (bool) ($payload['alarm_enabled'] ?? $payload['alarmEnabled'] ?? false),
                            'alarm_triggered' => false,
                            'reminder_offset_minutes' => (int) ($payload['reminder_offset_minutes'] ?? $payload['reminderOffsetMinutes'] ?? 0),
                            'snooze_until' => $payload['snooze_until'] ?? $payload['snoozeUntil'] ?? null,
                            'completed' => (bool) ($payload['completed'] ?? false),
                            'important' => (bool) ($payload['important'] ?? false),
                            'my_day' => (bool) ($payload['my_day'] ?? $payload['myDay'] ?? ($dueDate === date('Y-m-d'))),
                            'notes' => $payload['notes'] ?? '',
                            'client_uuid' => $clientUuid,
                            'revision' => 1,
                            'recurrence_pattern' => $payload['recurrence_pattern'] ?? $payload['recurrencePattern'] ?? 'none',
                            'recurrence_interval' => (int) ($payload['recurrence_interval'] ?? $payload['recurrenceInterval'] ?? 1),
                            'recurrence_weekdays' => $payload['recurrence_weekdays'] ?? $payload['recurrenceWeekdays'] ?? null,
                            'recurrence_month_day' => $payload['recurrence_month_day'] ?? $payload['recurrenceMonthDay'] ?? null,
                            'recurrence_end_date' => $payload['recurrence_end_date'] ?? $payload['recurrenceEndDate'] ?? null,
                            'recurrence_count' => $payload['recurrence_count'] ?? $payload['recurrenceCount'] ?? null,
                            'sync_status' => 'synced',
                            'last_synced_at' => now(),
                        ]);

                        // Sync subtasks
                        if (! empty($payload['subtasks']) && is_array($payload['subtasks'])) {
                            foreach ($payload['subtasks'] as $idx => $st) {
                                $text = is_array($st) ? ($st['text'] ?? '') : (string) $st;
                                $isDone = is_array($st) ? (! empty($st['done']) || ! empty($st['is_done'])) : false;
                                $subUuid = is_array($st) ? ($st['client_uuid'] ?? null) : null;
                                if (trim($text) !== '') {
                                    Subtask::create([
                                        'task_id' => $newTask->id,
                                        'user_id' => $userId,
                                        'text' => trim($text),
                                        'is_done' => $isDone,
                                        'client_uuid' => $subUuid,
                                        'order_index' => $idx,
                                    ]);
                                }
                            }
                        }

                        // Sync tags
                        if (! empty($payload['tags']) && is_array($payload['tags'])) {
                            $tagIds = [];
                            foreach ($payload['tags'] as $tagName) {
                                $cleanName = trim(ltrim((string) (is_array($tagName) ? ($tagName['name'] ?? '') : $tagName), '#'));
                                if ($cleanName !== '') {
                                    $tag = Tag::firstOrCreate([
                                        'user_id' => $userId,
                                        'name' => $cleanName,
                                    ]);
                                    $tagIds[] = $tag->id;
                                }
                            }
                            if (count($tagIds) > 0) {
                                $newTask->tags()->sync($tagIds);
                            }
                        }

                        $applied[] = [
                            'mutation_id' => $mutId,
                            'type' => $type,
                            'client_uuid' => $clientUuid,
                            'server_id' => $newTask->id,
                            'revision' => $newTask->revision,
                            'action' => 'created',
                        ];
                        break;

                    case 'update_task':
                        $targetTask = null;
                        $hasNumericId = ! empty($payload['id']) && is_numeric($payload['id']) && (int) $payload['id'] > 0;
                        if ($hasNumericId) {
                            $targetTask = Task::where('user_id', $userId)->where('id', (int) $payload['id'])->first();
                        }
                        if (! $targetTask && $clientUuid) {
                            $targetTask = Task::where('user_id', $userId)->where('client_uuid', $clientUuid)->first();
                        }

                        if (! $targetTask) {
                            $applied[] = [
                                'mutation_id' => $mutId,
                                'type' => $type,
                                'client_uuid' => $clientUuid,
                                'action' => 'not_found',
                            ];
                            break;
                        }

                        // Conflict detection: if expected_revision does not match server revision
                        if ($expectedRev !== null && $targetTask->revision !== (int) $expectedRev) {
                            $conflicts[] = [
                                'mutation_id' => $mutId,
                                'client_uuid' => $clientUuid,
                                'server_task' => $targetTask->load(['subtasks', 'category', 'tags']),
                                'client_payload' => $payload,
                                'server_revision' => $targetTask->revision,
                                'client_expected_revision' => $expectedRev,
                            ];
                            break;
                        }

                        // Apply updates
                        if (isset($payload['title'])) {
                            $targetTask->title = trim($payload['title']);
                        }
                        if (isset($payload['period'])) {
                            $targetTask->period = $payload['period'];
                        }
                        if (array_key_exists('due_date', $payload) || array_key_exists('dueDate', $payload)) {
                            $v = $payload['due_date'] ?? $payload['dueDate'] ?? null;
                            $targetTask->due_date = $v === '' ? null : $v;
                            $targetTask->my_day = ($targetTask->due_date === date('Y-m-d'));
                        }
                        if (array_key_exists('due_time', $payload) || array_key_exists('dueTime', $payload)) {
                            $v = $payload['due_time'] ?? $payload['dueTime'] ?? null;
                            $targetTask->due_time = $v === '' ? null : $v;
                        }
                        if (isset($payload['alarm_enabled']) || isset($payload['alarmEnabled'])) {
                            $targetTask->alarm_enabled = (bool) ($payload['alarm_enabled'] ?? $payload['alarmEnabled']);
                        }
                        if (isset($payload['reminder_offset_minutes']) || isset($payload['reminderOffsetMinutes'])) {
                            $targetTask->reminder_offset_minutes = (int) ($payload['reminder_offset_minutes'] ?? $payload['reminderOffsetMinutes']);
                        }
                        if (array_key_exists('snooze_until', $payload) || array_key_exists('snoozeUntil', $payload)) {
                            $targetTask->snooze_until = $payload['snooze_until'] ?? $payload['snoozeUntil'] ?? null;
                        }
                        if (isset($payload['completed'])) {
                            $targetTask->completed = (bool) $payload['completed'];
                            $targetTask->completed_at = $targetTask->completed ? now() : null;
                        }
                        if (isset($payload['important'])) {
                            $targetTask->important = (bool) $payload['important'];
                        }
                        if (isset($payload['notes'])) {
                            $targetTask->notes = $payload['notes'];
                        }
                        if (array_key_exists('category_id', $payload) || array_key_exists('categoryId', $payload)) {
                            $cId = $payload['category_id'] ?? $payload['categoryId'] ?? null;
                            if ($cId && ! Category::where('user_id', $userId)->where('id', $cId)->exists()) {
                                $cId = null;
                            }
                            $targetTask->category_id = $cId;
                        }

                        $targetTask->last_synced_at = now();
                        $targetTask->sync_status = 'synced';
                        $targetTask->save();

                        $applied[] = [
                            'mutation_id' => $mutId,
                            'type' => $type,
                            'client_uuid' => $clientUuid,
                            'server_id' => $targetTask->id,
                            'revision' => $targetTask->revision,
                            'action' => 'updated',
                        ];
                        break;

                    case 'delete_task':
                        $targetTask = null;
                        $hasNumericId = ! empty($payload['id']) && is_numeric($payload['id']) && (int) $payload['id'] > 0;
                        if ($hasNumericId) {
                            $targetTask = Task::where('user_id', $userId)->where('id', (int) $payload['id'])->first();
                        }
                        if (! $targetTask && $clientUuid) {
                            $targetTask = Task::where('user_id', $userId)->where('client_uuid', $clientUuid)->first();
                        }

                        if ($targetTask) {
                            $targetTask->delete(); // soft delete tombstone
                        }

                        $applied[] = [
                            'mutation_id' => $mutId,
                            'type' => $type,
                            'client_uuid' => $clientUuid,
                            'action' => 'deleted',
                        ];
                        break;

                    case 'create_category':
                        $cName = trim((string) ($payload['name'] ?? ''));
                        if ($cName !== '') {
                            $category = Category::firstOrCreate([
                                'user_id' => $userId,
                                'name' => $cName,
                            ], [
                                'color' => $payload['color'] ?? '#6D28D9',
                                'icon' => $payload['icon'] ?? null,
                                'order_index' => (int) ($payload['order_index'] ?? 0),
                            ]);
                            $applied[] = [
                                'mutation_id' => $mutId,
                                'type' => $type,
                                'server_id' => $category->id,
                                'action' => 'created',
                            ];
                        }
                        break;

                    case 'delete_category':
                        $cId = $payload['id'] ?? null;
                        if ($cId) {
                            $cat = Category::where('user_id', $userId)->where('id', $cId)->first();
                            if ($cat) {
                                $cat->delete();
                            }
                            $applied[] = [
                                'mutation_id' => $mutId,
                                'type' => $type,
                                'server_id' => $cId,
                                'action' => 'deleted',
                            ];
                        }
                        break;

                    case 'toggle_occurrence':
                        $taskId = $payload['task_id'] ?? $payload['taskId'] ?? null;
                        $occDate = $payload['occurrence_date'] ?? $payload['occurrenceDate'] ?? null;
                        $isCompleted = ! empty($payload['completed']);
                        if ($taskId && $occDate) {
                            $parentTask = Task::where('user_id', $userId)->where('id', $taskId)->first();
                            if ($parentTask) {
                                if ($isCompleted) {
                                    $this->recurrenceService->completeOccurrence($parentTask, $occDate, $userId);
                                } else {
                                    $this->recurrenceService->uncompleteOccurrence($parentTask, $occDate, $userId);
                                }
                                $applied[] = [
                                    'mutation_id' => $mutId,
                                    'type' => $type,
                                    'action' => $isCompleted ? 'completed' : 'uncompleted',
                                ];
                            }
                        }
                        break;

                    case 'skip_occurrence':
                        $taskId = $payload['task_id'] ?? $payload['taskId'] ?? null;
                        $occDate = $payload['occurrence_date'] ?? $payload['occurrenceDate'] ?? null;
                        if ($taskId && $occDate) {
                            $parentTask = Task::where('user_id', $userId)->where('id', $taskId)->first();
                            if ($parentTask) {
                                $this->recurrenceService->skipOccurrence($parentTask, $occDate, $userId);
                                $applied[] = [
                                    'mutation_id' => $mutId,
                                    'type' => $type,
                                    'action' => 'skipped',
                                ];
                            }
                        }
                        break;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('[SyncController] Batch sync error: '.$e->getMessage());

            return response()->json([
                'error' => 'sync_failed',
                'message' => 'خطا در پردازش همگام‌سازی: '.$e->getMessage(),
            ], 500);
        }

        // Fetch fresh server state for this user
        $tasksQuery = Task::where('user_id', $userId)->with(['subtasks', 'category', 'tags']);
        $deletedIds = [];

        if ($lastSyncTimestamp) {
            $parsedTimestamp = date('Y-m-d H:i:s', strtotime($lastSyncTimestamp));
            $tasksQuery->where(function ($q) use ($parsedTimestamp) {
                $q->where('updated_at', '>=', $parsedTimestamp)
                    ->orWhere('last_synced_at', '>=', $parsedTimestamp);
            });

            $deletedIds = Task::onlyTrashed()
                ->where('user_id', $userId)
                ->where('deleted_at', '>=', $parsedTimestamp)
                ->pluck('id')
                ->toArray();
        }
        $serverTasks = $tasksQuery->orderBy('due_date', 'asc')->get();

        $categories = Category::where('user_id', $userId)->orderBy('name')->get();
        $tags = Tag::where('user_id', $userId)->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'applied' => $applied,
            'conflicts' => $conflicts,
            'server_tasks' => $serverTasks,
            'deleted_ids' => $deletedIds,
            'categories' => $categories,
            'tags' => $tags,
            'sync_timestamp' => now()->toIso8601String(),
        ]);
    }
}
