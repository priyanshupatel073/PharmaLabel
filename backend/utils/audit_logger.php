<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - 21 CFR PART 11 ALCOA+ AUDIT LOGGER ENGINE
 * Writes Immutable, Append-Only Compliance Records with IST Timestamps
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/response.php';

/**
 * Records an immutable 21 CFR Part 11 ALCOA+ compliant entry into audit_logs table.
 *
 * @param PDO         $pdo     Active database connection instance
 * @param string      $action  System event verb (e.g. 'USER_LOGIN', 'PRINT_DRUM_LABEL', 'APPROVE_PRODUCT')
 * @param string      $module  System area (e.g. 'Authentication', 'Serialization', 'QualityAssurance')
 * @param array       $details Contextual details (batchRef, drumRef, sscc, oldValue, newValue, reason, outcome)
 * @param string|null $orgId   Tenant organization ID (NULL for SuperAdmin platform events)
 * @param array|null  $user    Optional user context array [id, name, role]
 * @throws PDOException on database error
 * @return string Generated unique Audit Log ID
 */
function logAuditTrail(
    PDO $pdo,
    string $action,
    string $module,
    array $details = [],
    ?string $orgId = null,
    ?array $user = null
): string {
    // Generate unique ALCOA+ log identifier: aud_<timestamp>_<randomHex>
    $logId = sprintf('aud_%d_%s', time(), bin2hex(random_bytes(4)));

    // Accurate local Indian Standard Time (IST) & standard UTC
    $nowUtc = new DateTime('now', new DateTimeZone('UTC'));
    $nowIst = new DateTime('now', new DateTimeZone('Asia/Kolkata'));

    $timestampUtc = $nowUtc->format('Y-m-d H:i:s');
    $timestampIst = $nowIst->format('Y-m-d H:i:s \I\S\T');

    // Resolve user context
    $userId   = $user['id']   ?? ($_SESSION['user_id']   ?? 'SYSTEM');
    $userName = $user['name'] ?? ($_SESSION['user_name'] ?? 'System Process');
    $userRole = $user['role'] ?? ($_SESSION['user_role'] ?? 'System');

    // Extract detail parameters
    $batchRef  = isset($details['batch_ref'])  ? (string)$details['batch_ref']  : null;
    $drumRef   = isset($details['drum_ref'])   ? (int)$details['drum_ref']      : null;
    $sscc      = isset($details['sscc'])       ? (string)$details['sscc']       : null;
    $oldValue  = isset($details['old_value'])  ? (string)$details['old_value']  : null;
    $newValue  = isset($details['new_value'])  ? (string)$details['new_value']  : null;
    $reason    = isset($details['reason'])     ? (string)$details['reason']     : 'Standard operating compliance procedure';
    $outcome   = (isset($details['outcome']) && strtoupper($details['outcome']) === 'FAILED') ? 'FAILED' : 'SUCCESS';

    // Client Network Metadata
    $ipAddress = $_SERVER['REMOTE_ADDR']          ?? '127.0.0.1';
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'CLI / Test Runner', 0, 500);

    $sql = "INSERT INTO `audit_logs` (
        `id`,
        `organization_id`,
        `timestamp`,
        `timestamp_ist`,
        `user_id`,
        `user_name`,
        `user_role`,
        `action`,
        `module`,
        `batch_ref`,
        `drum_ref`,
        `sscc`,
        `old_value`,
        `new_value`,
        `reason`,
        `outcome`,
        `ip_address`,
        `user_agent`
    ) VALUES (
        :id,
        :organization_id,
        :timestamp_utc,
        :timestamp_ist,
        :user_id,
        :user_name,
        :user_role,
        :action,
        :module,
        :batch_ref,
        :drum_ref,
        :sscc,
        :old_value,
        :new_value,
        :reason,
        :outcome,
        :ip_address,
        :user_agent
    )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id'              => $logId,
        ':organization_id' => $orgId,
        ':timestamp_utc'   => $timestampUtc,
        ':timestamp_ist'   => $timestampIst,
        ':user_id'         => $userId,
        ':user_name'       => $userName,
        ':user_role'       => $userRole,
        ':action'          => $action,
        ':module'          => $module,
        ':batch_ref'       => $batchRef,
        ':drum_ref'        => $drumRef,
        ':sscc'            => $sscc,
        ':old_value'       => $oldValue,
        ':new_value'       => $newValue,
        ':reason'          => $reason,
        ':outcome'         => $outcome,
        ':ip_address'      => $ipAddress,
        ':user_agent'      => $userAgent
    ]);

    return $logId;
}
