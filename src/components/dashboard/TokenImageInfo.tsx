'use client';

import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatAddress } from '@/lib/utils';

interface TokenImageInfoProps {
  tokenAddress: `0x${string}`;
  name?: string;
  symbol?: string;
  image?: string;
  description?: string;
  creator?: `0x${string}`;
  socials?: { twitter?: string; telegram?: string; website?: string };
}

export function TokenImageInfo({
  tokenAddress,
  name,
  symbol,
  image,
  description,
  creator,
  socials,
}: TokenImageInfoProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full p-4 flex flex-col">
      {/* Token Image */}
      <div className="flex justify-center mb-3">
        <div className="w-20 h-20 rounded-lg border-2 border-[#39ff14]/50 overflow-hidden bg-black/40">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name || 'Token'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🪙</div>
          )}
        </div>
      </div>

      {/* Name & Symbol */}
      <h2 className="text-[#39ff14] font-bold text-lg text-center">{name || 'Token'}</h2>
      <p className="text-gray-400 text-sm text-center mb-3">${symbol || 'SYMBOL'}</p>

      {/* Description */}
      {description && (
        <p className="text-gray-300 text-xs line-clamp-3 mb-3 text-center">{description}</p>
      )}

      {/* Social Links */}
      {socials && (socials.twitter || socials.telegram || socials.website) && (
        <div className="flex justify-center gap-2 mb-3">
          {socials.twitter && (
            <a
              href={socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs bg-black/40 border border-[#39ff14]/30 rounded text-gray-400 hover:text-[#39ff14] transition-colors"
            >
              Twitter
            </a>
          )}
          {socials.telegram && (
            <a
              href={socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs bg-black/40 border border-[#39ff14]/30 rounded text-gray-400 hover:text-[#39ff14] transition-colors"
            >
              Telegram
            </a>
          )}
          {socials.website && (
            <a
              href={socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs bg-black/40 border border-[#39ff14]/30 rounded text-gray-400 hover:text-[#39ff14] transition-colors"
            >
              Website
            </a>
          )}
        </div>
      )}

      {/* Contract & Creator */}
      <div className="mt-auto space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Contract:</span>
          <button
            onClick={copyAddress}
            className="flex items-center gap-1 text-[#39ff14] hover:underline font-mono"
          >
            {formatAddress(tokenAddress)}
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </button>
        </div>
        {creator && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Creator:</span>
            <a
              href={`https://scan.pulsechain.com/address/${creator}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#39ff14] hover:underline font-mono"
            >
              {formatAddress(creator)}
              <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
