import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { KGO_ES_NAME } from '../branding';

const SPLASH_ACK_KEY = 'kgo-es:splash-ack';

/** KGO-ES product entry — local Continue; production uses edge SSO upstream of this app. */
export default function KgoEsModuleSplash({ onContinue }: { onContinue: () => void }) {
  const [continuing, setContinuing] = useState(false);

  const handleContinue = () => {
    setContinuing(true);
    try {
      sessionStorage.setItem(SPLASH_ACK_KEY, '1');
    } catch {
      /* ignore */
    }
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6">
      <div className="w-full max-w-md space-y-6 text-center text-slate-100">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-800 font-mono text-lg font-semibold shadow-lg">
          ES
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{KGO_ES_NAME}</h1>
          <p className="mt-1 text-sm text-slate-400">Schematic editor · facility drawings</p>
        </div>
        <p className="text-sm leading-relaxed text-slate-400">
          Open schematics and device libraries for trackIT Plant. Production entry uses organization SSO at the edge.
        </p>
        <button
          type="button"
          disabled={continuing}
          onClick={handleContinue}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
        >
          Continue to {KGO_ES_NAME}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function isKgoEsSplashAcknowledged(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_ACK_KEY) === '1';
  } catch {
    return false;
  }
}
