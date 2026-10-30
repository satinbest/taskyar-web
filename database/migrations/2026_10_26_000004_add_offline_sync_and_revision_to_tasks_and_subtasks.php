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
            if (! Schema::hasColumn('tasks', 'client_uuid')) {
                $table->string('client_uuid', 36)->nullable()->after('order_index')->index();
            }
            if (! Schema::hasColumn('tasks', 'revision')) {
                $table->unsignedInteger('revision')->default(1)->after('client_uuid');
            }
        });

        Schema::table('subtasks', function (Blueprint $table) {
            if (! Schema::hasColumn('subtasks', 'client_uuid')) {
                $table->string('client_uuid', 36)->nullable()->after('order_index')->index();
            }
            if (! Schema::hasColumn('subtasks', 'revision')) {
                $table->unsignedInteger('revision')->default(1)->after('client_uuid');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            if (Schema::hasColumn('tasks', 'client_uuid')) {
                $table->dropIndex(['client_uuid']);
                $table->dropColumn('client_uuid');
            }
            if (Schema::hasColumn('tasks', 'revision')) {
                $table->dropColumn('revision');
            }
        });

        Schema::table('subtasks', function (Blueprint $table) {
            if (Schema::hasColumn('subtasks', 'client_uuid')) {
                $table->dropIndex(['client_uuid']);
                $table->dropColumn('client_uuid');
            }
            if (Schema::hasColumn('subtasks', 'revision')) {
                $table->dropColumn('revision');
            }
        });
    }
};
