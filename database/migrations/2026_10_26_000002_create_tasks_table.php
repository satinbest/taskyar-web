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

        if ($isMySql && Schema::hasTable('users')) {
            DB::statement('ALTER TABLE `users` ENGINE = InnoDB');
        }

        if (! Schema::hasTable('tasks')) {
            Schema::create('tasks', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('title', 500);
                $table->string('period', 20)->default('daily'); // 'daily', 'weekly', 'monthly'
                $table->date('due_date')->nullable()->index();
                $table->string('due_time', 10)->nullable(); // 'HH:MM'
                $table->boolean('alarm_enabled')->default(false);
                $table->boolean('alarm_triggered')->default(false);
                $table->boolean('completed')->default(false)->index();
                $table->timestamp('completed_at')->nullable();
                $table->boolean('important')->default(false)->index();
                $table->boolean('my_day')->default(false);
                $table->text('notes')->nullable();
                $table->unsignedInteger('order_index')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['user_id', 'due_date']);
                $table->index(['user_id', 'completed']);
                $table->index(['user_id', 'important']);
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `tasks` ENGINE = InnoDB');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
