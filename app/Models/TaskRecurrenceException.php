<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskRecurrenceException extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'occurrence_date',
        'action',
        'completed_at',
        'rescheduled_date',
    ];

    protected $casts = [
        'occurrence_date' => 'date:Y-m-d',
        'completed_at' => 'datetime',
        'rescheduled_date' => 'date:Y-m-d',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
