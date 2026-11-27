<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDbConnection();
    
    // 1. Create password_history table if it doesn't exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS `password_history` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` VARCHAR(50) NOT NULL,
        `password_hash` VARCHAR(255) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_user_history` (`user_id`, `created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 2. Ensure security_policies table has all 9 columns with appropriate types
    $cols = $pdo->query("SHOW COLUMNS FROM `security_policies`")->fetchAll(PDO::FETCH_COLUMN);
    
    $expectedCols = [
        'organization_id'        => "VARCHAR(50) NOT NULL PRIMARY KEY",
        'max_failed_attempts'    => "INT(11) NOT NULL DEFAULT 5",
        'lockout_duration_min'   => "INT(11) NOT NULL DEFAULT 15",
        'min_password_length'    => "INT(11) NOT NULL DEFAULT 8",
        'require_uppercase'      => "TINYINT(1) NOT NULL DEFAULT 1",
        'require_numeric'        => "TINYINT(1) NOT NULL DEFAULT 1",
        'require_special'        => "TINYINT(1) NOT NULL DEFAULT 0",
        'password_expiry_days'   => "INT(11) NOT NULL DEFAULT 90",
        'password_reuse_blocked' => "INT(11) NOT NULL DEFAULT 5",
        'session_timeout_min'    => "INT(11) NOT NULL DEFAULT 60"
    ];

    foreach ($expectedCols as $col => $def) {
        if (!in_array($col, $cols)) {
            $pdo->exec("ALTER TABLE `security_policies` ADD COLUMN `$col` $def");
            echo "Added column $col\n";
        }
    }

    echo "Migration completed successfully.\n";
} catch (PDOException $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
    exit(1);
}
