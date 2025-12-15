import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/business.entity';
import { BusinessesModule } from '../businesses/businesses.module';
import { LeadForm } from './entity/leadForm.entity';
import { Leads } from './entity/leads.entity';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { PublicLeadController } from './public-lead.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadForm, Leads, Business]),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    BusinessesModule
  ],
  controllers: [LeadController, PublicLeadController],
  providers: [LeadService],
  exports: [LeadService],
})


export class LeadModule { }