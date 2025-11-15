import { Public } from '@app/common/decorators/public.decorator';
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { JwtAuthGuard } from '../users';
import { CreateLeadDto, CreateLeadFormDto, UpdateLeadDto, UpdateLeadFormDto } from './dto/lead.dto';
import { LeadService } from './lead.service';

@ApiTags('Lead Forms')
@Controller('lead-forms')
export class LeadController {
    constructor(private readonly leadService: LeadService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new lead form for your business',
        description: 'Creates a new lead form associated with the authenticated user\'s business.',
    })
    @ApiCreatedResponse({ description: 'Lead form created successfully' })
    @ApiBadRequestResponse({ description: 'Invalid input data' })
    async createLeadForm(@Body() dto: CreateLeadFormDto, @Request() req) {
        const userId = req.user.id;
        const businessId = req.user.businessId;

        if (!businessId) {
            throw new BadRequestException('User must have a business to create lead forms');
        }

        const data = await this.leadService.createLeadForm(dto, userId, businessId);
        return HttpResponse.success({
            data,
            message: 'Lead form created successfully',
        });
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all lead forms for your business',
        description: 'Fetches all lead forms belonging to the authenticated user\'s business.',
    })
    @ApiOkResponse({ description: 'Lead forms retrieved successfully' })
    async getAllLeadForms(@Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getLeadFormsByBusinessId(businessId);
        return HttpResponse.success({
            data,
            message: 'Lead forms retrieved successfully',
        });
    }

    @Get('active')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get active lead forms for your business',
        description: 'Fetches all active lead forms belonging to the authenticated user\'s business.',
    })
    @ApiOkResponse({ description: 'Active lead forms retrieved successfully' })
    async getActiveLeadForms(@Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getActiveLeadForms(businessId);
        return HttpResponse.success({
            data,
            message: 'Active lead forms retrieved successfully',
        });
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get a specific lead form',
        description: 'Fetches a specific lead form belonging to your business.',
    })
    @ApiOkResponse({ description: 'Lead form retrieved successfully' })
    @ApiNotFoundResponse({ description: 'Lead form not found' })
    async getLeadFormById(@Param('id') id: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getLeadFormById(Number(id), businessId);
        return HttpResponse.success({
            data,
            message: 'Lead form retrieved successfully',
        });
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update a lead form',
        description: 'Updates a lead form belonging to your business.',
    })
    @ApiOkResponse({ description: 'Lead form updated successfully' })
    @ApiBadRequestResponse({ description: 'Invalid input data' })
    @ApiNotFoundResponse({ description: 'Lead form not found' })
    async updateLeadForm(
        @Param('id') id: string,
        @Body() dto: UpdateLeadFormDto,
        @Request() req
    ) {
        const businessId = req.user.businessId;
        const data = await this.leadService.updateLeadForm(Number(id), dto, businessId);
        return HttpResponse.success({
            data,
            message: 'Lead form updated successfully',
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a lead form',
        description: 'Permanently deletes a lead form and all its associated leads.',
    })
    @ApiOkResponse({ description: 'Lead form deleted successfully' })
    @ApiNotFoundResponse({ description: 'Lead form not found' })
    async deleteLeadForm(@Param('id') id: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.deleteLeadForm(Number(id), businessId);
        return HttpResponse.success({
            data,
            message: 'Lead form deleted successfully',
        });
    }

    @Patch(':id/activate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Activate a lead form',
        description: 'Makes a lead form active and available for collecting leads.',
    })
    @ApiOkResponse({ description: 'Lead form activated successfully' })
    async activateLeadForm(@Param('id') id: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.toggleLeadFormStatus(Number(id), businessId, true);
        return HttpResponse.success({
            data,
            message: 'Lead form activated successfully',
        });
    }

    @Patch(':id/deactivate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Deactivate a lead form',
        description: 'Makes a lead form inactive and stops it from collecting new leads.',
    })
    @ApiOkResponse({ description: 'Lead form deactivated successfully' })
    async deactivateLeadForm(@Param('id') id: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.toggleLeadFormStatus(Number(id), businessId, false);
        return HttpResponse.success({
            data,
            message: 'Lead form deactivated successfully',
        });
    }


    @Get(':formId/leads')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all leads for a specific form',
        description: 'Retrieves all leads for a form belonging to your business.',
    })
    @ApiOkResponse({ description: 'Leads retrieved successfully' })
    async getLeadsByFormId(@Param('formId') formId: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getLeadsByFormId(Number(formId), businessId);
        return HttpResponse.success({
            data,
            message: 'Leads retrieved successfully',
        });
    }

    @Get(':formId/leads/count')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get lead count for a specific form',
        description: 'Returns the total count of leads for a specific form.',
    })
    @ApiOkResponse({ description: 'Lead count retrieved successfully' })
    async getLeadCountByFormId(@Param('formId') formId: string, @Request() req) {
        const businessId = req.user.businessId;
        const count = await this.leadService.getLeadCountByFormId(Number(formId), businessId);
        return HttpResponse.success({
            data: { count },
            message: 'Lead count retrieved successfully',
        });
    }

    @Delete(':formId/leads')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete all leads for a specific form',
        description: 'Permanently deletes all leads for a form.',
    })
    @ApiOkResponse({ description: 'All leads deleted successfully' })
    async deleteLeadsByFormId(@Param('formId') formId: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.deleteLeadsByFormId(Number(formId), businessId);
        return HttpResponse.success({
            data,
            message: 'All leads deleted successfully',
        });
    }

    @Get('business/leads')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all leads for your business',
        description: 'Retrieves all leads across all forms for your business.',
    })
    @ApiOkResponse({ description: 'All leads retrieved successfully' })
    async getAllLeadsForBusiness(@Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getLeadsByBusinessId(businessId);
        return HttpResponse.success({
            data,
            message: 'All leads retrieved successfully',
        });
    }

    @Get('business/leads/count')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get total lead count for your business',
        description: 'Returns the total count of leads across all forms.',
    })
    @ApiOkResponse({ description: 'Lead count retrieved successfully' })
    async getBusinessLeadCount(@Request() req) {
        const businessId = req.user.businessId;
        const count = await this.leadService.getLeadCountByBusinessId(businessId);
        return HttpResponse.success({
            data: { count },
            message: 'Lead count retrieved successfully',
        });
    }

    @Get('leads/:leadId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get a specific lead',
        description: 'Retrieves details of a specific lead belonging to your business.',
    })
    @ApiOkResponse({ description: 'Lead retrieved successfully' })
    @ApiNotFoundResponse({ description: 'Lead not found' })
    async getLeadById(@Param('leadId') leadId: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getLeadById(Number(leadId), businessId);
        return HttpResponse.success({
            data,
            message: 'Lead retrieved successfully',
        });
    }

    @Get('leads/search/:email')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Search leads by email',
        description: 'Searches for leads by email within your business.',
    })
    @ApiOkResponse({ description: 'Leads retrieved successfully' })
    async getLeadsByEmail(@Param('email') email: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.getLeadsByEmail(email, businessId);
        return HttpResponse.success({
            data,
            message: 'Leads retrieved successfully',
        });
    }

    @Patch('leads/:leadId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update a lead',
        description: 'Updates a lead belonging to your business.',
    })
    @ApiOkResponse({ description: 'Lead updated successfully' })
    @ApiBadRequestResponse({ description: 'Invalid input data' })
    @ApiNotFoundResponse({ description: 'Lead not found' })
    async updateLead(
        @Param('leadId') leadId: string,
        @Body() dto: UpdateLeadDto,
        @Request() req
    ) {
        const businessId = req.user.businessId;
        const data = await this.leadService.updateLead(Number(leadId), businessId, dto);
        return HttpResponse.success({
            data,
            message: 'Lead updated successfully',
        });
    }

    @Delete('leads/:leadId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a lead',
        description: 'Permanently deletes a specific lead.',
    })
    @ApiOkResponse({ description: 'Lead deleted successfully' })
    @ApiNotFoundResponse({ description: 'Lead not found' })
    async deleteLead(@Param('leadId') leadId: string, @Request() req) {
        const businessId = req.user.businessId;
        const data = await this.leadService.deleteLead(Number(leadId), businessId);
        return HttpResponse.success({
            data,
            message: 'Lead deleted successfully',
        });
    }
}