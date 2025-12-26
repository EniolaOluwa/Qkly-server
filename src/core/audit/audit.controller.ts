import { Controller, Get, UseGuards, Query, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, RoleGuard, UserRole, Roles } from '../users';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) { }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  async findAll(@Query() query: any) {
    // Basic implementation - service needs findAll method
    return this.auditService.findAll(query);
  }

  @Get('my-audit')
  @ApiOperation({ summary: 'Get audit logs for current user' })
  async findMyLogs(@Req() req: Request) {
    const user = req.user as any;
    return this.auditService.findByUser(user.id);
  }
}
