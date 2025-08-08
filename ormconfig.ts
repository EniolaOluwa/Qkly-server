import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load environment variables
config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST') || 'localhost',
  port: parseInt(configService.get('DB_PORT') || '6543', 10),
  username: configService.get('DB_USERNAME') || 'eniolafakeye',
  password: configService.get('DB_PASSWORD') || 'password@12345',
  database: configService.get('DB_NAME') || 'nqkly_db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // Set to false when using migrations
  logging: false, // Disabled database query logging
}); 