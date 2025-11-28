import * as crypto from 'crypto';
import { ErrorHelper } from './error.utils';

export class CryptoUtil {
  // Encryption key for PIN - In production, this should be from environment variables
  private static readonly ENCRYPTION_KEY = crypto.scryptSync(
    'pin-secret-key',
    'salt',
    32,
  );

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

  /**
   * Encrypt a PIN using AES-256-GCM
   * @param pin - The plain text PIN to encrypt
   * @returns The encrypted PIN with IV and auth tag
   */
  static encryptPin(pin: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.ENCRYPTION_KEY,
      iv,
    );
    cipher.setAAD(Buffer.from('pin-auth-data', 'utf8'));

    let encrypted = cipher.update(pin, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + auth tag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a PIN using AES-256-GCM
   * @param encryptedPin - The encrypted PIN string
   * @returns The decrypted PIN
   */
  static decryptPin(encryptedPin: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedPin.split(':');

      if (!ivHex || !authTagHex || !encrypted) {
        ErrorHelper.BadRequestException('Invalid encrypted PIN format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.ENCRYPTION_KEY,
        iv,
      );
      decipher.setAAD(Buffer.from('pin-auth-data', 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      ErrorHelper.UnprocessableEntityException('Failed to decrypt PIN');
    }
  }

  /**
   * Verify a PIN against an encrypted PIN
   * @param pin - The plain text PIN to verify
   * @param encryptedPin - The encrypted PIN to verify against
   * @returns True if PIN matches, false otherwise
   */
  static verifyPin(pin: string, encryptedPin: string): boolean {
    try {
      const decryptedPin = this.decryptPin(encryptedPin);
      return pin === decryptedPin;
    } catch (error) {
      return false;
    }
  }
}
