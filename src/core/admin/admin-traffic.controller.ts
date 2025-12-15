import { Controller, Get, Query } from "@nestjs/common";
import { TrafficEventService } from "../traffic-events/traffic.service";
import { Admin } from "../../common/decorators/admin.decorator";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AdminTrafficFilterDto } from "../traffic-events/dto/device.dto";

@Admin()
@ApiBearerAuth()
@Controller('admin/traffic')
export class AdminTrafficController {
  constructor(private readonly trafficService: TrafficEventService) { }


  @Get()
  @ApiOperation({
    summary: 'Admin: Query all traffic events',
    description:
      'Full filtering: source, businessId, date ranges, pagination.',
  })
  async getAll(@Query() filters: AdminTrafficFilterDto) {
    return this.trafficService.adminQuery(filters);
  }
}