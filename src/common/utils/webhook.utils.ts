import * as crypto from 'crypto';

export function verifyMonnifySignature(
  signature: string,
  requestBody: string,
  clientSecret: string,
): boolean {
  try {
    const computedSignature = crypto
      .createHmac('sha512', clientSecret)
      .update(requestBody)
      .digest('hex');

    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}
