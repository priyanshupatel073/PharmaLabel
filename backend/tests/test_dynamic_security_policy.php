<?php
/**
 * ============================================================================
 * TEST SUITE: End-to-End Dynamic Security Policy & 21 CFR Part 11 Enforcement
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$pdo = getDbConnection();

echo "======================================================================\n";
echo "PHARMALABEL PRO - DYNAMIC SECURITY POLICY VERIFICATION SUITE\n";
echo "======================================================================\n\n";

$orgId = 'ORG-HARIHAR-265';

// 1. Ensure Policy in Database matches User Screenshot:
// Max attempts: 10, Lockout: 5 min, Min length: 8, Upper: 1, Numeric: 1, Special: 0, Expiry: 90, Reuse: 5, Timeout: 60
$stmt = $pdo->prepare("UPDATE `security_policies` SET 
    max_failed_attempts = 10,
    lockout_duration_min = 5,
    min_password_length = 8,
    require_uppercase = 1,
    require_numeric = 1,
    require_special = 0,
    password_expiry_days = 90,
    password_reuse_blocked = 5,
    session_timeout_min = 60
    WHERE organization_id = :org_id");
$stmt->execute([':org_id' => $orgId]);

echo "[Test 1] Verify Database Policy for ORG-HARIHAR-265\n";
$stmtCheck = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = :org_id");
$stmtCheck->execute([':org_id' => $orgId]);
$policy = $stmtCheck->fetch(PDO::FETCH_ASSOC);

assert((int)$policy['max_failed_attempts'] === 10, 'max_failed_attempts should be 10');
assert((int)$policy['lockout_duration_min'] === 5, 'lockout_duration_min should be 5');
assert((int)$policy['min_password_length'] === 8, 'min_password_length should be 8');
assert((int)$policy['require_uppercase'] === 1, 'require_uppercase should be 1');
assert((int)$policy['require_numeric'] === 1, 'require_numeric should be 1');
assert((int)$policy['require_special'] === 0, 'require_special should be 0');
assert((int)$policy['password_reuse_blocked'] === 5, 'password_reuse_blocked should be 5');
echo "  ✓ Policy row confirmed: 10 attempts, 5 min lockout, 8 min length, no special char required.\n\n";

// 2. Setup Dedicated Test User for Policy Tests
$testEmail = 'security_policy_tester@harihar.com';
$pdo->prepare("DELETE FROM `users` WHERE email = :email")->execute([':email' => $testEmail]);

$initialPass = 'Initial@123';
$initialHash = password_hash($initialPass, PASSWORD_BCRYPT);
$testUserId = 'USR-SEC-TEST-' . time();

$stmtUser = $pdo->prepare("INSERT INTO `users` (id, organization_id, name, email, password_hash, role, department, status, failed_login_attempts) 
    VALUES (:id, :org_id, 'Policy Tester', :email, :hash, 'Operator', 'Testing', 'ACTIVE', 0)");
$stmtUser->execute([
    ':id'     => $testUserId,
    ':org_id' => $orgId,
    ':email'  => $testEmail,
    ':hash'   => $initialHash
]);

$pdo->prepare("DELETE FROM `password_history` WHERE user_id = :uid")->execute([':uid' => $testUserId]);
$pdo->prepare("INSERT INTO `password_history` (user_id, password_hash) VALUES (:uid, :hash)")->execute([':uid' => $testUserId, ':hash' => $initialHash]);

// Create session token for test user
$token = generateToken(['id' => $testUserId, 'email' => $testEmail, 'role' => 'Operator', 'organization_id' => $orgId], 3600);

echo "[Test 2] Password Change API - Allowed Without Special Character (require_special = 0)\n";
// Attempt to change password to 'Harihar2026' (NO special chars) -> MUST SUCCEED!
$ch = curl_init('http://127.0.0.1:8000/api/auth/change_password.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer $token"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'user_id'          => $testUserId,
        'email'            => $testEmail,
        'current_password' => $initialPass,
        'new_password'     => 'Harihar2026',
        'confirm_password' => 'Harihar2026'
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$resJson = json_decode((string)$resp, true);
if ($httpCode === 200 && ($resJson['success'] ?? false)) {
    echo "  ✓ Password without special characters ('Harihar2026') ACCEPTED successfully!\n\n";
} else {
    echo "  ✗ FAILED: Password rejected! Response: $resp\n\n";
    exit(1);
}

echo "[Test 3] Password Change API - Rejected When Shorter than min_password_length (8)\n";
$ch = curl_init('http://127.0.0.1:8000/api/auth/change_password.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer $token"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'user_id'          => $testUserId,
        'email'            => $testEmail,
        'new_password'     => 'Hari12',
        'confirm_password' => 'Hari12'
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$resJson = json_decode((string)$resp, true);

if ($httpCode === 422 || $httpCode === 400) {
    echo "  ✓ Short password ('Hari12') rejected: " . ($resJson['message'] ?? 'Validation error') . "\n\n";
} else {
    echo "  ✗ FAILED: Expected rejection for short password! Code: $httpCode, Resp: $resp\n\n";
    exit(1);
}

echo "[Test 4] Password Change API - Password Reuse Prevention (Last 5 Passwords Blocked)\n";
// Attempt to change password back to 'Initial@123' -> MUST BE REJECTED!
$ch = curl_init('http://127.0.0.1:8000/api/auth/change_password.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer $token"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'user_id'          => $testUserId,
        'email'            => $testEmail,
        'new_password'     => $initialPass,
        'confirm_password' => $initialPass
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$resJson = json_decode((string)$resp, true);

if ($httpCode === 422 && strpos((string)($resJson['message'] ?? ''), 'reuse') !== false) {
    echo "  ✓ Reusing previous password blocked: " . $resJson['message'] . "\n\n";
} else {
    echo "  ✗ FAILED: Expected password reuse block! Code: $httpCode, Resp: $resp\n\n";
    exit(1);
}

echo "[Test 5] Login Brute-Force Lockout - 10 Attempts Threshold & 5 Min Lockout\n";
// Fail login 9 times
for ($i = 1; $i <= 9; $i++) {
    $ch = curl_init('http://127.0.0.1:8000/api/auth/login.php');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'email'           => $testEmail,
            'password'        => 'WrongPassword' . $i,
            'organization_id' => $orgId
        ])
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $resJson = json_decode((string)$resp, true);
    
    assert($httpCode === 401, "Attempt $i should return 401");
    $expectedLeft = 10 - $i;
    assert(($resJson['data']['attempts_left'] ?? -1) === $expectedLeft, "Attempts left should be $expectedLeft on attempt $i");
}
echo "  ✓ 9 failed attempts cleanly counted down from 10 to 1.\n";

// 10th failed attempt -> MUST LOCK ACCOUNT FOR 5 MINUTES (300 seconds)!
$ch = curl_init('http://127.0.0.1:8000/api/auth/login.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'email'           => $testEmail,
        'password'        => 'WrongPassword10',
        'organization_id' => $orgId
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$resJson = json_decode((string)$resp, true);

assert($httpCode === 403, '10th attempt should return 403 lockout');
assert(($resJson['data']['locked'] ?? false) === true, 'Lockout flag should be true');
$remSec = (int)($resJson['data']['remaining_seconds'] ?? 0);
assert($remSec >= 290 && $remSec <= 300, "Lockout duration should be 300 seconds (5 min), got: $remSec");
echo "  ✓ 10th attempt triggered 5-minute lockout (remaining seconds: $remSec)!\n";
echo "  ✓ Lockout message: " . ($resJson['message'] ?? '') . "\n\n";

// Cleanup test user
$pdo->prepare("DELETE FROM `users` WHERE id = :id")->execute([':id' => $testUserId]);
$pdo->prepare("DELETE FROM `password_history` WHERE user_id = :uid")->execute([':uid' => $testUserId]);

echo "======================================================================\n";
echo "ALL SECURITY POLICY TESTS PASSED CLEANLY!\n";
echo "======================================================================\n";
