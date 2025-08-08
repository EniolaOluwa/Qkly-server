# Termii SMS Integration Setup

This project uses [Termii](https://termii.com/) for sending SMS OTPs. Termii is a reliable SMS and messaging service provider.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Termii SMS API Configuration
TERMII_BASE_URL=https://api.ng.termii.com
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=NQkly
TERMII_CHANNEL=generic
```

### Configuration Details:

- **TERMII_BASE_URL**: The base URL for Termii API (default: `https://api.ng.termii.com`)
- **TERMII_API_KEY**: Your API key from the [Termii dashboard](https://accounts.termii.com/#/)
- **TERMII_SENDER_ID**: Alphanumeric sender ID (3-11 characters, e.g., "NQkly")
- **TERMII_CHANNEL**: Message channel options:
  - `generic`: For promotional messages and numbers not on DND
  - `dnd`: For messages that bypass DND restrictions
  - `whatsapp`: For WhatsApp messages

## Getting Your Termii API Key

1. Sign up at [Termii](https://accounts.termii.com/#/)
2. Complete your account verification
3. Navigate to your dashboard
4. Copy your API key from the API section

## Message Channels

- **Generic Channel**: Default channel for most messages
- **DND Channel**: For messages to numbers with Do-Not-Disturb settings (requires activation)
- **WhatsApp Channel**: For WhatsApp messaging (requires setup)

## SMS Features Used

- **Phone OTP Verification**: When users verify their phone numbers
- **Password Reset OTP**: When users request password reset

## API Endpoint Used

The integration uses Termii's messaging API:
- **Endpoint**: `POST /api/sms/send`
- **Documentation**: [Termii Messaging API](https://developers.termii.com/messaging-api)

## Error Handling

The SMS service includes proper error handling:
- In development mode, SMS failures are logged but don't break the flow
- In production mode, SMS failures throw appropriate exceptions
- All errors are logged for debugging purposes

## Testing

To test the SMS integration:
1. Ensure your API key is valid and has SMS credits
2. Use a valid phone number in international format (e.g., `234XXXXXXXXX`)
3. Check the console logs for debugging information in development mode
