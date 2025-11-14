import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadForm } from './entity/leadForm.entity';
import { Leads } from './entity/leads.entity';
import { ErrorHelper } from '../../common/utils';
import { CreateLeadFormDto, UpdateLeadFormDto, LeadFormResponseDto, CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';

@Injectable()
export class LeadService {
    constructor(
        @InjectRepository(LeadForm)
        private readonly leadFormRepo: Repository<LeadForm>,
        @InjectRepository(Leads)
        private readonly leadsRepo: Repository<Leads>
    ) {}

    /**
     * Create a new lead form
     * @param dto - CreateLeadFormDto containing form details
     * @returns Promise<LeadForm> - The created lead form
     */
    async createLeadForm(dto: CreateLeadFormDto): Promise<LeadForm> {
        try {
            if (!dto.title || !dto.buttonText || !dto.inputs || dto.inputs.length === 0) {
                throw new BadRequestException('Title, buttonText, and at least one input field are required');
            }

            const form = this.leadFormRepo.create({
                ...dto,
                isActive: dto.isActive ?? true,
            });
            return await this.leadFormRepo.save(form);
        } catch (error) {
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
     * Get a specific lead form by ID
     * @param id - The ID of the lead form
     * @returns Promise<LeadForm> - The lead form details
     */
    async getLeadFormById(id: string): Promise<LeadForm> {
        try {
            const form = await this.leadFormRepo.findOne({
                where: { id },
                relations: ['leads'],
            });

            if (!form) {
                throw new NotFoundException(`Lead form with ID ${id} not found`);
            }

            return form;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error fetching lead form: ${error.message}`, error);
        }
    }

    /**
     * Update a lead form
     * @param id - The ID of the lead form to update
     * @param dto - UpdateLeadFormDto containing fields to update
     * @returns Promise<LeadForm> - The updated lead form
     */
    async updateLeadForm(id: string, dto: UpdateLeadFormDto): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id);

            if (!form) {
                throw new NotFoundException(`Lead form with ID ${id} not found`);
            }

            Object.assign(form, dto);
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error updating lead form: ${error.message}`, error);
        }
    }

    /**
     * Delete a lead form
     * @param id - The ID of the lead form to delete
     * @returns Promise<{ success: boolean; message: string }>
     */
    async deleteLeadForm(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const form = await this.getLeadFormById(id);

            if (!form) {
                throw new NotFoundException(`Lead form with ID ${id} not found`);
            }

            await this.leadFormRepo.remove(form);
            return {
                success: true,
                message: `Lead form with ID ${id} deleted successfully`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error deleting lead form: ${error.message}`, error);
        }
    }

    /**
     * Activate a lead form
     * @param id - The ID of the lead form to activate
     * @returns Promise<LeadForm> - The updated lead form
     */
    async activateLeadForm(id: string): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id);

            form.isActive = true;
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error activating lead form: ${error.message}`, error);
        }
    }

    /**
     * Deactivate a lead form
     * @param id - The ID of the lead form to deactivate
     * @returns Promise<LeadForm> - The updated lead form
     */
    async deactivateLeadForm(id: string): Promise<LeadForm> {
        try {
            const form = await this.getLeadFormById(id);

            form.isActive = false;
            return await this.leadFormRepo.save(form);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error deactivating lead form: ${error.message}`, error);
        }
    }

    /**
     * Get active lead forms only
     * @returns Promise<LeadForm[]> - Array of active lead forms
     */
    async getActiveLeadForms(): Promise<LeadForm[]> {
        try {
            return await this.leadFormRepo.find({
                where: { isActive: true },
                relations: ['leads'],
                order: {
                    createdAt: 'DESC',
                },
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
    async createLead(dto: CreateLeadDto): Promise<Leads> {
        try {
            if (!dto.email || !dto.formId) {
                throw new BadRequestException('Email and formId are required');
            }

            // Verify that the form exists
            const form = await this.getLeadFormById(dto.formId);
            if (!form) {
                throw new NotFoundException(`Lead form with ID ${dto.formId} not found`);
            }

            const lead = this.leadsRepo.create({
                ...dto,
            });
            return await this.leadsRepo.save(lead);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error creating lead: ${error.message}`, error);
        }
    }

    /**
     * Get all leads
     * @returns Promise<Leads[]> - Array of all leads
     */
    async getAllLeads(): Promise<Leads[]> {
        try {
            return await this.leadsRepo.find({
                relations: ['form'],
                order: {
                    createdAt: 'DESC',
                },
            });
        } catch (error) {
            ErrorHelper.InternalServerErrorException(`Error fetching leads: ${error.message}`, error);
        }
    }

    /**
     * Get a specific lead by ID
     * @param id - The ID of the lead
     * @returns Promise<Leads> - The lead details
     */
    async getLeadById(id: number): Promise<Leads> {
        try {
            const lead = await this.leadsRepo.findOne({
                where: { id },
                relations: ['form'],
            });

            if (!lead) {
                throw new NotFoundException(`Lead with ID ${id} not found`);
            }

            return lead;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error fetching lead: ${error.message}`, error);
        }
    }

    /**
     * Get all leads for a specific form
     * @param formId - The ID of the lead form
     * @returns Promise<Leads[]> - Array of leads for the form
     */
    async getLeadsByFormId(formId: string): Promise<Leads[]> {
        try {
            // Verify that the form exists
            await this.getLeadFormById(formId);

            return await this.leadsRepo.find({
                where: { formId },
                relations: ['form'],
                order: {
                    createdAt: 'DESC',
                },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error fetching leads for form: ${error.message}`, error);
        }
    }

    /**
     * Update a lead
     * @param id - The ID of the lead to update
     * @param dto - UpdateLeadDto containing fields to update
     * @returns Promise<Leads> - The updated lead
     */
    async updateLead(id: number, dto: UpdateLeadDto): Promise<Leads> {
        try {
            const lead = await this.getLeadById(id);

            if (!lead) {
                throw new NotFoundException(`Lead with ID ${id} not found`);
            }

            // If formId is being updated, verify the form exists
            if (dto.formId && dto.formId !== lead.formId) {
                await this.getLeadFormById(dto.formId);
            }

            Object.assign(lead, dto);
            return await this.leadsRepo.save(lead);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error updating lead: ${error.message}`, error);
        }
    }

    /**
     * Delete a lead
     * @param id - The ID of the lead to delete
     * @returns Promise<{ success: boolean; message: string }>
     */
    async deleteLead(id: number): Promise<{ success: boolean; message: string }> {
        try {
            const lead = await this.getLeadById(id);

            if (!lead) {
                throw new NotFoundException(`Lead with ID ${id} not found`);
            }

            await this.leadsRepo.remove(lead);
            return {
                success: true,
                message: `Lead with ID ${id} deleted successfully`,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error deleting lead: ${error.message}`, error);
        }
    }

    /**
     * Get lead count for a specific form
     * @param formId - The ID of the lead form
     * @returns Promise<number> - The count of leads for the form
     */
    async getLeadCountByFormId(formId: string): Promise<number> {
        try {
            // Verify that the form exists
            await this.getLeadFormById(formId);

            return await this.leadsRepo.count({
                where: { formId },
            });
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error counting leads: ${error.message}`, error);
        }
    }

    /**
     * Get leads by email
     * @param email - The email to search for
     * @returns Promise<Leads[]> - Array of leads matching the email
     */
    async getLeadsByEmail(email: string): Promise<Leads[]> {
        try {
            return await this.leadsRepo.find({
                where: { email },
                relations: ['form'],
                order: {
                    createdAt: 'DESC',
                },
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
    async deleteLeadsByFormId(formId: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
        try {
            // Verify that the form exists
            await this.getLeadFormById(formId);

            const result = await this.leadsRepo.delete({ formId });

            return {
                success: true,
                message: `All leads for form ${formId} deleted successfully`,
                deletedCount: result.affected || 0,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            ErrorHelper.InternalServerErrorException(`Error deleting leads: ${error.message}`, error);
        }
    }
}