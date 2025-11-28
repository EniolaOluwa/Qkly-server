import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from './common/pipes';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { TransformInterceptor } from './common/interceptors';
import { HttpExceptionFilter } from './filters';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(express.json({
    limit: '50mb',
    verify: (req: any, res, buf, encoding) => {
      if (req.url && req.url.includes('/webhook')) {
        req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
      }
    }
  }));

  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(app.get(ConfigService)));

  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('NQkly API')
    .setDescription('The NQkly API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('app', 'Application endpoints')
    .addTag('users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'NQkly API Documentation',
    customfavIcon: 'https://nestjs.com/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    jsonDocumentUrl: '/api/docs-json', // This exposes the JSON
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`OpenAPI JSON available at: http://localhost:${port}/api/docs-json`);
  console.log(`API endpoints now available under /v1 prefix`);
}

bootstrap();