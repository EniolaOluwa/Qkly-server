import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthResponseDto, WelcomeResponseDto } from './common/dto/responses.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Get welcome message',
    description:
      'Returns a welcome message indicating the NestJS application is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Welcome message returned successfully',
    type: WelcomeResponseDto,
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiTags('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns the health status of the application and database connection',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status returned successfully',
    type: HealthResponseDto,
  })
  getHealth(): string {
    return this.appService.getHealthStatus();
  }
}
