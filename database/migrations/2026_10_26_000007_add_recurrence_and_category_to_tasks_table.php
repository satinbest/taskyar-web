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
            if (Schema::hasTable('categories')) {
                DB::statement('ALTER TABLE `categories` ENGINE = InnoDB');
            }
        }

        Schema::table('tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('tasks', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('user_id')->constrained('categories')->nullOnDelete();
            }

            // Recurrence configuration
            if (! Schema::hasColumn('tasks', 'recurrence_pattern')) {
                $table->string('recurrence_pattern', 20)->default('none')->after('notes'); // none, daily, weekly, monthly, yearly, custom
            }
            if (! Schema::hasColumn('tasks', 'recurrence_interval')) {
                $table->unsignedInteger('recurrence_interval')->default(1)->after('recurrence_pattern');
            }
            if (! Schema::hasColumn('tasks', 'recurrence_weekdays')) {
                $table->json('recurrence_weekdays')->nullable()->after('recurrence_interval'); // [0,1,2,3,4,5,6] (0=Saturday)
            }
            if (! Schema::hasColumn('tasks', 'recurrence_month_day')) {
                $table->unsignedTinyInteger('recurrence_month_day')->nullable()->after('recurrence_weekdays'); // 1-31 Jalali day
            }
            if (! Schema::hasColumn('tasks', 'recurrence_end_date')) {
                $table->date('recurrence_end_date')->nullable()->after('recurrence_month_day');
            }
            if (! Schema::hasColumn('tasks', 'recurrence_count')) {
                $table->unsignedInteger('recurrence_count')->nullable()->after('recurrence_end_date');
            }

            // Recurrence exceptions / detached instances
            if (! Schema::hasColumn('tasks', 'recurrence_parent_id')) {
                $table->foreignId('recurrence_parent_id')->nullable()->after('recurrence_count')->constrained('tasks')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('tasks', 'recurrence_original_date')) {
                $table->date('recurrence_original_date')->nullable()->after('recurrence_parent_id');
            }
            if (! Schema::hasColumn('tasks', 'is_recurrence_exception')) {
                $table->boolean('is_recurrence_exception')->default(false)->after('recurrence_original_date');
            }
        });

        // Add indexes if columns exist
        try {
            Schema::table('tasks', function (Blueprint $table) {
                $table->index(['user_id', 'category_id']);
                $table->index(['user_id', 'recurrence_pattern']);
            });
        } catch (Throwable $e) {
            // Indexes may already exist if partially applied
        }
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropForeign(['recurrence_parent_id']);
            $table->dropIndex(['user_id', 'category_id']);
            $table->dropIndex(['user_id', 'recurrence_pattern']);

            $table->dropColumn([
                'category_id',
                'recurrence_pattern',
                'recurrence_interval',
                'recurrence_weekdays',
                'recurrence_month_day',
                'recurrence_end_date',
                'recurrence_count',
                'recurrence_parent_id',
                'recurrence_original_date',
                'is_recurrence_exception',
            ]);
        });
    }
};
