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

        if (! Schema::hasTable('tags')) {
            Schema::create('tags', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name', 50);
                $table->string('color', 30)->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'name']);
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `tags` ENGINE = InnoDB');
        }

        if ($isMySql) {
            if (Schema::hasTable('tasks')) {
                DB::statement('ALTER TABLE `tasks` ENGINE = InnoDB');
            }
            if (Schema::hasTable('tags')) {
                DB::statement('ALTER TABLE `tags` ENGINE = InnoDB');
            }
        }

        if (! Schema::hasTable('task_tag')) {
            Schema::create('task_tag', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->foreignId('task_id')->constrained()->cascadeOnDelete();
                $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
                $table->primary(['task_id', 'tag_id']);
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `task_tag` ENGINE = InnoDB');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_tag');
        Schema::dropIfExists('tags');
    }
};
