<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - MULTI-TENANT LICENSE STATUS VERIFICATION MIDDLEWARE
 * Enforces Licensing SLAs: Blocks Expired/Suspended Client Companies
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/../utils/response.php';

/**
 * Verifies that the tenant organization has an ACTIVE and valid license.
 * Bypassed for Camel Communication Platform SuperAdmin.
 *
 * @param PDO   $pdo         Database connection instance
 * @param array $user        Authenticated user payload
 * @param bool  $exitOnError Whether to terminate script execution with 403 on failure
 * @throws Exception
 * @return array Tenant organization details if valid
 */
function verifyTenantLicense(PDO $pdo, array $user, bool $exitOnError = true): array
{
    // SuperAdmin role belongs to Camel Communication (Platform Owner) -> bypasses tenant license check
    if (($user['role'] ?? '') === 'SuperAdmin') {
        return [
            'id'             => 'PLATFORM-CAMEL',
            'name'           => 'Camel Communication (Platform Owner)',
            'license_status' => 'ACTIVE',
            'valid_until'    => '2035-12-31'
        ];
    }

    $orgId = $user['organization_id'] ?? null;
    if (empty($orgId)) {
        if ($exitOnError) {
            sendError('Access Denied: User is not linked to any client organization tenant.', 403);
        }
        throw new RuntimeException('Missing organization_id');
    }

    $stmt = $pdo->prepare("SELECT id, name, license_status, valid_until, gs1_company_prefix FROM `organizations` WHERE id = :org_id LIMIT 1");
    $stmt->execute([':org_id' => $orgId]);
    $org = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$org) {
        if ($exitOnError) {
            sendError("Access Denied: Organization tenant '$orgId' not found in database.", 403);
        }
        throw new RuntimeException("Organization not found");
    }

    $status = strtoupper((string)$org['license_status']);
    $validUntil = (string)$org['valid_until'];
    $today = date('Y-m-d');

    // 1. Check License Status (ACTIVE / WARNING / SUSPENDED / EXPIRED)
    if ($status === 'SUSPENDED') {
        if ($exitOnError) {
            sendError("Access Denied: License for '{$org['name']}' has been SUSPENDED by Camel Communication. Contact support.", 403);
        }
        throw new RuntimeException("License suspended");
    }

    if ($status === 'EXPIRED') {
        if ($exitOnError) {
            sendError("Access Denied: License for '{$org['name']}' is EXPIRED. Contact Camel Communication for renewal.", 403);
        }
        throw new RuntimeException("License expired");
    }

    // 2. Check Date Expiration
    if ($validUntil < $today) {
        if ($exitOnError) {
            sendError("Access Denied: Subscription SLA for '{$org['name']}' expired on {$validUntil}. Renewal required.", 403);
        }
        throw new RuntimeException("License date expired");
    }

    return $org;
}
