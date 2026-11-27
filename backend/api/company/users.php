<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - PLANT USER & CREDENTIAL MANAGEMENT API
 * Enforces: Plant Admin user creation, password hashing, and Hostinger SMTP dispatch
 * Complies with: US FDA 21 CFR Part 11 §11.10 & §11.200 (Accountability & Zero-Knowledge)
 * ============================================================================
 * Endpoints:
 *   GET  /api/company/users.php -> List plant users
 *   POST /api/company/users.php -> Create user (username, password, role, etc.)
 *   PUT  /api/company/users.php -> Edit user metadata (name, dept, role, status)
 *   POST /api/company/users.php?action=reset_password -> Reset user password
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/mailer.php';
require_once __DIR__ . '/../../utils/audit_logger.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../middleware/rbac.php';

$currentUser = authenticateRequest();
$pdo = getDbConnection();

// Allow Plant Admin or SuperAdmin
$isSuperAdmin = ($currentUser['role'] ?? '') === 'SuperAdmin';
$targetOrgId = $_GET['organization_id'] ?? ($currentUser['organization_id'] ?? null);

if (!$targetOrgId && !$isSuperAdmin) {
    sendError('Organization context is missing.', 400);
}

// Ensure non-superadmin cannot inspect or modify other organizations
if (!$isSuperAdmin && $targetOrgId !== $currentUser['organization_id']) {
    sendError('Access Denied: You cannot manage users outside your plant organization.', 403);
}

// ----------------------------------------------------------------------------
// 1. GET: List Plant Users
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT id, organization_id, name, username, email, role, department, status, 
            failed_login_attempts, locked_until, password_changed_at, last_login_at, created_at 
            FROM `users` 
            WHERE organization_id = :org_id 
            ORDER BY created_at ASC");
        $stmt->execute([':org_id' => $targetOrgId]);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Normalize data for frontend table
        $formatted = array_map(function ($u) {
            return [
                'id'                 => $u['id'],
                'username'           => $u['username'] ?: ($u['email'] ? explode('@', $u['email'])[0] : 'user'),
                'name'               => $u['name'],
                'email'              => $u['email'],
                'role'               => $u['role'],
                'department'         => $u['department'] ?: 'Operations',
                'status'             => $u['status'],
                'has_password'       => true,
                'password_status'    => empty($u['password_changed_at']) ? 'TEMPORARY' : 'OK',
                'failed_attempts'    => (int)$u['failed_login_attempts'],
                'is_locked'          => !empty($u['locked_until']) && strtotime($u['locked_until']) > time(),
                'last_login'         => $u['last_login_at'],
                'created_at'         => $u['created_at']
            ];
        }, $users);

        sendSuccess($formatted, 'Plant users retrieved successfully.');
    } catch (PDOException $e) {
        sendError('Failed to retrieve users: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 2. POST: Add User OR Reset Password
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];

    $action = $_GET['action'] ?? ($input['action'] ?? 'create');

    // Sub-action: Delete User via POST ?action=delete
    if ($action === 'delete') {
        $targetUserId = trim((string)($input['user_id'] ?? ($input['id'] ?? ($_GET['id'] ?? ($_GET['user_id'] ?? '')))));
        $reason = trim((string)($input['reason'] ?? ($_GET['reason'] ?? 'Deprovisioned by plant administrator')));

        if (empty($targetUserId)) {
            sendError('User ID is required for deletion.', 400);
        }

        try {
            $stmtUser = $pdo->prepare("SELECT * FROM `users` WHERE id = :id AND organization_id = :org_id LIMIT 1");
            $stmtUser->execute([':id' => $targetUserId, ':org_id' => $targetOrgId]);
            $targetUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$targetUser) {
                sendError('User not found in this organization.', 404);
            }

            // Prevent Admin from deleting their own active logged-in account
            $isSelf = ($targetUser['id'] === ($currentUser['id'] ?? ''))
                || (strtolower((string)$targetUser['email']) === strtolower((string)($currentUser['email'] ?? '')));
            if ($isSelf) {
                sendError('Security Violation: You cannot delete your own active administrator account.', 403);
            }

            // Delete user record
            $stmtDel = $pdo->prepare("DELETE FROM `users` WHERE id = :id AND organization_id = :org_id");
            $stmtDel->execute([':id' => $targetUserId, ':org_id' => $targetOrgId]);

            // Clean up password history
            $pdo->prepare("DELETE FROM `password_history` WHERE user_id = :id")->execute([':id' => $targetUserId]);

            // US FDA 21 CFR Part 11 ALCOA+ Audit Trail
            logAuditTrail($pdo, 'USER_DELETED', 'UserSecurity', [
                'deleted_user_id'  => $targetUser['id'],
                'deleted_username' => $targetUser['username'],
                'deleted_name'     => $targetUser['name'],
                'deleted_role'     => $targetUser['role'],
                'deleted_email'    => $targetUser['email'],
                'reason'           => $reason,
                'deleted_by'       => $currentUser['name'] ?? $currentUser['email'],
                'outcome'          => 'SUCCESS'
            ], $targetOrgId, $currentUser);

            sendSuccess([
                'deleted_user_id'  => $targetUserId,
                'deleted_username' => $targetUser['username']
            ], "User '{$targetUser['name']}' ({$targetUser['username']}) was permanently deleted from the system.");
        } catch (PDOException $e) {
            sendError('Failed to delete user: ' . $e->getMessage(), 500);
        }
    }

    // Sub-action: Reset User Password
    if ($action === 'reset_password') {
        $userId = trim((string)($input['user_id'] ?? ''));
        $newPassword = trim((string)($input['new_password'] ?? ''));

        if (empty($userId)) {
            sendError('User ID is required for password reset.', 400);
        }

        // Auto-generate if not explicitly provided
        if (empty($newPassword)) {
            $newPassword = generateSecureTempPassword(10);
        }

        try {
            // Find target user
            $stmtUser = $pdo->prepare("SELECT * FROM `users` WHERE id = :id AND organization_id = :org_id LIMIT 1");
            $stmtUser->execute([':id' => $userId, ':org_id' => $targetOrgId]);
            $targetUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$targetUser) {
                sendError('Target user not found in this organization.', 404);
            }

            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmtUpdate = $pdo->prepare("UPDATE `users` SET password_hash = :hash, password_changed_at = NULL, failed_login_attempts = 0, locked_until = NULL WHERE id = :id");
            $stmtUpdate->execute([':hash' => $newHash, ':id' => $userId]);

            // 21 CFR Part 11 Audit Trail
            logAuditTrail($pdo, 'PASSWORD_RESET_BY_ADMIN', 'UserSecurity', [
                'target_user' => $targetUser['username'] ?? $targetUser['email'],
                'target_role' => $targetUser['role'],
                'reset_by'    => $currentUser['name'] ?? $currentUser['email'],
                'outcome'     => 'SUCCESS'
            ], $targetOrgId, $currentUser);

            // Fetch organization name
            $stmtOrg = $pdo->prepare("SELECT name FROM `organizations` WHERE id = :org_id LIMIT 1");
            $stmtOrg->execute([':org_id' => $targetOrgId]);
            $orgName = $stmtOrg->fetchColumn() ?: $targetOrgId;

            // Dispatch reset email if email is present
            $emailSent = false;
            if (!empty($targetUser['email'])) {
                $mailRes = sendUserCredentialsEmail(
                    $targetUser,
                    $newPassword,
                    $orgName,
                    $currentUser['name'] ?? 'Plant Administrator'
                );
                $emailSent = !empty($mailRes['success']);
            }

            sendSuccess([
                'user_id'            => $userId,
                'temporary_password' => $newPassword, // Returned once to the creating Admin for local offline shopfloor distribution
                'email_dispatched'   => $emailSent
            ], "Password reset successfully for {$targetUser['name']}.");
        } catch (PDOException $e) {
            sendError('Failed to reset password: ' . $e->getMessage(), 500);
        }
    }

    // Default: Create New Plant User
    $username = strtolower(trim((string)($input['username'] ?? '')));
    $name = trim((string)($input['name'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $role = trim((string)($input['role'] ?? 'Operator'));
    $department = trim((string)($input['department'] ?? 'Packaging'));
    $password = trim((string)($input['password'] ?? ''));

    // Basic Validation
    if (empty($username) || empty($name)) {
        sendError('Username and Full Name are mandatory.', 400);
    }

    // Auto-generate secure password if admin did not type one
    $tempPassword = !empty($password) ? $password : generateSecureTempPassword(10);
    $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT);

    // If email is empty, synthesize a shopfloor internal identifier e.g. operator@plant.local
    if (empty($email)) {
        $email = $username . '@' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string)$targetOrgId)) . '.local';
    }

    try {
        // Check uniqueness of username or email within system/org
        $stmtCheck = $pdo->prepare("SELECT id FROM `users` WHERE (LOWER(username) = LOWER(:username) AND organization_id = :org_id) OR LOWER(email) = LOWER(:email) LIMIT 1");
        $stmtCheck->execute([
            ':username' => $username,
            ':org_id'   => $targetOrgId,
            ':email'    => $email
        ]);

        if ($stmtCheck->fetch()) {
            sendError("A user with username '$username' or email '$email' already exists.", 409);
        }

        $userId = 'usr_' . strtolower(preg_replace('/[^a-z0-9]/', '', $role)) . '_' . bin2hex(random_bytes(4));

        $stmtInsert = $pdo->prepare("INSERT INTO `users` 
            (id, organization_id, name, username, email, password_hash, role, department, status, failed_login_attempts, password_changed_at, created_at) 
            VALUES (:id, :org_id, :name, :username, :email, :password_hash, :role, :department, 'ACTIVE', 0, NULL, NOW())");

        $stmtInsert->execute([
            ':id'            => $userId,
            ':org_id'        => $targetOrgId,
            ':name'          => $name,
            ':username'      => $username,
            ':email'         => $email,
            ':password_hash' => $passwordHash,
            ':role'          => $role,
            ':department'    => $department
        ]);

        // 21 CFR Part 11 Audit Trail
        logAuditTrail($pdo, 'USER_CREATED', 'UserSecurity', [
            'new_user_id'  => $userId,
            'username'     => $username,
            'role'         => $role,
            'department'   => $department,
            'created_by'   => $currentUser['name'] ?? $currentUser['email'],
            'outcome'      => 'SUCCESS'
        ], $targetOrgId, $currentUser);

        // Fetch organization name
        $stmtOrg = $pdo->prepare("SELECT name FROM `organizations` WHERE id = :org_id LIMIT 1");
        $stmtOrg->execute([':org_id' => $targetOrgId]);
        $orgName = $stmtOrg->fetchColumn() ?: $targetOrgId;

        // Dispatch Welcome / Credentials Email via Hostinger SMTP if real email provided
        $emailDispatched = false;
        if (!empty($input['email'])) {
            $mailRes = sendUserCredentialsEmail(
                ['name' => $name, 'username' => $username, 'email' => $email, 'role' => $role],
                $tempPassword,
                $orgName,
                $currentUser['name'] ?? 'Plant Administrator'
            );
            $emailDispatched = !empty($mailRes['success']);
        }

        sendSuccess([
            'id'                 => $userId,
            'username'           => $username,
            'name'               => $name,
            'email'              => $email,
            'role'               => $role,
            'department'         => $department,
            'temporary_password' => $tempPassword, // Returned once so admin can see and hand over to floor operator
            'email_dispatched'   => $emailDispatched
        ], "User '$username' created successfully with role '$role'.", 201);

    } catch (PDOException $e) {
        sendError('Failed to create user: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 3. PUT: Edit User Details (Name, Dept, Role, Status)
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];

    $userId = trim((string)($input['id'] ?? ''));
    if (empty($userId)) {
        sendError('User ID is required for update.', 400);
    }

    $name = trim((string)($input['name'] ?? ''));
    $role = trim((string)($input['role'] ?? ''));
    $department = trim((string)($input['department'] ?? ''));
    $status = strtoupper(trim((string)($input['status'] ?? 'ACTIVE')));

    if (!in_array($status, ['ACTIVE', 'INACTIVE', 'LOCKED'], true)) {
        $status = 'ACTIVE';
    }

    try {
        $stmtCheck = $pdo->prepare("SELECT * FROM `users` WHERE id = :id AND organization_id = :org_id LIMIT 1");
        $stmtCheck->execute([':id' => $userId, ':org_id' => $targetOrgId]);
        $oldUser = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$oldUser) {
            sendError('User not found in this organization.', 404);
        }

        $stmtUpdate = $pdo->prepare("UPDATE `users` SET 
            name = COALESCE(NULLIF(:name, ''), name),
            role = COALESCE(NULLIF(:role, ''), role),
            department = COALESCE(NULLIF(:department, ''), department),
            status = :status,
            failed_login_attempts = CASE WHEN :status = 'ACTIVE' THEN 0 ELSE failed_login_attempts END,
            locked_until = CASE WHEN :status = 'ACTIVE' THEN NULL ELSE locked_until END
            WHERE id = :id AND organization_id = :org_id");

        $stmtUpdate->execute([
            ':name'       => $name,
            ':role'       => $role,
            ':department' => $department,
            ':status'     => $status,
            ':id'         => $userId,
            ':org_id'     => $targetOrgId
        ]);

        logAuditTrail($pdo, 'USER_MODIFIED', 'UserSecurity', [
            'user_id'    => $userId,
            'old_values' => ['name' => $oldUser['name'], 'role' => $oldUser['role'], 'status' => $oldUser['status']],
            'new_values' => ['name' => $name ?: $oldUser['name'], 'role' => $role ?: $oldUser['role'], 'status' => $status],
            'updated_by' => $currentUser['name'] ?? $currentUser['email']
        ], $targetOrgId, $currentUser);

        sendSuccess(null, "User '$userId' updated successfully.");
    } catch (PDOException $e) {
        sendError('Failed to update user: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 4. DELETE: Permanently Delete User
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];

    $targetUserId = trim((string)($input['user_id'] ?? ($input['id'] ?? ($_GET['id'] ?? ($_GET['user_id'] ?? '')))));
    $reason = trim((string)($input['reason'] ?? ($_GET['reason'] ?? 'Deprovisioned by plant administrator')));

    if (empty($targetUserId)) {
        sendError('User ID is required for deletion.', 400);
    }

    try {
        $stmtUser = $pdo->prepare("SELECT * FROM `users` WHERE id = :id AND organization_id = :org_id LIMIT 1");
        $stmtUser->execute([':id' => $targetUserId, ':org_id' => $targetOrgId]);
        $targetUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            sendError('User not found in this organization.', 404);
        }

        // Prevent Admin from deleting their own active logged-in account
        $isSelf = ($targetUser['id'] === ($currentUser['id'] ?? ''))
            || (strtolower((string)$targetUser['email']) === strtolower((string)($currentUser['email'] ?? '')));
        if ($isSelf) {
            sendError('Security Violation: You cannot delete your own active administrator account.', 403);
        }

        // Delete user record
        $stmtDel = $pdo->prepare("DELETE FROM `users` WHERE id = :id AND organization_id = :org_id");
        $stmtDel->execute([':id' => $targetUserId, ':org_id' => $targetOrgId]);

        // Clean up password history
        $pdo->prepare("DELETE FROM `password_history` WHERE user_id = :id")->execute([':id' => $targetUserId]);

        // US FDA 21 CFR Part 11 ALCOA+ Audit Trail
        logAuditTrail($pdo, 'USER_DELETED', 'UserSecurity', [
            'deleted_user_id'  => $targetUser['id'],
            'deleted_username' => $targetUser['username'],
            'deleted_name'     => $targetUser['name'],
            'deleted_role'     => $targetUser['role'],
            'deleted_email'    => $targetUser['email'],
            'reason'           => $reason,
            'deleted_by'       => $currentUser['name'] ?? $currentUser['email'],
            'outcome'          => 'SUCCESS'
        ], $targetOrgId, $currentUser);

        sendSuccess([
            'deleted_user_id'  => $targetUserId,
            'deleted_username' => $targetUser['username']
        ], "User '{$targetUser['name']}' ({$targetUser['username']}) was permanently deleted from the system.");
    } catch (PDOException $e) {
        sendError('Failed to delete user: ' . $e->getMessage(), 500);
    }
}
