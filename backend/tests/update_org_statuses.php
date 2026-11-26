<?php
require 'backend/config/database.php';
$pdo = getDbConnection();
$pdo->exec("UPDATE `organizations` SET `license_status` = 'ACTIVE', `valid_until` = '2027-12-31' WHERE `id` = 'ORG-APEX'");
$pdo->exec("UPDATE `organizations` SET `license_status` = 'EXPIRED', `valid_until` = '2025-12-31' WHERE `id` = 'ORG-SUNPHARMA'");
$pdo->exec("UPDATE `organizations` SET `license_status` = 'SUSPENDED', `valid_until` = '2025-10-31' WHERE `id` = 'ORG-CIPLA'");
echo "Organizations updated:\n";
foreach ($pdo->query("SELECT id, name, license_status, valid_until FROM organizations")->fetchAll(PDO::FETCH_ASSOC) as $o) {
    echo $o['id'] . " | " . $o['name'] . " | Status: " . $o['license_status'] . " | Valid: " . $o['valid_until'] . "\n";
}
