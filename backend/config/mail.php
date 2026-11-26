<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - SMTP & EMAIL CONFIGURATION
 * ============================================================================
 * Supports:
 *   - Gmail SMTP (smtp.gmail.com, Port 465 SSL or 587 TLS with App Password)
 *   - Hostinger SMTP (smtp.hostinger.com, Port 465 SSL)
 *   - Custom Enterprise SMTP / Office 365 / SendGrid / Brevo
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

// Check for local .env or overrides
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v, " \t\n\r\0\x0B\"'");
        if (!getenv($k)) {
            putenv("$k=$v");
            $_ENV[$k] = $v;
        }
    }
}

// Mail Configuration Settings
define('MAIL_ENABLED', getenv('MAIL_ENABLED') !== 'false');
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 465));
define('SMTP_SECURE', strtolower((string)(getenv('SMTP_SECURE') ?: 'ssl'))); // 'ssl' or 'tls'
define('SMTP_USER', getenv('SMTP_USER') ?: ''); // Sender email e.g. youremail@gmail.com
define('SMTP_PASS', getenv('SMTP_PASS') ?: ''); // 16-character App Password
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: (SMTP_USER ?: 'no-reply@camelcomm.in'));
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'PharmLabel Pro Cloud');
define('SMTP_DEBUG', getenv('SMTP_DEBUG') === 'true');
