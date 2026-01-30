'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { TrendingUp, TrendingDown, RefreshCw, Zap, ChevronDown } from 'lucide-react';

interface ChartPanelProps {
  tokenAddress?: `0x${string}`;
}

interface TradeData {
  timestamp: number;
  price: number;
  volume: number;
  isBuy: boolean;
  blockNumber: bigint;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  buyVolume: number;
  sellVolume: number;
  buyCount: number;
  sellCount: number;
}

// V3: Tokens emit their own events, not the factory
// TokenBought(buyer, plsSpent, tokensBought, referrer)
// TokenSold(seller, tokensSold, plsReceived)

// BEAST MODE TIMEFRAMES - including seconds for snipers
type TimeFrame = '5S' | '15S' | '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

// Chart types like TradingView
type ChartType = 'candles' | 'line' | 'area' | 'bars' | 'hollow';

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  candles: '🕯️ Candles',
  hollow: '🕯️ Hollow',
  bars: '📊 Bars',
  line: '📈 Line',
  area: '📉 Area',
};

const TIMEFRAME_SECONDS: Record<TimeFrame, number> = {
  '5S': 5,
  '15S': 15,
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
  const isChartReadyRef = useRef(false);
  const lastFetchBlockRef = useRef<bigint>(BigInt(0));

  const [timeframe, setTimeframe] = useState<TimeFrame>('1M');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tradeCount, setTradeCount] = useState(0);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false); // STATE triggers re-render when chart ready

  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // BEAST MODE: Fetch ALL trade events
  const fetchTrades = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    // Prevent duplicate fetches for same block
    if (blockNumber && blockNumber === lastFetchBlockRef.current) return;
    if (blockNumber) lastFetchBlockRef.current = blockNumber;

    setIsLoading(true);

    try {
      // V3: Events emitted FROM THE TOKEN ITSELF, not factory
      // TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)
      // TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      // BEAST: Go back 100k blocks (~4 days on PulseChain) for full history
      const fromBlock = currentBlock - BigInt(100000);

      // Query TOKEN CONTRACT directly for its events
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

      // Get ALL block timestamps for accuracy
      const blockNumbers = [...new Set([...buyLogs, ...sellLogs].map((l) => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
      const blockTimestamps: Record<string, number> = {};

      // Fetch in batches of 50 to not overload RPC
      for (let i = 0; i < blockNumbers.length; i += 50) {
        const batch = blockNumbers.slice(i, i + 50);
        await Promise.all(
          batch.map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockTimestamps[bn?.toString() ?? '0'] = Number(block.timestamp);
            } catch {
              // Fallback: estimate timestamp based on 3s block time
              const blocksAgo = Number(currentBlock - bn);
              blockTimestamps[bn?.toString() ?? '0'] = Math.floor(Date.now() / 1000) - (blocksAgo * 3);
            }
          })
        );
      }

      if (!isMountedRef.current) return;

      const tradeData: TradeData[] = [];
      // PUMP.FUD bonding curve starts with 800M tokens
      let runningPlsReserve = BigInt(0);
      let runningTokenSupply = BigInt(800_000_000) * BigInt(10 ** 18);

      const allLogs = [
        ...buyLogs.map(l => ({ ...l, type: 'buy' as const })),
        ...sellLogs.map(l => ({ ...l, type: 'sell' as const })),
      ].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
        return Number(a.logIndex - b.logIndex);
      });

      for (const log of allLogs) {
        const timestamp = blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000);

        if (log.type === 'buy') {
          // V3: { buyer, plsSpent, tokensBought, referrer }
          const args = log.args as { buyer: `0x${string}`; plsSpent: bigint; tokensBought: bigint; referrer: `0x${string}` };
          if (args?.plsSpent && args?.tokensBought && args.plsSpent > BigInt(0) && args.tokensBought > BigInt(0)) {
            runningPlsReserve += args.plsSpent;
            runningTokenSupply -= args.tokensBought;

            // Calculate price with maximum precision
            const price = runningTokenSupply > BigInt(0)
              ? Number(formatUnits(runningPlsReserve * BigInt(10 ** 18) / runningTokenSupply, 18))
              : Number(formatUnits(args.plsSpent, 18)) / Number(formatUnits(args.tokensBought, 18));

            if (price > 0 && Number.isFinite(price)) {
              tradeData.push({
                timestamp,
                price,
                volume: Number(formatUnits(args.plsSpent, 18)),
                isBuy: true,
                blockNumber: log.blockNumber,
              });
            }
          }
        } else {
          // V3: { seller, tokensSold, plsReceived }
          const args = log.args as { seller: `0x${string}`; tokensSold: bigint; plsReceived: bigint };
          if (args?.tokensSold && args?.plsReceived && args.tokensSold > BigInt(0) && args.plsReceived > BigInt(0)) {
            runningPlsReserve -= args.plsReceived;
            runningTokenSupply += args.tokensSold;

            const price = runningTokenSupply > BigInt(0)
              ? Number(formatUnits(runningPlsReserve * BigInt(10 ** 18) / runningTokenSupply, 18))
              : Number(formatUnits(args.plsReceived, 18)) / Number(formatUnits(args.tokensSold, 18));

            if (price > 0 && Number.isFinite(price)) {
              tradeData.push({
                timestamp,
                price,
                volume: Number(formatUnits(args.plsReceived, 18)),
                isBuy: false,
                blockNumber: log.blockNumber,
              });
            }
          }
        }
      }

      // If no trades, create initial point at bonding curve start price
      if (tradeData.length === 0) {
        const now = Math.floor(Date.now() / 1000);
        const initialPrice = 0.0000000625; // Initial bonding curve price
        tradeData.push({ timestamp: now - 300, price: initialPrice, volume: 0, isBuy: true, blockNumber: BigInt(0) });
        tradeData.push({ timestamp: now, price: initialPrice, volume: 0, isBuy: true, blockNumber: BigInt(0) });
      }

      if (!isMountedRef.current) return;

      console.log('[BeastChart] 📊 Fetched', tradeData.length, 'trades, prices:', tradeData.slice(0, 3).map(t => t.price));
      setTrades(tradeData);
      setTradeCount(tradeData.length);
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
      console.error('[BeastChart] Failed to fetch trades:', err);
      setChartError('Failed to fetch trade data');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tokenAddress, publicClient, blockNumber]);

  // Convert trades to candles with buy/sell tracking
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
          trades: 1,
          buyVolume: trade.isBuy ? trade.volume : 0,
          sellVolume: trade.isBuy ? 0 : trade.volume,
          buyCount: trade.isBuy ? 1 : 0,
          sellCount: trade.isBuy ? 0 : 1,
        });
      } else {
        const candle = candleMap.get(candleTime)!;
        candle.high = Math.max(candle.high, trade.price);
        candle.low = Math.min(candle.low, trade.price);
        candle.close = trade.price;
        candle.volume += trade.volume;
        candle.trades += 1;
        if (trade.isBuy) {
          candle.buyVolume += trade.volume;
          candle.buyCount += 1;
        } else {
          candle.sellVolume += trade.volume;
          candle.sellCount += 1;
        }
      }
    }

    return Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
  }, []);

  // BEAST MODE: Initialize chart with proper sequence
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let mounted = true;

    const initChart = async () => {
      try {
        // Wait for container to have valid dimensions
        const container = chartContainerRef.current;
        if (!container) return;

        let attempts = 0;
        while ((container.clientWidth <= 0 || container.clientHeight <= 0) && attempts < 20) {
          await new Promise(r => setTimeout(r, 50));
          attempts++;
        }

        if (!mounted || !container || container.clientWidth <= 0 || container.clientHeight <= 0) {
          console.warn('[BeastChart] Container not ready after retries');
          return;
        }

        const lwc = await import('lightweight-charts');
        const { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries, HistogramSeries } = lwc;

        if (!mounted || !chartContainerRef.current) return;

        // Destroy existing chart
        if (chartRef.current) {
          try {
            chartRef.current.remove();
          } catch (e) {
            // Ignore removal errors
          }
          chartRef.current = null;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;

        const chartInstance = createChart(container, {
          width,
          height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#9ca3af',
            fontFamily: "'JetBrains Mono', monospace",
          },
          grid: {
            vertLines: { color: 'rgba(214, 255, 224, 0.05)', style: LineStyle.Dotted },
            horzLines: { color: 'rgba(214, 255, 224, 0.05)', style: LineStyle.Dotted },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: 'rgba(214, 255, 224, 0.5)', labelBackgroundColor: '#d6ffe0' },
            horzLine: { color: 'rgba(214, 255, 224, 0.5)', labelBackgroundColor: '#d6ffe0' },
          },
          rightPriceScale: {
            borderColor: 'rgba(214, 255, 224, 0.2)',
            scaleMargins: { top: 0.1, bottom: 0.2 },
          },
          timeScale: {
            borderColor: 'rgba(214, 255, 224, 0.2)',
            timeVisible: true,
            secondsVisible: true, // BEAST: Show seconds for precision
          },
          handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chartInstance;

        // Create initial candlestick series RIGHT HERE - no async bullshit
        const candleSeries = chartInstance.addSeries(CandlestickSeries, {
          upColor: '#d6ffe0',
          downColor: '#ef4444',
          borderUpColor: '#d6ffe0',
          borderDownColor: '#ef4444',
          wickUpColor: '#d6ffe0',
          wickDownColor: '#ef4444',
        });
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = null;
        isChartReadyRef.current = true;
        console.log('[BeastChart] ✅ Chart + Series initialized, container:', width, 'x', height);
        setChartReady(true); // Now chart AND series are both ready

        // Safe ResizeObserver
        resizeObserverRef.current = new ResizeObserver((entries) => {
          if (!mounted || !chartInstance) return;
          try {
            const entry = entries[0];
            if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              chartInstance.applyOptions({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
              });
            }
          } catch (e) {
            // Ignore resize errors
          }
        });
        resizeObserverRef.current.observe(container);

        setChartError(null);
      } catch (err) {
        console.error('[BeastChart] Init failed:', err);
        setChartError('Failed to initialize chart');
      }
    };

    initChart();

    return () => {
      mounted = false;
      isChartReadyRef.current = false;
      setChartReady(false);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          // Ignore
        }
        chartRef.current = null;
      }
    };
  }, []);

  // Track if this is the first chartType effect run (skip it - series already created in init)
  const initialChartTypeRef = useRef(true);

  // Create/update series when chart type changes (NOT on initial mount)
  useEffect(() => {
    if (!chartReady || !chartRef.current) return;

    // Skip initial run - series was already created in chart init
    if (initialChartTypeRef.current) {
      initialChartTypeRef.current = false;
      return;
    }

    const createSeries = async () => {
      const lwc = await import('lightweight-charts');
      const { CandlestickSeries, LineSeries, AreaSeries, BarSeries } = lwc;

      // Remove existing series
      if (candleSeriesRef.current) {
        try {
          chartRef.current.removeSeries(candleSeriesRef.current);
        } catch (e) {
          // Ignore
        }
        candleSeriesRef.current = null;
      }

      // Create new series based on type
      let newSeries;
      switch (chartType) {
        case 'candles':
          newSeries = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#d6ffe0',
            downColor: '#ef4444',
            borderUpColor: '#d6ffe0',
            borderDownColor: '#ef4444',
            wickUpColor: '#d6ffe0',
            wickDownColor: '#ef4444',
          });
          break;
        case 'hollow':
          newSeries = chartRef.current.addSeries(CandlestickSeries, {
            upColor: 'transparent',
            downColor: 'transparent',
            borderUpColor: '#d6ffe0',
            borderDownColor: '#ef4444',
            wickUpColor: '#d6ffe0',
            wickDownColor: '#ef4444',
          });
          break;
        case 'bars':
          newSeries = chartRef.current.addSeries(BarSeries, {
            upColor: '#d6ffe0',
            downColor: '#ef4444',
          });
          break;
        case 'line':
          newSeries = chartRef.current.addSeries(LineSeries, {
            color: '#d6ffe0',
            lineWidth: 2,
          });
          break;
        case 'area':
          newSeries = chartRef.current.addSeries(AreaSeries, {
            lineColor: '#d6ffe0',
            topColor: 'rgba(214, 255, 224, 0.4)',
            bottomColor: 'rgba(214, 255, 224, 0.0)',
            lineWidth: 2,
          });
          break;
        default:
          newSeries = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#d6ffe0',
            downColor: '#ef4444',
            borderUpColor: '#d6ffe0',
            borderDownColor: '#ef4444',
            wickUpColor: '#d6ffe0',
            wickDownColor: '#ef4444',
          });
      }

      candleSeriesRef.current = newSeries;
      // Force data update
      setTradeCount(prev => prev); // Trigger re-render
    };

    createSeries();
  }, [chartType, chartReady]);

  // Update chart data when trades or timeframe change
  // COLOR BY BUY/SELL DOMINANCE: Green = more buys, Red = more sells
  useEffect(() => {
    console.log('[BeastChart] 🔄 Data update effect - chartReady:', chartReady, 'series:', !!candleSeriesRef.current, 'trades:', trades.length);
    if (!chartReady || !candleSeriesRef.current) return;
    if (trades.length === 0) return;

    try {
      const candles = tradesToCandles(trades, timeframe);
      console.log('[BeastChart] 🕯️ Generated', candles.length, 'candles for timeframe', timeframe);

      // Filter valid candles
      const validCandles = candles.filter(c =>
        c.time > 0 &&
        Number.isFinite(c.open) && c.open > 0 &&
        Number.isFinite(c.high) && c.high > 0 &&
        Number.isFinite(c.low) && c.low > 0 &&
        Number.isFinite(c.close) && c.close > 0
      );

      if (validCandles.length > 0) {
        // Format data based on chart type
        if (chartType === 'line' || chartType === 'area') {
          // Line/Area only need time + value (close price)
          candleSeriesRef.current.setData(
            validCandles.map((c) => ({
              time: c.time,
              value: c.close,
            }))
          );
        } else {
          // Candles/Bars/Hollow need OHLC
          candleSeriesRef.current.setData(
            validCandles.map((c) => {
              const isBuyDominant = c.buyVolume >= c.sellVolume;
              const color = isBuyDominant ? '#d6ffe0' : '#ef4444';

              return {
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                color: color,
                borderColor: color,
                wickColor: color,
              };
            })
          );
        }

        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      console.error('[BeastChart] Data update failed:', err);
    }
  }, [trades, timeframe, tradesToCandles, chartReady, chartType]);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) {
      fetchTrades();
    }
  }, [tokenAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // BEAST MODE: Update EVERY BLOCK
  useEffect(() => {
    if (tokenAddress && blockNumber) {
      fetchTrades();
    }
  }, [blockNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    if (price < 0.0000000001) return price.toExponential(6);
    if (price < 0.00000001) return price.toExponential(4);
    if (price < 0.000001) return price.toFixed(12);
    if (price < 0.0001) return price.toFixed(10);
    if (price < 1) return price.toFixed(8);
    return price.toFixed(4);
  };

  if (chartError) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-red-400 text-sm font-mono mb-2">{chartError}</p>
            <button
              onClick={() => {
                setChartError(null);
                fetchTrades();
              }}
              className="px-4 py-2 bg-fud-green/20 text-fud-green rounded hover:bg-fud-green/30 font-mono text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
        <div className="flex items-center gap-3">
          <Zap className="text-fud-green" size={18} />
          <span className="font-display text-sm text-fud-green font-bold">BEAST CHART</span>
          {isLoading && <RefreshCw size={12} className="text-fud-green animate-spin" />}
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
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* BEAST Timeframe + Chart Type */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-fud-green/10 bg-dark-secondary/30">
        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1">
          {(['5S', '15S', '1M', '5M', '15M', '1H', '4H', '1D'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${
                timeframe === tf
                  ? 'text-black bg-fud-green font-bold shadow-lg shadow-fud-green/30'
                  : 'text-text-muted hover:text-fud-green hover:bg-fud-green/10'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded bg-dark-tertiary hover:bg-fud-green/10 text-text-muted hover:text-fud-green transition-all"
          >
            {CHART_TYPE_LABELS[chartType]}
            <ChevronDown size={10} />
          </button>
          {showChartTypeMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-dark-secondary border border-fud-green/20 rounded shadow-lg min-w-[120px]">
              {(Object.keys(CHART_TYPE_LABELS) as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setChartType(type);
                    setShowChartTypeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-fud-green/10 transition-all ${
                    chartType === type ? 'text-fud-green bg-fud-green/5' : 'text-text-muted'
                  }`}
                >
                  {CHART_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
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
                <span className="text-fud-green text-xs font-mono">Loading beast data...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-fud-green/10 bg-dark-secondary/30 flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-muted">
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Waiting...'}
        </span>
        <span className="text-[10px] font-mono text-fud-green">
          {tradeCount} trades | Block #{blockNumber?.toString() ?? '...'}
        </span>
      </div>
    </div>
  );
}
