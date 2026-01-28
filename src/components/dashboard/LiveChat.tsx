'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SUPERCHAT_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatTimeAgo, getTierColor, getTierName } from '@/lib/utils';
import type { SuperChatMessage } from '@/types';

interface LiveChatProps {
  tokenAddress?: `0x${string}`;
}

export function LiveChat({ tokenAddress }: LiveChatProps) {
  const [message, setMessage] = useState('');
  const [selectedTier, setSelectedTier] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();

  const { data: canChat } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'canChat',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  const { data: messages } = useReadContract({
    address: CONTRACTS.SUPERCHAT as `0x${string}`,
    abi: SUPERCHAT_ABI,
    functionName: 'getTokenSuperChats',
    args: tokenAddress ? [tokenAddress, BigInt(0), BigInt(100)] : undefined,
    query: { enabled: !!tokenAddress && !!CONTRACTS.SUPERCHAT },
  });

  const { writeContract, isPending } = useWriteContract();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !tokenAddress || !CONTRACTS.SUPERCHAT) return;

    const tierPrice = CONSTANTS.SUPERCHAT_TIERS[selectedTier] ?? 0;
    writeContract({
      address: CONTRACTS.SUPERCHAT as `0x${string}`,
      abi: SUPERCHAT_ABI,
      functionName: 'sendSuperChat',
      args: [tokenAddress, message, false],
      value: parseEther(tierPrice.toString()),
    });

    setMessage('');
  };

  const chatMessages = (messages as SuperChatMessage[] | undefined)?.filter((m) => !m.isMessageBoard) || [];

  return (
    <Card className="h-full flex flex-col" variant="glow">
      <CardHeader>
        <CardTitle>Live Chat</CardTitle>
        <span className="text-xs font-mono text-text-muted">
          {canChat ? '✓ Eligible' : '🔒 Hold 1%+ to chat'}
        </span>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {!tokenAddress ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-text-muted text-sm font-mono">Select a token to chat</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted text-sm font-mono">No messages yet. Be the first!</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-dark-secondary/50"
                    style={{ borderLeft: `2px solid ${getTierColor(Number(msg.tier))}` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: getTierColor(Number(msg.tier)) }}
                      >
                        {formatAddress(msg.sender)}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {formatTimeAgo(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary">{msg.message}</p>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: getTierColor(Number(msg.tier)) }}
                    >
                      {getTierName(Number(msg.tier))}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {isConnected && canChat && (
              <div className="space-y-2 pt-2 border-t border-border-primary">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier)}
                      className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors ${
                        selectedTier === tier
                          ? 'text-black'
                          : 'text-text-muted hover:text-white'
                      }`}
                      style={{
                        backgroundColor: selectedTier === tier ? getTierColor(tier) : 'transparent',
                        borderColor: getTierColor(tier),
                        borderWidth: 1,
                      }}
                    >
                      {CONSTANTS.SUPERCHAT_TIERS[tier]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    maxLength={500}
                    className="flex-1 px-3 py-2 bg-dark-secondary border border-border-primary rounded font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-fud-green"
                  />
                  <Button onClick={handleSend} loading={isPending} size="sm">
                    Send
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
