import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const usersFile = resolve(process.cwd(), 'assets', 'users.json');

  beforeEach(async () => {
    await writeFile(usersFile, '[]\n', 'utf8');
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await writeFile(usersFile, '[]\n', 'utf8');
  });

  it('hashes passwords and rejects duplicate usernames', async () => {
    const result = await service.signUpUser({
      username: 'Savan',
      fullname: 'Savan User',
      password: 'correct-horse-battery',
    });

    expect(result.user).toEqual({
      id: 1,
      username: 'Savan',
      fullname: 'Savan User',
    });
    expect(JSON.stringify(result)).not.toContain('correct-horse-battery');
    await expect(
      service.signUpUser({
        username: 'savan',
        fullname: 'Another User',
        password: 'different-password',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('logs in with a valid password and rejects an invalid password', async () => {
    await service.signUpUser({
      username: 'savan',
      fullname: 'Savan User',
      password: 'correct-horse-battery',
    });

    const login = await service.loginUser({
      username: 'SAVAN',
      password: 'correct-horse-battery',
    });
    expect(login.user.username).toBe('savan');
    expect(login.accessToken).toEqual(expect.any(String));
    expect(login.refreshToken).toEqual(expect.any(String));

    await expect(
      service.loginUser({ username: 'savan', password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rotates refresh tokens and rejects replay of the previous token', async () => {
    const initial = await service.signUpUser({
      username: 'savan',
      fullname: 'Savan User',
      password: 'correct-horse-battery',
    });

    const rotated = await service.refreshTokens(initial.refreshToken);
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    await expect(service.refreshTokens(initial.refreshToken)).rejects.toMatchObject({
      status: 401,
    });
    await expect(service.refreshTokens('not-a-jwt')).rejects.toMatchObject({
      status: 401,
    });
  });
});
