import type { Metadata } from 'next';
import { createPublicClient, http, isAddress } from 'viem';
import TokenPageClient from './TokenPageClient';

const TOKEN_ABI_MINIMAL = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'description', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'imageUri', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getCurrentPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'graduated', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
] as const;

const pulsechain = {
  id: 369,
  name: 'PulseChain',
  nativeCurrency: { name: 'Pulse', symbol: 'PLS', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.pulsechain.com'] } },
} as const;

async function getTokenMetadata(address: string) {
  if (!isAddress(address)) return null;

  const client = createPublicClient({
    chain: pulsechain,
    transport: http('https://rpc.pulsechain.com'),
  });

  try {
    const addr = address as `0x${string}`;
    const [name, symbol, descriptionRaw, imageUri, totalSupply, currentPrice, graduated] = await Promise.all([
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'name' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'symbol' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'description' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'imageUri' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'totalSupply' }).catch(() => BigInt(0)),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'getCurrentPrice' }).catch(() => BigInt(0)),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'graduated' }).catch(() => false),
    ]);

    let description = '';
    if (descriptionRaw) {
      try {
        const parsed = JSON.parse(descriptionRaw);
        description = parsed.description || '';
      } catch {
        description = descriptionRaw;
      }
    }

    const cleanSymbol = '$' + (symbol || '').replace(/^\$+/, '');

    // Format supply for display
    const supplyNum = Number(totalSupply) / 1e18;
    const supplyStr = supplyNum >= 1e9 ? (supplyNum / 1e9).toFixed(1) + 'B'
      : supplyNum >= 1e6 ? (supplyNum / 1e6).toFixed(1) + 'M'
      : supplyNum >= 1e3 ? (supplyNum / 1e3).toFixed(1) + 'K'
      : supplyNum.toFixed(0);

    // Format price
    const priceNum = Number(currentPrice) / 1e18;
    const priceStr = priceNum > 0
      ? (priceNum < 0.00000001 ? priceNum.toExponential(2) : priceNum.toFixed(8))
      : '';

    return {
      name: name || '',
      symbol: cleanSymbol,
      description,
      imageUri: imageUri || '',
      supply: supplyStr,
      price: priceStr,
      graduated: !!graduated,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const token = await getTokenMetadata(address);

  if (!token || !token.name) {
    return {
      title: 'PUMP.FUD | First the FUD... Then they FOMO',
      description: 'Gamified MemeCoin LaunchPad on PulseChain. We MAKE Memes.',
    };
  }

  const title = `${token.name} (${token.symbol}) | PUMP.FUD`;

  // Build rich description with token stats
  const statParts: string[] = [];
  if (token.supply) statParts.push(`Supply: ${token.supply}`);
  if (token.price) statParts.push(`Price: ${token.price} PLS`);
  if (token.graduated) statParts.push('GRADUATED');
  const statsLine = statParts.length > 0 ? statParts.join(' | ') + ' | ' : '';

  const desc = token.description
    ? token.description.slice(0, 160) + (token.description.length > 160 ? '...' : '') + ` | ${statsLine}PUMP.FUD on PulseChain`
    : `${statsLine}Trade ${token.name} (${token.symbol}) on PUMP.FUD — First the FUD... Then they FOMO. We MAKE Memes. PulseChain memecoin launchpad.`;

  const siteUrl = 'https://pump-fud-ui.vercel.app';
  const tokenUrl = `${siteUrl}/token/${address}`;
  const ogImageUrl = `${siteUrl}/api/og/${address}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: tokenUrl,
      siteName: 'PUMP.FUD — First the FUD... Then they FOMO',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${token.name} (${token.symbol}) on PUMP.FUD`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      site: '@PUMPFUDPLS',
      creator: '@PUMPFUDPLS',
      images: [ogImageUrl],
    },
    other: {
      'telegram:channel': 'https://t.me/PUMP_dot_FUD',
    },
  };
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <TokenPageClient address={address} />;
}
