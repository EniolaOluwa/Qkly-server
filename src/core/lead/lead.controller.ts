import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiInternalServerErrorResponse,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadFormDto, UpdateLeadFormDto, LeadFormResponseDto, CreateLeadDto, UpdateLeadDto, LeadResponseDto } from './dto/lead.dto';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { JwtAuthGuard } from '../users';
import { Public } from '@app/common/decorators/public.decorator';


@ApiTags('Lead Forms')
@UseGuards(JwtAuthGuard)
@Controller('lead-forms')
export class LeadController {
    constructor(private readonly leadService: LeadService) {}

    /**
     * Create a new lead form
     */
    @Post()
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new lead form',
        description: 'Creates a new lead form with the provided title, description, button text, and input fields.',
    })
    @ApiCreatedResponse({
        description: 'Lead form created successfully',
        schema: {
            example: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Contact Us',
                description: 'Please fill out this form',
                buttonText: 'Submit',
                inputs: [
                    { type: 'email', placeholder: 'Enter your email' },
                    { type: 'phone', placeholder: 'Enter your phone number' },
                ],
                logoUrl: 'https://example.com/logo.png',
                isActive: true,
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2024-01-15T10:30:00Z',
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data',
        schema: {
            example: {
                statusCode: 400,
                message: 'Title, buttonText, and at least one input field are required',
                error: 'Bad Request',
            },
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async createLeadForm(@Body() dto: CreateLeadFormDto) {
        const data = await this.leadService.createLeadForm(dto);
        return HttpResponse.success({
            data,
            message: 'Lead form created successfully',
        });
    }

    /**
     * Get all lead forms
     */
    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Retrieve all lead forms',
        description: 'Fetches all lead forms with their associated leads, ordered by creation date (newest first).',
    })
    @ApiOkResponse({
        description: 'List of lead forms retrieved successfully',
        schema: {
            example: {
                data: [
                    {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        title: 'Contact Us',
                        description: 'Please fill out this form',
                        buttonText: 'Submit',
                        inputs: [
                            { type: 'email', placeholder: 'Enter your email' },
                        ],
                        logoUrl: 'https://example.com/logo.png',
                        isActive: true,
                        leads: [],
                        createdAt: '2024-01-15T10:30:00Z',
                        updatedAt: '2024-01-15T10:30:00Z',
                    },
                ],
                message: 'Lead forms retrieved successfully',
                statusCode: 200,
            },
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getAllLeadForms() {
        const data = await this.leadService.getAllLeadForms();
        return HttpResponse.success({
            data,
            message: 'Lead forms retrieved successfully',
        });
    }

    /**
     * Get active lead forms only
     */
    @Get('active')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Retrieve active lead forms only',
        description: 'Fetches all active lead forms with their associated leads.',
    })
    @ApiOkResponse({
        description: 'List of active lead forms retrieved successfully',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getActiveLeadForms() {
        const data = await this.leadService.getActiveLeadForms();
        return HttpResponse.success({
            data,
            message: 'Active lead forms retrieved successfully',
        });
    }

    /**
     * Get a specific lead form by ID
     */
    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Retrieve a lead form by ID',
        description: 'Fetches a specific lead form with all its details and associated leads.',
    })
    @ApiOkResponse({
        description: 'Lead form retrieved successfully',
        schema: {
            example: {
                data: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    title: 'Contact Us',
                    description: 'Please fill out this form',
                    buttonText: 'Submit',
                    inputs: [
                        { type: 'email', placeholder: 'Enter your email' },
                    ],
                    logoUrl: 'https://example.com/logo.png',
                    isActive: true,
                    leads: [],
                    createdAt: '2024-01-15T10:30:00Z',
                    updatedAt: '2024-01-15T10:30:00Z',
                },
                message: 'Lead form retrieved successfully',
                statusCode: 200,
            },
        },
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Lead form with ID 123e4567-e89b-12d3-a456-426614174000 not found',
                error: 'Not Found',
            },
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getLeadFormById(@Param('id') id: string) {
        const data = await this.leadService.getLeadFormById(id);
        return HttpResponse.success({
            data,
            message: 'Lead form retrieved successfully',
        });
    }

    /**
     * Update a lead form
     */
    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update a lead form',
        description: 'Updates specific fields of a lead form. All fields are optional.',
    })
    @ApiOkResponse({
        description: 'Lead form updated successfully',
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data',
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async updateLeadForm(@Param('id') id: string, @Body() dto: UpdateLeadFormDto) {
        const data = await this.leadService.updateLeadForm(id, dto);
        return HttpResponse.success({
            data,
            message: 'Lead form updated successfully',
        });
    }

    /**
     * Delete a lead form
     */
    @Delete(':id')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a lead form',
        description: 'Permanently deletes a lead form and all its associated leads (if cascade is enabled).',
    })
    @ApiOkResponse({
        description: 'Lead form deleted successfully',
        schema: {
            example: {
                data: {
                    success: true,
                    message: 'Lead form with ID 123e4567-e89b-12d3-a456-426614174000 deleted successfully',
                },
                message: 'Lead form deleted successfully',
                statusCode: 200,
            },
        },
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async deleteLeadForm(@Param('id') id: string) {
        const data = await this.leadService.deleteLeadForm(id);
        return HttpResponse.success({
            data,
            message: 'Lead form deleted successfully',
        });
    }

    /**
     * Activate a lead form
     */
    @Patch(':id/activate')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Activate a lead form',
        description: 'Sets the lead form status to active, making it available for collecting leads.',
    })
    @ApiOkResponse({
        description: 'Lead form activated successfully',
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async activateLeadForm(@Param('id') id: string) {
        const data = await this.leadService.activateLeadForm(id);
        return HttpResponse.success({
            data,
            message: 'Lead form activated successfully',
        });
    }

    /**
     * Deactivate a lead form
     */
    @Patch(':id/deactivate')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Deactivate a lead form',
        description: 'Sets the lead form status to inactive, preventing it from collecting new leads.',
    })
    @ApiOkResponse({
        description: 'Lead form deactivated successfully',
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async deactivateLeadForm(@Param('id') id: string) {
        const data = await this.leadService.deactivateLeadForm(id);
        return HttpResponse.success({
            data,
            message: 'Lead form deactivated successfully',
        });
    }

    // ==================== LEADS ENDPOINTS ====================

    /**
     * Create a new lead
     */
    @Public()
    @Post(':formId/leads')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new lead',
        description: 'Creates a new lead for a specific lead form with email and optional name and phone.',
    })
    @ApiCreatedResponse({
        description: 'Lead created successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: 1,
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '+234812345678',
                    formId: '123e4567-e89b-12d3-a456-426614174000',
                    createdAt: '2024-01-15T10:30:00Z',
                },
                message: 'Lead created successfully',
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data',
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async createLead(
        @Param('formId') formId: string,
        @Body() dto: CreateLeadDto,
    ) {
        // Override formId from URL parameter
        dto.formId = formId;
        const data = await this.leadService.createLead(dto);
        return HttpResponse.success({
            data,
            message: 'Lead created successfully',
        });
    }

    /**
     * Get all leads for a specific form
     */
    @Get(':formId/leads')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all leads for a specific form',
        description: 'Retrieves all leads associated with a specific lead form.',
    })
    @ApiOkResponse({
        description: 'Leads retrieved successfully',
        schema: {
            example: {
                success: true,
                data: [
                    {
                        id: 1,
                        name: 'John Doe',
                        email: 'john@example.com',
                        phone: '+234812345678',
                        formId: '123e4567-e89b-12d3-a456-426614174000',
                        createdAt: '2024-01-15T10:30:00Z',
                    },
                ],
                message: 'Leads retrieved successfully',
            },
        },
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getLeadsByFormId(@Param('formId') formId: string) {
        const data = await this.leadService.getLeadsByFormId(formId);
        return HttpResponse.success({
            data,
            message: 'Leads retrieved successfully',
        });
    }

    /**
     * Get lead count for a specific form
     */
    @Get(':formId/leads/count')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get lead count for a specific form',
        description: 'Returns the total count of leads for a specific form.',
    })
    @ApiOkResponse({
        description: 'Lead count retrieved successfully',
        schema: {
            example: {
                success: true,
                data: { count: 10 },
                message: 'Lead count retrieved successfully',
            },
        },
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getLeadCountByFormId(@Param('formId') formId: string) {
        const count = await this.leadService.getLeadCountByFormId(formId);
        return HttpResponse.success({
            data: { count },
            message: 'Lead count retrieved successfully',
        });
    }

    /**
     * Delete all leads for a specific form
     */
    @Delete(':formId/leads')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete all leads for a specific form',
        description: 'Permanently deletes all leads associated with a specific form.',
    })
    @ApiOkResponse({
        description: 'All leads deleted successfully',
        schema: {
            example: {
                success: true,
                data: {
                    success: true,
                    message: 'All leads for form deleted successfully',
                    deletedCount: 5,
                },
                message: 'All leads deleted successfully',
            },
        },
    })
    @ApiNotFoundResponse({
        description: 'Lead form not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async deleteLeadsByFormId(@Param('formId') formId: string) {
        const data = await this.leadService.deleteLeadsByFormId(formId);
        return HttpResponse.success({
            data,
            message: 'All leads deleted successfully',
        });
    }

    /**
     * Get all leads (global)
     */
    @Get('leads')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all leads (global)',
        description: 'Retrieves all leads from all forms.',
    })
    @ApiOkResponse({
        description: 'All leads retrieved successfully',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getAllLeads() {
        const data = await this.leadService.getAllLeads();
        return HttpResponse.success({
            data,
            message: 'All leads retrieved successfully',
        });
    }

    /**
     * Get a specific lead by ID
     */
    @Get('leads/:leadId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get a specific lead by ID',
        description: 'Retrieves details of a specific lead.',
    })
    @ApiOkResponse({
        description: 'Lead retrieved successfully',
    })
    @ApiNotFoundResponse({
        description: 'Lead not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getLeadById(@Param('leadId') leadId: string) {
        const data = await this.leadService.getLeadById(Number(leadId));
        return HttpResponse.success({
            data,
            message: 'Lead retrieved successfully',
        });
    }

    /**
     * Get leads by email
     */
    @Get('leads/search/:email')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get leads by email',
        description: 'Searches for leads by email address.',
    })
    @ApiOkResponse({
        description: 'Leads retrieved successfully',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async getLeadsByEmail(@Param('email') email: string) {
        const data = await this.leadService.getLeadsByEmail(email);
        return HttpResponse.success({
            data,
            message: 'Leads retrieved successfully',
        });
    }

    /**
     * Update a lead
     */
    @Patch('leads/:leadId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update a lead',
        description: 'Updates specific fields of a lead. All fields are optional.',
    })
    @ApiOkResponse({
        description: 'Lead updated successfully',
    })
    @ApiBadRequestResponse({
        description: 'Invalid input data',
    })
    @ApiNotFoundResponse({
        description: 'Lead not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async updateLead(
        @Param('leadId') leadId: string,
        @Body() dto: UpdateLeadDto,
    ) {
        const data = await this.leadService.updateLead(Number(leadId), dto);
        return HttpResponse.success({
            data,
            message: 'Lead updated successfully',
        });
    }

    /**
     * Delete a lead
     */
    @Delete('leads/:leadId')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a lead',
        description: 'Permanently deletes a specific lead.',
    })
    @ApiOkResponse({
        description: 'Lead deleted successfully',
        schema: {
            example: {
                success: true,
                data: {
                    success: true,
                    message: 'Lead with ID 1 deleted successfully',
                },
                message: 'Lead deleted successfully',
            },
        },
    })
    @ApiNotFoundResponse({
        description: 'Lead not found',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error occurred',
    })
    async deleteLead(@Param('leadId') leadId: string) {
        const data = await this.leadService.deleteLead(Number(leadId));
        return HttpResponse.success({
            data,
            message: 'Lead deleted successfully',
        });
    }
}