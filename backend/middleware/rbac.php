<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - ROLE-BASED ACCESS CONTROL (RBAC) GATEKEEPER
 * Enforces Role Permissions: SuperAdmin, Admin, Supervisor (QA), Operator
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/../utils/response.php';

/**
 * Asserts that the authenticated user possesses one of the allowed roles.
 *
 * @param array        $user         Authenticated user context array
 * @param array|string $allowedRoles Single role string or array of permitted roles
 * @param bool         $exitOnError  Whether to send 403 JSON response and exit
 * @return bool True if authorized, false otherwise
 */
function requireRole(array $user, array|string $allowedRoles, bool $exitOnError = true): bool
{
    $userRole = (string)($user['role'] ?? '');
    $rolesArray = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];

    if (!in_array($userRole, $rolesArray, true)) {
        if ($exitOnError) {
            $allowedStr = implode(', ', $rolesArray);
            sendError(
                "Access Forbidden: Role '$userRole' does not have permission for this operational endpoint. Required role(s): $allowedStr.",
                403
            );
        }
        return false;
    }

    return true;
}

/**
 * Asserts that the authenticated user possesses a specific granular permission.
 *
 * @param array  $user        Authenticated user context array
 * @param string $permission  e.g. 'print_labels', 'approve_product', 'edit_drum_weight'
 * @param bool   $exitOnError Whether to send 403 JSON response and exit
 * @return bool True if authorized, false otherwise
 */
function requirePermission(array $user, string $permission, bool $exitOnError = true): bool
{
    // SuperAdmin has platform root permissions
    if (($user['role'] ?? '') === 'SuperAdmin') {
        return true;
    }

    $permissions = $user['permissions'] ?? [];
    if (is_string($permissions)) {
        $permissions = json_decode($permissions, true) ?: [];
    }

    if (!is_array($permissions) || !in_array($permission, $permissions, true)) {
        if ($exitOnError) {
            sendError("Access Forbidden: User lacks the required '$permission' capability.", 403);
        }
        return false;
    }

    return true;
}
