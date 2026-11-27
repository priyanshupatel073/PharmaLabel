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

$pdo = getDbConnection();

// Ensure default row exists helper
function ensureDefaultPolicy(PDO $pdo, string $orgId): void {
    $stmtInit = $pdo->prepare("INSERT IGNORE INTO `security_policies` 
        (organization_id, max_failed_attempts, lockout_duration_min, min_password_length, 
         require_uppercase, require_numeric, require_special, password_expiry_days, 
         password_reuse_blocked, session_timeout_min, notify_on_operator_print, 
         notify_on_supervisor_auth, notify_on_reprint, notify_all_activities, 
         eod_report_enabled, eod_report_time) 
        VALUES (:org_id, 10, 5, 8, 1, 1, 0, 90, 5, 60, 1, 1, 1, 1, 1, '18:00')");
    $stmtInit->execute([':org_id' => $orgId]);
}

// ----------------------------------------------------------------------------
// 1. GET: Fetch Security Policies (Publicly readable for plant login, full for admin)
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if token exists
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $tokenUser = null;
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $tokenUser = verifyToken($matches[1]);
    }

    $targetOrgId = $_GET['organization_id'] ?? ($tokenUser['organization_id'] ?? null);

    if (!$targetOrgId) {
        sendError('Organization context is missing.', 400);
    }

    // Access check for authenticated requests
    if ($tokenUser && ($tokenUser['role'] ?? '') !== 'SuperAdmin' && $targetOrgId !== ($tokenUser['organization_id'] ?? '')) {
        sendError('Access Denied: You cannot view security policies for another organization.', 403);
    }

    try {
        ensureDefaultPolicy($pdo, $targetOrgId);

        $stmt = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = :org_id LIMIT 1");
        $stmt->execute([':org_id' => $targetOrgId]);
        $policy = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$policy) {
            $policy = [
                'organization_id'        => $targetOrgId,
                'max_failed_attempts'    => 10,
                'lockout_duration_min'   => 5,
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

        $formatted = [
            'organization_id'        => $targetOrgId,
            'max_failed_attempts'    => (int)($policy['max_failed_attempts'] ?? 10),
            'lockout_duration_min'   => (int)($policy['lockout_duration_min'] ?? 5),
            'min_password_length'    => (int)($policy['min_password_length'] ?? 8),
            'require_uppercase'      => (bool)($policy['require_uppercase'] ?? true),
            'require_numeric'        => (bool)($policy['require_numeric'] ?? true),
            'require_special'        => (bool)($policy['require_special'] ?? false),
            'password_expiry_days'   => (int)($policy['password_expiry_days'] ?? 90),
            'password_reuse_blocked' => (int)($policy['password_reuse_blocked'] ?? 5),
            'session_timeout_min'    => (int)($policy['session_timeout_min'] ?? 60),
            'admin_alert_email'      => $tokenUser ? ($policy['admin_alert_email'] ?? '') : ''
        ];

        sendSuccess($formatted, 'Security policy retrieved.');
    } catch (PDOException $e) {
        sendError('Failed to fetch security policy: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 2. POST: Update Security Policies (Strictly Authenticated)
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $currentUser = authenticateRequest();

    $isSuperAdmin = ($currentUser['role'] ?? '') === 'SuperAdmin';
    $targetOrgId = $_GET['organization_id'] ?? ($currentUser['organization_id'] ?? null);

    if (!$targetOrgId && !$isSuperAdmin) {
        sendError('Organization context is missing.', 400);
    }

    if (!$isSuperAdmin && $targetOrgId !== $currentUser['organization_id']) {
        sendError('Access Denied: You cannot modify security policies for another plant organization.', 403);
    }

    if (!$isSuperAdmin && ($currentUser['role'] ?? '') !== 'Admin') {
        sendError('Access Denied: Only Plant Admin can configure security policies.', 403);
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];

    $maxFailed = max(3, min(20, (int)($input['max_failed_attempts'] ?? 10)));
    $lockoutMin = max(1, min(1440, (int)($input['lockout_duration_min'] ?? 5)));
    $minLen = max(6, min(32, (int)($input['min_password_length'] ?? 8)));
    $reqUpper = !empty($input['require_uppercase']) ? 1 : 0;
    $reqNum = !empty($input['require_numeric']) ? 1 : 0;
    $reqSpec = !empty($input['require_special']) ? 1 : 0;
    $expiryDays = max(0, min(365, (int)($input['password_expiry_days'] ?? 90)));
    $reuseBlocked = max(0, min(24, (int)($input['password_reuse_blocked'] ?? 5)));
    $sessionTimeout = max(5, min(480, (int)($input['session_timeout_min'] ?? 60)));

    try {
        ensureDefaultPolicy($pdo, $targetOrgId);

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

        $formatted = [
            'organization_id'        => $targetOrgId,
            'max_failed_attempts'    => $maxFailed,
            'lockout_duration_min'   => $lockoutMin,
            'min_password_length'    => $minLen,
            'require_uppercase'      => (bool)$reqUpper,
            'require_numeric'        => (bool)$reqNum,
            'require_special'        => (bool)$reqSpec,
            'password_expiry_days'   => $expiryDays,
            'password_reuse_blocked' => $reuseBlocked,
            'session_timeout_min'    => $sessionTimeout
        ];

        logAuditTrail($pdo, 'SECURITY_POLICY_SAVED', 'Security', [
            'max_failed_attempts'    => $maxFailed,
            'lockout_duration_min'   => $lockoutMin,
            'min_password_length'    => $minLen,
            'require_uppercase'      => $reqUpper ? 'TRUE' : 'FALSE',
            'require_numeric'        => $reqNum ? 'TRUE' : 'FALSE',
            'require_special'        => $reqSpec ? 'TRUE' : 'FALSE',
            'password_expiry_days'   => $expiryDays,
            'password_reuse_blocked' => $reuseBlocked,
            'session_timeout_min'    => $sessionTimeout,
            'updated_by'             => $currentUser['name'] ?? $currentUser['email']
        ], $targetOrgId, $currentUser);

        sendSuccess($formatted, '21 CFR Part 11 security policy settings updated successfully.');
    } catch (PDOException $e) {
        sendError('Failed to save security policy: ' . $e->getMessage(), 500);
    }
}
