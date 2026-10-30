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

        if (! Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->string('key', 191)->primary();
                $table->mediumText('value');
                $table->bigInteger('expiration')->index();
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `cache` ENGINE = InnoDB');
        }

        if (! Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->string('key', 191)->primary();
                $table->string('owner');
                $table->bigInteger('expiration')->index();
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `cache_locks` ENGINE = InnoDB');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
    }
};
