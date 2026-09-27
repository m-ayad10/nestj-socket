import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    signUpUser: vi.fn(),
    loginUser: vi.fn(),
    refreshTokens: vi.fn(),
  };
  const response = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('sets HTTP-only access and refresh cookies after login', async () => {
    authService.loginUser.mockResolvedValue({
      user: { id: 1, username: 'savan', fullname: 'Savan' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await controller.login(
      { username: 'savan', password: 'password123' },
      response as never,
    );

    expect(result).toEqual({
      success: true,
      user: { id: 1, username: 'savan', fullname: 'Savan' },
    });
    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-token',
      expect.objectContaining({ httpOnly: true, path: '/', sameSite: 'lax' }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth/refresh',
        sameSite: 'lax',
      }),
    );
  });

  it('reads the refresh token from the cookie and rotates auth cookies', async () => {
    authService.refreshTokens.mockResolvedValue({
      user: { id: 1, username: 'savan', fullname: 'Savan' },
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    await controller.refresh(
      { cookies: { refresh_token: 'old-refresh-token' } } as never,
      response as never,
    );

    expect(authService.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('clears auth cookies when refresh fails', async () => {
    authService.refreshTokens.mockRejectedValue(new Error('invalid token'));

    await expect(
      controller.refresh({ cookies: {} } as never, response as never),
    ).rejects.toThrow('invalid token');
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
  });
});
