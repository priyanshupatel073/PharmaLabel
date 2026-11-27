<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - AUTOMATED END-OF-DAY (EOD) GxP AUDIT REPORT DISPATCHER
 * Generates and emails daily 21 CFR Part 11 summary report to Plant Admin
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

$user = authenticateRequest(false);
$pdo = getDbConnection();

$orgId = $_GET['organization_id'] ?? ($user['organization_id'] ?? null);

if (!$orgId) {
    sendError('Organization ID is required to generate EOD Audit Report.', 400);
}

try {
    // 1. Fetch organization details
    $stmtOrg = $pdo->prepare("SELECT * FROM `organizations` WHERE id = :org_id LIMIT 1");
    $stmtOrg->execute([':org_id' => $orgId]);
    $org = $stmtOrg->fetch(PDO::FETCH_ASSOC);

    if (!$org) {
        sendError("Organization '$orgId' not found.", 404);
    }

    $orgName = $org['name'] ?? $orgId;
    $plantLoc = $org['plant_location'] ?? 'Plant Site';

    // 2. Fetch security & alert policy
    $stmtSec = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = :org_id LIMIT 1");
    $stmtSec->execute([':org_id' => $orgId]);
    $policy = $stmtSec->fetch(PDO::FETCH_ASSOC);

    $adminEmail = trim((string)($policy['admin_alert_email'] ?? ''));
    if (empty($adminEmail)) {
        $stmtAdmin = $pdo->prepare("SELECT email FROM `users` WHERE organization_id = :org_id AND role = 'Admin' ORDER BY id ASC LIMIT 1");
        $stmtAdmin->execute([':org_id' => $orgId]);
        $adminUser = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
        $adminEmail = trim((string)($adminUser['email'] ?? ''));
    }

    if (empty($adminEmail)) {
        sendError("No active administrator email registered for organization '$orgName'.", 400);
    }

    // 3. Query today's audit records for this organization
    $todayStart = date('Y-m-d 00:00:00');
    $todayEnd   = date('Y-m-d 23:59:59');

    $stmtLogs = $pdo->prepare("SELECT * FROM `audit_logs` 
        WHERE (organization_id = :org_id OR organization_id IS NULL) 
        AND timestamp BETWEEN :today_start AND :today_end 
        ORDER BY timestamp DESC LIMIT 50");
    $stmtLogs->execute([
        ':org_id'      => $orgId,
        ':today_start' => $todayStart,
        ':today_end'   => $todayEnd
    ]);
    $logs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

    $totalEvents = count($logs);
    $loginCount = 0;
    $printCount = 0;
    $batchCount = 0;
    $reprintCount = 0;

    $logRowsHtml = '';
    foreach ($logs as $l) {
        $action = (string)($l['action'] ?? '');
        if (str_contains($action, 'LOGIN')) $loginCount++;
        if (str_contains($action, 'PRINT')) $printCount++;
        if (str_contains($action, 'BATCH')) $batchCount++;
        if (str_contains($action, 'REPRINT') || str_contains($action, 'DAMAGE')) $reprintCount++;

        $logRowsHtml .= '
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
            <td style="padding: 8px 10px; color: #64748b; font-family: monospace;">' . htmlspecialchars((string)($l['timestamp'] ?? '')) . '</td>
            <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">' . htmlspecialchars((string)($l['user_name'] ?? 'System')) . ' <span style="font-size:10px; color:#64748b;">(' . htmlspecialchars((string)($l['user_role'] ?? '')) . ')</span></td>
            <td style="padding: 8px 10px; color: #2563eb; font-weight: 600;">' . htmlspecialchars($action) . '</td>
            <td style="padding: 8px 10px; color: #334155;">' . htmlspecialchars(substr((string)($l['reason'] ?? $l['details'] ?? 'GxP Action'), 0, 80)) . '</td>
        </tr>';
    }

    if (empty($logRowsHtml)) {
        $logRowsHtml = '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">No audit events recorded for today yet.</td></tr>';
    }

    // 4. Construct EOD Report HTML Email
    $reportDate = date('d-M-Y');
    $subject = "📊 [EOD GxP Report] Daily Audit Summary for {$orgName} - {$reportDate}";

    $htmlContent = '
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>' . htmlspecialchars($subject) . '</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #091e42 0%, #0d3b75 100%); padding: 28px 24px; color: #ffffff; }
        .badge { display: inline-block; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; background: #38bdf8; color: #082f49; text-transform: uppercase; }
        .content { padding: 24px; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
        .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 10px; text-align: center; }
        .metric-val { font-size: 20px; font-weight: 800; color: #0284c7; }
        .metric-lbl { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px; text-transform: uppercase; }
        .table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; font-weight: 700; color: #475569; text-align: left; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">FDA 21 CFR Part 11 Electronic Audit Summary</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800;">End of Day (EOD) Audit Trail Report</h2>
          <div style="font-size: 13px; color: #93c5fd; margin-top: 4px;">' . htmlspecialchars($orgName) . ' · ' . htmlspecialchars($plantLoc) . ' · Date: ' . htmlspecialchars($reportDate) . '</div>
        </div>
        <div class="content">
          <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-top: 0;">
            This automated daily report summarizes all shopfloor operational, authentication, and serialization activities performed today at your manufacturing facility.
          </p>

          <table style="width:100%; border-collapse: separate; border-spacing: 8px 0; margin: 18px 0;">
            <tr>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
                <div style="font-size:22px; font-weight:800; color:#0284c7;">' . $totalEvents . '</div>
                <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Total Events</div>
              </td>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
                <div style="font-size:22px; font-weight:800; color:#10b981;">' . $printCount . '</div>
                <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Print Jobs</div>
              </td>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
                <div style="font-size:22px; font-weight:800; color:#8b5cf6;">' . $batchCount . '</div>
                <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Batch Actions</div>
              </td>
              <td style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
                <div style="font-size:22px; font-weight:800; color:#f59e0b;">' . $reprintCount . '</div>
                <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Reprints/Damages</div>
              </td>
            </tr>
          </table>

          <h3 style="font-size: 14px; font-weight: 800; color: #0d3b75; margin: 20px 0 8px 0;">Recent GxP Audit Log Entries</h3>
          <table class="table">
            <thead>
              <tr>
                <th class="th">Time</th>
                <th class="th">User / Role</th>
                <th class="th">Action</th>
                <th class="th">Details</th>
              </tr>
            </thead>
            <tbody>
              ' . $logRowsHtml . '
            </tbody>
          </table>
        </div>
        <div class="footer">
          Generated automatically by PharmLabel Pro 21 CFR Part 11 Audit Engine.<br>
          Hostinger SMTP Integration · Confidential Pharmaceutical Record
        </div>
      </div>
    </body>
    </html>';

    // 5. Send Email via Hostinger SMTP
    $smtpRes = sendSmtpEmail($adminEmail, 'Plant Administrator', $subject, $htmlContent);

    // 6. Log report dispatch in audit logs
    logAuditTrail($pdo, 'EOD_AUDIT_REPORT_DISPATCHED', 'Regulatory', [
        'recipient'    => $adminEmail,
        'events_count' => $totalEvents,
        'smtp_status'  => $smtpRes['success'] ? 'SUCCESS' : 'FAILED',
        'details'      => $smtpRes['message']
    ], $orgId, $user);

    sendSuccess([
        'dispatched'    => $smtpRes['success'],
        'recipient'     => $adminEmail,
        'total_events'  => $totalEvents,
        'report_date'   => $reportDate,
        'smtp_message'  => $smtpRes['message']
    ], $smtpRes['success'] ? "EOD Audit Report successfully dispatched to $adminEmail." : "SMTP dispatch status: " . $smtpRes['message']);

} catch (Throwable $e) {
    sendError('Failed to generate or dispatch EOD report: ' . $e->getMessage(), 500);
}
