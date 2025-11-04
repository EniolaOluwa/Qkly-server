import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World! NestJS app with PostgreSQL is running.';
  }

  getHealthStatus(): string {
    return 'Application is healthy! Database: PostgreSQL on localhost:6543';
  }
}