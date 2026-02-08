'use client';

import { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { WFUD_ADDRESS } from '@/config/wfudAbi';
import { formatAddress } from '@/lib/utils';

export function WFudHero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(WFUD_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-fud-purple/30 bg-gradient-to-r from-fud-purple/10 via-dark-secondary to-fud-green/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(214,255,224,0.1),transparent_50%)]" />

      <div className="relative px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wide">
                <span className="text-fud-purple">w</span>
                <span className="text-fud-green">FUD</span>
              </h1>
              <span className="px-2 py-0.5 bg-fud-purple/20 border border-fud-purple/40 rounded text-fud-purple text-[10px] font-mono uppercase tracking-wider">
                ForgedTaxTokenV3
              </span>
            </div>
            <p className="text-text-secondary text-sm font-mono max-w-md">
              Fee-on-transfer rewarder token with 6-way yield distribution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 bg-dark-tertiary border border-border-primary rounded hover:border-fud-purple/50 transition-colors group"
            >
              <span className="text-xs font-mono text-text-muted group-hover:text-text-secondary">
                {formatAddress(WFUD_ADDRESS)}
              </span>
              {copied ? (
                <Check size={14} className="text-fud-green" />
              ) : (
                <Copy size={14} className="text-text-muted group-hover:text-fud-purple" />
              )}
            </button>
            <a
              href={`https://scan.pulsechain.com/token/${WFUD_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-dark-tertiary border border-border-primary rounded hover:border-fud-green/50 transition-colors text-text-muted hover:text-fud-green"
            >
              <span className="text-xs font-mono">PulseScan</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
