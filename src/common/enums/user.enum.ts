export enum UserType {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum OnboardingStep {
  PERSONAL_INFORMATION = 'personal_information',
  PHONE_VERIFICATION = 'phone_verification',
  BUSINESS_INFORMATION = 'business_information',
  KYC_VERIFICATION = 'kyc_verification',
  AUTHENTICATION_PIN = 'authentication_pin',
}

export enum KYCStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export enum KYCProvider {
  DOJAH = 'dojah',
  MANUAL = 'manual',
}

export enum KYCTier {
  TIER_1 = 'tier_1',
  TIER_2 = 'tier_2',
  TIER_3 = 'tier_3',
}
