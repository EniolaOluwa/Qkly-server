import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../core/users';
import { ErrorHelper } from '../utils';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key-change-this-in-production',
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role', 'profile', 'security'],
    });


    if (!user) {
      ErrorHelper.UnauthorizedException('User not found');
    }

    // Check if user is active
    if (user.status === 'suspended' || user.status === 'banned') {
      ErrorHelper.UnauthorizedException('Account is suspended or banned');
    }

    // Check if user is still locked
    if (user.security?.pinLockedUntil && user.security.pinLockedUntil > new Date()) {
      ErrorHelper.UnauthorizedException('Account is temporarily locked');
    }

    // Return user info including role
    return {
      userId: payload.sub,
      email: payload.email,
      firstName: payload.firstName || user.profile?.firstName,
      lastName: payload.lastName || user.profile?.lastName,
      userType: user.userType,
      roleName: user.role?.userType,
      roleId: user.roleId,
      permissions: user.role?.permissions || [],
    };
  }
}


