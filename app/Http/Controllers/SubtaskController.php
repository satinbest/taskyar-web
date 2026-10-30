<?php

namespace App\Http\Controllers;

use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SubtaskController extends Controller
{
    /**
     * Store a subtask for a specific task.
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        // Enforce that user owns the parent task
        Gate::authorize('update', $task);

        $validated = $request->validate([
            'text' => ['required_without:title', 'nullable', 'string', 'max:500'],
            'title' => ['required_without:text', 'nullable', 'string', 'max:500'],
            'client_uuid' => ['nullable', 'string', 'max:36'],
        ]);

        $subtaskText = trim($validated['text'] ?? $validated['title'] ?? '');
        if ($subtaskText === '') {
            return response()->json([
                'message' => 'متن مرحله الزامی است.',
            ], 422);
        }

        $maxOrder = $task->subtasks()->max('order_index') ?? -1;

        $subtask = Subtask::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'text' => $subtaskText,
            'is_done' => false,
            'client_uuid' => $validated['client_uuid'] ?? null,
            'order_index' => $maxOrder + 1,
        ]);

        return response()->json([
            'subtask' => $subtask,
            'message' => 'مرحله جدید اضافه شد.',
        ], 201);
    }

    /**
     * Update a subtask.
     */
    public function update(Request $request, Subtask $subtask): JsonResponse
    {
        Gate::authorize('update', $subtask);

        $validated = $request->validate([
            'text' => ['sometimes', 'required_without:title', 'nullable', 'string', 'max:500'],
            'title' => ['sometimes', 'required_without:text', 'nullable', 'string', 'max:500'],
            'done' => ['sometimes', 'boolean'],
            'is_done' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('text', $validated) || array_key_exists('title', $validated)) {
            $newText = trim($validated['text'] ?? $validated['title'] ?? '');
            if ($newText !== '') {
                $subtask->text = $newText;
            }
        }
        if (array_key_exists('done', $validated) || array_key_exists('is_done', $validated)) {
            $subtask->is_done = (bool) ($validated['done'] ?? $validated['is_done']);
        }

        $subtask->save();

        return response()->json([
            'subtask' => $subtask,
            'message' => 'مرحله به‌روزرسانی شد.',
        ]);
    }

    /**
     * Delete a subtask.
     */
    public function destroy(Subtask $subtask): JsonResponse
    {
        Gate::authorize('delete', $subtask);

        $subtask->delete();

        return response()->json([
            'message' => 'مرحله با موفقیت حذف شد.',
        ]);
    }
}
