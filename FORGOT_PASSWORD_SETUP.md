# Forgot Password Setup Guide

This guide explains how to set up and use the forgot password functionality that sends OTP via Kudi SMS.

## Environment Variables

Add the following variables to your `.env` file:

```env
# Kudi SMS API Configuration
KUDI_SMS_API_URL=https://api.kudisms.com/api/v1
KUDI_SMS_API_KEY=your-kudi-sms-api-key
KUDI_SMS_SENDER_ID=NQkly
```

### Getting Kudi SMS API Credentials

1. Visit [Kudi SMS](https://kudisms.com) and create an account
2. Go to your dashboard and generate an API key
3. Set up a sender ID (max 11 characters) - this will appear as the sender name on SMS messages

## Database Migration

The OTP entity has been updated with a new `purpose` field. You may need to run a database migration:

```sql
ALTER TABLE otps ADD COLUMN purpose VARCHAR(50) DEFAULT 'phone_verification' NOT NULL;
```

## API Endpoints

### 1. Forgot Password - Send OTP

**POST** `/users/forgot-password`

Sends an OTP to the user's registered phone number for password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully to your phone number",
  "maskedPhone": "0813*****06",
  "expiryInMinutes": 5
}
```

### 2. Verify Password Reset OTP

**POST** `/users/verify-password-reset-otp`

Verifies the OTP and returns a reset token for password change.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully. You can now reset your password.",
  "verified": true,
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Phone Number Masking

The system automatically masks phone numbers in responses:
- Original: `08123456789`
- Masked: `0812*****89`

## Security Features

1. **OTP Expiration**: OTPs expire after 5 minutes
2. **One-time Use**: Each OTP can only be used once
3. **Purpose Separation**: Password reset OTPs are separate from phone verification OTPs
4. **Reset Token**: Short-lived token (15 minutes) for actual password reset
5. **Production Safety**: SMS sending failures don't break the flow in development mode

## Error Handling

The API handles various error scenarios:
- User not found
- User has no phone number
- Invalid or expired OTP
- SMS service failures
- Database errors

## Testing in Development

In development mode, OTP codes are logged to the console for testing purposes:
```
Sending OTP via Kudi SMS to 08123456789: 123456
```

## SMS Message Format

The SMS message sent to users:
```
Your NQkly password reset OTP is: 123456. This code expires in 5 minutes. Do not share this code with anyone.
``` 