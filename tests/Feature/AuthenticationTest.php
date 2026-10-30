<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_seeded_initial_tasks(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'محمد رضایی',
            'email' => 'mohammad@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', 'mohammad@example.com')
            ->assertJsonPath('user.name', 'محمد رضایی');

        $this->assertAuthenticated();

        $user = User::where('email', 'mohammad@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals(2, $user->tasks()->count());
    }

    public function test_registration_validates_unique_email_and_password_length(): void
    {
        User::factory()->create([
            'email' => 'existing@example.com',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'کاربر جدید',
            'email' => 'existing@example.com',
            'password' => '123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'ali@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'ali@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.id', $user->id);

        $this->assertAuthenticatedAs($user);
    }

    public function test_user_cannot_login_with_invalid_password(): void
    {
        User::factory()->create([
            'email' => 'ali@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'ali@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertGuest();
    }

    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(200);
        $this->assertGuest();
    }

    public function test_unauthenticated_user_cannot_access_tasks(): void
    {
        $response = $this->getJson('/api/tasks');

        $response->assertStatus(401);
    }
}
