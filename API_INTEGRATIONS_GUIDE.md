# API Integrations Guide

This guide covers all the external API integrations configured in the NQkly server application.

## 🔧 Environment Configuration

All API credentials are now properly configured in the `.env` file using NestJS `ConfigService`:

### Database Configuration
```env
DB_HOST=localhost
DB_PORT=6543
DB_USERNAME=eniolafakeye
DB_PASSWORD=password@12345
DB_NAME=nqkly_db
```

### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
```

### Application Configuration
```env
NODE_ENV=development
PORT=3000
```

## 📱 Kudi SMS API Integration

**Purpose**: Forgot password OTP delivery via SMS

### Environment Variables
```env
KUDI_SMS_API_URL=https://api.kudisms.com/api/v1
KUDI_SMS_API_KEY=your-kudi-sms-api-key
KUDI_SMS_SENDER_ID=NQkly
```

### Setup Steps
1. Sign up at [Kudi SMS](https://kudisms.com)
2. Generate API key from dashboard
3. Set sender ID (max 11 characters)
4. Update `KUDI_SMS_API_KEY` in `.env`

### API Endpoints Used
- **POST** `/send-sms-otp` - Send OTP via SMS

### Integration Points
- `src/users/users.service.ts` - `sendOtpViaSms()` method
- **POST** `/v1/users/forgot-password` - Triggers SMS OTP

## 🔐 Prembly API Integration

**Purpose**: KYC/Identity verification for user verification status

### Environment Variables
```env
PREMBLY_BASE_URL=https://api.prembly.com
PREMBLY_API_KEY=your-prembly-api-key
```

### Setup Steps
1. Sign up at [Prembly](https://prembly.com)
2. Get API key from dashboard
3. Update credentials in `.env`

### API Endpoints Used
- **GET** `/identitypass/verification/{id}/status` - Get verification status

### Integration Points
- `src/users/users.service.ts` - `getKycVerificationDetails()` method
- **POST** `/v1/users/verify-kyc` - KYC verification endpoint

## 💰 Monnify API Integration

**Purpose**: Wallet creation and payment processing

### Environment Variables
```env
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_API_KEY=MK_TEST_SAF7HR5F3F
MONNIFY_SECRET_KEY=4SY6TNL8CK3VPRSBTHTRG2N8XXEGC6NL
MONNIFY_CONTRACT_CODE=7059707855
```

### Setup Steps
1. Sign up at [Monnify](https://monnify.com)
2. Get API credentials from dashboard
3. For production, change `MONNIFY_BASE_URL` to `https://api.monnify.com`
4. Update all credentials in `.env`

### API Endpoints Used
- **POST** `/api/v1/auth/login` - Authentication
- **POST** `/api/v1/disbursements/wallet` - Wallet creation

### Integration Points
- `src/wallets/wallets.service.ts` - Wallet management
- **POST** `/v1/wallets/generate` - Create user wallet
- **GET** `/v1/wallets/user` - Get user wallet info

## 🏗️ ConfigService Implementation

All services now use NestJS `ConfigService` for environment variable access:

```typescript
// ✅ Good: Using ConfigService
const apiKey = this.configService.get<string>('API_KEY', 'default-value');

// ❌ Avoid: Direct process.env access
const apiKey = process.env.API_KEY || 'default-value';
```

## 🔒 Security Best Practices

### Production Configuration

1. **Strong Secrets**: Use long, random JWT secrets
2. **Environment Separation**: Different credentials for dev/staging/prod
3. **Credential Rotation**: Regularly rotate API keys
4. **HTTPS Only**: All API calls use HTTPS in production
5. **Rate Limiting**: Implement proper rate limiting

### Development Safety

- SMS failures don't break requests in development mode
- Console logging for OTP codes during testing
- Sandbox URLs for payment providers
- Mock credentials for local testing

## 🧪 Testing

### Forgot Password Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/v1/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# 2. Verify OTP
curl -X POST http://localhost:3000/v1/users/verify-password-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'
```

### KYC Verification
```bash
curl -X POST http://localhost:3000/v1/users/verify-kyc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"reference_id": "DJ-31038041E0"}'
```

### Wallet Generation
```bash
curl -X POST http://localhost:3000/v1/wallets/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "walletReference": "user_123_wallet",
    "walletName": "John Doe Wallet",
    "customerEmail": "john@example.com",
    "bvn": "12345678901",
    "currencyCode": "NGN"
  }'
```

## 📊 API Documentation

Swagger documentation available at: `http://localhost:3000/api/docs`

## 🚨 Error Handling

All integrations include comprehensive error handling:

- **Authentication errors**: Invalid API credentials
- **Network errors**: API service unavailable
- **Validation errors**: Invalid request data
- **Business logic errors**: Duplicate wallets, expired OTPs, etc.

## 📈 Monitoring

Consider implementing:

- API call logging
- Response time monitoring
- Error rate tracking
- Usage analytics
- Health checks for external services 