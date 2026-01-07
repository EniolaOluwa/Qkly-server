import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Cart } from '../cart/entities/cart.entity';
import { baseTemplate, simpleTemplate } from '../email/templates/base-template';
import { EmailBranding, mergeBranding, EMAIL_CONFIG } from '../email/templates/email.constants';
import {
  heading,
  paragraph,
  mutedText,
  button,
  alertBox,
  otp,
  divider,
  table,
  itemList,
  amountBox,
  infoTable,
  infoRow,
} from '../email/templates/components';
import { EmailPreferencesService } from '../email/email-preferences.service';
import { EmailCategory } from '../email/entities/email-unsubscription.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private resend: Resend;
  private readonly fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailPreferencesService: EmailPreferencesService,
  ) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not set. Email notifications will be skipped.');
    }

    this.fromEmail = this.configService.get<string>('FROM_EMAIL', 'no-reply@qkly.com');
  }

  async sendEmail(to: string, subject: string, html: string, senderName?: string): Promise<boolean> {
    const enableNotifications = this.configService.get<string>('ENABLE_NOTIFICATIONS');
    if (enableNotifications === 'false') {
      this.logger.debug(`Skipping email to ${to}: Notifications disabled globally.`);
      return false;
    }

    if (!this.resend) {
      this.logger.warn(`Skipping email to ${to}: Resend not configured`);
      return false;
    }

    try {
      const fromAddress = senderName ? `${senderName} <${this.fromEmail}>` : this.fromEmail;

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}`, error);
        return false;
      }

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Error sending email to ${to}`, err);
      return false;
    }
  }

  // ============================================
  // WALLET NOTIFICATIONS (Platform Branding)
  // ============================================

  async sendWalletFundedNotification(email: string, amount: number, reference: string) {
    const subject = 'Wallet Funded Successfully';
    const content = [
      heading('Wallet Funded'),
      alertBox('success', 'Your wallet has been funded successfully!'),
      amountBox('Amount Added', amount),
      infoTable(infoRow('Reference', reference)),
      paragraph('Thank you for using Qkly!'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(email, subject, html);
  }

  async sendPayoutSuccessNotification(email: string, amount: number, reference: string) {
    const subject = 'Payout Successful';
    const content = [
      heading('Payout Successful'),
      alertBox('success', 'Your payout has been processed successfully!'),
      amountBox('Amount Sent', amount),
      infoTable(infoRow('Reference', reference)),
      paragraph('Funds should reflect in your bank account shortly.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(email, subject, html);
  }

  async sendPayoutFailedNotification(email: string, amount: number, reference: string, reason?: string) {
    const subject = 'Payout Failed';
    const content = [
      heading('Payout Failed'),
      alertBox('error', `Your payout of ₦${amount.toLocaleString()} failed.`),
      infoTable([infoRow('Reason', reason || 'Unknown error'), infoRow('Reference', reference)].join('')),
      paragraph('The amount has been reversed to your wallet.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(email, subject, html);
  }

  // ============================================
  // ORDER NOTIFICATIONS (Business Branding)
  // ============================================

  async sendOrderConfirmation(email: string, order: any) {
    const subject = `Order Confirmation #${order.orderReference}`;

    // Extract business branding
    let business: any;
    if (order.items?.[0]?.product?.business) {
      business = order.items[0].product.business;
    } else if (order.business) {
      business = order.business;
    }
    const branding = mergeBranding(business);

    const items = order.items.map((item: any) => ({
      name: item.productName,
      variant: item.variantName,
      quantity: item.quantity,
      price: item.price,
    }));

    const content = [
      heading('Order Confirmation'),
      paragraph(`Hi ${order.customerName},`),
      paragraph('Thank you for your order! We have received it and are processing it.'),
      infoTable(infoRow('Order Reference', order.orderReference)),
      itemList(items, true),
      divider(),
      amountBox('Total', Number(order.total), branding.primaryColor),
      paragraph('We will notify you when your order ships.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL, business?.id);
    const html = baseTemplate(content, { branding, unsubscribeToken: token });
    await this.sendEmail(email, subject, html, branding.businessName);
  }

  async sendNewOrderAlert(businessEmail: string, order: any) {
    const subject = `New Order Received #${order.orderReference}`;
    const content = [
      heading('New Order Alert'),
      alertBox('success', `You have received a new order from ${order.customerName}!`),
      infoTable([infoRow('Order Reference', order.orderReference), infoRow('Total', `₦${Number(order.total).toLocaleString()}`)].join('')),
      button('View Order', `${EMAIL_CONFIG.appUrl}/dashboard/orders`),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(businessEmail, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(businessEmail, subject, html);
  }

  async sendOrderStatusUpdate(email: string, order: any, newStatus: string) {
    const subject = `Order Status Update #${order.orderReference}`;

    // Extract business branding
    const business = order.business || order.items?.[0]?.product?.business;
    const branding = mergeBranding(business);

    const content = [
      heading('Order Update'),
      paragraph(`Hi ${order.customerName},`),
      paragraph(`Your order <strong>#${order.orderReference}</strong> status has been updated to:`),
      alertBox('info', newStatus),
      paragraph('Thank you for shopping with us.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL, business?.id);
    const html = baseTemplate(content, { branding, unsubscribeToken: token });
    await this.sendEmail(email, subject, html, branding.businessName);
  }

  async sendLowStockAlert(businessEmail: string, productName: string, variantName: string, currentStock: number) {
    const subject = `Low Stock Alert: ${productName}`;
    const content = [
      heading('Low Stock Alert'),
      alertBox('warning', `Product <strong>${productName}</strong> ${variantName ? `(${variantName})` : ''} is running low.`),
      infoTable(infoRow('Current Stock', String(currentStock))),
      paragraph('Please restock soon to avoid running out of inventory.'),
      button('Manage Inventory', `${EMAIL_CONFIG.appUrl}/dashboard/products`),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(businessEmail, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(businessEmail, subject, html);
  }

  async sendRefundSuccess(email: string, order: any, amount: number) {
    const subject = `Refund Processed for Order #${order.orderReference}`;

    const business = order.business || order.items?.[0]?.product?.business;
    const branding = mergeBranding(business);

    const content = [
      heading('Refund Processed'),
      paragraph(`Hi ${order.customerName},`),
      alertBox('success', `A refund has been processed for your order #${order.orderReference}.`),
      amountBox('Refund Amount', amount, EMAIL_CONFIG.successColor),
      paragraph('The funds should reflect in your account within 5-10 business days depending on your bank.'),
      mutedText('If you have any questions, please reply to this email.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL, business?.id);
    const html = baseTemplate(content, { branding, unsubscribeToken: token });
    await this.sendEmail(email, subject, html, branding.businessName);
  }

  async sendRefundFailureAlert(businessEmail: string, orderId: number | string, reason: string) {
    const subject = `Refund Failed for Order #${orderId}`;
    const content = [
      heading('Refund Failed'),
      alertBox('error', `Automatic refund failed for Order #${orderId}.`),
      infoTable(infoRow('Reason', reason)),
      paragraph('<strong>Action Required:</strong> Please manually review this order and process the refund if necessary.'),
      button('View Order', `${EMAIL_CONFIG.appUrl}/dashboard/orders`),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(businessEmail, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(businessEmail, subject, html);
  }

  // ============================================
  // CART NOTIFICATIONS (Business Branding, Marketing)
  // ============================================

  async sendCartReminder(email: string, cart: Cart, stage: number) {
    // Check if unsubscribed from marketing
    const business = cart.items?.[0]?.product?.business;
    const isUnsubscribed = await this.emailPreferencesService.isUnsubscribed(email, EmailCategory.MARKETING, business?.id);
    if (isUnsubscribed) {
      this.logger.debug(`Skipping cart reminder to ${email}: User unsubscribed from marketing`);
      return;
    }

    const branding = mergeBranding(business);
    let subject = '';
    let message = '';

    switch (stage) {
      case 1:
        subject = `You left something behind at ${branding.businessName}!`;
        message = 'We noticed you left some items in your cart. They are selling out fast, so grab them while you can!';
        break;
      case 2:
        subject = 'Still interested?';
        message = 'Your items are still waiting for you. Complete your purchase now!';
        break;
      case 3:
        subject = 'Last chance to recover your cart';
        message = 'This is your last chance to restore your cart. We will have to clear it soon.';
        break;
    }

    const items = cart.items.map((item: any) => ({
      name: item.product.name,
      variant: item.variant?.name,
      quantity: item.quantity,
    }));

    const content = [
      heading(subject),
      paragraph('Hi,'),
      paragraph(message),
      itemList(items, false),
      button('Return to Cart', `${EMAIL_CONFIG.appUrl}/cart?sessionId=${cart.sessionId || ''}`, branding.primaryColor),
      mutedText(`You are receiving this email because you visited ${branding.businessName}.`),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.MARKETING, business?.id);
    const html = baseTemplate(content, { branding, unsubscribeToken: token });
    await this.sendEmail(email, subject, html, branding.businessName);
  }

  // ============================================
  // KYC NOTIFICATIONS (Platform Branding)
  // ============================================

  async sendKycApprovedNotification(email: string, firstName: string, tier: string) {
    const subject = 'KYC Verification Approved';
    const content = [
      heading('Verification Successful!'),
      alertBox('success', 'Congratulations! Your identity verification has been approved.'),
      paragraph(`Hi ${firstName},`),
      infoTable(infoRow('Current Level', tier)),
      paragraph('You can now access higher limits and features on Qkly.'),
      paragraph('Thank you for choosing Qkly.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(email, subject, html);
  }

  async sendKycRejectedNotification(email: string, firstName: string, reason: string) {
    const subject = 'KYC Verification Failed';
    const content = [
      heading('Verification Failed'),
      alertBox('error', 'Unfortunately, your identity verification could not be completed.'),
      paragraph(`Hi ${firstName},`),
      infoTable(infoRow('Reason', reason)),
      paragraph('Please review your details and try again, or contact support for assistance.'),
      button('Try Again', `${EMAIL_CONFIG.appUrl}/settings/verification`),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(email, subject, html);
  }

  async sendKycUnderReviewNotification(email: string, firstName: string) {
    const subject = 'KYC Document Submitted';
    const content = [
      heading('Document Under Review'),
      paragraph(`Hi ${firstName},`),
      paragraph('We have received your ID document for verification.'),
      alertBox('info', 'Our team will review your submission and notify you shortly via email.'),
      paragraph('This process usually takes 24-48 hours.'),
    ].join('');

    const token = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: token });
    await this.sendEmail(email, subject, html);
  }

  // ============================================
  // AUTH NOTIFICATIONS (Platform Branding, Simple Template)
  // ============================================

  async sendEmailVerification(email: string, firstName: string, token: string) {
    const subject = 'Verify your email address';
    const content = [
      heading('Verify your email'),
      paragraph(`Hi ${firstName},`),
      paragraph('Please use the following code to verify your email address:'),
      otp(token),
      mutedText('This code is valid for 15 minutes.'),
      mutedText("If you didn't request this, please ignore this email."),
    ].join('');

    // Use simple template for OTP emails (no unsubscribe needed)
    const html = simpleTemplate(content);
    await this.sendEmail(email, subject, html);
  }

  async sendLoginNotification(email: string, firstName: string, time: string, device: string, location: string) {
    const subject = 'New Login Alert';
    const content = [
      heading('New Sign-in Detected'),
      paragraph(`Hi ${firstName},`),
      alertBox('warning', 'We noticed a new sign-in to your Qkly account.'),
      infoTable([infoRow('Time', time), infoRow('Device', device), infoRow('Location', location)].join('')),
      paragraph('If this was you, you can ignore this email.'),
      alertBox('error', "If you did not sign in, please contact support immediately and change your PIN."),
    ].join('');

    const unsubToken = await this.emailPreferencesService.getOrCreateToken(email, EmailCategory.TRANSACTIONAL);
    const html = baseTemplate(content, { unsubscribeToken: unsubToken });
    await this.sendEmail(email, subject, html);
  }

  async sendForgotPasswordEmail(email: string, firstName: string, otpCode: string, validity: string) {
    const subject = 'Password Reset Request';
    const content = [
      heading('Reset Your Password'),
      paragraph(`Hi ${firstName},`),
      paragraph('You requested to reset your password. Use the code below to proceed:'),
      otp(otpCode),
      mutedText(`This code is valid for ${validity}.`),
      mutedText("If you didn't request this, please ignore this email or contact support."),
    ].join('');

    // Use simple template for OTP emails
    const html = simpleTemplate(content);
    await this.sendEmail(email, subject, html);
  }
}
