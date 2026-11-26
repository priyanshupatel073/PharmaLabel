<?php
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();
$driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

// Ensure Sun Pharma & Cipla users exist in DB
$defaultHash = password_hash('Password@123', PASSWORD_BCRYPT);

$seedUsers = [
    [
        'id' => 'usr_sun_admin',
        'org_id' => 'ORG-SUNPHARMA',
        'name' => 'Rajesh Patel',
        'email' => 'admin@sunpharma.com',
        'pass' => $defaultHash,
        'role' => 'Admin',
        'dept' => 'Sun Pharma QA & IT Systems'
    ],
    [
        'id' => 'usr_sun_qa',
        'org_id' => 'ORG-SUNPHARMA',
        'name' => 'Meera Shah',
        'email' => 'qa.halol@sunpharma.com',
        'pass' => $defaultHash,
        'role' => 'Supervisor',
        'dept' => 'Sun Pharma Halol QA'
    ],
    [
        'id' => 'usr_cipla_admin',
        'org_id' => 'ORG-CIPLA',
        'name' => 'Sunil Deshmukh',
        'email' => 'admin@cipla.com',
        'pass' => $defaultHash,
        'role' => 'Admin',
        'dept' => 'Cipla Kurkumbh Serialization'
    ],
    [
        'id' => 'usr_cipla_reg',
        'org_id' => 'ORG-CIPLA',
        'name' => 'Pooja Kulkarni',
        'email' => 'it.regulatory@cipla.com',
        'pass' => $defaultHash,
        'role' => 'Supervisor',
        'dept' => 'Cipla Regulatory Compliance'
    ]
];

$insertSql = ($driver === 'sqlite')
    ? "INSERT OR IGNORE INTO `users` (`id`, `organization_id`, `name`, `email`, `password_hash`, `role`, `department`, `status`, `failed_login_attempts`) VALUES (:id, :org_id, :name, :email, :pass, :role, :dept, 'ACTIVE', 0)"
    : "INSERT IGNORE INTO `users` (`id`, `organization_id`, `name`, `email`, `password_hash`, `role`, `department`, `status`, `failed_login_attempts`) VALUES (:id, :org_id, :name, :email, :pass, :role, :dept, 'ACTIVE', 0)";

$stmt = $pdo->prepare($insertSql);

foreach ($seedUsers as $u) {
    try {
        $stmt->execute([
            ':id' => $u['id'],
            ':org_id' => $u['org_id'],
            ':name' => $u['name'],
            ':email' => $u['email'],
            ':pass' => $u['pass'],
            ':role' => $u['role'],
            ':dept' => $u['dept']
        ]);
    } catch (Exception $e) {
        // Already exists or ignore
    }
}

// Reset all lockouts
$pdo->exec("UPDATE users SET failed_login_attempts = 0, locked_until = NULL");

function testLogin($email, $password, $orgId = null) {
    $payload = json_encode(['email' => $email, 'password' => $password, 'organization_id' => $orgId]);
    $ch = curl_init('http://127.0.0.1:8000/api/auth/login.php');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($res, true)];
}

echo "--- 1. Testing SuperAdmin Login ---\n";
$superRes = testLogin('superadmin@camelcomm.in', 'Password@123');
echo "SuperAdmin HTTP {$superRes['code']}: " . ($superRes['data']['message'] ?? '') . " | Role: " . ($superRes['data']['data']['user']['role'] ?? '') . "\n";

echo "\n--- 2. Testing Sun Pharma Login ---\n";
$sunRes = testLogin('admin@sunpharma.com', 'Password@123', 'ORG-SUNPHARMA');
echo "Sun Pharma HTTP {$sunRes['code']}: " . ($sunRes['data']['message'] ?? '') . " | User: " . ($sunRes['data']['data']['user']['name'] ?? '') . "\n";

echo "\n--- 3. Testing Apex Admin Lockout (5 failed attempts) ---\n";
for ($i = 1; $i <= 5; $i++) {
    $fail = testLogin('admin@apexpharma.com', 'WrongPass' . $i, 'ORG-APEX');
    echo "Attempt $i -> HTTP {$fail['code']}: " . ($fail['data']['message'] ?? '') . "\n";
}

echo "\n--- 4. Verify Apex is Locked, but SuperAdmin & Sun Pharma are STILL UNLOCKED ---\n";
$apexLocked = testLogin('admin@apexpharma.com', 'Password@123', 'ORG-APEX');
echo "Apex Admin (Locked): HTTP {$apexLocked['code']} -> " . ($apexLocked['data']['message'] ?? '') . "\n";

$superStillWorks = testLogin('superadmin@camelcomm.in', 'Password@123');
echo "SuperAdmin (Should Work!): HTTP {$superStillWorks['code']} -> " . ($superStillWorks['data']['message'] ?? '') . "\n";

$sunStillWorks = testLogin('admin@sunpharma.com', 'Password@123', 'ORG-SUNPHARMA');
echo "Sun Pharma (Should Work!): HTTP {$sunStillWorks['code']} -> " . ($sunStillWorks['data']['message'] ?? '') . "\n";

// Reset for clean slate
$pdo->exec("UPDATE users SET failed_login_attempts = 0, locked_until = NULL");
echo "\n--- Clean reset done ---\n";
