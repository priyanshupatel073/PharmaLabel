<?php
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();

// Set initial license states
$pdo->exec("UPDATE `organizations` SET `license_status` = 'ACTIVE', `valid_until` = '2027-12-31' WHERE `id` = 'ORG-APEX'");
$pdo->exec("UPDATE `organizations` SET `license_status` = 'EXPIRED', `valid_until` = '2025-12-31' WHERE `id` = 'ORG-SUNPHARMA'");
$pdo->exec("UPDATE `organizations` SET `license_status` = 'SUSPENDED', `valid_until` = '2025-10-31' WHERE `id` = 'ORG-CIPLA'");
$pdo->exec("UPDATE `users` SET `failed_login_attempts` = 0, `locked_until` = NULL");

function postJson($url, $data) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($res, true)];
}

echo "=== 1. Test Active License (Apex Healthcare) ===\n";
$apexRes = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'admin@apexpharma.com',
    'password' => 'Password@123',
    'organization_id' => 'ORG-APEX'
]);
echo "Apex HTTP {$apexRes['code']}: " . ($apexRes['data']['message'] ?? '') . "\n";

echo "\n=== 2. Test Expired License (Sun Pharma) ===\n";
$sunRes = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'admin@sunpharma.com',
    'password' => 'Password@123',
    'organization_id' => 'ORG-SUNPHARMA'
]);
echo "Sun Pharma HTTP {$sunRes['code']}: " . ($sunRes['data']['message'] ?? '') . "\n";

// Verify failed attempts for Sun Pharma user were NOT incremented
$stmtSun = $pdo->prepare("SELECT failed_login_attempts FROM users WHERE email = 'admin@sunpharma.com'");
$stmtSun->execute();
echo "Sun Pharma attempts in DB: " . (int)$stmtSun->fetchColumn() . " (MUST BE 0!)\n";

echo "\n=== 3. Test Suspended License (Cipla) ===\n";
$ciplaRes = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'admin@cipla.com',
    'password' => 'Password@123',
    'organization_id' => 'ORG-CIPLA'
]);
echo "Cipla HTTP {$ciplaRes['code']}: " . ($ciplaRes['data']['message'] ?? '') . "\n";

$stmtCipla = $pdo->prepare("SELECT failed_login_attempts FROM users WHERE email = 'admin@cipla.com'");
$stmtCipla->execute();
echo "Cipla attempts in DB: " . (int)$stmtCipla->fetchColumn() . " (MUST BE 0!)\n";

echo "\n=== 4. Test SuperAdmin Platform Login (Bypasses License Check) ===\n";
$superRes = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'superadmin@camelcomm.in',
    'password' => 'Password@123'
]);
echo "SuperAdmin HTTP {$superRes['code']}: " . ($superRes['data']['message'] ?? '') . " | Role: " . ($superRes['data']['data']['user']['role'] ?? '') . "\n";

echo "\n=== 5. SuperAdmin Activates Sun Pharma License ===\n";
$activateRes = postJson('http://127.0.0.1:8000/api/superadmin/licenses.php', [
    'organization_id' => 'ORG-SUNPHARMA',
    'license_status' => 'ACTIVE',
    'valid_until' => '2028-12-31'
]);
echo "SuperAdmin Update HTTP {$activateRes['code']}: " . ($activateRes['data']['message'] ?? '') . "\n";

echo "\n=== 6. Test Sun Pharma Login after SuperAdmin Activation ===\n";
$sunActiveRes = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'admin@sunpharma.com',
    'password' => 'Password@123',
    'organization_id' => 'ORG-SUNPHARMA'
]);
echo "Sun Pharma (Now Active) HTTP {$sunActiveRes['code']}: " . ($sunActiveRes['data']['message'] ?? '') . " | User: " . ($sunActiveRes['data']['data']['user']['name'] ?? '') . "\n";

// Reset Sun Pharma back to EXPIRED for clean user testing
$pdo->exec("UPDATE `organizations` SET `license_status` = 'EXPIRED', `valid_until` = '2025-12-31' WHERE `id` = 'ORG-SUNPHARMA'");
echo "\n--- Reset Sun Pharma back to EXPIRED for testing ---\n";
