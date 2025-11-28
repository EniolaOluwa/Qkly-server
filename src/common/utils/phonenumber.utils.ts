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
        ErrorHelper.BadRequestException('Phone number is required');
      }

      const normalized = number.trim().replace(/\s+/g, '');

      const phone = normalized.startsWith('+')
        ? parsePhoneNumber(normalized)
        : parsePhoneNumber(normalized, { regionCode: defaultCountry });

      if (!phone.valid) {
        ErrorHelper.BadRequestException('Invalid phone number');
      }

      const e164 = phone.number?.e164;
      if (!e164) {
        ErrorHelper.BadRequestException('Unable to format phone number');
      }

      return {
        e164,
        international: phone.number.international ?? '',
        national: phone.number.national ?? '',
        countryCode: phone.countryCode ?? 0,
        regionCode: phone.regionCode ?? '',
        type: phone.type ?? null,
        valid: phone.valid,
      };
    } catch (err) {
      throw ErrorHelper.BadRequestException('Invalid phone number format');
    }
  }
}
