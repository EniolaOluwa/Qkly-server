import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config(); // Load .env file

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '6543', 10),
  username: process.env.DB_USERNAME || 'eniolafakeye',
  password: process.env.DB_PASSWORD || 'password@12345',
  database: process.env.DB_NAME || 'eniolafakeye',
  entities: [path.join(__dirname, '/../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/../**/migrations/*{.ts,.js}')],
  synchronize: false,
  // logging: true,/
});
