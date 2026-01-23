'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress } from '@/lib/utils';

interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  graduated: boolean;
  selected: boolean;
}

export function TokenManagement() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<`0x${string}` | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const factoryAddress = CONTRACTS.FACTORY;

  // Get total token count
  const { data: tokenCount, refetch: refetchCount } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'allTokensLength',
    query: { enabled: !!factoryAddress },
  });

  // Get tokens list
  const { data: tokenAddresses, refetch: refetchTokens } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!factoryAddress },
  });

  // Delete token transaction
  const { writeContract, data: deleteTxHash, isPending: isDeleting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isDeleted } = useWaitForTransactionReceipt({
    hash: deleteTxHash,
  });

  // Fetch token details when addresses are loaded
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!tokenAddresses || tokenAddresses.length === 0) return;

      setIsLoading(true);
      const tokenInfos: TokenInfo[] = [];

      for (const addr of tokenAddresses) {
        try {
          // We'll populate these with basic info for now
          // In a real app, you'd batch these calls or use multicall
          tokenInfos.push({
            address: addr,
            name: 'Loading...',
            symbol: '...',
            graduated: false,
            selected: false,
          });
        } catch {
          // Skip failed tokens
        }
      }

      setTokens(tokenInfos);
      setIsLoading(false);
    };

    fetchTokenDetails();
  }, [tokenAddresses]);

  // Handle delete success
  useEffect(() => {
    if (isDeleted) {
      setDeleteTarget(null);
      setShowConfirm(false);
      refetchCount();
      refetchTokens();
    }
  }, [isDeleted, refetchCount, refetchTokens]);

  const handleDelete = (address: `0x${string}`) => {
    setDeleteTarget(address);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget || !factoryAddress) return;

    writeContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'deleteToken',
      args: [deleteTarget],
    });
  };

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

  const deleteSelected = () => {
    const selected = tokens.filter((t) => t.selected);
    if (selected.length === 0) return;
    // For bulk delete, we'd need to call deleteToken for each
    // This is a simplified version - just delete the first selected for now
    handleDelete(selected[0].address);
  };

  const selectedCount = tokens.filter((t) => t.selected).length;

  if (!factoryAddress) {
    return (
      <div className="p-4 bg-fud-orange/10 border border-fud-orange rounded-lg">
        <p className="text-fud-orange font-mono text-sm">
          Factory contract address not configured. Set NEXT_PUBLIC_FACTORY_ADDRESS in .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary font-mono text-sm">
            Total Tokens: <span className="text-fud-green">{tokenCount?.toString() || '0'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              refetchCount();
              refetchTokens();
            }}
            variant="secondary"
            className="gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {tokens.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-dark-secondary rounded-lg">
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
              <Button
                onClick={deleteSelected}
                variant="danger"
                className="ml-auto gap-1 text-xs py-1"
              >
                <Trash2 size={12} />
                Delete Selected
              </Button>
            </>
          )}
        </div>
      )}

      {/* Token List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-2" />
          <p className="text-text-muted font-mono text-sm">Loading tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8 text-text-muted font-mono text-sm">
          No tokens found
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {tokens.map((token) => (
            <div
              key={token.address}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                token.selected
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
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-mono text-sm truncate">
                    {formatAddress(token.address)}
                  </span>
                  {token.graduated && (
                    <span className="px-1.5 py-0.5 bg-fud-green/20 text-fud-green text-xs font-mono rounded">
                      GRADUATED
                    </span>
                  )}
                </div>
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
                onClick={() => handleDelete(token.address)}
                variant="danger"
                className="gap-1 text-xs py-1 px-2"
                disabled={isDeleting || isConfirming}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-fud-red" />
              <div>
                <h3 className="font-display text-xl text-fud-red">Delete Token</h3>
                <p className="text-text-muted text-sm font-mono">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-text-secondary font-mono text-sm mb-4">
              Are you sure you want to delete token:
              <br />
              <code className="text-fud-orange">{deleteTarget}</code>
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowConfirm(false);
                  setDeleteTarget(null);
                }}
                variant="secondary"
                className="flex-1"
                disabled={isDeleting || isConfirming}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                variant="danger"
                className="flex-1 gap-2"
                loading={isDeleting || isConfirming}
              >
                {isDeleting || isConfirming ? 'Deleting...' : 'Delete Token'}
              </Button>
            </div>
            {isDeleted && (
              <div className="mt-4 p-3 bg-fud-green/10 border border-fud-green/30 rounded-lg flex items-center gap-2">
                <CheckCircle className="text-fud-green" size={16} />
                <span className="text-fud-green text-sm font-mono">Token deleted successfully!</span>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
