<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - 21 CFR PART 11 COMPLIANT PASSWORD CHANGE API
 * ============================================================================
 * Handles:
 *   1. Mandatory First-Login Temporary Password Change for New Tenants
 *   2. Ongoing voluntary user password changes per 21 CFR Part 11 §11.200
 *   3. Dynamic Security Policy Enforcement (Complexity, Expiry, History Reuse)
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/audit_logger.php';
require_once __DIR__ . '/../../middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', 405);
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    sendError('Malformed JSON payload received.', 400);
}

$email = trim((string)($input['email'] ?? ''));
$userId = trim((string)($input['user_id'] ?? ''));
$currentPassword = (string)($input['current_password'] ?? '');
$newPassword = (string)($input['new_password'] ?? '');
$confirmPassword = (string)($input['confirm_password'] ?? '');

// Try reading authenticated user from Bearer token if available
$tokenUser = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $tokenUser = verifyToken($matches[1]);
}

if (empty($email) && empty($userId) && $tokenUser) {
    $userId = (string)($tokenUser['sub'] ?? '');
    $email = (string)($tokenUser['email'] ?? '');
}

// Basic input presence checks
$validationErrors = [];
if (empty($email) && empty($userId)) {
    $validationErrors['user'] = 'User identification (email or ID) is required.';
}
if (empty($newPassword)) {
    $validationErrors['new_password'] = 'New permanent password is required.';
}
if ($newPassword !== $confirmPassword) {
    $validationErrors['confirm_password'] = 'New password and confirmation password do not match.';
}

if (!empty($validationErrors)) {
    sendValidationError($validationErrors, 'Password validation failed.');
}

try {
    $pdo = getDbConnection();

    // Look up user first to retrieve organization security policy
    if (!empty($userId)) {
        $stmt = $pdo->prepare("SELECT * FROM `users` WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $userId]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM `users` WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $stmt->execute([':email' => $email]);
    }

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendError('User account not found.', 404);
    }

    // Retrieve organization security policy
    $policy = [
        'min_password_length'    => 8,
        'require_uppercase'      => 1,
        'require_numeric'        => 1,
        'require_special'        => 0,
        'password_reuse_blocked' => 5,
        'session_timeout_min'    => 60
    ];

    if (!empty($user['organization_id'])) {
        $stmtSec = $pdo->prepare("SELECT min_password_length, require_uppercase, require_numeric, require_special, password_reuse_blocked, session_timeout_min FROM `security_policies` WHERE organization_id = :org_id LIMIT 1");
        $stmtSec->execute([':org_id' => $user['organization_id']]);
        $secRow = $stmtSec->fetch(PDO::FETCH_ASSOC);
        if ($secRow) {
            $policy = array_merge($policy, $secRow);
        }
    }

    // Dynamic 21 CFR Part 11 Password Complexity Enforcement
    $minLen = (int)($policy['min_password_length'] ?? 8);
    $reqUpper = !empty($policy['require_uppercase']);
    $reqNum = !empty($policy['require_numeric']);
    $reqSpec = !empty($policy['require_special']);

    if (strlen($newPassword) < $minLen) {
        $validationErrors['complexity'] = "Password must be at least {$minLen} characters in length.";
    } elseif ($reqUpper && !preg_match('/[A-Z]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one uppercase letter (A-Z).';
    } elseif (!preg_match('/[a-z]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one lowercase letter (a-z).';
    } elseif ($reqNum && !preg_match('/[0-9]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one numeric digit (0-9).';
    } elseif ($reqSpec && !preg_match('/[!@#$%^&*()\-_=+\[\]{};:,.<>?]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one special character (!@#$%^&*...).';
    }

    if (!empty($validationErrors)) {
        sendValidationError($validationErrors, 'Password validation failed against company security policy.');
    }

    // Verify current password if provided, or verify authenticated session context
    if (!empty($currentPassword)) {
        if (!password_verify($currentPassword, $user['password_hash'])) {
            sendError('Current password entered is incorrect.', 401);
        }
    } else {
        $isAuthUser = $tokenUser && (
            ($tokenUser['sub'] ?? '') === $user['id'] ||
            strtolower((string)($tokenUser['email'] ?? '')) === strtolower((string)$user['email'])
        );
        $isFirstLogin = empty($user['password_changed_at']);

        if (!$isAuthUser && !$isFirstLogin) {
            sendError('Authentication required or current password must be provided.', 401);
        }
    }

    // Ensure new password is not identical to current password
    if (password_verify($newPassword, $user['password_hash'])) {
        sendError('New permanent password cannot be identical to your current password.', 422);
    }

    // Password Reuse Prevention (Check last N blocked passwords)
    $reuseBlocked = (int)($policy['password_reuse_blocked'] ?? 5);
    if ($reuseBlocked > 0) {
        $stmtHist = $pdo->prepare("SELECT password_hash FROM `password_history` WHERE user_id = :uid ORDER BY created_at DESC LIMIT :limit");
        $stmtHist->bindValue(':uid', (string)$user['id'], PDO::PARAM_STR);
        $stmtHist->bindValue(':limit', $reuseBlocked, PDO::PARAM_INT);
        $stmtHist->execute();
        $pastHashes = $stmtHist->fetchAll(PDO::FETCH_COLUMN);

        foreach ($pastHashes as $oldHash) {
            if (password_verify($newPassword, $oldHash)) {
                sendError("Password Reuse Prevention: You cannot reuse any of your last {$reuseBlocked} passwords per company security policy.", 422);
            }
        }
    }

    // Hash new password using secure bcrypt
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
    $now = date('Y-m-d H:i:s');

    // Update user record
    $updateStmt = $pdo->prepare("
        UPDATE `users` 
        SET password_hash = :hash,
            password_changed_at = :changed_at,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = :updated_at
        WHERE id = :id
    ");

    $updateStmt->execute([
        ':hash'       => $newHash,
        ':changed_at' => $now,
        ':updated_at' => $now,
        ':id'         => $user['id']
    ]);

    // Store in password history for reuse prevention
    $histStmt = $pdo->prepare("INSERT INTO `password_history` (user_id, password_hash) VALUES (:uid, :hash)");
    $histStmt->execute([
        ':uid'  => (string)$user['id'],
        ':hash' => $newHash
    ]);

    // Mandatory 21 CFR Part 11 Audit Trail Record
    logAuditTrail($pdo, 'PASSWORD_CHANGED', 'Security & Access Control', [
        'old_value' => 'Previous Password Hash',
        'new_value' => 'Permanent Cryptographic Password Established',
        'reason'    => 'User password update compliant with 21 CFR Part 11 §11.200',
        'outcome'   => 'SUCCESS'
    ], $user['organization_id'] ?? null, $user);

    // Issue updated session token matching policy session timeout
    $sessionTimeoutMin = (int)($policy['session_timeout_min'] ?? 60);
    $newToken = generateToken($user, max(300, $sessionTimeoutMin * 60));

    sendSuccess([
        'token'                => $newToken,
        'must_change_password' => false,
        'user' => [
            'id'                   => $user['id'],
            'name'                 => $user['name'],
            'email'                => $user['email'],
            'role'                 => $user['role'],
            'department'           => $user['department'],
            'organization_id'      => $user['organization_id'],
            'must_change_password' => false
        ]
    ], 'Password updated successfully. Cryptographic session initialized.');

} catch (PDOException $e) {
    error_log('[PharmaLabel Change Password Error] ' . $e->getMessage());
    sendError('Database error processing password change: ' . $e->getMessage(), 500);
}
