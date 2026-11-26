<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - SUPERADMIN ORGANIZATIONS & LICENSING API
 * ============================================================================
 */

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../utils/audit_logger.php';
require_once __DIR__ . '/../../middleware/auth.php';

try {
    $pdo = getDbConnection();

    // GET: List all organizations
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("SELECT * FROM `organizations` ORDER BY name ASC");
        $orgs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendSuccess($orgs, 'Organizations retrieved successfully.');
    }

    // POST: Update license status or onboard organization
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?? [];

        $orgId = trim((string)($input['organization_id'] ?? ''));
        $status = strtoupper(trim((string)($input['license_status'] ?? '')));
        $validUntil = trim((string)($input['valid_until'] ?? ''));

        if (empty($orgId) || empty($status)) {
            sendError('Organization ID and License Status are required.', 400);
        }

        $stmt = $pdo->prepare("UPDATE `organizations` SET license_status = :status" . ($validUntil ? ", valid_until = :valid_until" : "") . " WHERE id = :id");
        $params = [':status' => $status, ':id' => $orgId];
        if ($validUntil) {
            $params[':valid_until'] = $validUntil;
        }
        $stmt->execute($params);

        logAuditTrail($pdo, 'LICENSE_STATUS_MODIFIED', 'SuperAdmin Licensing', [
            'reason'  => "Organization $orgId license status updated to $status",
            'outcome' => 'SUCCESS'
        ], $orgId);

        sendSuccess(['organization_id' => $orgId, 'license_status' => $status], "License status updated to $status.");
    }

    sendError('Method not allowed.', 405);

} catch (PDOException $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
