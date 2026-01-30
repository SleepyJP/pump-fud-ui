'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border-primary bg-dark-bg/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-fud-green rounded flex items-center justify-center font-display font-bold text-black text-xs">
                PF
              </div>
              <span className="font-display text-fud-green text-sm">PUMP.FUD</span>
            </div>
            <p className="text-text-muted text-[10px] font-mono leading-relaxed">
              Memecoin launchpad on PulseChain. Fair launches with bonding curves.
            </p>
          </div>

          <div>
            <h4 className="font-display text-text-primary text-xs mb-2">Platform</h4>
            <ul className="space-y-1">
              <li>
                <Link href="/" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Launch Token
                </Link>
              </li>
              <li>
                <Link href="/tokens" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Browse Tokens
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/rewards" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Claim Rewards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-text-primary text-xs mb-2">Resources</h4>
            <ul className="space-y-1">
              <li>
                <a href="#" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Smart Contracts
                </a>
              </li>
              <li>
                <a href="#" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-text-primary text-xs mb-2">Community</h4>
            <ul className="space-y-1">
              <li>
                <a href="https://x.com/PUMPFUDPLS" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter/X
                </a>
              </li>
              <li>
                <a href="https://t.me/PUMP_dot_FUD" target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border-primary flex justify-center items-center">
          <p className="text-text-muted text-[10px] font-mono">
            © 2024 PUMP.FUD
          </p>
        </div>
      </div>
    </footer>
  );
}
