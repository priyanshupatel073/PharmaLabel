<?php
/**
 * ============================================================================
 * PHARMALABEL PRO - GS1 SSCC-18 MOD-10 MATHEMATICAL CALCULATION ENGINE
 * Implements GS1 General Specifications Section 7.9.1 (Check Digit Calculation)
 * ============================================================================
 */

declare(strict_types=1);

if (!defined('PHARMALABEL_INIT')) {
    define('PHARMALABEL_INIT', true);
}

/**
 * Calculates GS1 Modulo-10 check digit for any 17-digit numeric string.
 *
 * Algorithm:
 * 1. Starting from the rightmost digit (position 17), multiply digits alternatively by 3 and 1.
 * 2. Sum all products.
 * 3. Subtract the sum from the nearest equal or higher multiple of 10.
 *
 * @param string $digits17 Exactly 17 numeric digits
 * @throws InvalidArgumentException if input is not exactly 17 digits
 * @return int Single check digit (0-9)
 */
function calculateGs1Mod10(string $digits17): int
{
    if (strlen($digits17) !== 17 || !ctype_digit($digits17)) {
        throw new InvalidArgumentException("GS1 Mod-10 requires exactly 17 numeric digits. Received: '$digits17'");
    }

    $sum = 0;
    // Iterate from right to left (index 16 down to 0)
    for ($i = 16; $i >= 0; $i--) {
        $digit = (int)$digits17[$i];
        // Odd positions from the right (17, 15, 13...) have index difference (16 - $i) % 2 === 0 -> weight 3
        $weight = ((16 - $i) % 2 === 0) ? 3 : 1;
        $sum += $digit * $weight;
    }

    $remainder = $sum % 10;
    return ($remainder === 0) ? 0 : (10 - $remainder);
}

/**
 * Generates an 18-digit GS1 SSCC (Serial Shipping Container Code).
 *
 * Format:
 * [Extension Digit: 1 char] + [GS1 Company Prefix: 7-10 chars] + [Serial Ref: padded] + [Check Digit: 1 char] = 18 digits.
 *
 * @param string $extensionDigit Single digit (default '1')
 * @param string $companyPrefix  GS1 Certified Company Prefix (e.g. '8901234')
 * @param int    $serialNumber   Sequential serial number (e.g. 41)
 * @throws InvalidArgumentException
 * @return string Exactly 18-digit SSCC
 */
function generateSSCC18(string $extensionDigit, string $companyPrefix, int $serialNumber): string
{
    $ext = trim($extensionDigit);
    $prefix = trim($companyPrefix);

    if (strlen($ext) !== 1 || !ctype_digit($ext)) {
        throw new InvalidArgumentException("Extension digit must be exactly 1 numeric character.");
    }

    if (strlen($prefix) < 6 || strlen($prefix) > 11 || !ctype_digit($prefix)) {
        throw new InvalidArgumentException("GS1 Company Prefix must be 6 to 11 numeric digits.");
    }

    // Total payload before check digit must be exactly 17 digits
    $serialLengthNeeded = 17 - (strlen($ext) + strlen($prefix));
    if ($serialLengthNeeded <= 0) {
        throw new InvalidArgumentException("GS1 Company Prefix length exceeds allowable bounds for SSCC-18.");
    }

    $serialStr = (string)$serialNumber;
    if (strlen($serialStr) > $serialLengthNeeded) {
        throw new OverflowException("Serial number $serialNumber exceeds maximum capacity for prefix length.");
    }

    $paddedSerial = str_pad($serialStr, $serialLengthNeeded, '0', STR_PAD_LEFT);
    $payload17 = $ext . $prefix . $paddedSerial;

    $checkDigit = calculateGs1Mod10($payload17);
    return $payload17 . $checkDigit;
}

/**
 * Validates whether an 18-digit SSCC is mathematically and structurally valid.
 *
 * @param string $sscc The 18-digit SSCC code to test
 * @return bool True if valid GS1 SSCC, false otherwise
 */
function validateSSCC18(string $sscc): bool
{
    $clean = trim($sscc);
    if (strlen($clean) !== 18 || !ctype_digit($clean)) {
        return false;
    }

    $payload17 = substr($clean, 0, 17);
    $expectedCheckDigit = (int)substr($clean, 17, 1);

    return calculateGs1Mod10($payload17) === $expectedCheckDigit;
}

/**
 * Formats an 18-digit SSCC with GS1 Application Identifier (00) for human readable display.
 *
 * @param string $sscc 18-digit SSCC
 * @return string e.g. "(00) 1 8901234 000000041 7"
 */
function formatSSCCWithAI(string $sscc): string
{
    if (strlen($sscc) !== 18) {
        return $sscc;
    }
    return sprintf(
        '(00) %s %s %s %s',
        substr($sscc, 0, 1),
        substr($sscc, 1, 7),
        substr($sscc, 8, 9),
        substr($sscc, 17, 1)
    );
}
