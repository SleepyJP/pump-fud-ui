'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { MessageCircle, Send, Mic, MicOff, Sparkles, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { SUPERCHAT_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatTimeAgo, getTierColor, getTierName } from '@/lib/utils';
import type { SuperChatMessage } from '@/types';

interface ChatMessage {
  id: string;
  sender: `0x${string}`;
  message: string;
  timestamp: number;
  isSuperChat: boolean;
  tier?: number;
  amount?: bigint;
}

interface LiveChatProps {
  tokenAddress?: `0x${string}`;
}

export function LiveChat({ tokenAddress }: LiveChatProps) {
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isSuperChatMode, setIsSuperChatMode] = useState(false);
  const [selectedTier, setSelectedTier] = useState(1);
  const [isMicActive, setIsMicActive] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();

  // Check if user holds any tokens (for voice chat access)
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  // Super chat messages from contract
  const { data: superChatMessages } = useReadContract({
    address: CONTRACTS.SUPERCHAT as `0x${string}`,
    abi: SUPERCHAT_ABI,
    functionName: 'getTokenSuperChats',
    args: tokenAddress ? [tokenAddress, BigInt(0), BigInt(100)] : undefined,
    query: { enabled: !!tokenAddress && !!CONTRACTS.SUPERCHAT },
  });

  const { writeContract, isPending } = useWriteContract();

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, superChatMessages]);

  // Merge super chat messages with local messages
  const allMessages = useCallback(() => {
    const supChats: ChatMessage[] = ((superChatMessages as SuperChatMessage[] | undefined) || [])
      .filter((m) => !m.isMessageBoard)
      .map((m, i) => ({
        id: `sc-${i}`,
        sender: m.sender,
        message: m.message,
        timestamp: Number(m.timestamp),
        isSuperChat: true,
        tier: Number(m.tier),
        amount: m.amount,
      }));

    return [...localMessages, ...supChats].sort((a, b) => a.timestamp - b.timestamp);
  }, [localMessages, superChatMessages]);

  // Send free message (local only - would connect to WebSocket/P2P in production)
  const sendFreeMessage = () => {
    if (!message.trim() || !address) return;

    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      sender: address,
      message: message.trim(),
      timestamp: Math.floor(Date.now() / 1000),
      isSuperChat: false,
    };

    setLocalMessages((prev) => [...prev, newMsg]);
    setMessage('');
  };

  // Send super chat (on-chain)
  const sendSuperChat = () => {
    if (!message.trim() || !tokenAddress || !CONTRACTS.SUPERCHAT) return;

    const tierPrice = CONSTANTS.SUPERCHAT_TIERS[selectedTier] ?? 0;
    writeContract({
      address: CONTRACTS.SUPERCHAT as `0x${string}`,
      abi: SUPERCHAT_ABI,
      functionName: 'sendSuperChat',
      args: [tokenAddress, message, false],
      value: parseEther(tierPrice?.toString() ?? ''),
    });

    setMessage('');
    setIsSuperChatMode(false);
  };

  const handleSend = () => {
    if (isSuperChatMode) {
      sendSuperChat();
    } else {
      sendFreeMessage();
    }
  };

  // Toggle microphone (placeholder for voice chat)
  const toggleMic = () => {
    setIsMicActive(!isMicActive);
    // In production: WebRTC voice connection
  };

  const hasTokens = tokenBalance && tokenBalance > BigInt(0);
  const messages = allMessages();

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-black/40 to-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#39ff14]/20">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[#39ff14]" />
          <span className="font-mono text-sm text-[#39ff14] font-bold">LIVE CHAT</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice Chat Toggle */}
          <button
            onClick={() => setShowVoicePanel(!showVoicePanel)}
            className={`p-1.5 rounded transition-all ${
              showVoicePanel ? 'bg-[#39ff14]/20 text-[#39ff14]' : 'text-gray-500 hover:text-[#39ff14]'
            }`}
            title="Voice Chat"
          >
            <Volume2 size={14} />
          </button>
          <span className="text-[10px] font-mono text-gray-500">
            {messages.length} msgs
          </span>
        </div>
      </div>

      {/* Voice Panel (collapsible) */}
      {showVoicePanel && (
        <div className="px-3 py-2 border-b border-[#39ff14]/10 bg-black/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">Voice Chat</span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                disabled={!hasTokens}
                className={`p-2 rounded-full transition-all ${
                  isMicActive
                    ? 'bg-[#39ff14] text-black animate-pulse'
                    : hasTokens
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                }`}
                title={hasTokens ? (isMicActive ? 'Mute' : 'Unmute') : 'Hold tokens to speak'}
              >
                {isMicActive ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <span className="text-[10px] font-mono text-gray-500">
                {isMicActive ? 'Speaking...' : hasTokens ? 'Click to talk' : 'Hold tokens to talk'}
              </span>
            </div>
          </div>
          {/* Active speakers would show here */}
          <div className="mt-2 flex gap-1 flex-wrap">
            <span className="text-[10px] font-mono text-gray-600">No active speakers</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-[#39ff14]/20 scrollbar-track-transparent">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={32} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-xs font-mono">Select a token to chat</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-xs font-mono">No messages yet. Be the first!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-2 transition-all ${
                msg.isSuperChat
                  ? 'border-l-2 bg-gradient-to-r from-black/60 to-transparent'
                  : 'bg-black/30'
              }`}
              style={msg.isSuperChat ? { borderColor: getTierColor(msg.tier || 1) } : undefined}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {msg.isSuperChat && (
                    <Sparkles size={10} style={{ color: getTierColor(msg.tier || 1) }} />
                  )}
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: msg.isSuperChat ? getTierColor(msg.tier || 1) : '#9ca3af' }}
                  >
                    {formatAddress(msg.sender)}
                  </span>
                  {msg.isSuperChat && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${getTierColor(msg.tier || 1)}20`,
                        color: getTierColor(msg.tier || 1),
                      }}
                    >
                      {getTierName(msg.tier || 1)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-gray-600">
                  {formatTimeAgo(BigInt(msg.timestamp))}
                </span>
              </div>
              <p className={`text-sm ${msg.isSuperChat ? 'text-white' : 'text-gray-300'}`}>
                {msg.message}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {tokenAddress && isConnected && (
        <div className="p-3 border-t border-[#39ff14]/10 space-y-2">
          {/* Super Chat Toggle */}
          <button
            onClick={() => setIsSuperChatMode(!isSuperChatMode)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-mono transition-all ${
              isSuperChatMode
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 text-yellow-400'
                : 'bg-black/40 border border-gray-700 text-gray-500 hover:border-gray-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              {isSuperChatMode ? 'Super Chat Mode ON' : 'Enable Super Chat'}
            </span>
            {isSuperChatMode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {/* Super Chat Tiers (when enabled) */}
          {isSuperChatMode && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex-1 py-1.5 text-[10px] font-mono rounded transition-all ${
                    selectedTier === tier ? 'text-black font-bold' : 'text-gray-500'
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
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isSuperChatMode ? 'Super chat message...' : 'Type a message...'}
              maxLength={500}
              className="flex-1 px-3 py-2 bg-black/60 border border-[#39ff14]/20 rounded-lg font-mono text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#39ff14]/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isPending || !message.trim()}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                isSuperChatMode
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400'
                  : 'bg-[#39ff14] text-black hover:bg-[#39ff14]/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send size={16} />
            </button>
          </div>

          {/* Free chat note */}
          {!isSuperChatMode && (
            <p className="text-[10px] font-mono text-gray-600 text-center">
              Free chat - no payment required
            </p>
          )}
        </div>
      )}

      {/* Not connected state */}
      {tokenAddress && !isConnected && (
        <div className="p-3 border-t border-[#39ff14]/10">
          <p className="text-xs font-mono text-gray-500 text-center">
            Connect wallet to chat
          </p>
        </div>
      )}
    </div>
  );
}
