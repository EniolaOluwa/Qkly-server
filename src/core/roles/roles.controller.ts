// src/modules/roles/roles.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, UserType } from '../../common/auth/user-role.enum';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { JwtAuthGuard, RoleGuard, Roles } from '../users';
import { ChangeRoleStatusDto } from './dto/change-role-status.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleStatus } from './entities/role.entity';
import { RolesService } from './roles.service';


@ApiTags('Roles')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new role',
    description: 'Creates a new role with specified permissions. Only accessible by Super Admin and Admin.',
  })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict - Role name already exists' })
  async createRole(
    @Body(ValidationPipe) createRoleDto: CreateRoleDto,
    @Request() req,
  ) {
    const createdBy = req.user.userId;
    const role = await this.rolesService.createRole(createRoleDto, createdBy);


    return HttpResponse.success({
      message: 'Role created successfully',
      data: role,
    });
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Retrieves all roles with optional filtering by user type and status.',
  })
  @ApiQuery({ name: 'userType', enum: UserType, required: false })
  @ApiQuery({ name: 'status', enum: RoleStatus, required: false })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('userType') userType?: UserType,
    @Query('status') status?: RoleStatus,
  ) {
    
    const roles = await this.rolesService.findAll(userType, status);


    return HttpResponse.success({
      message: 'Roles retrieved successfully',
      data: roles,
    });
  }

  @Get('admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all admin roles',
    description: 'Retrieves all active administrative roles.',
  })
  @ApiResponse({ status: 200, description: 'Admin roles retrieved successfully' })
  async getAdminRoles() {
    const roles = await this.rolesService.getAdminRoles();

    return HttpResponse.success({
      message: 'Admin roles retrieved successfully',
      data: roles,
    });
  }

  @Get('user')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all user roles',
    description: 'Retrieves all active user roles.',
  })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  async getUserRoles() {
    const roles = await this.rolesService.getUserRoles();

    return HttpResponse.success({
      message: 'User roles retrieved successfully',
      data: roles,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Retrieves a single role by its ID.',
  })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: number) {
    const role = await this.rolesService.findOne(id);

    return HttpResponse.success({
      message: 'Role retrieved successfully',
      data: role,
    });
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update a role',
    description: 'Updates role information. System roles cannot be modified. Only Super Admin can update roles.',
  })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot modify system roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Role name already exists' })
  async updateRole(
    @Param('id') id: number,
    @Body(ValidationPipe) updateRoleDto: UpdateRoleDto,
    @Request() req,
  ) {
    const updatedBy = req.user.userId;
    const role = await this.rolesService.updateRole(id, updateRoleDto, updatedBy);

    return HttpResponse.success({
      message: 'Role updated successfully',
      data: role,
    });
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Change role status',
    description: 'Changes role status (active, inactive, suspended). System roles cannot be modified.',
  })
  @ApiResponse({ status: 200, description: 'Role status changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot modify system roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async changeStatus(
    @Param('id') id: number,
    @Body(ValidationPipe) changeStatusDto: ChangeRoleStatusDto,
    @Request() req,
  ) {
    const updatedBy = req.user.userId;
    const role = await this.rolesService.changeRoleStatus(id, changeStatusDto, updatedBy);

    return HttpResponse.success({
      message: 'Role status changed successfully',
      data: role,
    });
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete a role',
    description: 'Deletes a role. System roles cannot be deleted. Only Super Admin can delete roles.',
  })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot delete system roles or roles in use' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(@Param('id') id: number, @Request() req) {
    const deletedBy = req.user.userId;
    await this.rolesService.deleteRole(id, deletedBy);

    return HttpResponse.success({
      message: 'Role deleted successfully',
      data: null,
    });
  }
}