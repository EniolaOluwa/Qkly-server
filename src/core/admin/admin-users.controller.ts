import { Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/queries/dto";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { JwtAuthGuard, RoleGuard, Roles, UserRole } from "../users";
import { UsersService } from "../users/users.service";
import { AdminService } from "./admin.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";

@Admin()
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminUsersController {
  private readonly logger = new Logger(AdminUsersController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UsersService
  ) { }


  @Post()
  @RequirePermissions('*')
  @ApiOperation({
    summary: 'Create a new admin user',
    description: 'Creates a new admin user with specified role. Only Super Admin can create admin users.',
  })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  @ApiResponse({ status: 409, description: 'Conflict - Email or phone already exists' })
  async createAdmin(
    @Body(ValidationPipe) createAdminDto: CreateAdminDto,
    @Request() req,
  ) {
    const createdBy = req.user.userId;
    const admin = await this.adminService.createAdmin(createAdminDto, createdBy);

    return HttpResponse.success({
      message: 'Admin user created successfully',
      data: admin,
    });
  }


  @Get('active')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'Get all active admin users',
    description: 'Retrieves all active admin users.',
  })
  @ApiResponse({ status: 200, description: 'Active admins retrieved successfully' })
  async getActiveAdmins(
    @Query() pageOptionsDto: PaginationDto,
  ) {
    const result = await this.userService.getActiveAdmins(pageOptionsDto);

    return HttpResponse.success({
      ...result,
      message: 'Active admin users retrieved successfully',
    });
  }



  @Get('inactive')
  @RequirePermissions('users.read')
  @ApiOperation({
    summary: 'Get all inactive admin users',
    description: 'Retrieves all inactive, suspended, and banned admin users.',
  })
  @ApiResponse({ status: 200, description: 'Inactive admins retrieved successfully' })
  async getInactiveAdmins(
    @Query() pageOptionsDto: PaginationDto,
  ) {
    const result = await this.userService.getInactiveAdmins(pageOptionsDto);

    return HttpResponse.success({
      ...result,
      message: 'Inactive admin users retrieved successfully',
    });
  }


  @Get('admin-users')
  @RequirePermissions('*')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({
    summary: 'Get all admin users',
    description: 'Retrieves all administrative users. Only accessible by Super Admin.',
  })
  @ApiResponse({ status: 200, description: 'Admin users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAdminUsers(
    @Query() pageOptionsDto: PaginationDto,
  ) {
    const result = await this.userService.getAdminUsers(pageOptionsDto);

    return HttpResponse.success({
      ...result,
      message: 'Admin users retrieved successfully',
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get admin user by ID',
    description: 'Retrieves a single admin user by their ID.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async getAdminById(@Param('id', ParseIntPipe) id: number) {
    const admin = await this.adminService.getAdminById(id);

    return HttpResponse.success({
      message: 'Admin user retrieved successfully',
      data: admin,
    });
  }



  @Patch(':id')
  @RequirePermissions('*')
  @ApiOperation({
    summary: 'Update admin user',
    description: 'Updates admin user information. Only Super Admin can update admin users.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Email or phone already exists' })
  async updateAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateAdminDto: UpdateAdminDto,
    @Request() req,
  ) {
    const updatedBy = req.user.userId;
    const admin = await this.adminService.updateAdmin(id, updateAdminDto, updatedBy);

    return HttpResponse.success({
      message: 'Admin user updated successfully',
      data: admin,
    });
  }



  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete admin user',
    description: 'Deletes an admin user. Cannot delete Super Admin users. Only Super Admin can delete.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot delete Super Admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async deleteAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const deletedBy = req.user.userId;
    await this.adminService.deleteAdmin(id, deletedBy);

    return HttpResponse.success({
      message: 'Admin user deleted successfully',
      data: null,
    });
  }
}