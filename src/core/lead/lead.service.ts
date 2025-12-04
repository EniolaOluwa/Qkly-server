import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrorHelper } from '../../common/utils';
import { CreateLeadDto, CreateLeadFormDto, UpdateLeadDto, UpdateLeadFormDto } from './dto/lead.dto';
import { LeadForm } from './entity/leadForm.entity';
import { Leads } from './entity/leads.entity';
import { Business } from '../businesses/business.entity';



@Injectable()
export class LeadService {
    constructor(
        @InjectRepository(LeadForm)
        private readonly leadFormRepo: Repository<LeadForm>,
        @InjectRepository(Leads)
        private readonly leadsRepo: Repository<Leads>,
    ) { }

    async createLeadForm(
        dto: CreateLeadFormDto,
        userId: number,
        businessId: number,
    ): Promise<LeadForm> {
        try {
            // if (!dto.title || !dto.buttonText || !dto.inputs || dto.inputs.length === 0) {
            //     ErrorHelper.BadRequestException(
            //         'Title, buttonText, and at least one input field are required',
            //     );
            // }

            const form = this.leadFormRepo.create({
                ...dto,
                businessId,
                createdBy: userId,
                isActive: dto.isActive ?? true,
            });

            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error creating lead form: ${error.message}`,
                error,
            );
        }
    }

    async getLeadFormsByBusinessId(businessId: number): Promise<LeadForm[]> {
        try {
            return await this.leadFormRepo.find({
                where: { businessId },
                relations: ['leads', 'creator', 'business'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(
                `Error fetching lead forms: ${error.message}`,
                error,
            );
        }
    }

    async getLeadFormById(id: number, businessId: number): Promise<LeadForm> {
        try {
            const form = await this.leadFormRepo.findOne({
                where: { id, businessId },
                relations: ['leads', 'creator', 'business'],
            });

            if (!form) {
                ErrorHelper.NotFoundException(`Lead form with ID ${id} not found`);
            }

            return form;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error fetching lead form: ${error.message}`,
                error,
            );
        }
    }

    async updateLeadForm(
        id: number,
        dto: UpdateLeadFormDto,
        businessId: number,
    ): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id, businessId);
            Object.assign(form, dto);
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error updating lead form: ${error.message}`,
                error,
            );
        }
    }

    async deleteLeadForm(
        id: number,
        businessId: number,
    ): Promise<{ success: boolean; message: string }> {
        try {
            const form = await this.getLeadFormById(id, businessId);
            await this.leadFormRepo.remove(form);
            return {
                success: true,
                message: `Lead form with ID ${id} deleted successfully`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error deleting lead form: ${error.message}`,
                error,
            );
        }
    }

    async toggleLeadFormStatus(
        id: number,
        businessId: number,
        isActive: boolean,
    ): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id, businessId);
            form.isActive = isActive;
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error updating lead form status: ${error.message}`,
                error,
            );
        }
    }

    async getActiveLeadForms(businessId: number): Promise<LeadForm[]> {
        try {
            return await this.leadFormRepo.find({
                where: { businessId, isActive: true },
                relations: ['leads'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(
                `Error fetching active lead forms: ${error.message}`,
                error,
            );
        }
    }

    // ==================== LEADS CRUD OPERATIONS ====================

    async createLead(formId: number, dto: CreateLeadDto): Promise<Leads> {
        try {
            if (!dto.email) {
                ErrorHelper.BadRequestException('Email is required');
            }

            const form = await this.leadFormRepo.findOne({
                where: { id: formId },
                relations: ['business'],
            });

            if (!form) {
                ErrorHelper.NotFoundException(`Lead form with ID ${formId} not found`);
            }

            if (!form.isActive) {
                ErrorHelper.BadRequestException('This lead form is currently inactive');
            }

            const lead = this.leadsRepo.create({
                ...dto,
                formId,
                businessId: form.businessId,
            });

            return await this.leadsRepo.save(lead);
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            )
                throw error;
            ErrorHelper.InternalServerErrorException(
                `Error creating lead: ${error.message}`,
                error,
            );
        }
    }

    async getLeadsByBusinessId(businessId: number): Promise<Leads[]> {
        try {
            return await this.leadsRepo.find({
                where: { businessId },
                relations: ['form', 'business'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(
                `Error fetching leads: ${error.message}`,
                error,
            );
        }
    }

    async getLeadById(id: number, businessId: number): Promise<Leads> {
        try {
            const lead = await this.leadsRepo.findOne({
                where: { id, businessId },
                relations: ['form', 'business'],
            });

            if (!lead) {
                ErrorHelper.NotFoundException(`Lead with ID ${id} not found`);
            }

            return lead;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error fetching lead: ${error.message}`,
                error,
            );
        }
    }

    async getLeadsByFormId(formId: number, businessId: number): Promise<Leads[]> {
        try {
            await this.getLeadFormById(formId, businessId);
            return await this.leadsRepo.find({
                where: { formId, businessId },
                relations: ['form'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error fetching leads: ${error.message}`,
                error,
            );
        }
    }

    async updateLead(
        id: number,
        businessId: number,
        dto: UpdateLeadDto,
    ): Promise<Leads> {
        try {
            const lead = await this.getLeadById(id, businessId);
            Object.assign(lead, dto);
            return await this.leadsRepo.save(lead);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error updating lead: ${error.message}`,
                error,
            );
        }
    }

    async deleteLead(
        id: number,
        businessId: number,
    ): Promise<{ success: boolean; message: string }> {
        try {
            const lead = await this.getLeadById(id, businessId);
            await this.leadsRepo.remove(lead);
            return {
                success: true,
                message: `Lead with ID ${id} deleted successfully`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error deleting lead: ${error.message}`,
                error,
            );
        }
    }

    async getLeadCountByBusinessId(businessId: number): Promise<number> {
        try {
            return await this.leadsRepo.count({ where: { businessId } });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(
                `Error counting leads: ${error.message}`,
                error,
            );
        }
    }

    async getLeadCountByFormId(formId: number, businessId: number): Promise<number> {
        try {
            await this.getLeadFormById(formId, businessId);
            return await this.leadsRepo.count({ where: { formId, businessId } });
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error counting leads: ${error.message}`,
                error,
            );
        }
    }

    async getLeadsByEmail(email: string, businessId: number): Promise<Leads[]> {
        try {
            return await this.leadsRepo.find({
                where: { email, businessId },
                relations: ['form'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(
                `Error fetching leads by email: ${error.message}`,
                error,
            );
        }
    }

    async deleteLeadsByFormId(
        formId: number,
        businessId: number,
    ): Promise<{ success: boolean; message: string; deletedCount: number }> {
        try {
            await this.getLeadFormById(formId, businessId);
            const result = await this.leadsRepo.delete({ formId, businessId });
            return {
                success: true,
                message: `All leads for form ${formId} deleted successfully`,
                deletedCount: result.affected || 0,
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error deleting leads: ${error.message}`,
                error,
            );
        }
    }

    async getFormByPublicId(publicId: string): Promise<LeadForm> {
        try {
            const form = await this.leadFormRepo.findOne({
                where: { publicId },
                relations: ['business', 'leads'],
            });

            if (!form) {
                ErrorHelper.NotFoundException(`Form not found`);
            }

            return form;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(
                `Error fetching form: ${error.message}`,
                error,
            );
        }
    }

    async createPublicLead(
        publicId: string,
        dto: CreateLeadDto,
        trackingData: {
            ipAddress: string;
            userAgent: string;
            referrer: string | string[];
            deviceType: string;
            browser: string;
            operatingSystem: string;
        },
        utmParameters: any,
    ): Promise<Leads> {
        try {
            if (!dto.email) {
                ErrorHelper.BadRequestException('Email is required');
            }

            const form = await this.getFormByPublicId(publicId);

            if (!form.isActive) {
                ErrorHelper.BadRequestException('This form is currently inactive');
            }

            if (!form.canAcceptSubmissions()) {
                ErrorHelper.BadRequestException('This form has reached its submission limit');
            }

            // this.validateFormInputs(dto, form.inputs);

            const lead = this.leadsRepo.create({
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                formResponses: dto.formResponses,
                formId: form.id,
                businessId: form.businessId,
                ipAddress: trackingData.ipAddress,
                userAgent: trackingData.userAgent,
                referrer: Array.isArray(trackingData.referrer)
                    ? trackingData.referrer[0]
                    : trackingData.referrer,
                deviceType: trackingData.deviceType,
                browser: trackingData.browser,
                operatingSystem: trackingData.operatingSystem,
                utmParameters,
                status: 'new',
                isContacted: false,
            });

            const savedLead = await this.leadsRepo.save(lead);

            await this.leadFormRepo.increment({ id: form.id }, 'submissionCount', 1);

            if (form.sendEmailNotification) {
                await this.sendLeadNotification(form, savedLead);
            }

            savedLead.form = form;
            return savedLead;
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(
                `Error creating lead: ${error.message}`,
                error,
            );
        }
    }

    private validateFormInputs(dto: CreateLeadDto, inputs: any[]): void {
        const requiredFields = inputs.filter((input) => input.required).map((input) => input.type);

        for (const field of requiredFields) {
            if (field === 'email' && !dto.email) {
                ErrorHelper.BadRequestException(`${field} is required`);
            }
            if (field === 'name' && !dto.name) {
                ErrorHelper.BadRequestException(`${field} is required`);
            }
            if (field === 'phone' && !dto.phone) {
                ErrorHelper.BadRequestException(`${field} is required`);
            }
            if (!['email', 'name', 'phone'].includes(field)) {
                if (!dto.formResponses || !dto.formResponses[field]) {
                    ErrorHelper.BadRequestException(`${field} is required`);
                }
            }
        }
    }

    private async sendLeadNotification(form: LeadForm, lead: Leads): Promise<void> {
        try {
            // TODO: Implement Notification both mail and App
        } catch (error) {
            console.error('Failed to send lead notification:', error);
        }
    }

    async getLeadStatistics(businessId: number): Promise<any> {
        try {
            const totalLeads = await this.leadsRepo.count({ where: { businessId } });
            const newLeads = await this.leadsRepo.count({
                where: { businessId, status: 'new' },
            });
            const contactedLeads = await this.leadsRepo.count({
                where: { businessId, isContacted: true },
            });

            const leadsBySource = await this.leadsRepo
                .createQueryBuilder('lead')
                .select('lead.referrer', 'source')
                .addSelect('COUNT(*)', 'count')
                .where('lead.businessId = :businessId', { businessId })
                .groupBy('lead.referrer')
                .getRawMany();

            const leadsByDevice = await this.leadsRepo
                .createQueryBuilder('lead')
                .select('lead.deviceType', 'device')
                .addSelect('COUNT(*)', 'count')
                .where('lead.businessId = :businessId', { businessId })
                .groupBy('lead.deviceType')
                .getRawMany();

            return {
                totalLeads,
                newLeads,
                contactedLeads,
                conversionRate: totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0,
                leadsBySource,
                leadsByDevice,
            };
        } catch (error) {
            ErrorHelper.InternalServerErrorException(
                `Error fetching statistics: ${error.message}`,
                error,
            );
        }
    }
}