'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Layout,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Link,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import { useCustomPages, type CustomPage, type CustomPagePanel } from '@/stores/customPagesStore';
import type { PanelType } from '@/types';

const AVAILABLE_PANELS: { id: PanelType; name: string; description: string }[] = [
  { id: 'chart', name: 'Price Chart', description: 'Token price candlestick chart' },
  { id: 'trade', name: 'Trade Panel', description: 'Buy/sell interface' },
  { id: 'chat', name: 'Live Chat', description: 'Real-time token chat' },
  { id: 'board', name: 'Message Board', description: 'Permanent messages' },
  { id: 'holders', name: 'Top Holders', description: 'Token holder list with PnL' },
  { id: 'info', name: 'Token Info', description: 'First buys and stats' },
];

export function CustomPageBuilder() {
  const { customPages, addPage, updatePage, deletePage, addPanelToPage, removePanelFromPage, updatePanelPosition } = useCustomPages();
  const { savedPatterns } = useSiteSettings();

  const [isCreating, setIsCreating] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageDescription, setNewPageDescription] = useState('');
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<string | null>(null);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;

    const slug = newPageSlug.trim() || generateSlug(newPageName);

    if (customPages.some((p) => p.slug === slug)) {
      alert('A page with this URL slug already exists');
      return;
    }

    addPage({
      name: newPageName.trim(),
      slug,
      description: newPageDescription.trim(),
      panels: [],
      background: null,
      isPublic: true,
    });

    setNewPageName('');
    setNewPageSlug('');
    setNewPageDescription('');
    setIsCreating(false);
  };

  const handleAddPanel = (pageId: string, panelType: PanelType) => {
    const page = customPages.find((p) => p.id === pageId);
    if (!page) return;

    const existingCount = page.panels.filter((p) => p.type === panelType).length;
    const col = page.panels.length % 3;
    const row = Math.floor(page.panels.length / 3);

    addPanelToPage(pageId, {
      type: panelType,
      x: col * 4,
      y: row * 4,
      w: 4,
      h: 4,
      visible: true,
    });
  };

  const handleDeletePage = (pageId: string) => {
    if (confirm('Are you sure you want to delete this page? This cannot be undone.')) {
      deletePage(pageId);
      if (expandedPage === pageId) setExpandedPage(null);
    }
  };

  const handleTogglePublic = (pageId: string, isPublic: boolean) => {
    updatePage(pageId, { isPublic });
  };

  const handleSetBackground = (pageId: string, background: string | null) => {
    updatePage(pageId, { background });
  };

  const copyPageUrl = (slug: string) => {
    const url = `${window.location.origin}/custom/${slug}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-fud-green">Custom Pages</h3>
          <p className="text-xs text-text-muted font-mono">
            Create custom dashboard pages with your preferred panel layouts
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus size={16} />
            New Page
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="p-4 border-fud-green/50">
          <h4 className="font-mono text-sm text-fud-green mb-3">Create New Page</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">Page Name *</label>
              <Input
                value={newPageName}
                onChange={(e) => {
                  setNewPageName(e.target.value);
                  if (!newPageSlug) setNewPageSlug(generateSlug(e.target.value));
                }}
                placeholder="My Custom Dashboard"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">URL Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-mono">/custom/</span>
                <Input
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(generateSlug(e.target.value))}
                  placeholder="my-dashboard"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted font-mono mb-1">Description</label>
              <Input
                value={newPageDescription}
                onChange={(e) => setNewPageDescription(e.target.value)}
                placeholder="A brief description of this page..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreating(false);
                  setNewPageName('');
                  setNewPageSlug('');
                  setNewPageDescription('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePage} disabled={!newPageName.trim()}>
                <Save size={14} className="mr-1" />
                Create Page
              </Button>
            </div>
          </div>
        </Card>
      )}

      {customPages.length === 0 && !isCreating ? (
        <div className="text-center py-12 text-text-muted font-mono text-sm">
          <Layout size={48} className="mx-auto mb-3 opacity-30" />
          <p>No custom pages yet</p>
          <p className="text-xs mt-1">Create your first custom dashboard page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customPages.map((page) => (
            <Card
              key={page.id}
              className={`border transition-colors ${
                expandedPage === page.id ? 'border-fud-green/50' : 'border-border-primary'
              }`}
            >
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-dark-secondary/50 transition-colors"
                onClick={() => setExpandedPage(expandedPage === page.id ? null : page.id)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical size={16} className="text-text-muted" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-text-primary">{page.name}</span>
                      {!page.isPublic && (
                        <span className="text-xs bg-fud-orange/20 text-fud-orange px-1.5 py-0.5 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted font-mono">/custom/{page.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-mono">
                    {page.panels.length} panels
                  </span>
                  {expandedPage === page.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedPage === page.id && (
                <div className="p-4 border-t border-border-primary space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePublic(page.id, !page.isPublic)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                          page.isPublic
                            ? 'bg-fud-green/20 text-fud-green'
                            : 'bg-dark-tertiary text-text-muted'
                        }`}
                      >
                        {page.isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                        {page.isPublic ? 'Public' : 'Private'}
                      </button>
                      <button
                        onClick={() => copyPageUrl(page.slug)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-dark-tertiary text-text-muted hover:text-fud-green transition-colors"
                      >
                        <Copy size={12} />
                        Copy URL
                      </button>
                      <a
                        href={`/custom/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-dark-tertiary text-text-muted hover:text-fud-green transition-colors"
                      >
                        <ExternalLink size={12} />
                        Preview
                      </a>
                    </div>
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-1.5 rounded text-text-muted hover:text-fud-red hover:bg-fud-red/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-text-muted font-mono mb-2">
                      Background Image
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={page.background || ''}
                        onChange={(e) => handleSetBackground(page.id, e.target.value || null)}
                        placeholder="Image URL or select from library..."
                        className="flex-1"
                      />
                      {page.background && (
                        <Button
                          variant="danger"
                          onClick={() => handleSetBackground(page.id, null)}
                          className="px-2"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                    {savedPatterns.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        <span className="text-xs text-text-muted font-mono mr-1">Quick:</span>
                        {savedPatterns.slice(0, 6).map((pattern) => (
                          <button
                            key={pattern.id}
                            onClick={() => handleSetBackground(page.id, pattern.url)}
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

                  <div>
                    <label className="block text-xs text-text-muted font-mono mb-2">
                      Add Panels
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AVAILABLE_PANELS.map((panel) => {
                        const count = page.panels.filter((p) => p.type === panel.id).length;
                        return (
                          <button
                            key={panel.id}
                            onClick={() => handleAddPanel(page.id, panel.id)}
                            className="p-2 rounded border border-border-primary hover:border-fud-green/50 text-left transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-text-primary group-hover:text-fud-green">
                                {panel.name}
                              </span>
                              {count > 0 && (
                                <span className="text-xs bg-fud-green/20 text-fud-green px-1.5 rounded">
                                  {count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-1">{panel.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {page.panels.length > 0 && (
                    <div>
                      <label className="block text-xs text-text-muted font-mono mb-2">
                        Active Panels ({page.panels.length})
                      </label>
                      <div className="space-y-1">
                        {page.panels.map((panel, idx) => {
                          const panelInfo = AVAILABLE_PANELS.find((p) => p.id === panel.type);
                          return (
                            <div
                              key={panel.id}
                              className="flex items-center justify-between p-2 bg-dark-tertiary rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted font-mono">#{idx + 1}</span>
                                <span className="text-sm font-mono text-text-primary">
                                  {panelInfo?.name || panel.type}
                                </span>
                                <span className="text-xs text-text-muted">
                                  ({panel.w}x{panel.h})
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    updatePanelPosition(page.id, panel.id, {
                                      visible: !panel.visible,
                                    })
                                  }
                                  className={`p-1 rounded transition-colors ${
                                    panel.visible
                                      ? 'text-fud-green hover:bg-fud-green/10'
                                      : 'text-text-muted hover:bg-dark-secondary'
                                  }`}
                                >
                                  {panel.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button
                                  onClick={() => removePanelFromPage(page.id, panel.id)}
                                  className="p-1 rounded text-text-muted hover:text-fud-red hover:bg-fud-red/10 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
