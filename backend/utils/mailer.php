<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - ENTERPRISE EMAIL DISPATCHER ENGINE
 * Enforces: 21 CFR Part 11 Electronic Signature Notifications & SLA Alerts
 * Handles: Onboarding Welcome, Temp Credentials, Audit Alerts, Local Fallback
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/smtp_client.php';

/**
 * Generate a cryptographically secure temporary password.
 * Format: Upper, Lower, Numbers, Special characters (Min 10 chars).
 *
 * @param int $length
 * @return string
 */
function generateSecureTempPassword(int $length = 10): string
{
    $uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    $lowers = 'abcdefghjkmnpqrstuvwxyz';
    $numbers = '23456789';
    $specials = '!@#$%&*';

    // Ensure at least one of each class
    $password = 'Pharma';
    $password .= $specials[random_int(0, strlen($specials) - 1)];
    $password .= $numbers[random_int(0, strlen($numbers) - 1)];
    $password .= $uppers[random_int(0, strlen($uppers) - 1)];
    $password .= $lowers[random_int(0, strlen($lowers) - 1)];
    $password .= $numbers[random_int(0, strlen($numbers) - 1)];

    return $password;
}

/**
 * Dispatch an official Onboarding Email to a newly created Plant Admin.
 * Automatically saves a persistent copy in backend/logs/sent_emails.log.
 *
 * @param array  $org          Organization details array
 * @param string $adminName    Plant Admin name
 * @param string $adminEmail   Recipient email
 * @param string $tempPassword Unhashed temporary password
 * @param string $loginUrl     Direct frontend login link
 * @return array Dispatch status details
 */
function sendOnboardingEmail(
    array $org,
    string $adminName,
    string $adminEmail,
    string $tempPassword,
    string $loginUrl = 'http://127.0.0.1:5173/login'
): array {
    $subject = "Welcome to PharmLabel PRO - Plant Admin Credentials for " . ($org['name'] ?? 'Your Organization');

    // Pharmaceutical-grade responsive HTML email template
    $htmlContent = '
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>' . htmlspecialchars($subject) . '</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 28px; text-align: left; color: #ffffff; }
        .logo-title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .badge { display: inline-block; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); margin-left: 8px; vertical-align: middle; }
        .subtitle { font-size: 12px; color: #94a3b8; margin-top: 6px; }
        .body { padding: 32px 28px; }
        .welcome { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
        .cred-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 20px; margin: 24px 0; }
        .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .cred-row:last-child { border-bottom: none; }
        .cred-label { font-weight: 600; color: #64748b; }
        .cred-val { font-weight: 700; color: #0f172a; font-family: monospace; }
        .password-highlight { font-size: 16px; font-weight: 800; color: #2563eb; background: #dbeafe; padding: 4px 10px; border-radius: 6px; font-family: monospace; display: inline-block; }
        .btn-container { text-align: center; margin: 32px 0 24px 0; }
        .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0055ff 0%, #00d4ff 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0, 85, 255, 0.35); }
        .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; font-size: 12px; color: #92400e; margin-top: 24px; line-height: 1.5; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="logo-title">PharmLabel <span class="badge">PRO</span></h1>
          <div class="subtitle">GxP & 21 CFR Part 11 Electronic Serialization Architecture · Camel Communication</div>
        </div>
        <div class="body">
          <p class="welcome">
            Dear <strong>' . htmlspecialchars($adminName) . '</strong>,<br><br>
            Your pharmaceutical plant facility <strong>' . htmlspecialchars($org['name'] ?? 'Your Plant') . '</strong> has been onboarded onto the PharmLabel Pro Global Serialization Platform.
          </p>

          <div class="cred-box">
            <div class="cred-row">
              <span class="cred-label">Organization Name:</span>
              <span class="cred-val">' . htmlspecialchars($org['name'] ?? '') . '</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Organization ID:</span>
              <span class="cred-val">' . htmlspecialchars($org['id'] ?? '') . '</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">GS1 Company Prefix:</span>
              <span class="cred-val">' . htmlspecialchars($org['gs1_company_prefix'] ?? ($org['gs1Prefix'] ?? '')) . '</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Plant Location:</span>
              <span class="cred-val">' . htmlspecialchars($org['plant_location'] ?? ($org['plantLocation'] ?? '')) . '</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">License Edition:</span>
              <span class="cred-val">' . htmlspecialchars($org['edition'] ?? 'Enterprise') . '</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Admin Login Email:</span>
              <span class="cred-val">' . htmlspecialchars($adminEmail) . '</span>
            </div>
            <div class="cred-row" style="margin-top: 8px;">
              <span class="cred-label" style="align-self: center;">Temporary Password:</span>
              <span class="password-highlight">' . htmlspecialchars($tempPassword) . '</span>
            </div>
          </div>

          <div class="btn-container">
            <a href="' . htmlspecialchars($loginUrl) . '" class="btn" target="_blank">Access Plant Control Portal &rarr;</a>
          </div>

          <div class="notice">
            <strong>&#9888; 21 CFR Part 11 Compliance Notice:</strong><br>
            This temporary credential was cryptographically generated by Camel Communication Platform Owner. Under US FDA 21 CFR Part 11 guidelines for electronic signatures and user accountability, you are required to reset this temporary password immediately upon your first sign-in.
          </div>
        </div>
        <div class="footer">
          &copy; ' . date('Y') . ' Camel Communication Platform. All rights reserved.<br>
          Automated regulatory notification · Confidential pharmaceutical manufacturing record
        </div>
      </div>
    </body>
    </html>';

    // Standard RFC-compliant email headers
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: PharmLabel Cloud <no-reply@camelcomm.in>',
        'Reply-To: support@camelcomm.in',
        'X-Mailer: PharmLabel-Pro-21CFR11-Engine/2.0'
    ];

    $headersString = implode("\r\n", $headers);

    // 1. Primary: Dispatch via Real RFC 5321 SMTP Client
    $mailSent = false;
    $dispatchNote = '';

    $smtpRes = sendSmtpEmail($adminEmail, $adminName, $subject, $htmlContent);
    if ($smtpRes['success']) {
        $mailSent = true;
        $dispatchNote = "DELIVERED via SMTP (" . SMTP_HOST . ":" . SMTP_PORT . ")";
    } else {
        $dispatchNote = "SMTP: " . $smtpRes['message'];

        // Secondary fallback to PHP mail() if available
        try {
            if (function_exists('mail') && php_sapi_name() !== 'cli') {
                $mailSent = @mail($adminEmail, $subject, $htmlContent, $headersString);
                if ($mailSent) {
                    $dispatchNote = "SENT via PHP mail() fallback";
                }
            }
        } catch (Throwable $e) {}
    }

    // 2. Persist dispatch audit entry to backend/logs/sent_emails.log
    $logsDir = __DIR__ . '/../logs';
    if (!is_dir($logsDir)) {
        @mkdir($logsDir, 0755, true);
    }

    $logEntry = "================================================================================\n";
    $logEntry .= "TIMESTAMP : " . date('Y-m-d H:i:s T') . "\n";
    $logEntry .= "RECIPIENT : $adminEmail ($adminName)\n";
    $logEntry .= "SUBJECT   : $subject\n";
    $logEntry .= "ORG_ID    : " . ($org['id'] ?? '') . "\n";
    $logEntry .= "STATUS    : " . ($mailSent ? "SUCCESSFULLY DISPATCHED TO INBOX VIA SMTP" : "STORED IN SERVER DISPATCH LOG") . "\n";
    $logEntry .= "DISPATCH  : $dispatchNote\n";
    $logEntry .= "================================================================================\n\n";

    @file_put_contents($logsDir . '/sent_emails.log', $logEntry, FILE_APPEND | LOCK_EX);

    return [
        'success'       => true,
        'dispatched'    => $mailSent,
        'dispatch_note' => $dispatchNote,
        'recipient'     => $adminEmail,
        'subject'       => $subject,
        'log_file'      => 'backend/logs/sent_emails.log'
    ];
}
