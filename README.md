# Live Car Bidding System - Assessment Solution

## Overview
This NestJS application implements a real-time car auction system with WebSocket functionality, PostgreSQL database, Redis for pub/sub messaging, and Docker containerization.

## Features Implemented
✅ **WebSocket Gateway**:
- Real-time bidding with `joinAuction`, `placeBid`, and `auctionEnd` events
- Socket.IO integration for efficient client communication

✅ **Database**:
- PostgreSQL with Prisma ORM
- Transactional bid processing
- Concurrency management

✅ **Redis Pub/Sub**:
- Real-time bid broadcasting
- Channel-based updates for each auction

✅ **Rate Limiting**:
- IP-based request throttling (commented for local testing)

✅ **Dockerized**:
- Ready-to-run containers for all services

## Important Notes
### Rate Limiting Guard
The `WsThrottlerGuard` is implemented but currently commented out:
```typescript
 @UseGuards(WsThrottlerGuard)

Reason:
Local testing with Docker can trigger false positives because all requests appear to come from the same Docker network IP.

For Production:

Uncomment the guard

Configure proper IP resolution:

typescript
protected getTracker(context: ExecutionContext) {
  const client = context.switchToWs().getClient();
  return client.handshake.headers['x-real-ip'] || client.handshake.address;
}
Set appropriate rate limits in app.module.ts

Getting Started
Prerequisites
Docker

Docker Compose

Node.js (v16+)

Installation
bash
after cloning the repo
docker-compose up -d

Monitor Redis messages:

bash
docker-compose exec redis redis-cli monitor
Technical Details
Ports:

API: 3000

WebSocket: 3002

PostgreSQL: 5432

Redis: 6379

Environment Defaults:

Database: postgresql://postgres:postgres@db:5432/car_auction

Redis: redis://redis:6379

Assessment Requirements Met
✔ WebSocket implementation
✔ Real-time bid broadcasting
✔ Database transactions
✔ Concurrency control
✔ Redis integration
✔ Docker deployment
✔ Rate limiting (implemented)
