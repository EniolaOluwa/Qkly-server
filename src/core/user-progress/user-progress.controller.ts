import { UseGuards, Controller, Post, Body, Get, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiCreatedResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiOkResponse } from "@nestjs/swagger";
import { ErrorHelper } from "../../common/utils";
import { JwtAuthGuard } from "../users";
import { RecordProgressDto } from "./dto/create-user-progress.dto";
import { UserProgressService } from "./user-progress.service";

@ApiTags('User Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class UserProgressController {
  constructor(private readonly progressService: UserProgressService) { }

  // --------------------------------------
  // POST /progress/record
  // --------------------------------------
  @Post('record')
  @ApiOperation({
    summary: 'Record a progress event',
    description: 'Stores a milestone event for the authenticated user.',
  })
  @ApiBody({ type: RecordProgressDto })
  @ApiCreatedResponse({
    description: 'Progress event recorded successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body or unknown event',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async recordProgress(
    @Request() req,
    @Body() body: RecordProgressDto,
  ) {
    const userId = req.user.userId;
    if (!userId) {
      ErrorHelper.NotFoundException('User not found');
    }

    if (!body.event) {
      ErrorHelper.BadRequestException('event is required');
    }

    return this.progressService.addProgress(userId, body.event);
  }

  // --------------------------------------
  // GET /progress
  // --------------------------------------
  @Get()
  @ApiOperation({
    summary: 'Get all progress events',
    description: 'Returns all progress milestones for the authenticated user.',
  })
  @ApiOkResponse({
    description: 'List of user progress records',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUserProgress(@Request() req) {
    const userId = req.user.userId;
    if (!userId) {
      ErrorHelper.NotFoundException('User not found');
    }

    return this.progressService.getProgress(userId);
  }

  // --------------------------------------
  // GET /progress/level
  // --------------------------------------
  @Get('level')
  @ApiOperation({
    summary: 'Get user level',
    description:
      'Returns the user’s progress level based on completed milestone events.',
  })
  @ApiOkResponse({
    description: 'User progress level information',
    schema: {
      example: {
        level: 2,
        totalSteps: 4,
        completedEvents: [
          'BUSINESS_INFO_UPDATED',
          'FIRST_PRODUCT_CREATED',
        ],
        timeline: [
          {
            id: 10,
            userId: 1,
            event: 'BUSINESS_INFO_UPDATED',
            createdAt: '2025-01-01T12:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUserLevel(@Request() req) {
    const userId = req.user.userId;
    if (!userId) {
      ErrorHelper.NotFoundException('User not found');
    }

    return this.progressService.getLevel(userId);
  }
}
