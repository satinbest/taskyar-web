<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * Test the SPA homepage returns HTTP 200 and renders proper self-hosted assets and CSRF tags.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
        $response->assertSee('dir="rtl"', false);
        $response->assertSee('csrf-token', false);
        $response->assertSee('/fonts/vazirmatn/vazirmatn.css', false);
        $response->assertSee('id="app"', false);
        $response->assertDontSee('cdn.jsdelivr.net');
        $response->assertDontSee('fonts.googleapis.com');
    }
}
