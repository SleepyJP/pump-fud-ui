'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatUnits } from 'viem';

interface TokenData {
  name: string;
  symbol: string;
  address: string;
  totalSupply: string;
  marketCap: string;
  price: string;
  holders: number;
  volume24h: string;
}

export function TokenDashboard({ address }: { address: string }) {
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulated token data - replace with actual API call
    const fetchToken = async () => {
      try {
        setLoading(true);
        // Mock data for now
        setToken({
          name: 'Test Token',
          symbol: 'TEST',
          address: address,
          totalSupply: '250,000,000',
          marketCap: '$0',
          price: '$0.00',
          holders: 0,
          volume24h: '$0'
        });
      } catch (e) {
        setError('Failed to load token');
      } finally {
        setLoading(false);
      }
    };
    if (address) fetchToken();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-[#39ff14] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#39ff14] text-lg animate-pulse">Loading Token...</span>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 mb-4">Error</h1>
          <p className="text-gray-400">{error || 'Token not found'}</p>
          <a href="/tokens" className="text-[#39ff14] hover:underline mt-4 inline-block">← Back to Tokens</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#39ff14] to-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {token.symbol.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#39ff14]">{token.symbol}</h1>
            <p className="text-gray-400">{token.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-mono">{address.slice(0, 10)}...{address.slice(-8)}</span>
          <button onClick={() => navigator.clipboard.writeText(address)} className="hover:text-[#39ff14] transition-colors">
            📋
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Price', value: token.price },
          { label: 'Market Cap', value: token.marketCap },
          { label: 'Total Supply', value: token.totalSupply },
          { label: '24h Volume', value: token.volume24h }
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Trade Panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#39ff14] mb-4">Buy {token.symbol}</h2>
          <input type="number" placeholder="Amount in PLS" className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:border-[#39ff14] outline-none" />
          <button className="w-full bg-[#39ff14] text-black font-bold py-3 rounded-lg hover:bg-[#32d912] transition-colors">
            BUY
          </button>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-500 mb-4">Sell {token.symbol}</h2>
          <input type="number" placeholder="Amount of tokens" className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:border-red-500 outline-none" />
          <button className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors">
            SELL
          </button>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-2xl mb-2">📈</p>
          <p>Price Chart Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

export default TokenDashboard;
