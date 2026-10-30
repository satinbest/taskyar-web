<?php

namespace App\Policies;

use App\Models\Subtask;
use App\Models\User;

class SubtaskPolicy
{
    /**
     * Determine whether the user can view the subtask.
     */
    public function view(User $user, Subtask $subtask): bool
    {
        return $subtask->user_id === $user->id;
    }

    /**
     * Determine whether the user can update the subtask.
     */
    public function update(User $user, Subtask $subtask): bool
    {
        return $subtask->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the subtask.
     */
    public function delete(User $user, Subtask $subtask): bool
    {
        return $subtask->user_id === $user->id;
    }
}
