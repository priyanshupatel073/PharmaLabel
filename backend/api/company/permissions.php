<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - ROLE & PERMISSION MATRIX CONTROLLER
 * Supports:
 *   - 5 Category Matrix (Company & Setup, Batch & Production, Labels, Templates & Products, Users & Audit)
 *   - Dynamic Custom Role Addition (+ Add New Role)
 *   - Dedicated Advance Permissions Modal (Label Copy Download & Label Export)
 *   - Reset to Defaults
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
    sendError('Access Denied: You cannot modify permissions for another plant organization.', 403);
}

// ----------------------------------------------------------------------------
// GxP Default Permission Profiles (Matching Screenshot 1)
// ----------------------------------------------------------------------------
$allPermissionKeys = [
    'edit_company_info', 'change_company_logo', 'printer_settings', 'backup_archive', 'license_management',
    'create_batch', 'edit_batch', 'edit_drum_weight',
    'print_labels', 'reprint_labels',
    'edit_templates', 'edit_products',
    'manage_users', 'view_audit'
];

$defaultRoles = [
    'Admin' => [
        'is_custom' => false,
        'permissions' => $allPermissionKeys,
        'advance_permissions' => [
            'can_download_label_copy' => true,
            'can_export_labels'       => true
        ]
    ],
    'Supervisor' => [
        'is_custom' => false,
        'permissions' => [
            'create_batch', 'edit_batch', 'edit_drum_weight',
            'print_labels', 'reprint_labels',
            'view_audit'
        ],
        'advance_permissions' => [
            'can_download_label_copy' => true,
            'can_export_labels'       => false
        ]
    ],
    'Operator' => [
        'is_custom' => false,
        'permissions' => [
            'print_labels'
        ],
        'advance_permissions' => [
            'can_download_label_copy' => false,
            'can_export_labels'       => false
        ]
    ]
];

// Helper to seed defaults if missing
function seedDefaultsIfEmpty(PDO $pdo, string $orgId, array $defaults): void {
    $count = (int)$pdo->query("SELECT COUNT(*) FROM `role_permissions` WHERE organization_id = " . $pdo->quote($orgId))->fetchColumn();
    if ($count === 0) {
        $stmt = $pdo->prepare("INSERT INTO `role_permissions` 
            (organization_id, role_name, is_custom, permissions, advance_permissions) 
            VALUES (:org_id, :role_name, :is_custom, :perms, :advance)");

        foreach ($defaults as $roleName => $cfg) {
            $stmt->execute([
                ':org_id'   => $orgId,
                ':role_name'=> $roleName,
                ':is_custom'=> $cfg['is_custom'] ? 1 : 0,
                ':perms'    => json_encode($cfg['permissions']),
                ':advance'  => json_encode($cfg['advance_permissions'])
            ]);
        }
    }
}

seedDefaultsIfEmpty($pdo, $targetOrgId, $defaultRoles);

// ----------------------------------------------------------------------------
// 1. GET: Fetch Role Permissions & Advance Permissions
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT role_name, is_custom, permissions, advance_permissions FROM `role_permissions` WHERE organization_id = :org_id ORDER BY is_custom ASC, id ASC");
        $stmt->execute([':org_id' => $targetOrgId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $matrix = [];
        $advance = [];
        $rolesList = [];

        foreach ($rows as $r) {
            $role = $r['role_name'];
            $rolesList[] = [
                'name'      => $role,
                'is_custom' => (bool)$r['is_custom']
            ];

            $perms = json_decode((string)$r['permissions'], true) ?? [];
            $matrix[$role] = $perms;

            $adv = json_decode((string)$r['advance_permissions'], true) ?? [
                'can_download_label_copy' => false,
                'can_export_labels'       => false
            ];
            $advance[$role] = $adv;
        }

        sendSuccess([
            'organization_id'     => $targetOrgId,
            'roles'               => $rolesList,
            'permission_matrix'   => $matrix,
            'advance_permissions' => $advance,
            'all_permissions'     => $allPermissionKeys
        ], 'Role permissions loaded.');
    } catch (PDOException $e) {
        sendError('Failed to fetch role permissions: ' . $e->getMessage(), 500);
    }
}

// ----------------------------------------------------------------------------
// 2. POST: Save Matrix, Add Role, Save Advance, or Reset
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? [];
    $action = $_GET['action'] ?? ($input['action'] ?? 'save_matrix');

    // Sub-Action: Reset to Defaults
    if ($action === 'reset') {
        try {
            $pdo->prepare("DELETE FROM `role_permissions` WHERE organization_id = :org_id AND is_custom = 0")->execute([':org_id' => $targetOrgId]);
            seedDefaultsIfEmpty($pdo, $targetOrgId, $defaultRoles);

            logAuditTrail($pdo, 'ROLE_PERMISSIONS_RESET_TO_DEFAULTS', 'RBAC', [
                'reason' => 'Permissions reset to standard 21 CFR Part 11 GxP defaults',
                'reset_by' => $currentUser['name'] ?? $currentUser['email']
            ], $targetOrgId, $currentUser);

            sendSuccess(null, 'Role permissions reset to default GxP standards.');
        } catch (PDOException $e) {
            sendError('Failed to reset: ' . $e->getMessage(), 500);
        }
    }

    // Sub-Action: Add Custom Role
    if ($action === 'add_role') {
        $newRole = trim((string)($input['role_name'] ?? ''));
        if (empty($newRole)) {
            sendError('Role name is required.', 400);
        }

        // Clean role name
        $newRole = preg_replace('/[^a-zA-Z0-9_\-\s]/', '', $newRole);

        try {
            // Check if already exists
            $stmtCheck = $pdo->prepare("SELECT id FROM `role_permissions` WHERE organization_id = :org_id AND LOWER(role_name) = LOWER(:role_name) LIMIT 1");
            $stmtCheck->execute([':org_id' => $targetOrgId, ':role_name' => $newRole]);
            if ($stmtCheck->fetch()) {
                sendError("Role '$newRole' already exists.", 409);
            }

            $initialPerms = $input['permissions'] ?? ['print_labels'];
            $initialAdvance = $input['advance_permissions'] ?? [
                'can_download_label_copy' => false,
                'can_export_labels'       => false
            ];

            $stmtAdd = $pdo->prepare("INSERT INTO `role_permissions` 
                (organization_id, role_name, is_custom, permissions, advance_permissions) 
                VALUES (:org_id, :role_name, 1, :perms, :advance)");

            $stmtAdd->execute([
                ':org_id'   => $targetOrgId,
                ':role_name'=> $newRole,
                ':perms'    => json_encode($initialPerms),
                ':advance'  => json_encode($initialAdvance)
            ]);

            logAuditTrail($pdo, 'CUSTOM_ROLE_CREATED', 'RBAC', [
                'role_name'  => $newRole,
                'created_by' => $currentUser['name'] ?? $currentUser['email']
            ], $targetOrgId, $currentUser);

            sendSuccess(['role_name' => $newRole], "Role '$newRole' created successfully.");
        } catch (PDOException $e) {
            sendError('Failed to create role: ' . $e->getMessage(), 500);
        }
    }

    // Sub-Action: Save Advance Permissions Specifically
    if ($action === 'save_advance') {
        $advanceMap = $input['advance_permissions'] ?? [];
        if (!is_array($advanceMap)) {
            sendError('Invalid advance permissions data structure.', 400);
        }

        try {
            $stmtUpdateAdv = $pdo->prepare("UPDATE `role_permissions` SET advance_permissions = :advance WHERE organization_id = :org_id AND role_name = :role_name");
            foreach ($advanceMap as $role => $cfg) {
                $stmtUpdateAdv->execute([
                    ':advance'   => json_encode($cfg),
                    ':org_id'    => $targetOrgId,
                    ':role_name' => $role
                ]);
            }

            logAuditTrail($pdo, 'ADVANCE_PERMISSIONS_UPDATED', 'RBAC', [
                'roles_updated' => array_keys($advanceMap),
                'updated_by'    => $currentUser['name'] ?? $currentUser['email'],
                'reason'        => 'Updated Label Copy Download & Label Export privileges'
            ], $targetOrgId, $currentUser);

            sendSuccess(null, 'Advance permissions saved successfully.');
        } catch (PDOException $e) {
            sendError('Failed to save advance permissions: ' . $e->getMessage(), 500);
        }
    }

    // Default: Save Full Permission Matrix
    $matrix = $input['permission_matrix'] ?? [];
    if (!is_array($matrix)) {
        sendError('Invalid matrix data provided.', 400);
    }

    try {
        $stmtUpdate = $pdo->prepare("UPDATE `role_permissions` SET permissions = :perms WHERE organization_id = :org_id AND role_name = :role_name");

        foreach ($matrix as $roleName => $permsList) {
            if (!is_array($permsList)) continue;
            $stmtUpdate->execute([
                ':perms'    => json_encode(array_values(array_unique($permsList))),
                ':org_id'   => $targetOrgId,
                ':role_name'=> $roleName
            ]);
        }

        // Also update advance permissions if sent in payload
        if (!empty($input['advance_permissions']) && is_array($input['advance_permissions'])) {
            $stmtAdv = $pdo->prepare("UPDATE `role_permissions` SET advance_permissions = :advance WHERE organization_id = :org_id AND role_name = :role_name");
            foreach ($input['advance_permissions'] as $roleName => $advConfig) {
                $stmtAdv->execute([
                    ':advance'  => json_encode($advConfig),
                    ':org_id'   => $targetOrgId,
                    ':role_name'=> $roleName
                ]);
            }
        }

        logAuditTrail($pdo, 'ROLE_PERMISSIONS_SAVED', 'RBAC', [
            'roles_modified' => array_keys($matrix),
            'saved_by'       => $currentUser['name'] ?? $currentUser['email'],
            'outcome'        => 'SUCCESS'
        ], $targetOrgId, $currentUser);

        sendSuccess(null, 'Permission matrix saved successfully.');
    } catch (PDOException $e) {
        sendError('Failed to save permission matrix: ' . $e->getMessage(), 500);
    }
}
