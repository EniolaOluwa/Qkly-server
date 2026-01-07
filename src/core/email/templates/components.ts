/**
 * Reusable Email Template Components
 * Color parameters allow business customization
 */

import { EMAIL_CONFIG } from './email.constants';

/**
 * Primary CTA button
 */
export function button(text: string, url: string, color?: string): string {
  const bgColor = color || EMAIL_CONFIG.primaryColor;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: ${bgColor};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Secondary/outline button
 */
export function secondaryButton(text: string, url: string, color?: string): string {
  const borderColor = color || EMAIL_CONFIG.primaryColor;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="border-radius: 6px; border: 2px solid ${borderColor};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 26px; font-size: 16px; font-weight: 600; color: ${borderColor}; text-decoration: none; border-radius: 6px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Alert/notification box
 */
export function alertBox(type: 'success' | 'warning' | 'error' | 'info', message: string): string {
  const colors = {
    success: { bg: '#ecfdf5', border: EMAIL_CONFIG.successColor, text: '#065f46' },
    warning: { bg: '#fffbeb', border: EMAIL_CONFIG.warningColor, text: '#92400e' },
    error: { bg: '#fef2f2', border: EMAIL_CONFIG.errorColor, text: '#991b1b' },
    info: { bg: '#eff6ff', border: EMAIL_CONFIG.primaryColor, text: '#1e40af' },
  };
  const style = colors[type];

  return `
    <div style="border-left: 4px solid ${style.border}; background-color: ${style.bg}; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: ${style.text}; font-size: 14px;">${message}</p>
    </div>
  `;
}

/**
 * Section heading
 */
export function heading(title: string, color?: string): string {
  const textColor = color || EMAIL_CONFIG.textColor;
  return `<h2 style="color: ${textColor}; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">${title}</h2>`;
}

/**
 * Subheading
 */
export function subheading(title: string): string {
  return `<h3 style="color: ${EMAIL_CONFIG.textColor}; font-size: 18px; font-weight: 600; margin: 24px 0 12px 0;">${title}</h3>`;
}

/**
 * Paragraph text
 */
export function paragraph(text: string): string {
  return `<p style="color: ${EMAIL_CONFIG.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">${text}</p>`;
}

/**
 * Muted/secondary text
 */
export function mutedText(text: string): string {
  return `<p style="color: ${EMAIL_CONFIG.mutedTextColor}; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">${text}</p>`;
}

/**
 * OTP/Code display box
 */
export function otp(code: string): string {
  return `
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${EMAIL_CONFIG.textColor};">
        ${code}
      </span>
    </div>
  `;
}

/**
 * Horizontal divider
 */
export function divider(): string {
  return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`;
}

/**
 * Key-value info row
 */
export function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 8px 0; color: ${EMAIL_CONFIG.mutedTextColor}; font-size: 14px;">${label}</td>
      <td style="padding: 8px 0; color: ${EMAIL_CONFIG.textColor}; font-size: 14px; font-weight: 500; text-align: right;">${value}</td>
    </tr>
  `;
}

/**
 * Info table wrapper
 */
export function infoTable(rows: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      ${rows}
    </table>
  `;
}

/**
 * Data table with headers
 */
export function table(headers: string[], rows: { cells: string[] }[]): string {
  const headerHtml = headers
    .map((h) => `<th style="text-align: left; padding: 12px; background-color: #f9fafb; font-weight: 600; font-size: 14px; color: ${EMAIL_CONFIG.textColor}; border-bottom: 2px solid #e5e7eb;">${h}</th>`)
    .join('');

  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${row.cells.map((cell) => `<td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: ${EMAIL_CONFIG.textColor};">${cell}</td>`).join('')}</tr>`,
    )
    .join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; border-collapse: collapse;">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

/**
 * Order/Cart item list
 */
export function itemList(
  items: { name: string; variant?: string; quantity: number; price?: number }[],
  showPrice = true,
): string {
  const headers = showPrice ? ['Product', 'Qty', 'Price'] : ['Product', 'Qty'];

  const rows = items.map((item) => {
    const productName = item.variant ? `${item.name} (${item.variant})` : item.name;
    const cells = showPrice
      ? [productName, String(item.quantity), `₦${Number(item.price).toLocaleString()}`]
      : [productName, String(item.quantity)];
    return { cells };
  });

  return table(headers, rows);
}

/**
 * Amount highlight box (for totals, refunds, etc.)
 */
export function amountBox(label: string, amount: number, color?: string): string {
  const bgColor = color || EMAIL_CONFIG.primaryColor;
  return `
    <div style="background-color: ${bgColor}; color: #ffffff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">${label}</p>
      <p style="margin: 0; font-size: 28px; font-weight: 700;">₦${amount.toLocaleString()}</p>
    </div>
  `;
}

/**
 * Footer with unsubscribe and support links
 */
export function footer(unsubscribeUrl?: string, supportEmail?: string, businessName?: string): string {
  const support = supportEmail || EMAIL_CONFIG.supportEmail;
  const name = businessName || EMAIL_CONFIG.platformName;
  const year = new Date().getFullYear();

  let unsubscribeHtml = '';
  if (unsubscribeUrl) {
    unsubscribeHtml = `<a href="${unsubscribeUrl}" style="color: ${EMAIL_CONFIG.mutedTextColor}; text-decoration: underline;">Unsubscribe</a> | `;
  }

  return `
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: ${EMAIL_CONFIG.mutedTextColor};">
        © ${year} ${name}. All rights reserved.
      </p>
      <p style="margin: 0; font-size: 12px; color: ${EMAIL_CONFIG.mutedTextColor};">
        ${unsubscribeHtml}<a href="mailto:${support}" style="color: ${EMAIL_CONFIG.mutedTextColor}; text-decoration: underline;">Contact Support</a>
      </p>
    </div>
  `;
}
