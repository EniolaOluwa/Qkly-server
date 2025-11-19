import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { MailDispatcherDto } from "./dto/sendMail.dto";
import { EmailProvider } from "./interfaces/mail.interfaces";
import { ResendProvider } from "./provider/resend.provider";
import { MailgunProvider } from "./provider/mailgun.provider";



@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private provider: EmailProvider;
   
    constructor( private readonly configService: ConfigService) {
       const emailProvider = this.configService.get<string>("EMAIL_PROVIDER");
       

       switch(emailProvider){
            case "resend": {
                const resendKey = this.configService.get<string>("RESEND_API_KEY");
            
                if (!resendKey) {
                    throw new Error("RESEND_API_KEY is not configured.");
                }
                this.provider = new ResendProvider(resendKey);

                break;
            }

            case "mailgun": {
                const mailgunKey = this.configService.get<string>("MAILGUN_API_KEY");
                const mailgunDomain = this.configService.get<string>("MAILGUN_DOMAIN");
                if (!mailgunKey || !mailgunDomain) {
                    throw new Error("MAILGUN_API_KEY or MAILGUN_DOMAIN is not configured.");
                }
                this.provider = new MailgunProvider(
                    mailgunKey,
                    mailgunDomain
                );

                break;
            }

            default:
                throw new Error("No valid email provider configured.");
       }
    }

 
    async emailDispatcher(mailDispatcher: MailDispatcherDto){
        try {
         return await this.provider.sendEmail(mailDispatcher);
        } catch (error) {
            this.logger.error('Email failed to send')
            throw new InternalServerErrorException("Email sending failed");
        }
    }
}