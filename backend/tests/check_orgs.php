<?php
require 'backend/config/database.php';
$pdo = getDbConnection();
foreach ($pdo->query('SELECT id, name, license_status, valid_until FROM organizations')->fetchAll(PDO::FETCH_ASSOC) as $o) {
    echo "ID: " . $o['id'] . " | Name: " . $o['name'] . " | Status: " . $o['license_status'] . " | Valid: " . $o['valid_until'] . "\n";
}
