<?php

namespace Tests\Feature;

use Tests\TestCase;

class AssetDependencyTest extends TestCase
{
    /**
     * Audit compiled assets and view templates to ensure zero runtime CDN dependencies.
     */
    public function test_compiled_assets_and_views_have_zero_external_cdn_references(): void
    {
        $forbiddenDomains = [
            'cdn.jsdelivr.net',
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'fonts.bunny.net',
            'cdnjs.cloudflare.com',
            'unpkg.com',
            'cdn.tailwindcss.com',
        ];

        $scanDirectories = [
            public_path('build'),
            public_path('fonts'),
            resource_path('views'),
            resource_path('js'),
            resource_path('css'),
        ];

        $scannedFiles = 0;

        foreach ($scanDirectories as $dir) {
            if (! is_dir($dir)) {
                continue;
            }

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)
            );

            foreach ($iterator as $file) {
                if (! $file->isFile()) {
                    continue;
                }

                $ext = strtolower($file->getExtension());
                if (! in_array($ext, ['js', 'css', 'php', 'html', 'json'])) {
                    continue;
                }

                $content = file_get_contents($file->getPathname());
                $scannedFiles++;

                foreach ($forbiddenDomains as $domain) {
                    $this->assertStringNotContainsString(
                        $domain,
                        $content,
                        "External CDN dependency detected! Found '{$domain}' in file: ".$file->getPathname()
                    );
                }
            }
        }

        $this->assertGreaterThan(5, $scannedFiles, 'Expected to scan compiled build files and templates.');
    }

    /**
     * Verify that Vazirmatn font files are physically present on local filesystem.
     */
    public function test_vazirmatn_font_files_are_self_hosted_locally(): void
    {
        $fontCss = public_path('fonts/vazirmatn/vazirmatn.css');
        $this->assertFileExists($fontCss, 'Self-hosted Vazirmatn CSS file must exist.');

        $expectedFontWeights = [
            'Vazirmatn-Regular.woff2',
            'Vazirmatn-Medium.woff2',
            'Vazirmatn-SemiBold.woff2',
            'Vazirmatn-Bold.woff2',
            'Vazirmatn-ExtraBold.woff2',
        ];

        $fontsDir = public_path('fonts/vazirmatn/fonts/webfonts');
        $this->assertDirectoryExists($fontsDir);

        foreach ($expectedFontWeights as $fontFile) {
            $this->assertFileExists(
                $fontsDir.DIRECTORY_SEPARATOR.$fontFile,
                "Font asset {$fontFile} must be self-hosted locally."
            );
        }
    }
}
