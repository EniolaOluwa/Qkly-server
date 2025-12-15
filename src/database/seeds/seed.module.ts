import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../core/roles/entities/role.entity';
import { User } from '../../core/users';
import { RolesSeedService } from './roles.seed';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([Role, User]),
  ],
  providers: [RolesSeedService],
  exports: [RolesSeedService],
})
export class SeedModule { }

