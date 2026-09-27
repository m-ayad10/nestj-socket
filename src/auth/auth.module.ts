import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessTokenGuard } from './access-token.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard],
  exports: [AccessTokenGuard, AuthService],
})
export class AuthModule {}
