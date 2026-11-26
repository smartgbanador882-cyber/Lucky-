# Security Specification — Unity Film World Production

## 1. Data Invariants
1. **CEO-Only Write Authority**: Only the verified CEO account (`smartgbanador882@gmail.com` with `email_verified == true`) can create, update, or delete actors, portals, messages, videos, and studio settings.
2. **Zero Self-Edit or Privilege Escalation**: Actors and unauthenticated visitors have zero write permissions anywhere in Firestore. Actors can only read their own `actorPortals/{portalHash}` document using `getDoc` when they possess the exact 64-char SHA-256 hash of `REGISTRATION_NUMBER:PASSWORD`.
3. **No Blanket List Scraping**: `/actors`, `/actorPortals`, and `/messages` forbid `list` queries for non-admins. `/videos` permits `list` only when `resource.data.isPublished == true`.
4. **Immutable Creation Metadata**: `id`, `createdByUid`, and `createdAt` cannot be altered after document creation, and `createdAt` / `updatedAt` must equal `request.time`.
5. **Bounded Payloads**: Every string and array (`messages.size() <= 50`) enforces explicit length bounds to block storage exhaustion.

## 2. Dirty Dozen Attack Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated `list` on `/actors`
2. Authenticated non-CEO `get` on `/actors/{actorId}`
3. Authenticated non-CEO `create` on `/actors/{actorId}`
4. Authenticated non-CEO `update` on `/actors/{actorId}` attempting to edit profile fields
5. Authenticated non-CEO `delete` on `/actors/{actorId}`
6. Spoofed CEO email with `email_verified: false` writing to `/actors/{actorId}`
7. Unauthenticated `list` on `/actorPortals` to enumerate portal hashes
8. Non-CEO `create` or `update` on `/actorPortals/{portalHash}`
9. CEO shadow-field `create` on `/actors/{actorId}` containing extra key `isSuperAdmin: true`
10. CEO `create` on `/actors/{actorId}` with forged client `createdAt` instead of `request.time`
11. Unauthenticated `read` of unpublished video (`isPublished: false`) on `/videos/{videoId}`
12. Non-CEO `write` on `/settings/studio` or `/messages/{messageId}`
