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
        Schema::table('tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('tasks', 'reminder_offset_minutes')) {
                $table->integer('reminder_offset_minutes')->default(0)->after('alarm_triggered');
            }
            if (! Schema::hasColumn('tasks', 'snooze_until')) {
                $table->timestamp('snooze_until')->nullable()->after('reminder_offset_minutes');
            }
            if (! Schema::hasColumn('tasks', 'last_synced_at')) {
                $table->timestamp('last_synced_at')->nullable()->after('revision');
            }
            if (! Schema::hasColumn('tasks', 'sync_status')) {
                $table->string('sync_status', 20)->default('synced')->after('last_synced_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $cols = [];
            foreach (['reminder_offset_minutes', 'snooze_until', 'last_synced_at', 'sync_status'] as $col) {
                if (Schema::hasColumn('tasks', $col)) {
                    $cols[] = $col;
                }
            }
            if (! empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
