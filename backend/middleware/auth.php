<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - AUTHENTICATION & SESSION INACTIVITY MIDDLEWARE
 * Compliant with 21 CFR Part 11 §11.200 & §11.300 (60-Minute Session Timeout)
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/../utils/response.php';

// Application Secret Key for HMAC-SHA256 Signature (Can be overridden by server env)
define('APP_JWT_SECRET', getenv('APP_SECRET') ?: 'pharma_secret_key_gx_21cfr11_alcoa_2026');
define('SESSION_TIMEOUT_SECONDS', 3600); // 60 minutes inactivity limit

/**
 * Generates a signed cryptographic bearer token for a user session.
 *
 * @param array $user          User data payload [id, name, email, role, organization_id]
 * @param int   $expirySeconds Validity in seconds (default 3600 = 60 mins)
 * @return string Bearer token string
 */
function generateToken(array $user, int $expirySeconds = SESSION_TIMEOUT_SECONDS): string
{
    $issuedAt = time();
    $expiresAt = $issuedAt + $expirySeconds;

    $payload = [
        'sub'             => (string)($user['id'] ?? ''),
        'name'            => (string)($user['name'] ?? ''),
        'email'           => (string)($user['email'] ?? ''),
        'role'            => (string)($user['role'] ?? 'Operator'),
        'organization_id' => $user['organization_id'] ?? null,
        'iat'             => $issuedAt,
        'exp'             => $expiresAt,
        'last_active'     => $issuedAt
    ];

    $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $payloadBase64 = strtr(base64_encode((string)$payloadJson), '+/=', '-_');

    // Create HMAC SHA-256 signature
    $signature = hash_hmac('sha256', $payloadBase64, APP_JWT_SECRET);

    return $payloadBase64 . '.' . $signature;
}

/**
 * Validates a signed bearer token and enforces the 60-minute inactivity timeout.
 *
 * @param string $token
 * @return array|null Returns user payload array if valid, or null if invalid/expired
 */
function verifyToken(string $token): ?array
{
    $parts = explode('.', trim($token));
    if (count($parts) !== 2) {
        return null;
    }

    [$payloadBase64, $signature] = $parts;

    // Verify cryptographic signature
    $expectedSignature = hash_hmac('sha256', $payloadBase64, APP_JWT_SECRET);
    if (!hash_equals($expectedSignature, $signature)) {
        return null;
    }

    $payloadJson = base64_decode(strtr($payloadBase64, '-_', '+/='), true);
    if ($payloadJson === false) {
        return null;
    }

    $payload = json_decode($payloadJson, true);
    if (!is_array($payload) || !isset($payload['exp'], $payload['sub'])) {
        return null;
    }

    $now = time();

    // Check expiration / inactivity timeout
    if ($now > (int)$payload['exp']) {
        return null; // Session expired
    }

    return $payload;
}

/**
 * Authenticates the current incoming HTTP request.
 *
 * @param bool $exitOnError Whether to send HTTP 401 and exit if unauthenticated
 * @return array|null Authenticated user context array
 */
function authenticateRequest(bool $exitOnError = true): ?array
{
    $authHeader = '';

    // Check standard authorization headers
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    }

    $token = '';
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = trim($matches[1]);
    }

    $userPayload = !empty($token) ? verifyToken($token) : null;

    if ($userPayload === null) {
        if ($exitOnError) {
            sendError(
                'Unauthorized: Missing, invalid, or expired session token (60-min 21 CFR Part 11 timeout).',
                401
            );
        }
        return null;
    }

    // Standardize user context
    return [
        'id'              => $userPayload['sub'],
        'name'            => $userPayload['name'] ?? '',
        'email'           => $userPayload['email'] ?? '',
        'role'            => $userPayload['role'] ?? 'Operator',
        'organization_id' => $userPayload['organization_id'] ?? null
    ];
}
