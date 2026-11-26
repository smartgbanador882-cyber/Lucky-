import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ActorPortalRecord,
  ActorRecord,
  CeoSecurityConfig,
  DEFAULT_AUTO_WELCOME_MESSAGE,
  FIELD_LIMITS,
  MemberStatus,
  PaymentStatus,
  PortalMessageItem,
  StudioSettings,
  StudioVideo,
} from '../types';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { computePortalHash, generateSecureId } from './utils';

export interface ActorFormInput {
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
  accessPassword: string;
}

function clampStr(value: string, max: number): string {
  return value.trim().slice(0, max);
}

async function hashCeoPin(salt: string, pinOrPassword: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pinOrPassword.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setCeoPinOrPassword(pinOrPassword: string): Promise<CeoSecurityConfig> {
  const trimmed = pinOrPassword.trim();
  if (trimmed.length < 4 || trimmed.length > 64) {
    throw new Error('CEO PIN or password must be between 4 and 64 characters.');
  }
  const pinSalt = generateSalt();
  const pinHash = await hashCeoPin(pinSalt, trimmed);
  const path = 'ceoSecurity/pinConfig';

  try {
    await setDoc(doc(db, 'ceoSecurity', 'pinConfig'), {
      pinSalt,
      pinHash,
      updatedAt: serverTimestamp(),
    });
    return { pinSalt, pinHash, updatedAt: null };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function verifyCeoPinOrPassword(
  config: CeoSecurityConfig,
  candidate: string,
): Promise<boolean> {
  const candidateHash = await hashCeoPin(config.pinSalt, candidate);
  return candidateHash === config.pinHash;
}

export function validateActorForm(input: ActorFormInput): string | null {
  if (input.fullName.trim().length < FIELD_LIMITS.fullName.min) {
    return 'Full name must be at least 2 characters.';
  }
  if (input.registrationNumber.trim().length < FIELD_LIMITS.registrationNumber.min) {
    return 'Registration number must be at least 2 characters.';
  }
  if (input.phoneNumber.trim().length < FIELD_LIMITS.phoneNumber.min) {
    return 'Phone number must be at least 5 characters.';
  }
  if (input.position.trim().length < FIELD_LIMITS.position.min) {
    return 'Please specify the position in the production.';
  }
  if (input.accessPassword.trim().length < FIELD_LIMITS.accessPassword.min) {
    return 'Actor access password must be at least 4 characters.';
  }
  if (input.photoUrl.length > FIELD_LIMITS.photoUrl.max) {
    return 'Uploaded photo is too large. Please choose a smaller image.';
  }
  return null;
}

export async function saveActorProfile(
  input: ActorFormInput,
  existingActor: ActorRecord | null,
  autoWelcomeBody: string = DEFAULT_AUTO_WELCOME_MESSAGE,
): Promise<{ actorId: string; isNew: boolean }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('CEO sign-in is required to save actor records.');
  }

  const validationError = validateActorForm(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const actorId = existingActor ? existingActor.id : generateSecureId('actor');
  const regNumber = clampStr(input.registrationNumber, FIELD_LIMITS.registrationNumber.max);
  const password = clampStr(input.accessPassword, FIELD_LIMITS.accessPassword.max);
  const newPortalHash = await computePortalHash(regNumber, password);
  const welcomeBanner = 'Welcome to Unity Film World Production';

  const sanitizedFields = {
    fullName: clampStr(input.fullName, FIELD_LIMITS.fullName.max),
    nickname: clampStr(input.nickname, FIELD_LIMITS.nickname.max),
    dateOfBirth: clampStr(input.dateOfBirth, FIELD_LIMITS.dateOfBirth.max),
    registrationNumber: regNumber,
    dateOfRegister: clampStr(input.dateOfRegister, FIELD_LIMITS.dateOfRegister.max),
    phoneNumber: clampStr(input.phoneNumber, FIELD_LIMITS.phoneNumber.max),
    position: clampStr(input.position, FIELD_LIMITS.position.max),
    townCity: clampStr(input.townCity, FIELD_LIMITS.townCity.max),
    homeAddress: clampStr(input.homeAddress, FIELD_LIMITS.homeAddress.max),
    stateOfOrigin: clampStr(input.stateOfOrigin, FIELD_LIMITS.stateOfOrigin.max),
    lga: clampStr(input.lga, FIELD_LIMITS.lga.max),
    photoUrl: input.photoUrl.slice(0, FIELD_LIMITS.photoUrl.max),
    status: input.status,
    portalHash: newPortalHash,
    accessPassword: password,
    welcomeMessage: welcomeBanner,
  };

  const batch = writeBatch(db);
  const actorRef = doc(db, 'actors', actorId);

  if (!existingActor) {
    const welcomeMsgId = generateSecureId('msg');
    const welcomeBody = clampStr(
      autoWelcomeBody || DEFAULT_AUTO_WELCOME_MESSAGE,
      FIELD_LIMITS.messageBody.max,
    );
    const senderEmail = clampStr(user.email || 'ceo@unityfilmworld.com', 120);

    batch.set(actorRef, {
      id: actorId,
      ...sanitizedFields,
      createdByUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const msgRef = doc(db, 'messages', welcomeMsgId);
    batch.set(msgRef, {
      id: welcomeMsgId,
      actorId,
      actorName: sanitizedFields.fullName,
      registrationNumber: sanitizedFields.registrationNumber,
      subject: 'Welcome to Unity Film World Production',
      body: welcomeBody,
      isWelcomeMessage: true,
      senderEmail,
      createdAt: serverTimestamp(),
    });

    const initialPortalMessages: PortalMessageItem[] = [
      {
        id: welcomeMsgId,
        subject: 'Welcome to Unity Film World Production',
        body: welcomeBody,
        isWelcomeMessage: true,
        senderEmail,
        sentAtIso: new Date().toISOString(),
      },
    ];

    const portalRef = doc(db, 'actorPortals', newPortalHash);
    batch.set(portalRef, {
      actorId,
      portalHash: newPortalHash,
      fullName: sanitizedFields.fullName,
      nickname: sanitizedFields.nickname,
      dateOfBirth: sanitizedFields.dateOfBirth,
      registrationNumber: sanitizedFields.registrationNumber,
      dateOfRegister: sanitizedFields.dateOfRegister,
      phoneNumber: sanitizedFields.phoneNumber,
      position: sanitizedFields.position,
      townCity: sanitizedFields.townCity,
      homeAddress: sanitizedFields.homeAddress,
      stateOfOrigin: sanitizedFields.stateOfOrigin,
      lga: sanitizedFields.lga,
      photoUrl: sanitizedFields.photoUrl,
      status: sanitizedFields.status,
      welcomeMessage: welcomeBanner,
      messages: initialPortalMessages,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      return { actorId, isNew: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `actors/${actorId}`);
    }
  } else {
    let existingMessages: PortalMessageItem[] = [];
    let oldPortalExists = false;

    try {
      const oldPortalSnap = await getDoc(doc(db, 'actorPortals', existingActor.portalHash));
      if (oldPortalSnap.exists()) {
        oldPortalExists = true;
        const data = oldPortalSnap.data() as ActorPortalRecord;
        if (Array.isArray(data.messages)) {
          existingMessages = data.messages.slice(0, 50);
        }
      }
    } catch {
      // Proceed
    }

    batch.update(actorRef, {
      ...sanitizedFields,
      updatedAt: serverTimestamp(),
    });

    const newPortalRef = doc(db, 'actorPortals', newPortalHash);
    const portalPayload = {
      portalHash: newPortalHash,
      fullName: sanitizedFields.fullName,
      nickname: sanitizedFields.nickname,
      dateOfBirth: sanitizedFields.dateOfBirth,
      registrationNumber: sanitizedFields.registrationNumber,
      dateOfRegister: sanitizedFields.dateOfRegister,
      phoneNumber: sanitizedFields.phoneNumber,
      position: sanitizedFields.position,
      townCity: sanitizedFields.townCity,
      homeAddress: sanitizedFields.homeAddress,
      stateOfOrigin: sanitizedFields.stateOfOrigin,
      lga: sanitizedFields.lga,
      photoUrl: sanitizedFields.photoUrl,
      status: sanitizedFields.status,
      welcomeMessage: welcomeBanner,
      messages: existingMessages,
      updatedAt: serverTimestamp(),
    };

    if (oldPortalExists && existingActor.portalHash === newPortalHash) {
      batch.update(newPortalRef, portalPayload);
    } else {
      if (oldPortalExists) {
        batch.delete(doc(db, 'actorPortals', existingActor.portalHash));
      }
      batch.set(newPortalRef, {
        actorId,
        ...portalPayload,
        createdAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      return { actorId, isNew: false };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `actors/${actorId}`);
    }
  }
}

export async function toggleActorStatus(
  actor: ActorRecord,
  nextStatus: MemberStatus,
): Promise<void> {
  if (actor.status === nextStatus) return;
  const batch = writeBatch(db);
  batch.update(doc(db, 'actors', actor.id), {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  const portalRef = doc(db, 'actorPortals', actor.portalHash);
  try {
    const portalSnap = await getDoc(portalRef);
    if (portalSnap.exists()) {
      batch.update(portalRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `actors/${actor.id}`);
  }
}

export async function deleteActorForViolation(actor: ActorRecord): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'actors', actor.id));
  batch.delete(doc(db, 'actorPortals', actor.portalHash));

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `actors/${actor.id}`);
  }
}

export async function sendMessageToActor(
  actor: ActorRecord,
  subject: string,
  body: string,
  isWelcomeMessage = false,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('CEO sign-in is required to send messages.');
  }

  const cleanSubject = clampStr(subject, FIELD_LIMITS.messageSubject.max);
  const cleanBody = clampStr(body, FIELD_LIMITS.messageBody.max);
  if (!cleanSubject || !cleanBody) {
    throw new Error('Subject and message body are required.');
  }

  const msgId = generateSecureId('msg');
  const senderEmail = clampStr(user.email || 'ceo@unityfilmworld.com', 120);

  const batch = writeBatch(db);
  batch.set(doc(db, 'messages', msgId), {
    id: msgId,
    actorId: actor.id,
    actorName: actor.fullName,
    registrationNumber: actor.registrationNumber,
    subject: cleanSubject,
    body: cleanBody,
    isWelcomeMessage,
    senderEmail,
    createdAt: serverTimestamp(),
  });

  const portalRef = doc(db, 'actorPortals', actor.portalHash);
  try {
    const portalSnap = await getDoc(portalRef);
    const newItem: PortalMessageItem = {
      id: msgId,
      subject: cleanSubject,
      body: cleanBody,
      isWelcomeMessage,
      senderEmail,
      sentAtIso: new Date().toISOString(),
    };

    if (portalSnap.exists()) {
      const portalData = portalSnap.data() as ActorPortalRecord;
      const updatedMessages = [newItem, ...(portalData.messages || [])].slice(0, 50);
      batch.update(portalRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(portalRef, {
        actorId: actor.id,
        portalHash: actor.portalHash,
        fullName: actor.fullName,
        nickname: actor.nickname,
        dateOfBirth: actor.dateOfBirth,
        registrationNumber: actor.registrationNumber,
        dateOfRegister: actor.dateOfRegister,
        phoneNumber: actor.phoneNumber,
        position: actor.position,
        townCity: actor.townCity,
        homeAddress: actor.homeAddress,
        stateOfOrigin: actor.stateOfOrigin,
        lga: actor.lga,
        photoUrl: actor.photoUrl,
        status: actor.status,
        welcomeMessage: actor.welcomeMessage,
        messages: [newItem],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `messages/${msgId}`);
  }
}

export async function lookupActorPortal(
  registrationNumber: string,
  password: string,
): Promise<ActorPortalRecord | null> {
  const portalHash = await computePortalHash(registrationNumber, password);
  const path = `actorPortals/${portalHash}`;
  try {
    const snap = await getDoc(doc(db, 'actorPortals', portalHash));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as ActorPortalRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface VideoFormInput {
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
}

export async function saveVideoPost(
  input: VideoFormInput,
  existingVideo: StudioVideo | null,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('CEO sign-in is required to post videos.');
  }

  const cleanTitle = clampStr(input.title, FIELD_LIMITS.videoTitle.max);
  const cleanUrl = clampStr(input.videoUrl, FIELD_LIMITS.videoUrl.max);
  if (cleanTitle.length < 2) {
    throw new Error('Video title must be at least 2 characters.');
  }
  if (cleanUrl.length < 5) {
    throw new Error('Please enter a valid video URL (YouTube, Vimeo, or MP4).');
  }

  const videoId = existingVideo ? existingVideo.id : generateSecureId('vid');
  const videoRef = doc(collection(db, 'videos'), videoId);

  const normalizedPrice = input.isPaid
    ? Math.max(0, Math.min(10000000, Number(input.priceAmount) || 0))
    : 0;

  const payload = {
    title: cleanTitle,
    description: clampStr(input.description, FIELD_LIMITS.videoDescription.max),
    videoUrl: cleanUrl,
    thumbnailUrl: input.thumbnailUrl.slice(0, FIELD_LIMITS.photoUrl.max),
    category: clampStr(input.category || 'Production Reel', 60),
    durationLabel: clampStr(input.durationLabel || 'HD', 20),
    isPublished: input.isPublished,
    isPaid: Boolean(input.isPaid && normalizedPrice > 0),
    priceAmount: normalizedPrice,
    currency: clampStr(input.currency || 'NGN', 10),
    paymentLink: clampStr(input.paymentLink || '', 500),
  };

  try {
    if (!existingVideo) {
      await setDoc(videoRef, {
        id: videoId,
        ...payload,
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(videoRef, {
        id: existingVideo.id,
        ...payload,
        createdByUid: existingVideo.createdByUid,
        createdAt: existingVideo.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return videoId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingVideo ? OperationType.UPDATE : OperationType.CREATE,
      `videos/${videoId}`,
    );
  }
}

export async function deleteVideoPost(videoId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `videos/${videoId}`);
  }
}

export interface VideoPaymentSubmission {
  video: StudioVideo;
  viewerName: string;
  viewerContact: string;
  paymentMethod: string;
  paymentReference: string;
}

export async function submitVideoPayment(input: VideoPaymentSubmission): Promise<string> {
  const paymentId = generateSecureId('pay');
  const cleanName = clampStr(input.viewerName, 100);
  const cleanContact = clampStr(input.viewerContact, 120);
  const cleanMethod = clampStr(input.paymentMethod || 'Bank Transfer', 60);
  const cleanRef = clampStr(input.paymentReference, 100);

  if (cleanName.length < 2) {
    throw new Error('Please enter your full name.');
  }
  if (cleanContact.length < 3) {
    throw new Error('Please enter your phone number or email.');
  }
  if (cleanRef.length < 3) {
    throw new Error('Please enter your payment transfer reference or receipt ID.');
  }

  try {
    await setDoc(doc(db, 'videoPayments', paymentId), {
      id: paymentId,
      videoId: input.video.id,
      videoTitle: clampStr(input.video.title, 140),
      viewerName: cleanName,
      viewerContact: cleanContact,
      paymentMethod: cleanMethod,
      paymentReference: cleanRef,
      amount: Number(input.video.priceAmount),
      currency: clampStr(input.video.currency || 'NGN', 10),
      status: 'pending_verification',
      createdAt: serverTimestamp(),
    });
    return paymentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `videoPayments/${paymentId}`);
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'videoPayments', paymentId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `videoPayments/${paymentId}`);
  }
}

export async function recordVideoView(
  video: StudioVideo,
  perViewRate: number,
  currency: string,
): Promise<void> {
  const viewId = generateSecureId('view');
  const earned = Math.max(0, Math.min(100000, Number(perViewRate) || 0));
  try {
    await setDoc(doc(db, 'videoViews', viewId), {
      id: viewId,
      videoId: video.id,
      videoTitle: clampStr(video.title, 140),
      earnedAmount: earned,
      currency: clampStr(currency || 'NGN', 10),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking telemetry log
    console.warn('View log notice:', error);
  }
}

export async function saveStudioSettings(
  settings: Omit<StudioSettings, 'updatedAt'>,
): Promise<void> {
  const path = 'settings/studio';
  try {
    await setDoc(doc(db, 'settings', 'studio'), {
      studioName: clampStr(settings.studioName, 120),
      welcomeHeadline: clampStr(settings.welcomeHeadline, 200),
      motto: clampStr(settings.motto, 200),
      regPrefix: clampStr(settings.regPrefix, 20),
      autoWelcomeMessage: clampStr(settings.autoWelcomeMessage, 500),
      productionRules: clampStr(settings.productionRules, 3000),
      contactEmail: clampStr(settings.contactEmail, 120),
      contactPhone: clampStr(settings.contactPhone, 40),
      payoutBankName: clampStr(settings.payoutBankName || '', 120),
      payoutAccountNumber: clampStr(settings.payoutAccountNumber || '', 60),
      payoutAccountName: clampStr(settings.payoutAccountName || '', 120),
      paymentLink: clampStr(settings.paymentLink || '', 500),
      defaultCurrency: clampStr(settings.defaultCurrency || 'NGN', 10),
      defaultVideoPrice: Math.max(0, Math.min(10000000, Number(settings.defaultVideoPrice) || 0)),
      perViewRate: Math.max(0, Math.min(100000, Number(settings.perViewRate) || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
