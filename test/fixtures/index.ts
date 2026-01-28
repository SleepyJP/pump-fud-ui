import { faker } from '@faker-js/faker';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES FOR PUMP.FUD DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

// Token fixture factory
export const createTokenFixture = (overrides: Partial<TokenFixture> = {}): TokenFixture => ({
  address: faker.finance.ethereumAddress() as `0x${string}`,
  name: faker.company.name() + ' Token',
  symbol: faker.string.alpha({ length: { min: 3, max: 5 }, casing: 'upper' }),
  image: faker.image.url(),
  description: faker.lorem.sentence(),
  creator: faker.finance.ethereumAddress() as `0x${string}`,
  totalSupply: BigInt(faker.number.bigInt({ min: 1000000n, max: 1000000000000n })),
  currentPrice: BigInt(faker.number.bigInt({ min: 1000000n, max: 100000000000000n })),
  plsReserve: BigInt(faker.number.bigInt({ min: 1000000000000000000n, max: 50000000000000000000000000n })),
  graduated: faker.datatype.boolean(),
  buyCount: faker.number.int({ min: 0, max: 1000 }),
  sellCount: faker.number.int({ min: 0, max: 500 }),
  socials: {
    twitter: faker.datatype.boolean() ? faker.internet.url() : undefined,
    telegram: faker.datatype.boolean() ? faker.internet.url() : undefined,
    website: faker.datatype.boolean() ? faker.internet.url() : undefined,
  },
  ...overrides,
});

// Holder fixture factory
export const createHolderFixture = (overrides: Partial<HolderFixture> = {}): HolderFixture => ({
  address: faker.finance.ethereumAddress() as `0x${string}`,
  balance: BigInt(faker.number.bigInt({ min: 100000000000000000n, max: 100000000000000000000000n })),
  percentage: faker.number.float({ min: 0.01, max: 15, fractionDigits: 2 }),
  ...overrides,
});

// Transaction fixture factory
export const createTransactionFixture = (overrides: Partial<TransactionFixture> = {}): TransactionFixture => ({
  type: faker.helpers.arrayElement(['buy', 'sell'] as const),
  wallet: faker.finance.ethereumAddress() as `0x${string}`,
  amount: BigInt(faker.number.bigInt({ min: 1000000000000000000n, max: 10000000000000000000000n })),
  price: BigInt(faker.number.bigInt({ min: 100000000n, max: 10000000000000n })),
  total: BigInt(faker.number.bigInt({ min: 100000000000000000n, max: 100000000000000000000n })),
  timestamp: faker.date.recent().getTime(),
  txHash: faker.string.hexadecimal({ length: 64, casing: 'lower' }) as `0x${string}`,
  ...overrides,
});

// Message fixture factory
export const createMessageFixture = (overrides: Partial<MessageFixture> = {}): MessageFixture => ({
  sender: faker.finance.ethereumAddress() as `0x${string}`,
  message: faker.lorem.sentence(),
  timestamp: BigInt(faker.date.recent().getTime()),
  tier: BigInt(faker.number.int({ min: 1, max: 5 })),
  amount: BigInt(faker.number.bigInt({ min: 10000000000000000000n, max: 1000000000000000000000n })),
  isMessageBoard: faker.datatype.boolean(),
  ...overrides,
});

// Candle fixture factory
export const createCandleFixture = (time?: number): CandleFixture => {
  const basePrice = faker.number.float({ min: 0.00001, max: 0.001, fractionDigits: 10 });
  const change = faker.number.float({ min: -0.0001, max: 0.0001, fractionDigits: 10 });
  const open = basePrice;
  const close = basePrice + change;
  const high = Math.max(open, close) + faker.number.float({ min: 0, max: 0.00005, fractionDigits: 10 });
  const low = Math.min(open, close) - faker.number.float({ min: 0, max: 0.00005, fractionDigits: 10 });

  return {
    time: time || Math.floor(Date.now() / 1000),
    open,
    high,
    low,
    close,
    volume: faker.number.float({ min: 1000, max: 1000000, fractionDigits: 2 }),
  };
};

// Generate array of candles
export const createCandlesFixture = (count: number, startTime?: number): CandleFixture[] => {
  const start = startTime || Math.floor(Date.now() / 1000) - count * 60;
  return Array.from({ length: count }, (_, i) => createCandleFixture(start + i * 60));
};

// Generate array of holders (sorted by balance)
export const createHoldersFixture = (count: number): HolderFixture[] => {
  const holders = Array.from({ length: count }, () => createHolderFixture());
  return holders.sort((a, b) => Number(b.balance - a.balance));
};

// Generate array of transactions (sorted by timestamp)
export const createTransactionsFixture = (count: number): TransactionFixture[] => {
  const transactions = Array.from({ length: count }, () => createTransactionFixture());
  return transactions.sort((a, b) => b.timestamp - a.timestamp);
};

// Generate array of messages (sorted by timestamp)
export const createMessagesFixture = (count: number, isMessageBoard = false): MessageFixture[] => {
  const messages = Array.from({ length: count }, () =>
    createMessageFixture({ isMessageBoard })
  );
  return messages.sort((a, b) => Number(b.timestamp - a.timestamp));
};

// Types
export interface TokenFixture {
  address: `0x${string}`;
  name: string;
  symbol: string;
  image?: string;
  description?: string;
  creator: `0x${string}`;
  totalSupply: bigint;
  currentPrice: bigint;
  plsReserve: bigint;
  graduated: boolean;
  buyCount: number;
  sellCount: number;
  socials?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export interface HolderFixture {
  address: `0x${string}`;
  balance: bigint;
  percentage: number;
}

export interface TransactionFixture {
  type: 'buy' | 'sell';
  wallet: `0x${string}`;
  amount: bigint;
  price: bigint;
  total: bigint;
  timestamp: number;
  txHash: `0x${string}`;
}

export interface MessageFixture {
  sender: `0x${string}`;
  message: string;
  timestamp: bigint;
  tier: bigint;
  amount: bigint;
  isMessageBoard: boolean;
}

export interface CandleFixture {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
