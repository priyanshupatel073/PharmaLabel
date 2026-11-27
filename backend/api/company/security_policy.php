<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - 21 CFR PART 11 SECURITY POLICY CONTROLLER
 * Manages: Brute-force threshold, lockout duration, password complexity & session expiry
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
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
    sendError('Access Denied: You cannot modify security policies for another plant organization.', 403);
}

// Ensure default row exists
$stmtInit = $pdo->prepare("INSERT IGNORE INTO `security_policies` 
    (organization_id, max_failed_attempts, lockout_duration_min, min_password_length, 
     require_uppercase, require_numeric, require_special, password_expiry_days, 
     password_reuse_blocked, session_timeout_min, notify_on_operator_print, 
     notify_on_supervisor_auth, notify_on_reprint, notify_all_activities, 
     eod_report_enabled, eod_report_time) 
    VALUES (:org_id, 5, 15, 8, 1, 1, 0, 90, 5, 60, 1, 1, 1, 1, 1, '18:00')");
$stmtInit->execute([':org_id' => $targetOrgId]);

// ----------------------------------------------------------------------------
// 1. GET: Fetch Security Policies
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = :org_id LIMIT 1");
        $stmt->execute([':org_id' => $targetOrgId]);
        $policy = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$policy) {
            $policy = [
                'organization_id'        => $targetOrgId,
                'max_failed_attempts'    => 5,
                'lockout_duration_min'   => 15,
                'min_password_length'    => 8,
                'require_uppercase'      => 1,
                'require_numeric'        => 1,
                'require_special'        => 0,
                'password_expiry_days'   => 90,
                'password_reuse_blocked' => 5,
                'session_timeout_min'    => 60,
                'admin_alert_email'      => ''
            ];
        }

        // Cast booleans & ints for frontend
        $formatted = [
            'max_failed_attempts'    => (int)($policy['max_failed_attempts'] ?? 5),
            'lockout_duration_min'   => (int)($policy['lockout_duration_min'] ?? 15),
            'min_password_length'    => (int)($policy['min_password_length'] ?? 8),
            'require_uppercase'      => (bool)($policy['require_uppercase'] ?? true),
            'require_numeric'        => (bool)($policy['require_numeric'] ?? true),
            'require_special'        => (bool)($policy['require_special'] ?? false),
            'password_expiry_days'   => (int)($policy['password_expiry_days'] ?? 90),
            'password_reuse_blocked' => (int)($policy['password_reuse_blocked'] ?? 5),
            'session_timeout_min'    => (int)($policy['session_timeout_min'] ?? 60),
            'admin_alert_email'      => $policy['admin_alert_email'] ?? ''
        ];

        sendSuccess($formatted, 'Security policy retrieved.');
    } catch (PDOException $e) {
        sendError('Failed to fetch security policy: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 2. POST: Update Security Policies
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];

    $maxFailed = max(3, min(10, (int)($input['max_failed_attempts'] ?? 5)));
    $lockoutMin = max(5, min(120, (int)($input['lockout_duration_min'] ?? 15)));
    $minLen = max(6, min(32, (int)($input['min_password_length'] ?? 8)));
    $reqUpper = !empty($input['require_uppercase']) ? 1 : 0;
    $reqNum = !empty($input['require_numeric']) ? 1 : 0;
    $reqSpec = !empty($input['require_special']) ? 1 : 0;
    $expiryDays = max(0, min(365, (int)($input['password_expiry_days'] ?? 90)));
    $reuseBlocked = max(0, min(24, (int)($input['password_reuse_blocked'] ?? 5)));
    $sessionTimeout = max(5, min(480, (int)($input['session_timeout_min'] ?? 60)));

    try {
        $stmtUpdate = $pdo->prepare("UPDATE `security_policies` SET 
            max_failed_attempts = :max_failed,
            lockout_duration_min = :lockout_min,
            min_password_length = :min_len,
            require_uppercase = :req_upper,
            require_numeric = :req_num,
            require_special = :req_spec,
            password_expiry_days = :expiry_days,
            password_reuse_blocked = :reuse_blocked,
            session_timeout_min = :session_timeout
            WHERE organization_id = :org_id");

        $stmtUpdate->execute([
            ':max_failed'       => $maxFailed,
            ':lockout_min'      => $lockoutMin,
            ':min_len'          => $minLen,
            ':req_upper'        => $reqUpper,
            ':req_num'          => $reqNum,
            ':req_spec'         => $reqSpec,
            ':expiry_days'      => $expiryDays,
            ':reuse_blocked'    => $reuseBlocked,
            ':session_timeout'  => $sessionTimeout,
            ':org_id'           => $targetOrgId
        ]);

        logAuditTrail($pdo, 'SECURITY_POLICY_SAVED', 'Security', [
            'max_failed_attempts'  => $maxFailed,
            'lockout_duration_min' => $lockoutMin,
            'min_password_length'  => $minLen,
            'password_expiry_days' => $expiryDays,
            'session_timeout_min'  => $sessionTimeout,
            'updated_by'           => $currentUser['name'] ?? $currentUser['email']
        ], $targetOrgId, $currentUser);

        sendSuccess(null, 'Security policy settings updated successfully.');
    } catch (PDOException $e) {
        sendError('Failed to save security policy: ' . $e->getMessage(), 500);
    }
}
