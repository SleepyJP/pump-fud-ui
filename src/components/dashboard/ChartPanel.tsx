'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface ChartPanelProps {
  tokenAddress?: `0x${string}`;
}

interface TradeData {
  timestamp: number;
  price: number;
  volume: number;
  isBuy: boolean;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type TimeFrame = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

const TIMEFRAME_SECONDS: Record<TimeFrame, number> = {
  '1M': 60,
  '5M': 300,
  '15M': 900,
  '1H': 3600,
  '4H': 14400,
  '1D': 86400,
};

export function ChartPanel({ tokenAddress }: ChartPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isMountedRef = useRef(true);
  const initAttempts = useRef(0);

  const [timeframe, setTimeframe] = useState<TimeFrame>('5M');
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const publicClient = usePublicClient();

  // Fetch trade events from chain
  const fetchTrades = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);

    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(30000); // ~1 day on PulseChain

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

      // Get block timestamps (limited to prevent RPC overload)
      const blockNumbers = [...new Set([...buyLogs, ...sellLogs].map((l) => l.blockNumber))];
      const blockTimestamps: Record<string, number> = {};

      const blocksToFetch = blockNumbers.slice(0, 50);
      await Promise.all(
        blocksToFetch.map(async (bn) => {
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
      let runningPlsReserve = BigInt(0);
      let runningTokenSupply = BigInt(250_000_000) * BigInt(10 ** 18);

      const allLogs = [
        ...buyLogs.map(l => ({ ...l, type: 'buy' as const })),
        ...sellLogs.map(l => ({ ...l, type: 'sell' as const })),
      ].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
        return Number(a.logIndex - b.logIndex);
      });

      for (const log of allLogs) {
        const timestamp = blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000);

        if (log.type === 'buy') {
          const args = log.args as { buyer: `0x${string}`; plsSpent: bigint; tokensBought: bigint };
          if (args.plsSpent && args.tokensBought) {
            runningPlsReserve += args.plsSpent;
            runningTokenSupply -= args.tokensBought;
            const price = runningTokenSupply > BigInt(0)
              ? Number(formatUnits(runningPlsReserve * BigInt(10 ** 18) / runningTokenSupply, 18))
              : 0;
            tradeData.push({
              timestamp,
              price: price > 0 ? price : Number(formatUnits(args.plsSpent, 18)) / Number(formatUnits(args.tokensBought, 18)),
              volume: Number(formatUnits(args.plsSpent, 18)),
              isBuy: true,
            });
          }
        } else {
          const args = log.args as { seller: `0x${string}`; tokensSold: bigint; plsReceived: bigint };
          if (args.tokensSold && args.plsReceived) {
            runningPlsReserve -= args.plsReceived;
            runningTokenSupply += args.tokensSold;
            const price = runningTokenSupply > BigInt(0)
              ? Number(formatUnits(runningPlsReserve * BigInt(10 ** 18) / runningTokenSupply, 18))
              : 0;
            tradeData.push({
              timestamp,
              price: price > 0 ? price : Number(formatUnits(args.plsReceived, 18)) / Number(formatUnits(args.tokensSold, 18)),
              volume: Number(formatUnits(args.plsReceived, 18)),
              isBuy: false,
            });
          }
        }
      }

      // If no trades, show initial bonding curve price
      if (tradeData.length === 0) {
        const now = Math.floor(Date.now() / 1000);
        const initialPrice = 0.0000002;
        tradeData.push({ timestamp: now - 300, price: initialPrice, volume: 0, isBuy: true });
        tradeData.push({ timestamp: now, price: initialPrice, volume: 0, isBuy: true });
      }

      if (!isMountedRef.current) return;

      setTrades(tradeData);
      setLastUpdate(new Date());

      if (tradeData.length > 0) {
        const latestPrice = tradeData[tradeData.length - 1].price;
        setCurrentPrice(latestPrice);
        if (tradeData.length > 1) {
          const oldPrice = tradeData[0].price;
          setPriceChange(oldPrice > 0 ? ((latestPrice - oldPrice) / oldPrice) * 100 : 0);
        }
      }
    } catch (err) {
      console.error('[Chart] Failed to fetch trades:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tokenAddress, publicClient]);

  // Use shared block refresh - EVERY BLOCK
  useBlockRefresh('chart', fetchTrades, 1, !!tokenAddress);

  // Initial fetch on mount
  useEffect(() => {
    if (tokenAddress) {
      fetchTrades();
    }
  }, [tokenAddress]); // fetchTrades intentionally excluded

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Convert trades to candles
  const tradesToCandles = useCallback((tradeData: TradeData[], tf: TimeFrame): CandleData[] => {
    if (tradeData.length === 0) return [];

    const interval = TIMEFRAME_SECONDS[tf];
    const candleMap = new Map<number, CandleData>();

    for (const trade of tradeData) {
      const candleTime = Math.floor(trade.timestamp / interval) * interval;

      if (!candleMap.has(candleTime)) {
        candleMap.set(candleTime, {
          time: candleTime,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.volume,
        });
      } else {
        const candle = candleMap.get(candleTime)!;
        candle.high = Math.max(candle.high, trade.price);
        candle.low = Math.min(candle.low, trade.price);
        candle.close = trade.price;
        candle.volume += trade.volume;
      }
    }

    return Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chartInstance: any = null;
    let mounted = true;

    const initChart = async () => {
      try {
        const lwc = await import('lightweight-charts');
        const { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries, HistogramSeries } = lwc;

        if (!chartContainerRef.current || !mounted) return;

        const container = chartContainerRef.current;
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 300;

        // Don't init if dimensions are invalid
        if (width <= 0 || height <= 0) {
          console.warn('[Chart] Invalid container dimensions, retrying...');
          setTimeout(initChart, 100);
          return;
        }

        // Destroy existing chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        chartInstance = createChart(container, {
          width,
          height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: 'rgba(0, 255, 136, 0.05)', style: LineStyle.Dotted },
          horzLines: { color: 'rgba(0, 255, 136, 0.05)', style: LineStyle.Dotted },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: 'rgba(0, 255, 136, 0.5)', labelBackgroundColor: '#00ff88' },
          horzLine: { color: 'rgba(0, 255, 136, 0.5)', labelBackgroundColor: '#00ff88' },
        },
        rightPriceScale: {
          borderColor: 'rgba(0, 255, 136, 0.2)',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: 'rgba(0, 255, 136, 0.2)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      const candleSeries = chartInstance.addSeries(CandlestickSeries, {
        upColor: '#00ff88',
        downColor: '#ef4444',
        borderUpColor: '#00ff88',
        borderDownColor: '#ef4444',
        wickUpColor: '#00ff88',
        wickDownColor: '#ef4444',
      });

      const volumeSeries = chartInstance.addSeries(HistogramSeries, {
        color: '#00ff88',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      chartRef.current = chartInstance;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // Safe ResizeObserver with cleanup
      resizeObserverRef.current = new ResizeObserver((entries) => {
        if (chartInstance && entries[0] && mounted) {
          const { width, height } = entries[0].contentRect;
          if (width > 0 && height > 0) {
            chartInstance.applyOptions({ width, height });
          }
        }
      });
      resizeObserverRef.current.observe(container);
      } catch (err) {
        console.error('[Chart] Failed to initialize chart:', err);
      }
    };

    initChart();

    return () => {
      mounted = false;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart data when trades or timeframe change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || trades.length === 0) return;

    try {
      const candles = tradesToCandles(trades, timeframe);

      // Filter out invalid candles (must have valid time > 0 and valid price values)
      const validCandles = candles.filter(c =>
        c.time > 0 &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close) &&
        c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
      );

      if (validCandles.length > 0) {
        candleSeriesRef.current.setData(
          validCandles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

        volumeSeriesRef.current.setData(
          validCandles.map((c) => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(0, 255, 136, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          }))
        );

        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      console.error('[Chart] Failed to update chart data:', err);
    }
  }, [trades, timeframe, tradesToCandles]);

  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    if (price < 0.00000001) return price.toExponential(4);
    if (price < 0.0001) return price.toFixed(10);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
        <div className="flex items-center gap-3">
          <span className="text-fud-green text-lg">📊</span>
          <span className="font-display text-sm text-fud-green">PRICE CHART</span>
          {isLoading && (
            <RefreshCw size={12} className="text-fud-green animate-spin" />
          )}
        </div>
        {currentPrice > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-fud-green font-mono text-sm font-bold">
              {formatPrice(currentPrice)} PLS
            </span>
            <span className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded ${
              priceChange >= 0
                ? 'bg-fud-green/20 text-fud-green'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {priceChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(priceChange).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Timeframe Buttons */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-fud-green/10 bg-dark-secondary/30">
        {(['1M', '5M', '15M', '1H', '4H', '1D'] as TimeFrame[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1.5 text-[10px] font-mono rounded transition-all ${
              timeframe === tf
                ? 'text-black bg-fud-green font-bold shadow-lg shadow-fud-green/30'
                : 'text-text-muted hover:text-fud-green hover:bg-fud-green/10'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative min-h-0">
        <div ref={chartContainerRef} className="absolute inset-0">
          {!tokenAddress && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-primary/80">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-50">📈</div>
                <p className="text-text-muted text-sm font-mono">Select a token to view chart</p>
              </div>
            </div>
          )}
          {tokenAddress && isLoading && trades.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-primary/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-fud-green/30 border-t-fud-green rounded-full animate-spin" />
                <span className="text-fud-green text-xs font-mono">Loading chart data...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-fud-green/10 bg-dark-secondary/30 flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-muted">
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Waiting for data...'}
        </span>
        <span className="text-[10px] font-mono text-fud-green">
          {trades.length} trades
        </span>
      </div>
    </div>
  );
}
