'use client';

import { useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Image,
  Palette,
  Save,
  Trash2,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  LayoutDashboard,
  Coins,
  Layers,
  Play,
  Pause,
  Plus,
  Link,
  Type,
  ImageIcon,
  MonitorPlay,
} from 'lucide-react';
import { useSiteSettings, isAdminWallet, ADMIN_WALLET, type ThemeColors } from '@/stores/siteSettingsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { HeaderCustomizer } from '@/components/admin/HeaderCustomizer';
import { TokenManagement } from '@/components/admin/TokenManagement';
import { CardDesigner } from '@/components/admin/CardDesigner';
import { CustomPageBuilder } from '@/components/admin/CustomPageBuilder';
import type { PanelType } from '@/types';
import clsx from 'clsx';
import React, { memo, useCallback } from 'react';

const PANEL_LABELS: Record<PanelType, string> = {
  chart: 'Chart Panel',
  trade: 'Trade Panel',
  chat: 'Live Chat',
  board: 'Message Board',
  holders: 'Holders List',
  info: 'Token Info',
};

// Color picker component - OUTSIDE main component to prevent re-mounting
const ColorPicker = memo(function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-mono text-text-muted mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value.startsWith('rgba') || value.startsWith('rgb') ? '#000000' : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-border-primary"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 bg-dark-tertiary border border-border-primary rounded font-mono text-xs text-text-primary"
          placeholder="#000000 or rgba(...)"
        />
      </div>
    </div>
  );
});

// New Ad Form component - OUTSIDE main component
const NewAdForm = memo(function NewAdForm({
  onAdd,
  onUpload,
}: {
  onAdd: (ad: { imageUrl: string; linkUrl: string; title: string; active: boolean }) => void;
  onUpload: (callback: (url: string) => void) => void;
}) {
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const handleAdd = () => {
    if (title && imageUrl) {
      onAdd({ title, imageUrl, linkUrl, active: true });
      setTitle('');
      setImageUrl('');
      setLinkUrl('');
    }
  };

  return (
    <div className="space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ad title..."
      />
      <div className="flex gap-2">
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL..."
          className="flex-1"
        />
        <Button onClick={() => onUpload(setImageUrl)} variant="secondary">
          <Upload size={14} />
        </Button>
      </div>
      <Input
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="Link URL (where ad clicks go)..."
      />
      <Button onClick={handleAdd} disabled={!title || !imageUrl} className="w-full gap-2">
        <Plus size={16} />
        Add Ad
      </Button>
    </div>
  );
});

// Section component - OUTSIDE main component
const Section = memo(function Section({
  id,
  title,
  icon,
  children,
  isExpanded,
  onToggle,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <Card className="mb-4">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-display text-lg">{title}</span>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isExpanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
});

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const isAdmin = isAdminWallet(address);

  const {
    globalBackground,
    globalBackgroundOpacity,
    globalBackgroundBlur,
    panelBackgrounds,
    tokenCardPattern,
    tokenCardPatternOpacity,
    homepageHeroImage,
    homepageBannerText,
    accentColor,
    secondaryAccent,
    theme,
    savedPatterns,
    pageBackgrounds,
    floatingElements,
    adCarousel,
    setGlobalBackground,
    setGlobalBackgroundOpacity,
    setGlobalBackgroundBlur,
    setPanelBackground,
    setTokenCardPattern,
    setTokenCardPatternOpacity,
    setHomepageHeroImage,
    setHomepageBannerText,
    setAccentColor,
    setSecondaryAccent,
    setThemeColor,
    resetTheme,
    addSavedPattern,
    removeSavedPattern,
    setPageBackground,
    addFloatingElement,
    updateFloatingElement,
    removeFloatingElement,
    lockFloatingElement,
    setAdCarouselEnabled,
    setAdRotationSpeed,
    addAd,
    updateAd,
    removeAd,
    toggleAdActive,
    resetAllSettings,
  } = useSiteSettings();

  const [expandedSection, setExpandedSection] = useState<string | null>('global');
  const [newPatternUrl, setNewPatternUrl] = useState('');
  const [newPatternName, setNewPatternName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Access denied screen
  if (!isConnected) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-fud-red" />
          <h1 className="font-display text-2xl text-fud-red mb-2">Access Denied</h1>
          <p className="text-text-muted font-mono text-sm mb-4">
            Connect your wallet to access settings.
          </p>
          <Button onClick={() => router.push('/')} variant="secondary">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-fud-red" />
          <h1 className="font-display text-2xl text-fud-red mb-2">Admin Only</h1>
          <p className="text-text-muted font-mono text-sm mb-2">
            This page is restricted to the site administrator.
          </p>
          <p className="text-text-muted font-mono text-xs mb-4 break-all">
            Required: {ADMIN_WALLET}
          </p>
          <p className="text-text-muted font-mono text-xs mb-4">
            Connected: {address}
          </p>
          <Button onClick={() => router.push('/')} variant="secondary">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const handleFileUpload = (callback: (url: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          callback(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSectionToggle = useCallback((id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  }, []);

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Settings className="w-10 h-10 text-fud-green" />
            <div>
              <h1 className="font-display text-3xl text-fud-green">Site Settings</h1>
              <p className="text-text-muted font-mono text-sm">Admin customization panel</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={resetAllSettings} variant="danger" className="gap-2">
              <RefreshCw size={16} />
              Reset All
            </Button>
            <Button onClick={() => router.push('/')} variant="secondary">
              Back to Site
            </Button>
          </div>
        </div>

        {/* Preview Image Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-fud-green"
              >
                <X size={24} />
              </button>
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg" />
            </div>
          </div>
        )}

        {/* Header Customization Section */}
        <Section id="header" title="Header Customization" icon={<LayoutDashboard size={24} className="text-fud-purple" />} isExpanded={expandedSection === 'header'} onToggle={handleSectionToggle}>
          <HeaderCustomizer />
        </Section>

        {/* Token Management Section */}
        <Section id="tokens" title="Token Management" icon={<Coins size={24} className="text-fud-orange" />} isExpanded={expandedSection === 'tokens'} onToggle={handleSectionToggle}>
          <TokenManagement />
        </Section>

        {/* Custom Pages Section */}
        <Section id="custom-pages" title="Custom Pages" icon={<LayoutDashboard size={24} className="text-fud-green" />} isExpanded={expandedSection === 'custom-pages'} onToggle={handleSectionToggle}>
          <CustomPageBuilder />
        </Section>

        {/* Global Background Section */}
        <Section id="global" title="Global Background" icon={<Image size={24} className="text-fud-green" />} isExpanded={expandedSection === 'global'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">Background Image URL</label>
              <div className="flex gap-2">
                <Input
                  value={globalBackground || ''}
                  onChange={(e) => setGlobalBackground(e.target.value || null)}
                  placeholder="https://... or paste base64"
                  className="flex-1"
                />
                <Button onClick={() => handleFileUpload(setGlobalBackground)} variant="secondary">
                  <Upload size={16} />
                </Button>
                {globalBackground && (
                  <>
                    <Button onClick={() => setPreviewImage(globalBackground)} variant="secondary">
                      <Eye size={16} />
                    </Button>
                    <Button onClick={() => setGlobalBackground(null)} variant="danger">
                      <Trash2 size={16} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-2">
                  Opacity: {globalBackgroundOpacity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={globalBackgroundOpacity}
                  onChange={(e) => setGlobalBackgroundOpacity(Number(e.target.value))}
                  className="w-full accent-fud-green"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted mb-2">
                  Blur: {globalBackgroundBlur}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={globalBackgroundBlur}
                  onChange={(e) => setGlobalBackgroundBlur(Number(e.target.value))}
                  className="w-full accent-fud-green"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Panel Backgrounds Section */}
        <Section id="panels" title="Panel Backgrounds" icon={<Image size={24} className="text-fud-purple" />} isExpanded={expandedSection === 'panels'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            {(Object.keys(PANEL_LABELS) as PanelType[]).map((panel) => (
              <div key={panel} className="p-3 bg-dark-secondary rounded-lg">
                <label className="block text-sm font-mono text-text-secondary mb-2">
                  {PANEL_LABELS[panel]}
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={panelBackgrounds[panel] || ''}
                    onChange={(e) => setPanelBackground(panel, e.target.value || null)}
                    placeholder="Image URL or upload..."
                    className="flex-1 text-sm"
                  />
                  <Button onClick={() => handleFileUpload((url) => setPanelBackground(panel, url))} variant="secondary" className="px-2">
                    <Upload size={14} />
                  </Button>
                  {panelBackgrounds[panel] && (
                    <>
                      <Button onClick={() => setPreviewImage(panelBackgrounds[panel]!)} variant="secondary" className="px-2">
                        <Eye size={14} />
                      </Button>
                      <Button onClick={() => setPanelBackground(panel, null)} variant="danger" className="px-2">
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
                {/* Quick select from saved patterns */}
                {savedPatterns.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs text-text-muted font-mono mr-1">Quick:</span>
                    {savedPatterns.slice(0, 6).map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => setPanelBackground(panel, pattern.url)}
                        className="w-8 h-8 rounded border border-border-primary hover:border-fud-green/50 transition-colors overflow-hidden"
                        title={pattern.name}
                      >
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${pattern.url})` }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Token Card Pattern Section */}
        <Section id="cards" title="Token Card Designer" icon={<Palette size={24} className="text-fud-orange" />} isExpanded={expandedSection === 'cards'} onToggle={handleSectionToggle}>
          <CardDesigner />
        </Section>

        {/* Page Backgrounds Section */}
        <Section id="pages" title="Page Backgrounds" icon={<Layers size={24} className="text-fud-purple" />} isExpanded={expandedSection === 'pages'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            <p className="text-xs text-text-muted font-mono mb-4">
              Set unique backgrounds for each page. Leave empty to use global background.
            </p>
            {[
              { key: 'home', label: 'Homepage / Landing', icon: '🏠' },
              { key: 'tokens', label: 'Token List (Live/Rising/New)', icon: '📋' },
              { key: 'tokenDashboard', label: 'Token Dashboard', icon: '📊' },
              { key: 'profile', label: 'Profile Page', icon: '👤' },
              { key: 'settings', label: 'Settings Page', icon: '⚙️' },
              { key: 'launch', label: 'Token Launch / Creation', icon: '🚀' },
              { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
              { key: 'livestream', label: 'Livestream Page', icon: '📺' },
            ].map(({ key, label, icon }) => (
              <div key={key} className="p-3 bg-dark-secondary rounded-lg">
                <label className="block text-sm font-mono text-text-secondary mb-2">
                  {icon} {label}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={pageBackgrounds[key as keyof typeof pageBackgrounds] || ''}
                    onChange={(e) => setPageBackground(key as keyof typeof pageBackgrounds, e.target.value || null)}
                    placeholder="Image URL or upload..."
                    className="flex-1 text-sm"
                  />
                  <Button
                    onClick={() => handleFileUpload((url) => setPageBackground(key as keyof typeof pageBackgrounds, url))}
                    variant="secondary"
                    className="px-2"
                  >
                    <Upload size={14} />
                  </Button>
                  {pageBackgrounds[key as keyof typeof pageBackgrounds] && (
                    <>
                      <Button
                        onClick={() => setPreviewImage(pageBackgrounds[key as keyof typeof pageBackgrounds]!)}
                        variant="secondary"
                        className="px-2"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        onClick={() => setPageBackground(key as keyof typeof pageBackgrounds, null)}
                        variant="danger"
                        className="px-2"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
                {/* Quick select from saved patterns */}
                {savedPatterns.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    <span className="text-xs text-text-muted font-mono mr-1">Quick:</span>
                    {savedPatterns.slice(0, 6).map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => setPageBackground(key as keyof typeof pageBackgrounds, pattern.url)}
                        className="w-8 h-8 rounded border border-border-primary hover:border-fud-green/50 transition-colors overflow-hidden"
                        title={pattern.name}
                      >
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${pattern.url})` }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Ad Carousel Section */}
        <Section id="ads" title="Ad Carousel" icon={<MonitorPlay size={24} className="text-fud-orange" />} isExpanded={expandedSection === 'ads'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            {/* Enable/Disable + Speed */}
            <div className="flex items-center justify-between p-3 bg-dark-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAdCarouselEnabled(!adCarousel.enabled)}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-colors relative',
                    adCarousel.enabled ? 'bg-fud-green' : 'bg-dark-tertiary'
                  )}
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all',
                      adCarousel.enabled ? 'left-6' : 'left-0.5'
                    )}
                  />
                </button>
                <span className="font-mono text-sm">
                  {adCarousel.enabled ? 'Carousel Enabled' : 'Carousel Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted font-mono">Speed:</label>
                <Input
                  type="number"
                  value={adCarousel.rotationSpeed}
                  onChange={(e) => setAdRotationSpeed(Number(e.target.value) || 5)}
                  className="w-20 text-center"
                  min={1}
                  max={60}
                />
                <span className="text-xs text-text-muted">sec</span>
              </div>
            </div>

            {/* Add New Ad */}
            <div className="p-3 bg-dark-secondary rounded-lg">
              <p className="text-xs font-mono text-text-muted mb-2">Add New Ad</p>
              <NewAdForm onAdd={addAd} onUpload={handleFileUpload} />
            </div>

            {/* Existing Ads */}
            <div className="space-y-2">
              {adCarousel.ads.length === 0 ? (
                <p className="text-center text-text-muted font-mono text-sm py-8">
                  No ads yet. Add some above!
                </p>
              ) : (
                adCarousel.ads.map((ad) => (
                  <div
                    key={ad.id}
                    className={clsx(
                      'p-3 rounded-lg border flex items-center gap-4',
                      ad.active
                        ? 'bg-dark-secondary border-fud-green/30'
                        : 'bg-dark-tertiary border-border-primary opacity-60'
                    )}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-12 rounded bg-cover bg-center border border-border-primary"
                      style={{ backgroundImage: `url(${ad.imageUrl})` }}
                    />
                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-mono text-sm text-text-primary">{ad.title}</p>
                      <p className="font-mono text-xs text-text-muted truncate">{ad.linkUrl}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAdActive(ad.id)}
                        className={clsx(
                          'p-2 rounded transition-colors',
                          ad.active ? 'text-fud-green hover:bg-fud-green/10' : 'text-text-muted hover:bg-dark-secondary'
                        )}
                        title={ad.active ? 'Pause ad' : 'Activate ad'}
                      >
                        {ad.active ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={() => setPreviewImage(ad.imageUrl)}
                        className="p-2 rounded text-text-muted hover:text-fud-green hover:bg-fud-green/10 transition-colors"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => removeAd(ad.id)}
                        className="p-2 rounded text-text-muted hover:text-fud-red hover:bg-fud-red/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Section>

        {/* Floating Elements Section */}
        <Section id="floating" title="Floating Elements" icon={<Type size={24} className="text-fud-green" />} isExpanded={expandedSection === 'floating'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            <p className="text-xs text-text-muted font-mono mb-2">
              Add text boxes and images that float on top of pages. Lock them when done positioning.
            </p>

            {/* Add New Element */}
            <div className="p-3 bg-dark-secondary rounded-lg">
              <p className="text-xs font-mono text-text-muted mb-2">Add New Element</p>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    addFloatingElement({
                      type: 'text',
                      content: 'New Text',
                      page: 'home',
                      x: 50,
                      y: 50,
                      width: 200,
                      height: 50,
                      locked: false,
                      style: { fontSize: '16px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)' },
                    })
                  }
                  variant="secondary"
                  className="gap-2"
                >
                  <Type size={16} />
                  Add Text Box
                </Button>
                <Button
                  onClick={() =>
                    addFloatingElement({
                      type: 'image',
                      content: '',
                      page: 'home',
                      x: 50,
                      y: 100,
                      width: 150,
                      height: 150,
                      locked: false,
                    })
                  }
                  variant="secondary"
                  className="gap-2"
                >
                  <ImageIcon size={16} />
                  Add Image
                </Button>
              </div>
            </div>

            {/* Existing Elements */}
            <div className="space-y-2">
              {floatingElements.length === 0 ? (
                <p className="text-center text-text-muted font-mono text-sm py-8">
                  No floating elements yet. Add some above!
                </p>
              ) : (
                floatingElements.map((el) => (
                  <div
                    key={el.id}
                    className={clsx(
                      'p-3 rounded-lg border',
                      el.locked
                        ? 'bg-dark-tertiary border-fud-green/30'
                        : 'bg-dark-secondary border-border-primary'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {el.type === 'text' ? <Type size={14} /> : <ImageIcon size={14} />}
                        <span className="font-mono text-sm capitalize">{el.type}</span>
                        <span className="text-xs text-text-muted font-mono">on {el.page}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => lockFloatingElement(el.id, !el.locked)}
                          className={clsx(
                            'p-1 rounded transition-colors',
                            el.locked ? 'text-fud-green' : 'text-text-muted hover:text-fud-green'
                          )}
                          title={el.locked ? 'Unlock' : 'Lock'}
                        >
                          {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button
                          onClick={() => removeFloatingElement(el.id)}
                          className="p-1 rounded text-text-muted hover:text-fud-red transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Content editor */}
                    <div className="space-y-2">
                      {el.type === 'text' ? (
                        <Input
                          value={el.content}
                          onChange={(e) => updateFloatingElement(el.id, { content: e.target.value })}
                          placeholder="Text content..."
                          disabled={el.locked}
                        />
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={el.content}
                            onChange={(e) => updateFloatingElement(el.id, { content: e.target.value })}
                            placeholder="Image URL..."
                            disabled={el.locked}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => handleFileUpload((url) => updateFloatingElement(el.id, { content: url }))}
                            variant="secondary"
                            disabled={el.locked}
                          >
                            <Upload size={14} />
                          </Button>
                        </div>
                      )}
                      {/* Position controls */}
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-text-muted">X</label>
                          <Input
                            type="number"
                            value={el.x}
                            onChange={(e) => updateFloatingElement(el.id, { x: Number(e.target.value) })}
                            disabled={el.locked}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">Y</label>
                          <Input
                            type="number"
                            value={el.y}
                            onChange={(e) => updateFloatingElement(el.id, { y: Number(e.target.value) })}
                            disabled={el.locked}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">W</label>
                          <Input
                            type="number"
                            value={el.width}
                            onChange={(e) => updateFloatingElement(el.id, { width: Number(e.target.value) })}
                            disabled={el.locked}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">H</label>
                          <Input
                            type="number"
                            value={el.height}
                            onChange={(e) => updateFloatingElement(el.id, { height: Number(e.target.value) })}
                            disabled={el.locked}
                            className="text-xs"
                          />
                        </div>
                      </div>
                      {/* Page selector */}
                      <select
                        value={el.page}
                        onChange={(e) => updateFloatingElement(el.id, { page: e.target.value })}
                        disabled={el.locked}
                        className="w-full px-2 py-1 bg-dark-tertiary border border-border-primary rounded font-mono text-sm text-text-primary"
                      >
                        <option value="home">Homepage</option>
                        <option value="tokens">Token List</option>
                        <option value="tokenDashboard">Token Dashboard</option>
                        <option value="profile">Profile</option>
                        <option value="settings">Settings</option>
                        <option value="launch">Launch</option>
                        <option value="leaderboard">Leaderboard</option>
                        <option value="livestream">Livestream</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Section>

        {/* Colors Section - Full Theme Editor */}
        <Section id="colors" title="Color Overrides" icon={<Palette size={24} className="text-fud-green" />} isExpanded={expandedSection === 'colors'} onToggle={handleSectionToggle}>
          <div className="space-y-6">
            {/* Reset Theme Button */}
            <div className="flex justify-end">
              <Button onClick={resetTheme} variant="secondary" className="gap-2">
                <RefreshCw size={14} />
                Reset to Default Theme
              </Button>
            </div>

            {/* Accent Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-fud-green mb-3">🎨 Accent Colors</h4>
              <div className="grid grid-cols-3 gap-4">
                <ColorPicker label="Primary" value={theme.accentPrimary} onChange={(v) => setThemeColor('accentPrimary', v)} />
                <ColorPicker label="Secondary" value={theme.accentSecondary} onChange={(v) => setThemeColor('accentSecondary', v)} />
                <ColorPicker label="Tertiary" value={theme.accentTertiary} onChange={(v) => setThemeColor('accentTertiary', v)} />
              </div>
            </div>

            {/* Background Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-fud-purple mb-3">🖼️ Background Colors</h4>
              <div className="grid grid-cols-4 gap-4">
                <ColorPicker label="Primary BG" value={theme.bgPrimary} onChange={(v) => setThemeColor('bgPrimary', v)} />
                <ColorPicker label="Secondary BG" value={theme.bgSecondary} onChange={(v) => setThemeColor('bgSecondary', v)} />
                <ColorPicker label="Tertiary BG" value={theme.bgTertiary} onChange={(v) => setThemeColor('bgTertiary', v)} />
                <ColorPicker label="Card BG" value={theme.bgCard} onChange={(v) => setThemeColor('bgCard', v)} />
              </div>
            </div>

            {/* Text Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-fud-orange mb-3">📝 Text Colors</h4>
              <div className="grid grid-cols-4 gap-4">
                <ColorPicker label="Primary Text" value={theme.textPrimary} onChange={(v) => setThemeColor('textPrimary', v)} />
                <ColorPicker label="Secondary Text" value={theme.textSecondary} onChange={(v) => setThemeColor('textSecondary', v)} />
                <ColorPicker label="Muted Text" value={theme.textMuted} onChange={(v) => setThemeColor('textMuted', v)} />
                <ColorPicker label="Accent Text" value={theme.textAccent} onChange={(v) => setThemeColor('textAccent', v)} />
              </div>
            </div>

            {/* Border Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-text-secondary mb-3">🔲 Border Colors</h4>
              <div className="grid grid-cols-3 gap-4">
                <ColorPicker label="Primary Border" value={theme.borderPrimary} onChange={(v) => setThemeColor('borderPrimary', v)} />
                <ColorPicker label="Secondary Border" value={theme.borderSecondary} onChange={(v) => setThemeColor('borderSecondary', v)} />
                <ColorPicker label="Glow Border" value={theme.borderGlow} onChange={(v) => setThemeColor('borderGlow', v)} />
              </div>
            </div>

            {/* Button Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-fud-green mb-3">🔘 Button Colors</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-text-muted font-mono">Primary Button</p>
                  <ColorPicker label="Background" value={theme.buttonPrimary} onChange={(v) => setThemeColor('buttonPrimary', v)} />
                  <ColorPicker label="Text" value={theme.buttonPrimaryText} onChange={(v) => setThemeColor('buttonPrimaryText', v)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-text-muted font-mono">Secondary Button</p>
                  <ColorPicker label="Background" value={theme.buttonSecondary} onChange={(v) => setThemeColor('buttonSecondary', v)} />
                  <ColorPicker label="Text" value={theme.buttonSecondaryText} onChange={(v) => setThemeColor('buttonSecondaryText', v)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-text-muted font-mono">Danger Button</p>
                  <ColorPicker label="Background" value={theme.buttonDanger} onChange={(v) => setThemeColor('buttonDanger', v)} />
                  <ColorPicker label="Text" value={theme.buttonDangerText} onChange={(v) => setThemeColor('buttonDangerText', v)} />
                </div>
              </div>
            </div>

            {/* Status Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-fud-green mb-3">🚦 Status Colors</h4>
              <div className="grid grid-cols-4 gap-4">
                <ColorPicker label="Success" value={theme.success} onChange={(v) => setThemeColor('success', v)} />
                <ColorPicker label="Warning" value={theme.warning} onChange={(v) => setThemeColor('warning', v)} />
                <ColorPicker label="Error" value={theme.error} onChange={(v) => setThemeColor('error', v)} />
                <ColorPicker label="Info" value={theme.info} onChange={(v) => setThemeColor('info', v)} />
              </div>
            </div>

            {/* Effect Colors */}
            <div className="p-4 bg-dark-secondary rounded-lg">
              <h4 className="font-mono text-sm text-fud-purple mb-3">✨ Effects</h4>
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker label="Glow Color" value={theme.glowColor} onChange={(v) => setThemeColor('glowColor', v)} />
                <ColorPicker label="Shadow Color" value={theme.shadowColor} onChange={(v) => setThemeColor('shadowColor', v)} />
              </div>
            </div>

            {/* Live Preview */}
            <div className="p-4 rounded-lg border-2 border-dashed border-border-primary">
              <h4 className="font-mono text-sm text-text-muted mb-3">👁️ Live Preview</h4>
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: theme.bgSecondary,
                  border: `1px solid ${theme.borderPrimary}`,
                }}
              >
                <p style={{ color: theme.textPrimary }} className="font-mono mb-2">Primary Text</p>
                <p style={{ color: theme.textSecondary }} className="font-mono text-sm mb-2">Secondary Text</p>
                <p style={{ color: theme.textMuted }} className="font-mono text-xs mb-4">Muted Text</p>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded font-mono text-sm"
                    style={{ backgroundColor: theme.buttonPrimary, color: theme.buttonPrimaryText }}
                  >
                    Primary
                  </button>
                  <button
                    className="px-4 py-2 rounded font-mono text-sm"
                    style={{ backgroundColor: theme.buttonSecondary, color: theme.buttonSecondaryText }}
                  >
                    Secondary
                  </button>
                  <button
                    className="px-4 py-2 rounded font-mono text-sm"
                    style={{ backgroundColor: theme.buttonDanger, color: theme.buttonDangerText }}
                  >
                    Danger
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Homepage Section */}
        <Section id="homepage" title="Homepage Customization" icon={<Image size={24} className="text-fud-green" />} isExpanded={expandedSection === 'homepage'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">Hero Image</label>
              <div className="flex gap-2">
                <Input
                  value={homepageHeroImage || ''}
                  onChange={(e) => setHomepageHeroImage(e.target.value || null)}
                  placeholder="Hero section background..."
                  className="flex-1"
                />
                <Button onClick={() => handleFileUpload(setHomepageHeroImage)} variant="secondary">
                  <Upload size={16} />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">Banner Text</label>
              <Input
                value={homepageBannerText}
                onChange={(e) => setHomepageBannerText(e.target.value)}
                placeholder="Main banner headline..."
              />
            </div>
          </div>
        </Section>

        {/* Saved Patterns Library */}
        <Section id="library" title="Saved Patterns Library" icon={<Image size={24} className="text-fud-purple" />} isExpanded={expandedSection === 'library'} onToggle={handleSectionToggle}>
          <div className="space-y-4">
            {/* Add new pattern */}
            <div className="p-3 bg-dark-secondary rounded-lg">
              <p className="text-xs font-mono text-text-muted mb-2">Add New Pattern</p>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newPatternName}
                  onChange={(e) => setNewPatternName(e.target.value)}
                  placeholder="Name..."
                  className="w-32"
                />
                <Input
                  value={newPatternUrl}
                  onChange={(e) => setNewPatternUrl(e.target.value)}
                  placeholder="Image URL..."
                  className="flex-1"
                />
                <Button
                  onClick={() => handleFileUpload((url) => setNewPatternUrl(url))}
                  variant="secondary"
                >
                  <Upload size={16} />
                </Button>
                <Button
                  onClick={() => {
                    if (newPatternUrl && newPatternName) {
                      addSavedPattern({ name: newPatternName, url: newPatternUrl, type: 'pattern' });
                      setNewPatternUrl('');
                      setNewPatternName('');
                    }
                  }}
                  disabled={!newPatternUrl || !newPatternName}
                >
                  <Save size={16} />
                </Button>
              </div>
            </div>

            {/* Pattern grid */}
            <div className="grid grid-cols-4 gap-3">
              {savedPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="relative group rounded-lg overflow-hidden border border-border-primary hover:border-fud-green/50 transition-colors"
                >
                  <div
                    className="aspect-square bg-cover bg-center"
                    style={{ backgroundImage: `url(${pattern.url})` }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-xs font-mono text-white">{pattern.name}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewImage(pattern.url)}
                        className="p-1 bg-dark-secondary rounded hover:bg-fud-green/20"
                      >
                        <Eye size={14} className="text-fud-green" />
                      </button>
                      <button
                        onClick={() => removeSavedPattern(pattern.id)}
                        className="p-1 bg-dark-secondary rounded hover:bg-fud-red/20"
                      >
                        <Trash2 size={14} className="text-fud-red" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {savedPatterns.length === 0 && (
                <div className="col-span-4 text-center py-8 text-text-muted font-mono text-sm">
                  No saved patterns yet. Add some above!
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Save reminder */}
        <Card className="p-4 border-fud-green/30">
          <p className="text-sm font-mono text-text-secondary text-center">
            All changes are saved automatically. Refresh the page to see updates across the site.
          </p>
        </Card>
      </div>
    </div>
  );
}
