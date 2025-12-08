import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDeviceDto } from './dto/device.dto';
import { Device } from './entity/device.entity';
import { UpdateDeviceDto } from './dto/device.dto';
import { ErrorHelper } from '@app/common/utils';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async createDevice(
    createDeviceDto: CreateDeviceDto,
    userId: number,
  ): Promise<Device> {
    try {
      const device = this.deviceRepository.create({
        ...createDeviceDto,
        userId,
        businessId: createDeviceDto.businessId,
      });

      return await this.deviceRepository.save(device);
    } catch (error) {
     ErrorHelper.InternalServerErrorException("Failed to create device")
    }
  }

  async getDeviceById(id: number): Promise<Device> {
    const device = await this.deviceRepository.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async getAllDevices(
    page: number,
    limit: number,
    query: any,
  ): Promise<Device[]> {
    const [devices, _] = await this.deviceRepository.findAndCount({
      where: query,
      skip: (page - 1) * limit,
      take: limit,
    });
    return devices;
  }

  async getDevicesByUserId(userId: number): Promise<Device[]> {
    const devices = await this.deviceRepository.find({ where: { userId } });
    if (!devices.length) {
      throw new NotFoundException(
        `No devices found for user with ID ${userId}`,
      );
    }
    return devices;
  }

  //  Get devices for a business
  async getDevicesByBusinessId(businessId: number): Promise<Device[]> {
    try {
         const devices = await this.deviceRepository.find({ where: { businessId } });

          if (!devices.length) {
            throw new NotFoundException(
              `No devices found for business with ID ${businessId}`,
            );
          }

          return devices;
    } catch(error){
      ErrorHelper.InternalServerErrorException('Failed to get devices for business')
    }
   
  }

  async updateDevice(
    id: number,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<Device> {
    try{
    const device = await this.getDeviceById(id);
    Object.assign(device, updateDeviceDto);
    return this.deviceRepository.save(device);
    }catch(error){
      ErrorHelper.InternalServerErrorException('Failed to update device')
    }
  }

  async deleteDevice(id: number): Promise<void> {
    const result = await this.deviceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
  }

}
