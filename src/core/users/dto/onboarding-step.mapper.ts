import { OnboardingStep } from '../../../common/enums/user.enum';

/**
 * Onboarding Step Mapper
 * Maps between database string enum values and numeric API responses
 */

// Numeric representation for API responses
export enum OnboardingStepNumber {
  PERSONAL_INFORMATION = 0,
  PHONE_VERIFICATION = 1,
  BUSINESS_INFORMATION = 2,
  KYC_VERIFICATION = 3,
  AUTHENTICATION_PIN = 4,
}

// Human-readable labels
export const OnboardingStepLabels: Record<OnboardingStep, string> = {
  [OnboardingStep.PERSONAL_INFORMATION]: 'Personal Information',
  [OnboardingStep.PHONE_VERIFICATION]: 'Phone Verification',
  [OnboardingStep.BUSINESS_INFORMATION]: 'Business Information',
  [OnboardingStep.KYC_VERIFICATION]: 'KYC Verification',
  [OnboardingStep.AUTHENTICATION_PIN]: 'Authentication PIN',
};

// Mapping from string enum to number
export const OnboardingStepToNumber: Record<OnboardingStep, number> = {
  [OnboardingStep.PERSONAL_INFORMATION]: OnboardingStepNumber.PERSONAL_INFORMATION,
  [OnboardingStep.PHONE_VERIFICATION]: OnboardingStepNumber.PHONE_VERIFICATION,
  [OnboardingStep.BUSINESS_INFORMATION]: OnboardingStepNumber.BUSINESS_INFORMATION,
  [OnboardingStep.KYC_VERIFICATION]: OnboardingStepNumber.KYC_VERIFICATION,
  [OnboardingStep.AUTHENTICATION_PIN]: OnboardingStepNumber.AUTHENTICATION_PIN,
};

// Mapping from number to string enum
export const NumberToOnboardingStep: Record<number, OnboardingStep> = {
  [OnboardingStepNumber.PERSONAL_INFORMATION]: OnboardingStep.PERSONAL_INFORMATION,
  [OnboardingStepNumber.PHONE_VERIFICATION]: OnboardingStep.PHONE_VERIFICATION,
  [OnboardingStepNumber.BUSINESS_INFORMATION]: OnboardingStep.BUSINESS_INFORMATION,
  [OnboardingStepNumber.KYC_VERIFICATION]: OnboardingStep.KYC_VERIFICATION,
  [OnboardingStepNumber.AUTHENTICATION_PIN]: OnboardingStep.AUTHENTICATION_PIN,
};

/**
 * Helper class for onboarding step conversions
 */
export class OnboardingStepMapper {
  /**
   * Convert database enum value to numeric representation for API
   */
  static toNumber(step: OnboardingStep): number {
    return OnboardingStepToNumber[step];
  }

  /**
   * Convert numeric value to database enum
   */
  static fromNumber(num: number): OnboardingStep {
    return NumberToOnboardingStep[num];
  }

  /**
   * Get human-readable label for a step
   */
  static getLabel(step: OnboardingStep): string {
    return OnboardingStepLabels[step];
  }

  /**
   * Get the order/index of a step (for sequence validation)
   */
  static getOrder(step: OnboardingStep): number {
    return OnboardingStepToNumber[step];
  }
}
