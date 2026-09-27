import { ExecutionContext } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenGuard } from './access-token.guard.js';

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [AccessTokenGuard],
    }).compile();

    guard = module.get<AccessTokenGuard>(AccessTokenGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  function contextWithCookie(accessToken?: string): ExecutionContext {
    const request = { cookies: accessToken ? { access_token: accessToken } : {} };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  }

  it('rejects requests without an access token cookie', async () => {
    await expect(guard.canActivate(contextWithCookie())).rejects.toMatchObject({
      status: 401,
    });
  });

  it('attaches the token subject to request.user', async () => {
    const accessToken = await jwtService.signAsync(
      {
        sub: 7,
        username: 'savan',
        type: 'access',
      },
      {
        secret: 'local-access-secret-change-me',
        algorithm: 'HS256',
      },
    );
    const context = contextWithCookie(accessToken);
    const request = context.switchToHttp().getRequest() as {
      user?: { id: number; username: string };
    };

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 7, username: 'savan' });
  });

  it('rejects refresh tokens used as access tokens', async () => {
    const refreshToken = await jwtService.signAsync(
      {
        sub: 7,
        username: 'savan',
        type: 'refresh',
      },
      {
        secret: 'local-access-secret-change-me',
        algorithm: 'HS256',
      },
    );

    await expect(
      guard.canActivate(contextWithCookie(refreshToken)),
    ).rejects.toMatchObject({ status: 401 });
  });
});
