# PUMP.FUD Session Handoff - January 30, 2026

## Project Overview
- **Project**: PUMP.FUD - Memecoin launchpad on PulseChain
- **Repo**: `~/pump-fud-ui` (Next.js frontend)
- **Live URL**: https://pump-fud-ui.vercel.app
- **Owner**: SleepyJ / THE pHuD FARM

## Deployed Contracts (PulseChain 369)
```
Factory:         0x7e65383639d8418E826a78a2f5C784cd4Bdb92D7
Bonding Curve:   0x8d487ab0c5a622d7bafc643bec09506ae3c5710b
Fee Distributor: 0x212fd8BD0Ca548aDc661749cAA93f6a9403eD31F
Leaderboard:     0xf851d6ffdb197332a5e6e7a8f6905d796cfbedbf
SuperChat:       0xc47aa11816abbdd93203de5db5d1215b820f1e6a
Referrals:       0xcaDa87A9d1025563C976909c13013C9DDc471A17
Treasury:        0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B
```

## Key Fixes Completed This Session

### 1. Admin Access Restricted ✅
- **File**: `src/stores/siteSettingsStore.ts`
- **Change**: Reduced ADMIN_WALLETS to Treasury only
- Admin Settings button now only shows for `0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B`

### 2. Green Color Unified ✅
- **Old**: `#00ff88` (bright lime)
- **New**: `#d6ffe0` (matches logo mint neon)
- Updated in: `tailwind.config.ts`, `siteSettingsStore.ts`, and all components

### 3. Token Image Cleaned Up ✅
- **File**: `src/components/dashboard/TokenImageInfo.tsx`
- Removed overlays (Bonding %, name, symbol, contract address)
- Image is now clean - just the image

### 4. Token Info Moved to Right Column ✅
- **File**: `src/components/dashboard/TokenDashboard.tsx`
- Added info bar above swap panel with: name, symbol, status badge, contract address, socials
- Holders panel made shorter (flex-[2] vs flex-[3] for swap)

### 5. Chart V2 Event Fix ✅ (DEPLOYED - NEEDS VERIFICATION)
- **File**: `src/components/dashboard/ChartPanel.tsx`
- **Problem**: Was looking for OLD event signatures from individual tokens
- **Fix**: Now queries FACTORY for V2 events:
  ```
  event TokenBought(address indexed token, address indexed buyer, uint256 plsIn, uint256 tokensOut, address referrer)
  event TokenSold(address indexed token, address indexed seller, uint256 tokensIn, uint256 plsOut, address referrer)
  ```
- Added `FACTORY_ADDRESS` constant
- Filters by `args: { token: tokenAddress }`

### 6. Indexer V2 Event Fix ✅ (LOCAL - NOT DEPLOYED TO PRODUCTION)
- **File**: `~/pump-fud-ui/indexer/src/indexer.ts`
- Same fix as chart - now listens for V2 events from factory
- Database reset, indexer restarted locally
- **NOTE**: Indexer still running on localhost:3001, not deployed

## Outstanding Issues

### Chart Still Not Showing Candles
- Code is fixed and deployed
- User needs to hard refresh (Ctrl+Shift+R)
- If still not working, may need to debug in browser console
- Check if factory actually has TokenBought/TokenSold events for the token being viewed

### Indexer Not in Production
- Indexer runs locally on port 3001
- Need to deploy to Railway/Render for production
- Currently shows empty leaderboards because it's reading from localhost

### Bumping Feature Requested
- User wants "bump" functionality on Live Tokens list
- When someone buys, token gets bumped to top of list
- Not yet implemented

## File Locations

### Frontend (pump-fud-ui)
```
src/
├── components/
│   ├── dashboard/
│   │   ├── ChartPanel.tsx      # Price chart with V2 events
│   │   ├── TokenDashboard.tsx  # Main dashboard layout
│   │   ├── TokenImageInfo.tsx  # Clean token image
│   │   ├── TradePanel.tsx      # Buy/Sell UI
│   │   └── HoldersPanel.tsx    # Holders list
│   └── token/
│       └── LiveTokensList.tsx  # Browse tokens page
├── stores/
│   └── siteSettingsStore.ts    # Theme + admin config
├── config/
│   ├── wagmi.ts                # Contract addresses
│   ├── abis.ts                 # Contract ABIs
│   └── referrals.ts            # Referral system config
└── hooks/
    ├── useReferral.ts          # Referral hook
    └── useLeaderboard.ts       # Leaderboard data
```

### Indexer (pump-fud-ui/indexer)
```
indexer/
├── src/
│   ├── indexer.ts    # Event listener (V2 FIXED)
│   ├── api.ts        # REST API
│   ├── config.ts     # Fee calculations
│   └── database.ts   # SQLite storage
├── .env              # Config (FACTORY_ADDRESS, etc.)
└── data/             # SQLite database
```

## V2 Contract Event Signatures (CRITICAL)
The V2 PumpFudV2 contract emits events from the FACTORY, not individual tokens:

```solidity
event TokenBought(
    address indexed token,
    address indexed buyer,
    uint256 plsIn,
    uint256 tokensOut,
    address referrer
);

event TokenSold(
    address indexed token,
    address indexed seller,
    uint256 tokensIn,
    uint256 plsOut,
    address referrer
);

event TokenCreated(
    uint256 indexed tokenId,
    address indexed tokenAddress,
    address indexed creator,
    string name,
    string symbol,
    string imageUri
);

event TokenGraduated(
    uint256 indexed tokenId,
    address indexed tokenAddress,
    uint256 liquidityAmount,
    uint256 treasuryFee
);
```

## Next Steps
1. Verify chart candles are working after hard refresh
2. Deploy indexer to production (Railway or Render)
3. **IMPLEMENT BUMP TRACKING** (HIGH PRIORITY)
4. Test referral system end-to-end
5. Verify leaderboard populates once indexer is indexing

## BUMP TRACKING FEATURE (REQUESTED)

### What It Does
When someone buys a token, that token gets "bumped" to the top/front of the Live Tokens list, making it the most relevant/visible.

### Implementation Plan
1. **Track last activity timestamp** for each token (from TokenBought events)
2. **Sort Live Tokens by last activity** (most recent first)
3. **Visual indicator** - show "BUMPED" badge or animation when freshly bumped
4. **Real-time updates** - use WebSocket or polling to show bumps live

### Files to Modify
- `src/components/token/LiveTokensList.tsx` - Add bump sorting logic
- `src/hooks/useTokens.ts` or create `src/hooks/useBumpTracking.ts`
- Query V2 `TokenBought` events to get last activity time per token

### Data Needed Per Token
```typescript
interface TokenWithBump {
  address: string;
  name: string;
  symbol: string;
  lastBumpTime: number;  // Unix timestamp of last buy
  lastBuyer: string;     // Address that caused the bump
  bumpCount: number;     // Total buys (bumps) today
}
```

### Sort Order
```typescript
// Sort by most recent activity (bump) first
tokens.sort((a, b) => b.lastBumpTime - a.lastBumpTime);
```

## Commands

```bash
# Build & Deploy UI
cd ~/pump-fud-ui && npm run build && vercel --prod --yes

# Run Indexer Locally
cd ~/pump-fud-ui/indexer && node dist/index.js

# Check Indexer API
curl http://localhost:3001/api/leaderboard/airdrop
curl http://localhost:3001/api/pool/today
```

---
*Generated by AQUEMINI - 2026-01-30*
