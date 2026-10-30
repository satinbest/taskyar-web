<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isMySql = in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb']);

        if ($isMySql && Schema::hasTable('users')) {
            DB::statement('ALTER TABLE `users` ENGINE = InnoDB');
        }

        if (! Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name', 100);
                $table->string('color', 30)->default('#6D28D9');
                $table->string('icon', 50)->nullable();
                $table->unsignedInteger('order_index')->default(0);
                $table->timestamps();

                $table->unique(['user_id', 'name']);
                $table->index(['user_id', 'order_index']);
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `categories` ENGINE = InnoDB');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
