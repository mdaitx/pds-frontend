'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return;
    queueMicrotask(() => {
      setDismissed(false);
      setShowIosHint(isIosSafari());
    });

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  if (dismissed || (!installEvent && !showIosHint)) return null;

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    setInstallEvent(null);
    dismiss();
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-blue-950 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Download className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Use como aplicativo no celular</h2>
          <p className="mt-1 text-sm text-blue-900/80">
            Instale o Truck Finanças para abrir direto no painel do motorista, em tela cheia e com navegação otimizada.
          </p>
          {showIosHint && !installEvent ? (
            <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-blue-900">
              No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.
            </p>
          ) : (
            <Button type="button" size="sm" className="mt-3" onClick={install}>
              Instalar app
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Dispensar sugestão de instalação"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
