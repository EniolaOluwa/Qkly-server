import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigDataType, SystemConfig } from './entities/system-config.entity';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
    private readonly envConfigService: ConfigService,
  ) { }

  /**
   * Get a config value, prioritizing Database > Environment Variable > Default
   * @param key Config Key
   * @param defaultValue Default value if not found in DB or Env
   */
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    try {
      // 1. Try DB
      const dbConfig = await this.configRepository.findOne({ where: { key } });
      if (dbConfig) {
        return this.parseValue(dbConfig.value, dbConfig.dataType) as T;
      }

      // 2. Try Env
      const envValue = this.envConfigService.get<T>(key);
      if (envValue !== undefined && envValue !== null) {
        return envValue;
      }

      // 3. Return Default
      return defaultValue as T;
    } catch (error) {
      this.logger.error(`Error retrieving config for key ${key}`, error);
      return defaultValue as T;
    }
  }

  /**
   * Set or Update a config value in the Database
   */
  async set(
    key: string,
    value: any,
    description?: string,
    dataType: ConfigDataType = ConfigDataType.STRING,
  ): Promise<SystemConfig> {
    let stringValue = String(value);
    if (dataType === ConfigDataType.JSON || typeof value === 'object') {
      stringValue = JSON.stringify(value);
      dataType = ConfigDataType.JSON; // Auto-detect JSON
    } else if (typeof value === 'number') {
      dataType = ConfigDataType.NUMBER;
    } else if (typeof value === 'boolean') {
      dataType = ConfigDataType.BOOLEAN;
    }

    const existing = await this.configRepository.findOne({ where: { key } });

    if (existing) {
      existing.value = stringValue;
      if (description) existing.description = description;
      existing.dataType = dataType;
      return this.configRepository.save(existing);
    } else {
      const newConfig = this.configRepository.create({
        key,
        value: stringValue,
        description,
        dataType,
      });
      return this.configRepository.save(newConfig);
    }
  }

  private parseValue(value: string, type: ConfigDataType): any {
    switch (type) {
      case ConfigDataType.NUMBER:
        return Number(value);
      case ConfigDataType.BOOLEAN:
        return value === 'true';
      case ConfigDataType.JSON:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
  /**
   * Get all config entries
   */
  async findAll(): Promise<SystemConfig[]> {
    return this.configRepository.find();
  }
}
