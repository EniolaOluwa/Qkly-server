// src/common/validators/phone.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { PhoneUtil, CountryCode } from '../utils/phone.util';

/**
 * Custom validator decorator for phone numbers using Google's libphonenumber
 * @param defaultRegion - The default country code for validation
 * @param validationOptions - Additional validation options
 */
export function IsPhoneNumber(
  defaultRegion: CountryCode = CountryCode.NIGERIA,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          return PhoneUtil.isValid(value, defaultRegion);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ${defaultRegion} phone number (e.g., 08012345678, +2348012345678)`;
        },
      },
    });
  };
}

/**
 * Validator to ensure phone number is a mobile number
 */
export function IsMobileNumber(
  defaultRegion: CountryCode = CountryCode.NIGERIA,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMobileNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          return PhoneUtil.isMobile(value, defaultRegion);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid mobile phone number`;
        },
      },
    });
  };
}