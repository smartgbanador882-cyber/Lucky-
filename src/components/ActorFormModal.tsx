import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { ActorRecord, FIELD_LIMITS, MemberStatus } from '../types';
import { ActorFormInput, saveActorProfile } from '../lib/studioService';
import { compressImageToDataUrl, generateActorPassword } from '../lib/utils';

interface ActorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingActor: ActorRecord | null;
  suggestedRegNumber: string;
  autoWelcomeMessage: string;
  onSaved: (actorId: string, isNew: boolean, fullName: string) => void;
}

const PRODUCTION_ROLES = [
  'Lead Actor',
  'Supporting Actor',
  'Featured Extra',
  'Film Director',
  'Assistant Director',
  'Producer',
  'Cinematographer',
  'Camera Operator',
  'Scriptwriter',
  'Film Editor',
  'Sound Engineer',
  'Makeup Artist',
  'Wardrobe Stylist',
  'Set Designer',
  'Stunt Coordinator',
  'Production Assistant',
];

export const ActorFormModal: React.FC<ActorFormModalProps> = ({
  isOpen,
  onClose,
  existingActor,
  suggestedRegNumber,
  autoWelcomeMessage,
  onSaved,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<ActorFormInput>({
    fullName: '',
    nickname: '',
    dateOfBirth: '',
    registrationNumber: suggestedRegNumber,
    dateOfRegister: todayIso,
    phoneNumber: '',
    position: 'Lead Actor',
    townCity: '',
    homeAddress: '',
    stateOfOrigin: '',
    lga: '',
    photoUrl: '',
    status: 'active',
    accessPassword: generateActorPassword(),
  });

  const [showPassword, setShowPassword] = useState(true);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (existingActor) {
      setForm({
        fullName: existingActor.fullName,
        nickname: existingActor.nickname,
        dateOfBirth: existingActor.dateOfBirth,
        registrationNumber: existingActor.registrationNumber,
        dateOfRegister: existingActor.dateOfRegister,
        phoneNumber: existingActor.phoneNumber,
        position: existingActor.position,
        townCity: existingActor.townCity,
        homeAddress: existingActor.homeAddress,
        stateOfOrigin: existingActor.stateOfOrigin,
        lga: existingActor.lga,
        photoUrl: existingActor.photoUrl,
        status: existingActor.status,
        accessPassword: existingActor.accessPassword,
      });
    } else {
      setForm({
        fullName: '',
        nickname: '',
        dateOfBirth: '',
        registrationNumber: suggestedRegNumber,
        dateOfRegister: todayIso,
        phoneNumber: '',
        position: 'Lead Actor',
        townCity: '',
        homeAddress: '',
        stateOfOrigin: '',
        lga: '',
        photoUrl: '',
        status: 'active',
        accessPassword: generateActorPassword(),
      });
    }
  }, [isOpen, existingActor, suggestedRegNumber, todayIso]);

  if (!isOpen) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setIsCompressingPhoto(true);
    try {
      const compressed = await compressImageToDataUrl(file, 480, 0.82);
      setForm((prev) => ({ ...prev, photoUrl: compressed }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process selected photo.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleStatusChange = (status: MemberStatus) => {
    setForm((prev) => ({ ...prev, status }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);
    try {
      const result = await saveActorProfile(form, existingActor, autoWelcomeMessage);
      onSaved(result.actorId, result.isNew, form.fullName.trim());
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save actor profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-sm md:p-6">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                {existingActor ? 'Edit Member Profile' : 'Register New Member'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Unity Film World Production · CEO Exclusive Registry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Close registration form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Photo & Status Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt="Member preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Member Portrait Photo</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCompressingPhoto ? 'Processing...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={isCompressingPhoto}
                    />
                  </label>
                  {form.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, photoUrl: '' }))}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active / Inactive Buttons */}
            <div className="space-y-2 w-full sm:w-auto">
              <span className="block text-xs font-medium text-slate-600">Membership Status</span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    form.status === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('inactive')}
                  className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    form.status === 'inactive'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Core Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.fullName.max}
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="e.g. Chinedu Okafor"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nickname / Stage Name
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.nickname.max}
                value={form.nickname}
                onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))}
                placeholder="e.g. StarBoy"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Registration Number *
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.registrationNumber.max}
                value={form.registrationNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, registrationNumber: e.target.value }))
                }
                placeholder="UFW-2026-001"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Date of Register *
              </label>
              <input
                type="date"
                required
                value={form.dateOfRegister}
                onChange={(e) => setForm((prev) => ({ ...prev, dateOfRegister: e.target.value }))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={form.dateOfBirth}
                onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                maxLength={FIELD_LIMITS.phoneNumber.max}
                value={form.phoneNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+234 801 234 5678"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Your Position in the Production *
              </label>
              <input
                type="text"
                required
                list="ufw-production-roles"
                maxLength={FIELD_LIMITS.position.max}
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="e.g. Lead Actor, Director, Cinematographer"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <datalist id="ufw-production-roles">
                {PRODUCTION_ROLES.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Location & Origin Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Your Town / City *
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.townCity.max}
                value={form.townCity}
                onChange={(e) => setForm((prev) => ({ ...prev, townCity: e.target.value }))}
                placeholder="e.g. Ikeja, Lagos"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                State of Origin *
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.stateOfOrigin.max}
                value={form.stateOfOrigin}
                onChange={(e) => setForm((prev) => ({ ...prev, stateOfOrigin: e.target.value }))}
                placeholder="e.g. Rivers State"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                LGA (Local Government Area) *
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.lga.max}
                value={form.lga}
                onChange={(e) => setForm((prev) => ({ ...prev, lga: e.target.value }))}
                placeholder="e.g. Obio/Akpor"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Home Address *
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.homeAddress.max}
                value={form.homeAddress}
                onChange={(e) => setForm((prev) => ({ ...prev, homeAddress: e.target.value }))}
                placeholder="Street number and residential address"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Actor Portal Access Password */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Actor Profile Check Password
                </h3>
                <p className="text-xs text-slate-500">
                  Share this password with the member so they can view (read-only) their profile and messages.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, accessPassword: generateActorPassword() }))
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={FIELD_LIMITS.accessPassword.min}
                maxLength={FIELD_LIMITS.accessPassword.max}
                value={form.accessPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, accessPassword: e.target.value }))}
                className="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!existingActor && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Automatic Welcome Message:</strong> On save, this actor will immediately receive:{' '}
              &ldquo;{autoWelcomeMessage}&rdquo;
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressingPhoto}
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSaving
                ? 'Saving Record...'
                : existingActor
                  ? 'Save Changes'
                  : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
