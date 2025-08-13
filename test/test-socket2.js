const { io } = require('socket.io-client');

const socket = io('http://localhost:3003', {
  transports: ['websocket'],
  reconnection: false,
});


const auctionId = '34a973eb-b936-4167-ab9a-17ab47b9a277';
const userId = 'f7a35915-ad0e-401e-8c3a-edf3331085c6';

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
    amount: 3200000, // Replace with a valid bid amount
  });
}, 2000);
