'use client';

import { useEffect, useState } from 'react';
import { getReferralCode, REFERRAL_CONFIG } from '@/config/referrals';

export function ReferralBanner() {
  const [code, setCode] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const refCode = getReferralCode();
    if (refCode && refCode !== REFERRAL_CONFIG.DEFAULT_CODE) {
      setCode(refCode);
      setIsVisible(true);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible || !code) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.9) 0%, rgba(22,163,74,0.9) 100%)',
        border: '1px solid rgba(34,197,94,0.5)',
        borderRadius: '12px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: '20px' }}>🎁</span>
      <div>
        <p
          style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Referred by {code}
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '11px',
            margin: 0,
          }}
        >
          Your referrer will earn rewards from your trades
        </p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '4px',
          marginLeft: '8px',
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Share referral link component
 */
export function ReferralShareCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://pump.fud'}/?ref=${code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: 'rgba(10,10,12,0.9)',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🔗</span>
        <h3
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            color: '#ffd700',
            letterSpacing: '0.1em',
            margin: 0,
          }}
        >
          YOUR REFERRAL LINK
        </h3>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '12px',
        }}
      >
        <code
          style={{
            flex: 1,
            color: '#22c55e',
            fontSize: '13px',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {link}
        </code>
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            background: copied
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>
        Earn 0.125% of trading volume from users who use your link
      </p>
    </div>
  );
}

/**
 * Register referral code form
 */
export function RegisterCodeForm({
  onSuccess,
}: {
  onSuccess?: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate format
    if (code.length < 3) {
      setError('Code must be at least 3 characters');
      return;
    }
    if (code.length > 20) {
      setError('Code must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      setError('Only letters and numbers allowed');
      return;
    }

    // TODO: Call registerCode from useReferral hook
    onSuccess?.(code.toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: 'rgba(10,10,12,0.9)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '16px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>✨</span>
          <h3
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '16px',
              color: '#ffd700',
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            REGISTER YOUR CODE
          </h3>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="YOURCODE"
            maxLength={20}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.4)',
              border: error ? '1px solid #ef4444' : '1px solid rgba(139,92,246,0.3)',
              borderRadius: '8px',
              padding: '14px 16px',
              color: '#e8e8e8',
              fontSize: '16px',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              outline: 'none',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isChecking || code.length < 3}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            background:
              code.length < 3
                ? 'linear-gradient(135deg, #333 0%, #222 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            border: 'none',
            color: code.length < 3 ? '#666' : '#fff',
            fontFamily: 'Cinzel, serif',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: code.length < 3 ? 'not-allowed' : 'pointer',
          }}
        >
          {isChecking ? 'Checking...' : 'Register Code'}
        </button>

        <p style={{ color: '#666', fontSize: '11px', marginTop: '12px', textAlign: 'center' }}>
          3-20 characters, letters and numbers only
        </p>
      </div>
    </form>
  );
}
