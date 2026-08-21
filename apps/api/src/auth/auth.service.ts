import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus, type AuthUser, type JwtPayload } from '@sms/shared';
import type { User } from '@sms/database';
import { comparePassword, hashPassword } from '../common/password.util';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ user: AuthUser } & TokenPair> {
    // Emails are stored canonicalized to lowercase — match case-insensitively.
    const user = await this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    await this.prisma.user.updateMany({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { user: this.toAuthUser(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findFirst({ where: { id: payload.sub } });
    if (!user || !user.hashedRefreshToken || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await comparePassword(refreshToken, user.hashedRefreshToken);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: issue a new pair and store the new refresh token hash.
    const tokens = await this.issueTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  /**
   * Changes the caller's own password. Verifies the current password, stores
   * the new hash, clears the must-change flag, and revokes any active refresh
   * token so other sessions must re-authenticate.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        hashedRefreshToken: null,
      },
    });
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as Role,
      schoolId: user.schoolId,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<number>('jwt.accessTtl'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<number>('jwt.refreshTtl'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashed = await hashPassword(refreshToken);
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { hashedRefreshToken: hashed },
    });
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      role: user.role as Role,
      schoolId: user.schoolId,
      email: user.email,
      name: user.name,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
