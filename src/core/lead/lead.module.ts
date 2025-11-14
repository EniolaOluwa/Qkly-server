import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadService } from './lead.service';
import { LeadForm } from './entity/leadForm.entity';
import { LeadController } from './lead.controller';
import { Leads } from './entity/leads.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeadForm, Leads])],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}