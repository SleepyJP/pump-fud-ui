import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono, Orbitron, Cinzel } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GlobalBackground } from '@/components/layout/GlobalBackground';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
});

export const metadata: Metadata = {
  title: 'PUMP.FUD | Permissionless Un-Stoppable Meme Platform',
  description:
    'PUMP.FUD — Permissionless Un-Stoppable Meme Platform. Fully Autonomous Utility Distribution. Fair launches with bonding curves on PulseChain. First the FUD... Then they FOMO. We MAKE Memes.',
  keywords: ['PulseChain', 'memecoin', 'launchpad', 'bonding curve', 'DeFi', 'PUMP.FUD', 'meme platform', 'permissionless'],
  metadataBase: new URL('https://pump-fud-ui.vercel.app'),
  openGraph: {
    title: 'PUMP.FUD | Permissionless Un-Stoppable Meme Platform',
    description: 'PUMP.FUD — Permissionless Un-Stoppable Meme Platform. Fully Autonomous Utility Distribution. First the FUD... Then they FOMO. We MAKE Memes.',
    url: 'https://pump-fud-ui.vercel.app/?ref=31B8F9A8',
    siteName: 'PUMP.FUD',
    images: [
      {
        url: '/pump-fud-share.jpg',
        width: 1200,
        height: 675,
        alt: 'PUMP.FUD - Memecoin Launchpad on PulseChain',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PUMP.FUD | Permissionless Un-Stoppable Meme Platform',
    description: 'PUMP.FUD — Permissionless Un-Stoppable Meme Platform. Fully Autonomous Utility Distribution. First the FUD... Then they FOMO. We MAKE Memes.',
    site: '@PUMPFUDPLS',
    creator: '@PUMPFUDPLS',
    images: ['/pump-fud-share.jpg'],
  },
  other: {
    'telegram:channel': 'https://t.me/PUMP_dot_FUD',
    'twitch:channel': 'https://twitch.tv/pumpfud',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${orbitron.variable} ${cinzel.variable} font-sans bg-dark-bg text-text-primary min-h-screen flex flex-col antialiased`}
      >
        <Providers>
          <GlobalBackground />
          <Header />
          <main className="flex-1 pt-20 grid-bg">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
// Wed Jan 28 13:21:14 EST 2026
