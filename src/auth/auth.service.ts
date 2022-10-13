import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto, SignupDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async signin(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }
    const isPasswordMatch = await argon2.verify(user.hash, dto.password);
    if (!isPasswordMatch) {
      throw new ForbiddenException('Invalid credentials');
    }

    return this.signToken(user.id, user.email);
  }
  async signup(dto: SignupDto) {
    try {
      const hash = await argon2.hash(dto.password);
      const user = await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          email: dto.email,
          lastName: dto.lastName,
          hash,
        },
      });

      return {
        message: 'User created successfully',
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('User already exists');
        }
      } else throw error;
    }
  }

  async getTokens(payload: { id: number; email: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      await this.jwt.signAsync(payload, {
        expiresIn: '15m',
        secret: this.config.get('JWT_ACCESS_TOKEN_SECRET'),
      }),
      await this.jwt.signAsync(payload, {
        expiresIn: '7w',
        secret: this.config.get('JWT_REFRESH_TOKEN_SECRET'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async signToken(
    userId: number,
    email: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      id: userId,
      email,
    };
    const token = await this.getTokens(payload);
    const hashedRT = await argon2.hash(token.refreshToken);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRT: hashedRT,
      },
    });
    return token;
  }

  async logout(user: User) {
    try {
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          hashedRT: {
            not: null,
          },
        },
        data: {
          hashedRT: null,
        },
      });
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw error;
    }
  }

  async refreshTokens(user: User) {
    try {
      const _user = await this.prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });

      if (!_user) throw new ForbiddenException('User not found');
      const rtMatches = await argon2.verify(_user.hashedRT, user.hashedRT);
      if (!rtMatches) throw new ForbiddenException('Access denied');
      const payload = {
        id: user.id,
        email: user.email,
      };
      const token = await this.getTokens(payload);
      const hashedRT = await argon2.hash(token.refreshToken);
      await this.prisma.user.update({
        where: {
          id: _user.id,
        },
        data: {
          hashedRT: hashedRT,
        },
      });
      return token;
    } catch (error) {
      throw error;
    }
  }
}
