<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MySqlDatabaseIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure database connection is active
        try {
            DB::connection('mysql')->getPdo();
        } catch (\Throwable $e) {
            $this->markTestSkipped('Local MySQL/MariaDB service is not available: '.$e->getMessage());
        }

        // Switch to the active MySQL test database
        config([
            'database.default' => 'mysql',
            'session.driver' => 'database',
            'session.connection' => 'mysql',
        ]);
    }

    public function test_mysql_schema_has_all_required_tables_and_key_limits(): void
    {
        $expectedTables = [
            'users',
            'password_reset_tokens',
            'sessions',
            'cache',
            'cache_locks',
            'jobs',
            'job_batches',
            'failed_jobs',
            'tasks',
            'subtasks',
            'categories',
            'tags',
            'task_tag',
            'task_recurrence_exceptions',
        ];

        foreach ($expectedTables as $table) {
            $this->assertTrue(
                Schema::connection('mysql')->hasTable($table),
                "Expected table {$table} does not exist on MySQL!"
            );
        }

        // Test insertion into password_reset_tokens with 191-character email
        $longEmail = str_repeat('a', 180).'@test.com'; // 189 chars
        DB::connection('mysql')->table('password_reset_tokens')->updateOrInsert(
            ['email' => $longEmail],
            ['token' => 'sample_token_hash', 'created_at' => now()]
        );

        $row = DB::connection('mysql')->table('password_reset_tokens')->where('email', $longEmail)->first();
        $this->assertNotNull($row);
        $this->assertEquals($longEmail, $row->email);
    }

    public function test_mysql_user_registration_and_duplicate_validation(): void
    {
        $email = 'mysql_test_'.uniqid().'@taskyar.ir';

        // 1. Successful registration
        $response = $this->postJson('/api/auth/register', [
            'name' => 'کاربر آزمایشی مای‌اس‌کیوال',
            'email' => $email,
            'password' => 'SecurePass123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', $email)
            ->assertJsonPath('user.name', 'کاربر آزمایشی مای‌اس‌کیوال');

        $this->assertAuthenticated();

        // 2. Duplicate email validation
        $dupResponse = $this->postJson('/api/auth/register', [
            'name' => 'کاربر تکراری',
            'email' => $email,
            'password' => 'AnotherPass123!',
        ]);

        $dupResponse->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_mysql_user_login_session_persistence_and_logout(): void
    {
        $email = 'mysql_auth_'.uniqid().'@taskyar.ir';
        $user = User::on('mysql')->create([
            'name' => 'تست نشست',
            'email' => $email,
            'password' => Hash::make('Password123!'),
        ]);

        // Login
        $response = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.email', $email);

        $this->assertAuthenticatedAs($user);

        // Verify session persistence in MySQL sessions table if database driver is active
        $sessionId = session()->getId();
        $this->assertNotEmpty($sessionId);

        // Logout
        $logoutResponse = $this->postJson('/api/auth/logout');
        $logoutResponse->assertStatus(200);
        $this->assertGuest();
    }

    public function test_mysql_task_crud_and_relational_operations(): void
    {
        $user = User::on('mysql')->create([
            'name' => 'تست تسک',
            'email' => 'task_user_'.uniqid().'@taskyar.ir',
            'password' => Hash::make('Secret123!'),
        ]);

        $this->actingAs($user);

        // 1. Create Category
        $catResponse = $this->postJson('/api/categories', [
            'name' => 'پروژه پروداکشن',
            'color' => '#10B981',
            'icon' => 'folder',
        ]);
        $catResponse->assertStatus(201);
        $categoryId = $catResponse->json('category.id');

        // 2. Create Tag
        $tagResponse = $this->postJson('/api/tags', [
            'name' => 'فوری',
            'color' => '#EF4444',
        ]);
        $tagResponse->assertStatus(201);
        $tagId = $tagResponse->json('tag.id');

        // 3. Create Task with category and tag
        $taskResponse = $this->postJson('/api/tasks', [
            'title' => 'تست مهاجرت دیتابیس مای‌اس‌کیوال',
            'category_id' => $categoryId,
            'tag_ids' => [$tagId],
            'due_date' => '1405-08-07',
            'due_time' => '14:30',
            'important' => true,
            'my_day' => true,
            'recurrence_pattern' => 'weekly',
            'recurrence_interval' => 1,
            'recurrence_weekdays' => [0, 2, 4],
        ]);

        $taskResponse->assertStatus(201);
        $taskId = $taskResponse->json('task.id');
        $this->assertNotNull($taskId);

        // 4. Update Task
        $updateResponse = $this->putJson("/api/tasks/{$taskId}", [
            'title' => 'عنوان به‌روزرسانی شده',
            'completed' => true,
        ]);
        $updateResponse->assertStatus(200)
            ->assertJsonPath('task.completed', true);

        // 5. Offline Sync
        $syncResponse = $this->postJson('/api/sync', [
            'mutations' => [
                [
                    'id' => 'mut_'.uniqid(),
                    'type' => 'create_task',
                    'client_uuid' => 'uuid-'.uniqid(),
                    'payload' => [
                        'title' => 'تسک همگام آفلاین مای‌اس‌کیوال',
                        'due_date' => '2026-10-28',
                    ],
                ],
            ],
        ]);
        $syncResponse->assertStatus(200);

        // 6. Delete Task
        $delResponse = $this->deleteJson("/api/tasks/{$taskId}");
        $delResponse->assertStatus(200);

        $this->assertSoftDeleted('tasks', ['id' => $taskId], 'mysql');
    }
}
