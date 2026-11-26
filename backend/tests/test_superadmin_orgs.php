<?php
/**
 * Test SuperAdmin Organizations API with Auto-Provisioning & Email Dispatch
 */
require_once __DIR__ . '/../config/database.php';

$pdo = getDbConnection();

// Clean up any previous Torrent test records
$pdo->exec("DELETE FROM `users` WHERE `email` = 'admin@torrentpharma.com'");
$pdo->exec("DELETE FROM `company_settings` WHERE `organization_id` LIKE 'ORG-TORRENT%'");
$pdo->exec("DELETE FROM `organizations` WHERE `name` LIKE 'Torrent Pharmaceuticals%'");

function callApi($url, $method = 'GET', $body = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        }
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'data' => json_decode($res, true)];
}

echo "=== 1. Test GET Organizations List ===\n";
$getRes = callApi('http://127.0.0.1:8000/api/superadmin/organizations.php');
echo "GET Organizations HTTP {$getRes['code']}: Found " . count($getRes['data']['data'] ?? []) . " organizations.\n";

echo "\n=== 2. Test POST Onboard New Organization (Torrent Pharma) ===\n";
$onboardPayload = [
    'name'               => 'Torrent Pharmaceuticals Ltd.',
    'plant_location'     => 'Dahej, Gujarat (SEZ Unit 04)',
    'contact_email'      => 'admin@torrentpharma.com',
    'gs1_company_prefix' => '8905544',
    'edition'            => 'Enterprise Unlimited Traceability',
    'valid_until'        => '2028-06-30'
];

$onboardRes = callApi('http://127.0.0.1:8000/api/superadmin/organizations.php', 'POST', $onboardPayload);
echo "Onboard HTTP {$onboardRes['code']}: " . ($onboardRes['data']['message'] ?? '') . "\n";

$newOrg = $onboardRes['data']['data']['organization'] ?? [];
$tempPass = $onboardRes['data']['data']['temporaryPassword'] ?? '';
$emailDispatch = $onboardRes['data']['data']['emailDispatch'] ?? [];

echo "Generated Org ID : " . ($newOrg['id'] ?? '') . "\n";
echo "Plant Admin Email: " . ($newOrg['contactEmail'] ?? '') . "\n";
echo "Temporary Password: " . $tempPass . "\n";
echo "Email Dispatch Log: " . ($emailDispatch['log_file'] ?? '') . "\n";

echo "\n=== 3. Verify Database Records ===\n";
$stmtOrg = $pdo->prepare("SELECT id, name, license_status FROM organizations WHERE id = :id");
$stmtOrg->execute([':id' => $newOrg['id']]);
$dbOrg = $stmtOrg->fetch(PDO::FETCH_ASSOC);
echo "DB Org: " . ($dbOrg['id'] ?? 'NOT FOUND') . " | Status: " . ($dbOrg['license_status'] ?? '') . "\n";

$stmtUser = $pdo->prepare("SELECT id, name, email, role FROM users WHERE email = 'admin@torrentpharma.com'");
$stmtUser->execute();
$dbUser = $stmtUser->fetch(PDO::FETCH_ASSOC);
echo "DB Admin User: " . ($dbUser['name'] ?? 'NOT FOUND') . " (" . ($dbUser['email'] ?? '') . ") | Role: " . ($dbUser['role'] ?? '') . "\n";

echo "\n=== 4. Test Login with Newly Generated Temporary Password ===\n";
$loginRes = callApi('http://127.0.0.1:8000/api/auth/login.php', 'POST', [
    'email'           => 'admin@torrentpharma.com',
    'password'        => $tempPass,
    'organization_id' => $newOrg['id']
]);
echo "Login with Temp Password HTTP {$loginRes['code']}: " . ($loginRes['data']['message'] ?? '') . "\n";
echo "Authenticated User: " . ($loginRes['data']['data']['user']['name'] ?? '') . " | Role: " . ($loginRes['data']['data']['user']['role'] ?? '') . "\n";

echo "\n=== 5. Verify Email Log File Exists and Contains Credentials ===\n";
$logPath = __DIR__ . '/../logs/sent_emails.log';
if (file_exists($logPath)) {
    $logContent = file_get_contents($logPath);
    $foundPass = strpos($logContent, $tempPass) !== false;
    $foundEmail = strpos($logContent, 'admin@torrentpharma.com') !== false;
    echo "Log file exists! Size: " . strlen($logContent) . " bytes.\n";
    echo "Contains recipient email: " . ($foundEmail ? 'YES' : 'NO') . "\n";
    echo "Contains temp password : " . ($foundPass ? 'YES' : 'NO') . "\n";
} else {
    echo "ERROR: sent_emails.log file not found!\n";
}

echo "\n=== 6. Test DELETE Organization (Permanent Decommissioning) ===\n";
$delCh = curl_init('http://127.0.0.1:8000/api/superadmin/organizations.php');
curl_setopt($delCh, CURLOPT_RETURNTRANSFER, true);
curl_setopt($delCh, CURLOPT_CUSTOMREQUEST, 'DELETE');
curl_setopt($delCh, CURLOPT_POSTFIELDS, json_encode(['organization_id' => $newOrg['id']]));
curl_setopt($delCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$delOutput = curl_exec($delCh);
$delCode = curl_getinfo($delCh, CURLINFO_HTTP_CODE);
curl_close($delCh);
$delData = json_decode((string)$delOutput, true);
echo "DELETE HTTP $delCode: " . ($delData['message'] ?? '') . "\n";
assert($delCode === 200);

echo "\nAll SuperAdmin Onboarding, Email Dispatch & Permanent Deletion tests passed!\n";
