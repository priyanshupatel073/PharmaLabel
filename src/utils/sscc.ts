/**
 * GS1 SSCC (Serial Shipping Container Code) Generator
 * SSCC is an 18-digit number:
 * [1 Digit: Extension Digit] + [7-10 Digits: GS1 Company Prefix] + [6-9 Digits: Serial Reference] + [1 Digit: Mod-10 Check Digit]
 */

/**
 * Calculates GS1 standard Modulo-10 Check Digit for a 17-digit string.
 * Weights alternate 3 and 1 from right to left (starting with 3 on the rightmost digit).
 */
export function calculateGS1Mod10(first17Digits: string): number {
  if (first17Digits.length !== 17) {
    throw new Error(`SSCC base must be exactly 17 digits, received ${first17Digits.length}`);
  }

  let sum = 0;
  // Starting from the rightmost digit (index 16) towards left (index 0)
  for (let i = 16; i >= 0; i--) {
    const digit = parseInt(first17Digits[i], 10);
    // index 16 is distance 0 from right -> weight 3
    // index 15 is distance 1 from right -> weight 1
    const weight = (16 - i) % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }

  const remainder = sum % 10;
  return (10 - remainder) % 10;
}

/**
 * Generates an 18-digit SSCC with standard GS1 formatting:
 * e.g., (00) 1 8901234 000000001 4
 */
export function generateSSCC(
  extensionDigit: string,
  gs1Prefix: string,
  serialNumber: number
): { raw18: string; formatted: string; checkDigit: number } {
  const cleanExt = (extensionDigit || '1').trim().slice(0, 1);
  const cleanPrefix = (gs1Prefix || '8901234').trim();
  
  // Available length for serial reference is 17 - 1 - prefixLength
  const serialLength = 17 - 1 - cleanPrefix.length;
  const serialRefPadded = serialNumber.toString().padStart(serialLength, '0');

  const base17 = `${cleanExt}${cleanPrefix}${serialRefPadded}`;
  const checkDigit = calculateGS1Mod10(base17);
  const raw18 = `${base17}${checkDigit}`;

  // GS1 Application Identifier (00) format
  const formatted = `(00) ${cleanExt} ${cleanPrefix} ${serialRefPadded} ${checkDigit}`;

  return { raw18, formatted, checkDigit };
}

/**
 * Validates whether an 18-digit SSCC has a correct Mod-10 check digit.
 */
export function validateSSCC(sscc18: string): boolean {
  const clean = sscc18.replace(/\D/g, '');
  if (clean.length !== 18) return false;
  const base17 = clean.slice(0, 17);
  const expectedCheckDigit = calculateGS1Mod10(base17);
  const actualCheckDigit = parseInt(clean[17], 10);
  return expectedCheckDigit === actualCheckDigit;
}
