import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { ErrorHelper } from "../../common/utils";
import { MailDispatcherDto } from "./dto/sendMail.dto";
import { EmailProvider } from "./interfaces/mail.interfaces";
import { MailgunProvider } from "./provider/mailgun.provider";
import { ResendProvider } from "./provider/resend.provider";
import { SystemConfigService } from "../system-config/system-config.service";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private provider: EmailProvider | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly systemConfigService: SystemConfigService
    ) {
        // Initialize provider regardless of initial status to allow dynamic enabling
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
                if (!emailProvider) {
                    this.logger.warn("No EMAIL_PROVIDER configured. Emails will not be sent even if enabled.");
                } else {
                    ErrorHelper.InternalServerErrorException(`Invalid email provider configured: ${emailProvider}`);
                }
        }
    }

    async emailDispatcher(mailDispatcher: MailDispatcherDto) {
        // Dynamic check
        const isEnabledVal = await this.systemConfigService.get('ENABLE_NOTIFICATIONS', false);
        const isEnabled = String(isEnabledVal).toLowerCase() === 'true';

        // Skip if notifications are disabled
        if (!isEnabled || !this.provider) {
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