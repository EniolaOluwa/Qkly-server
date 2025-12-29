import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Redis } from 'ioredis';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
    });
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      // If header is missing, skip idempotency check or throw error depending on requirement.
      // For now, we allow it but log a warning if it's a sensitive endpoint.
      return next.handle();
    }

    const userId = request.user?.userId;
    const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

    try {
      const cachedResponse = await this.redis.get(cacheKey);
      if (cachedResponse) {
        this.logger.log(`Idempotency hit for key: ${idempotencyKey}`);
        return of(JSON.parse(cachedResponse));
      }
    } catch (error) {
      this.logger.error('Redis error in idempotency check', error);
      // Fallback to processing if redis fails? Or fail safe?
      // Proceeding might be dangerous if it causes duplication, but failing blocks user.
      // Let's proceed but log.
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Cache the successful response for 24 hours (86400 seconds)
          await this.redis.set(cacheKey, JSON.stringify(response), 'EX', 86400);
        } catch (error) {
          this.logger.error('Failed to cache idempotency response', error);
        }
      }),
    );
  }
}
