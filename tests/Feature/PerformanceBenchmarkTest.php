<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PerformanceBenchmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_tasks_query_performance_with_100_and_1000_tasks(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        // Create categories and tags
        $catWork = Category::create(['user_id' => $user->id, 'name' => 'کار', 'color' => '#3B82F6']);
        $catPersonal = Category::create(['user_id' => $user->id, 'name' => 'شخصی', 'color' => '#10B981']);
        $tagUrgent = Tag::create(['user_id' => $user->id, 'name' => 'فوری']);

        // Insert 100 tasks for benchmark
        $now = now();
        $tasksData100 = [];
        for ($i = 1; $i <= 100; $i++) {
            $tasksData100[] = [
                'user_id' => $user->id,
                'client_uuid' => "perf-task-100-{$i}",
                'title' => "تسک عملکردی {$i}",
                'category_id' => ($i % 2 === 0) ? $catWork->id : $catPersonal->id,
                'due_date' => '2026-10-28',
                'due_time' => '10:00:00',
                'completed' => ($i % 4 === 0),
                'recurrence_pattern' => ($i % 10 === 0) ? 'daily' : 'none',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        Task::insert($tasksData100);

        // Benchmark 100 tasks retrieval
        DB::enableQueryLog();
        $startTime = microtime(true);
        $response100 = $this->actingAs($user)->getJson('/api/tasks');
        $time100 = (microtime(true) - $startTime) * 1000;
        $queries100 = count(DB::getQueryLog());
        DB::disableQueryLog();

        $response100->assertOk();
        $this->assertCount(100, $response100->json('tasks'));
        // Eager loading subtasks, category, tags should result in constant/minimal queries (<= 5 queries)
        $this->assertLessThanOrEqual(6, $queries100, 'Query count for 100 tasks should be bounded by eager loading');
        $this->assertLessThan(500, $time100, '100 tasks retrieval should complete in under 500ms');

        // Insert additional tasks to reach 1,000 tasks
        $tasksData900 = [];
        for ($i = 101; $i <= 1000; $i++) {
            $tasksData900[] = [
                'user_id' => $user->id,
                'client_uuid' => "perf-task-1000-{$i}",
                'title' => "تسک مقیاس {$i}",
                'category_id' => ($i % 2 === 0) ? $catWork->id : $catPersonal->id,
                'due_date' => '2026-10-28',
                'due_time' => '11:00:00',
                'completed' => ($i % 3 === 0),
                'recurrence_pattern' => 'none',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        foreach (array_chunk($tasksData900, 25) as $chunk) {
            Task::insert($chunk);
        }

        // Benchmark 1,000 tasks retrieval
        DB::flushQueryLog();
        DB::enableQueryLog();
        $startTime = microtime(true);
        $response1000 = $this->actingAs($user)->getJson('/api/tasks');
        $time1000 = (microtime(true) - $startTime) * 1000;
        $queries1000 = count(DB::getQueryLog());
        DB::disableQueryLog();

        $response1000->assertOk();
        $this->assertCount(1000, $response1000->json('tasks'));
        // Queries must remain constant regardless of task count due to eager loading
        $this->assertLessThanOrEqual(6, $queries1000, 'Query count for 1,000 tasks must not produce N+1');
        $this->assertLessThan(1000, $time1000, '1,000 tasks retrieval should complete in under 1s');
    }

    public function test_analytics_query_performance_with_large_dataset(): void
    {
        $user = User::factory()->create();
        $cat = Category::create(['user_id' => $user->id, 'name' => 'پروژه', 'color' => '#6366F1']);

        // Insert 2,000 tasks spread over various dates and completion states
        $now = now();
        $tasksData = [];
        for ($i = 1; $i <= 2000; $i++) {
            $dayOffset = ($i % 30);
            $date = date('Y-m-d', strtotime("2026-10-01 +{$dayOffset} days"));
            $tasksData[] = [
                'user_id' => $user->id,
                'client_uuid' => "perf-analytics-{$i}",
                'title' => "تسک تحلیل {$i}",
                'category_id' => $cat->id,
                'due_date' => $date,
                'completed' => ($i % 2 === 0),
                'completed_at' => ($i % 2 === 0) ? "{$date} 12:00:00" : null,
                'recurrence_pattern' => 'none',
                'created_at' => "{$date} 09:00:00",
                'updated_at' => "{$date} 12:00:00",
            ];
        }

        foreach (array_chunk($tasksData, 25) as $chunk) {
            Task::insert($chunk);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();
        $startTime = microtime(true);
        $response = $this->actingAs($user)->getJson('/api/analytics');
        $durationMs = (microtime(true) - $startTime) * 1000;
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals(2000, $data['summary']['total']);
        $this->assertEquals(1000, $data['summary']['completed']);
        $this->assertEquals(1000, $data['summary']['pending']);

        // Thanks to windowed grouping in AnalyticsController, queries are minimized (under 15 queries total)
        $this->assertLessThanOrEqual(15, $queryCount, 'Analytics must use windowed queries and avoid N+1 per day/month');
        $this->assertLessThan(600, $durationMs, 'Analytics aggregation for 2,000 tasks must be faster than 600ms');
    }

    public function test_recurrence_expansion_bounded_safety(): void
    {
        $user = User::factory()->create();

        // Recurring daily task spanning indefinitely
        $task = Task::create([
            'user_id' => $user->id,
            'client_uuid' => 'perf-recurring-daily',
            'title' => 'ورزش روزانه بدون پایان',
            'due_date' => '2026-10-01',
            'recurrence_pattern' => 'daily',
            'recurrence_interval' => 1,
            'is_completed' => false,
        ]);

        // Expand over a 1-week window
        $startTime = microtime(true);
        $response = $this->actingAs($user)->getJson('/api/tasks?from=2026-10-01&to=2026-10-07');
        $durationMs = (microtime(true) - $startTime) * 1000;

        $response->assertOk();
        $tasks = $response->json('tasks');
        $this->assertCount(7, $tasks, '7 daily occurrences expected in a 7-day window');
        $this->assertLessThan(200, $durationMs, 'Windowed expansion should take under 200ms');
    }
}
