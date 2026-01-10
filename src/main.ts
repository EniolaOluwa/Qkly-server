import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { ValidationPipe } from './common/pipes';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { TransformInterceptor } from './common/interceptors';
import { HttpExceptionFilter } from './filters';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { MulterExceptionFilter } from './common/utils/multerError';
import helmet from 'helmet';
import compression from 'compression';


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();
  app.enableCors();

  app.use(express.json({
    limit: '50mb',
    verify: (req: any, res, buf, encoding) => {
      if (req.url && req.url.includes('/webhook')) {
        req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
      }
    }
  }));

  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(compression());
  app.use(helmet());

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(app.get(ConfigService)));
  app.useGlobalFilters(new MulterExceptionFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));


  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('NQkly API')
    .setDescription('The NQkly API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('App', 'Application endpoints')
    .addTag('users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'NQkly API Documentation',
    customfavIcon: 'https://nestjs.com/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    jsonDocumentUrl: '/api/docs-json',
    swaggerOptions: {
      tagsSorter: 'alpha',
      // operationsSorter: 'alpha',
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`OpenAPI JSON available at: http://localhost:${port}/api/docs-json`);
  logger.log(`API endpoints now available under /v1 prefix`);
}

bootstrap();

// https://qkly-server-dev.up.railway.app/v1/payment/webhook
// https://c53b91052641.ngrok-free.app/v1/payment/webhook