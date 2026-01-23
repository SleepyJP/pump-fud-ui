'use client';

import { Upload, Trash2, Eye, RotateCcw } from 'lucide-react';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function HeaderCustomizer() {
  const {
    headerHeight,
    headerLogo,
    headerLogoPosition,
    headerBackgroundColor,
    headerBackgroundImage,
    setHeaderHeight,
    setHeaderLogo,
    setHeaderLogoPosition,
    setHeaderBackgroundColor,
    setHeaderBackgroundImage,
  } = useSiteSettings();

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

  const resetHeader = () => {
    setHeaderHeight(64);
    setHeaderLogo(null);
    setHeaderLogoPosition('left');
    setHeaderBackgroundColor('#0a0a0a');
    setHeaderBackgroundImage(null);
  };

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="p-4 bg-dark-secondary rounded-lg">
        <p className="text-xs font-mono text-text-muted mb-2">Live Preview:</p>
        <div
          className="rounded-lg border border-border-primary overflow-hidden transition-all duration-300"
          style={{
            height: `${headerHeight}px`,
            backgroundColor: headerBackgroundColor,
            backgroundImage: headerBackgroundImage ? `url(${headerBackgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            className={`h-full flex items-center px-4 ${
              headerLogoPosition === 'center'
                ? 'justify-center'
                : headerLogoPosition === 'right'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            {headerLogo ? (
              <img
                src={headerLogo}
                alt="Logo"
                className="h-3/4 max-h-full object-contain"
              />
            ) : (
              <span className="text-fud-green font-display text-xl">PUMP.FUD</span>
            )}
          </div>
        </div>
      </div>

      {/* Height Slider */}
      <div>
        <label className="block text-xs font-mono text-text-muted mb-2">
          Header Height: {headerHeight}px ({(headerHeight / 96).toFixed(2)} inches)
        </label>
        <input
          type="range"
          min="48"
          max="192"
          step="4"
          value={headerHeight}
          onChange={(e) => setHeaderHeight(Number(e.target.value))}
          className="w-full accent-fud-green"
        />
        <div className="flex justify-between text-xs font-mono text-text-muted mt-1">
          <span>0.5"</span>
          <span>1"</span>
          <span>1.5"</span>
          <span>2"</span>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-xs font-mono text-text-muted mb-2">Custom Logo</label>
        <div className="flex gap-2">
          <Input
            value={headerLogo || ''}
            onChange={(e) => setHeaderLogo(e.target.value || null)}
            placeholder="Logo URL or upload..."
            className="flex-1"
          />
          <Button onClick={() => handleFileUpload(setHeaderLogo)} variant="secondary">
            <Upload size={16} />
          </Button>
          {headerLogo && (
            <Button onClick={() => setHeaderLogo(null)} variant="danger">
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Logo Position */}
      <div>
        <label className="block text-xs font-mono text-text-muted mb-2">Logo Position</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setHeaderLogoPosition(pos)}
              className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all ${
                headerLogoPosition === pos
                  ? 'bg-fud-green/20 border-fud-green text-fud-green'
                  : 'border-border-primary text-text-muted hover:border-fud-green/30'
              }`}
            >
              {pos.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-xs font-mono text-text-muted mb-2">Background Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={headerBackgroundColor}
            onChange={(e) => setHeaderBackgroundColor(e.target.value)}
            className="w-12 h-12 rounded cursor-pointer"
          />
          <Input
            value={headerBackgroundColor}
            onChange={(e) => setHeaderBackgroundColor(e.target.value)}
            className="flex-1 font-mono"
          />
        </div>
      </div>

      {/* Background Image */}
      <div>
        <label className="block text-xs font-mono text-text-muted mb-2">Background Image</label>
        <div className="flex gap-2">
          <Input
            value={headerBackgroundImage || ''}
            onChange={(e) => setHeaderBackgroundImage(e.target.value || null)}
            placeholder="Image URL or upload..."
            className="flex-1"
          />
          <Button onClick={() => handleFileUpload(setHeaderBackgroundImage)} variant="secondary">
            <Upload size={16} />
          </Button>
          {headerBackgroundImage && (
            <Button onClick={() => setHeaderBackgroundImage(null)} variant="danger">
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Reset Button */}
      <Button onClick={resetHeader} variant="secondary" className="w-full gap-2">
        <RotateCcw size={16} />
        Reset Header to Defaults
      </Button>
    </div>
  );
}
