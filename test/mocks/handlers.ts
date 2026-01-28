import { http, HttpResponse } from 'msw';

// ═══════════════════════════════════════════════════════════════════════════════
// MSW MOCK HANDLERS FOR PUMP.FUD DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_TOKEN_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

// Mock token metadata
const mockTokenMetadata = {
  address: MOCK_TOKEN_ADDRESS,
  name: 'Test Token',
  symbol: 'TEST',
  image: 'https://example.com/token.png',
  description: 'A test token for unit testing the PUMP.FUD dashboard',
  creator: '0xabcdef1234567890abcdef1234567890abcdef12',
  totalSupply: '1000000000000000000000000000',
  currentPrice: '1000000000000',
  plsReserve: '5000000000000000000000000',
  graduated: false,
  buyCount: 42,
  sellCount: 13,
  socials: {
    twitter: 'https://twitter.com/testtoken',
    telegram: 'https://t.me/testtoken',
    website: 'https://testtoken.com',
  },
};

// Mock holders
const mockHolders = [
  { address: '0x1111111111111111111111111111111111111111', balance: '100000000000000000000000000', percentage: 10 },
  { address: '0x2222222222222222222222222222222222222222', balance: '50000000000000000000000000', percentage: 5 },
  { address: '0x3333333333333333333333333333333333333333', balance: '25000000000000000000000000', percentage: 2.5 },
  { address: '0x4444444444444444444444444444444444444444', balance: '10000000000000000000000000', percentage: 1 },
  { address: '0x5555555555555555555555555555555555555555', balance: '5000000000000000000000000', percentage: 0.5 },
];

// Mock transactions
const mockTransactions = [
  {
    type: 'buy',
    wallet: '0x1111111111111111111111111111111111111111',
    amount: '1000000000000000000000',
    price: '1000000000000',
    total: '1000000000000000',
    timestamp: Date.now() - 60000,
    txHash: '0xabc123',
  },
  {
    type: 'sell',
    wallet: '0x2222222222222222222222222222222222222222',
    amount: '500000000000000000000',
    price: '1100000000000',
    total: '550000000000000',
    timestamp: Date.now() - 120000,
    txHash: '0xdef456',
  },
  {
    type: 'buy',
    wallet: '0x3333333333333333333333333333333333333333',
    amount: '2000000000000000000000',
    price: '900000000000',
    total: '1800000000000000',
    timestamp: Date.now() - 180000,
    txHash: '0xghi789',
  },
];

// Mock messages
const mockMessages = [
  {
    sender: '0x1111111111111111111111111111111111111111',
    message: 'First post! 🚀',
    timestamp: BigInt(Date.now() - 300000),
    tier: BigInt(3),
    amount: BigInt('100000000000000000000'),
    isMessageBoard: true,
  },
  {
    sender: '0x2222222222222222222222222222222222222222',
    message: 'This token is going to the moon!',
    timestamp: BigInt(Date.now() - 200000),
    tier: BigInt(4),
    amount: BigInt('500000000000000000000'),
    isMessageBoard: true,
  },
];

// Mock chat messages
const mockChatMessages = [
  {
    sender: '0x1111111111111111111111111111111111111111',
    message: 'Hey everyone!',
    timestamp: BigInt(Date.now() - 60000),
    tier: BigInt(1),
    amount: BigInt('10000000000000000000'),
    isMessageBoard: false,
  },
  {
    sender: '0x2222222222222222222222222222222222222222',
    message: 'Buying more!',
    timestamp: BigInt(Date.now() - 30000),
    tier: BigInt(2),
    amount: BigInt('50000000000000000000'),
    isMessageBoard: false,
  },
];

// Mock OHLCV candle data
const mockCandles = Array.from({ length: 100 }, (_, i) => {
  const time = Math.floor(Date.now() / 1000) - (100 - i) * 60;
  const open = 0.0001 + Math.random() * 0.00001;
  const close = open + (Math.random() - 0.5) * 0.00002;
  const high = Math.max(open, close) + Math.random() * 0.000005;
  const low = Math.min(open, close) - Math.random() * 0.000005;
  return { time, open, high, low, close, volume: Math.random() * 1000000 };
});

export const handlers = [
  // Token metadata endpoint
  http.get('/api/tokens/:address', ({ params }) => {
    return HttpResponse.json({
      ...mockTokenMetadata,
      address: params.address,
    });
  }),

  // Holders endpoint
  http.get('/api/holders/:address', () => {
    return HttpResponse.json(mockHolders);
  }),

  // Transactions endpoint
  http.get('/api/transactions/:address', () => {
    return HttpResponse.json(mockTransactions);
  }),

  // Messages endpoint
  http.get('/api/messages/:address', () => {
    return HttpResponse.json([...mockMessages, ...mockChatMessages]);
  }),

  // Candles endpoint
  http.get('/api/candles/:address', ({ request }) => {
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '1m';
    return HttpResponse.json({
      timeframe,
      candles: mockCandles,
    });
  }),

  // Price endpoint
  http.get('/api/price/:address', () => {
    return HttpResponse.json({
      price: mockTokenMetadata.currentPrice,
      change24h: 5.5,
      high24h: '1200000000000',
      low24h: '800000000000',
    });
  }),

  // Post message endpoint
  http.post('/api/messages/:address', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: body,
    });
  }),
];

// Export mock data for direct use in tests
export const mockData = {
  tokenMetadata: mockTokenMetadata,
  holders: mockHolders,
  transactions: mockTransactions,
  messages: mockMessages,
  chatMessages: mockChatMessages,
  candles: mockCandles,
};
