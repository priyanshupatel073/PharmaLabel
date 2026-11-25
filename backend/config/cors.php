<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - CORS & HTTP SECURITY HEADERS CONFIGURATION
 * Handles Cross-Origin Resource Sharing & Browser Pre-Flight OPTIONS
 * ============================================================================
 */

declare(strict_types=1);

// Prevent direct browser script execution without bootstrap
if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

/**
 * Configure CORS and security headers for API responses.
 *
 * @return void
 */
function handleCors(): void
{
    // Allowed Origins (Development Vite dev server & production domains)
    $allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://pharmalabel.camelcomm.in'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: $origin");
    } elseif (!empty($origin) && (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false)) {
        // Allow dynamic local development ports
        header("Access-Control-Allow-Origin: $origin");
    } else {
        // Fallback for direct or same-origin requests
        header('Access-Control-Allow-Origin: *');
    }

    // Standard CORS and Security Headers
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Organization-ID, X-21CFR11-Reason, X-User-Role');

    // Security & Data Integrity Headers
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Content-Type: application/json; charset=UTF-8');

    // Handle Browser Pre-flight OPTIONS Request Immediately
    if (isset($_SERVER['REQUEST_METHOD']) && strtoupper($_SERVER['REQUEST_METHOD']) === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}

// Automatically invoke CORS handler when included in API endpoints
if (php_sapi_name() !== 'cli') {
    handleCors();
}
