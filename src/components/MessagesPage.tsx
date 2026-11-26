import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, Search, Send, Users } from 'lucide-react';
import { ActorRecord, FIELD_LIMITS, StudioMessage } from '../types';
import { sendMessageToActor } from '../lib/studioService';
import { getInitials } from '../lib/utils';

interface MessagesPageProps {
  actors: ActorRecord[];
  messages: StudioMessage[];
  preselectedActorId: string | null;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  actors,
  messages,
  preselectedActorId,
}) => {
  const [selectedActorId, setSelectedActorId] = useState<string>(preselectedActorId || '');
  const [actorSearch, setActorSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (preselectedActorId) {
      setSelectedActorId(preselectedActorId);
    } else if (!selectedActorId && actors.length > 0) {
      setSelectedActorId(actors[0].id);
    }
  }, [preselectedActorId, actors, selectedActorId]);

  const selectedActor = actors.find((a) => a.id === selectedActorId) || null;

  const filteredActors = actors.filter((a) => {
    const q = actorSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      a.fullName.toLowerCase().includes(q) ||
      a.position.toLowerCase().includes(q) ||
      a.registrationNumber.toLowerCase().includes(q)
    );
  });

  const actorMessages = selectedActor
    ? messages.filter((m) => m.actorId === selectedActor.id)
    : messages;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActor) {
      setErrorMsg('Please select an actor to message.');
      return;
    }
    setErrorMsg('');
    setStatusNotice('');
    setIsSending(true);
    try {
      await sendMessageToActor(selectedActor, subject, body, false);
      setSubject('');
      setBody('');
      setStatusNotice(`Message delivered to ${selectedActor.fullName}'s actor portal.`);
      setTimeout(() => setStatusNotice(''), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Cast &amp; Crew Messaging Center</h1>
        <p className="text-sm text-slate-600 mt-1">
          Send direct call sheets, schedule updates, and notices to any registered member&apos;s personal inbox.
        </p>
      </div>

      {actors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No registered members yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Register actors first in the CEO Dashboard to message them directly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Actor Picker */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={actorSearch}
                  onChange={(e) => setActorSearch(e.target.value)}
                  placeholder="Find actor by name or role..."
                  className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
              {filteredActors.map((actor) => {
                const isSelected = actor.id === selectedActorId;
                return (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => setSelectedActorId(actor.id)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {actor.photoUrl ? (
                        <img
                          src={actor.photoUrl}
                          alt={actor.fullName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-600">
                          {getInitials(actor.fullName)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {actor.fullName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {actor.position} · <span className="font-mono">{actor.registrationNumber}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Composer + Sent Thread */}
          <div className="lg:col-span-8 space-y-6">
            <form
              onSubmit={handleSend}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Recipient</p>
                  <h2 className="text-base font-semibold text-slate-900">
                    {selectedActor
                      ? `${selectedActor.fullName} (${selectedActor.registrationNumber})`
                      : 'Select a Member'}
                  </h2>
                </div>
                {selectedActor && (
                  <span className="text-xs font-medium text-slate-600">
                    {selectedActor.position}
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {statusNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Message Subject *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.messageSubject.max}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Call Time Tomorrow 8:00 AM — Main Soundstage"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={FIELD_LIMITS.messageBody.max}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your official message to this actor..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSending || !selectedActor}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>

            {/* Message History */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedActor
                    ? `Sent Messages to ${selectedActor.fullName}`
                    : 'All Sent Messages'}
                </h3>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {actorMessages.length} messages
                </span>
              </div>

              {actorMessages.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  <Mail className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  No messages sent to this member yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {actorMessages.map((msg) => (
                    <div key={msg.id} className="p-5 space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-sm font-semibold text-slate-900">{msg.subject}</h4>
                        <span className="text-xs text-slate-500 shrink-0">
                          {msg.isWelcomeMessage ? 'Auto-Welcome' : 'Direct Message'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
