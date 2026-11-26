import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Link2,
  MessageSquare,
  Trash2,
  X,
} from 'lucide-react';
import { ActorRecord, MemberStatus } from '../types';
import { deleteActorForViolation, toggleActorStatus } from '../lib/studioService';
import { buildProfileShareUrl, getInitials } from '../lib/utils';

interface ActorProfileDrawerProps {
  actor: ActorRecord | null;
  onClose: () => void;
  onEdit: (actor: ActorRecord) => void;
  onMessage: (actor: ActorRecord) => void;
  onDeleted: (actorName: string) => void;
}

export const ActorProfileDrawer: React.FC<ActorProfileDrawerProps> = ({
  actor,
  onClose,
  onEdit,
  onMessage,
  onDeleted,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [violationNote, setViolationNote] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!actor) return null;

  const shareUrl = buildProfileShareUrl(actor.registrationNumber);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setErrorMsg('Clipboard access blocked. Copy the link manually: ' + shareUrl);
    }
  };

  const handleCopyCredentials = async () => {
    const text = `Unity Film World Production Portal\nLink: ${shareUrl}\nRegistration No: ${actor.registrationNumber}\nPassword: ${actor.accessPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2200);
    } catch {
      setErrorMsg('Clipboard access blocked.');
    }
  };

  const handleStatusToggle = async (nextStatus: MemberStatus) => {
    if (actor.status === nextStatus) return;
    setErrorMsg('');
    setIsMutating(true);
    try {
      await toggleActorStatus(actor, nextStatus);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update member status.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    setErrorMsg('');
    setIsMutating(true);
    try {
      await deleteActorForViolation(actor);
      onDeleted(actor.fullName);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete member profile.');
    } finally {
      setIsMutating(false);
    }
  };

  const detailRows = [
    { label: 'Full Name', value: actor.fullName },
    { label: 'Nickname', value: actor.nickname || '—' },
    { label: 'Registration Number', value: actor.registrationNumber, mono: true },
    { label: 'Date of Register', value: actor.dateOfRegister || '—', mono: true },
    { label: 'Date of Birth', value: actor.dateOfBirth || '—', mono: true },
    { label: 'Phone Number', value: actor.phoneNumber, mono: true },
    { label: 'Position in Production', value: actor.position },
    { label: 'Town / City', value: actor.townCity || '—' },
    { label: 'Home Address', value: actor.homeAddress || '—' },
    { label: 'State of Origin', value: actor.stateOfOrigin || '—' },
    { label: 'LGA', value: actor.lga || '—' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white h-full flex flex-col border-l border-slate-200 shadow-2xl overflow-hidden">
        {/* Top Welcome Banner */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-400">
              {actor.welcomeMessage || 'Welcome to Unity Film World Production'}
            </p>
            <h2 className="text-lg font-semibold truncate mt-0.5">{actor.fullName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close profile drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Header Identity */}
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {actor.photoUrl ? (
                <img
                  src={actor.photoUrl}
                  alt={actor.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-display font-bold text-slate-500">
                  {getInitials(actor.fullName)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-slate-900 truncate">{actor.fullName}</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                {actor.position}
                {actor.nickname ? ` · "${actor.nickname}"` : ''}
              </p>
              <p className="font-mono text-xs text-slate-500 mt-1 tabular-nums">
                {actor.registrationNumber} · Registered {actor.dateOfRegister}
              </p>

              {/* Explicit Active / Inactive Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void handleStatusToggle('active')}
                  className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    actor.status === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void handleStatusToggle('inactive')}
                  className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    actor.status === 'inactive'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Primary CEO Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
              {copiedLink ? 'Link Copied' : 'Copy Profile Link'}
            </button>

            <button
              type="button"
              onClick={() => onEdit(actor)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>

            <button
              type="button"
              onClick={() => onMessage(actor)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              Message Actor
            </button>
          </div>

          {/* Shareable Link Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-slate-600 truncate">{shareUrl}</span>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 shrink-0 cursor-pointer"
            >
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Full Member Information Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700">Member Registration Details</h4>
            </div>
            <dl className="divide-y divide-slate-100">
              {detailRows.map((row) => (
                <div key={row.label} className="px-4 py-3 flex items-start justify-between gap-4">
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

          {/* Actor Portal Credentials (CEO Only) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-900">
                Actor Self-Check Portal Password (CEO Only)
              </h4>
              <button
                type="button"
                onClick={() => void handleCopyCredentials()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCreds ? 'Copied Login' : 'Copy Login Info'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
              <span className="font-mono text-sm text-slate-900">
                {showPassword ? actor.accessPassword : '••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Delete for Production Rule Violation */}
          <div className="pt-2 border-t border-slate-200">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/70 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Profile (Rule Violation)
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-start gap-2.5 text-red-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Confirm Permanent Removal</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Deleting {actor.fullName} removes their profile and portal access due to production rule violation.
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  value={violationNote}
                  onChange={(e) => setViolationNote(e.target.value)}
                  placeholder="Optional rule violation note..."
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-red-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void handleDelete()}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                  >
                    {isMutating ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
