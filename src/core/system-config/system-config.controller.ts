import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserType } from '../../common/auth/user-role.enum';
import { SystemConfigService } from './system-config.service';
import { ConfigDataType } from './entities/system-config.entity';

class UpdateConfigDto {
  value: any;
  description?: string;
  dataType?: ConfigDataType;
}

@ApiTags('System Config')
@ApiBearerAuth()
@UseGuards(RoleGuard)
@Controller('admin/system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) { }

  @Get(':key')
  @Roles(UserType.ADMIN as any, UserType.SUPER_ADMIN as any)
  async getConfig(@Param('key') key: string) {
    const value = await this.systemConfigService.get(key);
    return { key, value };
  }

  @Put(':key')
  @Roles(UserType.SUPER_ADMIN as any)
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.systemConfigService.set(
      key,
      dto.value,
      dto.description,
      dto.dataType,
    );
  }
}
