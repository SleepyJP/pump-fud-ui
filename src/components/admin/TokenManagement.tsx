'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { Trash2, RefreshCw, ExternalLink, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FACTORY_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress } from '@/lib/utils';
import { useSiteSettings } from '@/stores/siteSettingsStore';

// Token status enum matching contract
enum TokenStatus {
  Live = 0,
  Graduated = 1,
  Paused = 2,
  Delisted = 3,
}

interface TokenInfo {
  id: bigint;
  address: `0x${string}`;
  name: string;
  symbol: string;
  status: TokenStatus;
  selected: boolean;
  isHidden: boolean;
}

export function TokenManagement() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const { hiddenTokens, hideToken, unhideToken } = useSiteSettings();
  const factoryAddress = CONTRACTS.FACTORY;

  // Get all tokens from factory
  const { data: allTokensData, refetch: refetchTokens, isLoading: isLoadingTokens } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getAllTokens',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!factoryAddress },
  });

  // Process tokens when loaded
  useEffect(() => {
    if (!allTokensData) {
      setTokens([]);
      return;
    }

    setIsLoading(true);
    const tokenInfos: TokenInfo[] = [];

    for (const token of allTokensData) {
      const addr = token.tokenAddress as `0x${string}`;
      const isHidden = hiddenTokens.some((h) => h.toLowerCase() === addr.toLowerCase());

      tokenInfos.push({
        id: token.id,
        address: addr,
        name: token.name || 'Unknown',
        symbol: token.symbol || '???',
        status: token.status as TokenStatus,
        selected: false,
        isHidden,
      });
    }

    setTokens(tokenInfos);
    setIsLoading(false);
  }, [allTokensData, hiddenTokens]);

  const toggleSelect = (address: `0x${string}`) => {
    setTokens((prev) =>
      prev.map((t) => (t.address === address ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAll = () => {
    setTokens((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setTokens((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  const delistSelected = () => {
    const selected = tokens.filter((t) => t.selected && !t.isHidden);
    if (selected.length === 0) return;
    // Delist all selected tokens at once (FREE - localStorage only)
    selected.forEach((t) => hideToken(t.address));
    deselectAll();
  };

  const handleToggleHide = (address: `0x${string}`, isCurrentlyHidden: boolean) => {
    if (isCurrentlyHidden) {
      unhideToken(address);
    } else {
      hideToken(address);
    }
  };

  const getStatusLabel = (status: TokenStatus) => {
    switch (status) {
      case TokenStatus.Live:
        return { label: 'LIVE', color: 'text-fud-green bg-fud-green/20' };
      case TokenStatus.Graduated:
        return { label: 'GRADUATED', color: 'text-fud-green bg-fud-green/20' };
      case TokenStatus.Paused:
        return { label: 'PAUSED', color: 'text-fud-orange bg-fud-orange/20' };
      case TokenStatus.Delisted:
        return { label: 'DELISTED', color: 'text-fud-red bg-fud-red/20' };
      default:
        return { label: 'UNKNOWN', color: 'text-text-muted bg-dark-tertiary' };
    }
  };

  const selectedCount = tokens.filter((t) => t.selected).length;
  const hiddenCount = tokens.filter((t) => t.isHidden).length;
  const liveCount = tokens.filter((t) => t.status === TokenStatus.Live).length;
  const visibleTokens = showHidden ? tokens : tokens.filter((t) => !t.isHidden);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary font-mono text-sm">
            Total Tokens: <span className="text-fud-green">{tokens.length}</span>
            {' | '}Live: <span className="text-fud-green">{liveCount}</span>
            {hiddenCount > 0 && (
              <span className="text-fud-orange ml-2">({hiddenCount} hidden)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowHidden(!showHidden)}
            variant="secondary"
            className="gap-2"
          >
            {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            {showHidden ? 'Hide Hidden' : 'Show Hidden'}
          </Button>
          <Button
            onClick={() => refetchTokens()}
            variant="secondary"
            className="gap-2"
            loading={isLoadingTokens}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {visibleTokens.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-dark-secondary rounded-lg flex-wrap">
          <button
            onClick={selectAll}
            className="text-xs font-mono text-fud-green hover:underline"
          >
            Select All
          </button>
          <span className="text-text-muted">|</span>
          <button
            onClick={deselectAll}
            className="text-xs font-mono text-text-muted hover:text-text-primary"
          >
            Deselect All
          </button>
          {selectedCount > 0 && (
            <>
              <span className="text-text-muted">|</span>
              <span className="text-xs font-mono text-fud-orange">
                {selectedCount} selected
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  onClick={delistSelected}
                  variant="danger"
                  className="gap-1 text-xs py-1"
                >
                  <Trash2 size={12} />
                  Delist Selected (Free)
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Token List */}
      {isLoading || isLoadingTokens ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-2" />
          <p className="text-text-muted font-mono text-sm">Loading tokens...</p>
        </div>
      ) : visibleTokens.length === 0 ? (
        <div className="text-center py-8 text-text-muted font-mono text-sm">
          {tokens.length === 0 ? 'No tokens found' : 'No visible tokens (all hidden)'}
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {visibleTokens.map((token) => {
            const statusInfo = getStatusLabel(token.status);

            return (
              <div
                key={token.address}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  token.isHidden
                    ? 'bg-dark-tertiary border-fud-orange/30 opacity-60'
                    : token.selected
                    ? 'bg-fud-red/10 border-fud-red/30'
                    : 'bg-dark-secondary border-border-primary hover:border-fud-green/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={token.selected}
                  onChange={() => toggleSelect(token.address)}
                  className="w-4 h-4 accent-fud-green"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-text-muted font-mono text-xs">
                      #{token.id.toString()}
                    </span>
                    <span className="text-text-primary font-mono text-sm font-semibold">
                      {token.name}
                    </span>
                    <span className="text-text-muted font-mono text-xs">
                      ${token.symbol}
                    </span>
                    <span className={`px-1.5 py-0.5 text-xs font-mono rounded ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {token.isHidden && (
                      <span className="px-1.5 py-0.5 bg-fud-orange/20 text-fud-orange text-xs font-mono rounded">
                        HIDDEN
                      </span>
                    )}
                  </div>
                  <span className="text-text-muted font-mono text-xs">
                    {formatAddress(token.address)}
                  </span>
                </div>
                <a
                  href={`https://scan.pulsechain.com/address/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-dark-tertiary rounded transition-colors"
                >
                  <ExternalLink size={14} className="text-text-muted" />
                </a>
                <Button
                  onClick={() => handleToggleHide(token.address, token.isHidden)}
                  variant="secondary"
                  className="gap-1 text-xs py-1 px-2"
                  title={token.isHidden ? 'Relist token' : 'Delist token'}
                >
                  {token.isHidden ? <Eye size={12} /> : <Trash2 size={12} />}
                </Button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
