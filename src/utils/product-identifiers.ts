/** Excludes I, O, 0 and 1 so codes stay unambiguous when read aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * `PN-XXXXXXXX` — a starting value for the part number.
 *
 * It is a suggestion, not an identifier: the seller is expected to replace it
 * with the manufacturer's part number when one exists.
 */
export function suggestPartNumber(): string {
  const values = new Uint32Array(8)

  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(values)
  } else {
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.floor(Math.random() * 2 ** 32)
    }
  }

  let code = ''

  for (const value of values) {
    code += ALPHABET[value % ALPHABET.length]
  }

  return `PN-${code}`
}

/**
 * GS1 type for a GTIN, or null while the value is not a supported length.
 * The backend also verifies the modulo-10 check digit.
 */
export function gtinType(value: string): string | null {
  if (!/^\d+$/.test(value)) return null

  switch (value.length) {
    case 8:
      return 'GTIN-8 · EAN-8'
    case 12:
      return 'GTIN-12 · UPC'
    case 13:
      return 'GTIN-13 · EAN/JAN'
    case 14:
      return 'GTIN-14 · carton'
    default:
      return null
  }
}
