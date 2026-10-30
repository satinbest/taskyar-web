<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Category::class);
        $userId = $request->user()->id;
        $categories = Category::where('user_id', $userId)
            ->withCount('tasks')
            ->orderBy('order_index', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function show(Category $category): JsonResponse
    {
        Gate::authorize('view', $category);

        return response()->json([
            'category' => $category->loadCount('tasks'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Category::class);
        $userId = $request->user()->id;

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categories')->where('user_id', $userId),
            ],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:50'],
            'order_index' => ['nullable', 'integer'],
        ]);

        $category = Category::create([
            'user_id' => $userId,
            'name' => trim($validated['name']),
            'color' => $validated['color'] ?? '#6D28D9',
            'icon' => $validated['icon'] ?? null,
            'order_index' => $validated['order_index'] ?? 0,
        ]);

        $category->loadCount('tasks');

        return response()->json([
            'category' => $category,
            'message' => 'دسته‌بندی با موفقیت ایجاد شد.',
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        Gate::authorize('update', $category);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('categories')->where('user_id', $request->user()->id)->ignore($category->id),
            ],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:50'],
            'order_index' => ['nullable', 'integer'],
        ]);

        $category->update($validated);
        $category->loadCount('tasks');

        return response()->json([
            'category' => $category,
            'message' => 'دسته‌بندی با موفقیت به‌روزرسانی شد.',
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        Gate::authorize('delete', $category);

        // Safe deletion: Category is deleted, but tasks have category_id set to null via foreign key nullOnDelete
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'دسته‌بندی با موفقیت حذف شد و وظایف آن حفظ شدند.',
        ]);
    }
}
