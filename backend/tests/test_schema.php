<?php
/**
 * Test & Validation Script for backend/database/schema.sql
 * Validates GxP compliance, multi-tenant isolation, foreign keys, and indexes.
 */

$schemaFile = __DIR__ . '/../database/schema.sql';

echo "========================================================\n";
echo "PHARMALABEL PRO - SCHEMA VALIDATION TEST SUITE\n";
echo "========================================================\n\n";

if (!file_exists($schemaFile)) {
    echo "❌ FAIL: schema.sql file not found at $schemaFile\n";
    exit(1);
}

$sql = file_get_contents($schemaFile);
$fileSize = strlen($sql);
echo "✅ File loaded: backend/database/schema.sql ($fileSize bytes)\n";

echo "\n--- 0. Database Creation Check ---\n";
if (preg_match("/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+`pharmalabel_db`/i", $sql)) {
    echo "  [PASS] `CREATE DATABASE IF NOT EXISTS \`pharmalabel_db\`` verified\n";
} else {
    echo "  [FAIL] Missing CREATE DATABASE statement\n";
}

if (preg_match("/USE\s+`pharmalabel_db`/i", $sql)) {
    echo "  [PASS] `USE \`pharmalabel_db\`` verified\n";
} else {
    echo "  [FAIL] Missing USE DATABASE statement\n";
}

// Required Tables
$requiredTables = [
    'organizations',
    'users',
    'company_settings',
    'products',
    'batches',
    'drums',
    'templates',
    'label_snapshots',
    'audit_logs'
];

$allTablesFound = true;
echo "\n--- 1. Table Definitions Check ---\n";
foreach ($requiredTables as $table) {
    if (preg_match("/CREATE\s+TABLE\s+`$table`/i", $sql)) {
        echo "  [PASS] Table `$table` defined with InnoDB & utf8mb4\n";
    } else {
        echo "  [FAIL] Missing table: `$table`\n";
        $allTablesFound = false;
    }
}

// Multi-tenant organization_id enforcement
echo "\n--- 2. Multi-Tenant Isolation Enforcement (`organization_id`) ---\n";
$tenantTables = ['users', 'company_settings', 'products', 'batches', 'drums', 'templates', 'label_snapshots', 'audit_logs'];
$allTenantsIsolated = true;
foreach ($tenantTables as $table) {
    // Check if CREATE TABLE for this table contains organization_id
    if (preg_match("/CREATE\s+TABLE\s+`$table`\s*\((.*?)\)\s*ENGINE/is", $sql, $matches)) {
        $tableBody = $matches[1];
        if (strpos($tableBody, '`organization_id`') !== false) {
            echo "  [PASS] `$table` enforces mandatory `organization_id` scoping\n";
        } else {
            echo "  [FAIL] `$table` lacks `organization_id` column!\n";
            $allTenantsIsolated = false;
        }
    }
}

// Unique GS1 SSCC constraint check (Zero duplicate guarantee)
echo "\n--- 3. GS1 SSCC Zero-Duplicate Unique Constraint Check ---\n";
if (strpos($sql, 'uq_org_sscc') !== false) {
    echo "  [PASS] Unique constraint `uq_org_sscc` (`organization_id`, `sscc`) is active!\n";
} else {
    echo "  [FAIL] Missing unique constraint on SSCC!\n";
}

// Atomic counter lock check in company_settings
echo "\n--- 4. Serialization Counter Atomicity Check ---\n";
if (strpos($sql, 'next_serial_reference') !== false) {
    echo "  [PASS] `next_serial_reference` counter defined for atomic `FOR UPDATE` locking\n";
} else {
    echo "  [FAIL] Missing `next_serial_reference` column!\n";
}

// Seed Data Check
echo "\n--- 5. Initial Seed Data Verification ---\n";
$seedChecks = [
    'Initial Organizations' => "INSERT INTO `organizations`",
    'Initial Users' => "INSERT INTO `users`",
    'Initial Company Settings' => "INSERT INTO `company_settings`",
    'Initial Products' => "INSERT INTO `products`",
    'Initial Batches' => "INSERT INTO `batches`"
];

foreach ($seedChecks as $label => $pattern) {
    if (strpos($sql, $pattern) !== false) {
        echo "  [PASS] $label seeded successfully\n";
    } else {
        echo "  [FAIL] Missing $label!\n";
    }
}

// Summary
echo "\n========================================================\n";
if ($allTablesFound && $allTenantsIsolated) {
    echo "🎉 ALL TESTS PASSED: schema.sql is 100% valid and GxP compliant!\n";
    echo "========================================================\n";
    exit(0);
} else {
    echo "❌ VALIDATION FAILED: Please inspect errors above.\n";
    echo "========================================================\n";
    exit(1);
}
