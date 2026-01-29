'use client';

import { useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ExternalLink, Copy, Check, Twitter, Send, Globe } from 'lucide-react';
import { formatAddress } from '@/lib/utils';
import { TOKEN_ABI } from '@/config/abis';

interface TokenImageInfoProps {
  tokenAddress: `0x${string}`;
}

export function TokenImageInfo({ tokenAddress }: TokenImageInfoProps) {
  const [copied, setCopied] = useState(false);

  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'name',
    query: { enabled: !!tokenAddress },
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  });

  const { data: imageUri } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'imageUri',
    query: { enabled: !!tokenAddress },
  });

  const { data: descriptionRaw } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'description',
    query: { enabled: !!tokenAddress },
  });

  const { data: creator } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'creator',
    query: { enabled: !!tokenAddress },
  });

  const { data: graduated } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'graduated',
    query: { enabled: !!tokenAddress },
  });

  const { data: plsReserve } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'plsReserve',
    query: { enabled: !!tokenAddress },
  });

  // Parse description for socials
  const { description, socials } = useMemo(() => {
    if (!descriptionRaw) return { description: '', socials: null };
    try {
      const parsed = JSON.parse(descriptionRaw as string);
      return {
        description: parsed.description || '',
        socials: parsed.socials || null,
      };
    } catch {
      return { description: descriptionRaw as string, socials: null };
    }
  }, [descriptionRaw]);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Bonding progress
  const GRADUATION_THRESHOLD = 50_000_000n * 10n ** 18n;
  const progress = plsReserve
    ? Math.min(100, Number((plsReserve as bigint) * 100n / GRADUATION_THRESHOLD))
    : 0;

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* FULL BACKGROUND IMAGE */}
      <div className="absolute inset-0">
        {imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUri as string}
            alt={name as string || 'Token'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[200px] bg-gradient-to-br from-[#39ff14]/10 to-black">
            🪙
          </div>
        )}
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* OVERLAY CONTENT - Minimal, just bottom */}
      <div className="relative h-full flex flex-col z-10">
        {/* Top - Status + Socials only */}
        <div className="flex justify-between items-start p-3">
          {graduated ? (
            <span className="px-3 py-1 text-xs font-bold bg-[#39ff14]/40 backdrop-blur border border-[#39ff14] text-[#39ff14] rounded-full">
              GRADUATED
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold bg-orange-500/40 backdrop-blur border border-orange-500 text-orange-300 rounded-full animate-pulse">
              BONDING
            </span>
          )}

          {socials && (socials.twitter || socials.telegram || socials.website) && (
            <div className="flex gap-1">
              {socials.twitter && (
                <a href={socials.twitter} target="_blank" rel="noopener noreferrer"
                   className="p-1.5 bg-black/50 backdrop-blur rounded text-gray-400 hover:text-[#39ff14]">
                  <Twitter size={14} />
                </a>
              )}
              {socials.telegram && (
                <a href={socials.telegram} target="_blank" rel="noopener noreferrer"
                   className="p-1.5 bg-black/50 backdrop-blur rounded text-gray-400 hover:text-[#39ff14]">
                  <Send size={14} />
                </a>
              )}
              {socials.website && (
                <a href={socials.website} target="_blank" rel="noopener noreferrer"
                   className="p-1.5 bg-black/50 backdrop-blur rounded text-gray-400 hover:text-[#39ff14]">
                  <Globe size={14} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom - Name, Description, Progress, Contract */}
        <div className="p-4 space-y-3">
          {/* Name & Symbol */}
          <div>
            <h1 className="text-[#39ff14] font-black text-2xl drop-shadow-lg">
              {(name as string) || 'Loading...'}
            </h1>
            <p className="text-gray-300 text-sm font-mono">${(symbol as string) || '...'}</p>
          </div>

          {/* Description */}
          {description && (
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 bg-black/40 backdrop-blur rounded p-2">
              {description}
            </p>
          )}

          {/* Progress Bar (if bonding) */}
          {!graduated && (
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Bonding</span>
                <span className="text-[#39ff14]">{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#39ff14] to-[#00ff88]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Contract + Creator */}
          <div className="flex items-center justify-between text-[10px] font-mono">
            <button onClick={copyAddress} className="flex items-center gap-1 text-[#39ff14] hover:opacity-80">
              {formatAddress(tokenAddress)}
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
            {creator && (
              <a
                href={`https://scan.pulsechain.com/address/${creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-400 hover:text-[#39ff14]"
              >
                {formatAddress(creator as `0x${string}`)}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
