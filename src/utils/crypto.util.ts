import * as crypto from 'crypto';

export class CryptoUtil {
  /**
   * Hash a password using SHA256
   * @param password - The plain text password to hash
   * @returns The hashed password
   */
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify a password against a hash
   * @param password - The plain text password to verify
   * @param hash - The hash to verify against
   * @returns True if password matches hash, false otherwise
   */
  static verifyPassword(password: string, hash: string): boolean {
    const hashedPassword = this.hashPassword(password);
    return hashedPassword === hash;
  }
} 