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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'theme')) {
                $table->string('theme', 50)->default('default')->after('password');
            }
            if (! Schema::hasColumn('users', 'backup_settings')) {
                $table->json('backup_settings')->nullable()->after('theme');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('users', 'theme')) {
                $columnsToDrop[] = 'theme';
            }
            if (Schema::hasColumn('users', 'backup_settings')) {
                $columnsToDrop[] = 'backup_settings';
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
