'use client';

import { useState } from 'react';
import { Upload, Eye, Trash2, Palette, Layers, Sparkles } from 'lucide-react';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const PRESET_PATTERNS = [
  { id: 'circuit', name: 'Circuit Board', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpath d="M10 10h20v20H10zM40 10h20v20H40zM70 10h20v20H70zM10 40h20v20H10zM70 40h20v20H70zM10 70h20v20H10zM40 70h20v20H40zM70 70h20v20H70z" fill="none" stroke="%2300ff8830" stroke-width="1"/%3E%3C/svg%3E' },
  { id: 'grid', name: 'Neon Grid', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"%3E%3Cpath d="M0 0h50v50H0z" fill="none"/%3E%3Cpath d="M0 25h50M25 0v50" stroke="%2300ff8815" stroke-width="1"/%3E%3C/svg%3E' },
  { id: 'hex', name: 'Hexagons', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 52"%3E%3Cpolygon points="30,0 60,15 60,45 30,60 0,45 0,15" fill="none" stroke="%238b5cf620" stroke-width="1"/%3E%3C/svg%3E' },
  { id: 'dots', name: 'Dot Matrix', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"%3E%3Ccircle cx="10" cy="10" r="1.5" fill="%2300ff8820"/%3E%3C/svg%3E' },
  { id: 'diag', name: 'Diagonal Lines', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Cpath d="M0 40L40 0" stroke="%23ff880015" stroke-width="1"/%3E%3C/svg%3E' },
  { id: 'waves', name: 'Wave Pattern', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"%3E%3Cpath d="M0 10 Q25 0 50 10 T100 10" fill="none" stroke="%2300ff8815" stroke-width="1"/%3E%3C/svg%3E' },
];

const GRADIENT_PRESETS = [
  { id: 'cyber', name: 'Cyber Green', value: 'linear-gradient(135deg, rgba(214,255,224,0.1) 0%, rgba(0,0,0,0) 100%)' },
  { id: 'purple', name: 'Deep Purple', value: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(0,0,0,0) 100%)' },
  { id: 'fire', name: 'Fire', value: 'linear-gradient(135deg, rgba(255,136,0,0.1) 0%, rgba(255,0,0,0.05) 100%)' },
  { id: 'ocean', name: 'Ocean', value: 'linear-gradient(135deg, rgba(0,136,255,0.1) 0%, rgba(0,255,200,0.05) 100%)' },
  { id: 'sunset', name: 'Sunset', value: 'linear-gradient(135deg, rgba(255,100,100,0.1) 0%, rgba(255,200,100,0.05) 100%)' },
  { id: 'midnight', name: 'Midnight', value: 'linear-gradient(135deg, rgba(30,30,60,0.3) 0%, rgba(0,0,0,0) 100%)' },
];

export function CardDesigner() {
  const {
    tokenCardPattern,
    tokenCardPatternOpacity,
    setTokenCardPattern,
    setTokenCardPatternOpacity,
    savedPatterns,
    addSavedPattern,
  } = useSiteSettings();

  const [activeTab, setActiveTab] = useState<'patterns' | 'gradients' | 'custom'>('patterns');
  const [customUrl, setCustomUrl] = useState('');

  const handleFileUpload = (callback: (url: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          callback(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="p-4 bg-dark-secondary rounded-lg">
        <p className="text-xs font-mono text-text-muted mb-3">Live Preview:</p>
        <div
          className="h-40 rounded-lg border border-fud-green/30 relative overflow-hidden bg-dark-tertiary"
          style={{
            backgroundImage: tokenCardPattern ? `url(${tokenCardPattern})` : undefined,
            backgroundSize: tokenCardPattern?.includes('gradient') ? '100% 100%' : '50px 50px',
          }}
        >
          <div
            className="absolute inset-0 bg-dark-tertiary transition-opacity"
            style={{ opacity: 1 - tokenCardPatternOpacity / 100 }}
          />
          <div className="relative z-10 p-4 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-fud-green font-display text-lg">SAMPLE TOKEN</h3>
                <p className="text-text-muted font-mono text-xs">$SAMPLE</p>
              </div>
              <span className="px-2 py-1 bg-fud-green/20 text-fud-green text-xs font-mono rounded">
                +420.69%
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-text-muted text-xs font-mono">Market Cap</p>
                <p className="text-fud-green font-mono">$1.2M</p>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs font-mono">Volume 24h</p>
                <p className="text-text-secondary font-mono">$420K</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opacity Slider */}
      <div>
        <label className="block text-xs font-mono text-text-muted mb-2">
          Pattern Opacity: {tokenCardPatternOpacity}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={tokenCardPatternOpacity}
          onChange={(e) => setTokenCardPatternOpacity(Number(e.target.value))}
          className="w-full accent-fud-green"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border-primary pb-2">
        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-mono text-sm transition-colors ${
            activeTab === 'patterns'
              ? 'bg-fud-green/20 text-fud-green border-b-2 border-fud-green'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Layers size={14} />
          Patterns
        </button>
        <button
          onClick={() => setActiveTab('gradients')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-mono text-sm transition-colors ${
            activeTab === 'gradients'
              ? 'bg-fud-purple/20 text-fud-purple border-b-2 border-fud-purple'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Sparkles size={14} />
          Gradients
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t-lg font-mono text-sm transition-colors ${
            activeTab === 'custom'
              ? 'bg-fud-orange/20 text-fud-orange border-b-2 border-fud-orange'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Palette size={14} />
          Custom
        </button>
      </div>

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="grid grid-cols-3 gap-3">
          {PRESET_PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              onClick={() => setTokenCardPattern(pattern.url)}
              className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                tokenCardPattern === pattern.url
                  ? 'border-fud-green shadow-lg shadow-fud-green/20'
                  : 'border-border-primary hover:border-fud-green/50'
              }`}
            >
              <div
                className="absolute inset-0 bg-dark-tertiary"
                style={{
                  backgroundImage: `url(${pattern.url})`,
                  backgroundSize: '25px 25px',
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                <p className="text-xs font-mono text-text-secondary truncate">{pattern.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Gradients Tab */}
      {activeTab === 'gradients' && (
        <div className="grid grid-cols-3 gap-3">
          {GRADIENT_PRESETS.map((gradient) => (
            <button
              key={gradient.id}
              onClick={() => setTokenCardPattern(gradient.value)}
              className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                tokenCardPattern === gradient.value
                  ? 'border-fud-purple shadow-lg shadow-fud-purple/20'
                  : 'border-border-primary hover:border-fud-purple/50'
              }`}
            >
              <div
                className="absolute inset-0 bg-dark-tertiary"
                style={{ backgroundImage: gradient.value }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                <p className="text-xs font-mono text-text-secondary truncate">{gradient.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Custom Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-text-muted mb-2">Custom Pattern URL</label>
            <div className="flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Image URL or upload..."
                className="flex-1"
              />
              <Button onClick={() => handleFileUpload(setCustomUrl)} variant="secondary">
                <Upload size={16} />
              </Button>
              <Button
                onClick={() => {
                  if (customUrl) {
                    setTokenCardPattern(customUrl);
                    addSavedPattern({ name: `Custom ${Date.now()}`, url: customUrl, type: 'pattern' });
                    setCustomUrl('');
                  }
                }}
                disabled={!customUrl}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Saved Custom Patterns */}
          {savedPatterns.length > 0 && (
            <div>
              <p className="text-xs font-mono text-text-muted mb-2">Your Saved Patterns</p>
              <div className="grid grid-cols-4 gap-2">
                {savedPatterns.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTokenCardPattern(p.url)}
                    className={`relative aspect-square rounded-lg border overflow-hidden transition-all ${
                      tokenCardPattern === p.url
                        ? 'border-fud-orange'
                        : 'border-border-primary hover:border-fud-orange/50'
                    }`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${p.url})` }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear Pattern Button */}
      {tokenCardPattern && (
        <Button
          onClick={() => setTokenCardPattern(null)}
          variant="danger"
          className="w-full gap-2"
        >
          <Trash2 size={16} />
          Remove Pattern
        </Button>
      )}
    </div>
  );
}
