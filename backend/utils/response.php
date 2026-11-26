<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - STANDARDIZED API RESPONSE FORMATTER
 * Ensures 100% Consistent JSON Payload Structure for React Frontend
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

/**
 * Returns current timestamp formatted in Indian Standard Time (IST).
 *
 * @return string
 */
function getIstTimestamp(): string
{
    $dt = new DateTime('now', new DateTimeZone('Asia/Kolkata'));
    return $dt->format('Y-m-d H:i:s \I\S\T');
}

/**
 * Send a standardized success JSON response and exit.
 *
 * @param mixed  $data       Payload data to return
 * @param string $message    Human-readable success message
 * @param int    $statusCode HTTP status code (default 200)
 * @param bool   $exit       Whether to terminate script execution
 * @return string JSON string (when $exit is false)
 */
function sendSuccess(mixed $data = null, string $message = 'Success', int $statusCode = 200, bool $exit = true): string
{
    http_response_code($statusCode);

    if (!headers_sent() && php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=UTF-8');
    }

    $payload = [
        'success'   => true,
        'message'   => $message,
        'data'      => $data,
        'timestamp' => getIstTimestamp()
    ];

    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($exit) {
        echo $json;
        exit(0);
    }

    return (string)$json;
}

/**
 * Send a standardized error JSON response and exit.
 *
 * @param string $message    Human-readable error description
 * @param int    $statusCode HTTP status code (default 400)
 * @param array  $errors     Optional array of granular validation/field errors
 * @param bool   $exit       Whether to terminate script execution
 * @return string JSON string (when $exit is false)
 */
function sendError(string $message, int $statusCode = 400, array $errors = [], bool $exit = true): string
{
    http_response_code($statusCode);

    if (!headers_sent() && php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=UTF-8');
    }

    $payload = [
        'success'   => false,
        'message'   => $message,
        'errors'    => $errors,
        'timestamp' => getIstTimestamp()
    ];

    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($exit) {
        echo $json;
        exit(0);
    }

    return (string)$json;
}

/**
 * Send a 422 Unprocessable Entity validation failure response.
 *
 * @param array  $validationErrors Key-value pairs of field errors
 * @param string $message          General validation failure message
 * @param bool   $exit             Whether to terminate script execution
 * @return string JSON string (when $exit is false)
 */
function sendValidationError(array $validationErrors, string $message = 'Validation failed', bool $exit = true): string
{
    return sendError($message, 422, $validationErrors, $exit);
}
