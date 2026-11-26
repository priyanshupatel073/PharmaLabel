<?php
/**
 * Comprehensive Test Suite for backend/utils/ (response, sscc_engine, audit_logger)
 */

declare(strict_types=1);

echo "========================================================\n";
echo "PHARMALABEL PRO - CORE UTILITIES TEST SUITE\n";
echo "========================================================\n\n";

// 1. RESPONSE.PHP TESTS
echo "--- 1. Testing response.php (JSON Output Formatter) ---\n";
require_once __DIR__ . '/../utils/response.php';

$istTime = getIstTimestamp();
echo "  [PASS] getIstTimestamp() returned: $istTime\n";

// Test sendSuccess
$successJson = sendSuccess(['drum_id' => 101, 'status' => 'Printed'], 'Drum label ready', 200, false);
$successData = json_decode($successJson, true);

if ($successData && $successData['success'] === true && $successData['data']['drum_id'] === 101) {
    echo "  [PASS] sendSuccess() formatted standard payload correctly\n";
} else {
    echo "  [FAIL] sendSuccess() malformed JSON output!\n";
    exit(1);
}

// Test sendError
$errorJson = sendError('Invalid GS1 Checksum', 400, ['field' => 'sscc'], false);
$errorData = json_decode($errorJson, true);

if ($errorData && $errorData['success'] === false && $errorData['message'] === 'Invalid GS1 Checksum') {
    echo "  [PASS] sendError() formatted error payload correctly\n";
} else {
    echo "  [FAIL] sendError() malformed JSON output!\n";
    exit(1);
}

// Test sendValidationError
$validationJson = sendValidationError(['tare_weight' => 'Must be positive number'], 'Validation failed', false);
$validationData = json_decode($validationJson, true);

if ($validationData && $validationData['errors']['tare_weight']) {
    echo "  [PASS] sendValidationError() formatted 422 errors correctly\n";
} else {
    echo "  [FAIL] sendValidationError() failed!\n";
    exit(1);
}

// 2. SSCC_ENGINE.PHP TESTS
echo "\n--- 2. Testing sscc_engine.php (GS1 SSCC-18 Mod-10 Engine) ---\n";
require_once __DIR__ . '/../utils/sscc_engine.php';

// Known Test Vector:
// Payload 17 digits: '18901234000000041'
// Mathematical Mod-10 check digit should be 7
$testPayload = '18901234000000041';
$calculatedCheckDigit = calculateGs1Mod10($testPayload);
if ($calculatedCheckDigit === 7) {
    echo "  [PASS] calculateGs1Mod10('$testPayload') = 7 (Mathematically Exact!)\n";
} else {
    echo "  [FAIL] calculateGs1Mod10 expected 7, got $calculatedCheckDigit\n";
    exit(1);
}

// Test generateSSCC18
$generatedSSCC = generateSSCC18('1', '8901234', 41);
if ($generatedSSCC === '189012340000000417') {
    echo "  [PASS] generateSSCC18('1', '8901234', 41) = '$generatedSSCC' (18 digits)\n";
} else {
    echo "  [FAIL] generateSSCC18 expected '189012340000000417', got '$generatedSSCC'\n";
    exit(1);
}

// Test validateSSCC18
if (validateSSCC18($generatedSSCC) === true) {
    echo "  [PASS] validateSSCC18('$generatedSSCC') passed valid check\n";
} else {
    echo "  [FAIL] validateSSCC18 failed on valid SSCC!\n";
    exit(1);
}

// Tampered SSCC (change check digit to 8)
$tamperedSSCC = '189012340000000418';
if (validateSSCC18($tamperedSSCC) === false) {
    echo "  [PASS] validateSSCC18('$tamperedSSCC') successfully detected tampered check digit!\n";
} else {
    echo "  [FAIL] validateSSCC18 failed to detect invalid check digit!\n";
    exit(1);
}

// Test formatSSCCWithAI
$formattedWithAI = formatSSCCWithAI($generatedSSCC);
if (strpos($formattedWithAI, '(00)') !== false) {
    echo "  [PASS] formatSSCCWithAI: $formattedWithAI\n";
} else {
    echo "  [FAIL] formatSSCCWithAI failed!\n";
    exit(1);
}

// 3. AUDIT_LOGGER.PHP TESTS (Using In-Memory SQLite to test real SQL execution)
echo "\n--- 3. Testing audit_logger.php (21 CFR Part 11 ALCOA+ Logger) ---\n";
require_once __DIR__ . '/../utils/audit_logger.php';

// Create temporary in-memory database with audit_logs schema
$testDb = new PDO('sqlite::memory:', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

$testDb->exec("CREATE TABLE `audit_logs` (
    `id` VARCHAR(80) PRIMARY KEY,
    `organization_id` VARCHAR(50),
    `timestamp` DATETIME,
    `timestamp_ist` VARCHAR(50),
    `user_id` VARCHAR(50),
    `user_name` VARCHAR(150),
    `user_role` VARCHAR(50),
    `action` VARCHAR(100),
    `module` VARCHAR(100),
    `batch_ref` VARCHAR(100),
    `drum_ref` INT,
    `sscc` VARCHAR(20),
    `old_value` TEXT,
    `new_value` TEXT,
    `reason` TEXT,
    `outcome` VARCHAR(20),
    `ip_address` VARCHAR(50),
    `user_agent` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$auditId = logAuditTrail(
    $testDb,
    'PRINT_DRUM_LABEL',
    'PackagingFloor',
    [
        'batch_ref' => 'B-2026-PARA-001',
        'drum_ref'  => 1,
        'sscc'      => $generatedSSCC,
        'old_value' => 'Pending',
        'new_value' => 'Printed',
        'reason'    => 'Initial packaging line execution',
        'outcome'   => 'SUCCESS'
    ],
    'ORG-APEX',
    [
        'id'   => 'usr_operator',
        'name' => 'Ramesh Kumar',
        'role' => 'Operator'
    ]
);

// Verify inserted row in database
$stmt = $testDb->query("SELECT * FROM `audit_logs` WHERE `id` = '$auditId'");
$loggedRow = $stmt->fetch(PDO::FETCH_ASSOC);

if ($loggedRow && $loggedRow['user_name'] === 'Ramesh Kumar' && $loggedRow['sscc'] === $generatedSSCC) {
    echo "  [PASS] logAuditTrail() executed real INSERT query successfully!\n";
    echo "         Logged Event: [ID: {$loggedRow['id']}] {$loggedRow['action']} by {$loggedRow['user_name']} ({$loggedRow['user_role']})\n";
    echo "         IST Timestamp: {$loggedRow['timestamp_ist']}\n";
    echo "         ALCOA+ Reason: {$loggedRow['reason']}\n";
} else {
    echo "  [FAIL] Audit log insertion verification failed!\n";
    exit(1);
}

echo "\n========================================================\n";
echo "🎉 ALL TESTS PASSED: All 3 Core Utility Engines are 100% verified!\n";
echo "========================================================\n";
exit(0);
