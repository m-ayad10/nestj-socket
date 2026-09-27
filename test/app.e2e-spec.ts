import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { ValidationPipe } from '@nestjs/common';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('signs up and rotates the refresh token through HTTP-only cookies', async () => {
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'savan',
        fullname: 'Savan User',
        password: 'correct-horse-battery',
      })
      .expect(201);

    expect(signup.body.user).toEqual({
      id: 1,
      username: 'savan',
      fullname: 'Savan User',
    });
    expect(signup.body).not.toHaveProperty('accessToken');

    const cookies = signup.headers['set-cookie'] as string[];
    const accessCookie = cookies.find((cookie) => cookie.startsWith('access_token='));
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refresh_token='));
    expect(accessCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/auth/refresh');

    const oldRefreshValue = refreshCookie.split(';')[0];
    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshValue)
      .expect(201);
    const rotatedCookies = refreshed.headers['set-cookie'] as string[];
    const rotatedRefreshCookie = rotatedCookies.find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    expect(rotatedRefreshCookie).not.toBe(refreshCookie);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldRefreshValue)
      .expect(401);
  });

  it('rejects invalid signup payloads', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'x', fullname: '', password: 'short' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
