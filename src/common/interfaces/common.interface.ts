import { Request } from 'express';


export interface JwtPayload {
  sub: number;
  email: string;
  firstName: string;
  lastName: string;
  deviceId: string;
  role: string;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  deviceId: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
