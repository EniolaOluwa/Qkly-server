import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // Payment & SMS Providers
  PAYMENT_PROVIDER: Joi.string().default('paystack'),
  PAYSTACK_PUBLIC_KEY: Joi.string().required(),
  PAYSTACK_SECRET_KEY: Joi.string().required(),
  PAYSTACK_BASE_URL: Joi.string().uri().required(),
  PAYSTACK_PREFERRED_BANK: Joi.string().optional(),

  MONNIFY_API_KEY: Joi.string().optional(),
  MONNIFY_SECRET_KEY: Joi.string().optional(),
  MONNIFY_CONTRACT_CODE: Joi.string().optional(),
  MONNIFY_BASE_URL: Joi.string().uri().optional(),

  TERMII_API_KEY: Joi.string().optional(),
  TERMII_BASE_URL: Joi.string().uri().optional(),
  TERMII_SENDER_ID: Joi.string().optional(),
  TERMII_CHANNEL: Joi.string().default('dnd'),

  KUDI_SMS_API_KEY: Joi.string().optional(),
  KUDI_SMS_API_URL: Joi.string().uri().optional(),
  KUDI_SMS_SENDER_ID: Joi.string().optional(),

  // KYC / Identity
  DOJAH_APP_ID: Joi.string().optional(),
  DOJAH_PUBLIC_KEY: Joi.string().optional(),
  DOJAH_BASE_URL: Joi.string().uri().optional(),
  PREMBLY_API_KEY: Joi.string().optional(),
  PREMBLY_BASE_URL: Joi.string().uri().optional(),

  // System Config
  ENABLE_NOTIFICATIONS: Joi.boolean().default(true),
  SECURITY_PIN_COOLDOWN_HOURS: Joi.number().default(24),
  SECURITY_MAX_LIMIT_DURING_COOL_DOWN: Joi.number().default(50000),
  SETTLEMENT_MODE: Joi.string().valid('MAIN_BALANCE', 'SUBACCOUNT').default('MAIN_BALANCE'),
  PLATFORM_FEE_PERCENTAGE: Joi.number().min(0).max(100).default(0),
  PLATFORM_FEE_MAX: Joi.number().min(0).optional(),
  SETTLEMENT_PERCENTAGE: Joi.number().min(0).max(100).default(100),
});
