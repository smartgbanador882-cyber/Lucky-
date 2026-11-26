import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { CeoSecurityConfig } from '../types';
import { setCeoPinOrPassword, verifyCeoPinOrPassword } from '../lib/studioService';

interface CeoPinGateProps {
  pinConfig: CeoSecurityConfig | null;
  isLoadingConfig: boolean;
  ceoEmail: string;
  onUnlocked: (newConfig?: CeoSecurityConfig) => void;
  onSignOut: () => void;
}

export const CeoPinGate: React.FC<CeoPinGateProps> = ({
  pinConfig,
  isLoadingConfig,
  ceoEmail,
  onUnlocked,
  onSignOut,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (isLoadingConfig) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Checking CEO security status...</p>
        </div>
      </div>
    );
  }

  const isFirstSetup = !pinConfig;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (pinInput.trim().length < 4) {
      setErrorMsg('CEO PIN or password must be at least 4 characters.');
      return;
    }

    if (isFirstSetup && pinInput.trim() !== confirmInput.trim()) {
      setErrorMsg('PIN / Password confirmation does not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isFirstSetup) {
        const created = await setCeoPinOrPassword(pinInput);
        setPinInput('');
        setConfirmInput('');
        onUnlocked(created);
      } else {
        const valid = await verifyCeoPinOrPassword(pinConfig, pinInput);
        if (!valid) {
          setErrorMsg('Incorrect CEO PIN or password. Please try again.');
        } else {
          setPinInput('');
          onUnlocked();
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to verify CEO PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Unity Film World Production · CEO Security</span>
        </div>
        <h1 className="text-2xl font-bold">
          {isFirstSetup ? 'Create Your CEO PIN or Password' : 'CEO Dashboard Locked'}
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          {isFirstSetup
            ? 'Set a private PIN or password for your CEO account. You can change it anytime in App Settings.'
            : `Signed in as ${ceoEmail}. Enter your CEO PIN or password to unlock actor management, messaging, and earnings.`}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
      >
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {isFirstSetup ? 'Choose CEO PIN or Password (min 4 characters) *' : 'Enter CEO PIN or Password *'}
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              required
              minLength={4}
              maxLength={64}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder={isFirstSetup ? 'e.g. 2026 or your private password' : 'Enter your CEO PIN or password'}
              className="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setShowPin((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 cursor-pointer"
              aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isFirstSetup && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Confirm CEO PIN or Password *
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              required
              minLength={4}
              maxLength={64}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Re-enter your CEO PIN or password"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {isFirstSetup ? <KeyRound className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {isSubmitting
            ? 'Verifying...'
            : isFirstSetup
              ? 'Save CEO PIN & Unlock Dashboard'
              : 'Unlock CEO Dashboard'}
        </button>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500 truncate">{ceoEmail}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
};
