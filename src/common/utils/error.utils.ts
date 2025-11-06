/* eslint-disable no-console */
import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorHelper {
  static BadRequestException(msg: string | string[]): never {
    console.error('[BadRequestException]', msg);
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }

  static UnauthorizedException(msg: string, cause?: Error): never {
    console.error('[UnauthorizedException]', msg);
    throw new HttpException(msg, HttpStatus.UNAUTHORIZED, { cause });
  }

  static NotFoundException(msg: string): never {
    console.error('[NotFoundException]', msg);
    throw new HttpException(msg, HttpStatus.NOT_FOUND);
  }

  static ForbiddenException(msg: string): never {
    console.error('[ForbiddenException]', msg);
    throw new HttpException(msg, HttpStatus.FORBIDDEN);
  }

  static InternalServerErrorException(msg: string, cause?: Error): never {
    console.error('[InternalServerErrorException]', msg);
    throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR, { cause });
  }

  static ConflictException(msg: string): never {
    console.error('[ConflictException]', msg);
    throw new HttpException(msg, HttpStatus.CONFLICT);
  }

  static UnprocessableEntityException(msg: string): never {
    console.error('[UnprocessableEntityException]', msg);
    throw new HttpException(msg, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
