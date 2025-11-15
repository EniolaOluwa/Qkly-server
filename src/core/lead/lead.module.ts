import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadForm } from './entity/leadForm.entity';
import { Leads } from './entity/leads.entity';
import {
  AuthenticatedThrottleGuard,
  FormAccessThrottleGuard,
  IpThrottleGuard,
  LeadSubmissionThrottleGuard,
} from './guards/throttle.guards';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { PublicLeadController } from './public-lead.controller';

@Module({
  imports: [
    // Register TypeORM entities
    TypeOrmModule.forFeature([LeadForm, Leads]),

    // Configure Throttler with multiple strategies
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,  // 60 seconds (1 minute)
        limit: 10,
      },
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 3,    // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 seconds
        limit: 20,   // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute
        limit: 100,  // 100 requests per minute
      },
      {
        name: 'lead-submission',
        ttl: 60000,  // 1 minute
        limit: 5,    // 5 lead submissions per minute per IP (strict for public forms)
      },
      {
        name: 'form-access',
        ttl: 60000,  // 1 minute
        limit: 50,   // 50 form access requests per minute per IP
      },
      {
        name: 'authenticated',
        ttl: 60000,  // 1 minute
        limit: 100,  // 100 requests per minute per authenticated user
      },
      {
        name: 'hourly',
        ttl: 3600000, // 1 hour
        limit: 1000,  // 1000 requests per hour
      },
    ]),
  ],
  controllers: [
    LeadController,
    PublicLeadController,
  ],
  providers: [
    LeadService,

    // Register custom throttle guards
    LeadSubmissionThrottleGuard,
    AuthenticatedThrottleGuard,
    IpThrottleGuard,
    FormAccessThrottleGuard,
  ],
  exports: [
    LeadService,

    LeadSubmissionThrottleGuard,
    AuthenticatedThrottleGuard,
    IpThrottleGuard,
    FormAccessThrottleGuard,
  ],
})
export class LeadModule { }