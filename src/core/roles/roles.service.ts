import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserType } from "../../common/auth/user-role.enum";
import { ErrorHelper } from "../../common/utils";
import { ChangeRoleStatusDto } from "./dto/change-role-status.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { Role, RoleStatus } from "./entities/role.entity";
import { User } from "../users";

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async createRole(
    createRoleDto: CreateRoleDto,
    createdBy: number,
  ): Promise<Role> {
    // Check if role name already exists
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      ErrorHelper.ConflictException('Role with this name already exists');
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      createdBy,
      status: RoleStatus.ACTIVE,
      isSystemRole: false,
    });

    const savedRole = await this.roleRepository.save(role);
    this.logger.log(`Role created: ${savedRole.name} by user ${createdBy}`);

    return savedRole;
  }

  async updateRole(
    roleId: number,
    updateRoleDto: UpdateRoleDto,
    updatedBy: number,
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      ErrorHelper.NotFoundException('Role not found');
    }

    // Prevent updating system roles
    if (role.isSystemRole) {
      ErrorHelper.BadRequestException('System roles cannot be modified');
    }

    // Check name uniqueness if name is being updated
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });

      if (existingRole) {
        ErrorHelper.ConflictException('Role with this name already exists');
      }
    }

    Object.assign(role, updateRoleDto);
    role.updatedBy = updatedBy;

    const updatedRole = await this.roleRepository.save(role);
    this.logger.log(`Role updated: ${updatedRole.name} by user ${updatedBy}`);

    return updatedRole;
  }

  async changeRoleStatus(
    roleId: number,
    changeStatusDto: ChangeRoleStatusDto,
    updatedBy: number,
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      ErrorHelper.NotFoundException('Role not found');
    }

    // Prevent modifying system roles
    if (role.isSystemRole) {
      ErrorHelper.BadRequestException('System roles cannot be suspended or deactivated');
    }

    role.status = changeStatusDto.status;
    role.updatedBy = updatedBy;

    const updatedRole = await this.roleRepository.save(role);
    this.logger.log(
      `Role status changed: ${updatedRole.name} to ${changeStatusDto.status} by user ${updatedBy}`,
    );

    return updatedRole;
  }

  async deleteRole(roleId: number, deletedBy: number): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      ErrorHelper.NotFoundException('Role not found');
    }

    // Prevent deleting system roles
    if (role.isSystemRole) {
      ErrorHelper.BadRequestException('System roles cannot be deleted');
    }

    // Check if role is assigned to any users
    const usersWithRole = await this.userRepository.count({ where: { roleId } });
    if (usersWithRole > 0) {
      ErrorHelper.BadRequestException('Cannot delete role that is assigned to users');
    }

    await this.roleRepository.delete(roleId);
    this.logger.log(`Role deleted: ${role.name} by user ${deletedBy}`);
  }

  async findAll(userType?: UserType, status?: RoleStatus): Promise<Role[]> {
    const query = this.roleRepository.createQueryBuilder('role');

    if (userType) {
      query.andWhere('role.userType = :userType', { userType });
    }

    if (status) {
      query.andWhere('role.status = :status', { status });
    }

    query.orderBy('role.priority', 'DESC').addOrderBy('role.name', 'ASC');

    return query.getMany();
  }

  async findOne(roleId: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      ErrorHelper.NotFoundException('Role not found');
    }

    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async getAdminRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { userType: UserType.ADMIN, status: RoleStatus.ACTIVE },
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async getUserRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { userType: UserType.USER, status: RoleStatus.ACTIVE },
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  // Initialize system roles (call this in your bootstrap or migration)
  async initializeSystemRoles(): Promise<void> {
    const systemRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        userType: UserType.ADMIN,
        permissions: ['*'], // Wildcard for all permissions
        priority: 100,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
      {
        name: 'Admin',
        description: 'Administrative access with most permissions',
        userType: UserType.ADMIN,
        permissions: [
          'users.read',
          'users.write',
          'roles.read',
          'transactions.read',
          'reports.read',
        ],
        priority: 50,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
      {
        name: 'Merchant',
        description: 'Standard merchant user',
        userType: UserType.USER,
        permissions: [
          'transactions.read',
          'transactions.create',
          'wallet.read',
          'profile.read',
          'profile.write',
        ],
        priority: 10,
        isSystemRole: true,
        status: RoleStatus.ACTIVE,
      },
    ];

    for (const roleData of systemRoles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        await this.roleRepository.save(roleData);
        this.logger.log(`System role created: ${roleData.name}`);
      }
    }
  }
}