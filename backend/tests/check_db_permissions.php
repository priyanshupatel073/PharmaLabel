<?php
require_once __DIR__ . '/../config/database.php';
$pdo = getDbConnection();

$rows = $pdo->query("SELECT * FROM role_permissions WHERE organization_id = 'ORG-HARIHAR-265'")->fetchAll(PDO::FETCH_ASSOC);
echo "ROLE PERMISSIONS IN DATABASE FOR ORG-HARIHAR-265:\n";
foreach ($rows as $r) {
    echo "Role: {$r['role_name']}\n";
    echo "  Permissions: {$r['permissions']}\n";
    echo "  Advance: {$r['advance_permissions']}\n";
}
