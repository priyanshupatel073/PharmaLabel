-- ============================================================================
-- PHARMALABEL PRO - ENTERPRISE MULTI-TENANT DATABASE SCHEMA
-- Compliant with: 21 CFR Part 11, GxP, ALCOA+, and GS1 SSCC-18 Mod-10
-- Hostinger MySQL 8.0+ / MariaDB 10.5+ Architecture
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CREATE & SELECT MASTER DATABASE
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `pharmalabel_db`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `pharmalabel_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `label_snapshots`;
DROP TABLE IF EXISTS `drums`;
DROP TABLE IF EXISTS `batches`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `templates`;
DROP TABLE IF EXISTS `company_settings`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `organizations`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Tenant Master & Licensing SLA Table)
-- ----------------------------------------------------------------------------
CREATE TABLE `organizations` (
  `id` VARCHAR(50) NOT NULL COMMENT 'Tenant ID e.g. ORG-APEX, ORG-SUNPHARMA',
  `name` VARCHAR(255) NOT NULL COMMENT 'Legal entity company name',
  `plant_location` VARCHAR(255) NOT NULL COMMENT 'Plant unit and manufacturing city',
  `contact_email` VARCHAR(150) NOT NULL COMMENT 'Regulatory / IT QA contact email',
  `gs1_company_prefix` VARCHAR(20) NOT NULL COMMENT 'Certified GS1 Company Prefix',
  `edition` ENUM('Enterprise Unlimited Traceability', 'Standard GxP Plant Edition', 'Multi-Plant Global') NOT NULL DEFAULT 'Enterprise Unlimited Traceability',
  `license_status` ENUM('ACTIVE', 'WARNING', 'EXPIRED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `valid_until` DATE NOT NULL COMMENT 'Licensing SLA expiry date',
  `total_drums_printed` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_org_status` (`license_status`),
  INDEX `idx_org_expiry` (`valid_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. USERS (Authentication & Role-Based Access Control Table)
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `organization_id` VARCHAR(50) NULL COMMENT 'NULL for Camel Platform SuperAdmin',
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('SuperAdmin', 'Admin', 'Supervisor', 'Operator') NOT NULL,
  `department` VARCHAR(150) NOT NULL,
  `permissions` TEXT NULL COMMENT 'JSON array of specific granular permissions',
  `status` ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL COMMENT 'Brute force lockout expiration',
  `password_changed_at` DATETIME NULL COMMENT '90-day password expiry tracking',
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  INDEX `idx_user_org` (`organization_id`),
  INDEX `idx_user_role` (`role`),
  CONSTRAINT `fk_user_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. COMPANY_SETTINGS (Plant Specific Config & Atomic SSCC Counter)
-- ----------------------------------------------------------------------------
CREATE TABLE `company_settings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `organization_id` VARCHAR(50) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `contact_number` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `mfg_license_number` VARCHAR(100) NOT NULL,
  `gst_number` VARCHAR(50) NOT NULL,
  `logo_url` VARCHAR(255) NULL,
  `gs1_company_prefix` VARCHAR(20) NOT NULL,
  `extension_digit` VARCHAR(2) NOT NULL DEFAULT '1',
  `next_serial_reference` BIGINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'LOCKED ATOMICALLY FOR UPDATE ON PRINT',
  `printer_name` VARCHAR(255) NOT NULL DEFAULT 'Zebra ZT411 Industrial (Thermal 300DPI - Line 02)',
  `default_label_dimension` ENUM('4x6', '6x4', '4x4', '3x2') NOT NULL DEFAULT '4x6',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_org` (`organization_id`),
  CONSTRAINT `fk_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS (Product Master, Monographs & 4-Eyes Maker-Checker)
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` VARCHAR(50) NOT NULL,
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
  `pharmacopeia` ENUM('USP', 'IP', 'BP', 'EP', 'JP') NOT NULL DEFAULT 'IP',
  `potency_assay` VARCHAR(100) NULL,
  `hs_code` VARCHAR(50) NULL,
  `country_of_origin` VARCHAR(100) NOT NULL DEFAULT 'India',
  `caution_text` TEXT NOT NULL,
  `status` ENUM('Draft', 'Pending Approval', 'Active', 'Inactive') NOT NULL DEFAULT 'Draft',
  `pending_changes` LONGTEXT NULL COMMENT 'JSON diff staged for QA 4-Eyes review',
  `change_reason` TEXT NULL COMMENT 'Mandatory 21 CFR Part 11 justification',
  `updated_by` VARCHAR(150) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_org_product_code` (`organization_id`, `code`),
  INDEX `idx_product_org` (`organization_id`),
  INDEX `idx_product_status` (`status`),
  CONSTRAINT `fk_product_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. BATCHES (Production Batches & QA Line Clearance Lock)
-- ----------------------------------------------------------------------------
CREATE TABLE `batches` (
  `id` VARCHAR(50) NOT NULL,
  `organization_id` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(100) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `batch_size_kg` DECIMAL(12, 3) NOT NULL,
  `total_drums` INT UNSIGNED NOT NULL DEFAULT 40,
  `default_net_weight` DECIMAL(10, 3) NOT NULL DEFAULT 25.000,
  `mfg_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `retest_date` DATE NULL,
  `status` ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `authorized_by` VARCHAR(150) NULL COMMENT 'QA Line Clearance Inspector',
  `authorized_at` DATETIME NULL,
  `created_by` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_org_batch_num` (`organization_id`, `batch_number`),
  INDEX `idx_batch_org` (`organization_id`),
  INDEX `idx_batch_product` (`product_id`),
  INDEX `idx_batch_status` (`status`),
  CONSTRAINT `fk_batch_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. DRUMS (40-Drum Container Matrix, Weights & GS1 SSCC Assignment)
-- ----------------------------------------------------------------------------
CREATE TABLE `drums` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `organization_id` VARCHAR(50) NOT NULL,
  `batch_id` VARCHAR(50) NOT NULL,
  `drum_number` INT UNSIGNED NOT NULL,
  `net_weight` DECIMAL(10, 3) NOT NULL,
  `gross_weight` DECIMAL(10, 3) NOT NULL,
  `tare_weight` DECIMAL(10, 3) NOT NULL,
  `sscc` VARCHAR(20) NULL COMMENT '18-digit GS1 SSCC with Mod-10 Check Digit',
  `status` ENUM('Pending', 'Generated', 'Printed', 'Damaged') NOT NULL DEFAULT 'Pending',
  `label_generated_at` DATETIME NULL,
  `reprint_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `damaged_reason` TEXT NULL,
  `damaged_at` DATETIME NULL,
  `damaged_disposition` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_org_batch_drum` (`organization_id`, `batch_id`, `drum_number`),
  UNIQUE KEY `uq_org_sscc` (`organization_id`, `sscc`),
  INDEX `idx_drum_status` (`status`),
  CONSTRAINT `fk_drum_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drum_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TEMPLATES (Label Templates & Immutable Revision Branching)
-- ----------------------------------------------------------------------------
CREATE TABLE `templates` (
  `id` VARCHAR(50) NOT NULL,
  `organization_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `dimension` ENUM('4x6', '6x4', '4x4', '3x2') NOT NULL DEFAULT '4x6',
  `revision` VARCHAR(20) NOT NULL DEFAULT '1.0',
  `status` ENUM('Draft', 'In Review', 'Approved/Effective', 'Obsolete') NOT NULL DEFAULT 'Draft',
  `elements` LONGTEXT NOT NULL COMMENT 'JSON element layout and toggles',
  `change_summary` TEXT NULL,
  `approver` VARCHAR(150) NULL,
  `approved_at` DATETIME NULL,
  `created_by` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_org_template_rev` (`organization_id`, `name`, `revision`),
  INDEX `idx_template_org` (`organization_id`),
  CONSTRAINT `fk_template_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. LABEL_SNAPSHOTS (Immutable Historical Print Records for Verification)
-- ----------------------------------------------------------------------------
CREATE TABLE `label_snapshots` (
  `id` VARCHAR(80) NOT NULL,
  `organization_id` VARCHAR(50) NOT NULL,
  `sscc` VARCHAR(20) NOT NULL,
  `label_type` ENUM('Original', 'Duplicate', 'Triplicate', 'Specimen', 'Dispatch Copy', 'Reprint') NOT NULL DEFAULT 'Original',
  `batch_id` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(100) NOT NULL,
  `drum_number` INT UNSIGNED NOT NULL,
  `total_drums` INT UNSIGNED NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `product_code` VARCHAR(100) NOT NULL,
  `gtin14` VARCHAR(20) NOT NULL,
  `net_weight` DECIMAL(10, 3) NOT NULL,
  `gross_weight` DECIMAL(10, 3) NOT NULL,
  `mfg_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `retest_date` DATE NULL,
  `storage_conditions` TEXT NOT NULL,
  `caution_text` TEXT NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `mfg_license_number` VARCHAR(100) NOT NULL,
  `template_revision` VARCHAR(20) NOT NULL,
  `dimension` ENUM('4x6', '6x4', '4x4', '3x2') NOT NULL,
  `generated_by` VARCHAR(150) NOT NULL,
  `generated_at` DATETIME NOT NULL,
  `reprint_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `reprint_reason` TEXT NULL,
  `is_watermarked` TINYINT(1) NOT NULL DEFAULT 0,
  `watermark_text` VARCHAR(50) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_snapshot_sscc` (`sscc`),
  INDEX `idx_snapshot_org` (`organization_id`),
  INDEX `idx_snapshot_batch` (`batch_id`),
  CONSTRAINT `fk_snapshot_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. AUDIT_LOGS (21 CFR Part 11 ALCOA+ Immutable Append-Only Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` VARCHAR(80) NOT NULL,
  `organization_id` VARCHAR(50) NULL COMMENT 'NULL for platform-level SuperAdmin actions',
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
  `reason` TEXT NOT NULL COMMENT 'Mandatory 21 CFR Part 11 justification',
  `outcome` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
  `ip_address` VARCHAR(50) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_org` (`organization_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_timestamp` (`timestamp`),
  INDEX `idx_audit_batch` (`batch_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL SEED DATA
-- Default Credentials: Password@123 (bcrypt hashed)
-- ============================================================================

-- 1. Initial Organizations
INSERT INTO `organizations` (`id`, `name`, `plant_location`, `contact_email`, `gs1_company_prefix`, `edition`, `license_status`, `valid_until`, `total_drums_printed`) VALUES
('ORG-APEX', 'Apex Healthcare Ltd.', 'Plot No. 42-45, Phase III, Industrial Area, Baddi, HP - 173205', 'compliance@apexpharma.com', '8901234', 'Enterprise Unlimited Traceability', 'ACTIVE', '2027-12-31', 18450),
('ORG-SUNPHARMA', 'Sun Pharma Industries Ltd.', 'Halol, Gujarat (API Block 02)', 'qa.halol@sunpharma.com', '8904321', 'Enterprise Unlimited Traceability', 'ACTIVE', '2027-06-30', 42100),
('ORG-CIPLA', 'Cipla Laboratories Ltd.', 'Kurkumbh, Maharashtra (OEB-4 Plant)', 'it.regulatory@cipla.com', '8909876', 'Standard GxP Plant Edition', 'WARNING', '2026-12-15', 8900);

-- 2. Initial Users ($2y$10$wT4cE6wZgWj29LdY7gZ7.u5uH9p60mDkIom8O0j7gK3dC1W8IqG4q = Password@123)
INSERT INTO `users` (`id`, `organization_id`, `name`, `email`, `password_hash`, `role`, `department`, `permissions`, `status`) VALUES
('usr_superadmin', NULL, 'Kunal Singhania', 'superadmin@camelcomm.in', '$2y$10$iKzrqfO37nF67p2cT587ceYy.958L0h5Kz3X0I1sE8qgB3Jc5Qo4i', 'SuperAdmin', 'Global IT & Enterprise Systems', '["manage_platforms","manage_licenses","global_audit","disaster_recovery"]', 'ACTIVE'),
('usr_admin', 'ORG-APEX', 'Vikram Joshi', 'admin@apexpharma.com', '$2y$10$iKzrqfO37nF67p2cT587ceYy.958L0h5Kz3X0I1sE8qgB3Jc5Qo4i', 'Admin', 'Plant IT & Serialization Admin', '["print_labels","reprint_labels","create_batch","edit_batch","edit_products","edit_template","manage_users","view_audit","backup_archive","edit_company","printer_settings","manage_logo"]', 'ACTIVE'),
('usr_supervisor', 'ORG-APEX', 'Dr. Anjali Nair', 'supervisor@apexpharma.com', '$2y$10$iKzrqfO37nF67p2cT587ceYy.958L0h5Kz3X0I1sE8qgB3Jc5Qo4i', 'Supervisor', 'Quality Assurance & Regulatory Compliance', '["print_labels","reprint_labels","edit_drum_weight","edit_products","edit_template","view_audit"]', 'ACTIVE'),
('usr_operator', 'ORG-APEX', 'Ramesh Kumar', 'operator@apexpharma.com', '$2y$10$iKzrqfO37nF67p2cT587ceYy.958L0h5Kz3X0I1sE8qgB3Jc5Qo4i', 'Operator', 'Shop-Floor Packaging Line 02', '["print_labels","create_batch"]', 'ACTIVE');

-- 3. Initial Company Settings for ORG-APEX
INSERT INTO `company_settings` (`organization_id`, `company_name`, `address`, `contact_number`, `email`, `mfg_license_number`, `gst_number`, `gs1_company_prefix`, `extension_digit`, `next_serial_reference`, `printer_name`, `default_label_dimension`) VALUES
('ORG-APEX', 'Apex Healthcare Ltd.', 'Plot No. 42-45, Phase III, Industrial Area, Baddi, HP - 173205', '+91 1795 244800', 'compliance@apexpharma.com', 'HP/MNB/08/123-A', '02AAACA4512B1Z6', '8901234', '1', 41, 'Zebra ZT411 Industrial (Thermal 300DPI - Line 02)', '4x6');

-- 4. Initial Product
INSERT INTO `products` (`id`, `organization_id`, `name`, `code`, `api_name`, `brand_name`, `gtin14`, `mfg_license_number`, `storage_conditions`, `pharmacopeia`, `caution_text`, `status`, `country_of_origin`) VALUES
('prod_1', 'ORG-APEX', 'Paracetamol Pure API (Fine Powder)', 'API-PARA-01', 'Paracetamol IP/USP (Acetaminophen)', 'Apex-ParaPure', '08901234567890', 'HP/MNB/08/123-A', 'Store below 25°C in a dry place. Protect from direct sunlight.', 'IP', 'CAUTION: For industrial pharmaceutical manufacturing only. Potent analgesic compound.', 'Active', 'India');

-- 5. Initial Batch
INSERT INTO `batches` (`id`, `organization_id`, `batch_number`, `product_id`, `product_name`, `batch_size_kg`, `total_drums`, `default_net_weight`, `mfg_date`, `expiry_date`, `status`, `authorized_by`, `authorized_at`, `created_by`) VALUES
('batch_1', 'ORG-APEX', 'B-2026-PARA-001', 'prod_1', 'Paracetamol Pure API (Fine Powder)', 1000.000, 40, 25.000, '2026-11-20', '2029-11-19', 'In Progress', 'Dr. Anjali Nair (QA Supervisor)', '2026-11-20 10:00:00', 'Vikram Joshi (Admin)');
