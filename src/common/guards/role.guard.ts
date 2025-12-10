import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../auth/user-role.enum';
import { ErrorHelper } from '../utils';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('RoleGuard: user role =', user?.role);

    if (!user) {
      ErrorHelper.ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      ErrorHelper.ForbiddenException('User role not specified');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      ErrorHelper.ForbiddenException(`Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
} 