import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Request,
  UseGuards,
  ValidationPipe,
  BadRequestException,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { InsightsService } from './insights.service';
import { InsightsQueryDto, TimePeriod } from './dto/insights-query.dto';
import { InsightsResponseDto } from './dto/insights-response.dto';
import { ErrorHelper } from '../../common/utils';


@ApiTags('insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get store insights and analytics',
    description:
      'Retrieves key performance indicators (KPIs) and traffic source breakdown for the authenticated user\'s store. Supports time period filtering.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    description: 'Time period for insights',
    example: TimePeriod.THIS_WEEK,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom period (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom period (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Insights retrieved successfully',
    type: InsightsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found for this user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getInsights(
    @Query(ValidationPipe) query: InsightsQueryDto,
    @Request() req,
  ): Promise<InsightsResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      ErrorHelper.BadRequestException('Authenticated user id not found');
    }

    return this.insightsService.getInsights(userId, query);
  }

  @Public()
  @Post('track-visit/:businessId')
  @ApiOperation({
    summary: 'Track store visit (Public)',
    description:
      'Tracks a visit to a store. This endpoint is public and should be called when someone views a store-front. Captures traffic source information from query parameters and headers.',
  })
  @ApiParam({
    name: 'businessId',
    type: Number,
    description: 'The ID of the business/store',
    example: 1,
  })
  @ApiQuery({
    name: 'utm_source',
    required: false,
    type: String,
    description: 'UTM source parameter',
    example: 'instagram',
  })
  @ApiQuery({
    name: 'utm_medium',
    required: false,
    type: String,
    description: 'UTM medium parameter',
    example: 'social',
  })
  @ApiQuery({
    name: 'utm_campaign',
    required: false,
    type: String,
    description: 'UTM campaign parameter',
    example: 'summer_sale',
  })
  @ApiResponse({
    status: 201,
    description: 'Visit tracked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid business ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found',
  })
  async trackVisit(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('utm_source') utmSource?: string,
    @Query('utm_medium') utmMedium?: string,
    @Query('utm_campaign') utmCampaign?: string,
    @Headers('referer') referer?: string,
    @Headers('user-agent') userAgent?: string,
    @Request() req?: any,
  ): Promise<{ message: string; success: boolean }> {
    // Get IP address from request
    const ipAddress =
      req?.ip ||
      req?.headers?.['x-forwarded-for']?.split(',')[0] ||
      req?.connection?.remoteAddress;

    // Generate or get session ID (could be from cookie or generate new)
    const sessionId = req?.cookies?.sessionId || `session_${Date.now()}_${Math.random()}`;

    await this.insightsService.trackStoreVisit(
      businessId,
      undefined, // trafficSource will be normalized
      referer,
      utmSource,
      utmMedium,
      utmCampaign,
      userAgent,
      ipAddress,
      sessionId,
    );

    return {
      message: 'Visit tracked successfully',
      success: true,
    };
  }
}

