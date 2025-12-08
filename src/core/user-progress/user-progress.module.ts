import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UserProgressService } from './user-progress.service';
import { UserProgressEvent } from './entities/user-progress.entity';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class UserProgressController {
  constructor(private readonly progressService: UserProgressService) { }

  @Post('record')
  async recordProgress(
    @Body() body: { userId: number; event: UserProgressEvent }
  ) {
    return this.progressService.addProgress(body.userId, body.event);
  }

  @Get(':userId')
  async getUserProgress(@Param('userId') userId: number) {
    return this.progressService.getProgress(userId);
  }

  @Get(':userId/level')
  async getUserLevel(@Param('userId') userId: number) {
    return this.progressService.getLevel(userId);
  }
}
