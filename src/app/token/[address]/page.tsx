import type { Metadata } from 'next';
import { createPublicClient, http, isAddress } from 'viem';
import TokenPageClient from './TokenPageClient';

const TOKEN_ABI_MINIMAL = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'imageUri',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
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
    const [name, symbol, descriptionRaw, imageUri] = await Promise.all([
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'name' }).catch(() => ''),
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'symbol' }).catch(() => ''),
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'description' }).catch(() => ''),
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'imageUri' }).catch(() => ''),
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

    const cleanSymbol = (symbol || '').replace(/^\$+/, '');

    return { name: name || '', symbol: cleanSymbol, description, imageUri: imageUri || '' };
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
      title: 'Token | PUMP.FUD',
      description: 'View token on PUMP.FUD - Gamified MemeCoin LaunchPad on PulseChain',
    };
  }

  const title = `${token.name} ($${token.symbol}) | PUMP.FUD`;
  const desc = token.description
    ? token.description.slice(0, 200) + (token.description.length > 200 ? '...' : '')
    : `Trade ${token.name} ($${token.symbol}) on PUMP.FUD - PulseChain memecoin launchpad`;

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
      siteName: 'PUMP.FUD',
      images: [
        {
          url: token.imageUri || ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${token.name} ($${token.symbol}) on PUMP.FUD`,
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
      images: [token.imageUri || ogImageUrl],
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
