import { Controller, Get, Post, Query, Body, Res, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { EmailPreferencesService } from './email-preferences.service';
import { EmailCategory } from './entities/email-unsubscription.entity';
import { EMAIL_CONFIG } from './templates/email.constants';

@ApiTags('Email Preferences')
@Controller('email')
export class EmailPreferencesController {
  constructor(private readonly emailPreferencesService: EmailPreferencesService) { }

  /**
   * Render unsubscribe confirmation page
   */
  @Get('unsubscribe')
  @ApiOperation({ summary: 'Display unsubscribe page' })
  @ApiQuery({ name: 'token', required: true, description: 'Unsubscribe token from email link' })
  @ApiResponse({ status: 200, description: 'HTML unsubscribe confirmation page' })
  async showUnsubscribePage(@Query('token') token: string, @Res() res: Response) {
    const unsubscription = await this.emailPreferencesService.getByToken(token);

    if (!unsubscription) {
      return res.status(HttpStatus.NOT_FOUND).send(this.renderErrorPage('Invalid or expired unsubscribe link'));
    }

    const businessName = unsubscription.business?.businessName || 'Qkly';
    const isAlreadyUnsubscribed = unsubscription.isActive;

    return res.status(HttpStatus.OK).send(
      this.renderUnsubscribePage({
        email: unsubscription.email,
        businessName,
        category: unsubscription.category,
        token,
        isAlreadyUnsubscribed,
      }),
    );
  }

  /**
   * Process unsubscribe request
   */
  @Post('unsubscribe')
  @ApiOperation({ summary: 'Process unsubscribe request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Unsubscribe token' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed' })
  async processUnsubscribe(@Body('token') token: string, @Res() res: Response) {
    try {
      const result = await this.emailPreferencesService.unsubscribe(token);
      return res.status(HttpStatus.OK).send(
        this.renderSuccessPage({
          email: result.email,
          category: result.category,
          action: 'unsubscribed',
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).send(this.renderErrorPage('Invalid unsubscribe token'));
      }
      throw error;
    }
  }

  /**
   * One-click unsubscribe (for List-Unsubscribe header support)
   */
  @Post('unsubscribe/one-click')
  @ApiOperation({ summary: 'One-click unsubscribe for email clients' })
  async oneClickUnsubscribe(@Body('token') token: string) {
    await this.emailPreferencesService.unsubscribe(token);
    return { success: true, message: 'Successfully unsubscribed' };
  }

  /**
   * Resubscribe
   */
  @Post('resubscribe')
  @ApiOperation({ summary: 'Resubscribe to emails' })
  async resubscribe(@Body('token') token: string, @Res() res: Response) {
    try {
      await this.emailPreferencesService.resubscribe(token);
      return res.status(HttpStatus.OK).send(
        this.renderSuccessPage({
          email: '',
          category: EmailCategory.MARKETING,
          action: 'resubscribed',
        }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).send(this.renderErrorPage('Invalid token'));
      }
      throw error;
    }
  }

  /**
   * Render HTML unsubscribe page
   */
  private renderUnsubscribePage(options: {
    email: string;
    businessName: string;
    category: EmailCategory;
    token: string;
    isAlreadyUnsubscribed: boolean;
  }): string {
    const categoryLabel =
      options.category === EmailCategory.ALL
        ? 'all'
        : options.category === EmailCategory.TRANSACTIONAL
          ? 'transactional'
          : 'marketing';

    if (options.isAlreadyUnsubscribed) {
      return this.renderPage(
        'Already Unsubscribed',
        `
        <h1>You're already unsubscribed</h1>
        <p>The email <strong>${options.email}</strong> has already been unsubscribed from ${categoryLabel} emails from ${options.businessName}.</p>
        <form action="/email/resubscribe" method="POST">
          <input type="hidden" name="token" value="${options.token}" />
          <button type="submit" class="btn btn-secondary">Resubscribe</button>
        </form>
      `,
      );
    }

    return this.renderPage(
      'Unsubscribe',
      `
      <h1>Unsubscribe from emails</h1>
      <p>Click the button below to unsubscribe <strong>${options.email}</strong> from ${categoryLabel} emails from ${options.businessName}.</p>
      <form action="/email/unsubscribe" method="POST">
        <input type="hidden" name="token" value="${options.token}" />
        <button type="submit" class="btn">Unsubscribe</button>
      </form>
      <p class="muted">Changed your mind? You can close this page.</p>
    `,
    );
  }

  /**
   * Render success page
   */
  private renderSuccessPage(options: { email: string; category: EmailCategory; action: 'unsubscribed' | 'resubscribed' }): string {
    const message =
      options.action === 'unsubscribed'
        ? "You've been successfully unsubscribed. You won't receive these emails anymore."
        : "You've been successfully resubscribed. You'll start receiving emails again.";

    return this.renderPage(
      options.action === 'unsubscribed' ? 'Unsubscribed' : 'Resubscribed',
      `
      <h1>✓ ${options.action === 'unsubscribed' ? 'Unsubscribed' : 'Resubscribed'}</h1>
      <p>${message}</p>
      <a href="${EMAIL_CONFIG.appUrl}" class="btn">Go to ${EMAIL_CONFIG.platformName}</a>
    `,
    );
  }

  /**
   * Render error page
   */
  private renderErrorPage(message: string): string {
    return this.renderPage(
      'Error',
      `
      <h1>Something went wrong</h1>
      <p>${message}</p>
      <a href="${EMAIL_CONFIG.appUrl}" class="btn">Go to ${EMAIL_CONFIG.platformName}</a>
    `,
    );
  }

  /**
   * Base HTML page template
   */
  private renderPage(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${EMAIL_CONFIG.platformName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${EMAIL_CONFIG.backgroundColor};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: #fff;
      border-radius: 12px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    h1 {
      color: ${EMAIL_CONFIG.textColor};
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: ${EMAIL_CONFIG.mutedTextColor};
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .muted { font-size: 14px; margin-top: 16px; }
    .btn {
      display: inline-block;
      background: ${EMAIL_CONFIG.primaryColor};
      color: #fff;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-secondary {
      background: transparent;
      color: ${EMAIL_CONFIG.primaryColor};
      border: 2px solid ${EMAIL_CONFIG.primaryColor};
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
    `.trim();
  }
}
