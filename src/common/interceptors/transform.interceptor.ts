import 'reflect-metadata';
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { finalize, map, Observable } from 'rxjs';

export const IgnoredPropertyName = Symbol('IgnoredPropertyName');

export interface HttpResponseWrapper {
  data?: any;
  message?: string;
  meta?: any;
  statusCode?: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
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
      map((res: any) => {
        // If response is already a wrapper object, use it
        const wrapper: HttpResponseWrapper = typeof res === 'object' && ('data' in res || 'message' in res || 'meta' in res || 'statusCode' in res)
          ? res
          : { data: res };

        const responseData = wrapper.data ?? null;
        const responseMessage = wrapper.message ?? 'Success';
        const responseMeta = wrapper.meta ?? null;
        const statusCode = wrapper.statusCode;

        if (statusCode) {
          response.status(statusCode);
        } else if (method === 'DELETE' && (res === null || res === undefined)) {
          response.status(204);
          return null;
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
      })
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
