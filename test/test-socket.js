const { io } = require('socket.io-client');

const socket = io('http://localhost:3002', {
  transports: ['websocket'],
  reconnection: false,
});


const auctionId = '04bbca10-f440-4e8c-b313-13601f021c04';
const userId = '3d9a41f8-b070-45df-ae75-14d7d7caa037';

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');

  // Join an auction
  socket.emit('joinAuction', auctionId);
});

socket.on('auctionData', (data) => {
  console.log('📦 Auction data:', data);
});

socket.on('bidUpdate', (data) => {
  console.log('🔼 New bid:', data);
});

socket.on('error', (err) => {
  console.error('❌ Error:', err);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️ Disconnected:', reason);
});

// Simulate placing a bid after 2 seconds
setTimeout(() => {
  socket.emit('placeBid', {
    auctionId,
    userId,
    amount: 270000, // Replace with a valid bid amount
  });
}, 2000);
