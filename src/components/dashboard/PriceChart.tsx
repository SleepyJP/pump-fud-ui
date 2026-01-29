'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';
import { TOKEN_ABI } from '@/config/abis';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  Time,
} from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  RotateCcw,
  BarChart3,
  LineChart,
} from 'lucide-react';

interface TradeData {
  timestamp: number;
  price: number;
  type: 'buy' | 'sell';
  volume: number;
}

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PriceChartProps {
  tokenAddress?: `0x${string}`;
}

const TIMEFRAMES = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1h', seconds: 3600 },
  { label: '4h', seconds: 14400 },
  { label: '1D', seconds: 86400 },
];

export function PriceChart({ tokenAddress }: PriceChartProps) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]); // 5m default
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [isScaleLocked, setIsScaleLocked] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const isMountedRef = useRef(true);
  const publicClient = usePublicClient();

  // Get current price from contract
  const { data: currentPrice } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'getCurrentPrice',
    query: { enabled: !!tokenAddress },
  });

  // Fetch trade data from blockchain
  const fetchTradeData = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      // Get more history for better chart data
      const fromBlock = currentBlock - BigInt(50000); // ~2 days of data

      const [buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({
          address: tokenAddress,
          event: buyEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
        publicClient.getLogs({
          address: tokenAddress,
          event: sellEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
      ]);

      if (!isMountedRef.current) return;

      // Get block timestamps
      const allLogs = [...buyLogs, ...sellLogs];
      const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
      const blockTimestamps: Record<string, number> = {};

      // Batch fetch block timestamps
      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps[bn.toString()] = Number(block.timestamp);
          } catch {
            blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
          }
        })
      );

      if (!isMountedRef.current) return;

      const tradeData: TradeData[] = [];

      for (const log of buyLogs) {
        const args = log.args as { plsSpent: bigint; tokensBought: bigint };
        if (!args.plsSpent || !args.tokensBought || args.tokensBought === BigInt(0)) continue;
        const price = Number(formatEther(args.plsSpent)) / Number(formatEther(args.tokensBought));
        tradeData.push({
          timestamp: blockTimestamps[log.blockNumber?.toString() || '0'] || Math.floor(Date.now() / 1000),
          price,
          type: 'buy',
          volume: Number(formatEther(args.plsSpent)),
        });
      }

      for (const log of sellLogs) {
        const args = log.args as { tokensSold: bigint; plsReceived: bigint };
        if (!args.tokensSold || !args.plsReceived || args.tokensSold === BigInt(0)) continue;
        const price = Number(formatEther(args.plsReceived)) / Number(formatEther(args.tokensSold));
        tradeData.push({
          timestamp: blockTimestamps[log.blockNumber?.toString() || '0'] || Math.floor(Date.now() / 1000),
          price,
          type: 'sell',
          volume: Number(formatEther(args.plsReceived)),
        });
      }

      tradeData.sort((a, b) => a.timestamp - b.timestamp);
      setTrades(tradeData);
    } catch (err) {
      console.error('[PriceChart] Error fetching trades:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Refresh on new blocks
  useBlockRefresh('pricechart', fetchTradeData, 3, !!tokenAddress);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) {
      setTrades([]);
      fetchTradeData();
    }
  }, [tokenAddress, fetchTradeData]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Build candle data from trades
  const buildCandleData = useCallback((trades: TradeData[], timeframeSecs: number): CandleData[] => {
    if (trades.length === 0) return [];

    const candles: Map<number, CandleData> = new Map();

    for (const trade of trades) {
      const candleTime = Math.floor(trade.timestamp / timeframeSecs) * timeframeSecs;

      if (!candles.has(candleTime)) {
        candles.set(candleTime, {
          time: candleTime as Time,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
        });
      } else {
        const candle = candles.get(candleTime)!;
        candle.high = Math.max(candle.high, trade.price);
        candle.low = Math.min(candle.low, trade.price);
        candle.close = trade.price;
      }
    }

    return Array.from(candles.values()).sort((a, b) => (a.time as number) - (b.time as number));
  }, []);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || trades.length === 0) return;

    // Create chart if not exists
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
          fontFamily: 'monospace',
        },
        grid: {
          vertLines: { color: 'rgba(57, 255, 20, 0.05)' },
          horzLines: { color: 'rgba(57, 255, 20, 0.05)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: 'rgba(57, 255, 20, 0.5)', labelBackgroundColor: '#39ff14' },
          horzLine: { color: 'rgba(57, 255, 20, 0.5)', labelBackgroundColor: '#39ff14' },
        },
        rightPriceScale: {
          borderColor: 'rgba(57, 255, 20, 0.2)',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: 'rgba(57, 255, 20, 0.2)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: true },
        handleScale: { axisPressedMouseMove: !isScaleLocked },
      });

      // Add candlestick series
      candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#39ff14',
        downColor: '#ef4444',
        borderUpColor: '#39ff14',
        borderDownColor: '#ef4444',
        wickUpColor: '#39ff14',
        wickDownColor: '#ef4444',
      });

      // Add line series (hidden by default)
      lineSeriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: '#39ff14',
        lineWidth: 2,
        visible: chartType === 'line',
      });

      // Handle resize
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => window.removeEventListener('resize', handleResize);
    }

    // Update chart data
    const candleData = buildCandleData(trades, selectedTimeframe.seconds);

    if (candleSeriesRef.current && chartType === 'candle') {
      candleSeriesRef.current.setData(candleData);
      candleSeriesRef.current.applyOptions({ visible: true });
      lineSeriesRef.current?.applyOptions({ visible: false });
    }

    if (lineSeriesRef.current && chartType === 'line') {
      const lineData = candleData.map(c => ({ time: c.time, value: c.close }));
      lineSeriesRef.current.setData(lineData);
      lineSeriesRef.current.applyOptions({ visible: true });
      candleSeriesRef.current?.applyOptions({ visible: false });
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [trades, selectedTimeframe, chartType, buildCandleData, isScaleLocked]);

  // Chart controls
  const handleZoomIn = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const newRange = {
          from: visibleRange.from + (visibleRange.to - visibleRange.from) * 0.25,
          to: visibleRange.to - (visibleRange.to - visibleRange.from) * 0.25,
        };
        timeScale.setVisibleLogicalRange(newRange);
      }
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const newRange = {
          from: visibleRange.from - (visibleRange.to - visibleRange.from) * 0.25,
          to: visibleRange.to + (visibleRange.to - visibleRange.from) * 0.25,
        };
        timeScale.setVisibleLogicalRange(newRange);
      }
    }
  };

  const handleReset = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const toggleScaleLock = () => {
    setIsScaleLocked(!isScaleLocked);
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScale: { axisPressedMouseMove: isScaleLocked },
      });
    }
  };

  // Calculate stats
  const firstPrice = trades.length > 0 ? trades[0].price : 0;
  const lastPrice = trades.length > 0 ? trades[trades.length - 1].price : 0;
  const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);

  const formatPrice = (p: number) => {
    if (p < 0.00000001) return p.toExponential(2);
    if (p < 0.0001) return p.toFixed(10);
    return p.toFixed(8);
  };

  const currentPriceDisplay = currentPrice
    ? formatPrice(Number(formatEther(currentPrice as bigint)))
    : lastPrice > 0 ? formatPrice(lastPrice) : '--';

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-black/40 to-black/60">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Price & Controls */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#39ff14]/20">
        <div className="flex items-center gap-3">
          <Activity size={16} className="text-[#39ff14]" />
          <span className="text-white font-mono text-sm font-bold">{currentPriceDisplay} PLS</span>
          {priceChange !== 0 && (
            <span className={`flex items-center gap-1 text-xs font-mono ${priceChange >= 0 ? 'text-[#39ff14]' : 'text-red-400'}`}>
              {priceChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartType('candle')}
            className={`p-1.5 rounded ${chartType === 'candle' ? 'bg-[#39ff14]/20 text-[#39ff14]' : 'text-gray-500 hover:text-gray-300'}`}
            title="Candlestick"
          >
            <BarChart3 size={14} />
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded ${chartType === 'line' ? 'bg-[#39ff14]/20 text-[#39ff14]' : 'text-gray-500 hover:text-gray-300'}`}
            title="Line"
          >
            <LineChart size={14} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TIMEFRAME SELECTOR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#39ff14]/10">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-all ${
                selectedTimeframe.label === tf.label
                  ? 'bg-[#39ff14] text-black font-bold'
                  : 'text-gray-400 hover:text-[#39ff14] hover:bg-[#39ff14]/10'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button onClick={handleZoomIn} className="p-1 text-gray-400 hover:text-[#39ff14]" title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button onClick={handleZoomOut} className="p-1 text-gray-400 hover:text-[#39ff14]" title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button
            onClick={toggleScaleLock}
            className={`p-1 ${isScaleLocked ? 'text-[#39ff14]' : 'text-gray-400 hover:text-[#39ff14]'}`}
            title={isScaleLocked ? 'Unlock Scale' : 'Lock Scale'}
          >
            {isScaleLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button onClick={handleReset} className="p-1 text-gray-400 hover:text-[#39ff14]" title="Reset">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHART AREA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative min-h-[200px]">
        {!tokenAddress ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-xs font-mono">Select a token</p>
          </div>
        ) : isLoading && trades.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
          </div>
        ) : trades.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Activity size={40} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm font-mono">No trades yet</p>
              <p className="text-gray-600 text-xs font-mono mt-1">Chart will populate with trading activity</p>
            </div>
          </div>
        ) : (
          <div ref={chartContainerRef} className="absolute inset-0" />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER - Stats */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-3 py-1.5 border-t border-[#39ff14]/10 flex justify-between text-[10px] font-mono text-gray-500">
        <span>Trades: {trades.length}</span>
        <span>Vol: {totalVolume.toFixed(2)} PLS</span>
        <span>Buys: {trades.filter(t => t.type === 'buy').length}</span>
        <span>Sells: {trades.filter(t => t.type === 'sell').length}</span>
      </div>
    </div>
  );
}
