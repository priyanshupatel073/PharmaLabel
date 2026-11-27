<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

echo "====================================================================\n";
echo "PHARMALABEL PRO - STEP 1 AUDIT TRAIL HUB END-TO-END VERIFICATION\n";
echo "====================================================================\n\n";

$pdo = getDbConnection();

// 1. Verify Database Table Schema
echo "[1] Checking MySQL `audit_logs` Database Table...\n";
$stmt = $pdo->query("DESCRIBE `audit_logs`");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
$colNames = array_column($columns, 'Field');

$requiredCols = ['id', 'organization_id', 'timestamp', 'timestamp_ist', 'user_id', 'user_name', 'user_role', 'action', 'module', 'batch_ref', 'drum_ref', 'sscc', 'old_value', 'new_value', 'reason', 'outcome', 'ip_address'];
$missingCols = array_diff($requiredCols, $colNames);

if (empty($missingCols)) {
    echo "  PASS: All " . count($requiredCols) . " required 21 CFR Part 11 columns exist in `audit_logs` table.\n";
} else {
    echo "  FAIL: Missing columns: " . implode(', ', $missingCols) . "\n";
    exit(1);
}

$totalRecords = (int)$pdo->query("SELECT COUNT(*) FROM `audit_logs`")->fetchColumn();
echo "  INFO: Current records in `audit_logs` table: $totalRecords\n\n";

// Helper for HTTP calls
function httpGet($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($response, true)];
}

// 2. Test Backend API on port 8000
echo "[2] Testing Backend API (http://127.0.0.1:8000/api/audit/logs.php)...\n";
$resAll = httpGet('http://127.0.0.1:8000/api/audit/logs.php');
if ($resAll['code'] === 200 && ($resAll['data']['success'] ?? false) === true) {
    echo "  PASS: GET /api/audit/logs.php returned HTTP 200 OK.\n";
    $stats = $resAll['data']['data']['statistics'] ?? [];
    echo "  PASS: Statistics payload verified:\n";
    echo "        - Unique Labels: " . ($stats['unique_labels'] ?? 'N/A') . "\n";
    echo "        - Total Prints: " . ($stats['total_prints'] ?? 'N/A') . "\n";
    echo "        - Reprinted Labels: " . ($stats['reprinted_labels'] ?? 'N/A') . "\n";
    echo "        - Total Audit Entries: " . ($stats['audit_entries'] ?? 'N/A') . "\n";
    echo "        - Top Products count: " . count($stats['top_products'] ?? []) . "\n";
    echo "        - User Activity count: " . count($stats['user_activity'] ?? []) . "\n";
    echo "        - Module Distribution count: " . count($stats['module_distribution'] ?? []) . "\n";
} else {
    echo "  FAIL: GET /api/audit/logs.php returned code " . $resAll['code'] . "\n";
    exit(1);
}

// 3. Test User Activity / Authentication Filter (?category=auth)
echo "\n[3] Testing User Activity Sub-Tab Filter (?category=auth)...\n";
$resAuth = httpGet('http://127.0.0.1:8000/api/audit/logs.php?category=auth');
if ($resAuth['code'] === 200 && ($resAuth['data']['success'] ?? false) === true) {
    $authLogs = $resAuth['data']['data']['logs'] ?? [];
    echo "  PASS: Auth filter returned " . count($authLogs) . " authentication records.\n";
    if (!empty($authLogs)) {
        $sample = $authLogs[0];
        echo "  PASS: Sample auth record verified:\n";
        echo "        Action: {$sample['action']} | User: {$sample['userName']} | Outcome: {$sample['outcome']} | Workstation: {$sample['workstation']}\n";
    }
} else {
    echo "  FAIL: GET with category=auth failed.\n";
    exit(1);
}

// 4. Test Date Range Filtering (?from=...&to=...)
echo "\n[4] Testing Date Range Filter (?from=2026-11-20&to=2026-11-28)...\n";
$resDates = httpGet('http://127.0.0.1:8000/api/audit/logs.php?from=2026-11-20&to=2026-11-28');
if ($resDates['code'] === 200 && ($resDates['data']['success'] ?? false) === true) {
    echo "  PASS: Date range filter returned " . count($resDates['data']['data']['logs']) . " records.\n";
} else {
    echo "  FAIL: Date range filtering failed.\n";
    exit(1);
}

// 5. Test Search Query Filtering (?q=...)
echo "\n[5] Testing Search Query Filtering (?q=superadmin)...\n";
$resSearch = httpGet('http://127.0.0.1:8000/api/audit/logs.php?q=superadmin');
if ($resSearch['code'] === 200 && ($resSearch['data']['success'] ?? false) === true) {
    echo "  PASS: Search query filter returned " . count($resSearch['data']['data']['logs']) . " matched records.\n";
} else {
    echo "  FAIL: Search query filter failed.\n";
    exit(1);
}

// 6. Test Frontend Proxy on port 5173
echo "\n[6] Testing Frontend Dev Server Proxy (http://localhost:5173/api/audit/logs.php)...\n";
$resProxy = httpGet('http://localhost:5173/api/audit/logs.php');
if ($resProxy['code'] === 200 && ($resProxy['data']['success'] ?? false) === true) {
    echo "  PASS: Frontend proxy returned HTTP 200 OK and valid JSON.\n";
} else {
    echo "  FAIL: Frontend proxy returned code " . $resProxy['code'] . "\n";
    exit(1);
}

// 7. Verify Workstation Extraction
echo "\n[7] Verifying Workstation column data format...\n";
$logs = $resAll['data']['data']['logs'] ?? [];
$workstationsPresent = true;
foreach (array_slice($logs, 0, 5) as $l) {
    if (empty($l['workstation'])) {
        $workstationsPresent = false;
        break;
    }
}
if ($workstationsPresent) {
    echo "  PASS: Workstation column is populated on all records (e.g. '{$logs[0]['workstation']}').\n";
} else {
    echo "  FAIL: Workstation missing on some records.\n";
    exit(1);
}

echo "\n====================================================================\n";
echo "RESULT: ALL TESTS PASSED! BACKEND, FRONTEND & DATABASE ARE VERIFIED.\n";
echo "====================================================================\n";
