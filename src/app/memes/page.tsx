'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { X, Plus, Trash2, ImageIcon } from 'lucide-react';
import { useSiteSettings, isAdminWallet } from '@/stores/siteSettingsStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

export default function MemesPage() {
  const { address } = useAccount();
  const isAdmin = isAdminWallet(address);
  const { memeGallery, addMeme, removeMeme } = useSiteSettings();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [selectedMeme, setSelectedMeme] = useState<string | null>(null);

  const handleAddMeme = () => {
    if (!newImageUrl.trim()) return;
    addMeme({
      imageUrl: newImageUrl.trim(),
      title: newTitle.trim() || 'Untitled',
      caption: newCaption.trim(),
    });
    setNewImageUrl('');
    setNewTitle('');
    setNewCaption('');
    setShowAddForm(false);
  };

  const selectedMemeData = selectedMeme
    ? memeGallery.find((m) => m.id === selectedMeme)
    : null;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-black via-gray-950 to-black z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-[#d6ffe0] mb-2">
            PUMP.FUD MEMES
          </h1>
          <p className="text-gray-500 font-mono text-sm">
            The finest FUD-inspired art on PulseChain
          </p>
        </div>

        {/* Admin: Add Meme */}
        {isAdmin && (
          <div className="mb-8">
            {showAddForm ? (
              <Card className="bg-dark-secondary/80 border-[#d6ffe0]/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg text-[#d6ffe0]">Add Meme</h3>
                    <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>
                  <Input
                    placeholder="Image URL (imgur, postimg, etc.)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="bg-dark-tertiary"
                  />
                  <Input
                    placeholder="Title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-dark-tertiary"
                  />
                  <Input
                    placeholder="Caption (optional)"
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    className="bg-dark-tertiary"
                  />
                  {newImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-gray-800 max-h-64">
                      <img src={newImageUrl} alt="Preview" className="w-full h-full object-contain bg-black" />
                    </div>
                  )}
                  <Button onClick={handleAddMeme} disabled={!newImageUrl.trim()} className="w-full">
                    Add to Gallery
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus size={16} />
                Add Meme
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {memeGallery.length === 0 && (
          <div className="text-center py-20">
            <ImageIcon size={64} className="mx-auto mb-4 text-gray-700" />
            <h2 className="font-display text-2xl text-gray-500 mb-2">No Memes Yet</h2>
            <p className="text-gray-600 font-mono text-sm mb-4">
              The gallery is empty. Check back soon for the dankest FUD memes.
            </p>
            <Link href="/tokens" className="text-[#d6ffe0] hover:underline font-mono text-sm">
              Browse Tokens
            </Link>
          </div>
        )}

        {/* Meme Grid */}
        {memeGallery.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {memeGallery.map((meme) => (
              <div
                key={meme.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedMeme(meme.id)}
              >
                <Card className="bg-dark-secondary/80 border-gray-800 hover:border-[#d6ffe0]/40 transition-all overflow-hidden">
                  <div className="aspect-square relative bg-black">
                    <img
                      src={meme.imageUrl}
                      alt={meme.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          '<div class="w-full h-full flex items-center justify-center text-gray-600"><span class="text-6xl">?</span></div>';
                      }}
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-display text-lg text-white truncate">{meme.title}</h3>
                    {meme.caption && (
                      <p className="text-gray-400 text-sm font-mono mt-1 line-clamp-2">{meme.caption}</p>
                    )}
                    <p className="text-gray-600 text-xs font-mono mt-2">{meme.date}</p>
                  </CardContent>
                  {/* Admin: Delete */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMeme(meme.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete meme"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedMemeData && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedMeme(null)}
          >
            <div
              className="max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedMeme(null)}
                className="self-end p-2 text-gray-400 hover:text-white mb-2"
              >
                <X size={24} />
              </button>

              {/* Image */}
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <img
                  src={selectedMemeData.imageUrl}
                  alt={selectedMemeData.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              {/* Info */}
              <div className="mt-4 text-center">
                <h2 className="font-display text-2xl text-[#d6ffe0]">{selectedMemeData.title}</h2>
                {selectedMemeData.caption && (
                  <p className="text-gray-300 font-mono text-sm mt-2">{selectedMemeData.caption}</p>
                )}
                <p className="text-gray-600 text-xs font-mono mt-2">{selectedMemeData.date}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
