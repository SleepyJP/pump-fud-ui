'use client';

import { formatEther } from 'viem';
import { ExternalLink, Twitter, Globe, Send, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface TokenHeaderProps {
  tokenAddress: `0x${string}`;
  tokenName?: string;
  tokenSymbol?: string;
  imageUri?: string;
  description?: string;
  currentPrice?: bigint;
  totalSupply?: bigint;
  creator?: `0x${string}`;
  plsReserve?: bigint;
}

const GRADUATION_THRESHOLD = BigInt(50_000_000) * BigInt(10) ** BigInt(18); // 50M PLS

export function TokenHeader({
  tokenAddress,
  tokenName,
  tokenSymbol,
  imageUri,
  description,
  currentPrice,
  totalSupply,
  creator,
  plsReserve,
}: TokenHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = plsReserve
    ? Number((plsReserve * BigInt(100)) / GRADUATION_THRESHOLD)
    : 0;

  const formatPrice = (price: bigint | undefined) => {
    if (!price) return '0';
    const formatted = formatEther(price);
    const num = parseFloat(formatted);
    if (num < 0.00000001) return num.toExponential(4);
    if (num < 0.0001) return num.toFixed(10);
    return num.toFixed(8);
  };

  const formatSupply = (supply: bigint | undefined) => {
    if (!supply) return '0';
    const num = Number(formatEther(supply));
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="h-full p-4 flex gap-4 overflow-hidden">
      {/* Left: Token Info */}
      <div className="flex-1 min-w-0">
        {/* Name & Symbol */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-display font-bold truncate">
            {tokenName && tokenName.includes('.') ? (
              <>
                <span className="text-fud-green" style={{ textShadow: '0 0 10px #00ff88' }}>
                  {tokenName.split('.')[0]}
                </span>
                <span className="text-white" style={{ textShadow: '0 0 10px #ffffff' }}>
                  .{tokenName.split('.').slice(1).join('.')}
                </span>
              </>
            ) : (
              <span className="text-fud-green">{tokenName || 'Token'}</span>
            )}
          </h1>
          <span className="text-text-muted font-mono text-sm">{tokenSymbol}</span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-text-muted text-xs font-mono mb-3 line-clamp-2">{description}</p>
        )}

        {/* Social Links */}
        <div className="flex items-center gap-2 mb-3">
          <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-dark-secondary rounded border border-border-primary hover:border-fud-green/50 text-text-muted hover:text-fud-green transition-colors">
            <Twitter size={10} /> Twitter
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-dark-secondary rounded border border-border-primary hover:border-fud-green/50 text-text-muted hover:text-fud-green transition-colors">
            <Send size={10} /> Telegram
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-dark-secondary rounded border border-border-primary hover:border-fud-green/50 text-text-muted hover:text-fud-green transition-colors">
            <Globe size={10} /> Website
          </button>
        </div>

        {/* Contract & Creator */}
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="text-text-muted">Contract:</span>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-fud-green hover:underline"
            >
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
            <a
              href={`https://scan.pulsechain.com/address/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-fud-green"
            >
              <ExternalLink size={10} />
            </a>
          </div>
          {creator && (
            <div className="flex items-center gap-1">
              <span className="text-text-muted">Creator:</span>
              <a
                href={`https://scan.pulsechain.com/address/${creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fud-green hover:underline"
              >
                {creator.slice(0, 6)}...{creator.slice(-4)}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-4">
        <div className="text-center px-3">
          <p className="text-[10px] font-mono text-text-muted mb-1">Price</p>
          <p className="text-sm font-mono text-fud-green font-bold">{formatPrice(currentPrice)} PLS</p>
        </div>
        <div className="text-center px-3 border-l border-border-primary">
          <p className="text-[10px] font-mono text-text-muted mb-1">Supply</p>
          <p className="text-sm font-mono text-text-primary">{formatSupply(totalSupply)}</p>
        </div>
        <div className="text-center px-3 border-l border-border-primary">
          <p className="text-[10px] font-mono text-text-muted mb-1">Reserve</p>
          <p className="text-sm font-mono text-text-primary">{formatSupply(plsReserve)} PLS</p>
        </div>
        <div className="text-center px-3 border-l border-border-primary">
          <p className="text-[10px] font-mono text-text-muted mb-1">Progress</p>
          <p className="text-sm font-mono text-fud-green font-bold">{Math.min(progress, 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Right: Token Image */}
      <div className="flex-shrink-0">
        <div className="w-24 h-24 rounded-xl border-2 border-fud-green/30 overflow-hidden bg-dark-secondary shadow-lg shadow-fud-green/20">
          {imageUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUri}
              alt={tokenName || 'Token'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-4xl">🪙</div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🪙</div>
          )}
        </div>
      </div>

      {/* Progress Bar - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-text-muted">Bonding Progress</span>
          <span className="text-fud-green">{Math.min(progress, 100).toFixed(2)}% / 50M PLS to BOND</span>
        </div>
        <div className="h-2 bg-dark-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-fud-green to-fud-purple transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
