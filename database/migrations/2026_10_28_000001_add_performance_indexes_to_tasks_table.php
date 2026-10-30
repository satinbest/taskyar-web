<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            Schema::table('tasks', function (Blueprint $table) {
                $table->index(['user_id', 'client_uuid'], 'tasks_user_id_client_uuid_idx');
                $table->index(['user_id', 'due_date', 'due_time'], 'tasks_user_due_date_time_idx');
            });
        } catch (Throwable $e) {
            // Index might already exist
        }

        try {
            Schema::table('subtasks', function (Blueprint $table) {
                $table->index(['user_id', 'client_uuid'], 'subtasks_user_id_client_uuid_idx');
            });
        } catch (Throwable $e) {
            // Index might already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_user_id_client_uuid_idx');
            $table->dropIndex('tasks_user_due_date_time_idx');
        });

        Schema::table('subtasks', function (Blueprint $table) {
            $table->dropIndex('subtasks_user_id_client_uuid_idx');
        });
    }
};
