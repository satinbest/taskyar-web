<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Enforce 191 char default string length for MySQL/MariaDB utf8mb4 index safety (max 764 bytes < 767/1000 byte limits)
        Schema::defaultStringLength(191);
    }
}
