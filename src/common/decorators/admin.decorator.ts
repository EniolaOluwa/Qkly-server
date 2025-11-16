import { applyDecorators, UseGuards } from "@nestjs/common";
import { UserRole } from "../auth/user-role.enum";
import { RoleGuard } from "../guards/role.guard";
import { Roles } from "./roles.decorator";

export const Admin = () =>
  applyDecorators(
    UseGuards(RoleGuard),
    Roles(UserRole.ADMIN),
  );
