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

    const isIgnored = isMethodIgnored || isControllerIgnored;


    if (isIgnored) {
      return next.handle();
    }

    return next.handle().pipe(
      map((response: any) => {
        if (response == null) {
          return {
            success: true,
            data: null,
            meta: null,
            message: 'Success',
          };
        }

        const { message, meta, data, ...rest } = response;

        return {
          success: response?.success ?? true,
          data: data ?? (Object.keys(rest).length ? rest : null),
          meta: meta ?? null,
          message: message ?? 'Success',
        };
      }),
      finalize(() => {
        Logger.log(`Execution time... ${Date.now() - now}ms`);
      })
    );

  }
}

export function TransformInterceptorIgnore(): ClassDecorator & MethodDecorator {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (descriptor) {
      // Method decorator - attach to the method itself
      Reflect.defineMetadata(IgnoredPropertyName, true, descriptor.value);
    } else {
      // Class decorator - attach to the class constructor
      Reflect.defineMetadata(IgnoredPropertyName, true, target);
    }
  };
}