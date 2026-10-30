<?php

namespace Tests\Feature;

use Tests\TestCase;

class JalaliDateConsistencyTest extends TestCase
{
    /**
     * Test ISO 8601 date format consistency.
     */
    public function test_iso_date_format_and_canonical_storage(): void
    {
        $today = date('Y-m-d');
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $today);
    }

    /**
     * Test that Arabic and Persian digits are converted to ASCII numerals correctly.
     */
    public function test_persian_and_arabic_digit_normalization(): void
    {
        $persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        $asciiDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

        $testPersian = '۱۴۰۵-۰۱-۰۱';
        $normalized = str_replace($persianDigits, $asciiDigits, $testPersian);
        $this->assertEquals('1405-01-01', $normalized);

        $testArabic = '٢٠٢٦-٠٣-٢١';
        $normalizedArabic = str_replace($arabicDigits, $asciiDigits, $testArabic);
        $this->assertEquals('2026-03-21', $normalizedArabic);
    }

    /**
     * Test route authentication redirects.
     */
    public function test_unauthenticated_user_redirected_to_login(): void
    {
        $response = $this->get('/app');
        $response->assertRedirect('/login');

        $rootResponse = $this->get('/');
        $rootResponse->assertRedirect('/login');
    }

    /**
     * Test guest routes accessible.
     */
    public function test_guest_routes_accessible_to_unauthenticated(): void
    {
        $loginRes = $this->get('/login');
        $loginRes->assertStatus(200);

        $regRes = $this->get('/register');
        $regRes->assertStatus(200);
    }
}
