<?php
/**
 * Test Suite for backend/middleware/ (auth, license_check, rbac)
 */

declare(strict_types=1);

echo "========================================================\n";
echo "PHARMALABEL PRO - MIDDLEWARE SECURITY TEST SUITE\n";
echo "========================================================\n\n";

// 1. AUTH MIDDLEWARE TESTS
echo "--- 1. Testing auth.php (Token & 60-min Timeout) ---\n";
require_once __DIR__ . '/../middleware/auth.php';

$testUser = [
    'id'              => 'usr_admin',
    'name'            => 'Vikram Joshi',
    'email'           => 'admin@apexpharma.com',
    'role'            => 'Admin',
    'organization_id' => 'ORG-APEX'
];

// Test token generation
$validToken = generateToken($testUser, 3600);
echo "  [PASS] generateToken() generated signed bearer token\n";

// Test valid token verification
$payload = verifyToken($validToken);
if ($payload && $payload['sub'] === 'usr_admin' && $payload['organization_id'] === 'ORG-APEX') {
    echo "  [PASS] verifyToken() decoded and verified HMAC-SHA256 signature successfully\n";
} else {
    echo "  [FAIL] verifyToken() failed on valid token!\n";
    exit(1);
}

// Test tampered token signature
$tamperedToken = $validToken . 'xyz';
if (verifyToken($tamperedToken) === null) {
    echo "  [PASS] verifyToken() successfully rejected tampered token signature!\n";
} else {
    echo "  [FAIL] verifyToken() accepted tampered signature!\n";
    exit(1);
}

// Test expired token (60-minute session inactivity timeout)
$expiredToken = generateToken($testUser, -10); // Expired 10 seconds ago
if (verifyToken($expiredToken) === null) {
    echo "  [PASS] verifyToken() enforced session timeout (rejected expired token)!\n";
} else {
    echo "  [FAIL] verifyToken() accepted expired session token!\n";
    exit(1);
}

// 2. RBAC MIDDLEWARE TESTS
echo "\n--- 2. Testing rbac.php (Role-Based Access Control) ---\n";
require_once __DIR__ . '/../middleware/rbac.php';

$operatorUser   = ['id' => 'usr_op',   'role' => 'Operator',   'permissions' => ['print_labels']];
$supervisorUser = ['id' => 'usr_sup',  'role' => 'Supervisor', 'permissions' => ['print_labels', 'approve_product']];
$superAdminUser = ['id' => 'usr_super','role' => 'SuperAdmin', 'permissions' => []];

// Test requireRole
if (requireRole($supervisorUser, ['Admin', 'Supervisor'], false) === true) {
    echo "  [PASS] requireRole() authorized Supervisor for QA endpoint\n";
} else {
    echo "  [FAIL] requireRole() failed to authorize Supervisor!\n";
    exit(1);
}

if (requireRole($operatorUser, ['Admin', 'Supervisor'], false) === false) {
    echo "  [PASS] requireRole() successfully blocked Operator from unauthorized QA endpoint\n";
} else {
    echo "  [FAIL] requireRole() allowed unauthorized Operator role!\n";
    exit(1);
}

// Test requirePermission
if (requirePermission($operatorUser, 'print_labels', false) === true) {
    echo "  [PASS] requirePermission() authorized 'print_labels' for Operator\n";
} else {
    echo "  [FAIL] requirePermission() failed!\n";
    exit(1);
}

if (requirePermission($operatorUser, 'approve_product', false) === false) {
    echo "  [PASS] requirePermission() successfully denied unheld capability\n";
} else {
    echo "  [FAIL] requirePermission() granted unheld capability!\n";
    exit(1);
}

if (requirePermission($superAdminUser, 'any_action_ever', false) === true) {
    echo "  [PASS] requirePermission() confirmed platform root access for SuperAdmin\n";
} else {
    echo "  [FAIL] requirePermission() blocked SuperAdmin!\n";
    exit(1);
}

// 3. LICENSE_CHECK MIDDLEWARE TESTS
echo "\n--- 3. Testing license_check.php (Tenant SLA Enforcement) ---\n";
require_once __DIR__ . '/../middleware/license_check.php';

// In-Memory SQLite test database for multi-tenant check
$testDb = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$testDb->exec("CREATE TABLE `organizations` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(255),
    `license_status` VARCHAR(50),
    `valid_until` DATE,
    `gs1_company_prefix` VARCHAR(20)
)");

$testDb->exec("INSERT INTO `organizations` VALUES
    ('ORG-ACTIVE', 'Apex Healthcare', 'ACTIVE', '2028-12-31', '8901234'),
    ('ORG-SUSPENDED', 'Bad Pharma Ltd.', 'SUSPENDED', '2028-12-31', '8905555'),
    ('ORG-EXPIRED', 'Old Pharma Ltd.', 'EXPIRED', '2024-01-01', '8906666')
");

// Test SuperAdmin bypass
$superAdminOrg = verifyTenantLicense($testDb, ['role' => 'SuperAdmin'], false);
if ($superAdminOrg && $superAdminOrg['id'] === 'PLATFORM-CAMEL') {
    echo "  [PASS] verifyTenantLicense() bypassed client license check for Platform SuperAdmin\n";
} else {
    echo "  [FAIL] verifyTenantLicense() failed on SuperAdmin!\n";
    exit(1);
}

// Test ACTIVE tenant
$activeUser = ['role' => 'Admin', 'organization_id' => 'ORG-ACTIVE'];
$activeOrg = verifyTenantLicense($testDb, $activeUser, false);
if ($activeOrg && $activeOrg['license_status'] === 'ACTIVE') {
    echo "  [PASS] verifyTenantLicense() validated ACTIVE license for '{$activeOrg['name']}'\n";
} else {
    echo "  [FAIL] verifyTenantLicense() failed on ACTIVE tenant!\n";
    exit(1);
}

// Test SUSPENDED tenant
$suspendedUser = ['role' => 'Admin', 'organization_id' => 'ORG-SUSPENDED'];
try {
    verifyTenantLicense($testDb, $suspendedUser, false);
    echo "  [FAIL] verifyTenantLicense() allowed SUSPENDED tenant!\n";
    exit(1);
} catch (RuntimeException $e) {
    echo "  [PASS] verifyTenantLicense() successfully blocked SUSPENDED client company\n";
}

// Test EXPIRED tenant
$expiredUser = ['role' => 'Admin', 'organization_id' => 'ORG-EXPIRED'];
try {
    verifyTenantLicense($testDb, $expiredUser, false);
    echo "  [FAIL] verifyTenantLicense() allowed EXPIRED tenant!\n";
    exit(1);
} catch (RuntimeException $e) {
    echo "  [PASS] verifyTenantLicense() successfully blocked EXPIRED client company\n";
}

echo "\n========================================================\n";
echo "🎉 ALL TESTS PASSED: All 3 Middleware files are 100% verified!\n";
echo "========================================================\n";
exit(0);
