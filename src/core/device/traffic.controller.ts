import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RecordTrafficDto } from './dto/device.dto';
import { TrafficEventService } from './traffic.service';


@Public()
@ApiTags('Traffic Events (Public Tracking)')
@Controller('traffic')
export class TrafficEventController {
  constructor(private readonly service: TrafficEventService) { }

  @Post(':businessId')
  @ApiOperation({
    summary: 'Record traffic event',
    description:
      'Captures traffic events from embeds, widgets, landing pages, or store visits. ' +
      'This is typically called from a frontend script.',
  })
  @ApiParam({
    name: 'businessId',
    description: 'ID of the business',
    example: 12,
  })
  @ApiBody({
    description: 'Information collected from the frontend tracking script.',
    type: RecordTrafficDto,
    examples: {
      FullExample: {
        summary: 'Typical traffic payload',
        value: {
          referrerFromJs: 'https://instagram.com/story-link',
          landingPage: '/pricing',
          utmSource: 'instagram',
        },
      },
      Minimal: {
        summary: 'Minimal payload',
        value: {
          landingPage: '/',
        },
      },
    },
  })
  async record(
    @Param('businessId') businessId: number,
    @Req() req,
    @Body() body: RecordTrafficDto,
  ) {
    return this.service.recordTraffic(businessId, req, body);
  }

  @Get(':businessId/insights')
  @ApiOperation({
    summary: 'Get insights for a business',
    description:
      'Returns aggregated insights broken down by source, date, and landing page.',
  })
  @ApiParam({
    name: 'businessId',
    example: 12,
  })
  async insights(@Param('businessId') businessId: number) {
    return this.service.fullInsights(businessId);
  }
}
