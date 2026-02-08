import { ImageResponse } from 'next/og';
import { createPublicClient, http, isAddress } from 'viem';

const TOKEN_ABI_MINIMAL = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'description', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'imageUri', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
] as const;

const pulsechain = {
  id: 369,
  name: 'PulseChain',
  nativeCurrency: { name: 'Pulse', symbol: 'PLS', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.pulsechain.com'] } },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isAddress(address)) {
    return new Response('Invalid address', { status: 400 });
  }

  const client = createPublicClient({ chain: pulsechain, transport: http('https://rpc.pulsechain.com') });

  let name = 'Unknown Token';
  let symbol = '???';
  let description = '';
  let imageUri = '';

  try {
    const [n, s, d, i] = await Promise.all([
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'name' }).catch(() => ''),
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'symbol' }).catch(() => ''),
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'description' }).catch(() => ''),
      client.readContract({ address: address as `0x${string}`, abi: TOKEN_ABI_MINIMAL, functionName: 'imageUri' }).catch(() => ''),
    ]);

    if (n) name = n;
    if (s) symbol = s.replace(/^\$+/, '');
    if (d) {
      try {
        const parsed = JSON.parse(d);
        description = parsed.description || '';
      } catch {
        description = d;
      }
    }
    if (i) imageUri = i;
  } catch {
    // Use defaults
  }

  const truncDesc = description.length > 120 ? description.slice(0, 120) + '...' : description;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Left - Token Image */}
        <div
          style={{
            width: '400px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            borderRight: '2px solid #1a1a1a',
          }}
        >
          {imageUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUri}
              alt={name}
              width={360}
              height={360}
              style={{ objectFit: 'contain', borderRadius: '16px' }}
            />
          ) : (
            <div
              style={{
                fontSize: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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
            justifyContent: 'center',
            padding: '40px 50px',
            gap: '16px',
          }}
        >
          {/* PUMP.FUD Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(90deg, #d6ffe0, #4ade80)',
                color: '#000',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '2px',
              }}
            >
              PUMP.FUD
            </div>
            <span style={{ color: '#666', fontSize: '16px' }}>on PulseChain</span>
          </div>

          {/* Token Name */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#d6ffe0',
              lineHeight: 1.1,
              display: 'flex',
            }}
          >
            {name.length > 24 ? name.slice(0, 24) + '...' : name}
          </div>

          {/* Symbol */}
          <div
            style={{
              fontSize: '28px',
              color: '#888',
              fontWeight: 600,
              display: 'flex',
            }}
          >
            ${symbol}
          </div>

          {/* Description */}
          {truncDesc && (
            <div
              style={{
                fontSize: '18px',
                color: '#aaa',
                lineHeight: 1.5,
                marginTop: '8px',
                display: 'flex',
              }}
            >
              {truncDesc}
            </div>
          )}

          {/* Contract Address */}
          <div
            style={{
              fontSize: '14px',
              color: '#555',
              marginTop: 'auto',
              fontFamily: 'monospace',
              display: 'flex',
            }}
          >
            {address.slice(0, 10)}...{address.slice(-8)}
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
