<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subtask extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'text',
        'is_done',
        'order_index',
        'client_uuid',
        'revision',
    ];

    protected $casts = [
        'is_done' => 'boolean',
        'order_index' => 'integer',
        'revision' => 'integer',
    ];

    protected $appends = [
        'done',
    ];

    protected static function booted(): void
    {
        static::updating(function (Subtask $subtask) {
            if (! $subtask->isDirty('revision')) {
                $subtask->revision = ($subtask->revision ?? 0) + 1;
            }
        });
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Accessor for 'done' compatibility with original TaskYar subtask structure: { text, done }
    public function getDoneAttribute(): bool
    {
        return (bool) ($this->attributes['is_done'] ?? false);
    }
}
