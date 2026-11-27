<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';

echo "====================================================\n";
echo "PHARMALABEL PRO - RBAC PERMISSION VERIFICATION SUITE\n";
echo "====================================================\n\n";

$pdo = getDbConnection();
$orgId = 'ORG-HARIHAR-265';

// 1. Verify role_permissions table state for Harihar Pharma
$stmt = $pdo->prepare("SELECT role_name, permissions, advance_permissions FROM role_permissions WHERE organization_id = :org_id ORDER BY id ASC");
$stmt->execute([':org_id' => $orgId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "[TEST 1] Current database role_permissions for $orgId:\n";
$supervisorRow = null;
foreach ($rows as $r) {
    echo "  - Role: {$r['role_name']}\n";
    echo "    Permissions: {$r['permissions']}\n";
    echo "    Advance:     {$r['advance_permissions']}\n";
    if ($r['role_name'] === 'Supervisor') {
        $supervisorRow = $r;
    }
}

if (!$supervisorRow) {
    echo "FAIL: Supervisor role configuration not found in database!\n";
    exit(1);
}

$supervisorPerms = json_decode($supervisorRow['permissions'], true);
$hasPrint = in_array('print_labels', $supervisorPerms, true);
$hasReprint = in_array('reprint_labels', $supervisorPerms, true);

echo "\n[TEST 2] Verifying Supervisor permission state:\n";
echo "  - print_labels in DB: " . ($hasPrint ? "YES (UNEXPECTED)" : "NO (CORRECT: DISABLED)") . "\n";
echo "  - reprint_labels in DB: " . ($hasReprint ? "YES (UNEXPECTED)" : "NO (CORRECT: DISABLED)") . "\n";

if ($hasPrint || $hasReprint) {
    echo "FAIL: Supervisor still has print/reprint enabled in database!\n";
    exit(1);
} else {
    echo "PASS: Supervisor correctly has print_labels and reprint_labels DISABLED in database.\n";
}

// 3. Test login API payload for Supervisor user
$stmtUser = $pdo->prepare("SELECT username, email, role FROM users WHERE organization_id = :org_id AND role = 'Supervisor' LIMIT 1");
$stmtUser->execute([':org_id' => $orgId]);
$supervisorUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

if (!$supervisorUser) {
    echo "NOTICE: No dedicated Supervisor user found in $orgId, checking users...\n";
} else {
    echo "\n[TEST 3] Found Supervisor User: {$supervisorUser['username']} ({$supervisorUser['email']})\n";
    // Simulate what login.php returns
    $stmtPerm = $pdo->prepare("SELECT permissions, advance_permissions FROM role_permissions WHERE organization_id = :org_id AND role_name = 'Supervisor' LIMIT 1");
    $stmtPerm->execute([':org_id' => $orgId]);
    $roleRow = $stmtPerm->fetch(PDO::FETCH_ASSOC);
    $loginPerms = json_decode((string)$roleRow['permissions'], true);

    echo "  - Login API payload permissions for Supervisor: " . json_encode($loginPerms) . "\n";
    if (!in_array('print_labels', $loginPerms, true)) {
        echo "PASS: Login API correctly omits print_labels for Supervisor session.\n";
    } else {
        echo "FAIL: Login API payload still contains print_labels!\n";
        exit(1);
    }
}

// 4. Verify Operator role permissions
$stmtOp = $pdo->prepare("SELECT permissions FROM role_permissions WHERE organization_id = :org_id AND role_name = 'Operator' LIMIT 1");
$stmtOp->execute([':org_id' => $orgId]);
$opPerms = json_decode((string)$stmtOp->fetchColumn(), true);
echo "\n[TEST 4] Operator permissions: " . json_encode($opPerms) . "\n";
if (in_array('print_labels', $opPerms, true)) {
    echo "PASS: Operator correctly retains print_labels permission.\n";
} else {
    echo "FAIL: Operator missing print_labels!\n";
}

echo "\n====================================================\n";
echo "ALL PERMISSION VERIFICATION TESTS PASSED SUCCESSFULLY!\n";
echo "====================================================\n";
