<?php
declare(strict_types=1);

require 'backend/config/database.php';

echo "========================================================\n";
echo "21 CFR PART 11 ZERO-KNOWLEDGE STRICT AUTHENTICATION TEST\n";
echo "========================================================\n\n";

$pdo = getDbConnection();

function testLogin(string $email, string $password, string $orgId = 'ORG-HARIHAR-265'): array {
    $url = 'http://127.0.0.1:8000/api/auth/login.php';
    $ch = curl_init($url);
    $payload = json_encode([
        'email' => $email,
        'password' => $password,
        'organization_id' => $orgId
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $httpCode, 'body' => json_decode((string)$response, true)];
}

// Reset any failed attempts before test
$pdo->exec("UPDATE `users` SET failed_login_attempts = 0, locked_until = NULL WHERE organization_id = 'ORG-HARIHAR-265'");

// TEST 1: Admin with correct password
$res1 = testLogin('rawalakshay1188@gmail.com', 'Akshay@0712');
echo "[TEST 1] Admin login with valid credentials (Akshay@0712):\n";
echo "  HTTP Code: {$res1['code']}\n";
echo "  Success: " . ($res1['body']['success'] ? 'TRUE' : 'FALSE') . "\n";
if ($res1['code'] === 200 && $res1['body']['success']) {
    echo "  PASS: Admin logged in successfully.\n\n";
} else {
    echo "  FAIL: Admin login failed!\n";
    exit(1);
}

// TEST 2: Admin with WRONG password (e.g. Supervisor password or Password@123)
$res2 = testLogin('rawalakshay1188@gmail.com', 'WrongSupervisorPass@999');
echo "[TEST 2] Admin login with INCORRECT password (WrongSupervisorPass@999):\n";
echo "  HTTP Code: {$res2['code']}\n";
echo "  Success: " . ($res2['body']['success'] ? 'TRUE' : 'FALSE') . "\n";
echo "  Message: " . ($res2['body']['message'] ?? '') . "\n";
if ($res2['code'] === 401 && !$res2['body']['success']) {
    echo "  PASS: Incorrect password strictly rejected with 401!\n\n";
} else {
    echo "  FAIL: Security breach! Wrong password was accepted!\n";
    exit(1);
}

// TEST 3: Verify Admin's hash in database was NOT corrupted or overwritten
$stmt = $pdo->query("SELECT password_hash, failed_login_attempts FROM users WHERE email = 'rawalakshay1188@gmail.com'");
$adminRow = $stmt->fetch(PDO::FETCH_ASSOC);
echo "[TEST 3] Admin hash integrity check:\n";
echo "  Failed attempts recorded: {$adminRow['failed_login_attempts']} of 5\n";
if (password_verify('Akshay@0712', $adminRow['password_hash'])) {
    echo "  PASS: Original admin hash is intact and unmodified.\n\n";
} else {
    echo "  FAIL: Admin hash was modified by wrong password attempt!\n";
    exit(1);
}

// TEST 4: Another arbitrary password test for Admin (Password@123)
$res4 = testLogin('rawalakshay1188@gmail.com', 'Password@123');
echo "[TEST 4] Admin login with generic Password@123:\n";
echo "  HTTP Code: {$res4['code']}\n";
if ($res4['code'] === 401) {
    echo "  PASS: Generic test password strictly rejected for Admin account.\n\n";
} else {
    echo "  FAIL: Generic test password was accepted for Admin!\n";
    exit(1);
}

// Reset attempts again
$pdo->exec("UPDATE `users` SET failed_login_attempts = 0, locked_until = NULL WHERE organization_id = 'ORG-HARIHAR-265'");

echo "========================================================\n";
echo "ALL STRICT AUTHENTICATION TESTS PASSED WITH ZERO BREACH!\n";
echo "========================================================\n";
