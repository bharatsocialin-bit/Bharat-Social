import { db } from '@/lib/db';

/**
 * Check if there's a block relationship between two users in EITHER direction.
 * Returns one of:
 *   - 'none'         — no block either way
 *   - 'blocked'      — the current user has blocked the target
 *   - 'blockedBy'    — the target has blocked the current user
 *
 * Use this in routes where one user is about to interact with another user's
 * content (like, comment, repost, follow). If the result is anything other
 * than 'none', the route should return 403 with a generic message that does
 * NOT reveal which direction the block goes (to avoid leaking the blocker's
 * identity to the blocked party).
 *
 * Rationale: blocks are a safety feature. The blocked user should not be able
 * to surface their content to the blocker via likes/comments/reposts/follows,
 * AND the blocker should not be able to interact with the blocked user's
 * content (no asymmetry — both directions are blocked).
 */
export async function getBlockRelation(
  currentUserId: string,
  targetUserId: string,
): Promise<'none' | 'blocked' | 'blockedBy'> {
  if (currentUserId === targetUserId) return 'none';
  const [iBlockThem, theyBlockMe] = await Promise.all([
    db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUserId,
          blockedId: targetUserId,
        },
      },
      select: { id: true },
    }),
    db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: targetUserId,
          blockedId: currentUserId,
        },
      },
      select: { id: true },
    }),
  ]);
  if (iBlockThem) return 'blocked';
  if (theyBlockMe) return 'blockedBy';
  return 'none';
}

/**
 * Returns true if the two users have ANY block relationship (either direction).
 * Use this as a fast predicate in routes that should silently refuse action.
 */
export async function isEitherBlocked(
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  const r = await getBlockRelation(currentUserId, targetUserId);
  return r !== 'none';
}
