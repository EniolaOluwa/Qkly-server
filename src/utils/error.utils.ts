/* eslint-disable no-console */
import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorHelper {
  static BadRequestException(msg: string | string[]) {
    console.log(msg);
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }

  static UnauthorizedException(msg: string, cause?: Error) {
    console.log(msg);

    throw new HttpException(msg, HttpStatus.UNAUTHORIZED, {
      cause,
    });
  }

  static NotFoundException(msg: string) {
    console.log(msg);

    throw new HttpException(msg, HttpStatus.NOT_FOUND);
  }

  static ForbiddenException(msg: string) {
    console.log(msg);

    throw new HttpException(msg, HttpStatus.FORBIDDEN);
  }

  static InternalServerErrorException(msg: string) {
    console.log(msg);

    throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  static ConflictException(msg: string) {
    console.log(msg);

    throw new HttpException(msg, HttpStatus.CONFLICT);
  }

  static UnprocessableEntityException(msg: string) {
    console.log(msg);

    throw new HttpException(msg, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
