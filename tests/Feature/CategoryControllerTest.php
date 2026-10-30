<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user1;

    private User $user2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user1 = User::factory()->create();
        $this->user2 = User::factory()->create();
    }

    public function test_user_can_create_and_list_categories(): void
    {
        $response = $this->actingAs($this->user1)
            ->postJson('/api/categories', [
                'name' => 'پروژه‌های شخصی',
                'color' => '#8B5CF6',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('category.name', 'پروژه‌های شخصی')
            ->assertJsonPath('category.color', '#8B5CF6');

        $list = $this->actingAs($this->user1)
            ->getJson('/api/categories');

        $list->assertStatus(200)
            ->assertJsonCount(1, 'categories')
            ->assertJsonPath('categories.0.name', 'پروژه‌های شخصی');
    }

    public function test_categories_are_strictly_isolated_between_users(): void
    {
        Category::create([
            'user_id' => $this->user1->id,
            'name' => 'دسته‌بندی محرمانه کاربر ۱',
        ]);

        $response = $this->actingAs($this->user2)
            ->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'categories');
    }

    public function test_deleting_category_preserves_associated_tasks(): void
    {
        $category = Category::create([
            'user_id' => $this->user1->id,
            'name' => 'پروژه تست',
        ]);

        $task = Task::create([
            'user_id' => $this->user1->id,
            'category_id' => $category->id,
            'title' => 'تسک مهم پروژه',
            'period' => 'daily',
        ]);

        $this->assertEquals($category->id, $task->fresh()->category_id);

        $response = $this->actingAs($this->user1)
            ->deleteJson("/api/categories/{$category->id}");

        $response->assertStatus(200);

        // Category is deleted, but task still exists with category_id = null
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
        $this->assertNull($task->fresh()->category_id);
    }
}
