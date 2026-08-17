import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role, UserStatus, type AuthUser, type JwtPayload } from '@sms/shared';
import { ClsService } from 'nestjs-cls';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CLS_ROLE, CLS_SCHOOL_ID, CLS_USER_ID } from '../../common/cls-keys';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') as string,
    });
  }

  /**
   * Runs on every authenticated request. Populates the CLS store so
   * PrismaService can tenant-scope queries, then returns the principal
   * that Nest attaches to `request.user`.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    this.cls.set(CLS_USER_ID, user.id);
    this.cls.set(CLS_ROLE, user.role);
    this.cls.set(CLS_SCHOOL_ID, user.schoolId ?? undefined);

    return {
      id: user.id,
      role: user.role as Role,
      schoolId: user.schoolId,
      email: user.email,
      name: user.name,
    };
  }
}
