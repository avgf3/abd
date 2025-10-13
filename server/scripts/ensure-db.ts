import { initializeDatabase, dbAdapter } from '../database-adapter';
import { ensureUserProfileFrameColumn, ensureWallPostsUserProfileFrameColumn, ensureUserProfileTagColumn, ensureWallPostsUserProfileTagColumn, ensureUserProfileTitleColumn, ensureWallPostsUserProfileTitleColumn } from '../database-adapter';

(async () => {
  const ok = await initializeDatabase();
  if (!ok || !dbAdapter.client) {
    console.warn('⚠️ DATABASE_URL غير مضبوط أو الاتصال غير متاح؛ تعذّر تطبيق الأعمدة.');
    process.exit(0);
  }
  await ensureUserProfileFrameColumn();
  await ensureWallPostsUserProfileFrameColumn();
  await ensureUserProfileTagColumn();
  await ensureUserProfileTitleColumn();
  await ensureWallPostsUserProfileTagColumn();
  await ensureWallPostsUserProfileTitleColumn();
  console.log('✅ تم ضمان أعمدة profile_frame و user_profile_frame و profile_tag و user_profile_tag و profile_title و user_profile_title');
  process.exit(0);
})();