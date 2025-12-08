import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UserProgressEvent } from './entities/user-progress.entity';
import { UserProgressService } from './user-progress.service';
import { ErrorHelper } from '../../common/utils';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class UserProgressController {
  constructor(private readonly progressService: UserProgressService) { }

  @Post('record')
  async recordProgress(
    @Request() req,
    @Body() body: { event: UserProgressEvent }
  ) {
    const userId = req.user.id;
    if (!userId) {
      ErrorHelper.NotFoundException('User not found');
    }
    return this.progressService.addProgress(userId, body.event);
  }

  @Get()
  async getUserProgress(
    @Request() req,
  ) {
    const userId = req.user.id;
    if (!userId) {
      ErrorHelper.NotFoundException('User not found');
    }

    return this.progressService.getProgress(userId);
  }

  @Get('level')
  async getUserLevel(@Request() req) {
    const userId = req.user.id;
    if (!userId) {
      ErrorHelper.NotFoundException('User not found');
    }
    return this.progressService.getLevel(userId);
  }
}
