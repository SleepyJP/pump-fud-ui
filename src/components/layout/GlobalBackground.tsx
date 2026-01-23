'use client';

import { useSiteSettings } from '@/stores/siteSettingsStore';

export function GlobalBackground() {
  const {
    globalBackground,
    globalBackgroundOpacity,
    globalBackgroundBlur,
  } = useSiteSettings();

  if (!globalBackground) return null;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: `url(${globalBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        opacity: globalBackgroundOpacity / 100,
        filter: globalBackgroundBlur > 0 ? `blur(${globalBackgroundBlur}px)` : undefined,
      }}
    />
  );
}
