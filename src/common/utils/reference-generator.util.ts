import { v4 as uuidv4 } from 'uuid';

export class ReferenceGenerator {
  /**
   * Generate a standardized reference with QKY prefix
   * Format: QKY-{PREFIX}-{TIMESTAMP}-{RANDOM}
   * Example: QKY-ORD-1767790000000-A1B2
   */
  static generate(prefix: 'ORD' | 'TXN' | 'WDR' | 'REF'): string {
    const timestamp = Date.now();
    const random = uuidv4().substring(0, 4).toUpperCase();
    return `QKY-${prefix}-${timestamp}-${random}`;
  }
}
