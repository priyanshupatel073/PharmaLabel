<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - RBAC, SECURITY POLICIES & NOTIFICATION SETTINGS MIGRATION
 * ============================================================================
 */

declare(strict_types=1);

define('PHARMALABEL_INIT', true);

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDbConnection();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    echo "Running migration on database driver: $driver\n";

    // 1. Add `username` column to `users` table if not exists
    if ($driver === 'mysql') {
        $checkCol = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'username'");
        if ($checkCol->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `username` VARCHAR(100) NULL AFTER `name`, ADD INDEX `idx_user_username` (`username`)");
            echo "  ✓ Added `username` column to `users` table.\n";
        }
    } else {
        // SQLite
        try {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `username` VARCHAR(100) NULL");
            echo "  ✓ Added `username` column to SQLite `users` table.\n";
        } catch (Exception $e) {}
    }

    // Populate default usernames for existing users if blank
    $pdo->exec("UPDATE `users` SET `username` = SUBSTRING_INDEX(`email`, '@', 1) WHERE `username` IS NULL OR `username` = ''");

    // 2. Create `role_permissions` Table
    if ($driver === 'mysql') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `role_permissions` (
            `id` INT AUTO_INCREMENT NOT NULL,
            `organization_id` VARCHAR(50) NOT NULL,
            `role_name` VARCHAR(50) NOT NULL,
            `is_custom` TINYINT(1) NOT NULL DEFAULT 0,
            `permissions` LONGTEXT NOT NULL,
            `advance_permissions` LONGTEXT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uq_org_role_name` (`organization_id`, `role_name`),
            INDEX `idx_perm_org` (`organization_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `role_permissions` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `organization_id` VARCHAR(50) NOT NULL,
            `role_name` VARCHAR(50) NOT NULL,
            `is_custom` INT DEFAULT 0,
            `permissions` TEXT NOT NULL,
            `advance_permissions` TEXT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (`organization_id`, `role_name`)
        );");
    }
    echo "  ✓ Created / verified `role_permissions` table.\n";

    // 3. Create `security_policies` Table (21 CFR Part 11 §11.200)
    if ($driver === 'mysql') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `security_policies` (
            `id` INT AUTO_INCREMENT NOT NULL,
            `organization_id` VARCHAR(50) NOT NULL UNIQUE,
            `max_failed_attempts` INT NOT NULL DEFAULT 5,
            `lockout_duration_min` INT NOT NULL DEFAULT 15,
            `min_password_length` INT NOT NULL DEFAULT 8,
            `require_uppercase` TINYINT(1) NOT NULL DEFAULT 1,
            `require_numeric` TINYINT(1) NOT NULL DEFAULT 1,
            `require_special` TINYINT(1) NOT NULL DEFAULT 0,
            `password_expiry_days` INT NOT NULL DEFAULT 90,
            `password_reuse_history` INT NOT NULL DEFAULT 5,
            `session_timeout_min` INT NOT NULL DEFAULT 60,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            INDEX `idx_sec_org` (`organization_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `security_policies` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `organization_id` VARCHAR(50) NOT NULL UNIQUE,
            `max_failed_attempts` INT DEFAULT 5,
            `lockout_duration_min` INT DEFAULT 15,
            `min_password_length` INT DEFAULT 8,
            `require_uppercase` INT DEFAULT 1,
            `require_numeric` INT DEFAULT 1,
            `require_special` INT DEFAULT 0,
            `password_expiry_days` INT DEFAULT 90,
            `password_reuse_history` INT DEFAULT 5,
            `session_timeout_min` INT DEFAULT 60,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );");
    }
    echo "  ✓ Created / verified `security_policies` table.\n";

    // 4. Create `notification_settings` Table (Real-Time Alerts & EOD)
    if ($driver === 'mysql') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `notification_settings` (
            `id` INT AUTO_INCREMENT NOT NULL,
            `organization_id` VARCHAR(50) NOT NULL UNIQUE,
            `notify_operator_print` TINYINT(1) NOT NULL DEFAULT 1,
            `notify_supervisor_auth` TINYINT(1) NOT NULL DEFAULT 1,
            `notify_reprint_damage` TINYINT(1) NOT NULL DEFAULT 1,
            `eod_report_enabled` TINYINT(1) NOT NULL DEFAULT 1,
            `eod_report_time` VARCHAR(10) NOT NULL DEFAULT '18:00',
            `admin_alert_email` VARCHAR(150) NULL,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            INDEX `idx_notif_org` (`organization_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    } else {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `notification_settings` (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `organization_id` VARCHAR(50) NOT NULL UNIQUE,
            `notify_operator_print` INT DEFAULT 1,
            `notify_supervisor_auth` INT DEFAULT 1,
            `notify_reprint_damage` INT DEFAULT 1,
            `eod_report_enabled` INT DEFAULT 1,
            `eod_report_time` VARCHAR(10) DEFAULT '18:00',
            `admin_alert_email` VARCHAR(150) NULL,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );");
    }
    echo "  ✓ Created / verified `notification_settings` table.\n";

    echo "\n🎉 MIGRATION COMPLETED SUCCESSFULLY!\n";

} catch (Exception $e) {
    echo "MIGRATION ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
