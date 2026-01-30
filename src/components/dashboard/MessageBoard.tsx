'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { Clipboard, Send, Sparkles, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { SUPERCHAT_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatTimeAgo, getTierColor, formatPLS } from '@/lib/utils';
import type { SuperChatMessage } from '@/types';

interface BoardMessage {
  id: string;
  sender: `0x${string}`;
  message: string;
  timestamp: number;
  isPaid: boolean;
  tier?: number;
  amount?: bigint;
  pinned?: boolean;
}

interface MessageBoardProps {
  tokenAddress?: `0x${string}`;
}

export function MessageBoard({ tokenAddress }: MessageBoardProps) {
  const [message, setMessage] = useState('');
  const [localPosts, setLocalPosts] = useState<BoardMessage[]>([]);
  const [isPaidMode, setIsPaidMode] = useState(false);
  const [selectedTier, setSelectedTier] = useState(3);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();

  // Check if user holds tokens
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  // Paid board messages from contract
  const { data: paidMessages } = useReadContract({
    address: CONTRACTS.SUPERCHAT as `0x${string}`,
    abi: SUPERCHAT_ABI,
    functionName: 'getTokenSuperChats',
    args: tokenAddress ? [tokenAddress, BigInt(0), BigInt(50)] : undefined,
    query: { enabled: !!tokenAddress && !!CONTRACTS.SUPERCHAT },
  });

  const { writeContract, isPending } = useWriteContract();

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localPosts, paidMessages]);

  // Merge paid messages with local posts
  const allPosts = useCallback(() => {
    const paid: BoardMessage[] = ((paidMessages as SuperChatMessage[] | undefined) || [])
      .filter((m) => m.isMessageBoard)
      .map((m, i) => ({
        id: `paid-${i}`,
        sender: m.sender,
        message: m.message,
        timestamp: Number(m.timestamp),
        isPaid: true,
        tier: Number(m.tier),
        amount: m.amount,
        pinned: Number(m.tier) >= 4, // Tier 4+ gets pinned
      }));

    // Pinned posts first, then by timestamp
    const combined = [...localPosts, ...paid];
    const pinned = combined.filter(p => p.pinned).sort((a, b) => b.timestamp - a.timestamp);
    const unpinned = combined.filter(p => !p.pinned).sort((a, b) => b.timestamp - a.timestamp);

    return [...pinned, ...unpinned];
  }, [localPosts, paidMessages]);

  // Send free post (local only - would connect to backend/P2P in production)
  const sendFreePost = () => {
    if (!message.trim() || !address) return;

    const newPost: BoardMessage = {
      id: `local-${Date.now()}`,
      sender: address,
      message: message.trim(),
      timestamp: Math.floor(Date.now() / 1000),
      isPaid: false,
    };

    setLocalPosts((prev) => [...prev, newPost]);
    setMessage('');
  };

  // Send paid post (on-chain)
  const sendPaidPost = () => {
    if (!message.trim() || !tokenAddress || !CONTRACTS.SUPERCHAT) return;

    const tierPrice = CONSTANTS.SUPERCHAT_TIERS[selectedTier] ?? 0;
    writeContract({
      address: CONTRACTS.SUPERCHAT as `0x${string}`,
      abi: SUPERCHAT_ABI,
      functionName: 'sendSuperChat',
      args: [tokenAddress, message, true],
      value: parseEther(tierPrice?.toString() ?? ''),
    });

    setMessage('');
    setIsPaidMode(false);
  };

  const handlePost = () => {
    if (isPaidMode) {
      sendPaidPost();
    } else {
      sendFreePost();
    }
  };

  const hasTokens = tokenBalance && tokenBalance > BigInt(0);
  const posts = allPosts();

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-black/40 to-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#d6ffe0]/20">
        <div className="flex items-center gap-2">
          <Clipboard size={16} className="text-[#d6ffe0]" />
          <span className="font-mono text-sm text-[#d6ffe0] font-bold">MESSAGE BOARD</span>
        </div>
        <span className="text-[10px] font-mono text-gray-500">
          {posts.length} posts
        </span>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin scrollbar-thumb-[#d6ffe0]/20 scrollbar-track-transparent">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Clipboard size={32} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-xs font-mono">Select a token to view board</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-xs font-mono">No posts yet. Be the first!</p>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={`rounded-xl p-3 transition-all ${
                post.pinned
                  ? 'bg-gradient-to-r border-l-2'
                  : post.isPaid
                  ? 'bg-gradient-to-r from-black/60 to-transparent border-l-2'
                  : 'bg-black/30'
              }`}
              style={
                post.isPaid
                  ? {
                      borderColor: getTierColor(post.tier || 3),
                      background: `linear-gradient(135deg, ${getTierColor(post.tier || 3)}10, transparent)`,
                    }
                  : undefined
              }
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {post.pinned && (
                    <Pin size={12} className="text-yellow-400" />
                  )}
                  {post.isPaid && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: getTierColor(post.tier || 3),
                        color: '#000',
                      }}
                    >
                      {post.tier}
                    </div>
                  )}
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: post.isPaid ? getTierColor(post.tier || 3) : '#9ca3af' }}
                  >
                    {formatAddress(post.sender)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-gray-600 block">
                    {formatTimeAgo(BigInt(post.timestamp))}
                  </span>
                  {post.isPaid && post.amount && (
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: getTierColor(post.tier || 3) }}
                    >
                      {formatPLS(post.amount)} PLS
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <p className={`text-sm leading-relaxed ${post.isPaid ? 'text-white' : 'text-gray-300'}`}>
                {post.message}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {tokenAddress && isConnected && (
        <div className="p-3 border-t border-[#d6ffe0]/10 space-y-2">
          {/* Paid Post Toggle */}
          <button
            onClick={() => setIsPaidMode(!isPaidMode)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-mono transition-all ${
              isPaidMode
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-purple-400'
                : 'bg-black/40 border border-gray-700 text-gray-500 hover:border-gray-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              {isPaidMode ? 'Promoted Post Mode ON' : 'Enable Promoted Post'}
            </span>
            {isPaidMode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {/* Tier Selector (when paid mode enabled) */}
          {isPaidMode && (
            <div className="flex gap-1">
              {[3, 4, 5].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex-1 py-2 text-xs font-mono rounded transition-all ${
                    selectedTier === tier ? 'text-black font-bold scale-105' : 'text-gray-500'
                  }`}
                  style={{
                    backgroundColor: selectedTier === tier ? getTierColor(tier) : 'transparent',
                    borderColor: getTierColor(tier),
                    borderWidth: 1,
                  }}
                >
                  <div>{CONSTANTS.SUPERCHAT_TIERS[tier]} PLS</div>
                  {tier >= 4 && (
                    <div className="text-[9px] flex items-center justify-center gap-0.5 mt-0.5">
                      <Pin size={8} /> Pinned
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Text Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isPaidMode ? 'Write your promoted announcement...' : 'Post to the board...'}
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 bg-black/60 border border-[#d6ffe0]/20 rounded-lg font-mono text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#d6ffe0]/50 transition-colors resize-none"
          />

          {/* Post Button */}
          <button
            onClick={handlePost}
            disabled={isPending || !message.trim()}
            className={`w-full py-2.5 rounded-lg font-mono text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isPaidMode
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
                : 'bg-[#d6ffe0] text-black hover:bg-[#d6ffe0]/80'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send size={16} />
            {isPaidMode ? `Post (${CONSTANTS.SUPERCHAT_TIERS[selectedTier]} PLS)` : 'Post Free'}
          </button>

          {/* Note */}
          {!isPaidMode && (
            <p className="text-[10px] font-mono text-gray-600 text-center">
              Free posts - promote for visibility
            </p>
          )}
        </div>
      )}

      {/* Not connected */}
      {tokenAddress && !isConnected && (
        <div className="p-3 border-t border-[#d6ffe0]/10">
          <p className="text-xs font-mono text-gray-500 text-center">
            Connect wallet to post
          </p>
        </div>
      )}
    </div>
  );
}
