'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { TOKEN_ABI, FACTORY_ABI } from '@/config/abis';
import { Settings, ArrowDown, Loader2, ChevronDown, Search, X, Plus, Zap, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ROUTERS,
  ROUTER_ABI,
  ROUTER_NAMES,
  WPLS,
  ERC20_APPROVE_ABI,
  getBestQuote,
  getAllQuotes,
  calculateMinOutput,
  getDeadline,
  type RouteQuote,
} from '@/lib/routers';

// Factory address - V6 Clone Pattern
const FACTORY_ADDRESS = '0x6317446972E2AcA317d7a1ef27D1412AFFcF8E27' as const;

type TabType = 'swap' | 'deposit' | 'positions';

interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  imageUri: string;
  graduated: boolean;
}

export default function SwapPage() {
  const [activeTab, setActiveTab] = useState<TabType>('swap');
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [slippage, setSlippage] = useState('5');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isBuyMode, setIsBuyMode] = useState(true); // true = PLS -> Token, false = Token -> PLS
  const [bestQuote, setBestQuote] = useState<RouteQuote | null>(null);
  const [allQuotes, setAllQuotes] = useState<RouteQuote[]>([]);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // PLS balance
  const { data: plsBalance } = useBalance({
    address,
  });

  // Token balance (if selected)
  const { data: tokenBalance } = useReadContract({
    address: selectedToken?.address,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!selectedToken && !!address },
  });

  // Get current price for quote
  const { data: currentPrice } = useReadContract({
    address: selectedToken?.address,
    abi: TOKEN_ABI,
    functionName: 'getCurrentPrice',
    query: { enabled: !!selectedToken },
  });

  // Write contract
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Fetch all tokens from factory
  const fetchTokens = useCallback(async () => {
    if (!publicClient) return;
    setIsLoadingTokens(true);
    try {
      const length = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'allTokensLength',
      }) as bigint;

      const tokenAddresses = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getTokens',
        args: [BigInt(0), length > BigInt(100) ? BigInt(100) : length],
      }) as `0x${string}`[];

      const tokenInfos: TokenInfo[] = [];
      for (const addr of tokenAddresses) {
        try {
          const [name, symbol, imageUri, graduated] = await Promise.all([
            publicClient.readContract({ address: addr, abi: TOKEN_ABI, functionName: 'name' }),
            publicClient.readContract({ address: addr, abi: TOKEN_ABI, functionName: 'symbol' }),
            publicClient.readContract({ address: addr, abi: TOKEN_ABI, functionName: 'imageUri' }),
            publicClient.readContract({ address: addr, abi: TOKEN_ABI, functionName: 'graduated' }),
          ]);
          tokenInfos.push({
            address: addr,
            name: name as string,
            symbol: symbol as string,
            imageUri: imageUri as string,
            graduated: graduated as boolean,
          });
        } catch {}
      }
      setTokens(tokenInfos);
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Calculate quote - uses bonding curve for non-graduated, multi-router for graduated
  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) === 0 || !selectedToken) {
      setBuyAmount('');
      setBestQuote(null);
      setAllQuotes([]);
      return;
    }

    // For graduated tokens, get quotes from all DEX routers
    if (selectedToken.graduated && publicClient) {
      const fetchDexQuotes = async () => {
        setIsLoadingQuote(true);
        try {
          const amountIn = parseEther(sellAmount);
          const tokenIn = isBuyMode ? WPLS : selectedToken.address;
          const tokenOut = isBuyMode ? selectedToken.address : WPLS;

          const quotes = await getAllQuotes(publicClient, amountIn, tokenIn, tokenOut);
          setAllQuotes(quotes);

          if (quotes.length > 0) {
            setBestQuote(quotes[0]);
            setBuyAmount(parseFloat(formatEther(quotes[0].amountOut)).toFixed(isBuyMode ? 4 : 6));
          } else {
            setBestQuote(null);
            setBuyAmount('');
          }
        } catch {
          setBestQuote(null);
          setAllQuotes([]);
          setBuyAmount('');
        } finally {
          setIsLoadingQuote(false);
        }
      };

      const debounce = setTimeout(fetchDexQuotes, 300);
      return () => clearTimeout(debounce);
    }

    // For non-graduated tokens, use bonding curve price
    if (!currentPrice) {
      setBuyAmount('');
      return;
    }

    try {
      const price = Number(formatEther(currentPrice as bigint));
      if (isBuyMode) {
        // PLS -> Token: tokens = pls / price
        const plsIn = parseFloat(sellAmount);
        const tokensOut = plsIn / price;
        setBuyAmount(tokensOut.toFixed(4));
      } else {
        // Token -> PLS: pls = tokens * price
        const tokensIn = parseFloat(sellAmount);
        const plsOut = tokensIn * price;
        setBuyAmount(plsOut.toFixed(6));
      }
    } catch {
      setBuyAmount('');
    }
  }, [sellAmount, currentPrice, isBuyMode, selectedToken, publicClient]);

  // Execute swap - routes based on graduation status
  const handleSwap = () => {
    if (!selectedToken || !sellAmount || parseFloat(sellAmount) === 0 || !address) return;

    const slippageBps = parseFloat(slippage) * 100; // Convert to basis points
    const deadline = getDeadline(20);

    if (selectedToken.graduated) {
      // ═══════════════════════════════════════════════════════════════
      // GRADUATED TOKEN - Route through BEST DEX router
      // Multi-router: PulseX V1, V2, Paisley Smart, Paisley V2
      // ═══════════════════════════════════════════════════════════════
      const router = bestQuote?.router || ROUTERS.PULSEX_V2;

      if (isBuyMode) {
        // Buy tokens with PLS via best DEX router
        const minTokens = bestQuote
          ? calculateMinOutput(bestQuote.amountOut, slippageBps)
          : buyAmount ? parseEther((parseFloat(buyAmount) * (1 - slippageBps / 10000)).toFixed(18)) : BigInt(0);

        writeContract({
          address: router,
          abi: ROUTER_ABI,
          functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
          args: [minTokens, [WPLS, selectedToken.address], address, deadline],
          value: parseEther(sellAmount),
        });
      } else {
        // Sell tokens for PLS via best DEX router (requires approval first)
        const tokenAmount = parseEther(sellAmount);
        const minPls = bestQuote
          ? calculateMinOutput(bestQuote.amountOut, slippageBps)
          : buyAmount ? parseEther((parseFloat(buyAmount) * (1 - slippageBps / 10000)).toFixed(18)) : BigInt(0);

        writeContract({
          address: router,
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
          args: [tokenAmount, minPls, [selectedToken.address, WPLS], address, deadline],
        });
      }
    } else {
      // ═══════════════════════════════════════════════════════════════
      // NON-GRADUATED TOKEN - Route through bonding curve
      // Token contract IS the router (buy/sell functions)
      // ═══════════════════════════════════════════════════════════════
      if (isBuyMode) {
        // Buy tokens with PLS via bonding curve
        const minTokens = buyAmount ? parseEther((parseFloat(buyAmount) * (1 - slippageBps / 10000)).toFixed(18)) : BigInt(0);
        writeContract({
          address: selectedToken.address,
          abi: TOKEN_ABI,
          functionName: 'buy',
          args: [minTokens],
          value: parseEther(sellAmount),
        });
      } else {
        // Sell tokens for PLS via bonding curve
        const tokenAmount = parseEther(sellAmount);
        const minPls = buyAmount ? parseEther((parseFloat(buyAmount) * (1 - slippageBps / 10000)).toFixed(18)) : BigInt(0);
        writeContract({
          address: selectedToken.address,
          abi: TOKEN_ABI,
          functionName: 'sell',
          args: [tokenAmount, minPls],
        });
      }
    }
  };

  // Flip direction
  const flipDirection = () => {
    setIsBuyMode(!isBuyMode);
    setSellAmount('');
    setBuyAmount('');
  };

  // Filtered tokens
  const filteredTokens = tokens.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSwapTab = () => (
    <div className="max-w-md mx-auto">
      {/* Settings */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Swap Card */}
      <div className="bg-[#1a1d26]/90 backdrop-blur-md rounded-2xl border border-[#26a69a]/30 p-4 shadow-[0_0_30px_rgba(38,166,154,0.15)]">
        {/* Sell Input */}
        <div className="bg-[#0d1017] rounded-xl p-4 mb-2">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Sell</span>
            <span className="text-xs text-gray-500">
              Balance: {isBuyMode
                ? (plsBalance ? parseFloat(formatEther(plsBalance.value)).toFixed(4) : '0')
                : (tokenBalance ? parseFloat(formatEther(tokenBalance as bigint)).toFixed(4) : '0')
              }
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-mono text-white outline-none"
            />
            {isBuyMode ? (
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-xl">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">P</div>
                <span className="font-mono">PLS</span>
              </div>
            ) : (
              <button
                onClick={() => setIsTokenModalOpen(true)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-xl"
              >
                {selectedToken ? (
                  <>
                    {selectedToken.imageUri && (
                      <Image src={selectedToken.imageUri} alt="" width={24} height={24} className="rounded-full" />
                    )}
                    <span className="font-mono">{selectedToken.symbol}</span>
                  </>
                ) : (
                  <span className="text-gray-400">Select</span>
                )}
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={flipDirection}
            className="p-2 bg-[#1a1d26] border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowDown size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Buy Input */}
        <div className="bg-[#0d1017] rounded-xl p-4 mt-2">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Buy</span>
            <span className="text-xs text-gray-500">
              Balance: {!isBuyMode
                ? (plsBalance ? parseFloat(formatEther(plsBalance.value)).toFixed(4) : '0')
                : (tokenBalance ? parseFloat(formatEther(tokenBalance as bigint)).toFixed(4) : '0')
              }
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={buyAmount}
              readOnly
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-mono text-white outline-none"
            />
            {!isBuyMode ? (
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-xl">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">P</div>
                <span className="font-mono">PLS</span>
              </div>
            ) : (
              <button
                onClick={() => setIsTokenModalOpen(true)}
                className="flex items-center gap-2 bg-[#26a69a] hover:bg-[#1e8a7e] px-3 py-2 rounded-xl text-black font-bold"
              >
                {selectedToken ? (
                  <>
                    {selectedToken.imageUri && (
                      <Image src={selectedToken.imageUri} alt="" width={24} height={24} className="rounded-full" />
                    )}
                    <span className="font-mono">{selectedToken.symbol}</span>
                  </>
                ) : (
                  <span>Select token</span>
                )}
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={isConnected ? handleSwap : undefined}
          disabled={!isConnected || !selectedToken || !sellAmount || isPending || isConfirming}
          className={`w-full mt-4 py-4 rounded-xl font-bold text-lg transition-colors ${
            isConnected && selectedToken && sellAmount && !isPending && !isConfirming
              ? 'bg-[#26a69a] hover:bg-[#1e8a7e] text-black'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {!isConnected ? (
            'Connect wallet'
          ) : isPending || isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              {isPending ? 'Confirm in wallet...' : 'Processing...'}
            </span>
          ) : !selectedToken ? (
            'Select a token'
          ) : !sellAmount ? (
            'Enter amount'
          ) : (
            `Swap ${isBuyMode ? 'PLS' : selectedToken.symbol} for ${isBuyMode ? selectedToken.symbol : 'PLS'}`
          )}
        </button>

        {/* Success Message */}
        {isSuccess && txHash && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm font-mono">
              Swap successful!{' '}
              <a
                href={`https://scan.pulsechain.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View tx
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Price Info */}
      {selectedToken && (currentPrice || bestQuote) && (
        <div className="mt-4 p-4 bg-[#1a1d26]/80 backdrop-blur-sm rounded-xl border border-[#26a69a]/20">
          {/* Route indicator */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700/50">
            <span className="text-gray-400 text-sm">Route</span>
            {selectedToken.graduated ? (
              <button
                onClick={() => setShowAllRoutes(!showAllRoutes)}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Zap size={14} className="text-[#26a69a] animate-pulse" />
                <span className="text-[#26a69a] text-sm font-mono">
                  {isLoadingQuote ? 'Finding best...' : bestQuote ? `${bestQuote.routerName} (BEST)` : 'DEX'}
                </span>
                <TrendingUp size={12} className="text-gray-500" />
              </button>
            ) : (
              <span className="text-yellow-400 text-sm font-mono">PUMP.FUD Bonding Curve</span>
            )}
          </div>

          {/* All routes for graduated tokens */}
          {selectedToken.graduated && showAllRoutes && allQuotes.length > 0 && (
            <div className="mb-3 pb-3 border-b border-gray-700/50 space-y-2">
              <span className="text-xs text-gray-500">All routes:</span>
              {allQuotes.map((q, idx) => (
                <div
                  key={q.router}
                  className={`flex justify-between text-xs font-mono ${idx === 0 ? 'text-[#26a69a]' : 'text-gray-400'}`}
                >
                  <span>{q.routerName}</span>
                  <span>{parseFloat(formatEther(q.amountOut)).toFixed(6)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Price</span>
            <span className="font-mono">
              {selectedToken.graduated && bestQuote ? (
                `1 ${selectedToken.symbol} ≈ ${(parseFloat(formatEther(parseEther(sellAmount || '1'))) / parseFloat(formatEther(bestQuote.amountOut || BigInt(1)))).toFixed(8)} PLS`
              ) : currentPrice ? (
                `1 ${selectedToken.symbol} = ${parseFloat(formatEther(currentPrice as bigint)).toFixed(8)} PLS`
              ) : '...'}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-400">Slippage</span>
            <span className="font-mono">{slippage}%</span>
          </div>
          {selectedToken.graduated && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <Zap size={10} className="text-[#26a69a]" />
                <span>LIVE - Routing: PulseX V1/V2 + Paisley Smart/V2</span>
              </div>
            </div>
          )}
          {!selectedToken.graduated && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2 text-[10px] text-yellow-400/70 font-mono">
                <span>⚡ Trading on PUMP.FUD curve • Graduates to DEX at bonding target</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDepositTab = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-[#1a1d26]/90 backdrop-blur-md rounded-2xl border border-[#26a69a]/30 p-6 shadow-[0_0_30px_rgba(38,166,154,0.15)]">
        <h3 className="text-xl font-bold mb-4">Add Liquidity</h3>
        <p className="text-gray-400 text-sm mb-6">
          Add liquidity for graduated tokens on PulseX. Earn fees from trades.
        </p>

        {/* Token Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Select Token</label>
          <button
            onClick={() => setIsTokenModalOpen(true)}
            className="w-full flex items-center justify-between bg-[#0d1017] px-4 py-3 rounded-xl border border-gray-700 hover:border-gray-600"
          >
            {selectedToken ? (
              <div className="flex items-center gap-2">
                {selectedToken.imageUri && (
                  <Image src={selectedToken.imageUri} alt="" width={24} height={24} className="rounded-full" />
                )}
                <span className="font-mono">{selectedToken.symbol}</span>
                {selectedToken.graduated && <span className="text-xs text-yellow-400">⚡</span>}
              </div>
            ) : (
              <span className="text-gray-500">Select a token</span>
            )}
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>

        {selectedToken && !selectedToken.graduated && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
            <p className="text-yellow-400 text-sm">
              This token hasn&apos;t graduated yet. It&apos;s still trading on the bonding curve.
              Once it graduates, you&apos;ll be able to add liquidity on PulseX.
            </p>
          </div>
        )}

        {selectedToken && selectedToken.graduated && (
          <>
            {/* PLS Amount */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">PLS Amount</label>
              <div className="bg-[#0d1017] rounded-xl p-3 border border-gray-700">
                <input
                  type="number"
                  placeholder="0.0"
                  className="w-full bg-transparent text-xl font-mono text-white outline-none"
                />
              </div>
            </div>

            {/* Token Amount */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">{selectedToken.symbol} Amount</label>
              <div className="bg-[#0d1017] rounded-xl p-3 border border-gray-700">
                <input
                  type="number"
                  placeholder="0.0"
                  className="w-full bg-transparent text-xl font-mono text-white outline-none"
                />
              </div>
            </div>

            <button className="w-full py-4 bg-[#26a69a] hover:bg-[#1e8a7e] text-black font-bold rounded-xl flex items-center justify-center gap-2">
              <Plus size={20} />
              Add Liquidity
            </button>
          </>
        )}

        {!selectedToken && (
          <p className="text-center text-gray-500 py-8">Select a graduated token to add liquidity</p>
        )}
      </div>
    </div>
  );

  const renderPositionsTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1a1d26]/90 backdrop-blur-md rounded-2xl border border-[#26a69a]/30 p-6 shadow-[0_0_30px_rgba(38,166,154,0.15)]">
        <h3 className="text-xl font-bold mb-4">Your Positions</h3>

        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Connect your wallet to view positions</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No liquidity positions found</p>
            <p className="text-gray-600 text-sm mt-2">
              Add liquidity to graduated tokens to start earning fees
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: 'url(/images/swap-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#26a69a]">
            PUMP.FUD
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/tokens" className="text-gray-400 hover:text-white text-sm">Tokens</Link>
            <Link href="/launch" className="text-gray-400 hover:text-white text-sm">Launch</Link>
            <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm">Leaderboard</Link>
          </nav>
        </div>
      </header>

      {/* Tabs */}
      <div className="relative z-10 border-b border-gray-800/50 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {(['swap', 'deposit', 'positions'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-mono transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-[#26a69a]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                [{tab === 'deposit' ? 'deposit/create' : tab}]
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {activeTab === 'swap' && renderSwapTab()}
        {activeTab === 'deposit' && renderDepositTab()}
        {activeTab === 'positions' && renderPositionsTab()}
      </main>

      {/* Token Selection Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#1a1d26] border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold">Select Token</h3>
              <button onClick={() => setIsTokenModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 bg-[#0d1017] px-3 py-2 rounded-xl border border-gray-700">
                <Search size={16} className="text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or address"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* Token List */}
            <div className="overflow-auto max-h-[400px]">
              {isLoadingTokens ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[#26a69a]" />
                </div>
              ) : filteredTokens.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No tokens found</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => {
                        setSelectedToken(token);
                        setIsTokenModalOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
                    >
                      {token.imageUri ? (
                        <Image src={token.imageUri} alt="" width={40} height={40} className="rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-700 rounded-full" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{token.symbol}</span>
                          {token.graduated ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#26a69a]/20 text-[#26a69a] text-[10px] font-bold rounded-full border border-[#26a69a]/50">
                              <Zap size={10} className="animate-pulse" />
                              LIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-[10px] font-mono rounded-full">
                              CURVE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{token.name}</p>
                      </div>
                      {token.graduated && (
                        <div className="w-2 h-2 bg-[#26a69a] rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#1a1d26] border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Slippage Tolerance</label>
              <div className="flex gap-2">
                {['1', '5', '10'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`flex-1 py-2 rounded-lg font-mono text-sm ${
                      slippage === val
                        ? 'bg-[#26a69a] text-black font-bold'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="flex-1 bg-gray-800 text-center font-mono text-sm rounded-lg border border-gray-700 outline-none focus:border-[#26a69a]"
                />
              </div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-3 bg-[#26a69a] text-black font-bold rounded-xl hover:bg-[#1e8a7e]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
