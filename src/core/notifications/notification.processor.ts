import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Processor('email')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    super();
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    }
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'onboarding@resend.dev');
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'send-email':
        return this.handleSendEmail(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSendEmail(data: { to: string; subject: string; html: string }) {
    if (!this.resend) {
      this.logger.warn(`Skipping email to ${data.to}: Resend not configured`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });

      if (response.error) {
        this.logger.error(`Failed to send email to ${data.to}: ${response.error.message}`);
        throw new Error(response.error.message);
      }

      this.logger.log(`Email sent to ${data.to}: ${data.subject}`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending email to ${data.to}`, error);
      throw error;
    }
  }
}
