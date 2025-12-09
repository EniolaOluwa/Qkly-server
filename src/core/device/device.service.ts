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
import { Business } from '../businesses/business.entity';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
   
  ) {}


async createDevice(
  createDeviceDto: CreateDeviceDto,
  userId: number,
): Promise<Device> {
  try {

    console.log(createDeviceDto)

    let businessId: number | undefined = undefined;

    // If businessId is provided, validate it exists
    if (createDeviceDto.businessId) {
      const business = await this.businessRepository.findOne({
        where: { id: createDeviceDto.businessId },
      });

      if (!business) {
        throw new BadRequestException(
          `Business with ID ${createDeviceDto.businessId} does not exist`,
        );
      }

      businessId = business.id;
    }

    console.log(createDeviceDto.businessId);

    // Create the device
    const device = this.deviceRepository.create({
      userId,       
      businessId,   
      deviceName: createDeviceDto.deviceName,
      osType: createDeviceDto.osType,
      osVersion: createDeviceDto.osVersion,
      deviceType: createDeviceDto.deviceType,
      referralUrl: createDeviceDto.referralUrl,
    });

    console.log(device);

    return await this.deviceRepository.save(device);
  } catch (error) {
    console.log(error)
    ErrorHelper.InternalServerErrorException('Failed to create device');
  }
}


  async getDeviceById(deviceId: number): Promise<Device> {
    const device = await this.deviceRepository.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
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
    deviceId: number,
    updateDeviceDto: UpdateDeviceDto,
  ): Promise<Device> {
    try{
    const device = await this.getDeviceById(deviceId);
    Object.assign(device, updateDeviceDto);
    return this.deviceRepository.save(device);
    }catch(error){
      ErrorHelper.InternalServerErrorException('Failed to update device')
    }
  }

  async deleteDevice(deviceId: number): Promise<void> {
    const result = await this.deviceRepository.delete(deviceId);
    if (result.affected === 0) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
  }

  }
