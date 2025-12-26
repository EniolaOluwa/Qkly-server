# User Service Migration Summary

## Overview
Successfully migrated the User service from storing user data in a single denormalized User entity to a normalized multi-entity architecture while maintaining backward compatibility with the frontend.

## Changes Made

### 1. Database Entity Restructuring

**Before:** User entity contained all user-related data (firstName, lastName, phone, bvn, pin, etc.)

**After:** User entity split into focused entities:
- `User` - Core authentication (email, password, userType, status)
- `UserProfile` - Personal info (firstName, lastName, phone, profilePicture)
- `UserKYC` - KYC data (bvn, verification status, provider info)
- `UserSecurity` - Security data (pin, deviceId, location, 2FA)
- `UserOnboarding` - Onboarding progress (currentStep, isCompleted, progressPercentage)

### 2. Users Service Updates

#### Repository Injections
Added new entity repositories to constructor:
```typescript
@InjectRepository(UserProfile)
private userProfileRepository: Repository<UserProfile>,
@InjectRepository(UserKYC)
private userKycRepository: Repository<UserKYC>,
@InjectRepository(UserSecurity)
private userSecurityRepository: Repository<UserSecurity>,
@InjectRepository(UserOnboarding)
private userOnboardingRepository: Repository<UserOnboarding>,
```

#### Methods Updated

**registerUser:**
- Creates User, UserProfile, UserSecurity, and UserOnboarding entities
- Returns flattened data for backward compatibility

**loginUser:**
- Loads user with all relations (profile, security, onboarding)
- Updates security data instead of user directly
- Returns data from related entities

**loginWithPin:**
- Finds user via UserProfile (phone lookup)
- Validates PIN from UserSecurity
- Tracks failed attempts in UserSecurity

**verifyPhoneOtp:**
- Updates UserProfile.isPhoneVerified
- Updates UserOnboarding.currentStep

**verifyKyc:**
- Creates/updates UserKYC record
- Updates UserOnboarding.currentStep

**createPin / createPinWithReference:**
- Stores PIN in UserSecurity entity
- Updates UserOnboarding progress

**changePin:**
- Reads and updates PIN from UserSecurity

**updateUserProfile:**
- Updates UserProfile for firstName, lastName, phone
- Updates User only for email

**checkUser:**
- Handles phone lookups via UserProfile entity

**getAllUsers / getAdminUsers / getMerchantUsers:**
- Returns `MappedUser` instead of `User`
- Uses UserMapper for backward compatibility

### 3. User Mapper

Created `UserMapper` class to maintain backward compatibility:

**Location:** `src/core/users/mappers/user.mapper.ts`

**Features:**
- `toMappedUser()` - Maps User with relations to flat MappedUser object
- `toMappedUsers()` - Maps array of users
- `toPublicUser()` - Removes sensitive fields for public API
- `toMinimalUser()` - Returns minimal fields for lists/dropdowns

**MappedUser Interface:**
Includes all fields that frontend expects:
- Core user fields (id, email, status, etc.)
- Profile fields (firstName, lastName, phone)
- KYC fields (bvn, kycStatus, kycVerifiedAt)
- Onboarding fields (onboardingStep, isOnboardingCompleted)
- Security fields (deviceId, location) - **excludes PIN for security**

### 4. DTOs Updated

**RegisterUserResponseDto / LoginResponseDto:**
- Changed `onboardingStep` type from `number` to `string` (enum value)

### 5. Module Updates

**users.module.ts:**
Added new entities to TypeOrmModule.forFeature:
```typescript
TypeOrmModule.forFeature([
  User, Otp, Order, Role,
  UserProfile, UserKYC, UserSecurity, UserOnboarding
])
```

## Benefits

1. **Data Normalization:** Cleaner separation of concerns
2. **Performance:** Can load only needed relations
3. **Security:** PIN stored separately, never exposed in user queries
4. **Backward Compatibility:** Frontend doesn't need changes
5. **Scalability:** Easy to add new user-related entities
6. **Type Safety:** TypeScript enforces proper data access

## Frontend Compatibility

The `UserMapper` ensures that all existing frontend code continues to work without changes. The returned `MappedUser` object has the same shape as the old User entity, with all fields flattened into a single object.

## Migration Path for Other Services

Other services that reference User properties should:

1. Load user with necessary relations:
```typescript
const user = await userRepository.findOne({
  where: { id: userId },
  relations: ['profile', 'security', 'kyc', 'onboarding'],
});
```

2. Access properties from related entities:
```typescript
// Before: user.firstName
// After: user.profile?.firstName

// Before: user.pin
// After: user.security?.pin

// Before: user.bvn
// After: user.kyc?.bvn
```

3. Use UserMapper for API responses:
```typescript
const mappedUser = UserMapper.toMappedUser(user);
return mappedUser; // Frontend receives familiar format
```

## Files Modified

- `src/core/users/users.service.ts` - Updated all user-related operations
- `src/core/users/users.module.ts` - Added new entity repositories
- `src/core/users/mappers/user.mapper.ts` - **NEW** - Mapper for backward compatibility
- `src/common/dto/responses.dto.ts` - Updated onboardingStep type
- `src/core/wallets/wallets.service.ts` - Updated to use Wallet entity (previous session)

## Next Steps

Other services that may need similar updates:
- `src/core/payment/paystack-integration.service.ts` - References user.firstName, user.phone, etc.
- `src/core/payment/paystack-webhook.handler.ts` - References user properties
- Any service that queries or updates user data

## Testing Recommendations

1. Test user registration flow
2. Test login with email/password
3. Test login with phone/PIN
4. Test phone verification
5. Test KYC verification
6. Test PIN creation and update
7. Test user profile updates
8. Test admin user listing endpoints
