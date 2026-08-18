import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { configuration, validateEnv } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlatformModule } from './platform/platform.module';
import { SchoolModule } from './school/school.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Monorepo: env lives at the repo root. Container envs still win
      // because process.env takes precedence over the file.
      envFilePath: ['../../.env'],
      load: [configuration],
      validate: validateEnv,
    }),
    // Per-request context store — holds the authenticated user's
    // { userId, role, schoolId } so PrismaService can auto-scope tenants.
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    PrismaModule,
    AuthModule,
    PlatformModule,
    SchoolModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
