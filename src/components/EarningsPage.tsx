import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Check,
  Clock,
  Eye,
  Film,
  Settings,
  X,
} from 'lucide-react';
import {
  formatMoney,
  PaymentStatus,
  StudioSettings,
  StudioVideo,
  VideoPaymentRecord,
  VideoViewRecord,
} from '../types';
import { updatePaymentStatus } from '../lib/studioService';

interface EarningsPageProps {
  videos: StudioVideo[];
  payments: VideoPaymentRecord[];
  views: VideoViewRecord[];
  settings: Omit<StudioSettings, 'updatedAt'>;
  onGoToSettings: () => void;
}

export const EarningsPage: React.FC<EarningsPageProps> = ({
  videos,
  payments,
  views,
  settings,
  onGoToSettings,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const currency = settings.defaultCurrency || 'NGN';

  const confirmedRevenue = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );

  const pendingRevenue = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'pending_verification')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );

  const viewEarnings = useMemo(
    () => views.reduce((sum, v) => sum + Number(v.earnedAmount || 0), 0),
    [views],
  );

  const perVideoStats = useMemo(() => {
    return videos.map((video) => {
      const videoViews = views.filter((v) => v.videoId === video.id);
      const videoPayments = payments.filter((p) => p.videoId === video.id);
      const confirmed = videoPayments
        .filter((p) => p.status === 'confirmed')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const pending = videoPayments
        .filter((p) => p.status === 'pending_verification')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const adEarned = videoViews.reduce((sum, v) => sum + Number(v.earnedAmount || 0), 0);

      return {
        video,
        viewCount: videoViews.length,
        paidCount: videoPayments.filter((p) => p.status !== 'rejected').length,
        confirmed,
        pending,
        adEarned,
      };
    });
  }, [videos, views, payments]);

  const filteredPayments = useMemo(() => {
    if (filterStatus === 'all') return payments;
    return payments.filter((p) => p.status === filterStatus);
  }, [payments, filterStatus]);

  const handleStatusChange = async (paymentId: string, status: PaymentStatus) => {
    setErrorMsg('');
    setUpdatingId(paymentId);
    try {
      await updatePaymentStatus(paymentId, status);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update payment status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const hasPayoutAccount = Boolean(
    settings.payoutBankName.trim() || settings.payoutAccountNumber.trim() || settings.paymentLink.trim(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CEO Earnings &amp; Video Payouts</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track viewer ticket payments, per-view revenue, and confirm transfers sent to your Unity Film World account.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToSettings}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer shrink-0"
        >
          <Settings className="w-4 h-4" />
          Payout Account Settings
        </button>
      </div>

      {!hasPayoutAccount && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-amber-900">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Add your CEO Payout Account:</strong> Enter your Bank Name, Account Number, or Online Payment Link in App Settings so viewers know where to send money when watching paid videos.
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToSettings}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer shrink-0"
          >
            Configure Payouts
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-300">Confirmed Ticket Revenue</span>
            <p className="text-2xl font-display font-bold mt-1 tabular-nums text-amber-400">
              {formatMoney(confirmedRevenue, currency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Pending Verification</span>
            <p className="text-2xl font-display font-bold mt-1 tabular-nums text-amber-700">
              {formatMoney(pendingRevenue, currency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Video Watches</span>
            <p className="text-2xl font-display font-bold mt-1 tabular-nums text-slate-900">
              {views.length.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Per-View Earnings</span>
            <p className="text-2xl font-display font-bold mt-1 tabular-nums text-emerald-700">
              {formatMoney(viewEarnings, currency)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Per-Video Revenue Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Revenue by Video</h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {videos.length} videos
          </span>
        </div>
        {perVideoStats.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Post videos on the Videos page to start earning from views and paid tickets.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                  <th className="py-3 px-5">Video Title</th>
                  <th className="py-3 px-4">Access</th>
                  <th className="py-3 px-4 text-right">Watches</th>
                  <th className="py-3 px-4 text-right">Paid Unlocks</th>
                  <th className="py-3 px-5 text-right">Total Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {perVideoStats.map(({ video, viewCount, paidCount, confirmed, pending, adEarned }) => (
                  <tr key={video.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-5 font-medium text-slate-900">{video.title}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {video.isPaid
                        ? `Paid (${formatMoney(video.priceAmount, video.currency || currency)})`
                        : 'Free + View Rate'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {viewCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {paidCount}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatMoney(confirmed + adEarned, video.currency || currency)}
                      {pending > 0 && (
                        <span className="block text-[11px] font-normal text-amber-700">
                          +{formatMoney(pending, video.currency || currency)} pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Viewer Payment Transactions Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Viewer Payment Receipts</h2>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'pending_verification', label: 'Pending' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'rejected', label: 'Rejected' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No viewer payment receipts recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPayments.map((p) => (
              <div
                key={p.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{p.viewerName}</h3>
                    <span className="text-xs text-slate-500">· {p.viewerContact}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Video: <strong>{p.videoTitle}</strong> · {p.paymentMethod} · Ref:{' '}
                    <span className="font-mono text-slate-800">{p.paymentReference}</span>
                  </p>
                  <p className="text-xs font-medium">
                    {p.status === 'confirmed' && (
                      <span className="text-emerald-700">Confirmed in CEO Balance</span>
                    )}
                    {p.status === 'pending_verification' && (
                      <span className="text-amber-700">Awaiting CEO Confirmation</span>
                    )}
                    {p.status === 'rejected' && (
                      <span className="text-red-700">Rejected / Unverified</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                    {formatMoney(p.amount, p.currency)}
                  </span>

                  {p.status !== 'confirmed' && (
                    <button
                      type="button"
                      disabled={updatingId === p.id}
                      onClick={() => void handleStatusChange(p.id, 'confirmed')}
                      className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirm
                    </button>
                  )}

                  {p.status === 'pending_verification' && (
                    <button
                      type="button"
                      disabled={updatingId === p.id}
                      onClick={() => void handleStatusChange(p.id, 'rejected')}
                      className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-60 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
