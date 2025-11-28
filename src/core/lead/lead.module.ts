import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadForm } from './entity/leadForm.entity';
import { Leads } from './entity/leads.entity';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { PublicLeadController } from './public-lead.controller';
import { Business } from '../businesses/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadForm, Leads, Business]),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [LeadController, PublicLeadController],
  providers: [LeadService],
  exports: [LeadService],
})


export class LeadModule { }