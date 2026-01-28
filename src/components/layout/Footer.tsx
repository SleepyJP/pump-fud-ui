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
                <a href="#" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Twitter/X
                </a>
              </li>
              <li>
                <a href="#" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Telegram
                </a>
              </li>
              <li>
                <a href="#" className="text-text-muted hover:text-fud-green text-xs font-mono transition-colors">
                  Discord
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
