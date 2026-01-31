'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import { TOKEN_ABI } from '@/config/abis';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
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
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  ChevronDown,
  X,
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
  buyVolume: number;
  sellVolume: number;
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

// Chart types
type ChartType = 'candles' | 'hollow' | 'line' | 'area';
const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'candles', label: 'Candles', icon: '🕯️' },
  { value: 'hollow', label: 'Hollow Candles', icon: '🕯️' },
  { value: 'line', label: 'Line', icon: '📈' },
  { value: 'area', label: 'Area', icon: '📉' },
];

// Scale types (like TradingView)
type ScaleMode = 'regular' | 'percent' | 'logarithmic';
const SCALE_MODES: { value: ScaleMode; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'percent', label: 'Percent' },
  { value: 'logarithmic', label: 'Logarithmic' },
];

// Settings version - increment to force reset old cached settings
const SETTINGS_VERSION = 2;

// Default settings - TradingView/DEX Screener style
const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  upColor: '#26a69a', // TradingView default green
  downColor: '#ef5350', // TradingView default red
  chartType: 'candles' as ChartType,
  scaleMode: 'logarithmic' as ScaleMode, // Log scale for memecoins
  autoFit: true,
  invertScale: false,
  scaleOnLeft: false,
};

// Load settings from localStorage - reset if version changed
const loadChartSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem('pumpfud-chart-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Reset to defaults if version changed or missing
      if (!parsed.version || parsed.version < SETTINGS_VERSION) {
        localStorage.removeItem('pumpfud-chart-settings');
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    localStorage.removeItem('pumpfud-chart-settings');
  }
  return DEFAULT_SETTINGS;
};

// Save settings to localStorage
const saveChartSettings = (settings: typeof DEFAULT_SETTINGS) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pumpfud-chart-settings', JSON.stringify({ ...settings, version: SETTINGS_VERSION }));
  } catch {}
};

export function PriceChart({ tokenAddress }: PriceChartProps) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]); // 5m default
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Chart settings state
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [upColor, setUpColor] = useState(DEFAULT_SETTINGS.upColor);
  const [downColor, setDownColor] = useState(DEFAULT_SETTINGS.downColor);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('regular');
  const [autoFit, setAutoFit] = useState(true);
  const [invertScale, setInvertScale] = useState(false);
  const [scaleOnLeft, setScaleOnLeft] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const settings = loadChartSettings();
    setChartType(settings.chartType || 'candles');
    setUpColor(settings.upColor || DEFAULT_SETTINGS.upColor);
    setDownColor(settings.downColor || DEFAULT_SETTINGS.downColor);
    setScaleMode(settings.scaleMode || 'regular');
    setAutoFit(settings.autoFit ?? true);
    setInvertScale(settings.invertScale ?? false);
    setScaleOnLeft(settings.scaleOnLeft ?? false);
  }, []);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const hasInitialFitRef = useRef(false); // Only fitContent once on first load
  const publicClient = usePublicClient();

  // Get current price from contract
  const { data: currentPrice, refetch: refetchPrice } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'getCurrentPrice',
    query: { enabled: !!tokenAddress, refetchInterval: isLive ? 2000 : false },
  });

  // Fetch trades from blockchain
  const fetchTrades = useCallback(async () => {
    if (!tokenAddress || !publicClient) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(100000); // ~3-4 days

      console.log('[PriceChart] Fetching from block', fromBlock.toString(), 'to', currentBlock.toString());

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

      console.log('[PriceChart] Found', buyLogs.length, 'buys,', sellLogs.length, 'sells');

      // Get block timestamps
      const allLogs = [...buyLogs, ...sellLogs];
      const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
      const blockTimestamps: Record<string, number> = {};

      // Batch fetch timestamps
      for (let i = 0; i < uniqueBlocks.length; i += 50) {
        const batch = uniqueBlocks.slice(i, i + 50);
        await Promise.all(
          batch.map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockTimestamps[bn.toString()] = Number(block.timestamp);
            } catch {
              blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
            }
          })
        );
      }

      const tradeData: TradeData[] = [];

      for (const log of buyLogs) {
        const args = log.args as Record<string, unknown>;
        const plsSpent = args.plsSpent as bigint | undefined;
        const tokensBought = args.tokensBought as bigint | undefined;

        if (!plsSpent || !tokensBought || tokensBought === BigInt(0)) continue;

        const price = Number(formatEther(plsSpent)) / Number(formatEther(tokensBought));
        if (isNaN(price) || !isFinite(price)) continue;

        tradeData.push({
          timestamp: blockTimestamps[log.blockNumber?.toString() || '0'] || Math.floor(Date.now() / 1000),
          price,
          type: 'buy',
          volume: Number(formatEther(plsSpent)),
        });
      }

      for (const log of sellLogs) {
        const args = log.args as Record<string, unknown>;
        const tokensSold = args.tokensSold as bigint | undefined;
        const plsReceived = args.plsReceived as bigint | undefined;

        if (!tokensSold || !plsReceived || tokensSold === BigInt(0)) continue;

        const price = Number(formatEther(plsReceived)) / Number(formatEther(tokensSold));
        if (isNaN(price) || !isFinite(price)) continue;

        tradeData.push({
          timestamp: blockTimestamps[log.blockNumber?.toString() || '0'] || Math.floor(Date.now() / 1000),
          price,
          type: 'sell',
          volume: Number(formatEther(plsReceived)),
        });
      }

      tradeData.sort((a, b) => a.timestamp - b.timestamp);

      console.log('[PriceChart] Processed', tradeData.length, 'trades');

      setTrades(tradeData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[PriceChart] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Initial fetch and polling
  useEffect(() => {
    if (tokenAddress) {
      setTrades([]);
      fetchTrades();
    }
  }, [tokenAddress, fetchTrades]);

  // Poll every 5 seconds when live
  useEffect(() => {
    if (!isLive || !tokenAddress) return;
    const interval = setInterval(() => {
      fetchTrades();
      refetchPrice();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, tokenAddress, fetchTrades, refetchPrice]);

  // Build candle data with buy/sell tracking - NO gap filling (like DEX Screener)
  const buildCandles = useCallback((data: TradeData[], tfSeconds: number): CandleData[] => {
    if (data.length === 0) return [];

    const candles: Map<number, CandleData> = new Map();

    for (const trade of data) {
      const candleTime = Math.floor(trade.timestamp / tfSeconds) * tfSeconds;

      if (!candles.has(candleTime)) {
        candles.set(candleTime, {
          time: candleTime as Time,
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          buyVolume: trade.type === 'buy' ? trade.volume : 0,
          sellVolume: trade.type === 'sell' ? trade.volume : 0,
        });
      } else {
        const candle = candles.get(candleTime)!;
        candle.high = Math.max(candle.high, trade.price);
        candle.low = Math.min(candle.low, trade.price);
        candle.close = trade.price;
        if (trade.type === 'buy') {
          candle.buyVolume += trade.volume;
        } else {
          candle.sellVolume += trade.volume;
        }
      }
    }

    // Sort candles by time - NO gap filling, show only actual trading data
    return Array.from(candles.values()).sort((a, b) => (a.time as number) - (b.time as number));
  }, []);

  // Initialize chart - MUST depend on trades.length so it runs when container appears
  useEffect(() => {
    // Container only exists when trades.length > 0 (conditional render)
    if (!chartContainerRef.current || trades.length === 0) return;

    // Already initialized
    if (chartRef.current) return;

    console.log('[PriceChart] 🎯 Initializing chart, container exists, trades:', trades.length);

    // DEX Screener/TradingView style chart configuration
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' }, // TradingView dark bg
        textColor: '#d1d4dc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#758696', labelBackgroundColor: '#2a2e39' },
        horzLine: { color: '#758696', labelBackgroundColor: '#2a2e39' },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.05, bottom: 0.05 },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 16, // Wide spacing for visible candle bodies
        minBarSpacing: 8,
        rightOffset: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    // Create series based on chart type
    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;
    if (chartType === 'line') {
      series = chart.addSeries(LineSeries, {
        color: upColor,
        lineWidth: 2,
      });
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: upColor,
        topColor: `${upColor}66`,
        bottomColor: `${upColor}00`,
        lineWidth: 2,
      });
    } else if (chartType === 'hollow') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: 'transparent',
        downColor: 'transparent',
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    } else {
      // Default: candles - TradingView/DEX Screener style
      series = chart.addSeries(CandlestickSeries, {
        upColor: upColor,
        downColor: downColor,
        borderVisible: true,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickVisible: true,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    }

    // Set price format for small memecoin prices - auto precision
    series.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 10,
        minMove: 0.0000000001,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = series as ISeriesApi<'Candlestick'>;

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

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [trades.length]); // Re-run when trades load (container becomes visible)

  // Recreate series when chart type or colors change
  useEffect(() => {
    if (!chartRef.current || trades.length === 0) return;

    // Remove existing series
    if (candleSeriesRef.current) {
      try {
        chartRef.current.removeSeries(candleSeriesRef.current);
      } catch {}
    }

    // Create new series based on chart type
    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;
    if (chartType === 'line') {
      series = chartRef.current.addSeries(LineSeries, {
        color: upColor,
        lineWidth: 2,
      });
    } else if (chartType === 'area') {
      series = chartRef.current.addSeries(AreaSeries, {
        lineColor: upColor,
        topColor: `${upColor}66`,
        bottomColor: `${upColor}00`,
        lineWidth: 2,
      });
    } else if (chartType === 'hollow') {
      series = chartRef.current.addSeries(CandlestickSeries, {
        upColor: 'transparent',
        downColor: 'transparent',
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    } else {
      // TradingView/DEX Screener style candles
      series = chartRef.current.addSeries(CandlestickSeries, {
        upColor: upColor,
        downColor: downColor,
        borderVisible: true,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickVisible: true,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    }

    // Price format for memecoins - auto precision
    series.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 10,
        minMove: 0.0000000001,
      },
    });

    candleSeriesRef.current = series as ISeriesApi<'Candlestick'>;

    // Save settings
    saveChartSettings({ version: SETTINGS_VERSION, chartType, upColor, downColor, scaleMode, autoFit, invertScale, scaleOnLeft });
  }, [chartType, upColor, downColor, scaleMode, autoFit, invertScale, scaleOnLeft, trades.length]);

  // Apply scale settings when they change
  useEffect(() => {
    if (!chartRef.current) return;

    // Apply scale mode and invert
    chartRef.current.priceScale('right').applyOptions({
      mode: scaleMode === 'logarithmic' ? 1 : 0, // 0 = normal, 1 = logarithmic
      invertScale: invertScale,
      visible: !scaleOnLeft,
    });

    // Left scale visibility
    chartRef.current.priceScale('left').applyOptions({
      visible: scaleOnLeft,
      mode: scaleMode === 'logarithmic' ? 1 : 0,
      invertScale: invertScale,
    });

    // If autoFit is enabled, fit content when data changes
    if (autoFit) {
      chartRef.current.timeScale().fitContent();
    }
  }, [scaleMode, invertScale, scaleOnLeft, autoFit]);

  // Update chart when trades or timeframe changes
  // COLOR BY BUY/SELL DOMINANCE
  useEffect(() => {
    if (!candleSeriesRef.current || trades.length === 0) return;

    const candles = buildCandles(trades, selectedTimeframe.seconds);
    console.log('[PriceChart] Setting', candles.length, 'candles');

    // Format data based on chart type
    if (chartType === 'line' || chartType === 'area') {
      // Line/Area use value format
      (candleSeriesRef.current as unknown as ISeriesApi<'Line'>).setData(
        candles.map((c) => ({
          time: c.time,
          value: c.close,
        }))
      );
    } else {
      // Candles/Hollow - DEX Screener style: standard OHLC (colors from series options)
      candleSeriesRef.current.setData(
        candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    // Only auto-fit on first load, not on every update (so user can zoom/pan)
    if (chartRef.current && !hasInitialFitRef.current) {
      chartRef.current.timeScale().fitContent();
      hasInitialFitRef.current = true;
    }
  }, [trades, selectedTimeframe, buildCandles, chartType, upColor, downColor]);

  // Stats
  const firstPrice = trades.length > 0 ? trades[0].price : 0;
  const lastPrice = trades.length > 0 ? trades[trades.length - 1].price : 0;
  const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  const formatPrice = (p: number) => {
    if (p === 0) return '0';
    if (p < 0.00000001) return p.toExponential(2);
    if (p < 0.0001) return p.toFixed(8);
    return p.toFixed(6);
  };

  const currentPriceDisplay = currentPrice
    ? formatPrice(Number(formatEther(currentPrice as bigint)))
    : lastPrice > 0 ? formatPrice(lastPrice) : '--';

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <span className="text-white font-mono text-lg font-bold">{currentPriceDisplay} PLS</span>
          {priceChange !== 0 && (
            <span className={`flex items-center gap-1 text-sm font-mono ${priceChange >= 0 ? 'text-[#26a69a]' : 'text-red-400'}`}>
              {priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
              isLive ? 'bg-[#26a69a]/10 text-[#26a69a]' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {isLive ? <Wifi size={12} className="animate-pulse" /> : <WifiOff size={12} />}
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
          <button onClick={fetchTrades} disabled={isLoading} className="p-1.5 text-gray-400 hover:text-[#26a69a]">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Timeframes + Chart Type + Settings */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-800">
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2 py-0.5 text-xs font-mono rounded ${
                selectedTimeframe.label === tf.label
                  ? 'bg-[#26a69a] text-black font-bold'
                  : 'text-gray-400 hover:text-[#26a69a]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded bg-gray-800 text-gray-300 hover:text-[#26a69a]"
            >
              {CHART_TYPES.find(t => t.value === chartType)?.icon} {CHART_TYPES.find(t => t.value === chartType)?.label}
              <ChevronDown size={10} />
            </button>
            {showChartTypeMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-gray-900 border border-gray-700 rounded shadow-lg min-w-[140px]">
                {CHART_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setChartType(type.value);
                      setShowChartTypeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-gray-800 ${
                      chartType === type.value ? 'text-[#26a69a] bg-gray-800' : 'text-gray-300'
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset View Button */}
          <button
            onClick={() => {
              if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
              }
            }}
            title="Reset zoom/pan"
            className="px-2 py-0.5 text-xs font-mono text-gray-400 hover:text-[#26a69a] rounded hover:bg-gray-800"
          >
            Reset
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 text-gray-400 hover:text-[#26a69a] rounded hover:bg-gray-800"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-72 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-mono font-bold">Chart Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Up Color */}
            <div className="mb-3">
              <label className="block text-xs text-gray-400 font-mono mb-1">Up/Buy Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={upColor}
                  onChange={(e) => setUpColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={upColor}
                  onChange={(e) => setUpColor(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-xs font-mono px-2 py-1 rounded border border-gray-700"
                />
              </div>
            </div>

            {/* Down Color */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-mono mb-1">Down/Sell Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={downColor}
                  onChange={(e) => setDownColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={downColor}
                  onChange={(e) => setDownColor(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-xs font-mono px-2 py-1 rounded border border-gray-700"
                />
              </div>
            </div>

            {/* Preset Colors */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-mono mb-2">Presets</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setUpColor('#26a69a'); setDownColor('#ef5350'); }}
                  className="px-2 py-1 text-xs font-mono rounded bg-gray-800 hover:bg-gray-700 text-white"
                >
                  TradingView
                </button>
                <button
                  onClick={() => { setUpColor('#00ff88'); setDownColor('#ff3366'); }}
                  className="px-2 py-1 text-xs font-mono rounded bg-gray-800 hover:bg-gray-700 text-white"
                >
                  Neon
                </button>
                <button
                  onClick={() => { setUpColor('#22c55e'); setDownColor('#ef4444'); }}
                  className="px-2 py-1 text-xs font-mono rounded bg-gray-800 hover:bg-gray-700 text-white"
                >
                  Classic
                </button>
                <button
                  onClick={() => { setUpColor('#3b82f6'); setDownColor('#f97316'); }}
                  className="px-2 py-1 text-xs font-mono rounded bg-gray-800 hover:bg-gray-700 text-white"
                >
                  Blue/Orange
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-4" />

            {/* Scale Settings - TradingView style */}
            <h4 className="text-white font-mono text-sm mb-3">Scale Settings</h4>

            {/* Scale Mode */}
            <div className="mb-3">
              <label className="block text-xs text-gray-400 font-mono mb-1">Scale Mode</label>
              <div className="flex gap-1">
                {SCALE_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setScaleMode(mode.value)}
                    className={`flex-1 px-2 py-1 text-xs font-mono rounded ${
                      scaleMode === mode.value
                        ? 'bg-[#26a69a] text-black font-bold'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-400 font-mono">Auto fit to screen</span>
                <button
                  onClick={() => setAutoFit(!autoFit)}
                  className={`w-10 h-5 rounded-full transition-colors ${autoFit ? 'bg-[#26a69a]' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${autoFit ? 'translate-x-5' : ''}`} />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-400 font-mono">Invert scale</span>
                <button
                  onClick={() => setInvertScale(!invertScale)}
                  className={`w-10 h-5 rounded-full transition-colors ${invertScale ? 'bg-[#26a69a]' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${invertScale ? 'translate-x-5' : ''}`} />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-400 font-mono">Scale on left</span>
                <button
                  onClick={() => setScaleOnLeft(!scaleOnLeft)}
                  className={`w-10 h-5 rounded-full transition-colors ${scaleOnLeft ? 'bg-[#26a69a]' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${scaleOnLeft ? 'translate-x-5' : ''}`} />
                </button>
              </label>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 bg-[#26a69a] text-black font-mono font-bold text-sm rounded hover:bg-[#1e8a7e]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 relative min-h-[200px]">
        {!tokenAddress ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-sm font-mono">Select a token</p>
          </div>
        ) : isLoading && trades.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#26a69a]/30 border-t-[#26a69a] rounded-full animate-spin" />
          </div>
        ) : trades.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Activity size={40} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-400 text-sm font-mono">No trades yet</p>
            </div>
          </div>
        ) : (
          <div ref={chartContainerRef} className="absolute inset-0" />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-gray-800 flex justify-between text-[10px] font-mono text-gray-500">
        <span>Trades: {trades.length}</span>
        <span className="text-[#26a69a]">Buys: {trades.filter(t => t.type === 'buy').length}</span>
        <span className="text-red-400">Sells: {trades.filter(t => t.type === 'sell').length}</span>
        {lastUpdate && <span>Updated: {lastUpdate.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
