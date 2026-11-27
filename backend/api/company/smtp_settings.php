<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - PLANT SMTP, REAL-TIME ALERTS & EOD REPORT CONTROLLER
 * Supports:
 *   - Outgoing Mail Configuration (Hostinger / Gmail / Enterprise SMTP)
 *   - Real-Time Admin Activity Alerts (Print, Authenticate, Reprint)
 *   - Automated End-of-Day (EOD) Audit Trail Email Dispatcher
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/mail.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/smtp_client.php';
require_once __DIR__ . '/../../utils/audit_logger.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';

$currentUser = authenticateRequest();
$pdo = getDbConnection();

$isSuperAdmin = ($currentUser['role'] ?? '') === 'SuperAdmin';
$targetOrgId = $_GET['organization_id'] ?? ($currentUser['organization_id'] ?? null);

if (!$targetOrgId && !$isSuperAdmin) {
    sendError('Organization context is missing.', 400);
}

if (!$isSuperAdmin && $targetOrgId !== $currentUser['organization_id']) {
    sendError('Access Denied: You cannot modify mail settings for another plant organization.', 403);
}

// ----------------------------------------------------------------------------
// 1. GET: Fetch SMTP Configuration & Notification Alert Preferences
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = :org_id LIMIT 1");
        $stmt->execute([':org_id' => $targetOrgId]);
        $policy = $stmt->fetch(PDO::FETCH_ASSOC);

        // Fetch default admin email if blank
        $adminAlertEmail = trim((string)($policy['admin_alert_email'] ?? ''));
        if (empty($adminAlertEmail)) {
            $stmtAdmin = $pdo->prepare("SELECT email FROM `users` WHERE organization_id = :org_id AND role = 'Admin' ORDER BY id ASC LIMIT 1");
            $stmtAdmin->execute([':org_id' => $targetOrgId]);
            $adminAlertEmail = (string)($stmtAdmin->fetchColumn() ?: '');
        }

        // Return current active SMTP settings (masked password) and notification toggles
        sendSuccess([
            'smtp_host'                 => defined('SMTP_HOST') ? SMTP_HOST : 'smtp.hostinger.com',
            'smtp_port'                 => defined('SMTP_PORT') ? SMTP_PORT : 465,
            'smtp_user'                 => defined('SMTP_USER') ? SMTP_USER : 'info@camel-communication.com',
            'smtp_pass_masked'          => !empty(defined('SMTP_PASS') ? SMTP_PASS : '') ? '••••••••••••' : '',
            'from_address'              => defined('SMTP_FROM_EMAIL') ? SMTP_FROM_EMAIL : 'info@camel-communication.com',
            'use_tls'                   => (defined('SMTP_SECURE') ? SMTP_SECURE : '') === 'ssl' || (defined('SMTP_PORT') && SMTP_PORT == 587),
            'admin_alert_email'         => $adminAlertEmail,
            'notify_on_operator_print'  => !empty($policy['notify_on_operator_print']),
            'notify_on_supervisor_auth' => !empty($policy['notify_on_supervisor_auth']),
            'notify_on_reprint'         => !empty($policy['notify_on_reprint']),
            'notify_all_activities'     => !empty($policy['notify_all_activities']),
            'eod_report_enabled'        => !empty($policy['eod_report_enabled']),
            'eod_report_time'           => $policy['eod_report_time'] ?? '18:00'
        ], 'SMTP and notification settings retrieved.');
    } catch (PDOException $e) {
        sendError('Failed to fetch settings: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 2. POST: Save Settings, Test Mail, or Trigger EOD Report
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
    $action = $_GET['action'] ?? ($input['action'] ?? 'save');

    // Sub-Action: Send Test Email
    if ($action === 'test') {
        $testRecipient = trim((string)($input['test_email'] ?? ''));
        if (empty($testRecipient)) {
            $testRecipient = trim((string)($currentUser['email'] ?? ''));
        }

        if (empty($testRecipient)) {
            sendError('Recipient email address is required for test email.', 400);
        }

        $testSubject = "🧪 PharmLabel Pro - Hostinger SMTP Live Test (" . date('H:i:s') . ")";
        $testBody = '
        <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px;">
          <h2 style="color: #0d3b75; margin-top:0;">Hostinger SMTP Gateway Connected</h2>
          <p style="font-size: 14px; color: #334155;">
            This test email confirms that your outgoing mail server is functioning properly and ready for <strong>21 CFR Part 11 Electronic Signature Notifications</strong>, <strong>Real-time Admin Activity Alerts</strong>, and <strong>Daily EOD Audit Summaries</strong>.
          </p>
          <div style="font-size: 11px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            Timestamp: ' . date('Y-m-d H:i:s T') . ' · PharmLabel Pro v2.0
          </div>
        </div>';

        $res = sendSmtpEmail($testRecipient, 'Plant Administrator', $testSubject, $testBody);

        if ($res['success']) {
            logAuditTrail($pdo, 'SMTP_TEST_EMAIL_SUCCESS', 'Notification', [
                'recipient' => $testRecipient,
                'tested_by' => $currentUser['name'] ?? $currentUser['email']
            ], $targetOrgId, $currentUser);

            sendSuccess(['recipient' => $testRecipient], "Test email successfully delivered to $testRecipient via Hostinger SMTP.");
        } else {
            sendError("Failed to send test email: " . $res['message'], 502);
        }
    }

    // Sub-Action: Send EOD Audit Report Now
    if ($action === 'send_eod') {
        // Forward directly to internal EOD dispatcher logic
        $_GET['organization_id'] = $targetOrgId;
        require __DIR__ . '/../audit/eod_report.php';
        exit;
    }

    // Default: Save SMTP Settings & Notification Preferences
    $adminAlertEmail = trim((string)($input['admin_alert_email'] ?? ''));
    $notifyPrint = !empty($input['notify_on_operator_print']) ? 1 : 0;
    $notifyAuth  = !empty($input['notify_on_supervisor_auth']) ? 1 : 0;
    $notifyReprint = !empty($input['notify_on_reprint']) ? 1 : 0;
    $notifyAll   = !empty($input['notify_all_activities']) ? 1 : 0;
    $eodEnabled  = !empty($input['eod_report_enabled']) ? 1 : 0;
    $eodTime     = trim((string)($input['eod_report_time'] ?? '18:00'));

    try {
        $stmtUpdate = $pdo->prepare("UPDATE `security_policies` SET 
            admin_alert_email = :admin_email,
            notify_on_operator_print = :notify_print,
            notify_on_supervisor_auth = :notify_auth,
            notify_on_reprint = :notify_reprint,
            notify_all_activities = :notify_all,
            eod_report_enabled = :eod_enabled,
            eod_report_time = :eod_time
            WHERE organization_id = :org_id");

        $stmtUpdate->execute([
            ':admin_email'    => $adminAlertEmail,
            ':notify_print'   => $notifyPrint,
            ':notify_auth'    => $notifyAuth,
            ':notify_reprint' => $notifyReprint,
            ':notify_all'     => $notifyAll,
            ':eod_enabled'    => $eodEnabled,
            ':eod_time'       => $eodTime,
            ':org_id'         => $targetOrgId
        ]);

        logAuditTrail($pdo, 'SMTP_NOTIFICATIONS_SAVED', 'Notification', [
            'admin_alert_email' => $adminAlertEmail,
            'notify_print'      => $notifyPrint,
            'notify_auth'       => $notifyAuth,
            'eod_enabled'       => $eodEnabled,
            'saved_by'          => $currentUser['name'] ?? $currentUser['email']
        ], $targetOrgId, $currentUser);

        sendSuccess(null, 'SMTP settings and real-time alert preferences saved.');
    } catch (PDOException $e) {
        sendError('Failed to save settings: ' . $e->getMessage(), 500);
    }
}
