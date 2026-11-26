import React, { useEffect, useState } from 'react';
import {
  Banknote,
  Check,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  Save,
  Shield,
  Smartphone,
} from 'lucide-react';
import { CeoSecurityConfig, CURRENCY_SYMBOLS, StudioSettings } from '../types';
import {
  saveStudioSettings,
  setCeoPinOrPassword,
  verifyCeoPinOrPassword,
} from '../lib/studioService';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsPageProps {
  settings: Omit<StudioSettings, 'updatedAt'>;
  isCEO: boolean;
  pinConfig: CeoSecurityConfig | null;
  onPinUpdated: (newConfig: CeoSecurityConfig) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  isCEO,
  pinConfig,
  onPinUpdated,
}) => {
  const [form, setForm] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // CEO PIN Update state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCEO) return;
    setErrorMsg('');
    setSavedNotice('');
    setIsSaving(true);
    try {
      await saveStudioSettings(form);
      setSavedNotice('App settings & CEO payout configuration saved.');
      setTimeout(() => setSavedNotice(''), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCEO) return;
    setPinError('');
    setPinNotice('');

    if (newPin.trim().length < 4) {
      setPinError('New CEO PIN or password must be at least 4 characters.');
      return;
    }
    if (newPin.trim() !== confirmNewPin.trim()) {
      setPinError('New PIN / password confirmation does not match.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      if (pinConfig) {
        const ok = await verifyCeoPinOrPassword(pinConfig, currentPin);
        if (!ok) {
          setPinError('Current CEO PIN or password is incorrect.');
          setIsUpdatingPin(false);
          return;
        }
      }
      const updated = await setCeoPinOrPassword(newPin);
      onPinUpdated(updated);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setPinNotice('CEO PIN / password updated securely.');
      setTimeout(() => setPinNotice(''), 3500);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Unable to update CEO PIN.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">App Settings &amp; Store Publishing</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage Unity Film World Production branding, CEO PIN/password, video payout bank details, and Play Store / App Store readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Studio Configuration + CEO Payout Account */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Studio, Payout &amp; Administration Settings
                </h2>
              </div>
              {!isCEO && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                  CEO Edit Only
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}
              {savedNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savedNotice}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Studio Name
                  </label>
                  <input
                    type="text"
                    disabled={!isCEO}
                    value={form.studioName}
                    onChange={(e) => setForm((p) => ({ ...p, studioName: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Registration Number Prefix
                  </label>
                  <input
                    type="text"
                    disabled={!isCEO}
                    value={form.regPrefix}
                    onChange={(e) => setForm((p) => ({ ...p, regPrefix: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Dashboard &amp; Profile Welcome Headline
                </label>
                <input
                  type="text"
                  disabled={!isCEO}
                  value={form.welcomeHeadline}
                  onChange={(e) => setForm((p) => ({ ...p, welcomeHeadline: e.target.value }))}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Studio Motto
                </label>
                <input
                  type="text"
                  disabled={!isCEO}
                  value={form.motto}
                  onChange={(e) => setForm((p) => ({ ...p, motto: e.target.value }))}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* CEO Video Payout Account Section */}
              {isCEO && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Banknote className="w-4 h-4 text-amber-700" />
                    <h3 className="text-sm font-semibold">
                      CEO Video Earnings &amp; Payout Account
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Bank / Mobile Money Name
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={form.payoutBankName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, payoutBankName: e.target.value }))
                        }
                        placeholder="e.g. Zenith Bank / OPay"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={form.payoutAccountNumber}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, payoutAccountNumber: e.target.value }))
                        }
                        placeholder="e.g. 0123456789"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={form.payoutAccountName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, payoutAccountName: e.target.value }))
                        }
                        placeholder="Unity Film World Production"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Online Checkout Link (Paystack / Flutterwave / Stripe)
                      </label>
                      <input
                        type="url"
                        maxLength={500}
                        value={form.paymentLink}
                        onChange={(e) => setForm((p) => ({ ...p, paymentLink: e.target.value }))}
                        placeholder="https://paystack.com/pay/..."
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={form.defaultCurrency}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, defaultCurrency: e.target.value }))
                        }
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                      >
                        {Object.keys(CURRENCY_SYMBOLS).map((c) => (
                          <option key={c} value={c}>
                            {c} ({CURRENCY_SYMBOLS[c]})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Default Video Ticket Price
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={form.defaultVideoPrice}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, defaultVideoPrice: Number(e.target.value) }))
                        }
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Earnings Per Free View
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={form.perViewRate}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, perViewRate: Number(e.target.value) }))
                        }
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Automatic New Member Registration Message
                </label>
                <textarea
                  rows={2}
                  disabled={!isCEO}
                  value={form.autoWelcomeMessage}
                  onChange={(e) => setForm((p) => ({ ...p, autoWelcomeMessage: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Production Code of Conduct &amp; Rules
                </label>
                <textarea
                  rows={4}
                  disabled={!isCEO}
                  value={form.productionRules}
                  onChange={(e) => setForm((p) => ({ ...p, productionRules: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    CEO Contact Email
                  </label>
                  <input
                    type="email"
                    disabled={!isCEO}
                    value={form.contactEmail}
                    onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Studio Phone
                  </label>
                  <input
                    type="tel"
                    disabled={!isCEO}
                    value={form.contactPhone}
                    onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {isCEO && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving Settings...' : 'Save App Settings'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* CEO PIN / Password Change Card */}
          {isCEO && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Change CEO PIN or Password
                </h2>
              </div>

              <form onSubmit={handlePinChange} className="p-6 space-y-4">
                {pinError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {pinError}
                  </div>
                )}
                {pinNotice && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{pinNotice}</span>
                  </div>
                )}

                {pinConfig && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Current CEO PIN or Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      New CEO PIN or Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      maxLength={64}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Confirm New PIN / Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      maxLength={64}
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingPin}
                    className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    {isUpdatingPin ? 'Updating...' : 'Update CEO PIN / Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right: Play Store & App Store Publishing Readiness */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Mobile App &amp; Store Publishing
                </h2>
                <p className="text-xs text-slate-500">
                  Installable PWA ready for Google Play Store &amp; Apple App Store
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This app is configured with a Web App Manifest, offline service worker caching, and high-resolution app icons so it installs directly on Android and iOS and packages cleanly for store submission.
            </p>

            <div className="pt-1">
              <PWAInstallButton variant="card" />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-800">Store Readiness Checklist</h3>
              {[
                'Web App Manifest configured (Standalone display)',
                '192x192, 512x512, Maskable & Apple Touch PNG icons',
                'Offline Service Worker precaching enabled',
                'Mobile-first 44px touch targets & bottom navigation',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-amber-400">
              How to Publish to Play Store &amp; App Store
            </h3>
            <ol className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
              <li>
                Deploy your app to your live HTTPS domain (via AI Studio Deploy / Cloud Run).
              </li>
              <li>
                <strong>Google Play Store (.aab):</strong> Enter your live URL into{' '}
                <span className="text-white font-medium">PWABuilder.com</span> or{' '}
                <span className="text-white font-medium">Bubblewrap CLI</span> to generate a signed Android Trusted Web Activity (AAB) package for Google Play Console.
              </li>
              <li>
                <strong>Apple App Store (.ipa):</strong> Use{' '}
                <span className="text-white font-medium">PWABuilder iOS</span> or{' '}
                <span className="text-white font-medium">Capacitor</span> with Xcode to wrap the live app into an iOS App Store build.
              </li>
            </ol>
            <a
              href="https://www.pwabuilder.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>Open PWABuilder Store Packager</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
