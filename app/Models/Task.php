<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'period',
        'due_date',
        'due_time',
        'alarm_enabled',
        'alarm_triggered',
        'reminder_offset_minutes',
        'snooze_until',
        'completed',
        'completed_at',
        'important',
        'my_day',
        'notes',
        'order_index',
        'client_uuid',
        'revision',
        'last_synced_at',
        'sync_status',
        'recurrence_pattern',
        'recurrence_interval',
        'recurrence_weekdays',
        'recurrence_month_day',
        'recurrence_end_date',
        'recurrence_count',
        'recurrence_parent_id',
        'recurrence_original_date',
        'is_recurrence_exception',
    ];

    protected $casts = [
        'alarm_enabled' => 'boolean',
        'alarm_triggered' => 'boolean',
        'reminder_offset_minutes' => 'integer',
        'snooze_until' => 'datetime',
        'completed' => 'boolean',
        'important' => 'boolean',
        'my_day' => 'boolean',
        'completed_at' => 'datetime',
        'order_index' => 'integer',
        'revision' => 'integer',
        'last_synced_at' => 'datetime',
        'category_id' => 'integer',
        'recurrence_interval' => 'integer',
        'recurrence_weekdays' => 'array',
        'recurrence_month_day' => 'integer',
        'recurrence_count' => 'integer',
        'is_recurrence_exception' => 'boolean',
    ];

    protected $appends = [
        'dueDate',
        'dueTime',
        'alarmEnabled',
        'alarmTriggered',
        'reminderOffsetMinutes',
        'snoozeUntil',
        'myDay',
        'createdAt',
        'recurrencePattern',
        'recurrenceInterval',
        'recurrenceWeekdays',
        'recurrenceEndDate',
    ];

    protected static function booted(): void
    {
        static::updating(function (Task $task) {
            if (! $task->isDirty('revision')) {
                $task->revision = ($task->revision ?? 0) + 1;
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'task_tag');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class)->orderBy('order_index');
    }

    public function recurrenceParent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'recurrence_parent_id');
    }

    public function recurrenceExceptions(): HasMany
    {
        return $this->hasMany(TaskRecurrenceException::class);
    }

    public function detachedOccurrences(): HasMany
    {
        return $this->hasMany(Task::class, 'recurrence_parent_id');
    }

    // Accessors for camelCase compatibility with original TaskYar
    public function getDueDateAttribute(): ?string
    {
        return $this->attributes['due_date'] ?? null;
    }

    public function getDueTimeAttribute(): ?string
    {
        return $this->attributes['due_time'] ?? null;
    }

    public function getAlarmEnabledAttribute(): bool
    {
        return (bool) ($this->attributes['alarm_enabled'] ?? false);
    }

    public function getAlarmTriggeredAttribute(): bool
    {
        return (bool) ($this->attributes['alarm_triggered'] ?? false);
    }

    public function getMyDayAttribute(): bool
    {
        return (bool) ($this->attributes['my_day'] ?? false);
    }

    public function getCreatedAtAttribute(): string
    {
        return $this->attributes['created_at'] ? date('Y-m-d H:i:s', strtotime($this->attributes['created_at'])) : '';
    }

    public function getRecurrencePatternAttribute(): string
    {
        return $this->attributes['recurrence_pattern'] ?? 'none';
    }

    public function getRecurrenceIntervalAttribute(): int
    {
        return (int) ($this->attributes['recurrence_interval'] ?? 1);
    }

    public function getRecurrenceWeekdaysAttribute(): ?array
    {
        $val = $this->attributes['recurrence_weekdays'] ?? null;
        if (is_string($val)) {
            return json_decode($val, true);
        }

        return $val;
    }

    public function getRecurrenceEndDateAttribute(): ?string
    {
        return $this->attributes['recurrence_end_date'] ?? null;
    }

    public function getReminderOffsetMinutesAttribute(): int
    {
        return (int) ($this->attributes['reminder_offset_minutes'] ?? 0);
    }

    public function getSnoozeUntilAttribute(): ?string
    {
        return $this->attributes['snooze_until'] ?? null;
    }
}
