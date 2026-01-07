/**
 * Base Email Template
 * Wraps email content with consistent branding, header, and footer
 */

import { EMAIL_CONFIG, EmailBranding, getDefaultBranding } from './email.constants';
import { footer } from './components';

export interface BaseTemplateOptions {
  branding?: EmailBranding;
  unsubscribeToken?: string;
  showUnsubscribe?: boolean;
}

/**
 * Generate the base email template wrapper
 * @param content - The main email body content (HTML string)
 * @param options - Branding and unsubscribe options
 */
export function baseTemplate(content: string, options: BaseTemplateOptions = {}): string {
  const branding = options.branding || getDefaultBranding();
  const logoUrl = branding.logoUrl || EMAIL_CONFIG.logoUrl;
  const primaryColor = branding.primaryColor || EMAIL_CONFIG.primaryColor;
  const businessName = branding.businessName || EMAIL_CONFIG.platformName;

  // Build unsubscribe URL if token provided
  let unsubscribeUrl: string | undefined;
  if (options.showUnsubscribe !== false && options.unsubscribeToken) {
    unsubscribeUrl = `${EMAIL_CONFIG.unsubscribeBaseUrl}/unsubscribe?token=${options.unsubscribeToken}`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${businessName}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    table {
      border-collapse: collapse !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    a {
      color: ${primaryColor};
    }
    @media screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .content-padding {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_CONFIG.backgroundColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${EMAIL_CONFIG.backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -20)} 100%); padding: 28px; text-align: center;">
              <img src="${logoUrl}" alt="${businessName}" height="36" style="height: 36px; width: auto;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="content-padding" style="padding: 32px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td>
              ${footer(unsubscribeUrl, EMAIL_CONFIG.supportEmail, businessName)}
            </td>
          </tr>
          
        </table>
        <!-- /Container -->
      </td>
    </tr>
  </table>
  <!-- /Wrapper -->
</body>
</html>
  `.trim();
}

/**
 * Adjust hex color brightness
 * @param color - Hex color string
 * @param percent - Positive to lighten, negative to darken
 */
function adjustColor(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);

  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Simple email template (no header/footer) for transactional emails like OTP
 */
export function simpleTemplate(content: string, branding?: EmailBranding): string {
  const primaryColor = branding?.primaryColor || EMAIL_CONFIG.primaryColor;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Qkly</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_CONFIG.backgroundColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${EMAIL_CONFIG.backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
