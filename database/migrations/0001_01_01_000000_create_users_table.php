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

        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->id();
                $table->string('name');
                $table->string('email', 191)->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `users` ENGINE = InnoDB');
        }

        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->string('email', 191)->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `password_reset_tokens` ENGINE = InnoDB');
        }

        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->string('id', 191)->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        } elseif ($isMySql) {
            DB::statement('ALTER TABLE `sessions` ENGINE = InnoDB');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
