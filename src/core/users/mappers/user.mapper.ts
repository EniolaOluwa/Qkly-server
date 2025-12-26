import { User } from '../entity/user.entity';
import { OnboardingStep } from '../../../common/enums/user.enum';

/**
 * User Mapper - Maps database entities to frontend-compatible format
 *
 * Purpose:
 * - Maintains backward compatibility with frontend after database redesign
 * - Flattens related entities (profile, kyc, security, onboarding) into User object
 * - Provides consistent user data structure across the application
 */

export interface MappedUser {
  id: number;
  email: string;
  userType: string;
  roleId: number;
  status: string;
  statusReason?: string;
  suspendedUntil?: Date;
  businessId?: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  suspendedBy?: number;

  // From UserProfile
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
  language?: string;
  timezone?: string;

  // From UserKYC
  bvn?: string;
  kycStatus?: string;
  kycVerifiedAt?: Date;

  // From UserOnboarding
  onboardingStep?: string;
  isOnboardingCompleted?: boolean;
  onboardingProgress?: number;

  // From UserSecurity (never include PIN!)
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  twoFactorEnabled?: boolean;

  // Exclude password and pin for security
  password?: never;
  pin?: never;
}

export class UserMapper {
  /**
   * Map User entity with relations to frontend-compatible format
   */
  static toMappedUser(user: User): MappedUser {
    return {
      // Core User fields
      id: user.id,
      email: user.email,
      userType: user.userType,
      roleId: user.roleId,
      status: user.status,
      statusReason: user.statusReason,
      suspendedUntil: user.suspendedUntil ?? undefined,
      businessId: user.businessId,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.profile?.isPhoneVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      suspendedBy: user.suspendedBy,

      // UserProfile fields
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      phone: user.profile?.phone,
      profilePicture: user.profile?.profilePicture,
      language: user.profile?.language,
      timezone: user.profile?.timezone,

      // UserKYC fields
      bvn: user.kyc?.bvn,
      kycStatus: user.kyc?.status,
      kycVerifiedAt: user.kyc?.verifiedAt,

      // UserOnboarding fields
      onboardingStep: user.onboarding?.currentStep || OnboardingStep.PERSONAL_INFORMATION,
      isOnboardingCompleted: user.onboarding?.isCompleted || false,
      onboardingProgress: user.onboarding?.progressPercentage || 0,

      // UserSecurity fields (exclude sensitive data like PIN)
      deviceId: user.security?.deviceId,
      latitude: user.security?.latitude,
      longitude: user.security?.longitude,
      twoFactorEnabled: user.security?.twoFactorEnabled || false,
    };
  }

  /**
   * Map array of User entities
   */
  static toMappedUsers(users: User[]): MappedUser[] {
    return users.map(user => this.toMappedUser(user));
  }

  /**
   * Map User entity for public API (exclude sensitive fields)
   */
  static toPublicUser(user: User): Partial<MappedUser> {
    const mappedUser = this.toMappedUser(user);

    // Remove sensitive/internal fields for public API
    const {
      bvn,
      kycStatus,
      deviceId,
      latitude,
      longitude,
      suspendedBy,
      createdBy,
      statusReason,
      ...publicUser
    } = mappedUser;

    return publicUser;
  }

  /**
   * Map User entity with minimal fields (for lists/dropdowns)
   */
  static toMinimalUser(user: User): Pick<MappedUser, 'id' | 'email' | 'firstName' | 'lastName' | 'phone'> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      phone: user.profile?.phone,
    };
  }
}
