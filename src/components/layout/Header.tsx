'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Settings, User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSiteSettings, isAdminWallet } from '@/stores/siteSettingsStore';

export function Header() {
  const pathname = usePathname();
  const { address } = useAccount();
  const isAdmin = isAdminWallet(address);

  // Only show full nav on inner pages (not landing page)
  const isLandingPage = pathname === '/';

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
      className="h-10 object-contain"
    />
  ) : (
    <span className="font-display text-2xl font-bold tracking-tight">
      <span className="text-fud-green">PUMP</span>
      <span className="text-white">.FUD</span>
    </span>
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
        {/* Left: Logo - always visible */}
        <Link href="/" className="flex items-center h-full flex-shrink-0">
          {logoContent}
        </Link>

        {/* Center: Navigation - only show on inner pages */}
        {!isLandingPage && (
          <nav className="hidden md:flex items-center gap-6 ml-8">
            <Link
              href="/launch"
              className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
            >
              Launch
            </Link>
            <Link
              href="/tokens"
              className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
            >
              Tokens
            </Link>
            <Link
              href="/leaderboard"
              className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className="text-text-secondary hover:text-fud-green transition-colors font-mono text-sm"
            >
              Profile
            </Link>
          </nav>
        )}

        {/* Right: Socials + Wallet */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Social Links */}
          <a
            href="https://x.com/PUMPFUDPLS"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-text-secondary hover:text-fud-green transition-colors"
            title="Twitter/X"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a
            href="https://t.me/PUMP_dot_FUD"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-text-secondary hover:text-fud-green transition-colors"
            title="Telegram"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
          <div className="w-px h-5 bg-border-primary mx-1 hidden sm:block" />
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
