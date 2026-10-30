<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $userA;

    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->userA = User::factory()->create();
        $this->userB = User::factory()->create();
    }

    public function test_user_cannot_assign_another_users_category_on_create(): void
    {
        $catA = Category::create([
            'user_id' => $this->userA->id,
            'name' => 'دسته‌بندی کاربر الف',
        ]);

        // User B attempts to create a task using User A's category
        $response = $this->actingAs($this->userB)->postJson('/api/tasks', [
            'title' => 'تسک کاربر ب',
            'category_id' => $catA->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);
    }

    public function test_user_cannot_assign_another_users_category_on_update(): void
    {
        $catA = Category::create([
            'user_id' => $this->userA->id,
            'name' => 'دسته‌بندی کاربر الف',
        ]);

        $taskB = Task::create([
            'user_id' => $this->userB->id,
            'title' => 'تسک کاربر ب',
            'period' => 'daily',
        ]);

        // User B attempts to assign User A's category to their task
        $response = $this->actingAs($this->userB)->putJson("/api/tasks/{$taskB->id}", [
            'category_id' => $catA->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);
    }

    public function test_user_cannot_attach_another_users_tags_by_id(): void
    {
        $tagA = Tag::create([
            'user_id' => $this->userA->id,
            'name' => 'برچسب خصوصی الف',
        ]);

        // User B attempts to attach User A's tag ID
        $response = $this->actingAs($this->userB)->postJson('/api/tasks', [
            'title' => 'تسک با برچسب غیرمجاز',
            'tags' => [$tagA->id],
        ]);

        $response->assertStatus(201);
        $taskId = $response->json('task.id');
        $task = Task::find($taskId);

        // The tag should NOT be attached because it belongs to User A
        $this->assertCount(0, $task->tags);
    }

    public function test_user_cannot_view_update_or_delete_another_users_category(): void
    {
        $catA = Category::create([
            'user_id' => $this->userA->id,
            'name' => 'پروژه محرمانه الف',
        ]);

        // View
        $this->actingAs($this->userB)->getJson("/api/categories/{$catA->id}")
            ->assertStatus(403);

        // Update
        $this->actingAs($this->userB)->putJson("/api/categories/{$catA->id}", [
            'name' => 'دستکاری نام دسته‌بندی',
        ])->assertStatus(403);

        // Delete
        $this->actingAs($this->userB)->deleteJson("/api/categories/{$catA->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('categories', ['id' => $catA->id]);
    }

    public function test_user_cannot_delete_another_users_tag(): void
    {
        $tagA = Tag::create([
            'user_id' => $this->userA->id,
            'name' => 'برچسب الف',
        ]);

        $this->actingAs($this->userB)->deleteJson("/api/tags/{$tagA->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('tags', ['id' => $tagA->id]);
    }

    public function test_user_cannot_mutate_another_users_recurrence_occurrences(): void
    {
        $recurringTaskA = Task::create([
            'user_id' => $this->userA->id,
            'title' => 'ورزش روزانه',
            'period' => 'daily',
            'due_date' => '2026-10-26',
            'recurrence_pattern' => 'daily',
            'recurrence_interval' => 1,
        ]);

        $date = '2026-10-27';

        // User B attempts to complete occurrence of User A's task
        $this->actingAs($this->userB)
            ->postJson("/api/tasks/{$recurringTaskA->id}/occurrences/{$date}/toggle-complete")
            ->assertStatus(403);

        // User B attempts to skip occurrence of User A's task
        $this->actingAs($this->userB)
            ->postJson("/api/tasks/{$recurringTaskA->id}/occurrences/{$date}/skip")
            ->assertStatus(403);

        // User B attempts to edit this occurrence of User A's task
        $this->actingAs($this->userB)
            ->postJson("/api/tasks/{$recurringTaskA->id}/occurrences/{$date}/edit-this", [
                'title' => 'دستکاری نفوذی',
            ])->assertStatus(403);

        // User B attempts to edit future occurrences of User A's task
        $this->actingAs($this->userB)
            ->postJson("/api/tasks/{$recurringTaskA->id}/occurrences/{$date}/edit-future", [
                'title' => 'دستکاری نفوذی آینده',
            ])->assertStatus(403);
    }
}
