<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\SyncController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Guest and general auth endpoints with tightened rate-limiting against brute force
Route::prefix('api/auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/theme', [AuthController::class, 'updateTheme'])->middleware('auth');
});

// Authenticated Task, Subtask, Recurrence, Category, Tag, Analytics & Backup endpoints
Route::middleware('auth')->prefix('api')->group(function () {
    Route::post('/sync', [SyncController::class, 'sync']);
    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{task}/subtasks', [SubtaskController::class, 'store']);
    Route::put('subtasks/{subtask}', [SubtaskController::class, 'update']);
    Route::delete('subtasks/{subtask}', [SubtaskController::class, 'destroy']);

    // Recurrence occurrence actions (Both parameterized and body-based aliases)
    Route::post('tasks/{task}/occurrences/{date}/toggle-complete', [TaskController::class, 'toggleOccurrenceComplete']);
    Route::post('tasks/{task}/occurrences/{date}/skip', [TaskController::class, 'skipOccurrence']);
    Route::post('tasks/{task}/occurrences/{date}/edit-this', [TaskController::class, 'editThisOccurrence']);
    Route::post('tasks/{task}/occurrences/{date}/edit-future', [TaskController::class, 'editFutureOccurrences']);

    Route::post('tasks/{task}/recurrence/complete', [TaskController::class, 'toggleOccurrenceComplete']);
    Route::post('tasks/{task}/recurrence/skip', [TaskController::class, 'skipOccurrence']);
    Route::post('tasks/{task}/recurrence/edit-this', [TaskController::class, 'editThisOccurrence']);
    Route::post('tasks/{task}/recurrence/edit-future', [TaskController::class, 'editFutureOccurrences']);

    // Categories and Tags
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('tags', TagController::class)->only(['index', 'store', 'destroy']);

    // Analytics Dashboard
    Route::get('analytics', [AnalyticsController::class, 'index']);

    // Dedicated Atomic Backup Endpoints
    Route::get('/backup/export', [BackupController::class, 'export']);
    Route::post('/backup/import', [BackupController::class, 'import']);
});

// Root route: server-side authoritative redirect based on session auth
Route::get('/', function () {
    return Auth::check() ? redirect('/app') : redirect('/login');
});

// Guest Auth Pages (Login & Register): server-side redirect to /app if already authenticated
Route::middleware('guest')->group(function () {
    Route::get('/login', function () {
        return view('app');
    })->name('login');

    Route::get('/register', function () {
        return view('app');
    });
});

// Authenticated Workspace Routes: server-side redirect to /login if unauthenticated
Route::middleware('auth')->group(function () {
    Route::get('/app/{any?}', function () {
        return view('app');
    })->where('any', '.*');
});

// Static PWA icon endpoints (serving from public/pwa-icons or public/icons)
Route::get('/pwa-icons/{file}', function ($file) {
    $path = public_path('pwa-icons/'.$file);
    if (! file_exists($path)) {
        $path = public_path('icons/'.$file);
    }
    if (file_exists($path)) {
        $mime = str_ends_with($file, '.svg') ? 'image/svg+xml' : (str_ends_with($file, '.png') ? 'image/png' : 'application/octet-stream');

        return response()->file($path, ['Content-Type' => $mime, 'Cache-Control' => 'public, max-age=604800']);
    }
    abort(404);
})->where('file', '.*');

Route::get('/icons/{file}', function ($file) {
    $path = public_path('pwa-icons/'.$file);
    if (! file_exists($path)) {
        $path = public_path('icons/'.$file);
    }
    if (file_exists($path)) {
        $mime = str_ends_with($file, '.svg') ? 'image/svg+xml' : (str_ends_with($file, '.png') ? 'image/png' : 'application/octet-stream');

        return response()->file($path, ['Content-Type' => $mime, 'Cache-Control' => 'public, max-age=604800']);
    }
    abort(404);
})->where('file', '.*');

// Catch-all fallback
Route::fallback(function () {
    return Auth::check() ? redirect('/app') : redirect('/login');
});
