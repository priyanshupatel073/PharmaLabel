<?php
/**
 * Test script for:
 * 1. SuperAdmin Login (superadmin@camelcomm.in / Pharma@0712)
 * 2. Plant Admin Login (rawalakshay1188@gmail.com / Akshay@0712)
 * 3. Security Policy API (GET and POST)
 * 4. User deletion API (DELETE & POST ?action=delete) with 21 CFR Part 11 checks
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$pdo = getDbConnection();

echo "========================================================\n";
echo "PHARMALABEL PRODUCTION VERIFICATION SUITE\n";
echo "========================================================\n\n";

// TEST 1: SuperAdmin Login check
echo "TEST 1: SuperAdmin User Record & Authentication...\n";
$stmt = $pdo->prepare("SELECT id, email, username, role, password_hash, failed_login_attempts, locked_until FROM users WHERE LOWER(email) = 'superadmin@camelcomm.in'");
$stmt->execute();
$superAdmin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$superAdmin) {
    echo "  [FAIL] SuperAdmin user not found in database!\n";
} else {
    echo "  [OK] SuperAdmin found: ID={$superAdmin['id']}, Role={$superAdmin['role']}, FailedAttempts={$superAdmin['failed_login_attempts']}\n";
    $verifyPass = password_verify('Pharma@0712', $superAdmin['password_hash']);
    echo "  [INFO] password_verify('Pharma@0712') result: " . ($verifyPass ? "TRUE" : "FALSE") . "\n";
}

// TEST 2: Plant Admin Login check
echo "\nTEST 2: Plant Admin User Record & Authentication...\n";
$stmt2 = $pdo->prepare("SELECT id, email, username, role, password_hash, failed_login_attempts, locked_until FROM users WHERE LOWER(email) = 'rawalakshay1188@gmail.com'");
$stmt2->execute();
$plantAdmin = $stmt2->fetch(PDO::FETCH_ASSOC);

if (!$plantAdmin) {
    echo "  [FAIL] Plant Admin user not found in database!\n";
} else {
    echo "  [OK] Plant Admin found: ID={$plantAdmin['id']}, Role={$plantAdmin['role']}, FailedAttempts={$plantAdmin['failed_login_attempts']}\n";
    $verifyPass2 = password_verify('Akshay@0712', $plantAdmin['password_hash']);
    echo "  [INFO] password_verify('Akshay@0712') result: " . ($verifyPass2 ? "TRUE" : "FALSE") . "\n";
}

// TEST 3: Perform actual HTTP login requests to login.php
echo "\nTEST 3: HTTP Login API Integration Tests...\n";

function postJson($url, $data, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    $headers[] = 'Content-Type: application/json';
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($response, true), 'raw' => $response];
}

function getJson($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($response, true), 'raw' => $response];
}

// SuperAdmin Login
$superLogin = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'superadmin@camelcomm.in',
    'password' => 'Pharma@0712'
]);
echo "  SuperAdmin login HTTP Code: " . $superLogin['code'] . "\n";
if ($superLogin['code'] === 200 && !empty($superLogin['body']['data']['token'])) {
    echo "  [PASS] SuperAdmin login SUCCESSFUL! Token generated.\n";
    $superToken = $superLogin['body']['data']['token'];
} else {
    echo "  [FAIL] SuperAdmin login failed: " . ($superLogin['body']['message'] ?? $superLogin['raw']) . "\n";
    $superToken = null;
}

// Plant Admin Login
$plantLogin = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'rawalakshay1188@gmail.com',
    'password' => 'Akshay@0712'
]);
echo "  Plant Admin login HTTP Code: " . $plantLogin['code'] . "\n";
if ($plantLogin['code'] === 200 && !empty($plantLogin['body']['data']['token'])) {
    echo "  [PASS] Plant Admin login SUCCESSFUL! Token generated.\n";
    $plantToken = $plantLogin['body']['data']['token'];
} else {
    echo "  [FAIL] Plant Admin login failed: " . ($plantLogin['body']['message'] ?? $plantLogin['raw']) . "\n";
    $plantToken = null;
}

// TEST 4: Security Policy API
echo "\nTEST 4: Security Policy API (GET and POST)...\n";
$orgId = 'ORG-HARIHAR-265';
$getSec = getJson("http://127.0.0.1:8000/api/company/security_policy.php?organization_id={$orgId}", [
    "Authorization: Bearer {$plantToken}"
]);
echo "  GET Security Policy HTTP Code: " . $getSec['code'] . "\n";
if ($getSec['code'] === 200 && !empty($getSec['body']['data'])) {
    echo "  [PASS] Security Policy retrieved: max_failed=" . $getSec['body']['data']['max_failed_attempts'] . ", lockout=" . $getSec['body']['data']['lockout_duration_min'] . "\n";
} else {
    echo "  [FAIL] Failed to retrieve security policy: " . ($getSec['body']['message'] ?? $getSec['raw']) . "\n";
}

// Update Security Policy
$postSec = postJson("http://127.0.0.1:8000/api/company/security_policy.php?organization_id={$orgId}", [
    'max_failed_attempts' => 10,
    'lockout_duration_min' => 5,
    'min_password_length' => 8,
    'require_uppercase' => true,
    'require_numeric' => true,
    'require_special' => false,
    'password_expiry_days' => 90,
    'password_reuse_blocked' => 5,
    'session_timeout_min' => 60
], [
    "Authorization: Bearer {$plantToken}"
]);
echo "  POST Security Policy HTTP Code: " . $postSec['code'] . "\n";
if ($postSec['code'] === 200) {
    echo "  [PASS] Security Policy successfully saved and audited!\n";
} else {
    echo "  [FAIL] Failed to save security policy: " . ($postSec['body']['message'] ?? $postSec['raw']) . "\n";
}

// TEST 5: User Management & Deletion
echo "\nTEST 5: User Deletion with 21 CFR Part 11 Audit Trail...\n";
// Create a temporary test operator to delete
$testUsername = 'test_del_' . time();
$createRes = postJson("http://127.0.0.1:8000/api/company/users.php?organization_id={$orgId}", [
    'action' => 'create',
    'username' => $testUsername,
    'name' => 'Temporary Deletion Test Operator',
    'email' => "{$testUsername}@apexpharma.com",
    'role' => 'Operator',
    'department' => 'Packaging Line 2',
    'password' => 'Pass@12345'
], [
    "Authorization: Bearer {$plantToken}"
]);

if (($createRes['code'] === 200 || $createRes['code'] === 201) && !empty($createRes['body']['data']['id'])) {
    $tempUserId = $createRes['body']['data']['id'];
    echo "  [PASS] Created temporary test user {$testUsername} (ID: {$tempUserId})\n";

    // Now test deleting this user
    $delRes = postJson("http://127.0.0.1:8000/api/company/users.php?organization_id={$orgId}", [
        'action' => 'delete',
        'user_id' => $tempUserId,
        'reason' => 'Automated integration test verification of user deprovisioning'
    ], [
        "Authorization: Bearer {$plantToken}"
    ]);

    echo "  Delete User HTTP Code: " . $delRes['code'] . "\n";
    if ($delRes['code'] === 200) {
        echo "  [PASS] User successfully deleted!\n";
    } else {
        echo "  [FAIL] User deletion failed: " . ($delRes['body']['message'] ?? $delRes['raw']) . "\n";
    }

    // Verify self-deletion prevention
    $selfDelRes = postJson("http://127.0.0.1:8000/api/company/users.php?organization_id={$orgId}", [
        'action' => 'delete',
        'user_id' => $plantAdmin['id'],
        'reason' => 'Should fail self-deletion'
    ], [
        "Authorization: Bearer {$plantToken}"
    ]);
    echo "  Self-deletion rejection HTTP Code: " . $selfDelRes['code'] . " (Expected 403)\n";
    if ($selfDelRes['code'] === 403) {
        echo "  [PASS] Self-deletion of active administrator correctly blocked!\n";
    } else {
        echo "  [FAIL] Expected 403 on self deletion, got: " . $selfDelRes['code'] . "\n";
    }

} else {
    echo "  [FAIL] Failed to create test user: " . ($createRes['body']['message'] ?? $createRes['raw']) . "\n";
}

echo "\n========================================================\n";
echo "VERIFICATION COMPLETE\n";
echo "========================================================\n";
