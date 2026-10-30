<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isMySql = in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb']);

        if ($isMySql) {
            if (Schema::hasTable('tasks')) {
                DB::statement('ALTER TABLE `tasks` ENGINE = InnoDB');
            }
            if (Schema::hasTable('users')) {
                DB::statement('ALTER TABLE `users` ENGINE = InnoDB');
            }
        }

        if (! Schema::hasTable('task_recurrence_exceptions')) {
            Schema::create('task_recurrence_exceptions', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->date('occurrence_date');
                $table->string('action', 20)->default('completed'); // 'completed', 'skipped', 'rescheduled'
                $table->timestamp('completed_at')->nullable();
                $table->date('rescheduled_date')->nullable();
                $table->timestamps();

                $table->unique(['task_id', 'occurrence_date']);
                $table->index(['user_id', 'occurrence_date']);
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `task_recurrence_exceptions` ENGINE = InnoDB');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_recurrence_exceptions');
    }
};
