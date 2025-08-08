// src/app.module.ts
import { Module } from '@nestjs/common';
import { CustomRedisModule } from './redis/redis.module';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuctionGateway } from './modules/auction/auction.gateway';
import { WsThrottlerGuard } from './common/guards/ws-throttler.guard';
import { WsExceptionFilter } from './common/filters/ws-exception.filter';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 300, 
      limit: 5, // 5 requests
    }]),
    PrismaModule,
    CustomRedisModule,
  ],
  providers: [
    AuctionGateway,
    {
      provide: APP_GUARD,
      useClass: WsThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: WsExceptionFilter,
    },
  ],
})
export class AppModule {}