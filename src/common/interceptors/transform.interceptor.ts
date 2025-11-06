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

    // Check if method has the ignore flag
    const isMethodIgnored = Reflect.getMetadata(IgnoredPropertyName, handler) === true;

    // Check if controller class has the ignore flag
    const isControllerIgnored = Reflect.getMetadata(IgnoredPropertyName, controllerClass) === true;

    const isIgnored = isMethodIgnored || isControllerIgnored;

    console.log({
      isIgnored,
      isMethodIgnored,
      isControllerIgnored,
      handler: handler.name,
      controller: controllerClass.name
    });

    if (isIgnored) {
      return next.handle();
    }

    return next.handle().pipe(
      map((response: any) => ({
        success: response?.success ?? true,
        data: response?.data ?? response,
        meta: response?.meta ?? null,
        message: response?.message ?? 'Success',
      })),
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