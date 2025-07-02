import { ApiProperty } from '@nestjs/swagger';

export class WelcomeResponseDto {
  @ApiProperty({
    description: 'Welcome message from the application',
    example: 'Hello World! NestJS app with PostgreSQL is running.',
  })
  message: string;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status of the application and database',
    example: 'Application is healthy! Database: PostgreSQL on localhost:6543',
  })
  status: string;
} 