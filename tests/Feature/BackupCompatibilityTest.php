<?php

namespace Tests\Feature;

use App\Models\Subtask;
use App\Models\Task;
use App\Models\TaskRecurrenceException;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackupCompatibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_produces_exact_desktop_v1_schema(): void
    {
        $user = User::factory()->create();

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'بررسی ایمیل‌ها و پیام‌های کاری صبحگاهی',
            'period' => 'daily',
            'due_date' => '2026-10-26',
            'due_time' => '09:30',
            'alarm_enabled' => true,
            'alarm_triggered' => false,
            'completed' => false,
            'important' => true,
            'my_day' => true,
            'notes' => 'پاسخ به مشتریان اولویت‌دار',
        ]);

        Subtask::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'text' => 'بررسی پنل کاربری',
            'is_done' => true,
            'order_index' => 0,
        ]);

        $response = $this->actingAs($user)->getJson('/api/backup/export');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertIsArray($data);
        $this->assertCount(1, $data);

        $item = $data[0];
        // Verify all required desktop v1.1.0 keys are present
        $this->assertArrayHasKey('id', $item);
        $this->assertArrayHasKey('title', $item);
        $this->assertArrayHasKey('period', $item);
        $this->assertArrayHasKey('dueDate', $item);
        $this->assertArrayHasKey('dueTime', $item);
        $this->assertArrayHasKey('alarmEnabled', $item);
        $this->assertArrayHasKey('alarmTriggered', $item);
        $this->assertArrayHasKey('completed', $item);
        $this->assertArrayHasKey('important', $item);
        $this->assertArrayHasKey('myDay', $item);
        $this->assertArrayHasKey('notes', $item);
        $this->assertArrayHasKey('subtasks', $item);
        $this->assertArrayHasKey('createdAt', $item);

        $this->assertEquals('بررسی ایمیل‌ها و پیام‌های کاری صبحگاهی', $item['title']);
        $this->assertEquals('2026-10-26', $item['dueDate']);
        $this->assertEquals('09:30', $item['dueTime']);
        $this->assertTrue($item['alarmEnabled']);
        $this->assertTrue($item['important']);
        $this->assertEquals('پاسخ به مشتریان اولویت‌دار', $item['notes']);

        $this->assertCount(1, $item['subtasks']);
        $this->assertEquals('بررسی پنل کاربری', $item['subtasks'][0]['text']);
        $this->assertTrue($item['subtasks'][0]['done']);
    }

    public function test_import_desktop_backup_populates_user_tasks_with_isolation(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        // Authentic Desktop v1.1.0 JSON payload
        $desktopBackup = [
            [
                'id' => 101,
                'title' => 'برنامه‌ریزی هفتگی پروژه تسک‌یار',
                'period' => 'weekly',
                'dueDate' => '2026-10-28',
                'dueTime' => '11:00',
                'alarmEnabled' => true,
                'alarmTriggered' => false,
                'completed' => false,
                'important' => true,
                'myDay' => false,
                'notes' => 'بررسی معماری PWA و سینک',
                'subtasks' => [
                    ['text' => 'طراحی دیتابیس', 'done' => true],
                    ['text' => 'پیاده‌سازی تست‌ها', 'done' => false],
                ],
                'createdAt' => '۱۴۰۵/۰۸/۰۴',
            ],
            [
                'id' => 102,
                'title' => 'تماس با سرپرست تیم',
                'period' => 'daily',
                'dueDate' => '2026-10-26',
                'dueTime' => '16:00',
                'alarmEnabled' => false,
                'alarmTriggered' => false,
                'completed' => true,
                'important' => false,
                'myDay' => true,
                'notes' => '',
                'subtasks' => [],
                'createdAt' => '۱۴۰۵/۰۸/۰۲',
            ],
        ];

        $response = $this->actingAs($userA)->postJson('/api/backup/import', $desktopBackup);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('count', 2);

        // Verify User A has 2 tasks
        $this->assertEquals(2, Task::where('user_id', $userA->id)->count());

        $firstTask = Task::where('user_id', $userA->id)
            ->where('title', 'برنامه‌ریزی هفتگی پروژه تسک‌یار')
            ->first();
        $this->assertNotNull($firstTask);
        $this->assertEquals('weekly', $firstTask->period);
        $this->assertEquals('2026-10-28', $firstTask->due_date);
        $this->assertEquals('11:00', $firstTask->due_time);
        $this->assertTrue($firstTask->important);
        $this->assertEquals(2, $firstTask->subtasks()->count());

        // Verify User B has ZERO tasks (strict isolation)
        $this->assertEquals(0, Task::where('user_id', $userB->id)->count());
    }

    public function test_import_rejects_empty_or_malformed_payload(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/backup/import', []);
        $response->assertStatus(422);

        $response = $this->actingAs($user)->call(
            'POST',
            '/api/backup/import',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            'INVALID_JSON'
        );
        $response->assertStatus(422);
    }

    public function test_round_trip_desktop_compatibility(): void
    {
        $user = User::factory()->create();

        $desktopInput = [
            [
                'id' => 1,
                'title' => 'تست چرخه کامل خروجی و ورودی',
                'period' => 'monthly',
                'dueDate' => '2026-11-15',
                'dueTime' => '18:30',
                'alarmEnabled' => true,
                'alarmTriggered' => false,
                'completed' => false,
                'important' => true,
                'myDay' => false,
                'notes' => 'توضیحات تست راندتریپ',
                'subtasks' => [
                    ['text' => 'گام یک', 'done' => true],
                ],
                'createdAt' => '۱۴۰۵/۰۸/۲۵',
            ],
        ];

        // 1. Import
        $importResponse = $this->actingAs($user)->postJson('/api/backup/import', $desktopInput);
        $importResponse->assertStatus(200);

        // 2. Export
        $exportResponse = $this->actingAs($user)->getJson('/api/backup/export');
        $exportResponse->assertStatus(200);

        $exported = $exportResponse->json();
        $this->assertCount(1, $exported);
        $this->assertEquals('تست چرخه کامل خروجی و ورودی', $exported[0]['title']);
        $this->assertEquals('monthly', $exported[0]['period']);
        $this->assertEquals('2026-11-15', $exported[0]['dueDate']);
        $this->assertEquals('18:30', $exported[0]['dueTime']);
        $this->assertTrue($exported[0]['alarmEnabled']);
        $this->assertTrue($exported[0]['important']);
        $this->assertEquals('توضیحات تست راندتریپ', $exported[0]['notes']);
        $this->assertCount(1, $exported[0]['subtasks']);
        $this->assertEquals('گام یک', $exported[0]['subtasks'][0]['text']);
        $this->assertTrue($exported[0]['subtasks'][0]['done']);
    }

    public function test_version_2_backup_export_and_import_with_categories_and_recurrence(): void
    {
        $user = User::factory()->create();

        $v2Payload = [
            'version' => 2,
            'source' => 'TaskYar Web 2.0',
            'categories' => [
                ['name' => 'آموزش', 'color' => '#10B981', 'order_index' => 1],
            ],
            'tags' => [
                ['name' => 'مهم_دانشگاه', 'color' => '#F59E0B'],
            ],
            'tasks' => [
                [
                    'title' => 'جلسه هفتگی آزمایشگاه',
                    'period' => 'weekly',
                    'dueDate' => '2026-10-26',
                    'dueTime' => '14:00',
                    'category' => 'آموزش',
                    'tags' => ['مهم_دانشگاه'],
                    'recurrence_pattern' => 'weekly',
                    'recurrence_interval' => 1,
                    'recurrence_weekdays' => [2],
                    'subtasks' => [
                        ['text' => 'گزارش ژورنال', 'done' => false],
                    ],
                ],
            ],
        ];

        // Import v2
        $importResp = $this->actingAs($user)->postJson('/api/backup/import', $v2Payload);
        $importResp->assertStatus(200);

        // Verify category created
        $this->assertDatabaseHas('categories', ['user_id' => $user->id, 'name' => 'آموزش']);
        // Verify tag created
        $this->assertDatabaseHas('tags', ['user_id' => $user->id, 'name' => 'مهم_دانشگاه']);
        // Verify task created with recurrence
        $task = Task::where('user_id', $user->id)->first();
        $this->assertNotNull($task);
        $this->assertEquals('weekly', $task->recurrence_pattern);
        $this->assertEquals('آموزش', $task->category->name);
        $this->assertEquals('مهم_دانشگاه', $task->tags->first()->name);

        // Export with v=2
        $exportResp = $this->actingAs($user)->getJson('/api/backup/export?v=2');
        $exportResp->assertStatus(200);
        $data = $exportResp->json();

        $this->assertEquals(2, $data['version']);
        $this->assertCount(1, $data['categories']);
        $this->assertCount(1, $data['tags']);
        $this->assertCount(1, $data['tasks']);
        $this->assertEquals('جلسه هفتگی آزمایشگاه', $data['tasks'][0]['title']);
        $this->assertEquals('weekly', $data['tasks'][0]['recurrence_pattern']);
    }

    public function test_round_trip_v2_with_recurrence_exceptions_and_reminders(): void
    {
        $user = User::factory()->create(['theme' => 'emerald']);

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'جلسه هفتگی توسعه',
            'period' => 'weekly',
            'due_date' => '2026-10-24',
            'due_time' => '10:00',
            'alarm_enabled' => true,
            'reminder_offset_minutes' => 45,
            'snooze_until' => '2026-10-24 10:15:00',
            'recurrence_pattern' => 'weekly',
            'recurrence_interval' => 1,
        ]);

        TaskRecurrenceException::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'occurrence_date' => '2026-10-31',
            'action' => 'completed',
            'completed_at' => now(),
        ]);

        // 1. Export v2
        $exportResp = $this->actingAs($user)->getJson('/api/backup/export?v=2');
        $exportResp->assertOk();
        $exportedData = $exportResp->json();

        $this->assertEquals('emerald', $exportedData['user_preferences']['theme']);
        $this->assertEquals(45, $exportedData['tasks'][0]['reminderOffsetMinutes']);
        $this->assertCount(1, $exportedData['recurrence_exceptions']);
        $this->assertEquals('2026-10-31', $exportedData['recurrence_exceptions'][0]['occurrence_date']);

        // 2. Restore into a new isolated user
        $newUser = User::factory()->create(['theme' => 'default']);
        $importResp = $this->actingAs($newUser)->postJson('/api/backup/import', $exportedData);
        $importResp->assertOk();

        // Verify restored state in new user
        $this->assertEquals('emerald', $newUser->fresh()->theme);
        $restoredTask = Task::where('user_id', $newUser->id)->first();
        $this->assertNotNull($restoredTask);
        $this->assertEquals(45, $restoredTask->reminder_offset_minutes);
        $this->assertEquals('جلسه هفتگی توسعه', $restoredTask->title);

        $restoredException = TaskRecurrenceException::where('user_id', $newUser->id)->first();
        $this->assertNotNull($restoredException);
        $this->assertEquals($restoredTask->id, $restoredException->task_id);
        $this->assertEquals('2026-10-31', substr((string) $restoredException->occurrence_date, 0, 10));
    }

    public function test_import_rejects_payload_exceeding_limit(): void
    {
        $user = User::factory()->create();

        // Create 5001 empty tasks
        $hugeTasks = array_fill(0, 5001, ['title' => 'تسک آزمایشی']);

        $response = $this->actingAs($user)->postJson('/api/backup/import', [
            'version' => 2,
            'tasks' => $hugeTasks,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'تعداد کارهای موجود در فایل پشتیبان بیش از سقف مجاز (۵۰۰۰ کار) است.');
    }
}
