import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { SocketGateway } from './socket/socket.gateway.js';
import { GroupGateway } from './socket/group/group.gateway.js';
import { PrivateGateway } from './socket/private/private.gateway.js';
import { GroupModule } from './group/group.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'practice 1',
    }),
    AuthModule,
    GroupModule,
  ],
  controllers: [AppController],
  providers: [AppService, SocketGateway, GroupGateway, PrivateGateway],
})
export class AppModule {}
