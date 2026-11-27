<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - REAL-TIME PLANT ADMIN ACTIVITY NOTIFIER
 * Dispatches instant regulatory notifications to Plant Admin via Hostinger SMTP
 * Enforces US FDA 21 CFR Part 11 Electronic Accountability & Supervisor Oversight
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/../config/mail.php';
require_once __DIR__ . '/smtp_client.php';

/**
 * Dispatches an automated real-time notification email to the Plant Admin.
 *
 * @param PDO    $pdo        Active database connection
 * @param string $orgId      Organization / Plant Tenant ID
 * @param array  $actorUser  User performing the action [name, username, role, email]
 * @param string $actionType Action type: 'OPERATOR_PRINT', 'SUPERVISOR_AUTH', 'REPRINT_DAMAGE', 'GENERAL'
 * @param string $title      Short alert summary title
 * @param array  $details    Key-value pairs of action details (e.g. batch, drums, reason)
 * @return array Result of notification dispatch
 */
function notifyAdminActivity(
    PDO $pdo,
    string $orgId,
    array $actorUser,
    string $actionType,
    string $title,
    array $details = []
): array {
    try {
        // 1. Fetch organization details
        $stmtOrg = $pdo->prepare("SELECT id, name, plant_location FROM `organizations` WHERE id = :org_id LIMIT 1");
        $stmtOrg->execute([':org_id' => $orgId]);
        $org = $stmtOrg->fetch(PDO::FETCH_ASSOC);
        $orgName = $org['name'] ?? $orgId;
        $plantLoc = $org['plant_location'] ?? 'Manufacturing Unit';

        // 2. Fetch security & notification policy
        $stmtSec = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = :org_id LIMIT 1");
        $stmtSec->execute([':org_id' => $orgId]);
        $policy = $stmtSec->fetch(PDO::FETCH_ASSOC);

        // Check if alert type is enabled
        if ($policy) {
            if ($actionType === 'OPERATOR_PRINT' && empty($policy['notify_on_operator_print'])) {
                return ['sent' => false, 'reason' => 'Operator print notifications disabled in policy'];
            }
            if ($actionType === 'SUPERVISOR_AUTH' && empty($policy['notify_on_supervisor_auth'])) {
                return ['sent' => false, 'reason' => 'Supervisor auth notifications disabled in policy'];
            }
            if ($actionType === 'REPRINT_DAMAGE' && empty($policy['notify_on_reprint'])) {
                return ['sent' => false, 'reason' => 'Reprint/damage notifications disabled in policy'];
            }
            if ($actionType === 'GENERAL' && empty($policy['notify_all_activities'])) {
                return ['sent' => false, 'reason' => 'General activity notifications disabled in policy'];
            }
        }

        // 3. Determine Plant Admin recipient email
        $adminEmail = trim((string)($policy['admin_alert_email'] ?? ''));
        if (empty($adminEmail)) {
            $stmtAdmin = $pdo->prepare("SELECT email FROM `users` WHERE organization_id = :org_id AND role = 'Admin' AND status = 'ACTIVE' ORDER BY id ASC LIMIT 1");
            $stmtAdmin->execute([':org_id' => $orgId]);
            $adminUser = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
            $adminEmail = trim((string)($adminUser['email'] ?? ''));
        }

        if (empty($adminEmail)) {
            return ['sent' => false, 'reason' => 'No Plant Admin email found for alerts'];
        }

        // 4. Construct professional pharmaceutical-grade HTML email
        $subject = "🚨 [PharmLabel Alert] {$title} - {$orgName}";
        $timestamp = date('Y-m-d H:i:s T');
        $actorName = $actorUser['name'] ?? ($actorUser['username'] ?? 'Shopfloor Personnel');
        $actorRole = $actorUser['role'] ?? 'Operator';

        $detailRows = '';
        foreach ($details as $k => $v) {
            $detailRows .= '
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 12px; font-weight: 600; color: #475569; font-size: 13px; width: 35%;">' . htmlspecialchars(ucwords(str_replace('_', ' ', (string)$k))) . ':</td>
                <td style="padding: 8px 12px; font-weight: 700; color: #0f172a; font-size: 13px; font-family: monospace;">' . htmlspecialchars((string)$v) . '</td>
            </tr>';
        }

        $htmlContent = '
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>' . htmlspecialchars($subject) . '</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
            .header { background: linear-gradient(135deg, #0d3b75 0%, #1e40af 100%); padding: 24px 24px; color: #ffffff; }
            .badge { display: inline-block; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; background: #38bdf8; color: #0c4a6e; text-transform: uppercase; }
            .content { padding: 24px; }
            .meta-box { background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <span class="badge">Live Plant Security Alert</span>
              <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800;">' . htmlspecialchars($title) . '</h2>
              <div style="font-size: 12px; color: #bfdbfe; margin-top: 4px;">Facility: ' . htmlspecialchars($orgName) . ' (' . htmlspecialchars($plantLoc) . ')</div>
            </div>
            <div class="content">
              <div class="meta-box">
                <strong>Activity Performed By:</strong> ' . htmlspecialchars($actorName) . ' (<span style="color:#0284c7; font-weight:700;">' . htmlspecialchars($actorRole) . '</span>)<br>
                <strong>Timestamp:</strong> ' . htmlspecialchars($timestamp) . '<br>
                <strong>Compliance Standard:</strong> US FDA 21 CFR Part 11 §11.10(e) Electronic Audit
              </div>

              <h4 style="margin: 16px 0 8px 0; color: #0d3b75; font-size: 14px;">Event Details</h4>
              <table class="details-table">
                ' . $detailRows . '
              </table>
            </div>
            <div class="footer">
              This automated notification was dispatched in real-time by PharmLabel Pro 21 CFR Part 11 Audit Daemon.<br>
              Hostinger SMTP Security Gateway · ' . htmlspecialchars($orgName) . '
            </div>
          </div>
        </body>
        </html>';

        // 5. Dispatch via real Hostinger SMTP
        $res = sendSmtpEmail($adminEmail, 'Plant Administrator', $subject, $htmlContent);

        // 6. Log to sent_emails.log
        $logEntry = "================================================================================\n";
        $logEntry .= "TIMESTAMP : " . date('Y-m-d H:i:s T') . "\n";
        $logEntry .= "ALERT     : $actionType\n";
        $logEntry .= "RECIPIENT : $adminEmail (Plant Admin)\n";
        $logEntry .= "SUBJECT   : $subject\n";
        $logEntry .= "STATUS    : " . ($res['success'] ? "DISPATCHED VIA SMTP" : "SMTP FAILED: " . $res['message']) . "\n";
        $logEntry .= "================================================================================\n\n";
        @file_put_contents(__DIR__ . '/../logs/sent_emails.log', $logEntry, FILE_APPEND | LOCK_EX);

        return [
            'sent' => $res['success'],
            'recipient' => $adminEmail,
            'message' => $res['message']
        ];
    } catch (Throwable $e) {
        return ['sent' => false, 'error' => $e->getMessage()];
    }
}
