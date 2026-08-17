import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const prefix = config.get<AppConfig['globalPrefix']>('globalPrefix') ?? 'api';
  const corsOrigin = config.get<AppConfig['corsOrigin']>('corsOrigin') ?? ['*'];
  const port = config.get<AppConfig['port']>('port') ?? 4000;

  app.setGlobalPrefix(prefix);
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
  Logger.log(`API ready at http://localhost:${port}/${prefix}`, 'Bootstrap');
}

void bootstrap();
