<?php
require_once __DIR__ . '/../config/database.php';
$pdo = getDbConnection();
$pdo->exec("UPDATE users SET failed_login_attempts = 0, locked_until = NULL");
echo "All users successfully unlocked and reset in database.\n";
$stmt = $pdo->query("SELECT email, failed_login_attempts, locked_until FROM users");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $u) {
    echo "User {$u['email']}: attempts = {$u['failed_login_attempts']}, locked = " . ($u['locked_until'] ?? 'NULL') . "\n";
}
