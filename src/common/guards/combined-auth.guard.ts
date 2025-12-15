import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { ErrorHelper } from "../utils";

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      ErrorHelper.UnauthorizedException('User not authenticated');
    }

    // Check roles if specified
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoleName = user.roleName || user.role?.name;

      if (!userRoleName) {
        ErrorHelper.ForbiddenException('User has no role assigned');
      }

      const hasRole = requiredRoles.includes(userRoleName);
      if (!hasRole) {
        ErrorHelper.ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check permissions if specified
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user.permissions || [];

      // Super admin wildcard
      if (userPermissions.includes('*')) {
        return true;
      }

      const hasAllPermissions = requiredPermissions.every((permission) => {
        if (userPermissions.includes(permission)) {
          return true;
        }

        // Check for wildcard parent
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
    }

    return true;
  }
}