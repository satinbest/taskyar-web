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
        $isMySql = in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb']);

        if ($isMySql) {
            if (Schema::hasTable('users')) {
                DB::statement('ALTER TABLE `users` ENGINE = InnoDB');
            }
            if (Schema::hasTable('tasks')) {
                DB::statement('ALTER TABLE `tasks` ENGINE = InnoDB');
            }
        }

        if (! Schema::hasTable('subtasks')) {
            Schema::create('subtasks', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('task_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('text', 500);
                $table->boolean('is_done')->default(false);
                $table->unsignedInteger('order_index')->default(0);
                $table->timestamps();

                $table->index(['task_id', 'order_index']);
                $table->index(['user_id', 'task_id']);
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `subtasks` ENGINE = InnoDB');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subtasks');
    }
};
