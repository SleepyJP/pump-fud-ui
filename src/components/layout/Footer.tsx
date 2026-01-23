'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border-primary bg-dark-bg/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-fud-green rounded flex items-center justify-center font-display font-bold text-black text-sm">
                PF
              </div>
              <span className="font-display text-fud-green">PUMP.FUD</span>
            </div>
            <p className="text-text-muted text-xs font-mono leading-relaxed">
              The ultimate memecoin launchpad on PulseChain. Fair launches with bonding curves,
              automatic graduation to PulseX.
            </p>
          </div>

          <div>
            <h4 className="font-display text-text-primary text-sm mb-4">Platform</h4>
            <ul className="space-y-2">
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
            <h4 className="font-display text-text-primary text-sm mb-4">Resources</h4>
            <ul className="space-y-2">
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
            <h4 className="font-display text-text-primary text-sm mb-4">Community</h4>
            <ul className="space-y-2">
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

        <div className="mt-8 pt-8 border-t border-border-primary flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-xs font-mono">
            © 2024 PUMP.FUD. Built by SleepyJ. FUD UP YOUR ASS! 🚀
          </p>
          <p className="text-text-muted text-xs font-mono">
            Treasury: 0x49bB...086B
          </p>
        </div>
      </div>
    </footer>
  );
}
