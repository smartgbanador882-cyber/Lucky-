import React, { useState } from 'react';
import {
  Banknote,
  Camera,
  Check,
  Copy,
  ExternalLink,
  Film,
  Lock,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  CURRENCY_SYMBOLS,
  FIELD_LIMITS,
  formatMoney,
  StudioSettings,
  StudioVideo,
} from '../types';
import {
  deleteVideoPost,
  recordVideoView,
  saveVideoPost,
  submitVideoPayment,
  VideoFormInput,
} from '../lib/studioService';
import { compressImageToDataUrl, parseVideoEmbed, sanitizeHttpUrl } from '../lib/utils';

interface VideosPageProps {
  videos: StudioVideo[];
  isCEO: boolean;
  settings: Omit<StudioSettings, 'updatedAt'>;
}

const VIDEO_CATEGORIES = [
  'All Videos',
  'Feature Film',
  'Behind the Scenes',
  'Audition Reel',
  'Studio Promo',
  'Training',
];

const FALLBACK_COVERS = [
  '/src/assets/images/video_reel_cover_1_1795710464924.jpg',
  '/src/assets/images/video_reel_cover_2_1795710464586.jpg',
];

export const VideosPage: React.FC<VideosPageProps> = ({ videos, isCEO, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState('All Videos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<StudioVideo | null>(null);
  const [paywallVideo, setPaywallVideo] = useState<StudioVideo | null>(null);
  const [unlockedVideoIds, setUnlockedVideoIds] = useState<string[]>([]);

  // Paywall Checkout Form
  const [viewerName, setViewerName] = useState('');
  const [viewerContact, setViewerContact] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [payError, setPayError] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // CEO Post/Edit Modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<StudioVideo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingThumb, setIsCompressingThumb] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState<VideoFormInput>({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    category: 'Feature Film',
    durationLabel: 'HD',
    isPublished: true,
    isPaid: false,
    priceAmount: settings.defaultVideoPrice || 500,
    currency: settings.defaultCurrency || 'NGN',
    paymentLink: '',
  });

  const openNewModal = () => {
    setEditingVideo(null);
    setErrorMsg('');
    setForm({
      title: '',
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      category: 'Feature Film',
      durationLabel: 'HD',
      isPublished: true,
      isPaid: false,
      priceAmount: settings.defaultVideoPrice || 500,
      currency: settings.defaultCurrency || 'NGN',
      paymentLink: '',
    });
    setIsPostModalOpen(true);
  };

  const openEditModal = (video: StudioVideo) => {
    setEditingVideo(video);
    setErrorMsg('');
    setForm({
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      category: video.category,
      durationLabel: video.durationLabel,
      isPublished: video.isPublished,
      isPaid: Boolean(video.isPaid),
      priceAmount: Number(video.priceAmount || settings.defaultVideoPrice || 0),
      currency: video.currency || settings.defaultCurrency || 'NGN',
      paymentLink: video.paymentLink || '',
    });
    setIsPostModalOpen(true);
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingThumb(true);
    try {
      const compressed = await compressImageToDataUrl(file, 640, 0.8);
      setForm((prev) => ({ ...prev, thumbnailUrl: compressed }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process thumbnail image.');
    } finally {
      setIsCompressingThumb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);
    try {
      const parsed = parseVideoEmbed(form.videoUrl);
      const thumb = form.thumbnailUrl || parsed.autoThumbnail || '';
      await saveVideoPost({ ...form, thumbnailUrl: thumb }, editingVideo);
      setIsPostModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save video.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (video: StudioVideo) => {
    try {
      await deleteVideoPost(video.id);
      if (activeVideo?.id === video.id) {
        setActiveVideo(null);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete video.');
    }
  };

  const handleWatchClick = (video: StudioVideo) => {
    const needsPayment = Boolean(video.isPaid && video.priceAmount > 0);
    const alreadyUnlocked = unlockedVideoIds.includes(video.id);

    if (isCEO || !needsPayment || alreadyUnlocked) {
      setActiveVideo(video);
      if (!isCEO) {
        void recordVideoView(
          video,
          settings.perViewRate || 0,
          video.currency || settings.defaultCurrency || 'NGN',
        );
      }
    } else {
      setPayError('');
      setPaywallVideo(video);
    }
  };

  const handlePaywallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paywallVideo) return;
    setPayError('');
    setIsSubmittingPay(true);
    try {
      await submitVideoPayment({
        video: paywallVideo,
        viewerName,
        viewerContact,
        paymentMethod,
        paymentReference,
      });
      setUnlockedVideoIds((prev) => [...prev, paywallVideo.id]);
      const target = paywallVideo;
      setPaywallVideo(null);
      setViewerName('');
      setViewerContact('');
      setPaymentReference('');
      setActiveVideo(target);
      void recordVideoView(
        target,
        settings.perViewRate || 0,
        target.currency || settings.defaultCurrency || 'NGN',
      );
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Unable to submit payment receipt.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleCopyAccountNumber = async () => {
    if (!settings.payoutAccountNumber) return;
    try {
      await navigator.clipboard.writeText(settings.payoutAccountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const visibleVideos = videos.filter((v) => {
    if (!isCEO && !v.isPublished) return false;
    const matchesCat = selectedCategory === 'All Videos' || v.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      v.title.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const activeParsed = activeVideo ? parseVideoEmbed(activeVideo.videoUrl) : null;
  const activeCheckoutUrl = paywallVideo
    ? sanitizeHttpUrl(paywallVideo.paymentLink || settings.paymentLink || '')
    : null;

  return (
    <div className="space-y-6">
      {/* Studio Video Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Video Showcase</h1>
          <p className="text-sm text-slate-600 mt-1">
            Official films, trailers, and behind-the-scenes reels from Unity Film World Production.
          </p>
        </div>
        {isCEO && (
          <button
            type="button"
            onClick={openNewModal}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Post Video
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search studio videos..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Video Grid */}
      {visibleVideos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No production videos posted yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {isCEO
              ? 'Post free or paid pay-per-view videos to earn revenue whenever viewers watch on the app.'
              : 'Studio trailers and films posted by the CEO will appear here.'}
          </p>
          {isCEO && (
            <button
              type="button"
              onClick={openNewModal}
              className="mt-5 min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Post First Video
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleVideos.map((video, idx) => {
            const coverSrc = video.thumbnailUrl || FALLBACK_COVERS[idx % FALLBACK_COVERS.length];
            const isPaidVideo = Boolean(video.isPaid && video.priceAmount > 0);
            const unlocked = isCEO || !isPaidVideo || unlockedVideoIds.includes(video.id);

            return (
              <article
                key={video.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
              >
                <div
                  onClick={() => handleWatchClick(video)}
                  className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer group"
                >
                  <img
                    src={coverSrc}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/95 text-slate-950 flex items-center justify-center shadow-lg">
                      {unlocked ? (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/95 font-medium">
                    <span>{video.category}</span>
                    <span className="font-mono tabular-nums">
                      {isPaidVideo
                        ? formatMoney(video.priceAmount, video.currency || settings.defaultCurrency)
                        : video.durationLabel || 'HD'}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3
                      onClick={() => handleWatchClick(video)}
                      className="text-base font-semibold text-slate-900 hover:text-amber-700 cursor-pointer line-clamp-2"
                    >
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                    <p className="text-xs font-medium text-slate-500 mt-2">
                      {isPaidVideo
                        ? `Pay-Per-View · ${formatMoney(video.priceAmount, video.currency || settings.defaultCurrency)}`
                        : 'Free Watch'}
                      {!video.isPublished && isCEO ? ' · Draft' : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleWatchClick(video)}
                      className="min-h-[38px] inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-amber-700 cursor-pointer"
                    >
                      {unlocked ? (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Watch Video
                        </>
                      ) : (
                        <>
                          <Banknote className="w-3.5 h-3.5 text-amber-600" />
                          Pay {formatMoney(video.priceAmount, video.currency || settings.defaultCurrency)} to Watch
                        </>
                      )}
                    </button>
                    {isCEO && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(video)}
                          className="min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(video)}
                          className="min-h-[38px] px-2.5 py-1 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
                          aria-label={`Delete ${video.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pay-to-Watch Checkout Modal */}
      {paywallVideo && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/75 backdrop-blur-sm md:p-6">
          <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-400">
                  Unity Film World Production · Watch Access
                </p>
                <h3 className="text-base font-semibold truncate">{paywallVideo.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaywallVideo(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
                aria-label="Close payment window"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handlePaywallSubmit}
              className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
            >
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-amber-900">Video Ticket Fee</p>
                  <p className="text-xs text-amber-800">Paid directly to CEO production account</p>
                </div>
                <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {formatMoney(
                    paywallVideo.priceAmount,
                    paywallVideo.currency || settings.defaultCurrency,
                  )}
                </span>
              </div>

              {/* CEO Bank / Payout Details */}
              {(settings.payoutBankName || settings.payoutAccountNumber) && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-900">
                    Transfer to CEO Account
                  </p>
                  <div className="text-xs text-slate-700 space-y-1">
                    {settings.payoutBankName && (
                      <p>
                        Bank: <strong>{settings.payoutBankName}</strong>
                      </p>
                    )}
                    {settings.payoutAccountName && (
                      <p>
                        Account Name: <strong>{settings.payoutAccountName}</strong>
                      </p>
                    )}
                    {settings.payoutAccountNumber && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {settings.payoutAccountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleCopyAccountNumber()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          {copiedAccount ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedAccount ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeCheckoutUrl && (
                <a
                  href={activeCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Pay Online via CEO Checkout Link
                </a>
              )}

              {payError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {payError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={viewerName}
                    onChange={(e) => setViewerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone or Email *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={viewerContact}
                    onChange={(e) => setViewerContact(e.target.value)}
                    placeholder="+234... or email"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online Card Checkout">Online Card Checkout</option>
                    <option value="Mobile Money">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Reference / Receipt ID *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. TXN-902145"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPay}
                className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {isSubmittingPay ? 'Recording Payment...' : 'Submit Receipt & Watch Video'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideo && activeParsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800">
              <div className="min-w-0">
                <p className="text-xs text-amber-400 font-medium">{activeVideo.category}</p>
                <h3 className="text-base font-semibold text-white truncate">{activeVideo.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close video player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              {activeParsed.type === 'youtube' || activeParsed.type === 'vimeo' ? (
                <iframe
                  src={activeParsed.embedUrl}
                  title={activeVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeParsed.type === 'direct' ? (
                <video src={activeParsed.embedUrl} controls autoPlay className="w-full h-full" />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <p className="text-sm text-slate-300">
                    This video is hosted externally. Open it directly in a new view:
                  </p>
                  {activeParsed.embedUrl && (
                    <a
                      href={activeParsed.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Video Link
                    </a>
                  )}
                </div>
              )}
            </div>

            {activeVideo.description && (
              <div className="p-5 text-sm text-slate-300 leading-relaxed">
                {activeVideo.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post / Edit Video Modal (CEO Only) */}
      {isPostModalOpen && isCEO && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/70 backdrop-blur-sm md:p-6">
          <div className="w-full max-w-xl bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingVideo ? 'Edit Production Video' : 'Post New Production Video'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={FIELD_LIMITS.videoTitle.max}
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Unity Film World Feature Premiere"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Video Link (YouTube, Vimeo, or MP4 URL) *
                </label>
                <input
                  type="url"
                  required
                  maxLength={FIELD_LIMITS.videoUrl.max}
                  value={form.videoUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {VIDEO_CATEGORIES.filter((c) => c !== 'All Videos').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Duration / Quality
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={form.durationLabel}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, durationLabel: e.target.value }))
                    }
                    placeholder="e.g. 03:45 · 4K"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Video Monetization Box */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      CEO Video Monetization
                    </p>
                    <p className="text-xs text-slate-600">
                      Charge viewers a ticket price before watching, or leave free to earn per-view rate.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={form.isPaid}
                      onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-slate-900">Paid Video</span>
                  </label>
                </div>

                {form.isPaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={form.currency}
                        onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
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
                        Ticket Price
                      </label>
                      <input
                        type="number"
                        min={1}
                        step="any"
                        required
                        value={form.priceAmount}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, priceAmount: Number(e.target.value) }))
                        }
                        className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Checkout Link (Opt.)
                      </label>
                      <input
                        type="url"
                        maxLength={500}
                        value={form.paymentLink}
                        onChange={(e) => setForm((p) => ({ ...p, paymentLink: e.target.value }))}
                        placeholder="https://paystack.com/..."
                        className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={FIELD_LIMITS.videoDescription.max}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the film, featured cast, or production notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Custom Thumbnail (Optional)</p>
                  <p className="text-xs text-slate-500">
                    Auto-uses YouTube cover or studio photography if left blank.
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                  {isCompressingThumb ? 'Processing...' : form.thumbnailUrl ? 'Change' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isPublished: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  Publish immediately for cast, crew, and viewers
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isCompressingThumb}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Publishing...' : editingVideo ? 'Save Video' : 'Post Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
