'use client';

import { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileGateProps {
  siteKey?: string;
  enforced: boolean;
  resetKey: number;
  onToken: (token: string | null) => void;
}

export function TurnstileGate({ siteKey, enforced, resetKey, onToken }: TurnstileGateProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!enforced || !siteKey || !container.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: 'analyze',
        theme: 'dark',
        size: 'flexible',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-gpu-turnstile]');
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener('load', render, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.gpuTurnstile = 'true';
      script.addEventListener('load', render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [enforced, onToken, siteKey]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!enforced) {
    return <p className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="size-3.5" /> Local security gate disabled</p>;
  }
  if (!siteKey) return <p className="text-xs text-amber-200">Security verification is not configured.</p>;
  return <div ref={container} className="min-h-[65px] w-full overflow-hidden rounded-lg" aria-label="Cloudflare Turnstile security verification" />;
}
