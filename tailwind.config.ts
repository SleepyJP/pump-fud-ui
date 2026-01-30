import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'fud-green': '#d6ffe0',
        'fud-green-bright': '#d6ffe0',
        'fud-green-neon': '#d6ffe0',
        'fud-green-dark': '#a8e6b0',
        'fud-pink': '#FF00FF',
        'fud-purple': '#8b5cf6',
        'fud-red': '#ef4444',
        'fud-orange': '#f97316',
        'dark-bg': '#0a0a0a',
        'dark-secondary': '#141414',
        'dark-tertiary': '#1f1f1f',
        'dark-card': '#0d0d0d',
        'border-primary': '#2a2a2a',
        'border-glow': 'rgba(214, 255, 224, 0.3)',
        'text-primary': '#ffffff',
        'text-secondary': '#d1d5db',
        'text-muted': '#9ca3af',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        neonPulse: {
          '0%, 100%': { boxShadow: '0 0 5px #d6ffe0, 0 0 10px #d6ffe0, 0 0 20px #d6ffe0' },
          '50%': { boxShadow: '0 0 10px #d6ffe0, 0 0 20px #d6ffe0, 0 0 40px #d6ffe0' },
        },
        glow: {
          '0%': { textShadow: '0 0 10px #d6ffe0, 0 0 20px #d6ffe0' },
          '100%': { textShadow: '0 0 20px #d6ffe0, 0 0 40px #d6ffe0, 0 0 60px #d6ffe0' },
        },
        scan: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(214,255,224,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(214,255,224,0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
