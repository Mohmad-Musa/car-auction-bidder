// src/common/guards/ws-throttler.guard.ts
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(WsThrottlerGuard.name);

  // Only apply to WebSocket events
  canActivate(context: ExecutionContext): Promise<boolean> {
    const isWs = context.getType() === 'ws';
    if (!isWs) return Promise.resolve(true); // Skip non-WS requests

    return super.canActivate(context);
  }

  protected async getTracker(context: ExecutionContext): Promise<string> {
    const client = context.switchToWs().getClient();
    const ip = this.extractIp(client);
    const userId = client.handshake.auth?.userId; // Optional auth

    return userId ? `${userId}-${ip}` : ip;
  }

  private extractIp(client: any): string {
    const forwardedFor = client.handshake.headers['x-forwarded-for'];
    return forwardedFor?.split(',')[0].trim() || client.handshake.address;
  }

  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new WsException('Rate limit exceeded'); // WebSocket-friendly error
  }
}