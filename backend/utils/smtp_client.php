<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - PURE PHP RFC 5321 SMTP CLIENT ENGINE
 * ============================================================================
 * High-reliability native socket SMTP client with SSL/TLS and AUTH LOGIN.
 * Zero external dependencies.
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

require_once __DIR__ . '/../config/mail.php';

/**
 * Send an email directly via real SMTP.
 *
 * @param string $recipientEmail Target email address
 * @param string $recipientName  Target recipient name
 * @param string $subject         Email subject
 * @param string $htmlBody        Full HTML content
 * @param array  $customConfig    Optional runtime SMTP override
 * @return array ['success' => bool, 'message' => string, 'code' => int, 'log' => string]
 */
function sendSmtpEmail(
    string $recipientEmail,
    string $recipientName,
    string $subject,
    string $htmlBody,
    array $customConfig = []
): array {
    $host = $customConfig['host'] ?? SMTP_HOST;
    $port = (int)($customConfig['port'] ?? SMTP_PORT);
    $secure = strtolower($customConfig['secure'] ?? SMTP_SECURE);
    $user = $customConfig['user'] ?? SMTP_USER;
    $pass = $customConfig['pass'] ?? SMTP_PASS;
    $fromEmail = $customConfig['from_email'] ?? (SMTP_FROM_EMAIL ?: $user);
    $fromName = $customConfig['from_name'] ?? SMTP_FROM_NAME;

    $debugLog = [];
    $log = function (string $msg) use (&$debugLog) {
        $debugLog[] = date('H:i:s') . ' ' . $msg;
    };

    // If credentials are completely empty
    if (empty($user) || empty($pass)) {
        return [
            'success' => false,
            'message' => 'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in backend/config/mail.php or .env.',
            'code'    => 500,
            'log'     => implode("\n", $debugLog)
        ];
    }

    $log("Connecting to SMTP server: {$host}:{$port} ({$secure})...");

    $context = stream_context_create([
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
            'allow_self_signed' => true
        ]
    ]);

    $prefix = ($secure === 'ssl' && $port === 465) ? 'ssl://' : 'tcp://';
    $errno = 0;
    $errstr = '';

    $socket = @stream_socket_client(
        $prefix . $host . ':' . $port,
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT,
        $context
    );

    if (!$socket) {
        $log("Connection failed: ($errno) $errstr");
        return [
            'success' => false,
            'message' => "Could not connect to SMTP server {$host}:{$port} - ($errno) $errstr",
            'code'    => 500,
            'log'     => implode("\n", $debugLog)
        ];
    }

    stream_set_timeout($socket, 15);

    $readResponse = function () use ($socket, &$debugLog, $log): array {
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            // Check if end of multiline response (code followed by space)
            if (preg_match('/^[0-9]{3} /', $line)) {
                break;
            }
        }
        $code = (int)substr($response, 0, 3);
        $log("< " . trim($response));
        return ['code' => $code, 'text' => $response];
    };

    $sendCommand = function (string $cmd) use ($socket, $log, $readResponse): array {
        $log("> " . (strpos($cmd, 'AUTH') === false && strlen($cmd) < 60 ? $cmd : '[MASKED_COMMAND]'));
        fputs($socket, $cmd . "\r\n");
        return $readResponse();
    };

    try {
        // 1. Initial Greeting
        $greeting = $readResponse();
        if ($greeting['code'] !== 220) {
            throw new Exception("Unexpected greeting code: " . $greeting['text']);
        }

        // 2. EHLO
        $ehlo = $sendCommand("EHLO " . gethostname());
        if ($ehlo['code'] !== 250) {
            throw new Exception("EHLO rejected: " . $ehlo['text']);
        }

        // 3. STARTTLS if required (for port 587)
        if ($secure === 'tls' || ($port === 587 && strpos($ehlo['text'], 'STARTTLS') !== false)) {
            $starttls = $sendCommand("STARTTLS");
            if ($starttls['code'] !== 220) {
                throw new Exception("STARTTLS failed: " . $starttls['text']);
            }
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("TLS encryption handshake failed.");
            }
            // Re-send EHLO over TLS
            $ehlo2 = $sendCommand("EHLO " . gethostname());
            if ($ehlo2['code'] !== 250) {
                throw new Exception("EHLO after TLS failed: " . $ehlo2['text']);
            }
        }

        // 4. AUTH LOGIN
        $auth = $sendCommand("AUTH LOGIN");
        if ($auth['code'] !== 334) {
            throw new Exception("AUTH LOGIN rejected: " . $auth['text']);
        }

        $userRes = $sendCommand(base64_encode($user));
        if ($userRes['code'] !== 334) {
            throw new Exception("SMTP Username rejected: " . $userRes['text']);
        }

        $passRes = $sendCommand(base64_encode($pass));
        if ($passRes['code'] !== 235) {
            throw new Exception("SMTP Authentication failed: Invalid username or password / App Password required. Response: " . $passRes['text']);
        }

        // 5. MAIL FROM
        $mailFrom = $sendCommand("MAIL FROM:<$fromEmail>");
        if ($mailFrom['code'] !== 250) {
            throw new Exception("MAIL FROM rejected: " . $mailFrom['text']);
        }

        // 6. RCPT TO
        $rcptTo = $sendCommand("RCPT TO:<$recipientEmail>");
        if ($rcptTo['code'] !== 250 && $rcptTo['code'] !== 251) {
            throw new Exception("RCPT TO rejected for $recipientEmail: " . $rcptTo['text']);
        }

        // 7. DATA
        $dataCmd = $sendCommand("DATA");
        if ($dataCmd['code'] !== 354) {
            throw new Exception("DATA command rejected: " . $dataCmd['text']);
        }

        // 8. Headers & Body
        $messageId = sprintf('<%s.%s@%s>', time(), bin2hex(random_bytes(8)), parse_url($host, PHP_URL_HOST) ?: 'pharmalabel.local');
        $headers = [];
        $headers[] = "Date: " . date('r');
        $headers[] = "To: =?UTF-8?B?" . base64_encode($recipientName) . "?= <$recipientEmail>";
        $headers[] = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromEmail>";
        $headers[] = "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=";
        $headers[] = "Message-ID: $messageId";
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: text/html; charset=UTF-8";
        $headers[] = "Content-Transfer-Encoding: base64";
        $headers[] = "X-Mailer: PharmLabel-Pro-SMTP-Engine/2.0";
        $headers[] = "";

        $encodedPayload = implode("\r\n", $headers) . "\r\n" . chunk_split(base64_encode($htmlBody)) . "\r\n.";
        
        $sendPayload = $sendCommand($encodedPayload);
        if ($sendPayload['code'] !== 250) {
            throw new Exception("Message content rejected by SMTP server: " . $sendPayload['text']);
        }

        // 9. QUIT
        $sendCommand("QUIT");
        @fclose($socket);

        $log("Email successfully dispatched via SMTP to $recipientEmail!");

        return [
            'success' => true,
            'message' => "Email delivered successfully to $recipientEmail via SMTP ({$host})",
            'code'    => 200,
            'log'     => implode("\n", $debugLog)
        ];

    } catch (Exception $ex) {
        $log("SMTP ERROR: " . $ex->getMessage());
        @fclose($socket);

        return [
            'success' => false,
            'message' => $ex->getMessage(),
            'code'    => 500,
            'log'     => implode("\n", $debugLog)
        ];
    }
}
