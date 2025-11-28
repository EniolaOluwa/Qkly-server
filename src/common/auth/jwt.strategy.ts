import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../interfaces';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-this-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      userId: payload.sub,
      email: payload.email,
      firstName: payload.firstName,

      
      lastName: payload.lastName,
      deviceId: payload.deviceId,
      role: payload.role,
    };
  }
}

