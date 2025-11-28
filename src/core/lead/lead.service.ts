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
        @InjectRepository(Business)
        private readonly businessRepository: Repository<Business>
    ) { }

    /**
     * Create a new lead form
     * @param dto - CreateLeadFormDto containing form details
     * @returns Promise<LeadForm> - The created lead form
     */
    async createLeadForm(dto: CreateLeadFormDto, userId: number): Promise<LeadForm> {
        try {
         
            if (!dto.title || !dto.buttonText || !dto.inputs || dto.inputs.length === 0) {
                ErrorHelper.BadRequestException('Title, buttonText, and at least one input field are required');
            }

            // Fetch the user's business dynamically
            const business = await this.businessRepository.findOne({ where: { userId } });

            if (!business) {
            throw ErrorHelper.BadRequestException(
                'User must have a business to create lead forms'
            );
            }

            const form = this.leadFormRepo.create({
                ...dto,
                businessId: business.id,
                createdBy: userId,
                isActive: dto.isActive ?? true,
            });

     

            return await this.leadFormRepo.save(form);
        } catch (error) {
        
            if (error instanceof BadRequestException) throw error;
            ErrorHelper.InternalServerErrorException(`Error creating lead form: ${error.message}`, error);
        }
    }
    /**
     * Get all lead forms
     * @returns Promise<LeadForm[]> - Array of all lead forms
     */
    async getAllLeadForms(): Promise<LeadForm[]> {
        try {
            return await this.leadFormRepo.find({
                relations: ['leads'],
                order: {
                    createdAt: 'DESC',
                },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error fetching lead forms: ${error.message}`, error);
        }
    }


    /**
       * Get all lead forms for a specific business
       */
    async getLeadFormsByBusinessId(businessId: number): Promise<LeadForm[]> {
        try {
            return await this.leadFormRepo.find({
                where: { businessId },
                relations: ['leads', 'creator', 'business'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error fetching lead forms: ${error.message}`, error);
        }
    }

    /**
     * Get a specific lead form by ID
     * @param id - The ID of the lead form
     * @returns Promise<LeadForm> - The lead form details
     */

    async getLeadFormById(id: number, businessId?: number): Promise<LeadForm> {
        try {
            const whereClause: any = { id };
            if (businessId) whereClause.businessId = businessId;

            const form = await this.leadFormRepo.findOne({
                where: whereClause,
                relations: ['leads', 'creator', 'business'],
            });

            if (!form) {
                ErrorHelper.NotFoundException(`Lead form with ID ${id} not found`);
            }

            return form;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(`Error fetching lead form: ${error.message}`, error);
        }
    }


    /**
     * Update a lead form
     * @param id - The ID of the lead form to update
     * @param dto - UpdateLeadFormDto containing fields to update
     * @returns Promise<LeadForm> - The updated lead form
     */
    async updateLeadForm(id: number, dto: UpdateLeadFormDto, businessId: number): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id, businessId);

            if (form.businessId !== businessId) {
                ErrorHelper.ForbiddenException('You do not have permission to update this lead form');
            }

            Object.assign(form, dto);
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
            ErrorHelper.InternalServerErrorException(`Error updating lead form: ${error.message}`, error);
        }
    }





    /**
     * Delete a lead form
     * @param id - The ID of the lead form to delete
     * @returns Promise<{ success: boolean; message: string }>
     */
    async deleteLeadForm(id: number, businessId: number): Promise<{ success: boolean; message: string }> {
        try {
            const form = await this.getLeadFormById(id, businessId);

            if (form.businessId !== businessId) {
                ErrorHelper.ForbiddenException('You do not have permission to delete this lead form');
            }

            await this.leadFormRepo.remove(form);
            return {
                success: true,
                message: `Lead form with ID ${id} deleted successfully`,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
            ErrorHelper.InternalServerErrorException(`Error deleting lead form: ${error.message}`, error);
        }
    }




    /**
     * Activate/Deactivate lead form
     * @param id - The ID of the lead form to activate
     * @returns Promise<LeadForm> - The updated lead form
     */
    async toggleLeadFormStatus(id: number, businessId: number, isActive: boolean): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id, businessId);

            if (form.businessId !== businessId) {
                ErrorHelper.ForbiddenException('You do not have permission to modify this lead form');
            }

            form.isActive = isActive;
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
            ErrorHelper.InternalServerErrorException(`Error updating lead form status: ${error.message}`, error);
        }
    }


    /**
     * Get active lead forms only
     * @returns Promise<LeadForm[]> - Array of active lead forms
     */
    async getActiveLeadForms(businessId: number): Promise<LeadForm[]> {
        try {
            return await this.leadFormRepo.find({
                where: { businessId, isActive: true },
                relations: ['leads'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error fetching active lead forms: ${error.message}`, error);
        }
    }

    // ==================== LEADS CRUD OPERATIONS ====================

    /**
     * Create a new lead
     * @param dto - CreateLeadDto containing lead details
     * @returns Promise<Leads> - The created lead
     */
    async createLead(formId: number, dto: CreateLeadDto): Promise<Leads> {
        try {
            if (!dto.email) {
                ErrorHelper.BadRequestException('Email is required');
            }

            // Get the form and verify it's active
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
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            ErrorHelper.InternalServerErrorException(`Error creating lead: ${error.message}`, error);
        }
    }

    /**
     * Get all leads
     * @returns Promise<Leads[]> - Array of all leads
     */
    async getLeadsByBusinessId(businessId: number): Promise<Leads[]> {
        try {
            return await this.leadsRepo.find({
                where: { businessId },
                relations: ['form', 'business'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error fetching leads: ${error.message}`, error);
        }
    }


    /**
     * Get a specific lead by ID
     */
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
            ErrorHelper.InternalServerErrorException(`Error fetching lead: ${error.message}`, error);
        }
    }


    /**
     * Get all leads for a specific form
     * @param formId - The ID of the lead form
     * @returns Promise<Leads[]> - Array of leads for the form
     */

    async getLeadsByFormId(formId: number, businessId: number): Promise<Leads[]> {
        try {
            // Verify form belongs to business
            await this.getLeadFormById(formId, businessId);

            return await this.leadsRepo.find({
                where: { formId, businessId },
                relations: ['form'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(`Error fetching leads: ${error.message}`, error);
        }
    }


    /**
     * Update a lead
     * @param id - The ID of the lead to update
     * @param dto - UpdateLeadDto containing fields to update
     * @returns Promise<Leads> - The updated lead
     */
    async updateLead(id: number, businessId: number, dto: UpdateLeadDto): Promise<Leads> {
        try {
            const lead = await this.getLeadById(id, businessId);
            Object.assign(lead, dto);
            return await this.leadsRepo.save(lead);
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(`Error updating lead: ${error.message}`, error);
        }
    }


    /**
     * Delete a lead
     * @param id - The ID of the lead to delete
     * @returns Promise<{ success: boolean; message: string }>
     */
    async deleteLead(id: number, businessId: number): Promise<{ success: boolean; message: string }> {
        try {
            const lead = await this.getLeadById(id, businessId);
            await this.leadsRepo.remove(lead);
            return {
                success: true,
                message: `Lead with ID ${id} deleted successfully`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(`Error deleting lead: ${error.message}`, error);
        }
    }


    /**
     * Get lead count for a specific form
     * @param formId - The ID of the lead form
     * @returns Promise<number> - The count of leads for the form
     */
    async getLeadCountByBusinessId(businessId: number): Promise<number> {
        try {
            return await this.leadsRepo.count({ where: { businessId } });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error counting leads: ${error.message}`, error);
        }
    }

    /**
 * Get lead count for a specific form
 */
    async getLeadCountByFormId(formId: number, businessId: number): Promise<number> {
        try {
            await this.getLeadFormById(formId, businessId);
            return await this.leadsRepo.count({ where: { formId, businessId } });
        } catch (error) {
       
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(`Error counting leads: ${error.message}`, error);
        }
    }


    /**
     * Get leads by email
     * @param email - The email to search for
     * @returns Promise<Leads[]> - Array of leads matching the email
     */
    async getLeadsByEmail(email: string, businessId: number): Promise<Leads[]> {
        try {
            return await this.leadsRepo.find({
                where: { email, businessId },
                relations: ['form'],
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error fetching leads by email: ${error.message}`, error);
        }
    }


    /**
     * Delete all leads for a specific form
     * @param formId - The ID of the lead form
     * @returns Promise<{ success: boolean; message: string; deletedCount: number }>
     */
    async deleteLeadsByFormId(formId: number, businessId: number): Promise<{ success: boolean; message: string; deletedCount: number }> {
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
            ErrorHelper.InternalServerErrorException(`Error deleting leads: ${error.message}`, error);
        }
    }





    /**
     * Get form by public ID (for public access)
     */
    async getFormByPublicId(publicId: string): Promise<LeadForm> {
        try {
            const form = await this.leadFormRepo.findOne({
                where: { publicId },
                relations: ['business','leads'],
            });

          

            if (!form) {
                ErrorHelper.NotFoundException(`Form not found`);
            }

            return form;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            ErrorHelper.InternalServerErrorException(`Error fetching form: ${error.message}`, error);
        }
    }





    /**
 * Create a lead from public submission with full tracking
 */
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

            this.validateFormInputs(dto, form.inputs);


            // Create the lead with all tracking data
            const lead = this.leadsRepo.create({
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                formResponses: dto.formResponses,
                formId: form.id,
                businessId: form.businessId,
                // Tracking data
                ipAddress: trackingData.ipAddress,
                userAgent: trackingData.userAgent,
                referrer: Array.isArray(trackingData.referrer) ? trackingData.referrer[0] : trackingData.referrer,
                deviceType: trackingData.deviceType,
                browser: trackingData.browser,
                operatingSystem: trackingData.operatingSystem,

                // UTM parameters
                utmParameters,

                // Initial status
                status: 'new',
                isContacted: false,
            });

    
            const savedLead = await this.leadsRepo.save(lead);

            // Increment submission count
            await this.leadFormRepo.increment(
                { id: form.id },
                'submissionCount',
                1
            );

            // Send notifications if enabled
            if (form.sendEmailNotification) {
                await this.sendLeadNotification(form, savedLead);
            }

            // Load the form relation for response
            savedLead.form = form;

            return savedLead;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error creating lead: ${error.message}`, error);
        }
    }



    /**
     * Validate form inputs match expected fields
     */
    private validateFormInputs(dto: CreateLeadDto, inputs: any[]): void {
        const requiredFields = inputs
            .filter(input => input.required)
            .map(input => input.type);

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
            // Check custom fields in formResponses
            if (!['email', 'name', 'phone'].includes(field)) {
                if (!dto.formResponses || !dto.formResponses[field]) {
                    ErrorHelper.BadRequestException(`${field} is required`);
                }
            }
        }
    }


    /**
     * Send email notification to business owner
     */
    private async sendLeadNotification(form: LeadForm, lead: Leads): Promise<void> {
        try {
            // TODO: Implement Notification both mail and App
        } catch (error) {
            // Log error but don't throw - notification failure shouldn't block lead creation
            console.error('Failed to send lead notification:', error);
        }
    }

    /**
     * Get lead statistics for a business
     */
    async getLeadStatistics(businessId: number): Promise<any> {
        try {
            const totalLeads = await this.leadsRepo.count({ where: { businessId } });
            const newLeads = await this.leadsRepo.count({
                where: { businessId, status: 'new' }
            });
            const contactedLeads = await this.leadsRepo.count({
                where: { businessId, isContacted: true }
            });

            // Get leads by source (referrer)
            const leadsBySource = await this.leadsRepo
                .createQueryBuilder('lead')
                .select('lead.referrer', 'source')
                .addSelect('COUNT(*)', 'count')
                .where('lead.businessId = :businessId', { businessId })
                .groupBy('lead.referrer')
                .getRawMany();

            // Get leads by device type
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
            ErrorHelper.InternalServerErrorException(`Error fetching statistics: ${error.message}`, error);
        }
    }
}