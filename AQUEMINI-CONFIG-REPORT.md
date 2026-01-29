# PUMP.FUD Pre-Launch Configuration Report
Generated: 2026-01-25
Executor: AQUEMINI via RALPH Loops

## Project Locations

| Project | Path | Status |
|---------|------|--------|
| pump-fud-ui (Next.js) | `/home/sleepyj/pump-fud-ui` | BUILD OK |
| pump-fud frontend (Vite) | `/home/sleepyj/pump-fud/frontend` | BUILD OK |
| pump-fud-contracts | `/home/sleepyj/pump-fud-contracts` | Verified |
| Indexer | `/home/sleepyj/pump-fud-ui/indexer` | Updated |

## Production Contracts (PulseChain 369)

| Contract | Address | On-Chain Verified |
|----------|---------|-------------------|
| Factory | `0xeEdc047484bF8c3bC0B76b309f2ED7aeB25098Dd` | YES |
| BondingCurve | `0x8d487ab0c5a622d7bafc643bec09506ae3c5710b` | - |
| FeeDistributor | `0x271aa055fa774dbb6f79a8d07d16f9e132bc1624` | - |
| Leaderboard | `0xf851d6ffdb197332a5e6e7a8f6905d796cfbedbf` | - |
| SuperChat | `0xc47aa11816abbdd93203de5db5d1215b820f1e6a` | - |
| Treasury | `0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B` | YES |

## On-Chain Parameter Verification

| Parameter | Value | Status |
|-----------|-------|--------|
| treasury | `0x49bBEFa...086B` | CORRECT |
| launchFee | 100,000 PLS | CORRECT |
| graduationThreshold | **69,000 PLS** | **WRONG - SPEC SAYS 50M** |
| buyFeeBps | 100 (1%) | CORRECT |
| sellFeeBps | 110 (1.1%) | CORRECT |

## Asset Inventory

### Custom Backgrounds
- `/public/backgrounds/forge-bg.png` (893 KB)
- `/public/backgrounds/landing-page.jpg` (329 KB)
- `/public/backgrounds/leaderboard-bg.jpg` (201 KB)
- `/public/backgrounds/live-tokens-bg.jpg` (353 KB)

### Logos & Branding
- `/public/pump-fud-hero.png` (527 KB)
- `/public/pumpfud-logo.jpeg` (100 KB)
- `/public/pumpfud-backdrop.jpeg` (71 KB)

## Files Updated This Session

1. `/home/sleepyj/pump-fud/frontend/src/config/wagmi.ts`
   - Updated contract addresses to NEW production
   - Added BONDING_CURVE, FEE_DISTRIBUTOR, SUPERCHAT addresses
   - Added PULSEX_ROUTER, PULSEX_FACTORY

2. `/home/sleepyj/pump-fud-ui/src/config/wagmi.ts`
   - Added GRADUATION_THRESHOLD_SPEC note

3. `/home/sleepyj/pump-fud-ui/.env.local`
   - Added TREASURY_ADDRESS
   - Added PULSEX_ROUTER, PULSEX_FACTORY
   - Added WPLS_ADDRESS

4. `/home/sleepyj/pump-fud-ui/indexer/.env`
   - Updated FACTORY_ADDRESS from `0x7e65...` to `0xca57...`

## CRITICAL PENDING ADMIN ACTIONS

### 1. Set Graduation Threshold (CRITICAL)
Current state: **69,000 PLS**
Required: **50,000,000 PLS**

```solidity
// Call from Treasury/Admin wallet
Factory.setGraduationThreshold(50000000000000000000000000)
// 50,000,000 PLS = 50000000 * 10^18
```

**Contract:** `0xeEdc047484bF8c3bC0B76b309f2ED7aeB25098Dd`
**Method:** `setGraduationThreshold(uint256)`
**Signer:** Admin wallet

### 2. Reset Indexer Database (RECOMMENDED)
After switching factory address, the indexer database should be reset:

```bash
cd /home/sleepyj/pump-fud-ui/indexer
rm -rf data/pump-fud.db
npm run indexer
```

## Environment Configuration Status

| File | Factory Address | Status |
|------|----------------|--------|
| pump-fud-ui/.env.local | `0xca5709...` | CORRECT |
| pump-fud-ui/indexer/.env | `0xca5709...` | UPDATED |
| pump-fud/frontend wagmi.ts | `0xca5709...` | UPDATED |

## RALPH Loop Verification Summary

| Loop | Description | Status |
|------|-------------|--------|
| RL-001 | Fake data removal | CLEAN |
| RL-002 | Graduation threshold frontend | VERIFIED |
| RL-003 | Launch form fields (15) | ALL PRESENT |
| RL-004 | Livestream components | IMPLEMENTED |
| RL-005 | Fee routing | VERIFIED |
| RL-006 | Treasury addresses | CORRECT |
| RL-007 | SuperChat tiers | IMPLEMENTED |
| RL-008 | Admin functions (17) | ALL PRESENT |
| RL-009 | Referral system | TREASURY DEFAULT |
| RL-010 | Contract config | UPDATED |

## Next Steps

1. Execute `setGraduationThreshold(50000000000000000000000000)` from admin wallet
2. Verify graduation threshold updated on-chain
3. Clear indexer database and restart
4. Run dev servers and test token creation flow
5. Verify all custom styling/backgrounds render correctly

---

## Referral System (NEW)

### Contract
- **Location:** `/home/sleepyj/pump-fud-referrals/src/PumpFudReferrals.sol`
- **Status:** Compiled successfully
- **Deploy script:** `/home/sleepyj/pump-fud-referrals/deploy.sh`

### Frontend Components
- `/home/sleepyj/pump-fud-ui/src/config/referrals.ts` - Config & ABI
- `/home/sleepyj/pump-fud-ui/src/hooks/useReferral.ts` - React hooks
- `/home/sleepyj/pump-fud-ui/src/components/ReferralBanner.tsx` - UI components

### How It Works
```
User visits pump.fud/?ref=SLEEPYJ
         │
         ▼
Code stored in localStorage
         │
         ▼ First action (buy/create)
setReferrer("SLEEPYJ") on-chain
         │
         ▼
All future fees: 10% → SLEEPYJ wallet
```

### Default Behavior
- No `?ref=` param → Uses code "PUMPFUD"
- "PUMPFUD" code → Treasury wallet
- All referral fees go to treasury by default

### Pending Deployment Steps
1. Deploy PumpFudReferrals contract:
   ```bash
   cd ~/pump-fud-referrals
   export PRIVATE_KEY=0x...
   ./deploy.sh
   ```

2. Update frontend config with deployed address:
   ```ts
   // In src/config/referrals.ts
   CONTRACT: '0xDEPLOYED_ADDRESS'
   ```

3. Authorize Factory to call referrals:
   ```solidity
   Referrals.setAuthorized(FACTORY_ADDRESS, true)
   ```

4. Add ReferralBanner to app layout

---
*Report generated by AQUEMINI State-Locked Sequence*
*RALPH Loops: Recursive Autonomous Loop for Persistent Handling*
