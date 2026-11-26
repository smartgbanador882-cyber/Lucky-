import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  Banknote,
  Check,
  Film,
  KeyRound,
  Link2,
  Lock,
  LogIn,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import {
  ActorRecord,
  AppTab,
  CeoSecurityConfig,
  DEFAULT_STUDIO_SETTINGS,
  MemberFilter,
  StudioMessage,
  StudioSettings,
  StudioVideo,
  VideoPaymentRecord,
  VideoViewRecord,
} from './types';
import {
  auth,
  CEO_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { toggleActorStatus } from './lib/studioService';
import { buildProfileShareUrl, getInitials } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActorFormModal } from './components/ActorFormModal';
import { ActorProfileDrawer } from './components/ActorProfileDrawer';
import { VideosPage } from './components/VideosPage';
import { MessagesPage } from './components/MessagesPage';
import { ActorPortalPage } from './components/ActorPortalPage';
import { SettingsPage } from './components/SettingsPage';
import { EarningsPage } from './components/EarningsPage';
import { CeoPinGate } from './components/CeoPinGate';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';

function StudioApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // CEO PIN / Password lock state
  const [pinConfig, setPinConfig] = useState<CeoSecurityConfig | null>(null);
  const [isLoadingPin, setIsLoadingPin] = useState(false);
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);

  const [actors, setActors] = useState<ActorRecord[]>([]);
  const [videos, setVideos] = useState<StudioVideo[]>([]);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [videoPayments, setVideoPayments] = useState<VideoPaymentRecord[]>([]);
  const [videoViews, setVideoViews] = useState<VideoViewRecord[]>([]);
  const [settings, setSettings] = useState<Omit<StudioSettings, 'updatedAt'>>(
    DEFAULT_STUDIO_SETTINGS,
  );
  const [isLoadingData, setIsLoadingData] = useState(true);

  const initialMemberParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('member') || '';
  }, []);

  const [activeTab, setActiveTab] = useState<AppTab>(
    initialMemberParam ? 'portal' : 'dashboard',
  );
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<ActorRecord | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [messageTargetActorId, setMessageTargetActorId] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');

  const isCeoGoogle = Boolean(
    authUser &&
      authUser.emailVerified &&
      authUser.email?.toLowerCase() === CEO_EMAIL.toLowerCase(),
  );

  // Fully unlocked CEO (Google verified + CEO PIN/Password verified)
  const isCEO = isCeoGoogle && isPinUnlocked;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setIsPinUnlocked(false);
        setPinConfig(null);
      }
    });
    return () => unsub();
  }, []);

  // Load CEO PIN config once CEO signs in with Google
  useEffect(() => {
    if (!authReady || !isCeoGoogle) return;
    let active = true;
    setIsLoadingPin(true);
    getDoc(doc(db, 'ceoSecurity', 'pinConfig'))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setPinConfig(snap.data() as CeoSecurityConfig);
        } else {
          setPinConfig(null);
        }
        setIsLoadingPin(false);
      })
      .catch((error) => {
        if (!active) return;
        setIsLoadingPin(false);
        handleFirestoreError(error, OperationType.GET, 'ceoSecurity/pinConfig');
      });

    return () => {
      active = false;
    };
  }, [authReady, isCeoGoogle]);

  // Load Studio Settings (public doc 'settings/studio')
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'studio'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Partial<StudioSettings>;
          setSettings({
            studioName: d.studioName || DEFAULT_STUDIO_SETTINGS.studioName,
            welcomeHeadline: d.welcomeHeadline || DEFAULT_STUDIO_SETTINGS.welcomeHeadline,
            motto: d.motto || DEFAULT_STUDIO_SETTINGS.motto,
            regPrefix: d.regPrefix || DEFAULT_STUDIO_SETTINGS.regPrefix,
            autoWelcomeMessage:
              d.autoWelcomeMessage || DEFAULT_STUDIO_SETTINGS.autoWelcomeMessage,
            productionRules: d.productionRules || DEFAULT_STUDIO_SETTINGS.productionRules,
            contactEmail: d.contactEmail || DEFAULT_STUDIO_SETTINGS.contactEmail,
            contactPhone: d.contactPhone || DEFAULT_STUDIO_SETTINGS.contactPhone,
            payoutBankName: d.payoutBankName ?? DEFAULT_STUDIO_SETTINGS.payoutBankName,
            payoutAccountNumber:
              d.payoutAccountNumber ?? DEFAULT_STUDIO_SETTINGS.payoutAccountNumber,
            payoutAccountName:
              d.payoutAccountName ?? DEFAULT_STUDIO_SETTINGS.payoutAccountName,
            paymentLink: d.paymentLink ?? DEFAULT_STUDIO_SETTINGS.paymentLink,
            defaultCurrency: d.defaultCurrency || DEFAULT_STUDIO_SETTINGS.defaultCurrency,
            defaultVideoPrice:
              d.defaultVideoPrice ?? DEFAULT_STUDIO_SETTINGS.defaultVideoPrice,
            perViewRate: d.perViewRate ?? DEFAULT_STUDIO_SETTINGS.perViewRate,
          });
        }
      },
      (error) => {
        console.warn('Settings read notice:', error.message);
      },
    );
    return () => unsub();
  }, []);

  // Load Videos
  useEffect(() => {
    if (!authReady) return;
    const q = isCEO
      ? query(collection(db, 'videos'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'videos'), where('isPublished', '==', true));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as StudioVideo);
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });
        setVideos(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'videos');
      },
    );

    return () => unsub();
  }, [authReady, isCEO]);

  // Load CEO-only collections (Actors, Messages, VideoPayments, VideoViews)
  useEffect(() => {
    if (!authReady) return;
    if (!isCEO) {
      setActors([]);
      setMessages([]);
      setVideoPayments([]);
      setVideoViews([]);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const unsubActors = onSnapshot(
      query(collection(db, 'actors'), orderBy('createdAt', 'desc')),
      (snap) => {
        setActors(snap.docs.map((d) => d.data() as ActorRecord));
        setIsLoadingData(false);
      },
      (error) => {
        setIsLoadingData(false);
        handleFirestoreError(error, OperationType.LIST, 'actors');
      },
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (snap) => {
        setMessages(snap.docs.map((d) => d.data() as StudioMessage));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      },
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'videoPayments'), orderBy('createdAt', 'desc')),
      (snap) => {
        setVideoPayments(snap.docs.map((d) => d.data() as VideoPaymentRecord));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'videoPayments');
      },
    );

    const unsubViews = onSnapshot(
      query(collection(db, 'videoViews'), orderBy('createdAt', 'desc')),
      (snap) => {
        setVideoViews(snap.docs.map((d) => d.data() as VideoViewRecord));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'videoViews');
      },
    );

    return () => {
      unsubActors();
      unsubMessages();
      unsubPayments();
      unsubViews();
    };
  }, [authReady, isCEO]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleCEOSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in was cancelled or failed.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsPinUnlocked(false);
    setSelectedActorId(null);
  };

  const suggestedRegNumber = useMemo(() => {
    const nextNum = String(actors.length + 1).padStart(3, '0');
    return `${settings.regPrefix || 'UFW-2026-'}${nextNum}`;
  }, [actors.length, settings.regPrefix]);

  const totalMembersCount = actors.length;
  const activeMembersCount = useMemo(
    () => actors.filter((a) => a.status === 'active').length,
    [actors],
  );
  const inactiveMembersCount = totalMembersCount - activeMembersCount;

  const filteredActors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return actors.filter((actor) => {
      if (memberFilter === 'active' && actor.status !== 'active') return false;
      if (memberFilter === 'inactive' && actor.status !== 'inactive') return false;
      if (!q) return true;
      return (
        actor.fullName.toLowerCase().includes(q) ||
        actor.nickname.toLowerCase().includes(q) ||
        actor.position.toLowerCase().includes(q) ||
        actor.registrationNumber.toLowerCase().includes(q) ||
        actor.townCity.toLowerCase().includes(q) ||
        actor.stateOfOrigin.toLowerCase().includes(q)
      );
    });
  }, [actors, memberFilter, searchQuery]);

  const selectedActor = useMemo(
    () => actors.find((a) => a.id === selectedActorId) || null,
    [actors, selectedActorId],
  );

  const handleQuickCopyLink = async (e: React.MouseEvent, actor: ActorRecord) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(buildProfileShareUrl(actor.registrationNumber));
      setCopiedId(actor.id);
      showToast(`Copied profile link for ${actor.fullName}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Copy blocked by browser permissions.');
    }
  };

  const handleQuickStatus = async (
    e: React.MouseEvent,
    actor: ActorRecord,
    nextStatus: 'active' | 'inactive',
  ) => {
    e.stopPropagation();
    try {
      await toggleActorStatus(actor, nextStatus);
      showToast(`${actor.fullName} marked as ${nextStatus}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'dashboard', label: isCEO ? 'CEO Dashboard' : 'Studio Home' },
    { id: 'videos', label: 'Videos' },
    ...(isCEO
      ? [
          { id: 'earnings' as AppTab, label: 'Earnings' },
          { id: 'messages' as AppTab, label: 'Messages' },
        ]
      : []),
    { id: 'portal', label: 'Actor Portal' },
    { id: 'settings', label: 'App Settings' },
  ];

  // Show CEO PIN Gate when Google-authenticated as CEO but PIN not unlocked yet
  const needsPinGate = isCeoGoogle && !isPinUnlocked && activeTab === 'dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-10">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Unity Film World
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeTab === item.id
                    ? 'text-slate-900 border-amber-600 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {isCEO ? (
              <button
                type="button"
                onClick={() => {
                  setEditingActor(null);
                  setIsFormOpen(true);
                }}
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register New Member</span>
              </button>
            ) : isCeoGoogle ? (
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Enter CEO PIN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleCEOSignIn()}
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>CEO Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {toastMsg && (
          <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {activeTab === 'dashboard' && (
          needsPinGate ? (
            <CeoPinGate
              pinConfig={pinConfig}
              isLoadingConfig={isLoadingPin}
              ceoEmail={authUser?.email || CEO_EMAIL}
              onUnlocked={(createdConfig) => {
                if (createdConfig) setPinConfig(createdConfig);
                setIsPinUnlocked(true);
                showToast('CEO Dashboard unlocked.');
              }}
              onSignOut={() => void handleSignOut()}
            />
          ) : (
            <div className="space-y-8">
              {/* Hero Welcome Banner */}
              <section className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                <img
                  src="/src/assets/images/studio_hero_banner_1795710463664.jpg"
                  alt="Unity Film World Production soundstage"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-45"
                />
                <div className="relative bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/50 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="max-w-2xl space-y-2.5">
                    <p className="text-xs font-semibold text-amber-400">
                      {isCEO
                        ? 'CEO Administration Dashboard'
                        : 'Official Talent & Production Studio'}
                    </p>
                    <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                      {settings.welcomeHeadline}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      {settings.motto}. Register and manage cast &amp; crew profiles, earn revenue from video watches, and message every actor.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {isCEO ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActor(null);
                            setIsFormOpen(true);
                          }}
                          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <UserPlus className="w-4 h-4" />
                          Register New Member
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('earnings')}
                          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Banknote className="w-4 h-4" />
                          Earnings
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPinUnlocked(false);
                            showToast('CEO Dashboard locked.');
                          }}
                          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-slate-200 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Lock className="w-4 h-4" />
                          Lock PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSignOut()}
                          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-slate-200 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab('portal')}
                          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <KeyRound className="w-4 h-4" />
                          Actor Profile Check
                        </button>
                        <PWAInstallButton />
                      </>
                    )}
                  </div>
                </div>
              </section>

              {!isCEO ? (
                <div className="space-y-6">
                  {authUser && !isCeoGoogle && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-sm text-amber-900">
                        Signed in as <strong>{authUser.email}</strong>. Only the studio CEO can edit or manage member profiles. Actors can view their own details using their Registration Number and Actor Password.
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer shrink-0"
                      >
                        Switch Account
                      </button>
                    </div>
                  )}

                  {authError && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
                      {authError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Actor Self-Check Portal
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Registered actors can enter their Registration Number and personal password to view their profile, status, and messages from the CEO.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('portal')}
                        className="min-h-[44px] w-full rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Open Actor Portal
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                          <Film className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Studio Videos &amp; Films
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Watch official films, behind-the-scenes clips, and production premieres posted by Unity Film World Production.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('videos')}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Watch Production Videos
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          CEO Administration
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Sign in as CEO and enter your CEO PIN / password to register actors, post monetized videos, and receive payments.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCEOSignIn()}
                        className="min-h-[44px] w-full rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        CEO Sign In
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CEO Dashboard View */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setMemberFilter('all')}
                      className={`p-5 rounded-2xl border text-left transition-colors cursor-pointer flex items-center justify-between ${
                        memberFilter === 'all'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span
                          className={`text-xs font-medium ${
                            memberFilter === 'all' ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          Total Members
                        </span>
                        <p className="text-3xl font-display font-bold mt-1 tabular-nums">
                          {totalMembersCount}
                        </p>
                      </div>
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          memberFilter === 'all'
                            ? 'bg-white/10 text-amber-400'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberFilter('active')}
                      className={`p-5 rounded-2xl border text-left transition-colors cursor-pointer flex items-center justify-between ${
                        memberFilter === 'active'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span
                          className={`text-xs font-medium ${
                            memberFilter === 'active' ? 'text-emerald-100' : 'text-slate-500'
                          }`}
                        >
                          Active Members
                        </span>
                        <p className="text-3xl font-display font-bold mt-1 tabular-nums">
                          {activeMembersCount}
                        </p>
                      </div>
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          memberFilter === 'active'
                            ? 'bg-white/15 text-white'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <UserCheck className="w-5 h-5" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberFilter('inactive')}
                      className={`p-5 rounded-2xl border text-left transition-colors cursor-pointer flex items-center justify-between ${
                        memberFilter === 'inactive'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span
                          className={`text-xs font-medium ${
                            memberFilter === 'inactive' ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          Inactive Members
                        </span>
                        <p className="text-3xl font-display font-bold mt-1 tabular-nums">
                          {inactiveMembersCount}
                        </p>
                      </div>
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          memberFilter === 'inactive'
                            ? 'bg-white/10 text-slate-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <UserX className="w-5 h-5" />
                      </div>
                    </button>
                  </div>

                  {/* Search Members Toolbar */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search members — Find crew by Role, Name, Reg Number, or State..."
                        className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingActor(null);
                          setIsFormOpen(true);
                        }}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                      >
                        <UserPlus className="w-4 h-4" />
                        Register New Member
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        <Settings className="w-4 h-4" />
                        App Settings
                      </button>
                      <PWAInstallButton />
                    </div>
                  </div>

                  {/* Members List / Roster */}
                  {isLoadingData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-5"
                        />
                      ))}
                    </div>
                  ) : filteredActors.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {actors.length === 0
                          ? 'No actors registered yet'
                          : 'No matching cast or crew members'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        {actors.length === 0
                          ? 'Register your first actor or crew member to generate their profile, shareable link, and login password.'
                          : 'Try clearing your search filter or switching between Total Members and Active Members.'}
                      </p>
                      {actors.length === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingActor(null);
                            setIsFormOpen(true);
                          }}
                          className="mt-5 min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          Register First Actor
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredActors.map((actor) => (
                        <article
                          key={actor.id}
                          onClick={() => setSelectedActorId(actor.id)}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {actor.photoUrl ? (
                                <img
                                  src={actor.photoUrl}
                                  alt={actor.fullName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-display font-bold text-slate-500">
                                  {getInitials(actor.fullName)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-bold text-slate-900 truncate">
                                {actor.fullName}
                              </h3>
                              <p className="text-xs font-medium text-amber-700 truncate mt-0.5">
                                {actor.position}
                                {actor.nickname ? ` · "${actor.nickname}"` : ''}
                              </p>
                              <p className="font-mono text-xs text-slate-500 mt-1 tabular-nums truncate">
                                {actor.registrationNumber} · {actor.phoneNumber}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {actor.townCity || '—'} · {actor.stateOfOrigin || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => void handleQuickStatus(e, actor, 'active')}
                                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  actor.status === 'active'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                onClick={(e) => void handleQuickStatus(e, actor, 'inactive')}
                                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  actor.status === 'inactive'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Inactive
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => void handleQuickCopyLink(e, actor)}
                                className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                title="Copy Profile Link"
                              >
                                {copiedId === actor.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Link2 className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedId === actor.id ? 'Copied' : 'Link'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessageTargetActorId(actor.id);
                                  setActiveTab('messages');
                                }}
                                className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                title="Message Actor"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'videos' && (
          <VideosPage videos={videos} isCEO={isCEO} settings={settings} />
        )}

        {activeTab === 'earnings' && isCEO && (
          <EarningsPage
            videos={videos}
            payments={videoPayments}
            views={videoViews}
            settings={settings}
            onGoToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'messages' && isCEO && (
          <MessagesPage
            actors={actors}
            messages={messages}
            preselectedActorId={messageTargetActorId}
          />
        )}

        {activeTab === 'portal' && (
          <ActorPortalPage
            initialRegNumber={initialMemberParam}
            settings={settings}
            onGoToVideos={() => setActiveTab('videos')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            isCEO={isCEO}
            pinConfig={pinConfig}
            onPinUpdated={(updated) => setPinConfig(updated)}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className={`grid h-16 items-center ${isCEO ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'dashboard' ? 'text-amber-700 font-semibold' : 'text-slate-500'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1">{isCEO ? 'CEO' : 'Home'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'videos' ? 'text-amber-700 font-semibold' : 'text-slate-500'
            }`}
          >
            <Film className="w-5 h-5" />
            <span className="text-[10px] mt-1">Videos</span>
          </button>

          {isCEO && (
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                activeTab === 'earnings' ? 'text-amber-700 font-semibold' : 'text-slate-500'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-[10px] mt-1">Earnings</span>
            </button>
          )}

          {isCEO && (
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`flex flex-col items-center justify-center h-full cursor-pointer ${
                activeTab === 'messages' ? 'text-amber-700 font-semibold' : 'text-slate-500'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] mt-1">Messages</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('portal')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'portal' ? 'text-amber-700 font-semibold' : 'text-slate-500'
            }`}
          >
            <KeyRound className="w-5 h-5" />
            <span className="text-[10px] mt-1">Portal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              activeTab === 'settings' ? 'text-amber-700 font-semibold' : 'text-slate-500'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1">Settings</span>
          </button>
        </div>
      </nav>

      {/* CEO Modals & Drawers */}
      {isCEO && (
        <>
          <ActorFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            existingActor={editingActor}
            suggestedRegNumber={suggestedRegNumber}
            autoWelcomeMessage={settings.autoWelcomeMessage}
            onSaved={(actorId, isNew, fullName) => {
              setSelectedActorId(actorId);
              showToast(
                isNew
                  ? `${fullName} registered & welcome message sent!`
                  : `${fullName}'s profile updated.`,
              );
            }}
          />

          <ActorProfileDrawer
            actor={selectedActor}
            onClose={() => setSelectedActorId(null)}
            onEdit={(actor) => {
              setEditingActor(actor);
              setIsFormOpen(true);
            }}
            onMessage={(actor) => {
              setSelectedActorId(null);
              setMessageTargetActorId(actor.id);
              setActiveTab('messages');
            }}
            onDeleted={(actorName) => {
              showToast(`${actorName} removed from registry.`);
            }}
          />
        </>
      )}

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudioApp />
    </ErrorBoundary>
  );
}
