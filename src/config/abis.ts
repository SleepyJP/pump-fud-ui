// ═══════════════════════════════════════════════════════════════════════════
// PUMP.FUD V4 FACTORY ABI - 0x997bDE122A1A3c977Bf84EE95e022e9dd86952c7
// V4: Admin whitelist (fee exempt), multi-router (PulseX V2 + Paisley Smart)
// Uses getTokens(offset, limit), allTokensLength(), allTokens(index)
// Has launchFee() getter, isFeeExempt(address) for whitelist check
// ═══════════════════════════════════════════════════════════════════════════
export const FACTORY_ABI = [
  // V2 createToken - order: name, symbol, imageUri, description, referrer
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'string', name: 'imageUri', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'address', name: 'referrer', type: 'address' },
    ],
    name: 'createToken',
    outputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    stateMutability: 'payable',
    type: 'function',
  },
  // V2 createTokenAndBuy - create + initial buy in ONE transaction
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'string', name: 'imageUri', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'address', name: 'referrer', type: 'address' },
      { internalType: 'uint256', name: 'minTokensOut', type: 'uint256' },
    ],
    name: 'createTokenAndBuy',
    outputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokensBought', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'deleteToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allTokensLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
    ],
    name: 'getTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'isToken',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenCreator',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'launchFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'graduationThreshold',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'bondingCurve',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'string', name: 'symbol', type: 'string' },
      { indexed: false, internalType: 'address', name: 'referrer', type: 'address' },
    ],
    name: 'TokenCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'plsSpent', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'tokensReceived', type: 'uint256' },
    ],
    name: 'InitialBuy',
    type: 'event',
  },
] as const;

// PumpFudToken ABI - V2 token with bonding curve logic INSIDE the token
export const TOKEN_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'minTokens', type: 'uint256' }],
    name: 'buy',
    outputs: [{ internalType: 'uint256', name: 'tokensBought', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'minPls', type: 'uint256' },
    ],
    name: 'sell',
    outputs: [{ internalType: 'uint256', name: 'plsReceived', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'creator',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'imageUri',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'plsReserve',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'graduated',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deleted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getGraduationProgress',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Chat/Board permissions
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'canChat',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'canPost',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ERC20 standard
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events - FIXED: referrer is also indexed in the actual contract
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'plsSpent', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'tokensBought', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'referrer', type: 'address' },
    ],
    name: 'TokenBought',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'tokensSold', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'plsReceived', type: 'uint256' },
    ],
    name: 'TokenSold',
    type: 'event',
  },
] as const;

// BondingCurve ABI
export const BONDING_CURVE_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'currentSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'plsAmount', type: 'uint256' },
    ],
    name: 'calculatePurchaseReturn',
    outputs: [{ internalType: 'uint256', name: 'tokens', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'currentSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenAmount', type: 'uint256' },
    ],
    name: 'calculateSaleReturn',
    outputs: [{ internalType: 'uint256', name: 'pls', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'currentSupply', type: 'uint256' }],
    name: 'getCurrentPrice',
    outputs: [{ internalType: 'uint256', name: 'price', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

export const SUPERCHAT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'string', name: 'message', type: 'string' },
      { internalType: 'bool', name: 'isMessageBoard', type: 'bool' },
    ],
    name: 'sendSuperChat',
    outputs: [{ internalType: 'uint256', name: 'messageId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
    ],
    name: 'getTokenSuperChats',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'string', name: 'message', type: 'string' },
          { internalType: 'uint256', name: 'tier', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'bool', name: 'isMessageBoard', type: 'bool' },
        ],
        internalType: 'struct ISuperChat.SuperChatMessage[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const LEADERBOARD_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'limit', type: 'uint256' }],
    name: 'getVolumeLeaderboard',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'volume', type: 'uint256' },
        ],
        internalType: 'struct ILeaderboard.VolumeEntry[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserVolume',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// DEPRECATED - Old claim-based distributor
export const FEE_DISTRIBUTOR_ABI = [
  {
    inputs: [],
    name: 'claim',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getClaimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// NEW - Auto-airdrop FeeCollector (no claims)
export const FEE_COLLECTOR_ABI = [
  // Constants
  { inputs: [], name: 'TREASURY', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'TREASURY_BPS', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'USER_BPS', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'MAX_BATCH_SIZE', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  // State
  { inputs: [], name: 'treasuryPool', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'userPool', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'treasuryThreshold', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'userThreshold', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'currentEpoch', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  // User info
  { inputs: [{ type: 'address' }], name: 'userReferrer', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }], name: 'hasReferrer', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }], name: 'authorized', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  // Epoch tracking
  { inputs: [{ type: 'uint256' }, { type: 'address' }], name: 'epochVolume', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }], name: 'totalEpochVolume', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }], name: 'epochUserPool', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }], name: 'epochFullyDistributed', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }], name: 'epochDistributionIndex', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  // View functions
  { inputs: [{ type: 'uint256' }], name: 'getEpochTraderCount', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], name: 'getEpochTraders', outputs: [{ type: 'address[]' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'uint256' }], name: 'getDistributionProgress', outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }], name: 'getUserEstimatedShare', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }, { type: 'uint256' }], name: 'getUserEpochInfo', outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }], name: 'getCurrentEpochVolume', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getCurrentEpochTotalVolume', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getPoolBalances', outputs: [{ type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getCurrentEpochInfo', outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view', type: 'function' },
  // Write functions (for admin/continue airdrop)
  { inputs: [{ type: 'uint256' }], name: 'continueAirdrop', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ type: 'uint256' }, { type: 'uint256' }], name: 'airdropMultipleBatches', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'distributeTreasury', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'finalizeEpoch', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  // Events
  { anonymous: false, inputs: [{ indexed: true, type: 'address' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }], name: 'FeeReceived', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, type: 'address' }, { indexed: false, type: 'uint256' }, { indexed: true, type: 'address' }, { indexed: false, type: 'uint256' }], name: 'TradeRecorded', type: 'event' },
  { anonymous: false, inputs: [{ indexed: false, type: 'uint256' }], name: 'TreasuryDistributed', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }], name: 'UserEpochFinalized', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, type: 'address' }, { indexed: true, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: true, type: 'address' }, { indexed: false, type: 'uint256' }], name: 'AirdropSent', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }], name: 'AirdropBatchComplete', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, type: 'uint256' }, { indexed: false, type: 'uint256' }, { indexed: false, type: 'uint256' }], name: 'EpochFullyDistributed', type: 'event' },
] as const;
