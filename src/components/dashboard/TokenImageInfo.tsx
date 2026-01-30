'use client';

import { useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ExternalLink, Copy, Check, Twitter, Send, Globe, Flame } from 'lucide-react';
import { TOKEN_ABI } from '@/config/abis';
import { CONSTANTS } from '@/config/wagmi';

// ═══════════════════════════════════════════════════════════════════════════════
// CLEAN TOKEN IMAGE PANEL
// Just the image with minimal overlay - status badge top left
// ═══════════════════════════════════════════════════════════════════════════════

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

  // Parse socials from description
  const socials = useMemo(() => {
    if (!descriptionRaw) return null;
    try {
      const parsed = JSON.parse(descriptionRaw as string);
      return parsed.socials || null;
    } catch {
      return null;
    }
  }, [descriptionRaw]);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string): string => {
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  // Bonding progress
  const GRADUATION_THRESHOLD = CONSTANTS.GRADUATION_THRESHOLD;
  const progress = plsReserve
    ? Math.min(100, Number((plsReserve as bigint) * 100n / GRADUATION_THRESHOLD))
    : 0;

  return (
    <div className="h-full w-full relative bg-black">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CLEAN IMAGE - Full panel */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0">
        {imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUri as string}
            alt={name as string || 'Token'}
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[120px] bg-gradient-to-br from-gray-900 to-black">
            🪙
          </div>
        )}
      </div>

      {/* CLEAN IMAGE - No overlays on top of the image */}

      {/* Socials removed from image - will be shown elsewhere */}

      {/* Contract address removed from image - will be shown elsewhere */}
    </div>
  );
}
