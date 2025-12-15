import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorHelper } from "../utils";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );



    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      ErrorHelper.UnauthorizedException('User not authenticated');
    }

    const userPermissions = user.permissions || [];

    // Check for wildcard permission (Super Admin)
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) => {
      // Check for exact match
      if (userPermissions.includes(permission)) {
        return true;
      }

      // Check for wildcard parent permission (e.g., users.* allows users.read)
      const permissionParts = permission.split('.');
      if (permissionParts.length > 1) {
        const parentPermission = permissionParts[0] + '.*';
        if (userPermissions.includes(parentPermission)) {
          return true;
        }
      }

      return false;
    });

    if (!hasAllPermissions) {
      ErrorHelper.ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
