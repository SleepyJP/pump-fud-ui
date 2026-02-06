'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { MessageCircle, Send, Mic, MicOff, Sparkles, ChevronDown, ChevronUp, Volume2, VolumeX, Radio } from 'lucide-react';
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

interface VoiceSpeaker {
  address: `0x${string}`;
  isSpeaking: boolean;
  isMuted: boolean;
}

// Generate consistent avatar colors from wallet address
function getAvatarColors(address: string): { bg: string; fg: string } {
  const hash = address.slice(2, 10);
  const hue = parseInt(hash.slice(0, 2), 16) * 1.4; // 0-360
  const sat = 60 + (parseInt(hash.slice(2, 4), 16) % 30); // 60-90%
  const light = 45 + (parseInt(hash.slice(4, 6), 16) % 15); // 45-60%
  return {
    bg: `hsl(${hue}, ${sat}%, ${light}%)`,
    fg: light > 55 ? '#000' : '#fff',
  };
}

// Avatar component
function WalletAvatar({ address, size = 32, isSpeaking = false }: { address: string; size?: number; isSpeaking?: boolean }) {
  const colors = getAvatarColors(address);
  const initials = address.slice(2, 4).toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center font-mono font-bold transition-all ${
        isSpeaking ? 'ring-2 ring-[#d6ffe0] ring-offset-2 ring-offset-black animate-pulse' : ''
      }`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.bg,
        color: colors.fg,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
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

  // Check if user holds tokens
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });

  // Get total supply to calculate 1% threshold
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!tokenAddress },
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

  // User needs 1% of total supply to participate in chat
  const onePercentThreshold = totalSupply ? (totalSupply as bigint) / 100n : 0n;
  const hasEnoughTokens = tokenBalance && totalSupply && (tokenBalance as bigint) >= onePercentThreshold;
  const holdingPercent = tokenBalance && totalSupply
    ? Number((tokenBalance as bigint) * 10000n / (totalSupply as bigint)) / 100
    : 0;
  const messages = allMessages();

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-black/40 to-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#d6ffe0]/20">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[#d6ffe0]" />
          <span className="font-mono text-sm text-[#d6ffe0] font-bold">LIVE CHAT</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice Chat Toggle */}
          <button
            onClick={() => setShowVoicePanel(!showVoicePanel)}
            className={`p-1.5 rounded transition-all ${
              showVoicePanel ? 'bg-[#d6ffe0]/20 text-[#d6ffe0]' : 'text-gray-500 hover:text-[#d6ffe0]'
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

      {/* Voice Panel (collapsible) - Telegram Live style */}
      {showVoicePanel && (
        <div className="px-3 py-3 border-b border-[#d6ffe0]/10 bg-gradient-to-b from-black/60 to-black/40">
          {/* Voice Chat Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio size={14} className={isMicActive ? 'text-[#d6ffe0] animate-pulse' : 'text-gray-500'} />
              <span className="text-xs font-mono text-[#d6ffe0] font-bold">VOICE CHAT</span>
              {isMicActive && (
                <span className="text-[9px] font-mono bg-[#d6ffe0]/20 text-[#d6ffe0] px-1.5 py-0.5 rounded">LIVE</span>
              )}
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {hasEnoughTokens ? '1%+ holder' : `${holdingPercent.toFixed(2)}%`}
            </span>
          </div>

          {/* Your Speaker Card */}
          {address && (
            <div className={`flex items-center gap-3 p-2 rounded-lg mb-2 transition-all ${
              isMicActive
                ? 'bg-[#d6ffe0]/10 border border-[#d6ffe0]/30'
                : 'bg-black/30 border border-gray-800'
            }`}>
              {/* Avatar */}
              <WalletAvatar address={address} size={40} isSpeaking={isMicActive} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-white font-semibold truncate">
                    {formatAddress(address)}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500">(you)</span>
                </div>
                <span className={`text-[10px] font-mono ${isMicActive ? 'text-[#d6ffe0]' : 'text-gray-500'}`}>
                  {isMicActive ? '🎙️ Speaking...' : hasEnoughTokens ? 'Ready to speak' : 'Need 1% to speak'}
                </span>
              </div>

              {/* Mute/Unmute Button */}
              <button
                onClick={toggleMic}
                disabled={!hasEnoughTokens}
                className={`p-2.5 rounded-full transition-all ${
                  isMicActive
                    ? 'bg-[#d6ffe0] text-black shadow-lg shadow-[#d6ffe0]/30'
                    : hasEnoughTokens
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                }`}
                title={hasEnoughTokens ? (isMicActive ? 'Mute' : 'Unmute') : 'Hold 1% of supply to speak'}
              >
                {isMicActive ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
            </div>
          )}

          {/* Other Active Speakers */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-600 block">Active Speakers</span>

            {/* Placeholder for other speakers - would be populated via WebRTC/WebSocket */}
            <div className="text-center py-3 text-gray-600">
              <VolumeX size={20} className="mx-auto mb-1 opacity-50" />
              <span className="text-[10px] font-mono">No other speakers</span>
            </div>

            {/* Example of what an active speaker would look like (commented for reference)
            <div className="flex items-center gap-2 p-1.5 rounded bg-black/20">
              <WalletAvatar address="0x1234567890abcdef" size={28} isSpeaking={true} />
              <span className="text-[10px] font-mono text-gray-300 flex-1 truncate">0x1234...cdef</span>
              <div className="w-1.5 h-1.5 bg-[#d6ffe0] rounded-full animate-pulse" />
            </div>
            */}
          </div>

          {/* Voice Chat Note */}
          {!hasEnoughTokens && (
            <div className="mt-2 text-[9px] font-mono text-center text-gray-500 bg-black/30 rounded py-1.5">
              Hold 1% of token supply to join voice chat
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-[#d6ffe0]/20 scrollbar-track-transparent">
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
        <div className="p-3 border-t border-[#d6ffe0]/10 space-y-2">
          {/* Holding Status */}
          <div className={`text-[10px] font-mono text-center py-1 rounded ${
            hasEnoughTokens ? 'bg-[#d6ffe0]/10 text-[#d6ffe0]' : 'bg-red-500/10 text-red-400'
          }`}>
            {hasEnoughTokens
              ? `✓ Holding ${holdingPercent.toFixed(2)}% - Chat unlocked`
              : `Hold 1% to chat (you have ${holdingPercent.toFixed(2)}%)`
            }
          </div>

          {/* Super Chat Toggle - Always available (paid feature) */}
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
              {isSuperChatMode ? 'Super Chat Mode ON' : '✨ Super Chat (paid highlight)'}
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

          {/* Message Input - enabled if holding 1% OR using Super Chat */}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (hasEnoughTokens || isSuperChatMode) && handleSend()}
              placeholder={
                !hasEnoughTokens && !isSuperChatMode
                  ? 'Hold 1% to chat or use Super Chat...'
                  : isSuperChatMode
                    ? 'Super chat message...'
                    : 'Type a message...'
              }
              maxLength={500}
              disabled={!hasEnoughTokens && !isSuperChatMode}
              className="flex-1 px-3 py-2 bg-black/60 border border-[#d6ffe0]/20 rounded-lg font-mono text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#d6ffe0]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={isPending || !message.trim() || (!hasEnoughTokens && !isSuperChatMode)}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
                isSuperChatMode
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400'
                  : 'bg-[#d6ffe0] text-black hover:bg-[#d6ffe0]/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send size={16} />
            </button>
          </div>

          {/* Info note */}
          <p className="text-[10px] font-mono text-gray-600 text-center">
            {isSuperChatMode
              ? `Super Chat: ${CONSTANTS.SUPERCHAT_TIERS[selectedTier]} PLS - highlighted message`
              : hasEnoughTokens
                ? 'Free chat - no payment required'
                : 'Super Chat available without holding requirement'
            }
          </p>
        </div>
      )}

      {/* Not connected state */}
      {tokenAddress && !isConnected && (
        <div className="p-3 border-t border-[#d6ffe0]/10">
          <p className="text-xs font-mono text-gray-500 text-center">
            Connect wallet to chat
          </p>
        </div>
      )}
    </div>
  );
}
