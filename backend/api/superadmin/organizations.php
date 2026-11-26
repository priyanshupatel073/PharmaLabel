<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - SUPERADMIN CLIENT ORGANIZATIONS MANAGEMENT & ONBOARDING API
 * ============================================================================
 * Features:
 *   GET  /api/superadmin/organizations.php -> List all client organizations
 *   POST /api/superadmin/organizations.php -> Onboard new client plant, auto-create
 *        admin account, generate secure temporary password, and dispatch credentials
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/audit_logger.php';
require_once __DIR__ . '/../../utils/mailer.php';
require_once __DIR__ . '/../../middleware/auth.php';

try {
    $pdo = getDbConnection();

    // ------------------------------------------------------------------------
    // 1. GET: List All Client Organizations with SLA Stats
    // ------------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("
            SELECT 
                o.id,
                o.name,
                o.plant_location,
                o.contact_email,
                o.gs1_company_prefix,
                o.edition,
                o.license_status,
                o.valid_until,
                o.total_drums_printed,
                o.created_at,
                u.id AS admin_id,
                u.name AS admin_name,
                u.email AS admin_email
            FROM `organizations` o
            LEFT JOIN `users` u ON u.organization_id = o.id AND u.role = 'Admin'
            ORDER BY o.name ASC
        ");

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group into clean organization objects
        $organizations = [];
        foreach ($rows as $r) {
            $orgId = $r['id'];
            if (!isset($organizations[$orgId])) {
                $organizations[$orgId] = [
                    'id'                => $r['id'],
                    'name'              => $r['name'],
                    'plantLocation'     => $r['plant_location'],
                    'contactEmail'      => $r['contact_email'],
                    'gs1Prefix'         => $r['gs1_company_prefix'],
                    'edition'           => $r['edition'],
                    'licenseStatus'     => strtoupper($r['license_status']),
                    'validUntil'        => $r['valid_until'],
                    'totalDrumsPrinted' => (int)$r['total_drums_printed'],
                    'createdAt'         => substr($r['created_at'], 0, 10),
                    'adminUser'         => $r['admin_email'] ? [
                        'id'    => $r['admin_id'],
                        'name'  => $r['admin_name'],
                        'email' => $r['admin_email']
                    ] : null
                ];
            }
        }

        sendSuccess(array_values($organizations), 'Organizations list retrieved.');
    }

    // ------------------------------------------------------------------------
    // 2. POST: Onboard New Pharmaceutical Enterprise Tenant
    // ------------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);

        if (!is_array($input)) {
            sendError('Malformed JSON payload received.', 400);
        }

        $name = trim((string)($input['name'] ?? ''));
        $plantLocation = trim((string)($input['plant_location'] ?? ($input['plantLocation'] ?? '')));
        $contactEmail = strtolower(trim((string)($input['contact_email'] ?? ($input['contactEmail'] ?? ''))));
        $gs1Prefix = trim((string)($input['gs1_company_prefix'] ?? ($input['gs1Prefix'] ?? '')));
        $edition = trim((string)($input['edition'] ?? 'Enterprise Unlimited Traceability'));
        $validUntil = trim((string)($input['valid_until'] ?? ($input['validUntil'] ?? date('Y-m-d', strtotime('+1 year')))));
        $adminName = trim((string)($input['admin_name'] ?? ($name . ' Plant Admin')));

        // Validations
        $validationErrors = [];
        if (empty($name)) {
            $validationErrors['name'] = 'Organization Name is required.';
        }
        if (empty($plantLocation)) {
            $validationErrors['plant_location'] = 'Plant Location is required.';
        }
        if (empty($contactEmail) || !filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
            $validationErrors['contact_email'] = 'A valid corporate admin contact email is required.';
        }
        if (empty($gs1Prefix) || !ctype_digit($gs1Prefix) || strlen($gs1Prefix) < 3 || strlen($gs1Prefix) > 11) {
            $validationErrors['gs1_company_prefix'] = 'GS1 Company Prefix must be 3 to 11 numeric digits (e.g. 890 or 8901234).';
        }

        if (!empty($validationErrors)) {
            sendValidationError($validationErrors, 'Onboarding form validation failed.');
        }

        // Check for duplicates
        $checkStmt = $pdo->prepare("SELECT id, name FROM `organizations` WHERE LOWER(name) = LOWER(:name) OR gs1_company_prefix = :gs1 LIMIT 1");
        $checkStmt->execute([':name' => $name, ':gs1' => $gs1Prefix]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            sendError("An organization with the name '{$name}' or GS1 Prefix '{$gs1Prefix}' already exists ({$existing['id']}).", 409);
        }

        // Check if admin email already exists in users table
        $checkEmailStmt = $pdo->prepare("SELECT id, email FROM `users` WHERE LOWER(email) = LOWER(:email) LIMIT 1");
        $checkEmailStmt->execute([':email' => $contactEmail]);
        if ($checkEmailStmt->fetch(PDO::FETCH_ASSOC)) {
            sendError("The email address '$contactEmail' is already associated with an existing user.", 409);
        }

        // Generate unique Organization ID
        $cleanShort = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', substr($name, 0, 8)));
        if (strlen($cleanShort) < 3) {
            $cleanShort = 'ORG';
        }
        $orgId = 'ORG-' . $cleanShort . '-' . random_int(100, 999);

        // Generate cryptographically secure temporary password
        $tempPassword = generateSecureTempPassword(10);
        $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT);

        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

        // Begin Atomic Transaction
        $pdo->beginTransaction();

        try {
            // 1. Insert Organization
            $stmtOrg = $pdo->prepare("
                INSERT INTO `organizations` (
                    id, name, plant_location, contact_email, gs1_company_prefix,
                    edition, license_status, valid_until, total_drums_printed, created_at
                ) VALUES (
                    :id, :name, :loc, :email, :gs1,
                    :edition, 'ACTIVE', :valid_until, 0, :created_at
                )
            ");

            $nowDate = date('Y-m-d H:i:s');
            $stmtOrg->execute([
                ':id'          => $orgId,
                ':name'        => $name,
                ':loc'         => $plantLocation,
                ':email'       => $contactEmail,
                ':gs1'         => $gs1Prefix,
                ':edition'     => $edition,
                ':valid_until' => $validUntil,
                ':created_at'  => $nowDate
            ]);

            // 2. Insert Default Company Settings
            $stmtSettings = $pdo->prepare("
                INSERT INTO `company_settings` (
                    organization_id, company_name, address, contact_number, email,
                    mfg_license_number, gst_number, gs1_company_prefix, extension_digit,
                    next_serial_reference, printer_name, default_label_dimension
                ) VALUES (
                    :org_id, :company_name, :address, '+91 1800-PHARMA', :email,
                    'PENDING-REGULATORY-FILING', '27AAACA0000A1Z5', :gs1, '1',
                    1, 'Zebra ZT411 Industrial (Thermal 300DPI - Line 01)', '4x6'
                )
            ");

            $stmtSettings->execute([
                ':org_id'       => $orgId,
                ':company_name' => $name,
                ':address'      => $plantLocation,
                ':email'        => $contactEmail,
                ':gs1'          => $gs1Prefix
            ]);

            // 3. Insert Plant Admin User
            $adminUserId = 'usr_admin_' . strtolower(substr($orgId, 4));
            $adminPermissions = json_encode([
                'print_labels', 'reprint_labels', 'create_batch', 'edit_batch',
                'edit_products', 'edit_template', 'manage_users', 'view_audit',
                'backup_archive', 'edit_company', 'printer_settings', 'manage_logo'
            ]);

            $stmtUser = $pdo->prepare("
                INSERT INTO `users` (
                    id, organization_id, name, email, password_hash, role,
                    department, permissions, status, failed_login_attempts, locked_until
                ) VALUES (
                    :id, :org_id, :name, :email, :pass, 'Admin',
                    'Plant IT & Serialization Admin', :perms, 'ACTIVE', 0, NULL
                )
            ");

            $stmtUser->execute([
                ':id'     => $adminUserId,
                ':org_id' => $orgId,
                ':name'   => $adminName,
                ':email'  => $contactEmail,
                ':pass'   => $passwordHash,
                ':perms'  => $adminPermissions
            ]);

            // 4. Log 21 CFR Part 11 Audit Trail
            logAuditTrail($pdo, 'TENANT_ONBOARDED', 'SuperAdmin Licensing', [
                'new_value' => "Onboarded tenant '$name' ($orgId) with GS1 Prefix $gs1Prefix",
                'reason'    => "New pharmaceutical enterprise client onboarded. Admin account $contactEmail provisioned with temporary password.",
                'outcome'   => 'SUCCESS'
            ], $orgId);

            $pdo->commit();

        } catch (Exception $txException) {
            $pdo->rollBack();
            sendError('Failed to onboard organization: ' . $txException->getMessage(), 500);
        }

        // 5. Dispatch Welcome Email with Temporary Credentials
        $newOrgData = [
            'id'                 => $orgId,
            'name'               => $name,
            'plant_location'     => $plantLocation,
            'contact_email'      => $contactEmail,
            'gs1_company_prefix' => $gs1Prefix,
            'edition'            => $edition,
            'valid_until'        => $validUntil
        ];

        $emailDispatch = sendOnboardingEmail(
            $newOrgData,
            $adminName,
            $contactEmail,
            $tempPassword,
            'http://127.0.0.1:5173/login'
        );

        // 6. Return Success Payload to SuperAdmin Frontend
        sendSuccess([
            'organization' => [
                'id'                => $orgId,
                'name'              => $name,
                'plantLocation'     => $plantLocation,
                'contactEmail'      => $contactEmail,
                'gs1Prefix'         => $gs1Prefix,
                'edition'           => $edition,
                'licenseStatus'     => 'ACTIVE',
                'validUntil'        => $validUntil,
                'totalDrumsPrinted' => 0,
                'createdAt'         => date('Y-m-d')
            ],
            'adminUser' => [
                'id'         => $adminUserId,
                'name'       => $adminName,
                'email'      => $contactEmail,
                'role'       => 'Admin',
                'department' => 'Plant IT & Serialization Admin'
            ],
            'temporaryPassword' => $tempPassword,
            'emailDispatch'     => $emailDispatch
        ], "Organization '$name' successfully onboarded and credentials dispatched to $contactEmail.", 201);
    }

    sendError('Method not allowed.', 405);

} catch (PDOException $e) {
    sendError('Database error during organization management: ' . $e->getMessage(), 500);
}
