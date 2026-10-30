<?php

namespace App\Http\Controllers;

use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Handle user registration.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'theme' => 'default',
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        // Seed initial sample tasks matching original TaskYar
        $today = date('Y-m-d');
        $task1 = Task::create([
            'user_id' => $user->id,
            'title' => 'بررسی ایمیل‌ها و پیام‌های کاری صبحگاهی',
            'period' => 'daily',
            'due_date' => $today,
            'due_time' => '09:30',
            'alarm_enabled' => true,
            'alarm_triggered' => false,
            'completed' => false,
            'important' => true,
            'my_day' => true,
            'notes' => 'پاسخ به مشتریان اولویت‌دار',
            'order_index' => 1,
        ]);

        Subtask::create([
            'task_id' => $task1->id,
            'user_id' => $user->id,
            'text' => 'بررسی پنل کاربری',
            'is_done' => true,
            'order_index' => 0,
        ]);

        Subtask::create([
            'task_id' => $task1->id,
            'user_id' => $user->id,
            'text' => 'ارسال پیش‌فاکتورها',
            'is_done' => false,
            'order_index' => 1,
        ]);

        Task::create([
            'user_id' => $user->id,
            'title' => 'طراحی رابط کاربری پروژه جدید',
            'period' => 'weekly',
            'due_date' => $today,
            'due_time' => '14:00',
            'alarm_enabled' => false,
            'alarm_triggered' => false,
            'completed' => false,
            'important' => true,
            'my_day' => true,
            'notes' => 'رعایت اصول مینیمالیسم و گوشه‌های گرد',
            'order_index' => 2,
        ]);

        return response()->json([
            'user' => $user->load('tasks.subtasks'),
            'message' => 'ثبت‌نام با موفقیت انجام شد.',
        ], 201);
    }

    /**
     * Handle user login.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt(['email' => strtolower($credentials['email']), 'password' => $credentials['password']], $request->boolean('remember', true))) {
            $request->session()->regenerate();

            return response()->json([
                'user' => Auth::user(),
                'message' => 'ورود با موفقیت انجام شد.',
            ]);
        }

        return response()->json([
            'message' => 'اطلاعات ورود نادرست است.',
            'errors' => [
                'email' => ['ایمیل یا رمز عبور اشتباه است.'],
            ],
        ], 422);
    }

    /**
     * Handle user logout.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'با موفقیت خارج شدید.',
        ]);
    }

    /**
     * Get the authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Update user theme preference.
     */
    public function updateTheme(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'theme' => ['required', 'string', 'in:default,ocean,sunset,emerald,dark'],
        ]);

        $user = $request->user();
        $user->theme = $validated['theme'];
        $user->save();

        return response()->json([
            'theme' => $user->theme,
            'message' => 'تم با موفقیت ذخیره شد.',
        ]);
    }
}
