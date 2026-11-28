<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

echo "========================================================\n";
echo "STEP 2: TEMPLATE DESIGNER PRODUCTION VERIFICATION\n";
echo "========================================================\n\n";

$pdo = getDbConnection();
$orgId = 'ORG-HARIHAR-265';

// Authenticate Plant Admin
function postJson($url, $data, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    $headers[] = 'Content-Type: application/json';
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($response, true), 'raw' => $response];
}

function getJson($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode($response, true), 'raw' => $response];
}

$loginRes = postJson('http://127.0.0.1:8000/api/auth/login.php', [
    'email' => 'rawalakshay1188@gmail.com',
    'password' => 'Akshay@0712'
]);

if ($loginRes['code'] !== 200) {
    die("Authentication failed for plant admin\n");
}
$token = $loginRes['body']['data']['token'];
$authHeader = "Authorization: Bearer $token";

// 1. GET Templates
echo "TEST 1: Fetch Templates for Organization...\n";
$getTemplates = getJson("http://127.0.0.1:8000/api/templates/index.php?organization_id={$orgId}", [$authHeader]);
echo "  HTTP Code: {$getTemplates['code']}\n";
if ($getTemplates['code'] === 200 && !empty($getTemplates['body']['data'])) {
    $tplList = $getTemplates['body']['data'];
    echo "  [PASS] Retrieved " . count($tplList) . " template(s).\n";
    $firstTpl = $tplList[0];
    echo "  First template: ID={$firstTpl['id']}, Name='{$firstTpl['name']}', Rev={$firstTpl['revision']}, Status={$firstTpl['status']}\n";
    echo "  Has Appearance: " . (isset($firstTpl['appearance']) ? 'YES' : 'NO') . "\n";
    echo "  Has PharmaFields: " . (isset($firstTpl['fields']) ? count($firstTpl['fields']) . ' fields' : 'NO') . "\n";
} else {
    echo "  [FAIL] Failed to fetch templates: " . ($getTemplates['body']['message'] ?? $getTemplates['raw']) . "\n";
}

$pdo->prepare("DELETE FROM `templates` WHERE name LIKE 'Automated Integration Test Label%'")->execute();

// 2. POST: Create New Template Draft
echo "\nTEST 2: Create New Template Draft with Custom Appearance & Field Overrides...\n";
$tplName = 'Automated Integration Test Label ' . time() . ' (4x6)';
$newTplData = [
    'name' => $tplName,
    'dimension' => '4x6',
    'change_summary' => 'Created during Step 2 verification test run',
    'appearance' => [
        'headerFontSizePt' => 18,
        'bodyFontSizePt' => 11,
        'expiryType' => 'RETEST',
        'mfgDateFormat' => 'DD-MMM-YYYY',
        'expiryDateFormat' => 'DD-MMM-YYYY',
        'labelMode' => 'full',
        'headerBgColor' => '#0b2b52',
        'headerFontColor' => '#ffffff',
        'showHeaderBar' => true,
        'showOuterBorder' => true,
        'show2DBarcode' => true
    ],
    'fields' => [
        ['id' => 'company_header', 'defaultLabel' => 'Company Header & Brand Title', 'customLabelOverride' => 'HARIHAR PHARMA EXPORTS', 'mandatory' => true, 'included' => true, 'order' => 1],
        ['id' => 'product_name', 'defaultLabel' => 'Name of API / Active Substance', 'customLabelOverride' => 'API SUBSTANCE NAME', 'mandatory' => true, 'included' => true, 'order' => 2],
        ['id' => 'pharmacopeia', 'defaultLabel' => 'Pharmacopeial Grade (IP / BP / USP / EP)', 'customLabelOverride' => '', 'mandatory' => true, 'included' => true, 'order' => 3],
        ['id' => 'batch_number', 'defaultLabel' => 'Batch Number / Lot No.', 'customLabelOverride' => 'LOT NUMBER', 'mandatory' => true, 'included' => true, 'order' => 4],
        ['id' => 'drum_number', 'defaultLabel' => 'Drum Container Ref (Drum X of Y)', 'customLabelOverride' => '', 'mandatory' => true, 'included' => true, 'order' => 5],
        ['id' => 'net_weight', 'defaultLabel' => 'Net Weight (KG)', 'customLabelOverride' => '', 'mandatory' => true, 'included' => true, 'order' => 6],
        ['id' => 'gross_weight', 'defaultLabel' => 'Gross Weight (KG)', 'customLabelOverride' => '', 'mandatory' => true, 'included' => true, 'order' => 7]
    ]
];

$createTpl = postJson("http://127.0.0.1:8000/api/templates/index.php?organization_id={$orgId}", $newTplData, [$authHeader]);
echo "  Create Draft HTTP Code: {$createTpl['code']}\n";
if ($createTpl['code'] === 200 && !empty($createTpl['body']['data']['id'])) {
    $createdId = $createTpl['body']['data']['id'];
    echo "  [PASS] Created template ID: $createdId, Revision: {$createTpl['body']['data']['revision']}, Status: {$createTpl['body']['data']['status']}\n";
} else {
    echo "  [FAIL] Failed to create template: " . ($createTpl['body']['message'] ?? $createTpl['raw']) . "\n";
    $createdId = null;
}

if ($createdId) {
    // 3. POST: Approve Template (21 CFR Part 11 Electronic Signature)
    echo "\nTEST 3: QA Approval Workflow (Status transition -> Approved/Effective)...\n";
    $approveRes = postJson("http://127.0.0.1:8000/api/templates/index.php?action=approve&organization_id={$orgId}", [
        'template_id' => $createdId,
        'approver_name' => 'Akshay Rawal (Quality Head)',
        'change_summary' => 'Approved for commercial production line use'
    ], [$authHeader]);

    echo "  Approve HTTP Code: {$approveRes['code']}\n";
    if ($approveRes['code'] === 200 && $approveRes['body']['data']['status'] === 'Approved/Effective') {
        echo "  [PASS] Template approved and status is 'Approved/Effective'!\n";
    } else {
        echo "  [FAIL] Template approval failed: " . ($approveRes['body']['message'] ?? $approveRes['raw']) . "\n";
    }

    // 4. POST: Branch New Revision
    echo "\nTEST 4: Immutable Revision Branching (Draft Rev 2.0)...\n";
    $branchRes = postJson("http://127.0.0.1:8000/api/templates/index.php?action=branch&organization_id={$orgId}", [
        'template_id' => $createdId
    ], [$authHeader]);

    echo "  Branch HTTP Code: {$branchRes['code']}\n";
    if ($branchRes['code'] === 200 && $branchRes['body']['data']['status'] === 'Draft' && $branchRes['body']['data']['revision'] === '2.0') {
        echo "  [PASS] Successfully branched new revision Rev 2.0 (Draft)!\n";
        $branchedId = $branchRes['body']['data']['id'];
        
        // Clean up test templates from database
        $pdo->prepare("DELETE FROM `templates` WHERE id IN (:id1, :id2)")->execute([':id1' => $createdId, ':id2' => $branchedId]);
        echo "  [INFO] Cleaned up test templates from database.\n";
    } else {
        echo "  [FAIL] Revision branching failed: " . ($branchRes['body']['message'] ?? $branchRes['raw']) . "\n";
    }
}

echo "\n========================================================\n";
echo "STEP 2 VERIFICATION COMPLETE\n";
echo "========================================================\n";
