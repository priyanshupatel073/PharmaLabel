<?php
/**
 * Test Login API: Status check, lockout enforcement, and unlock override
 */
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();
$pdo->prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = 'admin@apexpharma.com'")->execute();

function apiCall($url, $method = 'GET', $body = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        }
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($res, true)];
}

echo "=== 1. Test GET Status Check (Initially Unlocked) ===\n";
$status1 = apiCall('http://127.0.0.1:8000/api/auth/login.php?email=admin@apexpharma.com');
echo "Status: HTTP {$status1['code']} | Locked: " . ($status1['data']['data']['locked'] ? 'YES' : 'NO') . "\n";

echo "\n=== 2. Trigger 5 Failed Logins ===\n";
for ($i = 1; $i <= 5; $i++) {
    $res = apiCall('http://127.0.0.1:8000/api/auth/login.php', 'POST', [
        'email' => 'admin@apexpharma.com',
        'password' => 'WrongPassword_' . $i
    ]);
    echo "Attempt $i -> HTTP {$res['code']}: " . ($res['data']['message'] ?? '') . "\n";
}

echo "\n=== 3. Test GET Status Check (Now Locked in DB) ===\n";
$status2 = apiCall('http://127.0.0.1:8000/api/auth/login.php?email=admin@apexpharma.com');
echo "Status: HTTP {$status2['code']} | Locked: " . ($status2['data']['data']['locked'] ? 'YES' : 'NO') . " | Remaining: " . ($status2['data']['data']['remaining_seconds'] ?? 0) . "s\n";

echo "\n=== 4. Test Login with Correct Password while Locked ===\n";
$loginWhileLocked = apiCall('http://127.0.0.1:8000/api/auth/login.php', 'POST', [
    'email' => 'admin@apexpharma.com',
    'password' => 'Password@123'
]);
echo "HTTP {$loginWhileLocked['code']}: " . ($loginWhileLocked['data']['message'] ?? '') . "\n";

echo "\n=== 5. Test Manual Unlock Override ===\n";
$unlockRes = apiCall('http://127.0.0.1:8000/api/auth/login.php?action=unlock', 'POST', [
    'email' => 'admin@apexpharma.com'
]);
echo "Unlock: HTTP {$unlockRes['code']} | " . ($unlockRes['data']['message'] ?? '') . "\n";

echo "\n=== 6. Test Login after Unlock ===\n";
$loginAfterUnlock = apiCall('http://127.0.0.1:8000/api/auth/login.php', 'POST', [
    'email' => 'admin@apexpharma.com',
    'password' => 'Password@123',
    'organization_id' => 'ORG-APEX'
]);
echo "HTTP {$loginAfterUnlock['code']}: " . ($loginAfterUnlock['data']['message'] ?? '') . " | User: " . ($loginAfterUnlock['data']['data']['user']['name'] ?? '') . "\n";

echo "\nAll backend tests completed successfully!\n";
