import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { pulsechain } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import cron from 'node-cron';
import {
  initDatabase,
  getDb,
  getAirdropLeaderboard,
  getTotalPoolContribution,
  getTodayAirdropPool,
} from './database';
import { CHAIN, TREASURY_WALLET } from './config';
import 'dotenv/config';

const DISTRIBUTOR_PRIVATE_KEY = process.env.DISTRIBUTOR_PRIVATE_KEY as `0x${string}`;
const AIRDROP_HOUR = parseInt(process.env.AIRDROP_HOUR || '0', 10);

// Distribution tiers based on ranking
// Top 100 users split the daily user pool proportionally to their contribution
const TOP_RECIPIENTS = 100;

// Minimum distribution amount (0.01 PLS to avoid dust)
const MIN_DISTRIBUTION = parseEther('0.01');

// Create clients
const publicClient = createPublicClient({
  chain: pulsechain,
  transport: http(CHAIN.rpcUrl),
});

let walletClient: ReturnType<typeof createWalletClient> | null = null;

if (DISTRIBUTOR_PRIVATE_KEY) {
  const account = privateKeyToAccount(DISTRIBUTOR_PRIVATE_KEY);
  walletClient = createWalletClient({
    account,
    chain: pulsechain,
    transport: http(CHAIN.rpcUrl),
  });
}

// Calculate distribution amounts
function calculateDistributions(poolAmount: bigint): {
  address: string;
  amount: bigint;
  rank: number;
}[] {
  const leaderboard = getAirdropLeaderboard(TOP_RECIPIENTS);
  const totalContribution = getTotalPoolContribution();

  if (totalContribution === 0n || leaderboard.length === 0) {
    return [];
  }

  const distributions: { address: string; amount: bigint; rank: number }[] = [];

  for (const entry of leaderboard) {
    const contribution = BigInt(entry.userPoolContribution);
    if (contribution === 0n) continue;

    // Proportional share: (user_contribution / total_contribution) * pool_amount
    const share = (contribution * poolAmount) / totalContribution;

    if (share >= MIN_DISTRIBUTION) {
      distributions.push({
        address: entry.address,
        amount: share,
        rank: entry.rank,
      });
    }
  }

  return distributions;
}

// Execute distribution
async function executeDistribution() {
  const db = getDb();

  // Get yesterday's pool (we distribute yesterday's pool today)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const pool = db.prepare(`
    SELECT * FROM airdrop_pool WHERE date = ? AND distributed = 0
  `).get(yesterdayStr) as any;

  if (!pool) {
    console.log(`📅 No undistributed pool for ${yesterdayStr}`);
    return;
  }

  const poolAmount = BigInt(pool.total_user_fees);
  if (poolAmount === 0n) {
    console.log('💰 Pool amount is zero, skipping distribution');
    db.prepare(`
      UPDATE airdrop_pool SET distributed = 1 WHERE id = ?
    `).run(pool.id);
    return;
  }

  console.log('═══════════════════════════════════════');
  console.log(`🎁 AIRDROP DISTRIBUTION: ${yesterdayStr}`);
  console.log(`💰 Pool Amount: ${formatEther(poolAmount)} PLS`);
  console.log('═══════════════════════════════════════');

  const distributions = calculateDistributions(poolAmount);

  if (distributions.length === 0) {
    console.log('❌ No eligible recipients');
    return;
  }

  console.log(`👥 Recipients: ${distributions.length}`);

  if (!walletClient) {
    console.log('⚠️ No wallet configured - dry run mode');
    console.log('\nWould distribute:');
    for (const dist of distributions) {
      console.log(`  #${dist.rank}: ${dist.address} → ${formatEther(dist.amount)} PLS`);
    }

    // Record distributions without tx hash
    for (const dist of distributions) {
      db.prepare(`
        INSERT INTO airdrop_distributions (pool_id, recipient_address, amount, rank)
        VALUES (?, ?, ?, ?)
      `).run(pool.id, dist.address, dist.amount.toString(), dist.rank);

      // Update user's total airdrops received
      db.prepare(`
        UPDATE user_stats
        SET total_airdrops_received = CAST((CAST(total_airdrops_received AS INTEGER) + ?) AS TEXT)
        WHERE address = ?
      `).run(dist.amount.toString(), dist.address);
    }

    db.prepare(`
      UPDATE airdrop_pool SET distributed = 1 WHERE id = ?
    `).run(pool.id);

    return;
  }

  // Execute actual transfers
  const successfulDistributions: typeof distributions = [];
  const failedDistributions: typeof distributions = [];

  for (const dist of distributions) {
    try {
      console.log(`📤 Sending ${formatEther(dist.amount)} PLS to ${dist.address}...`);

      const hash = await walletClient.sendTransaction({
        account: walletClient.account!,
        to: dist.address as `0x${string}`,
        value: dist.amount,
        chain: pulsechain,
      });

      console.log(`   ✅ TX: ${hash}`);

      // Record distribution with tx hash
      db.prepare(`
        INSERT INTO airdrop_distributions (pool_id, recipient_address, amount, rank, tx_hash)
        VALUES (?, ?, ?, ?, ?)
      `).run(pool.id, dist.address, dist.amount.toString(), dist.rank, hash);

      // Update user's total airdrops received
      db.prepare(`
        UPDATE user_stats
        SET total_airdrops_received = CAST((CAST(total_airdrops_received AS INTEGER) + ?) AS TEXT)
        WHERE address = ?
      `).run(dist.amount.toString(), dist.address);

      successfulDistributions.push(dist);

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Failed: ${error}`);
      failedDistributions.push(dist);
    }
  }

  // Mark pool as distributed
  db.prepare(`
    UPDATE airdrop_pool SET distributed = 1 WHERE id = ?
  `).run(pool.id);

  console.log('═══════════════════════════════════════');
  console.log(`✅ Successful: ${successfulDistributions.length}`);
  console.log(`❌ Failed: ${failedDistributions.length}`);
  console.log('═══════════════════════════════════════');

  // If there were failures, retry them next time
  if (failedDistributions.length > 0) {
    console.log('Failed distributions will need manual retry');
  }
}

// Manual distribution trigger
async function manualDistribute(date?: string) {
  const db = getDb();

  if (date) {
    const pool = db.prepare(`
      SELECT * FROM airdrop_pool WHERE date = ?
    `).get(date) as any;

    if (!pool) {
      console.log(`❌ No pool found for ${date}`);
      return;
    }

    if (pool.distributed) {
      console.log(`⚠️ Pool for ${date} already distributed`);
      return;
    }
  }

  await executeDistribution();
}

// View distribution preview
function previewDistribution() {
  const pool = getTodayAirdropPool();
  const poolAmount = BigInt(pool.totalUserFees);

  console.log('═══════════════════════════════════════');
  console.log('📊 DISTRIBUTION PREVIEW');
  console.log(`📅 Date: ${pool.date}`);
  console.log(`💰 Pool: ${formatEther(poolAmount)} PLS`);
  console.log('═══════════════════════════════════════');

  if (poolAmount === 0n) {
    console.log('Pool is empty');
    return;
  }

  const distributions = calculateDistributions(poolAmount);

  console.log(`\n👥 Top ${distributions.length} Recipients:\n`);

  let totalDistributed = 0n;
  for (const dist of distributions.slice(0, 20)) {
    console.log(`  #${dist.rank.toString().padStart(3)}: ${dist.address} → ${formatEther(dist.amount).padStart(15)} PLS`);
    totalDistributed += dist.amount;
  }

  if (distributions.length > 20) {
    console.log(`  ... and ${distributions.length - 20} more recipients`);
    for (const dist of distributions.slice(20)) {
      totalDistributed += dist.amount;
    }
  }

  console.log(`\n📊 Total to distribute: ${formatEther(totalDistributed)} PLS`);
  console.log(`📊 Remainder: ${formatEther(poolAmount - totalDistributed)} PLS`);
}

// Schedule daily distribution
async function scheduleDailyDistribution() {
  console.log('═══════════════════════════════════════');
  console.log('🕐 PUMP.FUD Airdrop Distributor');
  console.log(`⏰ Scheduled: Daily at ${AIRDROP_HOUR}:00 UTC`);
  console.log('═══════════════════════════════════════');

  await initDatabase();

  // Schedule for the configured hour
  cron.schedule(`0 ${AIRDROP_HOUR} * * *`, async () => {
    console.log(`\n⏰ Scheduled distribution triggered at ${new Date().toISOString()}`);
    await executeDistribution();
  }, {
    timezone: 'UTC'
  });

  console.log('✅ Scheduler started. Waiting for next distribution time...');
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'preview':
    initDatabase().then(() => previewDistribution());
    break;

  case 'distribute':
    initDatabase().then(() => manualDistribute(process.argv[3])).then(() => process.exit(0));
    break;

  case 'schedule':
    scheduleDailyDistribution().catch(console.error);
    break;

  default:
    console.log('PUMP.FUD Airdrop Distribution Script');
    console.log('');
    console.log('Usage:');
    console.log('  ts-node distribute.ts preview              - Preview today\'s distribution');
    console.log('  ts-node distribute.ts distribute [date]    - Execute distribution (date: YYYY-MM-DD)');
    console.log('  ts-node distribute.ts schedule             - Start scheduled daily distribution');
    console.log('');
    console.log('Environment:');
    console.log('  DISTRIBUTOR_PRIVATE_KEY - Private key for sending distributions');
    console.log('  AIRDROP_HOUR - Hour (0-23) for daily distribution (default: 0)');
}
