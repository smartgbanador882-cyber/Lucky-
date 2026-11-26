import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium">
          Installed as Standalone App
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[44px]"
      >
        <Download className="w-4 h-4" />
        Install Mobile App
      </button>
    );
  }

  if (isIOS || variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[44px]"
        >
          <Smartphone className="w-4 h-4" />
          {isIOS ? 'Install on iPhone / iPad' : 'Install App Guide'}
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Install Unity Film World Production
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                {isIOS ? (
                  <>
                    <p>1. Tap the <strong>Share</strong> icon in Safari at the bottom or top of your screen.</p>
                    <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                    <p>3. Tap <strong>Add</strong> to launch Unity Film World Production like a native iOS app.</p>
                  </>
                ) : (
                  <>
                    <p>1. Open this app in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on Android or Desktop.</p>
                    <p>2. Open the browser menu and select <strong>Install App</strong> or <strong>Add to Home screen</strong>.</p>
                    <p>3. For Play Store &amp; App Store distribution, use the packaging guide inside App Settings.</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
