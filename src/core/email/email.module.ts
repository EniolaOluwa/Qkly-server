import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailPreferencesService } from './email-preferences.service';
import { EmailPreferencesController } from './email-preferences.controller';
import { EmailUnsubscription } from './entities/email-unsubscription.entity';

@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([EmailUnsubscription])],
    controllers: [EmailPreferencesController],
    providers: [EmailService, EmailPreferencesService, ConfigService],
    exports: [EmailService, EmailPreferencesService],
})
export class EmailModule { }