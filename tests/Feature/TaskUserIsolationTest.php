<?php

namespace Tests\Feature;

use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskUserIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_task_and_it_is_scoped_to_them(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/tasks', [
            'title' => 'بررسی امور روزانه',
            'period' => 'daily',
            'dueDate' => '2026-10-26',
            'dueTime' => '10:00',
            'alarmEnabled' => true,
            'important' => true,
            'notes' => 'یادداشت خصوصی',
            'subtasks' => [
                ['text' => 'مرحله اول', 'done' => false],
                ['text' => 'مرحله دوم', 'done' => true],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('task.title', 'بررسی امور روزانه')
            ->assertJsonPath('task.alarm_enabled', true)
            ->assertJsonPath('task.important', true);

        $taskId = $response->json('task.id');
        $task = Task::findOrFail($taskId);
        $this->assertEquals($user->id, $task->user_id);
        $this->assertEquals(2, $task->subtasks()->count());
    }

    public function test_user_cannot_see_other_users_tasks(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Task::create([
            'user_id' => $userA->id,
            'title' => 'کار شخصی کاربر الف',
            'period' => 'daily',
        ]);

        Task::create([
            'user_id' => $userB->id,
            'title' => 'کار شخصی کاربر ب',
            'period' => 'weekly',
        ]);

        // User A fetches tasks
        $responseA = $this->actingAs($userA)->getJson('/api/tasks');
        $responseA->assertStatus(200);
        $tasksA = $responseA->json('tasks');

        $this->assertCount(1, $tasksA);
        $this->assertEquals('کار شخصی کاربر الف', $tasksA[0]['title']);

        // User B fetches tasks
        $responseB = $this->actingAs($userB)->getJson('/api/tasks');
        $responseB->assertStatus(200);
        $tasksB = $responseB->json('tasks');

        $this->assertCount(1, $tasksB);
        $this->assertEquals('کار شخصی کاربر ب', $tasksB[0]['title']);
    }

    public function test_user_cannot_view_update_or_delete_other_users_task(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskA = Task::create([
            'user_id' => $userA->id,
            'title' => 'کار محرمانه کاربر الف',
            'period' => 'daily',
        ]);

        // User B tries to view task A
        $this->actingAs($userB)->getJson("/api/tasks/{$taskA->id}")
            ->assertStatus(403);

        // User B tries to update task A
        $this->actingAs($userB)->putJson("/api/tasks/{$taskA->id}", [
            'title' => 'تلاش برای تغییر نام',
        ])->assertStatus(403);

        $this->assertEquals('کار محرمانه کاربر الف', $taskA->fresh()->title);

        // User B tries to delete task A
        $this->actingAs($userB)->deleteJson("/api/tasks/{$taskA->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('tasks', ['id' => $taskA->id]);
    }

    public function test_user_cannot_modify_other_users_subtasks(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskA = Task::create([
            'user_id' => $userA->id,
            'title' => 'کار اصلی الف',
            'period' => 'daily',
        ]);

        $subtaskA = Subtask::create([
            'task_id' => $taskA->id,
            'user_id' => $userA->id,
            'text' => 'مرحله الف',
            'is_done' => false,
        ]);

        // User B tries to add a subtask to Task A
        $this->actingAs($userB)->postJson("/api/tasks/{$taskA->id}/subtasks", [
            'text' => 'تلاش نفوذ',
        ])->assertStatus(403);

        // User B tries to toggle Subtask A
        $this->actingAs($userB)->putJson("/api/subtasks/{$subtaskA->id}", [
            'done' => true,
        ])->assertStatus(403);

        // User B tries to delete Subtask A
        $this->actingAs($userB)->deleteJson("/api/subtasks/{$subtaskA->id}")
            ->assertStatus(403);

        $this->assertFalse($subtaskA->fresh()->is_done);
        $this->assertDatabaseHas('subtasks', ['id' => $subtaskA->id]);
    }
}
