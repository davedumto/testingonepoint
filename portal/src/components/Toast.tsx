'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: { bg: '#2e9a55', icon: '✓' },
    error: { bg: '#dc2626', icon: '!' },
    info: { bg: '#052847', icon: 'i' },
  };

  const c = colors[type];

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 12,
      background: c.bg, color: '#fff',
      padding: '14px 20px', minWidth: 300, maxWidth: 420,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>
        {c.icon}
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
        fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
      }}>×</button>
    </div>
  );
}
