import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { ErrorHelper } from "../../common/utils";
import { MailDispatcherDto } from "./dto/sendMail.dto";
import { EmailProvider } from "./interfaces/mail.interfaces";
import { MailgunProvider } from "./provider/mailgun.provider";
import { ResendProvider } from "./provider/resend.provider";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private provider: EmailProvider | null = null;
    private readonly isEnabled: boolean;

    constructor(private readonly configService: ConfigService) {
        // Check if notifications are enabled
        const enableNotifications = this.configService.get<string>('ENABLE_NOTIFICATIONS');
        this.isEnabled = enableNotifications?.toLowerCase() === 'true';

        if (!this.isEnabled) {
            this.logger.warn('Email notifications are disabled (ENABLE_NOTIFICATIONS=false)');
            return; // Skip provider initialization
        }

        const emailProvider = this.configService.get<string>("EMAIL_PROVIDER");

        switch (emailProvider) {
            case "resend": {
                const resendKey = this.configService.get<string>("RESEND_API_KEY");

                if (!resendKey) {
                    ErrorHelper.InternalServerErrorException("RESEND_API_KEY is not configured.");
                }
                this.provider = new ResendProvider(resendKey);

                break;
            }

            case "mailgun": {
                const mailgunKey = this.configService.get<string>("MAILGUN_API_KEY");
                const mailgunDomain = this.configService.get<string>("MAILGUN_DOMAIN");
                if (!mailgunKey || !mailgunDomain) {
                    ErrorHelper.InternalServerErrorException("MAILGUN_API_KEY or MAILGUN_DOMAIN is not configured.");
                }
                this.provider = new MailgunProvider(
                    mailgunKey,
                    mailgunDomain
                );

                break;
            }

            default:
                ErrorHelper.InternalServerErrorException("No valid email provider configured.");
        }
    }

    async emailDispatcher(mailDispatcher: MailDispatcherDto) {
        // Skip if notifications are disabled
        if (!this.isEnabled || !this.provider) {
            this.logger.log(`[Email Disabled] Would have sent to: ${mailDispatcher.to}, subject: ${mailDispatcher.subject}`);
            return { success: true, message: 'Email skipped (notifications disabled)' };
        }

        try {
            return await this.provider.sendEmail(mailDispatcher);
        } catch (error) {
            this.logger.error('Email failed to send')
            ErrorHelper.InternalServerErrorException("Email sending failed");
        }
    }
}