import { WebSocketGateway, WebSocketServer, OnGatewayInit,
      OnGatewayConnection,  OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { UseGuards } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { WsThrottlerGuard } from '../../common/guards/ws-throttler.guard';
import { AuctionStatus } from '@prisma/client';
class BidDto {
  auctionId: string;
  userId: string;
  amount: number;
}

@WebSocketGateway(3003, {
  path: '/socket.io',  // Required for Socket.IO
  transports: ['websocket'],
  serveClient: false,  // Disable static files
  cors: {
    origin: '*',       // Allow all origins for testing
    methods: ['GET', 'POST'],
    credentials: true
  }
})
export class AuctionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
 private auctionTimers: Map<string, NodeJS.Timeout> = new Map();
   constructor(
    @InjectRedis() private readonly redis: Redis, // Correct injection
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    console.log('WebSocket Server running on port 3003');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('connection', { status: 'Connected successfully' });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

//  @UseGuards(WsThrottlerGuard)
  @SubscribeMessage('joinAuction')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() auctionId: string
  ) {
    try {
      client.join(auctionId);
      console.log('Client connected:', client.id);
      console.log('joinAuction received for auction:', auctionId);
      const auction = await this.prisma.auction.findUnique({
        where: { id: auctionId },
        include: { 
          bids: { 
            orderBy: { amount: 'desc' }, 
            take: 5,
            include: { user: true }
          },
          car: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              description: true,
              imageUrl: true,
              reservePrice: true
            }
          }
        }
      });

      if (!auction) {
        return client.emit('error', { message: 'Auction not found' });
      }

      client.emit('auctionData', auction);
    } catch (error) {
      client.emit('error', { 
        message: 'Failed to join auction',
        details: error.message 
      });
    }
  }

@SubscribeMessage('placeBid')
  async handleBid(
    @MessageBody() bidDto: BidDto,
    @ConnectedSocket() client: Socket
  ) {
    try {
      const auction = await this.prisma.auction.findUnique({
        where: { id: bidDto.auctionId },
        include: { 
          car: { select: { reservePrice: true } },
          bids: { orderBy: { amount: 'desc' }, take: 1 }
        }
      });

      if (!auction || !auction.car) {
        throw new Error('Auction not found');
      }

      const currentHighest = auction.bids[0]?.amount || auction.startingBid;
      if (currentHighest >= bidDto.amount) {
        throw new Error(`Bid must be higher than $${currentHighest}`);
      }

      // Clear any existing timer for this auction
      if (this.auctionTimers.has(bidDto.auctionId)) {
        clearTimeout(this.auctionTimers.get(bidDto.auctionId));
        this.auctionTimers.delete(bidDto.auctionId);
      }

      const [bid] = await this.prisma.$transaction([
        this.prisma.bid.create({
          data: {
            amount: bidDto.amount,
            auctionId: bidDto.auctionId,
            userId: bidDto.userId
          },
          include: { user: true }
        }),
        this.prisma.auction.update({
          where: { id: bidDto.auctionId },
          data: {
            currentHighestBid: bidDto.amount,
            winnerId: bidDto.userId,
            ...(bidDto.amount >= auction.car.reservePrice && {
              status: AuctionStatus.ENDING_SOON
            })
          }
        })
      ]);

      this.server.to(bidDto.auctionId).emit('bidUpdate', {
        auctionId: bidDto.auctionId,
        amount: bid.amount,
        user: {
          id: bid.user.id,
          username: bid.user.username
        },
        timestamp: new Date(),
        isReserveMet: bidDto.amount >= auction.car.reservePrice
      });

      await this.redis.publish(
        `auction:${bidDto.auctionId}:bids`, 
        JSON.stringify({
          amount: bidDto.amount,
          userId: bidDto.userId,
          timestamp: new Date()
        })
      );

      // Set a new timer to end the auction in 60 seconds
      this.setAuctionEndTimer(bidDto.auctionId);

      return { success: true };
    } catch (error) {
      client.emit('bidError', {
        message: error.message,
        auctionId: bidDto.auctionId
      });
      return { success: false };
    }
  }

  private async setAuctionEndTimer(auctionId: string) {
    // Clear any existing timer
    if (this.auctionTimers.has(auctionId)) {
      clearTimeout(this.auctionTimers.get(auctionId));
      this.auctionTimers.delete(auctionId);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const updatedAuction = await this.prisma.auction.update({
          where: { id: auctionId },
          data: { status: AuctionStatus.ENDED }
        });

        // Notify all clients that the auction has ended
        this.server.to(auctionId).emit('auctionEnded', {
          auctionId,
          message: `Auction ${auctionId} has ended`,
          winnerId: updatedAuction.winnerId,
          finalPrice: updatedAuction.currentHighestBid
        });

        console.log(`Auction ${auctionId} has been ended`);
      } catch (error) {
        console.error(`Failed to end auction ${auctionId}:`, error);
      } finally {
        this.auctionTimers.delete(auctionId);
      }
    }, 90000); 

    this.auctionTimers.set(auctionId, timer);
  }
}