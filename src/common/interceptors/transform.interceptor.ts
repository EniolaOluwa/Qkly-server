import 'reflect-metadata';
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { finalize, map, Observable } from 'rxjs';

export const IgnoredPropertyName = Symbol('IgnoredPropertyName');

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, ip, url } = request;
    const now = Date.now();
    const timestamp = new Date().toISOString();

    Logger.log(`info ${timestamp} ip: ${ip} method: ${method} url: ${url}`);

    const handler = context.getHandler();
    const controllerClass = context.getClass();

    const isMethodIgnored = Reflect.getMetadata(IgnoredPropertyName, handler) === true;
    const isControllerIgnored = Reflect.getMetadata(IgnoredPropertyName, controllerClass) === true;

    if (isMethodIgnored || isControllerIgnored) {
      return next.handle();
    }

    return next.handle().pipe(
      map((response: any) => {
        let responseData: any = null;
        let responseMessage: string = 'Success';
        let responseMeta: any = null;

        if (response === null || response === undefined) {
          responseData = null;
        } else if (typeof response === 'object') {
          // Check if already has data/message/meta structure
          if ('data' in response || 'message' in response || 'meta' in response) {
            responseData = response.data ?? null;
            responseMessage = response.message ?? 'Success';
            responseMeta = response.meta ?? null;
          } else {
            responseData = response; // preserve objects/arrays
          }
        } else {
          // Primitive types (string, number, boolean)
          responseData = response;
        }

        return {
          success: true,
          data: responseData,
          meta: responseMeta,
          message: responseMessage,
        };
      }),
      finalize(() => {
        Logger.log(`Execution time... ${Date.now() - now}ms`);
      }),
    );
  }
}

export function TransformInterceptorIgnore(): ClassDecorator & MethodDecorator {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      Reflect.defineMetadata(IgnoredPropertyName, true, descriptor.value);
    } else {
      Reflect.defineMetadata(IgnoredPropertyName, true, target);
    }
  };
}
