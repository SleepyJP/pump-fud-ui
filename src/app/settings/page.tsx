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
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  LayoutDashboard,
  Coins,
} from 'lucide-react';
import { useSiteSettings, isAdminWallet, ADMIN_WALLET } from '@/stores/siteSettingsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { HeaderCustomizer } from '@/components/admin/HeaderCustomizer';
import { TokenManagement } from '@/components/admin/TokenManagement';
import { CardDesigner } from '@/components/admin/CardDesigner';
import type { PanelType } from '@/types';
import clsx from 'clsx';

const PANEL_LABELS: Record<PanelType, string> = {
  chart: 'Chart Panel',
  trade: 'Trade Panel',
  chat: 'Live Chat',
  board: 'Message Board',
  holders: 'Holders List',
  info: 'Token Info',
};

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
    savedPatterns,
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
    addSavedPattern,
    removeSavedPattern,
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

  const Section = ({
    id,
    title,
    icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSection === id;
    return (
      <Card className="mb-4">
        <button
          onClick={() => setExpandedSection(isExpanded ? null : id)}
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
  };

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
        <Section id="header" title="Header Customization" icon={<LayoutDashboard size={24} className="text-fud-purple" />}>
          <HeaderCustomizer />
        </Section>

        {/* Token Management Section */}
        <Section id="tokens" title="Token Management" icon={<Coins size={24} className="text-fud-orange" />}>
          <TokenManagement />
        </Section>

        {/* Global Background Section */}
        <Section id="global" title="Global Background" icon={<Image size={24} className="text-fud-green" />}>
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
        <Section id="panels" title="Panel Backgrounds" icon={<Image size={24} className="text-fud-purple" />}>
          <div className="space-y-4">
            {(Object.keys(PANEL_LABELS) as PanelType[]).map((panel) => (
              <div key={panel} className="p-3 bg-dark-secondary rounded-lg">
                <label className="block text-sm font-mono text-text-secondary mb-2">
                  {PANEL_LABELS[panel]}
                </label>
                <div className="flex gap-2">
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
              </div>
            ))}
          </div>
        </Section>

        {/* Token Card Pattern Section */}
        <Section id="cards" title="Token Card Designer" icon={<Palette size={24} className="text-fud-orange" />}>
          <CardDesigner />
        </Section>

        {/* Colors Section */}
        <Section id="colors" title="Color Overrides" icon={<Palette size={24} className="text-fud-green" />}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">Primary Accent</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2">Secondary Accent</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={secondaryAccent}
                  onChange={(e) => setSecondaryAccent(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <Input
                  value={secondaryAccent}
                  onChange={(e) => setSecondaryAccent(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Homepage Section */}
        <Section id="homepage" title="Homepage Customization" icon={<Image size={24} className="text-fud-green" />}>
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
        <Section id="library" title="Saved Patterns Library" icon={<Image size={24} className="text-fud-purple" />}>
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
