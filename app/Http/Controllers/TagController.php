<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Tag::class);
        $userId = $request->user()->id;
        $tags = Tag::where('user_id', $userId)
            ->withCount('tasks')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'tags' => $tags,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Tag::class);
        $userId = $request->user()->id;

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('tags')->where('user_id', $userId),
            ],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $tag = Tag::create([
            'user_id' => $userId,
            'name' => trim(ltrim($validated['name'], '#')),
            'color' => $validated['color'] ?? null,
        ]);

        $tag->loadCount('tasks');

        return response()->json([
            'tag' => $tag,
            'message' => 'برچسب با موفقیت ایجاد شد.',
        ], 201);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        Gate::authorize('delete', $tag);

        $tag->delete();

        return response()->json([
            'success' => true,
            'message' => 'برچسب با موفقیت حذف شد.',
        ]);
    }
}
