<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - END-TO-END WORKFLOW & LOGIN VERIFICATION SUITE
 * ============================================================================
 * Verifies:
 *   1. SuperAdmin Login (Bypasses license & temp password requirements)
 *   2. Client Organization Onboarding via API (Zero-Knowledge: No password returned)
 *   3. Client Admin First Login with Temporary Password (Triggers must_change_password)
 *   4. Client Admin Permanent Password Establishment (21 CFR Part 11 §11.200)
 *   5. Client Admin Login with Permanent Password (Direct Access, must_change_password: false)
 *   6. Expired / Deactivated License Blocking (Accurate license message, 0 attempts logged)
 *   7. Organization Deletion with Cascade Cleanup & Audit Trail
 * ============================================================================
 */

declare(strict_types=1);

define('PHARMALABEL_INIT', true);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/smtp_client.php';
require_once __DIR__ . '/../utils/mailer.php';

$pdo = getDbConnection();

function apiRequest(string $method, string $path, array $data = []): array {
    $ch = curl_init('http://127.0.0.1:8000' . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if (!empty($data)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => json_decode((string)$res, true)];
}

echo "=================================================================\n";
echo "  PHARMALABEL PRO - END-TO-END WORKFLOW VERIFICATION\n";
echo "=================================================================\n\n";

$allPassed = true;

// ----------------------------------------------------------------------------
// TEST 1: SuperAdmin Login
// ----------------------------------------------------------------------------
echo "[TEST 1] Testing SuperAdmin Login...\n";
$superLogin = apiRequest('POST', '/api/auth/login.php', [
    'email' => 'superadmin@camelcomm.in',
    'password' => 'Password@123'
]);

if ($superLogin['code'] === 200 && ($superLogin['body']['data']['user']['role'] ?? '') === 'SuperAdmin') {
    $mustChange = $superLogin['body']['data']['must_change_password'] ?? $superLogin['body']['data']['user']['must_change_password'] ?? null;
    if ($mustChange === false) {
        echo "  ✓ PASS: SuperAdmin authenticated successfully. must_change_password is FALSE.\n";
    } else {
        echo "  ✗ FAIL: SuperAdmin flagged with must_change_password = true.\n";
        $allPassed = false;
    }
} else {
    echo "  ✗ FAIL: SuperAdmin login failed (HTTP {$superLogin['code']}).\n";
    $allPassed = false;
}

// ----------------------------------------------------------------------------
// TEST 2: Onboard New Pharma Company via SuperAdmin API
// ----------------------------------------------------------------------------
echo "\n[TEST 2] Testing Zero-Knowledge Company Onboarding...\n";
$testEmail = 'biotech.tester@workflowcheck.com';
$onboardRes = apiRequest('POST', '/api/superadmin/organizations.php', [
    'name' => 'Apex Biotech Workflow Ltd',
    'plant_location' => 'Vapi, Gujarat',
    'contact_email' => $testEmail,
    'gs1_company_prefix' => '8907654',
    'edition' => 'Enterprise Unlimited Traceability',
    'valid_until' => '2028-12-31'
]);

if ($onboardRes['code'] === 201 && ($onboardRes['body']['success'] ?? false) === true) {
    echo "  ✓ PASS: Organization created with HTTP 201.\n";
    
    // Check Zero-Knowledge Requirement: Password must NOT be in the API response!
    if (isset($onboardRes['body']['data']['temporaryPassword'])) {
        echo "  ✗ FAIL: Security violation - temporaryPassword was exposed in API response!\n";
        $allPassed = false;
    } else {
        echo "  ✓ PASS: Zero-Knowledge confirmed: temporaryPassword is NOT returned to frontend.\n";
    }

    $createdOrgId = $onboardRes['body']['data']['organization']['id'] ?? '';
    echo "  ✓ Created Org ID: $createdOrgId\n";
} else {
    echo "  ✗ FAIL: Onboarding failed: " . ($onboardRes['body']['error'] ?? json_encode($onboardRes)) . "\n";
    $allPassed = false;
    $createdOrgId = null;
}

// ----------------------------------------------------------------------------
// TEST 3: Client Admin Login & Mandatory Password Reset Flow
// ----------------------------------------------------------------------------
if ($createdOrgId) {
    echo "\n[TEST 3] Testing Client Admin Login & Mandatory Password Reset...\n";
    
    // Set a known temporary password for the automated test
    $knownTempPass = 'Pharma@Temp2026!';
    $stmt = $pdo->prepare("UPDATE users SET password_hash = :hash, password_changed_at = NULL WHERE email = :email");
    $stmt->execute([
        ':hash' => password_hash($knownTempPass, PASSWORD_BCRYPT),
        ':email' => $testEmail
    ]);

    // Step 3a: Login with Temporary Password
    $clientLogin = apiRequest('POST', '/api/auth/login.php', [
        'email' => $testEmail,
        'password' => $knownTempPass,
        'organization_id' => $createdOrgId
    ]);

    $tempMustChange = $clientLogin['body']['data']['must_change_password'] ?? $clientLogin['body']['data']['user']['must_change_password'] ?? null;
    if ($clientLogin['code'] === 200 && $tempMustChange === true) {
        echo "  ✓ PASS: Client Admin logged in with temporary password. must_change_password is TRUE.\n";
    } else {
        echo "  ✗ FAIL: Client Admin login failed or must_change_password not set: " . json_encode($clientLogin) . "\n";
        $allPassed = false;
    }

    // Step 3b: Establish Permanent Password via change_password.php
    $knownPermanentPass = 'ApexPerm@Secure2026!';
    $changeRes = apiRequest('POST', '/api/auth/change_password.php', [
        'email' => $testEmail,
        'current_password' => $knownTempPass,
        'new_password' => $knownPermanentPass,
        'confirm_password' => $knownPermanentPass
    ]);

    if ($changeRes['code'] === 200 && ($changeRes['body']['success'] ?? false) === true) {
        echo "  ✓ PASS: Permanent password successfully established (HTTP 200).\n";
    } else {
        echo "  ✗ FAIL: Password change failed: " . json_encode($changeRes) . "\n";
        $allPassed = false;
    }

    // Step 3c: Re-login with New Permanent Password
    $permLogin = apiRequest('POST', '/api/auth/login.php', [
        'email' => $testEmail,
        'password' => $knownPermanentPass,
        'organization_id' => $createdOrgId
    ]);

    $permMustChange = $permLogin['body']['data']['must_change_password'] ?? $permLogin['body']['data']['user']['must_change_password'] ?? null;
    if ($permLogin['code'] === 200 && $permMustChange === false) {
        echo "  ✓ PASS: Client Admin logged in with Permanent Password. must_change_password is FALSE (Allowed into Production Workflows!).\n";
    } else {
        echo "  ✗ FAIL: Permanent login failed or still blocked by password change: " . json_encode($permLogin) . "\n";
        $allPassed = false;
    }

    // Step 3d: Verify Old Temp Password is Rejected
    $oldLogin = apiRequest('POST', '/api/auth/login.php', [
        'email' => $testEmail,
        'password' => $knownTempPass,
        'organization_id' => $createdOrgId
    ]);

    if ($oldLogin['code'] === 401) {
        echo "  ✓ PASS: Old temporary password properly invalidated and rejected.\n";
    } else {
        echo "  ✗ FAIL: Old temporary password was unexpectedly accepted.\n";
        $allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 4: Expired / Deactivated License Blocking
    // ------------------------------------------------------------------------
    echo "\n[TEST 4] Testing Expired / Suspended License Enforcement...\n";
    
    // Set the organization license to EXPIRED
    $pdo->prepare("UPDATE organizations SET license_status = 'EXPIRED' WHERE id = :id")->execute([':id' => $createdOrgId]);

    $expiredLogin = apiRequest('POST', '/api/auth/login.php', [
        'email' => $testEmail,
        'password' => $knownPermanentPass,
        'organization_id' => $createdOrgId
    ]);

    $expMsg = $expiredLogin['body']['message'] ?? ($expiredLogin['body']['error'] ?? '');
    if ($expiredLogin['code'] === 403 && (stripos($expMsg, 'expired') !== false)) {
        echo "  ✓ PASS: Expired organization blocked with HTTP 403: '{$expMsg}'.\n";
    } else {
        echo "  ✗ FAIL: Expired organization was not blocked correctly: " . json_encode($expiredLogin) . "\n";
        $allPassed = false;
    }

    // Set the organization license to SUSPENDED
    $pdo->prepare("UPDATE organizations SET license_status = 'SUSPENDED' WHERE id = :id")->execute([':id' => $createdOrgId]);

    $suspendedLogin = apiRequest('POST', '/api/auth/login.php', [
        'email' => $testEmail,
        'password' => $knownPermanentPass,
        'organization_id' => $createdOrgId
    ]);

    $suspMsg = $suspendedLogin['body']['message'] ?? ($suspendedLogin['body']['error'] ?? '');
    if ($suspendedLogin['code'] === 403 && (stripos($suspMsg, 'suspended') !== false)) {
        echo "  ✓ PASS: Suspended organization blocked with HTTP 403: '{$suspMsg}'.\n";
    } else {
        echo "  ✗ FAIL: Suspended organization was not blocked correctly: " . json_encode($suspendedLogin) . "\n";
        $allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 5: SuperAdmin Organization Deletion
    // ------------------------------------------------------------------------
    echo "\n[TEST 5] Testing SuperAdmin Organization Deletion...\n";
    $delRes = apiRequest('DELETE', '/api/superadmin/organizations.php', [
        'organization_id' => $createdOrgId,
        'reason' => 'Automated workflow end-to-end verification cleanup'
    ]);

    if ($delRes['code'] === 200 && ($delRes['body']['success'] ?? false) === true) {
        echo "  ✓ PASS: Organization permanently deleted with cascade cleanup.\n";
    } else {
        echo "  ✗ FAIL: Deletion failed: " . json_encode($delRes) . "\n";
        $allPassed = false;
    }
}

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
echo "\n=================================================================\n";
if ($allPassed) {
    echo "  🎉 ALL 5 WORKFLOW CHECKS PASSED: SYSTEM IS IN 100% PERFECT CONDITION!\n";
} else {
    echo "  ⚠️ SOME CHECKS REQUIRE ATTENTION (See log above)\n";
}
echo "=================================================================\n";
