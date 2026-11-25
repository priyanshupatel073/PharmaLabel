<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - DATABASE CONNECTION & PDO CONFIGURATION
 * Compliant with 21 CFR Part 11 & GxP ACID Transaction Requirements
 * ============================================================================
 */

declare(strict_types=1);

// Prevent direct browser access if accessed without bootstrap
if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

// Database Credentials (Can be overridden by server environment variables)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME', getenv('DB_NAME') ?: 'pharmalabel_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

/**
 * Returns a configured, singleton PDO instance.
 *
 * @throws PDOException if connection fails
 * @return PDO
 */
function getDbConnection(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_CHARSET
    );

    $options = [
        // Throw exceptions on errors (mandatory for transaction rollback in 21 CFR Part 11)
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        // Return clean associative arrays
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Disable emulated prepares to enforce native SQL driver prepared statements
        PDO::ATTR_EMULATE_PREPARES   => false,
        // Set connection timeout
        PDO::ATTR_TIMEOUT            => 5,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Log technical error securely without leaking database password in response
        error_log('[PharmaLabel DB Error] Connection failed: ' . $e->getMessage());

        // Throw sanitized exception
        throw new PDOException(
            'Database connection error. Please verify database host and credentials in config/database.php.',
            (int)$e->getCode()
        );
    }
}
