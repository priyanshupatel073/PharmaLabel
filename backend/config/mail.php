<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - SMTP & EMAIL CONFIGURATION
 * ============================================================================
 * Supports:
 *   - Gmail SMTP (smtp.gmail.com, Port 465 SSL with 16-char App Password)
 *   - Hostinger SMTP (smtp.hostinger.com, Port 465 SSL)
 *   - Custom Enterprise SMTP / Office 365 / Brevo / SendGrid
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

// 1. Load variables from backend/.env if it exists
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
        putenv("$k=$v");
        $_ENV[$k] = $v;
    }
}

// 2. Direct configuration constants (Reads .env, getenv, $_ENV with smart defaults)
$mailEnabled  = (getenv('MAIL_ENABLED') ?: ($_ENV['MAIL_ENABLED'] ?? 'true')) !== 'false';
$smtpHost     = getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'smtp.gmail.com');
$smtpPort     = (int)(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 465));
$smtpSecure   = strtolower((string)(getenv('SMTP_SECURE') ?: ($_ENV['SMTP_SECURE'] ?? 'ssl')));
$smtpUser     = getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? '');
$smtpPass     = getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? '');
$smtpFrom     = getenv('SMTP_FROM_EMAIL') ?: ($_ENV['SMTP_FROM_EMAIL'] ?? ($smtpUser ?: 'no-reply@camelcomm.in'));
$smtpFromName = getenv('SMTP_FROM_NAME') ?: ($_ENV['SMTP_FROM_NAME'] ?? 'PharmLabel Pro Cloud');
$smtpDebug    = (getenv('SMTP_DEBUG') ?: ($_ENV['SMTP_DEBUG'] ?? 'false')) === 'true';

if (!defined('MAIL_ENABLED'))    define('MAIL_ENABLED', $mailEnabled);
if (!defined('SMTP_HOST'))       define('SMTP_HOST', $smtpHost);
if (!defined('SMTP_PORT'))       define('SMTP_PORT', $smtpPort);
if (!defined('SMTP_SECURE'))     define('SMTP_SECURE', $smtpSecure);
if (!defined('SMTP_USER'))       define('SMTP_USER', $smtpUser);
if (!defined('SMTP_PASS'))       define('SMTP_PASS', $smtpPass);
if (!defined('SMTP_FROM_EMAIL')) define('SMTP_FROM_EMAIL', $smtpFrom);
if (!defined('SMTP_FROM_NAME'))  define('SMTP_FROM_NAME', $smtpFromName);
if (!defined('SMTP_DEBUG'))      define('SMTP_DEBUG', $smtpDebug);
