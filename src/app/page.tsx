'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const APP_URL = 'https://frontend-two-zeta-86.vercel.app/';

export default function HomePage() {
  return (
    <>
      {/* Full screen background image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/pumpfud-backdrop.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-24">
        {/* Buttons positioned at bottom, below the logo in the image */}
        <div className="text-center px-4">
          <p className="text-white text-lg md:text-xl font-mono mb-8 drop-shadow-lg">
            Launch your token on PulseChain
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={APP_URL}>
              <Button size="lg" className="gap-2 px-8">
                <Sparkles size={20} />
                Begin Creation
              </Button>
            </a>
            <a href={APP_URL}>
              <Button variant="secondary" size="lg" className="gap-2 px-8">
                Browse Tokens
                <ArrowRight size={20} />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
