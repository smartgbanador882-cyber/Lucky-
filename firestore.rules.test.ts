/**
 * Security Rules Specification & Verification Matrix for Unity Film World Production
 * Mirrors the Dirty Dozen attack payloads documented in security_spec.md.
 */

export interface DirtyDozenCase {
  id: number;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actorRole: 'anonymous' | 'non_ceo_user' | 'spoofed_unverified_ceo' | 'ceo';
  expectedOutcome: 'PERMISSION_DENIED';
  reason: string;
}

export const DIRTY_DOZEN_MATRIX: DirtyDozenCase[] = [
  {
    id: 1,
    collectionPath: '/actors',
    operation: 'list',
    actorRole: 'anonymous',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Blanket list on /actors requires verified CEO email',
  },
  {
    id: 2,
    collectionPath: '/actors/actor_1',
    operation: 'get',
    actorRole: 'non_ceo_user',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Non-CEO authenticated users cannot read PII from /actors',
  },
  {
    id: 3,
    collectionPath: '/actors/actor_1',
    operation: 'create',
    actorRole: 'non_ceo_user',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Only CEO can register new members',
  },
  {
    id: 4,
    collectionPath: '/actors/actor_1',
    operation: 'update',
    actorRole: 'non_ceo_user',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Actors and non-CEO users cannot edit any profile',
  },
  {
    id: 5,
    collectionPath: '/actors/actor_1',
    operation: 'delete',
    actorRole: 'non_ceo_user',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Only CEO can delete profiles for rule violations',
  },
  {
    id: 6,
    collectionPath: '/actors/actor_1',
    operation: 'create',
    actorRole: 'spoofed_unverified_ceo',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isAdmin() strictly requires email_verified == true',
  },
  {
    id: 7,
    collectionPath: '/actorPortals',
    operation: 'list',
    actorRole: 'anonymous',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Portal vault cannot be enumerated via list queries',
  },
  {
    id: 8,
    collectionPath: '/actorPortals/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    operation: 'update',
    actorRole: 'non_ceo_user',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'ActorPortal is strictly read-only for actors',
  },
  {
    id: 9,
    collectionPath: '/actors/actor_1',
    operation: 'create',
    actorRole: 'ceo',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Shadow field (isSuperAdmin) rejected by keys().hasOnly()',
  },
  {
    id: 10,
    collectionPath: '/actors/actor_1',
    operation: 'create',
    actorRole: 'ceo',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Forged client timestamp rejected by createdAt == request.time',
  },
  {
    id: 11,
    collectionPath: '/videos/vid_draft',
    operation: 'get',
    actorRole: 'anonymous',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Unpublished draft videos are restricted to CEO only',
  },
  {
    id: 12,
    collectionPath: '/settings/studio',
    operation: 'update',
    actorRole: 'non_ceo_user',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Studio settings can only be modified by the CEO',
  },
];
