<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - SUPERADMIN SMTP & EMAIL SETTINGS API
 * ============================================================================
 * Endpoints:
 *   GET  /api/superadmin/mail_settings.php -> Get current configuration & logs
 *   POST /api/superadmin/mail_settings.php -> Update settings & run live test
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/mail.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/smtp_client.php';
require_once __DIR__ . '/../../utils/audit_logger.php';

try {
    $envFile = __DIR__ . '/../../.env';
    $logFile = __DIR__ . '/../../logs/sent_emails.log';

    // ------------------------------------------------------------------------
    // 1. GET: Fetch Current Mail Settings & Recent Email Logs
    // ------------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $recentLogs = [];
        if (file_exists($logFile)) {
            $rawLogs = file_get_contents($logFile);
            $entries = explode("================================================================================\n", $rawLogs);
            $parsed = [];
            foreach (array_reverse($entries) as $entry) {
                $entry = trim($entry);
                if (empty($entry)) continue;

                $logItem = [
                    'timestamp' => '',
                    'recipient' => '',
                    'subject'   => '',
                    'temp_pass' => '',
                    'status'    => '',
                    'dispatch'  => ''
                ];

                $lines = explode("\n", $entry);
                foreach ($lines as $line) {
                    if (strpos($line, 'TIMESTAMP : ') === 0) $logItem['timestamp'] = substr($line, 12);
                    if (strpos($line, 'RECIPIENT : ') === 0) $logItem['recipient'] = substr($line, 12);
                    if (strpos($line, 'SUBJECT   : ') === 0) $logItem['subject']   = substr($line, 12);
                    if (strpos($line, 'TEMP_PASS : ') === 0) $logItem['temp_pass'] = '•••••••••••• (Encrypted in Dispatch)';
                    if (strpos($line, 'STATUS    : ') === 0) $logItem['status']    = substr($line, 12);
                    if (strpos($line, 'DISPATCH  : ') === 0) $logItem['dispatch']  = substr($line, 12);
                }

                if (!empty($logItem['recipient'])) {
                    $parsed[] = $logItem;
                }
                if (count($parsed) >= 15) break;
            }
            $recentLogs = $parsed;
        }

        sendSuccess([
            'settings' => [
                'mail_enabled'  => MAIL_ENABLED,
                'host'          => SMTP_HOST,
                'port'          => SMTP_PORT,
                'secure'        => SMTP_SECURE,
                'user'          => SMTP_USER,
                'has_password'  => !empty(SMTP_PASS),
                'from_email'    => SMTP_FROM_EMAIL,
                'from_name'     => SMTP_FROM_NAME,
                'is_configured' => (!empty(SMTP_USER) && !empty(SMTP_PASS))
            ],
            'recent_logs' => $recentLogs
        ], "Mail configuration retrieved successfully.");
    }

    // ------------------------------------------------------------------------
    // 2. POST: Update Mail Settings & Optionally Run Live Dispatch Test
    // ------------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?? [];

        $host      = trim((string)($input['host'] ?? SMTP_HOST));
        $port      = (int)($input['port'] ?? SMTP_PORT);
        $secure    = strtolower(trim((string)($input['secure'] ?? SMTP_SECURE)));
        $user      = trim((string)($input['user'] ?? SMTP_USER));
        $pass      = isset($input['pass']) && trim((string)$input['pass']) !== '' 
                     ? trim((string)$input['pass']) 
                     : SMTP_PASS;
        $fromEmail = trim((string)($input['from_email'] ?? '')) ?: ($user ?: SMTP_FROM_EMAIL);
        $fromName  = trim((string)($input['from_name'] ?? '')) ?: SMTP_FROM_NAME;
        $testTo    = trim((string)($input['test_recipient'] ?? ''));

        if (empty($host)) {
            sendError("SMTP Host cannot be empty.", 422);
        }

        // Write to backend/.env
        $envContent = "# ==============================================================================\n";
        $envContent .= "# PHARMALABEL PRO - LIVE SMTP CREDENTIALS (UPDATED " . date('Y-m-d H:i:s') . ")\n";
        $envContent .= "# ==============================================================================\n";
        $envContent .= "MAIL_ENABLED=true\n";
        $envContent .= "SMTP_HOST=" . $host . "\n";
        $envContent .= "SMTP_PORT=" . $port . "\n";
        $envContent .= "SMTP_SECURE=" . $secure . "\n";
        $envContent .= "SMTP_USER=" . $user . "\n";
        $envContent .= "SMTP_PASS=" . $pass . "\n";
        $envContent .= "SMTP_FROM_EMAIL=" . $fromEmail . "\n";
        $envContent .= "SMTP_FROM_NAME=" . $fromName . "\n";
        $envContent .= "SMTP_DEBUG=false\n";

        file_put_contents($envFile, $envContent, LOCK_EX);

        // Update active process environment
        putenv("SMTP_HOST=$host");
        putenv("SMTP_PORT=$port");
        putenv("SMTP_SECURE=$secure");
        putenv("SMTP_USER=$user");
        putenv("SMTP_PASS=$pass");
        putenv("SMTP_FROM_EMAIL=$fromEmail");
        putenv("SMTP_FROM_NAME=$fromName");
        $_ENV['SMTP_HOST'] = $host;
        $_ENV['SMTP_PORT'] = (string)$port;
        $_ENV['SMTP_SECURE'] = $secure;
        $_ENV['SMTP_USER'] = $user;
        $_ENV['SMTP_PASS'] = $pass;
        $_ENV['SMTP_FROM_EMAIL'] = $fromEmail;
        $_ENV['SMTP_FROM_NAME'] = $fromName;

        // If a test recipient was specified, execute live SMTP socket dispatch test
        $testResult = null;
        if (!empty($testTo)) {
            if (empty($user) || empty($pass)) {
                sendError("Cannot perform live test: SMTP Username and Password must be provided.", 422);
            }

            $testHtml = '
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
              <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 18px 24px; border-radius: 12px; margin: -28px -28px 24px -28px;">
                  <h2 style="margin: 0; font-size: 18px;">PharmLabel PRO · SMTP Connection Verified</h2>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Automated GxP & 21 CFR Part 11 Email Delivery Engine</p>
                </div>
                <p style="font-size: 14px; line-height: 1.6;">
                  Hello,<br><br>
                  This confirms that your authenticated SMTP server (<strong>' . htmlspecialchars($host) . ':' . $port . '</strong>) is successfully configured and active on <strong>PharmLabel Pro</strong>.
                </p>
                <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 12px;">
                  <div><strong>Sender User:</strong> ' . htmlspecialchars($user) . '</div>
                  <div><strong>Encryption:</strong> ' . strtoupper($secure) . '</div>
                  <div><strong>Timestamp:</strong> ' . date('Y-m-d H:i:s T') . '</div>
                  <div><strong>Status:</strong> 250 OK - MESSAGE DELIVERED</div>
                </div>
                <p style="font-size: 12px; color: #64748b;">
                  All newly onboarded pharmaceutical clients will now receive their temporary credentials directly into their inbox.
                </p>
              </div>
            </body>
            </html>';

            $testResult = sendSmtpEmail($testTo, 'Verification Admin', 'PharmLabel PRO - SMTP Verification Test [SUCCESS]', $testHtml, [
                'host'       => $host,
                'port'       => $port,
                'secure'     => $secure,
                'user'       => $user,
                'pass'       => $pass,
                'from_email' => $fromEmail,
                'from_name'  => $fromName
            ]);

            if (!$testResult['success']) {
                sendError("SMTP connection test failed: " . $testResult['message'], 400, [
                    'smtp_log' => $testResult['log'] ?? ''
                ]);
            }
        }

        // Record 21 CFR Part 11 Audit Log
        try {
            $pdo = getDbConnection();
            logAudit(
                $pdo,
                'SYSTEM',
                'SuperAdmin',
                'SuperAdmin',
                'SMTP_SETTINGS_UPDATED',
                "Updated mail configuration for host: $host, user: $user. Live test: " . ($testTo ? "PASSED ($testTo)" : "NOT_REQUESTED"),
                'SYSTEM_SETTINGS',
                'MAIL_CONFIG',
                '127.0.0.1'
            );
        } catch (Throwable $e) {}

        sendSuccess([
            'settings' => [
                'host'          => $host,
                'port'          => $port,
                'secure'        => $secure,
                'user'          => $user,
                'has_password'  => !empty($pass),
                'from_email'    => $fromEmail,
                'from_name'     => $fromName,
                'is_configured' => (!empty($user) && !empty($pass))
            ],
            'test_result' => $testResult
        ], "SMTP settings successfully saved." . ($testTo ? " Live test email sent to $testTo!" : ""));
    }

    sendError("Method not allowed.", 405);

} catch (Throwable $e) {
    sendError("Server error: " . $e->getMessage(), 500);
}
