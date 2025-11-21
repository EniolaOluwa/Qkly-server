export enum OnboardingStep {
  PERSONAL_INFORMATION = 0,
  PHONE_VERIFICATION = 1,
  BUSINESS_INFORMATION = 2,
  KYC_VERIFICATION = 3,
  AUTHENTICATION_PIN = 4,
}


export const OnboardingStepLabels = {
  [OnboardingStep.PERSONAL_INFORMATION]: 'Personal Information',
  [OnboardingStep.PHONE_VERIFICATION]: 'Phone Verification',
  [OnboardingStep.BUSINESS_INFORMATION]: 'Business Information',
  [OnboardingStep.KYC_VERIFICATION]: 'KYC Verification',
  [OnboardingStep.AUTHENTICATION_PIN]: 'Authentication PIN',
};
