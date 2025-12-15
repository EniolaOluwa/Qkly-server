import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ErrorHelper } from '../utils';
import { ROLE_HIERARCHY, UserRole } from '../auth/user-role.enum';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;


    if (!user) {
      ErrorHelper.UnauthorizedException('User not authenticated');
    }


    // Check if user has any of the required roles
    const userRole =
      user.roleName ||
      user.role?.name ||
      user.userType;


    // Get all roles this user is allowed to act as
    const allowedRoles = ROLE_HIERARCHY[userRole];

    if (!allowedRoles) {
      ErrorHelper.ForbiddenException('Invalid user role');
    }

    // ✅ Hierarchical check
    const hasAccess = requiredRoles.some((role) =>
      allowedRoles.includes(role),
    );

    if (!hasAccess) {
      ErrorHelper.ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
