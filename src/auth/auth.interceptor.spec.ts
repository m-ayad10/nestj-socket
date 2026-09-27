import { AuthInterceptor } from './auth.interceptor.js';

describe('AuthInterceptor', () => {
  it('should be defined', () => {
    expect(new AuthInterceptor()).toBeDefined();
  });
});
