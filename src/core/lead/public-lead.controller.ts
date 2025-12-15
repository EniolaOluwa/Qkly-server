import { Public } from '@app/common/decorators/public.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { CreateLeadDto } from './dto/lead.dto';
import { LeadSubmissionThrottleGuard } from './guards/throttle.guards';
import { LeadService } from './lead.service';
import { FormResponseDto, LeadSubmissionResponseDto } from './dto/lead-response';
import { BusinessesService } from '../businesses/businesses.service';


@ApiTags('Public Forms')
@Controller('forms')
export class PublicLeadController {
  constructor(private readonly leadService: LeadService,
    private readonly businessService: BusinessesService
  ) { }


  @Public()
  @Get(':publicId')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get public form details',
    description: 'Retrieves form configuration for public display. No authentication required.',
  })
  @ApiOkResponse({
    description: 'Form details retrieved successfully',
    type: FormResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Form not found or inactive',
    schema: {
      example: {
        statusCode: 404,
        message: 'Form not found',
        error: 'Not Found'
      }
    }
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests',
    schema: {
      example: {
        statusCode: 429,
        message: 'Too many requests',
        error: 'Too Many Requests'
      }
    }
  })
  async getPublicForm(@Param('publicId') publicId: string) {
    const form = await this.leadService.getFormByPublicId(publicId);

    // Return only public-safe information
    return HttpResponse.success({
      data: {
        id: form.publicId,
        title: form.title,
        description: form.description,
        buttonText: form.buttonText,
        inputs: form.inputs,
        logoUrl: form.logoUrl,
        successMessage: form.successMessage,
        customStyling: form.customStyling,
        canSubmit: form.canAcceptSubmissions(),
        requireEmailVerification: form.requireEmailVerification,
        enableCaptcha: form.enableCaptcha,
      },
      message: 'Form retrieved successfully',
    });
  }


  @Public()
  @Post('submit/:publicId')
  @UseGuards(LeadSubmissionThrottleGuard)
  @Throttle({ 'lead-submission': { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Submit a lead (Public)',
    description: 'Public endpoint for submitting leads. Rate limited to 5 submissions per minute per IP address. Collects tracking information including IP, device type, browser, referrer, and UTM parameters.',
  })
  @ApiCreatedResponse({
    description: 'Lead submitted successfully',
    type: LeadSubmissionResponseDto,
    schema: {
      example: {
        data: {
          id: 123,
          message: 'Thank you! Your submission has been received.',
          redirectUrl: 'https://example.com/thank-you'
        },
        message: 'Lead submitted successfully'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input, missing required fields, or form inactive',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email is required',
        error: 'Bad Request'
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Form not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Form not found',
        error: 'Not Found'
      }
    }
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many submissions. Please try again later.',
    schema: {
      example: {
        statusCode: 429,
        message: 'Too many submissions. Please try again in a few minutes.',
        error: 'Too Many Requests'
      }
    }
  })
  async submitPublicLead(
    @Param('publicId') publicId: string,
    @Body(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })) dto: CreateLeadDto,
    @Req() req: Request,
  ) {


    // Extract tracking information from request
    const trackingData = {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
      deviceType: this.getDeviceType(req.headers['user-agent'] || ''),
      browser: this.getBrowser(req.headers['user-agent'] || ''),
      operatingSystem: this.getOS(req.headers['user-agent'] || ''),
    };

    // Extract UTM parameters from query or body
    const utmParameters = this.extractUtmParameters(req);

    const data = await this.leadService.createPublicLead(
      publicId,
      dto,
      trackingData,
      utmParameters,
    );


    return HttpResponse.success({
      data: {
        id: data.id,
        message: data.form.successMessage || 'Thank you! Your submission has been received.',
        redirectUrl: data.form.redirectUrl,
      },
      message: 'Lead submitted successfully',
    });
  }



  @Get('business/:identifier/forms')
  @ApiOperation({
    summary: 'Get forms by business identifier',
    description: 'Retrieve all forms belonging to a business using id, slug, or store name',
  })
  async getBusinessForms(@Param('identifier') identifier: string) {
    const parsedIdentifier = Number(identifier);
    const key = isNaN(parsedIdentifier) ? identifier : parsedIdentifier;

    const forms = await this.businessService.getFormsByBusinessIdentifier(key);

    return HttpResponse.success({
      data: forms.map((form) => ({
        id: form.publicId,
        title: form.title,
        description: form.description,
        buttonText: form.buttonText,
        inputs: form.inputs,
        logoUrl: form.logoUrl,
        successMessage: form.successMessage,
        customStyling: form.customStyling,
        canSubmit: form.canAcceptSubmissions(),
        requireEmailVerification: form.requireEmailVerification,
        enableCaptcha: form.enableCaptcha,
      })),
      message: 'Business forms retrieved successfully',
    });
  }



  private getClientIp(req: Request): string {
    // Check multiple headers for real IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'x-client-ip',
      'true-client-ip',
    ];

    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        const ip = typeof value === 'string'
          ? value.split(',')[0].trim()
          : value[0];
        if (ip) return ip;
      }
    }

    return req.socket.remoteAddress || 'unknown';
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    return 'Unknown';
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows NT')) return 'Windows';
    if (userAgent.includes('Mac OS X')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private extractUtmParameters(req: Request): any {
    const query = req.query;
    const hasUtm = query.utm_source || query.utm_medium || query.utm_campaign;

    if (!hasUtm) return null;

    return {
      source: query.utm_source || null,
      medium: query.utm_medium || null,
      campaign: query.utm_campaign || null,
      term: query.utm_term || null,
      content: query.utm_content || null,
    };
  }
}