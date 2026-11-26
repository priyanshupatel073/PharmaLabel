<?php
/**
 * Local SQLite Database Initializer for PharmaLabel Pro
 * Used when running locally without a MySQL service.
 */

declare(strict_types=1);

function initLocalSqliteDatabase(PDO $pdo): void
{
    // 1. Organizations
    $pdo->exec("CREATE TABLE IF NOT EXISTS `organizations` (
        `id` VARCHAR(50) PRIMARY KEY,
        `name` VARCHAR(255) NOT NULL,
        `plant_location` VARCHAR(255) NOT NULL,
        `contact_email` VARCHAR(150) NOT NULL,
        `gs1_company_prefix` VARCHAR(20) NOT NULL,
        `edition` VARCHAR(100) DEFAULT 'Enterprise Unlimited Traceability',
        `license_status` VARCHAR(50) DEFAULT 'ACTIVE',
        `valid_until` DATE NOT NULL,
        `total_drums_printed` INT DEFAULT 0,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Users
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` VARCHAR(50) PRIMARY KEY,
        `organization_id` VARCHAR(50) NULL,
        `name` VARCHAR(150) NOT NULL,
        `email` VARCHAR(150) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `role` VARCHAR(50) NOT NULL,
        `department` VARCHAR(150) NOT NULL,
        `permissions` TEXT NULL,
        `status` VARCHAR(50) DEFAULT 'ACTIVE',
        `failed_login_attempts` INT DEFAULT 0,
        `locked_until` DATETIME NULL,
        `password_changed_at` DATETIME NULL,
        `last_login_at` DATETIME NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 3. Company Settings
    $pdo->exec("CREATE TABLE IF NOT EXISTS `company_settings` (
        `id` INTEGER PRIMARY KEY AUTOINCREMENT,
        `organization_id` VARCHAR(50) NOT NULL UNIQUE,
        `company_name` VARCHAR(255) NOT NULL,
        `address` TEXT NOT NULL,
        `contact_number` VARCHAR(50) NOT NULL,
        `email` VARCHAR(150) NOT NULL,
        `mfg_license_number` VARCHAR(100) NOT NULL,
        `gst_number` VARCHAR(50) NOT NULL,
        `logo_url` VARCHAR(255) NULL,
        `gs1_company_prefix` VARCHAR(20) NOT NULL,
        `extension_digit` VARCHAR(2) DEFAULT '1',
        `next_serial_reference` INTEGER DEFAULT 1,
        `printer_name` VARCHAR(255) DEFAULT 'Zebra ZT411 Industrial (Thermal 300DPI - Line 02)',
        `default_label_dimension` VARCHAR(10) DEFAULT '4x6',
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 4. Products
    $pdo->exec("CREATE TABLE IF NOT EXISTS `products` (
        `id` VARCHAR(50) PRIMARY KEY,
        `organization_id` VARCHAR(50) NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `code` VARCHAR(100) NOT NULL,
        `api_name` VARCHAR(255) NOT NULL,
        `brand_name` VARCHAR(255) NOT NULL,
        `gtin14` VARCHAR(20) NOT NULL,
        `mfg_license_number` VARCHAR(100) NOT NULL,
        `storage_conditions` TEXT NOT NULL,
        `ndc` VARCHAR(50) NULL,
        `cas_number` VARCHAR(50) NULL,
        `pharmacopeia` VARCHAR(20) DEFAULT 'IP',
        `potency_assay` VARCHAR(100) NULL,
        `hs_code` VARCHAR(50) NULL,
        `country_of_origin` VARCHAR(100) DEFAULT 'India',
        `caution_text` TEXT NOT NULL,
        `status` VARCHAR(50) DEFAULT 'Draft',
        `pending_changes` TEXT NULL,
        `change_reason` TEXT NULL,
        `updated_by` VARCHAR(150) NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 5. Batches
    $pdo->exec("CREATE TABLE IF NOT EXISTS `batches` (
        `id` VARCHAR(50) PRIMARY KEY,
        `organization_id` VARCHAR(50) NOT NULL,
        `batch_number` VARCHAR(100) NOT NULL,
        `product_id` VARCHAR(50) NOT NULL,
        `product_name` VARCHAR(255) NOT NULL,
        `batch_size_kg` REAL NOT NULL,
        `total_drums` INT DEFAULT 40,
        `default_net_weight` REAL DEFAULT 25.000,
        `mfg_date` DATE NOT NULL,
        `expiry_date` DATE NOT NULL,
        `retest_date` DATE NULL,
        `status` VARCHAR(50) DEFAULT 'Pending',
        `authorized_by` VARCHAR(150) NULL,
        `authorized_at` DATETIME NULL,
        `created_by` VARCHAR(150) NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 6. Drums
    $pdo->exec("CREATE TABLE IF NOT EXISTS `drums` (
        `id` INTEGER PRIMARY KEY AUTOINCREMENT,
        `organization_id` VARCHAR(50) NOT NULL,
        `batch_id` VARCHAR(50) NOT NULL,
        `drum_number` INT NOT NULL,
        `net_weight` REAL NOT NULL,
        `gross_weight` REAL NOT NULL,
        `tare_weight` REAL NOT NULL,
        `sscc` VARCHAR(20) NULL,
        `status` VARCHAR(50) DEFAULT 'Pending',
        `label_generated_at` DATETIME NULL,
        `reprint_count` INT DEFAULT 0,
        `damaged_reason` TEXT NULL,
        `damaged_at` DATETIME NULL,
        `damaged_disposition` VARCHAR(255) NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 7. Templates
    $pdo->exec("CREATE TABLE IF NOT EXISTS `templates` (
        `id` VARCHAR(50) PRIMARY KEY,
        `organization_id` VARCHAR(50) NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `dimension` VARCHAR(10) DEFAULT '4x6',
        `revision` VARCHAR(20) DEFAULT '1.0',
        `status` VARCHAR(50) DEFAULT 'Draft',
        `elements` TEXT NOT NULL,
        `change_summary` TEXT NULL,
        `approver` VARCHAR(150) NULL,
        `approved_at` DATETIME NULL,
        `created_by` VARCHAR(150) NOT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // 8. Label Snapshots
    $pdo->exec("CREATE TABLE IF NOT EXISTS `label_snapshots` (
        `id` VARCHAR(80) PRIMARY KEY,
        `organization_id` VARCHAR(50) NOT NULL,
        `sscc` VARCHAR(20) NOT NULL,
        `label_type` VARCHAR(50) DEFAULT 'Original',
        `batch_id` VARCHAR(50) NOT NULL,
        `batch_number` VARCHAR(100) NOT NULL,
        `drum_number` INT NOT NULL,
        `total_drums` INT NOT NULL,
        `product_name` VARCHAR(255) NOT NULL,
        `product_code` VARCHAR(100) NOT NULL,
        `gtin14` VARCHAR(20) NOT NULL,
        `net_weight` REAL NOT NULL,
        `gross_weight` REAL NOT NULL,
        `mfg_date` DATE NOT NULL,
        `expiry_date` DATE NOT NULL,
        `retest_date` DATE NULL,
        `storage_conditions` TEXT NOT NULL,
        `caution_text` TEXT NOT NULL,
        `company_name` VARCHAR(255) NOT NULL,
        `mfg_license_number` VARCHAR(100) NOT NULL,
        `template_revision` VARCHAR(20) NOT NULL,
        `dimension` VARCHAR(10) NOT NULL,
        `generated_by` VARCHAR(150) NOT NULL,
        `generated_at` DATETIME NOT NULL,
        `reprint_count` INT DEFAULT 0,
        `reprint_reason` TEXT NULL,
        `is_watermarked` INT DEFAULT 0,
        `watermark_text` VARCHAR(50) NULL
    )");

    // 9. Audit Logs
    $pdo->exec("CREATE TABLE IF NOT EXISTS `audit_logs` (
        `id` VARCHAR(80) PRIMARY KEY,
        `organization_id` VARCHAR(50) NULL,
        `timestamp` DATETIME NOT NULL,
        `timestamp_ist` VARCHAR(50) NOT NULL,
        `user_id` VARCHAR(50) NOT NULL,
        `user_name` VARCHAR(150) NOT NULL,
        `user_role` VARCHAR(50) NOT NULL,
        `action` VARCHAR(100) NOT NULL,
        `module` VARCHAR(100) NOT NULL,
        `batch_ref` VARCHAR(100) NULL,
        `drum_ref` INT NULL,
        `sscc` VARCHAR(20) NULL,
        `old_value` TEXT NULL,
        `new_value` TEXT NULL,
        `reason` TEXT NOT NULL,
        `outcome` VARCHAR(20) DEFAULT 'SUCCESS',
        `ip_address` VARCHAR(50) NULL,
        `user_agent` TEXT NULL,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Check if seeded
    $stmt = $pdo->query("SELECT COUNT(*) FROM `organizations`");
    if ((int)$stmt->fetchColumn() === 0) {
        // Seed Organizations
        $pdo->exec("INSERT INTO `organizations` VALUES
            ('ORG-APEX', 'Apex Healthcare Ltd.', 'Plot No. 42-45, Phase III, Industrial Area, Baddi, HP - 173205', 'compliance@apexpharma.com', '8901234', 'Enterprise Unlimited Traceability', 'ACTIVE', '2027-12-31', 18450, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('ORG-SUNPHARMA', 'Sun Pharma Industries Ltd.', 'Halol, Gujarat (API Block 02)', 'qa.halol@sunpharma.com', '8904321', 'Enterprise Unlimited Traceability', 'ACTIVE', '2027-06-30', 42100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('ORG-CIPLA', 'Cipla Laboratories Ltd.', 'Kurkumbh, Maharashtra (OEB-4 Plant)', 'it.regulatory@cipla.com', '8909876', 'Standard GxP Plant Edition', 'WARNING', '2026-12-15', 8900, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");

        // Seed Users (Password@123 hash = $2y$10$wT4cE6wZgWj29LdY7gZ7.u5uH9p60mDkIom8O0j7gK3dC1W8IqG4q or native bcrypt)
        $defaultHash = password_hash('Password@123', PASSWORD_BCRYPT);
        $insertUser = $pdo->prepare("INSERT INTO `users` VALUES (:id, :org_id, :name, :email, :pass, :role, :dept, :perms, 'ACTIVE', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");

        $insertUser->execute([':id' => 'usr_superadmin', ':org_id' => null, ':name' => 'Kunal Singhania', ':email' => 'superadmin@camelcomm.in', ':pass' => $defaultHash, ':role' => 'SuperAdmin', ':dept' => 'Global IT & Enterprise Systems', ':perms' => json_encode(['manage_platforms','manage_licenses','global_audit'])]);
        $insertUser->execute([':id' => 'usr_admin', ':org_id' => 'ORG-APEX', ':name' => 'Vikram Joshi', ':email' => 'admin@apexpharma.com', ':pass' => $defaultHash, ':role' => 'Admin', ':dept' => 'Plant IT & Serialization Admin', ':perms' => json_encode(['print_labels','reprint_labels','create_batch','edit_batch','manage_users'])]);
        $insertUser->execute([':id' => 'usr_supervisor', ':org_id' => 'ORG-APEX', ':name' => 'Dr. Anjali Nair', ':email' => 'supervisor@apexpharma.com', ':pass' => $defaultHash, ':role' => 'Supervisor', ':dept' => 'Quality Assurance & Regulatory Compliance', ':perms' => json_encode(['print_labels','reprint_labels','edit_drum_weight','approve_product'])]);
        $insertUser->execute([':id' => 'usr_operator', ':org_id' => 'ORG-APEX', ':name' => 'Ramesh Kumar', ':email' => 'operator@apexpharma.com', ':pass' => $defaultHash, ':role' => 'Operator', ':dept' => 'Shop-Floor Packaging Line 02', ':perms' => json_encode(['print_labels','create_batch'])]);
        $insertUser->execute([':id' => 'usr_sun_admin', ':org_id' => 'ORG-SUNPHARMA', ':name' => 'Rajesh Patel', ':email' => 'admin@sunpharma.com', ':pass' => $defaultHash, ':role' => 'Admin', ':dept' => 'Sun Pharma QA & IT Systems', ':perms' => json_encode(['print_labels','reprint_labels','create_batch','edit_batch','manage_users'])]);
        $insertUser->execute([':id' => 'usr_sun_qa', ':org_id' => 'ORG-SUNPHARMA', ':name' => 'Meera Shah', ':email' => 'qa.halol@sunpharma.com', ':pass' => $defaultHash, ':role' => 'Supervisor', ':dept' => 'Sun Pharma Halol QA', ':perms' => json_encode(['print_labels','reprint_labels','edit_drum_weight','approve_product'])]);
        $insertUser->execute([':id' => 'usr_cipla_admin', ':org_id' => 'ORG-CIPLA', ':name' => 'Sunil Deshmukh', ':email' => 'admin@cipla.com', ':pass' => $defaultHash, ':role' => 'Admin', ':dept' => 'Cipla Kurkumbh Serialization', ':perms' => json_encode(['print_labels','reprint_labels','create_batch','edit_batch','manage_users'])]);
        $insertUser->execute([':id' => 'usr_cipla_reg', ':org_id' => 'ORG-CIPLA', ':name' => 'Pooja Kulkarni', ':email' => 'it.regulatory@cipla.com', ':pass' => $defaultHash, ':role' => 'Supervisor', ':dept' => 'Cipla Regulatory Compliance', ':perms' => json_encode(['print_labels','reprint_labels','edit_drum_weight','approve_product'])]);

        // Seed Company Settings
        $pdo->exec("INSERT INTO `company_settings` (organization_id, company_name, address, contact_number, email, mfg_license_number, gst_number, gs1_company_prefix, extension_digit, next_serial_reference, printer_name, default_label_dimension) VALUES
            ('ORG-APEX', 'Apex Healthcare Ltd.', 'Plot No. 42-45, Phase III, Industrial Area, Baddi, HP - 173205', '+91 1795 244800', 'compliance@apexpharma.com', 'HP/MNB/08/123-A', '02AAACA4512B1Z6', '8901234', '1', 41, 'Zebra ZT411 Industrial (Thermal 300DPI - Line 02)', '4x6')
        ");
    }
}
