<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - 21 CFR PART 11 COMPLIANT PASSWORD CHANGE API
 * ============================================================================
 * Handles:
 *   1. Mandatory First-Login Temporary Password Change for New Tenants
 *   2. Ongoing voluntary user password changes per 21 CFR Part 11 §11.200
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
    $userId = $tokenUser['sub'] ?? '';
    $email = $tokenUser['email'] ?? '';
}

// Validations
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

// 21 CFR Part 11 Password Complexity Enforcement
if (!empty($newPassword)) {
    if (strlen($newPassword) < 8) {
        $validationErrors['complexity'] = 'Password must be at least 8 characters in length.';
    } elseif (!preg_match('/[A-Z]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one uppercase letter (A-Z).';
    } elseif (!preg_match('/[a-z]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one lowercase letter (a-z).';
    } elseif (!preg_match('/[0-9]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one numeric digit (0-9).';
    } elseif (!preg_match('/[!@#$%^&*()\-_=+\[\]{};:,.<>?]/', $newPassword)) {
        $validationErrors['complexity'] = 'Password must contain at least one special character (!@#$%^&*...).';
    }
}

if (!empty($validationErrors)) {
    sendValidationError($validationErrors, 'Password validation failed.');
}

if (!empty($currentPassword) && $currentPassword === $newPassword) {
    sendError('New permanent password cannot be identical to the temporary password.', 422);
}

try {
    $pdo = getDbConnection();

    // Look up user
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

    // Verify current password if provided, or verify authenticated session context
    if (!empty($currentPassword)) {
        if (!password_verify($currentPassword, $user['password_hash'])) {
            sendError('Current password entered is incorrect.', 401);
        }
    } else {
        // When setting permanent password from an active authenticated session without re-entering temporary password:
        $isAuthUser = $tokenUser && (
            ($tokenUser['sub'] ?? '') === $user['id'] ||
            strtolower((string)($tokenUser['email'] ?? '')) === strtolower((string)$user['email'])
        );
        $isFirstLogin = empty($user['password_changed_at']);

        if (!$isAuthUser && !$isFirstLogin) {
            sendError('Authentication required or temporary password must be provided.', 401);
        }
    }

    // Ensure new password is not identical to current temporary password
    if (password_verify($newPassword, $user['password_hash'])) {
        sendError('New permanent password cannot be identical to your temporary password.', 422);
    }

    // Hash new password using bcrypt
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

    // Mandatory 21 CFR Part 11 Audit Trail Record
    logAuditTrail($pdo, 'PASSWORD_CHANGED', 'Security & Access Control', [
        'old_value' => 'Temporary Password / Previous Hash',
        'new_value' => 'Permanent Cryptographic Password Established',
        'reason'    => empty($user['password_changed_at']) 
            ? 'Mandatory first-login temporary password replacement completed.' 
            : 'Voluntary periodic password credential rotation.',
        'outcome'   => 'SUCCESS'
    ], $user['organization_id'], $user);

    // Issue refreshed token
    $refreshedToken = generateToken($user, 3600);

    sendSuccess([
        'token'                => $refreshedToken,
        'must_change_password' => false,
        'password_changed_at'  => $now,
        'user' => [
            'id'                   => $user['id'],
            'name'                 => $user['name'],
            'email'                => $user['email'],
            'role'                 => $user['role'],
            'department'           => $user['department'],
            'organization_id'      => $user['organization_id'],
            'must_change_password' => false
        ]
    ], 'Permanent password successfully established! Your electronic signature credentials are now active.');

} catch (PDOException $e) {
    error_log('[PharmaLabel Password Change Error] ' . $e->getMessage());
    sendError('Database error while updating password: ' . $e->getMessage(), 500);
}
