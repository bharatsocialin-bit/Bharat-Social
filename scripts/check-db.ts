import { db } from '@/lib/db';

async function main() {
  const users = await db.user.count();
  const posts = await db.post.count();
  const likes = await db.like.count();
  const comments = await db.comment.count();
  const reports = await db.report.count();
  const modActions = await db.moderationAction.count();
  const shorts = await db.short.count();
  const shortLikes = await db.shortLike.count();
  const shortComments = await db.shortComment.count();
  const shortReposts = await db.shortRepost.count();
  console.log('=== BharatSocial DB State ===');
  console.log('Users:', users);
  console.log('Posts:', posts);
  console.log('Likes:', likes);
  console.log('Comments:', comments);
  console.log('Reports:', reports);
  console.log('ModerationActions:', modActions);
  console.log('--- new tables ---');
  console.log('Shorts:', shorts);
  console.log('ShortLikes:', shortLikes);
  console.log('ShortComments:', shortComments);
  console.log('ShortReposts:', shortReposts);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
