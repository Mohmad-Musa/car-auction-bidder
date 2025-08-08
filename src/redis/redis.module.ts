import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single', // or 'cluster' if using Redis Cluster
        url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        options: {
          reconnectOnError: (err) => {
            console.error('Redis connection error:', err);
            return true;
          },
          // Other ioredis options:
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            return Math.min(times * 50, 2000);
          }
        }
      }),
    }),
  ],
  exports: [RedisModule],
})
export class CustomRedisModule {}