'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function SharePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Hero Image */}
      <div className="relative w-full max-w-md mb-8">
        <Image
          src="/og-image.jpg"
          alt="PUMP.FUD - Memecoin Launchpad on PulseChain"
          width={1200}
          height={1200}
          className="w-full rounded-2xl border-2 border-fud-green/50 shadow-2xl shadow-fud-green/20"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="font-display text-4xl md:text-5xl text-fud-green mb-2 text-center tracking-wider">
        PUMP.FUD
      </h1>
      <p className="text-text-muted font-mono text-sm mb-8 text-center max-w-sm">
        The ultimate memecoin launchpad on PulseChain. Fair launches with bonding curves.
      </p>

      {/* Social Links */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Launch App */}
        <Link
          href="/"
          className="flex items-center justify-center gap-3 bg-fud-green text-black font-display font-bold py-4 px-6 rounded-xl hover:bg-fud-green/90 transition-all hover:scale-105 text-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          LAUNCH APP
        </Link>

        {/* Twitter/X */}
        <a
          href="https://x.com/PUMPFUDPLS"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-dark-card border border-border-primary text-text-primary font-display font-bold py-4 px-6 rounded-xl hover:border-fud-green hover:text-fud-green transition-all hover:scale-105 text-lg"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          TWITTER / X
        </a>

        {/* Telegram */}
        <a
          href="https://t.me/PUMP_dot_FUD"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-dark-card border border-border-primary text-text-primary font-display font-bold py-4 px-6 rounded-xl hover:border-fud-green hover:text-fud-green transition-all hover:scale-105 text-lg"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          TELEGRAM
        </a>

        {/* Browse Tokens */}
        <Link
          href="/tokens"
          className="flex items-center justify-center gap-3 bg-dark-card border border-border-primary text-text-primary font-display font-bold py-4 px-6 rounded-xl hover:border-fud-green hover:text-fud-green transition-all hover:scale-105 text-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          BROWSE TOKENS
        </Link>
      </div>

      {/* Tagline */}
      <p className="mt-10 text-fud-green font-display text-xl tracking-widest animate-pulse">
        FUD UP YOUR ASS
      </p>

      {/* Chain Badge */}
      <div className="mt-6 flex items-center gap-2 text-text-muted text-xs font-mono">
        <div className="w-2 h-2 bg-fud-green rounded-full animate-pulse"></div>
        Live on PulseChain
      </div>
    </div>
  );
}
