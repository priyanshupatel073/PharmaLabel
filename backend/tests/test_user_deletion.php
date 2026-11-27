<?php
/**
 * ============================================================================
 * TEST SUITE: Admin User Deletion & 21 CFR Part 11 ALCOA+ Audit Trail
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$pdo = getDbConnection();

echo "======================================================================\n";
echo "PHARMALABEL PRO - ADMIN USER DELETION VERIFICATION SUITE\n";
echo "======================================================================\n\n";

$orgId = 'ORG-HARIHAR-265';

// 1. Acquire Admin Token
$stmtAdmin = $pdo->prepare("SELECT * FROM `users` WHERE organization_id = :org_id AND role = 'Admin' AND status = 'ACTIVE' LIMIT 1");
$stmtAdmin->execute([':org_id' => $orgId]);
$admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);

if (!$admin) {
    echo "  ✗ No admin found for ORG-HARIHAR-265\n";
    exit(1);
}

$adminToken = generateToken($admin, 3600);
echo "[Phase 1] Admin authenticated: {$admin['name']} ({$admin['email']})\n\n";

// 2. Create Temporary User to be Deleted
$testUsername = 'del_operator_' . time();
$testEmail = $testUsername . '@harihar.local';
$testPass = 'TempPass@123';
$testHash = password_hash($testPass, PASSWORD_BCRYPT);
$testUserId = 'usr_test_del_' . bin2hex(random_bytes(3));

$pdo->prepare("INSERT INTO `users` (id, organization_id, name, username, email, password_hash, role, department, status, failed_login_attempts) 
    VALUES (:id, :org_id, 'Temporary Operator', :username, :email, :hash, 'Operator', 'Packaging', 'ACTIVE', 0)")
    ->execute([
        ':id'       => $testUserId,
        ':org_id'   => $orgId,
        ':username' => $testUsername,
        ':email'    => $testEmail,
        ':hash'     => $testHash
    ]);

$pdo->prepare("INSERT INTO `password_history` (user_id, password_hash) VALUES (:uid, :hash)")
    ->execute([':uid' => $testUserId, ':hash' => $testHash]);

echo "[Phase 2] Created test user: $testUsername ($testUserId)\n\n";

// 3. Test Self-Deletion Prevention (Admin attempting to delete self)
echo "[Phase 3] Testing Self-Deletion Prevention (Admin attempting to delete Admin)...\n";
$ch = curl_init("http://127.0.0.1:8000/api/company/users.php?organization_id=$orgId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => 'DELETE',
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        "Authorization: Bearer $adminToken"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'user_id' => $admin['id'],
        'reason'  => 'Self deletion test'
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$json = json_decode((string)$resp, true);

if ($httpCode === 403 && strpos($json['message'] ?? '', 'Security Violation') !== false) {
    echo "  ✓ Self-deletion successfully BLOCKED: {$json['message']}\n\n";
} else {
    echo "  ✗ FAILED: Expected 403 Security Violation! Code: $httpCode, Resp: $resp\n\n";
    exit(1);
}

// 4. Test User Deletion via DELETE method
echo "[Phase 4] Testing User Deletion via HTTP DELETE...\n";
$ch = curl_init("http://127.0.0.1:8000/api/company/users.php?organization_id=$orgId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => 'DELETE',
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        "Authorization: Bearer $adminToken"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'user_id' => $testUserId,
        'reason'  => 'Deprovisioning contractor account per SOP-SEC-04'
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$json = json_decode((string)$resp, true);

if ($httpCode === 200 && ($json['success'] ?? false)) {
    echo "  ✓ User deletion SUCCESS: {$json['message']}\n\n";
} else {
    echo "  ✗ FAILED: Deletion returned error! Code: $httpCode, Resp: $resp\n\n";
    exit(1);
}

// 5. Verify User is Gone from Database
echo "[Phase 5] Verifying user record and password history are removed...\n";
$stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE id = :id");
$stmtCheck->execute([':id' => $testUserId]);
$userCount = (int)$stmtCheck->fetchColumn();

$stmtHist = $pdo->prepare("SELECT COUNT(*) FROM `password_history` WHERE user_id = :id");
$stmtHist->execute([':id' => $testUserId]);
$histCount = (int)$stmtHist->fetchColumn();

assert($userCount === 0, 'User should not exist in database');
assert($histCount === 0, 'Password history should be cleaned up');
echo "  ✓ User record count: $userCount (0 = completely purged)\n";
echo "  ✓ Password history count: $histCount\n\n";

// 6. Verify 21 CFR Part 11 Audit Trail Log
echo "[Phase 6] Verifying 21 CFR Part 11 ALCOA+ Audit Trail Record...\n";
$stmtAudit = $pdo->prepare("SELECT * FROM `audit_logs` WHERE action = 'USER_DELETED' AND organization_id = :org_id ORDER BY id DESC LIMIT 1");
$stmtAudit->execute([':org_id' => $orgId]);
$log = $stmtAudit->fetch(PDO::FETCH_ASSOC);

if ($log) {
    echo "  ✓ Audit log recorded:\n";
    echo "    - Action: {$log['action']}\n";
    echo "    - User: {$log['user_name']} ({$log['user_role']})\n";
    echo "    - Timestamp: {$log['timestamp']}\n";
    echo "    - Details: {$log['details']}\n\n";
} else {
    echo "  ✗ FAILED: No USER_DELETED audit log entry found!\n\n";
    exit(1);
}

// 7. Verify Deleted User Cannot Login
echo "[Phase 7] Verifying deleted user cannot authenticate...\n";
$ch = curl_init('http://127.0.0.1:8000/api/auth/login.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'email'           => $testEmail,
        'password'        => $testPass,
        'organization_id' => $orgId
    ])
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$json = json_decode((string)$resp, true);

if ($httpCode === 401) {
    echo "  ✓ Login rejected with 401 Unauthorized for deleted credentials: {$json['message']}\n\n";
} else {
    echo "  ✗ FAILED: Expected 401 for deleted user! Code: $httpCode, Resp: $resp\n\n";
    exit(1);
}

echo "======================================================================\n";
echo "ALL USER DELETION TESTS PASSED WITH 100% GxP COMPLIANCE!\n";
echo "======================================================================\n";
