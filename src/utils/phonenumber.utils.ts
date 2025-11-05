import { parsePhoneNumber } from 'awesome-phonenumber';
import { ErrorHelper } from './error.utils';

export interface ParsedPhoneNumber {
  e164: string;
  international: string;
  national: string;
  countryCode: number;
  regionCode: string;
  type: string | null;
  valid: boolean;
}

export class PhoneNumberHelper {
  static formatToCountryStandard(number: string, defaultCountry = 'NG'): ParsedPhoneNumber {
    try {
      if (!number) {
        throw ErrorHelper.BadRequestException('Phone number is required');
      }

      const normalized = number.trim().replace(/\s+/g, '');

      // Detect automatically if number starts with '+'
      const phone = normalized.startsWith('+')
        ? parsePhoneNumber(normalized)
        : parsePhoneNumber(normalized, { regionCode: defaultCountry });

      if (!phone.valid) {
        throw ErrorHelper.BadRequestException('Invalid phone number');
      }

      const e164 = phone.number?.e164;
      if (!e164) {
        throw ErrorHelper.BadRequestException('Unable to format phone number');
      }

      return {
        e164,
        international: phone.number.international ?? '',
        national: phone.number.national ?? '',
        countryCode: phone.countryCode ?? '',
        regionCode: phone.regionCode ?? '',
        type: phone.type ?? null,
        valid: phone.valid,
      };
    } catch {
      throw ErrorHelper.BadRequestException('Invalid phone number format');
    }
  }
}
