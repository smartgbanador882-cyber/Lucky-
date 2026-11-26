import React, { useEffect, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { ActorPortalRecord, StudioSettings } from '../types';
import { lookupActorPortal } from '../lib/studioService';
import { buildProfileShareUrl, getInitials } from '../lib/utils';

interface ActorPortalPageProps {
  initialRegNumber: string;
  settings: Omit<StudioSettings, 'updatedAt'>;
  onGoToVideos: () => void;
}

export const ActorPortalPage: React.FC<ActorPortalPageProps> = ({
  initialRegNumber,
  settings,
  onGoToVideos,
}) => {
  const [regNumber, setRegNumber] = useState(initialRegNumber);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [portalData, setPortalData] = useState<ActorPortalRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (initialRegNumber) {
      setRegNumber(initialRegNumber);
    }
  }, [initialRegNumber]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regNumber.trim() || !password.trim()) {
      setErrorMsg('Please enter both your Registration Number and Actor Password.');
      return;
    }

    setIsLoading(true);
    try {
      const record = await lookupActorPortal(regNumber, password);
      if (!record) {
        setErrorMsg(
          'No matching profile found. Check your Registration Number and Actor Password, or contact the CEO.',
        );
      } else {
        setPortalData(record);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to verify credentials right now. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!portalData) return;
    try {
      await navigator.clipboard.writeText(buildProfileShareUrl(portalData.registrationNumber));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Ignore clipboard restriction
    }
  };

  if (portalData) {
    const detailRows = [
      { label: 'Full Name', value: portalData.fullName },
      { label: 'Nickname', value: portalData.nickname || '—' },
      { label: 'Registration Number', value: portalData.registrationNumber, mono: true },
      { label: 'Date of Register', value: portalData.dateOfRegister || '—', mono: true },
      { label: 'Date of Birth', value: portalData.dateOfBirth || '—', mono: true },
      { label: 'Phone Number', value: portalData.phoneNumber, mono: true },
      { label: 'Your Position in the Production', value: portalData.position },
      { label: 'Your Town / City', value: portalData.townCity || '—' },
      { label: 'Home Address', value: portalData.homeAddress || '—' },
      { label: 'State of Origin', value: portalData.stateOfOrigin || '—' },
      { label: 'LGA', value: portalData.lga || '—' },
    ];

    return (
      <div className="space-y-6">
        {/* Welcome Banner on Every Actor Profile */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-400">
              {portalData.welcomeMessage || 'Welcome to Unity Film World Production'}
            </p>
            <h1 className="text-2xl font-bold">{portalData.fullName}</h1>
            <p className="text-sm text-slate-300">
              {portalData.position} ·{' '}
              <span className="font-mono tabular-nums">{portalData.registrationNumber}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
              {copiedLink ? 'Link Copied' : 'Copy Profile Link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalData(null);
                setPassword('');
              }}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Lock Profile
            </button>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-start gap-3">
          <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <strong>View-Only Member Profile:</strong> You can view your registered information and read messages from the CEO. Only the CEO of {settings.studioName} can edit or update member profiles.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Photo + Status + Details */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-5">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {portalData.photoUrl ? (
                  <img
                    src={portalData.photoUrl}
                    alt={portalData.fullName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-display font-bold text-slate-500">
                    {getInitials(portalData.fullName)}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 min-w-0">
                <h2 className="text-xl font-bold text-slate-900 truncate">{portalData.fullName}</h2>
                <p className="text-sm text-slate-600">
                  {portalData.position}
                  {portalData.nickname ? ` · "${portalData.nickname}"` : ''}
                </p>
                <div className="pt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                      portalData.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    Membership Status: {portalData.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <dl className="divide-y divide-slate-100">
              {detailRows.map((row) => (
                <div key={row.label} className="px-6 py-3.5 flex items-start justify-between gap-4">
                  <dt className="text-xs font-medium text-slate-500 shrink-0">{row.label}</dt>
                  <dd
                    className={`text-sm text-slate-900 text-right break-words ${
                      row.mono ? 'font-mono tabular-nums' : 'font-medium'
                    }`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: Actor Messages Inbox */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Messages from Unity Film World CEO
                  </h3>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {(portalData.messages || []).length}
                </span>
              </div>

              {!portalData.messages || portalData.messages.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No messages in your inbox yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {portalData.messages.map((msg) => (
                    <div key={msg.id} className="p-5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{msg.subject}</h4>
                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          {msg.sentAtIso ? msg.sentAtIso.slice(0, 10) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Production Videos</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Watch behind-the-scenes clips and studio trailers.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToVideos}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer shrink-0"
              >
                Watch Videos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-2">
        <p className="text-xs font-semibold text-amber-400">
          {settings.welcomeHeadline || 'Welcome to Unity Film World Production'}
        </p>
        <h1 className="text-2xl font-bold">Member Profile Check</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Enter your Registration Number and personal Actor Password issued by the CEO to view your profile details and studio messages.
        </p>
      </div>

      <form
        onSubmit={handleUnlock}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
      >
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Registration Number *
          </label>
          <input
            type="text"
            required
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            placeholder="e.g. UFW-2026-001"
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Actor Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password provided by CEO"
              className="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          {isLoading ? 'Verifying Credentials...' : 'Check My Information'}
        </button>

        <div className="pt-3 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Profiles are strictly read-only for members. If any of your details need correction, contact the CEO.
          </span>
        </div>
      </form>
    </div>
  );
};
