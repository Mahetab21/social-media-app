# Deployment and existing data

## Fresh deployment

- Use HTTPS, server-side secret storage and a private MongoDB replica set.
- Run `npm ci`, `npm run build`, then `npm prune --omit=dev` and `node dist/index.js`.
- Set actual browser origins. Configure proxy trust/rate limits for your hosting topology; no proxy is trusted by default.
- Verify Gmail delivery, Google token audience and least-privilege S3 permissions with test accounts.
- Configure bucket encryption, public-access blocking and lifecycle cleanup. Signed PUT URLs remain valid until expiry; production uploads should be scanned before use.
- Provision administrators through controlled database access. Role changes invalidate existing sessions.
- Socket delivery currently supports one server process. Scaling needs a shared adapter and session-aware delivery.

## Existing database migration

Back up data first. Review conflicts before creating new unique indexes. No destructive migration runs automatically.

1. Normalize email addresses to lowercase and resolve case-only duplicates.
2. Old JWTs without `tokenVersion` are rejected. Users must sign in again. Old user-document OTPs are no longer accepted.
3. Reconcile duplicate revoked-token `tokenId` records before creating the unique index. Expiry is handled by a TTL index.
4. For friend requests, populate `pairKey` from sorted user IDs joined by a colon. Reconcile duplicate/opposite requests and populate `acceptedAt` from verified friendship state. Older code wrote `accepted`, which did not match its schema.
5. Consolidate duplicate direct chats while preserving messages, then populate their sorted-ID `pairKey`. Its unique sparse index applies to direct chats with a key; groups have no pair key.
6. Ensure group creators belong to their participant lists; older code omitted the creator.
7. Backfill comment `postId` by resolving the parent chain. Direct comments use `onModel: "post"`; replies use `onModel: "Comment"`. Review orphaned/cyclic or overly deep chains.
8. Remove obsolete `otp`, `twoFactorOtp`, `newEmail` and pending-profile values after migration.
9. Tests clear only a disposable database named `social_test`; never use application data.

## API changes

- `/users/signIn` and `/users/logIn` now use the same login verification and token format.
- Access tokens last 15 minutes; refresh tokens last seven days and rotate on use.
- `GET /posts/getPostById/:postId` now requires authentication.
- Replies use `POST /posts/:postId/comments/:commentId`; freezing uses `PATCH /posts/:postId/comments/freeze/:commentId`.
- `/users/uploadImages` creates one pending signed PUT upload. Call `POST /users/confirmProfileImage` afterward. A process-local timer no longer commits profile-image changes.
- `/users/chandeRole/:userId` retains its original spelling and requires a super administrator.
- Anonymous S3 proxy/list/delete routes are removed. Clients need authorized media delivery.

## Operational limits

MongoDB transactions do not include email or S3 operations. Monitor failed email delivery/storage cleanup and reconcile orphaned files with a lifecycle policy. A durable queue, account retention scheduler, virus scanning and operational monitoring are outside this repository's scope.

Group members can read historical group messages. Blocking restricts new direct contact and new live group delivery between the blocked pair; it does not rewrite group history.

The embedded message model has a 10,000-message cap. Move messages to their own collection before growing beyond this limit. Feed privacy queries prioritize clarity over large-dataset optimization.
