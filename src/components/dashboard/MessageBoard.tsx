'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SUPERCHAT_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatTimeAgo, getTierColor, formatPLS } from '@/lib/utils';
import type { SuperChatMessage } from '@/types';

interface MessageBoardProps {
  tokenAddress?: `0x${string}`;
}

export function MessageBoard({ tokenAddress }: MessageBoardProps) {
  const [message, setMessage] = useState('');
  const [selectedTier, setSelectedTier] = useState(3);

  const { address, isConnected } = useAccount();

  const { data: canPost } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'canPost',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  const { data: messages } = useReadContract({
    address: CONTRACTS.SUPERCHAT as `0x${string}`,
    abi: SUPERCHAT_ABI,
    functionName: 'getTokenSuperChats',
    args: tokenAddress ? [tokenAddress, BigInt(0), BigInt(50)] : undefined,
    query: { enabled: !!tokenAddress && !!CONTRACTS.SUPERCHAT },
  });

  const { writeContract, isPending } = useWriteContract();

  const handlePost = () => {
    if (!message.trim() || !tokenAddress || !CONTRACTS.SUPERCHAT) return;

    const tierPrice = CONSTANTS.SUPERCHAT_TIERS[selectedTier];
    writeContract({
      address: CONTRACTS.SUPERCHAT as `0x${string}`,
      abi: SUPERCHAT_ABI,
      functionName: 'sendSuperChat',
      args: [tokenAddress, message, true],
      value: parseEther(tierPrice.toString()),
    });

    setMessage('');
  };

  const boardMessages = (messages as SuperChatMessage[] | undefined)?.filter((m) => m.isMessageBoard) || [];

  return (
    <Card className="h-full flex flex-col" variant="glow">
      <CardHeader>
        <CardTitle>📋 Message Board</CardTitle>
        <span className="text-xs font-mono text-text-muted">
          {canPost ? '✓ Can Post' : '🔒 Hold 0.5%+ to post'}
        </span>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {!tokenAddress ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-text-muted text-sm font-mono">Select a token to view board</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {boardMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted text-sm font-mono">
                    No board posts yet. Post an announcement!
                  </p>
                </div>
              ) : (
                boardMessages.map((msg, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${getTierColor(Number(msg.tier))}15, transparent)`,
                      border: `1px solid ${getTierColor(Number(msg.tier))}30`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: getTierColor(Number(msg.tier)),
                            color: '#000',
                          }}
                        >
                          {Number(msg.tier)}
                        </div>
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: getTierColor(Number(msg.tier)) }}
                        >
                          {formatAddress(msg.sender)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-text-muted block">
                          {formatTimeAgo(msg.timestamp)}
                        </span>
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: getTierColor(Number(msg.tier)) }}
                        >
                          {formatPLS(msg.amount)} PLS
                        </span>
                      </div>
                    </div>
                    <p className="text-text-primary text-sm leading-relaxed">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {isConnected && canPost && (
              <div className="space-y-3 pt-3 border-t border-border-primary">
                <div className="flex gap-1">
                  {[3, 4, 5].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier)}
                      className={`flex-1 py-2 text-xs font-mono rounded transition-all ${
                        selectedTier === tier ? 'text-black scale-105' : 'text-text-muted'
                      }`}
                      style={{
                        backgroundColor: selectedTier === tier ? getTierColor(tier) : 'transparent',
                        borderColor: getTierColor(tier),
                        borderWidth: 1,
                      }}
                    >
                      {CONSTANTS.SUPERCHAT_TIERS[tier]} PLS
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-secondary border border-border-primary rounded font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-fud-green resize-none"
                />
                <Button onClick={handlePost} loading={isPending} className="w-full">
                  Post to Board ({CONSTANTS.SUPERCHAT_TIERS[selectedTier]} PLS)
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
