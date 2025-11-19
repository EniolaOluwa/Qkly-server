import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { MailDispatcherDto } from "./dto/sendMail.dto";



@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private readonly configService: ConfigService,
    ) {}


    async emailDispatcher(mailDispatcher: MailDispatcherDto){
        try {
            
        } catch (error) {
            this.logger.error('Email failed to send')
        }
    }
}