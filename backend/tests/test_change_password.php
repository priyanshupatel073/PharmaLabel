<?php
/**
 * ============================================================================
 * TEST SUITE: 21 CFR PART 11 PASSWORD CHANGE API
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/mailer.php';

echo "=== 1. Setup Test User for Password Change ===" . PHP_EOL;

$pdo = getDbConnection();
$testEmail = 'test.pwd@pharmalabel.local';
$tempPass = generateSecureTempPassword(10);
$tempHash = password_hash($tempPass, PASSWORD_BCRYPT);
$driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

// Ensure test org exists
$orgInsert = ($driver === 'sqlite')
    ? "INSERT OR IGNORE INTO `organizations` (id, name, plant_location, contact_email, gs1_company_prefix, edition, license_status, valid_until) VALUES ('ORG-TEST-PWD', 'Test Pwd Pharma', 'Site 1', 'test@pwd.local', '8909999', 'Enterprise Unlimited Traceability', 'ACTIVE', '2030-12-31')"
    : "INSERT IGNORE INTO `organizations` (id, name, plant_location, contact_email, gs1_company_prefix, edition, license_status, valid_until) VALUES ('ORG-TEST-PWD', 'Test Pwd Pharma', 'Site 1', 'test@pwd.local', '8909999', 'Enterprise Unlimited Traceability', 'ACTIVE', '2030-12-31')";
$pdo->exec($orgInsert);

// Delete old test user if exists
$pdo->prepare("DELETE FROM `users` WHERE email = :email")->execute([':email' => $testEmail]);

// Insert user with password_changed_at = NULL (temporary password state)
$stmt = $pdo->prepare("
    INSERT INTO `users` (
        id, organization_id, name, email, password_hash, role,
        department, permissions, status, failed_login_attempts, password_changed_at
    ) VALUES (
        'usr_test_pwd', 'ORG-TEST-PWD', 'Test Password Admin', :email, :pass, 'Admin',
        'Quality Assurance', '[\"manage_users\"]', 'ACTIVE', 0, NULL
    )
");
$stmt->execute([':email' => $testEmail, ':pass' => $tempHash]);
echo "Test user created with temp password: $tempPass" . PHP_EOL;

function postRequest(string $url, array $data): array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $httpCode, 'body' => json_decode((string)$response, true)];
}

echo PHP_EOL . "=== 2. Test Incorrect Current Password ===" . PHP_EOL;
$res1 = postRequest('http://127.0.0.1:8000/api/auth/change_password.php', [
    'email' => $testEmail,
    'current_password' => 'WrongPass@123',
    'new_password' => 'ValidPass@2026',
    'confirm_password' => 'ValidPass@2026'
]);
echo "Expected 401: HTTP {$res1['status']} | Message: {$res1['body']['message']}" . PHP_EOL;
assert($res1['status'] === 401);

echo PHP_EOL . "=== 3. Test Weak New Password (No Symbol) ===" . PHP_EOL;
$res2 = postRequest('http://127.0.0.1:8000/api/auth/change_password.php', [
    'email' => $testEmail,
    'current_password' => $tempPass,
    'new_password' => 'NoSpecial123',
    'confirm_password' => 'NoSpecial123'
]);
echo "Expected 422: HTTP {$res2['status']} | Complexity Error: " . json_encode($res2['body']['errors']) . PHP_EOL;
assert($res2['status'] === 422);

echo PHP_EOL . "=== 4. Test Mismatched Confirm Password ===" . PHP_EOL;
$res3 = postRequest('http://127.0.0.1:8000/api/auth/change_password.php', [
    'email' => $testEmail,
    'current_password' => $tempPass,
    'new_password' => 'ValidPass@2026',
    'confirm_password' => 'DifferentPass@2026'
]);
echo "Expected 422: HTTP {$res3['status']} | Error: " . json_encode($res3['body']['errors']) . PHP_EOL;
assert($res3['status'] === 422);

echo PHP_EOL . "=== 5. Test Successful Permanent Password Establishment ===" . PHP_EOL;
$permanentPass = 'Permanent@Secure2026!';
$res4 = postRequest('http://127.0.0.1:8000/api/auth/change_password.php', [
    'email' => $testEmail,
    'current_password' => $tempPass,
    'new_password' => $permanentPass,
    'confirm_password' => $permanentPass
]);
echo "Expected 200: HTTP {$res4['status']} | Message: {$res4['body']['message']}" . PHP_EOL;
assert($res4['status'] === 200);
assert($res4['body']['data']['must_change_password'] === false);

echo PHP_EOL . "=== 6. Verify Old Temp Password is now Invalid ===" . PHP_EOL;
$res5 = postRequest('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => $testEmail,
    'password' => $tempPass
]);
echo "Expected 401: HTTP {$res5['status']} | Old temp password rejected." . PHP_EOL;
assert($res5['status'] === 401);

echo PHP_EOL . "=== 7. Verify New Permanent Password Authenticates Cleanly ===" . PHP_EOL;
$res6 = postRequest('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => $testEmail,
    'password' => $permanentPass
]);
echo "Expected 200: HTTP {$res6['status']} | User: {$res6['body']['data']['user']['name']} | must_change_password: " . json_encode($res6['body']['data']['user']['must_change_password']) . PHP_EOL;
assert($res6['status'] === 200);
assert($res6['body']['data']['user']['must_change_password'] === false);

echo PHP_EOL . "=== 8. Verify Audit Trail Contains PASSWORD_CHANGED Record ===" . PHP_EOL;
$auditStmt = $pdo->prepare("SELECT action, module, reason FROM `audit_logs` WHERE action = 'PASSWORD_CHANGED' ORDER BY created_at DESC LIMIT 1");
$auditStmt->execute();
$audit = $auditStmt->fetch(PDO::FETCH_ASSOC);
echo "Audit Log Action: {$audit['action']} | Module: {$audit['module']}" . PHP_EOL;
assert($audit['action'] === 'PASSWORD_CHANGED');

echo PHP_EOL . "All 21 CFR Part 11 Password Change & First-Login Reset tests passed successfully!" . PHP_EOL;
