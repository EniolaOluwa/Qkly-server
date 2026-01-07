/**
 * Email Template Configuration Constants
 * Platform-level defaults configurable via environment variables
 */

export const EMAIL_CONFIG = {
  // Branding
  logoUrl: process.env.EMAIL_LOGO_URL || 'https://assets.qkly.com/logo.png',
  platformName: 'Qkly',

  // Colors
  primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#6366f1',
  secondaryColor: process.env.EMAIL_SECONDARY_COLOR || '#4f46e5',
  successColor: '#10b981',
  warningColor: '#f59e0b',
  errorColor: '#ef4444',
  backgroundColor: process.env.EMAIL_BACKGROUND_COLOR || '#f9fafb',
  textColor: process.env.EMAIL_TEXT_COLOR || '#1f2937',
  mutedTextColor: '#6b7280',

  // Links
  appUrl: process.env.APP_URL || 'https://app.qkly.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@qkly.com',
  unsubscribeBaseUrl: process.env.UNSUBSCRIBE_BASE_URL || 'https://app.qkly.com/email',
};

/**
 * Email branding options for customization
 */
export interface EmailBranding {
  logoUrl?: string;
  primaryColor?: string;
  businessName?: string;
  businessId?: number;
}

/**
 * Get platform default branding
 */
export function getDefaultBranding(): EmailBranding {
  return {
    logoUrl: EMAIL_CONFIG.logoUrl,
    primaryColor: EMAIL_CONFIG.primaryColor,
    businessName: EMAIL_CONFIG.platformName,
  };
}

/**
 * Merge business branding with platform defaults
 */
export function mergeBranding(business?: { logo?: string; storeColor?: string; businessName?: string; id?: number }): EmailBranding {
  const defaults = getDefaultBranding();

  if (!business) {
    return defaults;
  }

  return {
    logoUrl: business.logo || defaults.logoUrl,
    primaryColor: business.storeColor || defaults.primaryColor,
    businessName: business.businessName || defaults.businessName,
    businessId: business.id,
  };
}
