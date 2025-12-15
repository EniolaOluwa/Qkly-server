export enum UserRole {
  MERCHANT = 'merchant',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserType {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MERCHANT = 'merchant',
}


export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MERCHANT,
  ],
  [UserRole.ADMIN]: [
    UserRole.ADMIN,
    UserRole.MERCHANT,
  ],
  [UserRole.MERCHANT]: [
    UserRole.MERCHANT,
  ],
};