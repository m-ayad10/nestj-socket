import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TokenPayloadDto } from './dto/auth.dto.js';

export type AuthenticatedRequest = Request & {
  user: {
    id: number;
    username: string;
  };
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TokenPayloadDto>(token, {
        secret: this.getAccessSecret(),
        algorithms: ['HS256'],
      });

      if (payload.type !== 'access' || typeof payload.sub !== 'number') {
        throw new UnauthorizedException('Invalid access token');
      }

      request.user = {
        id: payload.sub,
        username: payload.username,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private getAccessSecret(): string {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (secret) {
      return secret;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Access token secret is not configured');
    }
    return 'local-access-secret-change-me';
  }
}
