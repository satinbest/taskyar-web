<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsControllerTest extends TestCase
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

    public function test_analytics_metrics_calculation_and_isolation(): void
    {
        $cat = Category::create([
            'user_id' => $this->user1->id,
            'name' => 'کار',
            'color' => '#6D28D9',
        ]);

        // User 1 tasks: 2 total, 1 completed, 1 pending
        Task::create([
            'user_id' => $this->user1->id,
            'title' => 'کار انجام شده',
            'period' => 'daily',
            'completed' => true,
            'completed_at' => now(),
            'category_id' => $cat->id,
        ]);

        Task::create([
            'user_id' => $this->user1->id,
            'title' => 'کار در حال انجام',
            'period' => 'daily',
            'completed' => false,
        ]);

        // User 2 tasks: should not affect User 1
        Task::create([
            'user_id' => $this->user2->id,
            'title' => 'تسک کاربر ۲',
            'period' => 'daily',
            'completed' => true,
        ]);

        $response = $this->actingAs($this->user1)
            ->getJson('/api/analytics');

        $response->assertStatus(200)
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.completed', 1)
            ->assertJsonPath('summary.pending', 1)
            ->assertJsonPath('summary.rate', 50)
            ->assertJsonStructure([
                'summary' => ['total', 'completed', 'pending', 'overdue', 'rate'],
                'weeklyTrend',
                'monthlyTrend',
                'categories',
            ]);
    }
}
