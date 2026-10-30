<?php

namespace Tests\Feature;

use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagControllerTest extends TestCase
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

    public function test_user_can_create_and_list_tags(): void
    {
        $response = $this->actingAs($this->user1)
            ->postJson('/api/tags', [
                'name' => 'فوری',
                'color' => '#EF4444',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('tag.name', 'فوری');

        $list = $this->actingAs($this->user1)
            ->getJson('/api/tags');

        $list->assertStatus(200)
            ->assertJsonCount(1, 'tags')
            ->assertJsonPath('tags.0.name', 'فوری');
    }

    public function test_tags_are_isolated_between_users(): void
    {
        Tag::create([
            'user_id' => $this->user1->id,
            'name' => 'برچسب خصوصی',
        ]);

        $response = $this->actingAs($this->user2)
            ->getJson('/api/tags');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'tags');
    }

    public function test_task_can_be_assigned_and_filtered_by_tags(): void
    {
        $tag = Tag::create([
            'user_id' => $this->user1->id,
            'name' => 'دانشگاه',
        ]);

        $task = Task::create([
            'user_id' => $this->user1->id,
            'title' => 'تحویل پروژه هوش مصنوعی',
            'period' => 'daily',
        ]);

        $task->tags()->attach($tag->id);

        $response = $this->actingAs($this->user1)
            ->getJson("/api/tasks?tag_id={$tag->id}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'tasks')
            ->assertJsonPath('tasks.0.title', 'تحویل پروژه هوش مصنوعی');
    }
}
