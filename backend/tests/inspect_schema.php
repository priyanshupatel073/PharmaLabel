<?php
require_once __DIR__ . '/../config/database.php';
$pdo = getDbConnection();
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "Tables:\n";
print_r($tables);

echo "\nsecurity_policies columns:\n";
$cols = $pdo->query("DESCRIBE `security_policies`")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo "  {$c['Field']} ({$c['Type']})\n";
}

echo "\nCurrent policy for ORG-HARIHAR-265:\n";
$stmt = $pdo->prepare("SELECT * FROM `security_policies` WHERE organization_id = 'ORG-HARIHAR-265'");
$stmt->execute();
print_r($stmt->fetch(PDO::FETCH_ASSOC));
