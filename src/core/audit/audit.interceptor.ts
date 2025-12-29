import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, body, user, ip, headers } = req as any;

    // Only audit mutating methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async () => { // Use tap to log AFTER successful execution
          try {
            const userAgent = headers['user-agent'];
            // Attempt to determine meaningful entity info
            // This is generic; specific logic might be needed for specific routes

            // Extract entity type from URL (e.g., /api/orders -> 'orders')
            const urlParts = url.split('/').filter(p => p);
            const entityType = urlParts.length > 0 ? urlParts[0] : 'UNKNOWN';
            // Better heuristic needed maybe? 
            // e.g. /products/123 -> entityType=products, entityId=123

            await this.auditService.log({
              entityType: entityType.toUpperCase(),
              entityId: 0, // Hard to capture ID generically if not in params/body easily. 
              // Maybe extract from route params if available.
              // For creation (POST), the ID is in the response, which we don't easily access in 'tap' unless we tap the data.
              action: method,
              performedBy: user?.sub || user?.id || null, // Assuming user attached to req
              actorType: user ? 'USER' : 'SYSTEM', // Basic assumption
              ipAddress: ip,
              userAgent: userAgent,
              metadata: { url, body: this.sanitizeBody(body) },
            });

          } catch (err) {
            this.logger.error('Failed to log audit event', err);
          }
        }),
      );
    }

    return next.handle();
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '***';
    // Add other sensitive fields to redact
    return sanitized;
  }
}
