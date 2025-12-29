// src/common/utils/phone.util.ts
import { BadRequestException } from '@nestjs/common';
import {
  PhoneNumberUtil,
  PhoneNumberFormat,
  PhoneNumber
} from 'google-libphonenumber';

export enum CountryCode {
  NIGERIA = 'NG',
  GHANA = 'GH',
  KENYA = 'KE',
  SOUTH_AFRICA = 'ZA',
}

export class PhoneUtil {
  private static phoneUtil = PhoneNumberUtil.getInstance();

  /**
   * Standardizes a phone number to E.164 format using Google's libphonenumber
   * @param phone - The phone number to standardize
   * @param defaultRegion - The default country code (defaults to Nigeria)
   * @returns Standardized phone number in E.164 format
   * @throws BadRequestException if phone number is invalid
   */
  static standardize(
    phone: string,
    defaultRegion: CountryCode = CountryCode.NIGERIA,
  ): string {
    if (!phone || phone.trim() === '') {
      throw new BadRequestException('Phone number is required');
    }

    try {
      // Parse the phone number
      const phoneNumber: PhoneNumber = this.phoneUtil.parse(phone, defaultRegion);

      // Validate the parsed number
      if (!this.phoneUtil.isValidNumber(phoneNumber)) {
        throw new BadRequestException(
          `Invalid phone number for region ${defaultRegion}`,
        );
      }

      // Format to E.164 standard (+2348012345678)
      return this.phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Invalid phone number format: ${error.message}`,
      );
    }
  }

  /**
   * Validates a phone number without standardizing it
   * @param phone - The phone number to validate
   * @param defaultRegion - The default country code
   * @returns boolean indicating if the phone number is valid
   */
  static isValid(
    phone: string,
    defaultRegion: CountryCode = CountryCode.NIGERIA,
  ): boolean {
    try {
      const phoneNumber = this.phoneUtil.parse(phone, defaultRegion);
      return this.phoneUtil.isValidNumber(phoneNumber);
    } catch {
      return false;
    }
  }

  /**
   * Validates a phone number for a specific region/country
   * @param phone - The phone number to validate
   * @param region - The country code to validate against
   * @returns boolean indicating if number is valid for that region
   */
  static isValidForRegion(
    phone: string,
    region: CountryCode,
  ): boolean {
    try {
      const phoneNumber = this.phoneUtil.parse(phone, region);
      return this.phoneUtil.isValidNumberForRegion(phoneNumber, region);
    } catch {
      return false;
    }
  }

  /**
   * Formats a phone number for international display
   * @param phone - The phone number (can be E.164 or raw)
   * @param defaultRegion - The default country code
   * @returns Formatted phone number (+234 801 234 5678)
   */
  static formatInternational(
    phone: string,
    defaultRegion: CountryCode = CountryCode.NIGERIA,
  ): string {
    try {
      const phoneNumber = this.phoneUtil.parse(phone, defaultRegion);
      return this.phoneUtil.format(phoneNumber, PhoneNumberFormat.INTERNATIONAL);
    } catch {
      return phone; // Return original if parsing fails
    }
  }

  /**
   * Formats a phone number for national display
   * @param phone - The phone number
   * @param defaultRegion - The default country code
   * @returns Formatted phone number (0801 234 5678)
   */
  static formatNational(
    phone: string,
    defaultRegion: CountryCode = CountryCode.NIGERIA,
  ): string {
    try {
      const phoneNumber = this.phoneUtil.parse(phone, defaultRegion);
      return this.phoneUtil.format(phoneNumber, PhoneNumberFormat.NATIONAL);
    } catch {
      return phone;
    }
  }

  /**
   * Gets the region/country code from a phone number
   * @param phone - The phone number
   * @returns The ISO country code (e.g., 'NG', 'GH') or null
   */
  static getRegionCode(phone: string): string | null {
    try {
      const phoneNumber = this.phoneUtil.parse(phone, '');
      return this.phoneUtil.getRegionCodeForNumber(phoneNumber) as string;
    } catch {
      return null;
    }
  }

  /**
   * Gets the phone number type (MOBILE, FIXED_LINE, etc.)
   * @param phone - The phone number
   * @param defaultRegion - The default country code
   * @returns The phone number type as string
   */
  static getNumberType(
    phone: string,
    defaultRegion: CountryCode = CountryCode.NIGERIA,
  ): string {
    try {
      const phoneNumber = this.phoneUtil.parse(phone, defaultRegion);
      const type = this.phoneUtil.getNumberType(phoneNumber);

      // Map number type enum to readable string
      const typeMap: { [key: number]: string } = {
        0: 'FIXED_LINE',
        1: 'MOBILE',
        2: 'FIXED_LINE_OR_MOBILE',
        3: 'TOLL_FREE',
        4: 'PREMIUM_RATE',
        5: 'SHARED_COST',
        6: 'VOIP',
        7: 'PERSONAL_NUMBER',
        8: 'PAGER',
        9: 'UAN',
        10: 'VOICEMAIL',
        99: 'UNKNOWN',
      };

      return typeMap[type] || 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Checks if a phone number is a mobile number
   * @param phone - The phone number
   * @param defaultRegion - The default country code
   * @returns boolean indicating if it's a mobile number
   */
  static isMobile(
    phone: string,
    defaultRegion: CountryCode = CountryCode.NIGERIA,
  ): boolean {
    const type = this.getNumberType(phone, defaultRegion);
    return type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';
  }
}