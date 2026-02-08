import { ImageResponse } from 'next/og';
import { createPublicClient, http, isAddress, formatEther } from 'viem';

const TOKEN_ABI_MINIMAL = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'description', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'imageUri', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getCurrentPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'graduated', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'plsReserve', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const pulsechain = {
  id: 369,
  name: 'PulseChain',
  nativeCurrency: { name: 'Pulse', symbol: 'PLS', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.pulsechain.com'] } },
} as const;

function formatSupply(supply: bigint): string {
  const num = Number(formatEther(supply));
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}

function formatPrice(price: bigint): string {
  const num = Number(formatEther(price));
  if (num === 0) return '0';
  if (num < 0.00000001) return num.toExponential(2);
  if (num < 0.0001) return num.toFixed(10);
  return num.toFixed(8);
}

function formatPLS(amount: bigint): string {
  const num = Number(formatEther(amount));
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isAddress(address)) {
    return new Response('Invalid address', { status: 400 });
  }

  const client = createPublicClient({ chain: pulsechain, transport: http('https://rpc.pulsechain.com') });
  const addr = address as `0x${string}`;

  let name = 'Unknown Token';
  let symbol = '???';
  let description = '';
  let imageUri = '';
  let supply = '';
  let price = '';
  let reserve = '';
  let graduated = false;

  try {
    const [n, s, d, i, ts, cp, grad, plsRes] = await Promise.all([
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'name' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'symbol' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'description' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'imageUri' }).catch(() => ''),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'totalSupply' }).catch(() => BigInt(0)),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'getCurrentPrice' }).catch(() => BigInt(0)),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'graduated' }).catch(() => false),
      client.readContract({ address: addr, abi: TOKEN_ABI_MINIMAL, functionName: 'plsReserve' }).catch(() => BigInt(0)),
    ]);

    if (n) name = n;
    if (s) symbol = '$' + s.replace(/^\$+/, '');
    if (d) {
      try {
        const parsed = JSON.parse(d);
        description = parsed.description || '';
      } catch {
        description = d;
      }
    }
    if (i) imageUri = i;
    if (ts) supply = formatSupply(ts);
    if (cp) price = formatPrice(cp);
    if (plsRes) reserve = formatPLS(plsRes);
    graduated = !!grad;
  } catch {
    // Use defaults
  }

  const truncDesc = description.length > 100 ? description.slice(0, 100) + '...' : description;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #080808 0%, #0f1210 50%, #080808 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            backgroundImage: 'repeating-linear-gradient(0deg, #d6ffe0 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #d6ffe0 0px, transparent 1px, transparent 40px)',
            display: 'flex',
          }}
        />

        {/* Left - Token Image */}
        <div
          style={{
            width: '380px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            borderRight: '2px solid #1a2a1e',
            position: 'relative',
          }}
        >
          {imageUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUri}
              alt={name}
              width={340}
              height={340}
              style={{ objectFit: 'contain', borderRadius: '16px', border: '2px solid #1a2a1e' }}
            />
          ) : (
            <div style={{ fontSize: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🪙
            </div>
          )}
        </div>

        {/* Right - Token Info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '36px 44px',
            gap: '12px',
          }}
        >
          {/* PUMP.FUD Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div
              style={{
                background: 'linear-gradient(90deg, #d6ffe0, #4ade80)',
                color: '#000',
                padding: '6px 18px',
                borderRadius: '6px',
                fontSize: '20px',
                fontWeight: 900,
                letterSpacing: '2px',
              }}
            >
              PUMP.FUD
            </div>
            <span style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}>on PulseChain</span>
            {graduated && (
              <div
                style={{
                  marginLeft: 'auto',
                  background: '#d6ffe0',
                  color: '#000',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 900,
                  display: 'flex',
                }}
              >
                GRADUATED
              </div>
            )}
          </div>

          {/* Token Name */}
          <div
            style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#d6ffe0',
              lineHeight: 1.1,
              display: 'flex',
              textShadow: '0 0 40px rgba(214, 255, 224, 0.3)',
            }}
          >
            {name.length > 22 ? name.slice(0, 22) + '...' : name}
          </div>

          {/* Symbol */}
          <div style={{ fontSize: '26px', color: '#888', fontWeight: 700, display: 'flex' }}>
            {symbol}
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginTop: '8px',
              padding: '12px 16px',
              background: 'rgba(214, 255, 224, 0.05)',
              borderRadius: '10px',
              border: '1px solid rgba(214, 255, 224, 0.1)',
            }}
          >
            {supply && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#666', fontWeight: 600, letterSpacing: '1px' }}>SUPPLY</span>
                <span style={{ fontSize: '18px', color: '#fff', fontWeight: 700 }}>{supply}</span>
              </div>
            )}
            {price && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#666', fontWeight: 600, letterSpacing: '1px' }}>PRICE</span>
                <span style={{ fontSize: '18px', color: '#d6ffe0', fontWeight: 700 }}>{price} PLS</span>
              </div>
            )}
            {reserve && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#666', fontWeight: 600, letterSpacing: '1px' }}>RESERVE</span>
                <span style={{ fontSize: '18px', color: '#fff', fontWeight: 700 }}>{reserve} PLS</span>
              </div>
            )}
          </div>

          {/* Description */}
          {truncDesc && (
            <div style={{ fontSize: '16px', color: '#999', lineHeight: 1.5, display: 'flex', marginTop: '4px' }}>
              {truncDesc}
            </div>
          )}

          {/* Bottom: Tagline + Contract */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, fontStyle: 'italic', display: 'flex' }}>
              First the FUD... Then they FOMO. We MAKE Memes.
            </div>
            <div style={{ fontSize: '12px', color: '#444', fontFamily: 'monospace', display: 'flex' }}>
              {address}
            </div>
          </div>
        </div>

        {/* Bottom Gradient Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #d6ffe0, #4ade80, #d6ffe0)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
