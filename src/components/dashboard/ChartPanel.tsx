'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

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

  const [timeframe, setTimeframe] = useState<TimeFrame>('5M');
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Fetch trade events from chain
  const fetchTrades = useCallback(async () => {
    if (!tokenAddress || !publicClient) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event Buy(address indexed buyer, uint256 plsIn, uint256 tokensOut, uint256 newPrice)');
      const sellEvent = parseAbiItem('event Sell(address indexed seller, uint256 tokensIn, uint256 plsOut, uint256 newPrice)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(50000); // ~3 days of blocks

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

      // Get block timestamps
      const blockNumbers = [...new Set([...buyLogs, ...sellLogs].map((l) => l.blockNumber))];
      const blockTimestamps: Record<string, number> = {};

      await Promise.all(
        blockNumbers.slice(0, 100).map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps[bn.toString()] = Number(block.timestamp);
          } catch {
            blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
          }
        })
      );

      const tradeData: TradeData[] = [];

      for (const log of buyLogs) {
        const args = log.args as { plsIn: bigint; tokensOut: bigint; newPrice: bigint };
        if (args.newPrice) {
          tradeData.push({
            timestamp: blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000),
            price: Number(formatUnits(args.newPrice, 18)),
            volume: Number(formatUnits(args.plsIn, 18)),
            isBuy: true,
          });
        }
      }

      for (const log of sellLogs) {
        const args = log.args as { tokensIn: bigint; plsOut: bigint; newPrice: bigint };
        if (args.newPrice) {
          tradeData.push({
            timestamp: blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000),
            price: Number(formatUnits(args.newPrice, 18)),
            volume: Number(formatUnits(args.plsOut, 18)),
            isBuy: false,
          });
        }
      }

      tradeData.sort((a, b) => a.timestamp - b.timestamp);
      setTrades(tradeData);

      if (tradeData.length > 0) {
        const latestPrice = tradeData[tradeData.length - 1].price;
        setCurrentPrice(latestPrice);
        if (tradeData.length > 1) {
          const oldPrice = tradeData[0].price;
          setPriceChange(oldPrice > 0 ? ((latestPrice - oldPrice) / oldPrice) * 100 : 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Convert trades to candles
  const tradesToCandles = useCallback(
    (tradeData: TradeData[], tf: TimeFrame): CandleData[] => {
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
    },
    []
  );

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chartInstance: any = null;

    const initChart = async () => {
      const { createChart, ColorType, CrosshairMode, LineStyle } = await import('lightweight-charts');

      if (!chartContainerRef.current) return;

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const container = chartContainerRef.current;

      chartInstance = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
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

      // Candlestick series
      const candleSeries = chartInstance.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ef4444',
        borderUpColor: '#00ff88',
        borderDownColor: '#ef4444',
        wickUpColor: '#00ff88',
        wickDownColor: '#ef4444',
      });

      // Volume histogram
      const volumeSeries = chartInstance.addHistogramSeries({
        color: '#00ff88',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.85, bottom: 0 },
      });

      chartRef.current = chartInstance;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // Resize observer
      resizeObserverRef.current = new ResizeObserver((entries) => {
        if (chartInstance && entries[0]) {
          const { width, height } = entries[0].contentRect;
          chartInstance.applyOptions({ width, height });
        }
      });
      resizeObserverRef.current.observe(container);
    };

    initChart();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || trades.length === 0) return;

    const candles = tradesToCandles(trades, timeframe);

    if (candles.length > 0) {
      // Normalize prices to avoid extreme scales
      const prices = candles.flatMap((c) => [c.open, c.high, c.low, c.close]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;

      // If price range is too extreme (>1000x), use log scale by normalizing
      let normalizedCandles = candles;
      if (priceRange > 0 && maxPrice / Math.max(minPrice, 1e-18) > 1000) {
        // Apply mild normalization to compress extreme values
        normalizedCandles = candles.map((c) => ({
          ...c,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
      }

      candleSeriesRef.current.setData(
        normalizedCandles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeriesRef.current.setData(
        normalizedCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(0, 255, 136, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        }))
      );

      // Fit content to view
      chartRef.current?.timeScale().fitContent();
    }
  }, [trades, timeframe, tradesToCandles]);

  // Fetch trades on token change
  useEffect(() => {
    if (tokenAddress) {
      fetchTrades();
    }
  }, [tokenAddress, fetchTrades]);

  // Refresh on new blocks (throttled)
  useEffect(() => {
    if (tokenAddress && blockNumber && Number(blockNumber) % 10 === 0) {
      fetchTrades();
    }
  }, [blockNumber, tokenAddress, fetchTrades]);

  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    if (price < 0.00000001) return price.toExponential(4);
    if (price < 0.0001) return price.toFixed(10);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  return (
    <Card className="h-full flex flex-col" variant="glow">
      <CardHeader>
        <div className="flex items-center gap-4">
          <CardTitle>Price Chart</CardTitle>
          {currentPrice > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-fud-green font-mono text-sm">{formatPrice(currentPrice)} PLS</span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded ${
                  priceChange >= 0 ? 'bg-fud-green/20 text-fud-green' : 'bg-fud-red/20 text-fud-red'
                }`}
              >
                {priceChange >= 0 ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['1M', '5M', '15M', '1H', '4H', '1D'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                timeframe === tf
                  ? 'text-fud-green border border-fud-green/50 bg-fud-green/10'
                  : 'text-text-muted hover:text-fud-green border border-border-primary hover:border-fud-green/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 relative min-h-0">
        <div ref={chartContainerRef} className="absolute inset-0">
          {!tokenAddress && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-secondary/50 rounded">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-text-muted text-sm font-mono">Select a token to view chart</p>
              </div>
            </div>
          )}
          {tokenAddress && isLoading && trades.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-secondary/50 rounded">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-muted text-sm font-mono">Loading trades...</p>
              </div>
            </div>
          )}
          {tokenAddress && !isLoading && trades.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-secondary/50 rounded">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-text-muted text-sm font-mono">No trades yet</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
