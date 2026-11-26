import type { Timestamp } from 'firebase/firestore';

export type MemberStatus = 'active' | 'inactive';
export type MemberFilter = 'all' | 'active' | 'inactive';
export type AppTab = 'dashboard' | 'videos' | 'earnings' | 'messages' | 'portal' | 'settings';
export type PaymentStatus = 'pending_verification' | 'confirmed' | 'rejected';

export interface PortalMessageItem {
  id: string;
  subject: string;
  body: string;
  isWelcomeMessage: boolean;
  senderEmail: string;
  sentAtIso: string;
}

export interface ActorRecord {
  id: string;
  fullName: string;
  nickname: string;
  dateOfBirth: string;
  registrationNumber: string;
  dateOfRegister: string;
  phoneNumber: string;
  position: string;
  townCity: string;
  homeAddress: string;
  stateOfOrigin: string;
  lga: string;
  photoUrl: string;
  status: MemberStatus;
  portalHash: string;
  accessPassword: string;
  welcomeMessage: string;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ActorPortalRecord {
  actorId: string;
  portalHash: string;
  fullName: string;
  nickname: string;
  dateOfBirth: string;
  registrationNumber: string;
  dateOfRegister: string;
  phoneNumber: string;
  position: string;
  townCity: string;
  homeAddress: string;
  stateOfOrigin: string;
  lga: string;
  photoUrl: string;
  status: MemberStatus;
  welcomeMessage: string;
  messages: PortalMessageItem[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StudioMessage {
  id: string;
  actorId: string;
  actorName: string;
  registrationNumber: string;
  subject: string;
  body: string;
  isWelcomeMessage: boolean;
  senderEmail: string;
  createdAt: Timestamp | null;
}

export interface StudioVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  category: string;
  durationLabel: string;
  isPublished: boolean;
  isPaid: boolean;
  priceAmount: number;
  currency: string;
  paymentLink: string;
  createdByUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StudioSettings {
  studioName: string;
  welcomeHeadline: string;
  motto: string;
  regPrefix: string;
  autoWelcomeMessage: string;
  productionRules: string;
  contactEmail: string;
  contactPhone: string;
  payoutBankName: string;
  payoutAccountNumber: string;
  payoutAccountName: string;
  paymentLink: string;
  defaultCurrency: string;
  defaultVideoPrice: number;
  perViewRate: number;
  updatedAt: Timestamp | null;
}

export interface CeoSecurityConfig {
  pinSalt: string;
  pinHash: string;
  updatedAt: Timestamp | null;
}

export interface VideoPaymentRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  viewerName: string;
  viewerContact: string;
  paymentMethod: string;
  paymentReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Timestamp | null;
}

export interface VideoViewRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  earnedAmount: number;
  currency: string;
  createdAt: Timestamp | null;
}

export const DEFAULT_AUTO_WELCOME_MESSAGE =
  'registration successful you are welcome to unity film world production home of entertainment and building the future.';

export const DEFAULT_STUDIO_SETTINGS: Omit<StudioSettings, 'updatedAt'> = {
  studioName: 'Unity Film World Production',
  welcomeHeadline: 'Welcome to Unity Film World Production',
  motto: 'Home of Entertainment and Building the Future',
  regPrefix: 'UFW-2026-',
  autoWelcomeMessage: DEFAULT_AUTO_WELCOME_MESSAGE,
  productionRules:
    '1. All cast and crew must arrive punctually on set and attend scheduled rehearsals.\n2. Respect directors, fellow actors, equipment, and studio property at all times.\n3. Maintain confidentiality regarding unreleased scripts and production schedules.\n4. Violation of studio conduct or production discipline may result in suspension or permanent profile removal by the CEO.',
  contactEmail: 'smartgbanador882@gmail.com',
  contactPhone: '+234 800 000 0000',
  payoutBankName: '',
  payoutAccountNumber: '',
  payoutAccountName: 'Unity Film World Production',
  paymentLink: '',
  defaultCurrency: 'NGN',
  defaultVideoPrice: 500,
  perViewRate: 10,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  GHS: '₵',
};

export function formatMoney(amount: number, currency = 'NGN'): string {
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${sym}${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: currency === 'NGN' ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const FIELD_LIMITS = {
  fullName: { min: 2, max: 120 },
  nickname: { max: 80 },
  dateOfBirth: { max: 20 },
  registrationNumber: { min: 2, max: 40 },
  dateOfRegister: { max: 20 },
  phoneNumber: { min: 5, max: 30 },
  position: { min: 2, max: 100 },
  townCity: { max: 100 },
  homeAddress: { max: 240 },
  stateOfOrigin: { max: 80 },
  lga: { max: 80 },
  photoUrl: { max: 400000 },
  accessPassword: { min: 4, max: 64 },
  welcomeMessage: { max: 300 },
  messageSubject: { min: 1, max: 140 },
  messageBody: { min: 1, max: 2000 },
  videoTitle: { min: 2, max: 140 },
  videoDescription: { max: 1000 },
  videoUrl: { min: 5, max: 1000 },
} as const;
