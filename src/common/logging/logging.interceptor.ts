import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body } = request;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();
    
    // Generate unique request ID
    const requestId = uuidv4();
    
    // Attach request ID to the request object for potential use in controllers
    (request as any).requestId = requestId;

    // Log request
    this.logger.log(
      `[${requestId}] REQUEST: ${method} ${url} - User-Agent: ${userAgent} - Body: ${JSON.stringify(body)}`
    );

    return next.handle().pipe(
      tap((responseBody) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const { statusCode } = response;

        // Log successful response
        this.logger.log(
          `[${requestId}] RESPONSE: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - Body: ${JSON.stringify(responseBody)}`
        );
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = error.status || error.statusCode || 500;

        // Log error response
        this.logger.error(
          `[${requestId}] ERROR RESPONSE: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - Error: ${error.message || 'Unknown error'} - Body: ${JSON.stringify(error.response || error)}`
        );

        // Re-throw the error to maintain normal error handling flow
        return throwError(() => error);
      })
    );
  }
}