import { Body, Controller, Param, Patch, UseGuards, ValidationPipe, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { JwtAuthGuard, RoleGuard, Roles, UserRole } from "../users";
import { SuspendUserDto } from "../users/dto/suspend-user.dto";
import { UsersService } from "../users/users.service";
import { AssignRoleDto } from "../roles/dto/assign-role.dto";

@Admin()
@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminActionsController {
  constructor(private readonly usersService: UsersService) { }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Suspend a user',
    description: 'Suspends a user account with a reason. Admin can suspend merchants, only Super Admin can suspend admins.',
  })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(
    @Param('id') id: number,
    @Body(ValidationPipe) suspendDto: SuspendUserDto,
    @Request() req,
  ) {
    const suspendedBy = req.user.userId;
    const user = await this.usersService.suspendUser(id, suspendDto, suspendedBy);

    return HttpResponse.success({
      message: 'User suspended successfully',
      data: user,
    });
  }



  @Patch(':id/reactivate')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Reactivate a suspended user',
    description: 'Reactivates a suspended user account.',
  })
  @ApiResponse({ status: 200, description: 'User reactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateUser(@Param('id') id: number, @Request() req) {
    const reactivatedBy = req.user.userId;
    const user = await this.usersService.reactivateUser(id, reactivatedBy);

    return HttpResponse.success({
      message: 'User reactivated successfully',
      data: user,
    });
  }



  @Patch(':id/assign-role')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assigns a role to a user. Only Super Admin can assign roles.',
  })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Role type mismatch or inactive role' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async assignRole(
    @Param('id') id: number,
    @Body(ValidationPipe) assignRoleDto: AssignRoleDto,
    @Request() req,
  ) {
    const assignedBy = req.user.userId;
    const user = await this.usersService.assignRole(id, assignRoleDto.roleId, assignedBy);

    return HttpResponse.success({
      message: 'Role assigned successfully',
      data: user,
    });
  }
}