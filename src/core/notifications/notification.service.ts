import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not set. Email notifications will be skipped.');
    }

    this.fromEmail = this.configService.get<string>('FROM_EMAIL', 'no-reply@qkly.com');
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
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
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
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

  async sendWalletFundedNotification(email: string, amount: number, reference: string) {
    const subject = 'Wallet Funded Successfully';
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Wallet Funded</h2>
        <p>Your wallet has been funded with ₦${amount.toLocaleString()}.</p>
        <p>Reference: ${reference}</p>
        <p>Thank you for using Qkly!</p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendPayoutSuccessNotification(email: string, amount: number, reference: string) {
    const subject = 'Payout Successful';
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Payout Successful</h2>
        <p>Your payout of ₦${amount.toLocaleString()} has been processed successfully.</p>
        <p>Reference: ${reference}</p>
        <p>Funds should reflect in your bank account shortly.</p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendPayoutFailedNotification(email: string, amount: number, reference: string, reason?: string) {
    const subject = 'Payout Failed';
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: red;">Payout Failed</h2>
        <p>Your payout of ₦${amount.toLocaleString()} failed.</p>
        <p>Reason: ${reason || 'Unknown error'}</p>
        <p>Reference: ${reference}</p>
        <p>The amount has been reversed to your wallet.</p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendOrderConfirmation(email: string, order: any) {
    const subject = `Order Confirmation #${order.orderReference}`;
    const itemsHtml = order.items
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName} ${item.variantName ? `(${item.variantName})` : ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">₦${Number(item.price).toLocaleString()}</td>
        </tr>
      `,
      )
      .join('');

    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Order Confirmation</h2>
        <p>Hi ${order.customerName},</p>
        <p>Thank you for your order! We have received it and are processing it.</p>
        <p><strong>Order Reference:</strong> ${order.orderReference}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="text-align: left; background-color: #f4f4f4;">
              <th style="padding: 8px;">Product</th>
              <th style="padding: 8px;">Qty</th>
              <th style="padding: 8px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p style="margin-top: 20px;"><strong>Total: ₦${Number(order.total).toLocaleString()}</strong></p>
        <p>We will notify you when your order ships.</p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendNewOrderAlert(businessEmail: string, order: any) {
    const subject = `New Order Received #${order.orderReference}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>New Order Alert</h2>
        <p>You have received a new order from <strong>${order.customerName}</strong>.</p>
        <p><strong>Order Reference:</strong> ${order.orderReference}</p>
        <p><strong>Total:</strong> ₦${Number(order.total).toLocaleString()}</p>
        <p>Please login to your dashboard to fulfill this order.</p>
      </div>
    `;
    await this.sendEmail(businessEmail, subject, html);
  }

  async sendOrderStatusUpdate(email: string, order: any, newStatus: string) {
    const subject = `Order Status Update #${order.orderReference}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Order Update</h2>
        <p>Hi ${order.customerName},</p>
        <p>Your order <strong>#${order.orderReference}</strong> status has been updated to:</p>
        <h3 style="color: #007bff;">${newStatus}</h3>
        <p>Thank you for shopping with us.</p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendLowStockAlert(businessEmail: string, productName: string, variantName: string, currentStock: number) {
    const subject = `Low Stock Alert: ${productName}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: orange;">Low Stock Alert</h2>
        <p>Product <strong>${productName}</strong> ${variantName ? `(${variantName})` : ''} is running low.</p>
        <p><strong>Current Stock:</strong> ${currentStock}</p>
        <p>Please restock soon to avoid running out of inventory.</p>
      </div>
    `;
    await this.sendEmail(businessEmail, subject, html);
  }
  async sendRefundSuccess(email: string, order: any, amount: number) {
    const subject = `Refund Processed for Order #${order.orderReference}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Refund Processed</h2>
        <p>Hi ${order.customerName},</p>
        <p>A refund of <strong>₦${amount.toLocaleString()}</strong> has been processed for your order <strong>#${order.orderReference}</strong>.</p>
        <p>The funds should reflect in your account within 5-10 business days depending on your bank.</p>
        <p>If you have any questions, please reply to this email.</p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }

  async sendRefundFailureAlert(businessEmail: string, orderId: number | string, reason: string) {
    const subject = `Refund Failed for Order #${orderId}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: red;">Refund Failed</h2>
        <p>Automatic refund failed for Order <strong>#${orderId}</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Action Required:</strong> Please manually review this order and process the refund if necessary.</p>
      </div>
    `;
    await this.sendEmail(businessEmail, subject, html);
  }

  async sendCartReminder(email: string, cart: any, stage: number) {
    let subject = '';
    let message = '';

    switch (stage) {
      case 1:
        subject = 'You left something behind!';
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

    const itemsHtml = cart.items
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name} ${item.variant ? `(${item.variant.name})` : ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        </tr>
      `,
      )
      .join('');

    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>${subject}</h2>
        <p>${message}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="text-align: left; background-color: #f4f4f4;">
              <th style="padding: 8px;">Product</th>
              <th style="padding: 8px;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p style="margin-top: 20px;">
          <a href="https://app.qkly.com/cart" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Return to Cart</a>
        </p>
      </div>
    `;
    await this.sendEmail(email, subject, html);
  }
}
