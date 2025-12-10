import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Delete,
  UseGuards,
  Res,
  Req,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/device.dto';
import { UpdateDeviceDto } from './dto/device.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';


@Public()
@ApiTags('Devices')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) { }

  @Post()
  async create(@Body() createDto: CreateDeviceDto, @Req() req, @Res() res) {
    // Use the userId from authentication token
    const userId = req.user.userId;
    if (!userId) {
      throw new BadRequestException('Authenticated user id not found');
    }
    const device = await this.deviceService.createDevice(createDto, userId);
    return res.status(HttpStatus.CREATED).json(device);
  }

  @Get()
  async findAll(@Req() req) {
    const { deviceName, osVersion } = req.query;

    const query: Record<string, any> = {};
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (deviceName) query.deviceName = deviceName;
    if (osVersion) query.osVersion = osVersion;

    return await this.deviceService.getAllDevices(page, limit, query);
  }


  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.deviceService.getDeviceById(id);
  }

  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req,
  ) {
    const userIdFromToken = req.user.userId;
    if (userId !== userIdFromToken) {
      throw new BadRequestException(
        'You can only access devices for your own user account',
      );
    }
    return await this.deviceService.getDevicesByUserId(userId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDeviceDto,
  ) {
    const device = await this.deviceService.getDeviceById(id);
    if (!device) {
      throw new BadRequestException('Device not found');
    }
    return await this.deviceService.updateDevice(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.deviceService.deleteDevice(id);
  }
}
