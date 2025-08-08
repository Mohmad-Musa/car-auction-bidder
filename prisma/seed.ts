import { PrismaClient, AuctionStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.car.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const [auctioneer, bidder1, bidder2] = await prisma.$transaction([
    prisma.user.create({
      data: {
        username: 'auction_master',
        email: 'auctioneer@example.com',
      },
    }),
    prisma.user.create({
      data: {
        username: 'car_lover',
        email: 'bidder1@example.com',
      },
    }),
    prisma.user.create({
      data: {
        username: 'auto_fanatic',
        email: 'bidder2@example.com',
      },
    }),
  ]);

  // Create cars with reserve prices
  const [porsche, tesla] = await prisma.$transaction([
    prisma.car.create({
      data: {
        make: 'Porsche',
        model: '911 Turbo S',
        year: 2023,
        description: 'Premium sports car with 640hp',
        imageUrl: 'https://example.com/porsche.jpg',
        reservePrice: 200000, // Added reserve price
      },
    }),
    prisma.car.create({
      data: {
        make: 'Tesla',
        model: 'Model S Plaid',
        year: 2023,
        description: 'Electric performance sedan',
        imageUrl: 'https://example.com/tesla.jpg',
        reservePrice: 120000, // Added reserve price
      },
    }),
  ]);

  // Create auctions (starting now and ending in 7 days)
  const startTime = new Date();
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + 7);

  const [porscheAuction, teslaAuction] = await prisma.$transaction([
    prisma.auction.create({
      data: {
        carId: porsche.id,
        startTime,
        endTime,
        startingBid: 150000,
        currentHighestBid: 150000,
        status: AuctionStatus.ACTIVE,
        ownerId: auctioneer.id,
      },
    }),
    prisma.auction.create({
      data: {
        carId: tesla.id,
        startTime,
        endTime,
        startingBid: 100000,
        currentHighestBid: 100000,
        status: AuctionStatus.ACTIVE,
        ownerId: auctioneer.id,
      },
    }),
  ]);

  // Create initial bids (below reserve price)
  await prisma.$transaction([
    prisma.bid.create({
      data: {
        amount: 155000, // Below Porsche's 200k reserve
        auctionId: porscheAuction.id,
        userId: bidder1.id,
      },
    }),
    prisma.bid.create({
      data: {
        amount: 105000, // Below Tesla's 120k reserve
        auctionId: teslaAuction.id,
        userId: bidder2.id,
      },
    }),
  ]);

  // Create bids that meet reserve prices
  await prisma.$transaction([
    prisma.bid.create({
      data: {
        amount: 210000, // Meets Porsche reserve
        auctionId: porscheAuction.id,
        userId: bidder2.id,
      },
    }),
    prisma.bid.create({
      data: {
        amount: 125000, // Meets Tesla reserve
        auctionId: teslaAuction.id,
        userId: bidder1.id,
      },
    }),
  ]);

  // Update auctions with current bids and status
  await prisma.$transaction([
    prisma.auction.update({
      where: { id: porscheAuction.id },
      data: { 
        currentHighestBid: 210000, 
        winnerId: bidder2.id,
        status: 210000 >= porsche.reservePrice 
          ? AuctionStatus.ENDING_SOON 
          : AuctionStatus.ACTIVE
      },
    }),
    prisma.auction.update({
      where: { id: teslaAuction.id },
      data: { 
        currentHighestBid: 125000, 
        winnerId: bidder1.id,
        status: 125000 >= tesla.reservePrice 
          ? AuctionStatus.ENDING_SOON 
          : AuctionStatus.ACTIVE
      },
    }),
  ]);

  console.log('Database seeded successfully!');
  console.table({
    Users: [auctioneer, bidder1, bidder2],
    Cars: [porsche, tesla],
    Auctions: [porscheAuction, teslaAuction],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });