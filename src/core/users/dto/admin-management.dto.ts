import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

import { UserRole } from '@app/common/auth/user-role.enum';



export class CreateAdminDto {

  @ApiProperty({ example: 'Admin', description: 'First name of the new admin' })

  @IsString()

  @IsNotEmpty()

  firstName: string;



  @ApiProperty({ example: 'User', description: 'Last name of the new admin' })

  @IsString()

  @IsNotEmpty()

  lastName: string;



  @ApiProperty({ example: 'admin@qkly.com', description: 'Email address of the new admin' })

  @IsEmail()

  @IsNotEmpty()

  email: string;



  @ApiProperty({ example: '+2348012345678', description: 'Phone number of the new admin' })

  @IsString()

  @IsNotEmpty()

  phone: string; // Added phone number based on the UI



  @ApiProperty({ example: 'StrongPassword123!', description: 'Password for the new admin account' })

  @IsString()

  @IsNotEmpty()

  password: string;



  @ApiProperty({ example: UserRole.ADMIN, description: 'Role of the new admin', enum: UserRole })

  @IsEnum(UserRole)

  @IsNotEmpty()

  role: UserRole; // This would typically be ADMIN or SUPER_ADMIN

}



export class UpdateAdminRoleDto {

  @ApiProperty({ example: UserRole.ADMIN, description: 'New role for the user', enum: UserRole })

  @IsEnum(UserRole)

  @IsNotEmpty()

  newRole: UserRole;

}



export class UpdateAdminStatusDto {

  @ApiProperty({ example: true, description: 'New active status for the admin' })

  @IsBoolean()

  @IsNotEmpty()

  isActive: boolean;

}



export class AdminUserResponseDto {

  @ApiProperty({ example: 1, description: 'Unique identifier of the admin user' })

  id: number;



  @ApiProperty({ example: 'Admin', description: 'First name of the admin user' })

  firstName: string;



  @ApiProperty({ example: 'User', description: 'Last name of the admin user' })

  lastName: string;



  @ApiProperty({ example: 'admin@qkly.com', description: 'Email address of the admin user' })

  email: string;



  @ApiProperty({ example: '+2348012345678', description: 'Phone number of the admin user' })

  phone: string;



  @ApiProperty({ example: UserRole.ADMIN, description: 'Role of the admin user', enum: UserRole })

  role: UserRole;



  @ApiProperty({ example: true, description: 'Whether the admin user is active' })

  isActive: boolean;



  @ApiProperty({ example: new Date(), description: 'Date when the admin account was created' })

  createdAt: Date;

}