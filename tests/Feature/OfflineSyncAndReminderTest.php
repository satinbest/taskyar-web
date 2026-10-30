<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflineSyncAndReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_creates_task_idempotently_with_client_uuid(): void
    {
        $user = User::factory()->create();

        $payload = [
            'mutations' => [
                [
                    'id' => 'mut_1',
                    'type' => 'create_task',
                    'client_uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    'payload' => [
                        'title' => 'تسک آفلاین ۱',
                        'due_date' => '2026-10-27',
                        'due_time' => '14:00',
                        'alarm_enabled' => true,
                        'reminder_offset_minutes' => 15,
                    ],
                ],
            ],
        ];

        // 1. First sync submission
        $response = $this->actingAs($user)->postJson('/api/sync', $payload);
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('applied.0.action', 'created')
            ->assertJsonPath('applied.0.client_uuid', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

        $this->assertDatabaseHas('tasks', [
            'user_id' => $user->id,
            'client_uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'title' => 'تسک آفلاین ۱',
            'reminder_offset_minutes' => 15,
        ]);

        // 2. Duplicate retry submission with same client_uuid (idempotency check)
        $retryResponse = $this->actingAs($user)->postJson('/api/sync', $payload);
        $retryResponse->assertOk()
            ->assertJsonPath('applied.0.action', 'already_exists');

        $this->assertEquals(1, Task::where('client_uuid', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')->count());
    }

    public function test_sync_detects_revision_conflict(): void
    {
        $user = User::factory()->create();

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'تسک قبل از تغییر سرور',
            'period' => 'daily',
            'client_uuid' => 'uuid-conflict-test',
            'revision' => 2, // Server is already at revision 2
        ]);

        // Client attempts to sync mutation with stale expected_revision = 1
        $payload = [
            'mutations' => [
                [
                    'id' => 'mut_stale',
                    'type' => 'update_task',
                    'client_uuid' => 'uuid-conflict-test',
                    'expected_revision' => 1,
                    'payload' => [
                        'id' => $task->id,
                        'title' => 'تغییر آفلاین با نسخه قدیمی',
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($user)->postJson('/api/sync', $payload);
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'conflicts')
            ->assertJsonPath('conflicts.0.client_uuid', 'uuid-conflict-test')
            ->assertJsonPath('conflicts.0.server_revision', 2)
            ->assertJsonPath('conflicts.0.client_expected_revision', 1);

        // Task title on server should remain unchanged
        $this->assertEquals('تسک قبل از تغییر سرور', $task->fresh()->title);
    }

    public function test_direct_put_returns_409_on_revision_conflict(): void
    {
        $user = User::factory()->create();

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'عنوان اصلی',
            'period' => 'daily',
            'revision' => 5,
        ]);

        $response = $this->actingAs($user)->putJson("/api/tasks/{$task->id}", [
            'title' => 'عنوان جدید معارض',
            'expected_revision' => 4, // stale
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('error', 'conflict')
            ->assertJsonPath('server_revision', 5)
            ->assertJsonPath('client_expected_revision', 4);
    }

    public function test_multiuser_isolation_in_sync(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskA = Task::create([
            'user_id' => $userA->id,
            'title' => 'تسک کاربر الف',
            'period' => 'daily',
            'client_uuid' => 'uuid-user-a',
            'revision' => 1,
        ]);

        // User B attempts to delete User A's task via sync
        $payload = [
            'mutations' => [
                [
                    'id' => 'mut_b',
                    'type' => 'delete_task',
                    'client_uuid' => 'uuid-user-a',
                    'payload' => [
                        'id' => $taskA->id,
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($userB)->postJson('/api/sync', $payload);
        $response->assertOk();

        // Task A must still exist because User B does not own it
        $this->assertNull(Task::where('user_id', $userB->id)->where('id', $taskA->id)->first());
        $this->assertNotNull(Task::where('user_id', $userA->id)->where('id', $taskA->id)->first());
    }

    public function test_advanced_reminder_and_snooze_persistence(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/tasks', [
            'title' => 'تسک با یادآور پیشرفته',
            'period' => 'daily',
            'due_date' => '2026-10-28',
            'due_time' => '10:00',
            'alarm_enabled' => true,
            'reminder_offset_minutes' => 30,
        ]);

        $response->assertCreated()
            ->assertJsonPath('task.reminderOffsetMinutes', 30);

        $taskId = $response->json('task.id');

        // Test snooze update
        $snoozeTime = now()->addMinutes(10)->toIso8601String();
        $updateResp = $this->actingAs($user)->putJson("/api/tasks/{$taskId}", [
            'snooze_until' => $snoozeTime,
        ]);

        $updateResp->assertOk();
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'reminder_offset_minutes' => 30,
        ]);
    }

    public function test_sync_handles_categories_occurrences_subtasks_and_tombstones(): void
    {
        $user = User::factory()->create();

        // 1. Sync create_category and create_task with subtasks and tags
        $payload = [
            'mutations' => [
                [
                    'id' => 'mut_cat_1',
                    'type' => 'create_category',
                    'payload' => [
                        'name' => 'دسته‌بندی آفلاین',
                        'color' => '#10B981',
                    ],
                ],
                [
                    'id' => 'mut_task_full',
                    'type' => 'create_task',
                    'client_uuid' => 'uuid-full-offline-task',
                    'payload' => [
                        'title' => 'تسک کامل با زیرکار و برچسب',
                        'period' => 'daily',
                        'due_date' => '2026-10-28',
                        'subtasks' => [
                            ['text' => 'زیرکار یک', 'done' => true],
                            ['text' => 'زیرکار دو', 'done' => false],
                        ],
                        'tags' => ['تگ_آفلاین'],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($user)->postJson('/api/sync', $payload);
        $response->assertOk()
            ->assertJsonPath('applied.0.action', 'created')
            ->assertJsonPath('applied.1.action', 'created');

        $this->assertDatabaseHas('categories', ['user_id' => $user->id, 'name' => 'دسته‌بندی آفلاین']);
        $createdTask = Task::where('client_uuid', 'uuid-full-offline-task')->first();
        $this->assertNotNull($createdTask);
        $this->assertEquals(2, $createdTask->subtasks()->count());
        $this->assertEquals('تگ_آفلاین', $createdTask->tags()->first()->name);

        // 2. Test recurrence toggle_occurrence and skip_occurrence via sync
        $recurringTask = Task::create([
            'user_id' => $user->id,
            'title' => 'جلسه هفتگی تیم',
            'period' => 'weekly',
            'due_date' => '2026-10-24',
            'recurrence_pattern' => 'weekly',
            'recurrence_interval' => 1,
        ]);

        $occDate = '2026-10-31';

        $syncOccResp = $this->actingAs($user)->postJson('/api/sync', [
            'mutations' => [
                [
                    'id' => 'mut_toggle_occ',
                    'type' => 'toggle_occurrence',
                    'payload' => [
                        'task_id' => $recurringTask->id,
                        'occurrence_date' => $occDate,
                        'completed' => true,
                    ],
                ],
            ],
        ]);

        $syncOccResp->assertOk()
            ->assertJsonPath('applied.0.action', 'completed');

        $this->assertDatabaseHas('task_recurrence_exceptions', [
            'task_id' => $recurringTask->id,
            'occurrence_date' => $occDate,
            'action' => 'completed',
        ]);

        // 3. Test tombstone detection (deleted_ids)
        $taskToDelete = Task::create([
            'user_id' => $user->id,
            'title' => 'تسک رو به حذف',
            'period' => 'daily',
        ]);

        $beforeDeleteTime = now()->subSecond()->toIso8601String();
        $taskToDelete->delete();

        $tombstoneResp = $this->actingAs($user)->postJson('/api/sync', [
            'last_sync_timestamp' => $beforeDeleteTime,
        ]);

        $tombstoneResp->assertOk()
            ->assertJsonFragment([$taskToDelete->id]);
    }
}
