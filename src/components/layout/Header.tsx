'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSiteSettings, isAdminWallet } from '@/stores/siteSettingsStore';

export function Header() {
  const { address } = useAccount();
  const isAdmin = isAdminWallet(address);

  const {
    headerHeight,
    headerLogo,
    headerBackgroundColor,
    headerBackgroundImage,
  } = useSiteSettings();

  const logoContent = headerLogo ? (
    <img
      src={headerLogo}
      alt="PUMP.FUD"
      className="h-full max-h-[80%] object-contain"
    />
  ) : (
    <div className="flex items-center gap-3 group">
      <div className="relative">
        <div className="w-10 h-10 bg-fud-green rounded-lg flex items-center justify-center font-display font-bold text-black text-lg group-hover:animate-neon-pulse">
          PF
        </div>
      </div>
      <div>
        <h1 className="font-display text-xl text-fud-green tracking-wider group-hover:animate-glow">
          PUMP.FUD
        </h1>
        <p className="text-[10px] text-text-muted font-mono">Token Launchpad</p>
      </div>
    </div>
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b border-border-primary transition-all duration-300"
      style={{
        height: `${headerHeight}px`,
        backgroundColor: headerBackgroundImage ? 'transparent' : headerBackgroundColor,
        backgroundImage: headerBackgroundImage ? `url(${headerBackgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {headerBackgroundImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: headerBackgroundColor, opacity: 0.7 }}
        />
      )}

      <div className="relative w-full h-full px-4 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center h-full flex-shrink-0">
          {logoContent}
        </Link>

        {/* Center: Navigation - Links to main app */}
        <nav className="hidden md:flex items-center gap-6 ml-8">
          <a
            href="https://frontend-two-zeta-86.vercel.app/"
            className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
          >
            Launch
          </a>
          <a
            href="https://frontend-two-zeta-86.vercel.app/"
            className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
          >
            Tokens
          </a>
          <a
            href="https://frontend-two-zeta-86.vercel.app/"
            className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
          >
            Leaderboard
          </a>
          <a
            href="https://frontend-two-zeta-86.vercel.app/"
            className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
          >
            Rewards
          </a>
        </nav>

        {/* Right: Wallet */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;

              return (
                <div
                  {...(!mounted && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button onClick={openConnectModal} size="sm">
                          Connect Wallet
                        </Button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <Button onClick={openChainModal} variant="danger" size="sm">
                          Wrong Network
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-secondary border border-border-primary rounded hover:border-fud-green/50 transition-colors"
                        >
                          {chain.hasIcon && chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-4 h-4"
                            />
                          )}
                          <span className="text-xs font-mono text-text-secondary">
                            {chain.name}
                          </span>
                        </button>
                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-2 px-3 py-1.5 bg-fud-green/10 border border-fud-green/30 rounded hover:bg-fud-green/20 transition-colors"
                        >
                          <span className="text-xs font-mono text-fud-green">
                            {account.displayName}
                          </span>
                        </button>
                        <Link
                          href="/profile"
                          className="p-1.5 bg-fud-green/10 border border-fud-green/30 rounded hover:bg-fud-green/20 transition-colors"
                          title="Profile"
                        >
                          <User size={16} className="text-fud-green" />
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/settings"
                            className="p-1.5 bg-fud-purple/10 border border-fud-purple/30 rounded hover:bg-fud-purple/20 transition-colors"
                            title="Admin Settings"
                          >
                            <Settings size={16} className="text-fud-purple" />
                          </Link>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}
