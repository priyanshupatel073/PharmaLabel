/**
 * Vector SVG Barcode & QR Code Generator for High-Resolution Thermal Print Simulation
 * Guaranteed zero external runtime dependency failure.
 */

// Simple deterministic Code 128-B pattern table
const CODE128_PATTERNS: { [key: string]: string } = {
  '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
  '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
  '8': '10001100100', '9': '11001001000', 'A': '11001000100', 'B': '11000100100',
  'C': '10110011100', 'D': '10011011100', 'E': '10011001110', 'F': '10111001100',
  'G': '10011101100', 'H': '10011100110', 'I': '11001110100', 'J': '11001011100',
  'K': '11001001110', 'L': '11011100100', 'M': '11001110010', 'N': '11011101000',
  'O': '11011100010', 'P': '11011011100', 'Q': '11011001110', 'R': '11011101100',
  'S': '11011100110', 'T': '11011011011', 'U': '11011011001', 'V': '11001101101',
  'W': '11001100101', 'X': '11010011011', 'Y': '11010011001', 'Z': '11001011011',
  '-': '10010110000', '.': '10010000110', ' ': '11011001100', '(': '10110010000',
  ')': '10110000100', '/': '10001011000', ':': '10001000110', '+': '10110111000'
};

const START_B = '11010010000';
const STOP = '1100011101011';

export function generateCode128SvgBars(text: string): string {
  const upper = text.toUpperCase().replace(/[^0-9A-Z \-\.\(\)\/\:\+]/g, '');
  let binary = START_B;
  
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    binary += CODE128_PATTERNS[char] || '10101010101';
  }
  
  // Add stop
  binary += STOP;
  return binary;
}

/**
 * Deterministic 2D Matrix / QR Code SVG Grid Generator
 * Produces crisp, scannable-looking GS1 2D DataMatrix/QR patterns for thermal labels
 */
export function generateMatrixGrid(data: string, size = 21): boolean[][] {
  const grid: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));
  
  // Finder pattern (Top-Left)
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
        grid[r][c] = true;
      }
    }
  }

  // Finder pattern (Top-Right)
  for (let r = 0; r < 7; r++) {
    for (let c = size - 7; c < size; c++) {
      const colRel = c - (size - 7);
      if (r === 0 || r === 6 || colRel === 0 || colRel === 6 || (r >= 2 && r <= 4 && colRel >= 2 && colRel <= 4)) {
        grid[r][c] = true;
      }
    }
  }

  // Finder pattern (Bottom-Left)
  for (let r = size - 7; r < size; r++) {
    const rowRel = r - (size - 7);
    for (let c = 0; c < 7; c++) {
      if (rowRel === 0 || rowRel === 6 || c === 0 || c === 6 || (rowRel >= 2 && rowRel <= 4 && c >= 2 && c <= 4)) {
        grid[r][c] = true;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Pseudo-random data encoding based on hash of payload
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      const inTL = r < 9 && c < 9;
      const inTR = r < 9 && c >= size - 9;
      const inBL = r >= size - 9 && c < 9;
      if (!inTL && !inTR && !inBL) {
        const val = Math.abs((hash ^ (r * 31 + c * 17 + bitIdx++)) % 3) === 0;
        grid[r][c] = val;
      }
    }
  }

  return grid;
}
