import { sanitizeUserData } from '../server/utils/data-sanitizer';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const before = {
    id: 1,
    username: 'tester',
    profileMusicUrl: '/uploads/music/music-123.mp3',
    profileMusicTitle: 'Old Song',
    profileMusicEnabled: true,
    profileMusicVolume: 55,
  } as any;

  const after = {
    ...before,
    profileMusicUrl: null,
    profileMusicTitle: null,
    profileMusicEnabled: false,
  } as any;

  const sBefore = sanitizeUserData(before);
  assert(sBefore.profileMusicUrl === '/uploads/music/music-123.mp3', 'Expected URL to be preserved before delete');
  assert(sBefore.profileMusicEnabled === true, 'Expected music enabled before delete');

  const sAfter = sanitizeUserData(after);
  assert(typeof sAfter.profileMusicUrl === 'undefined', 'Expected URL to be undefined after delete');
  assert(sAfter.profileMusicEnabled === false, 'Expected music disabled after delete');

  console.log('✅ Sanitizer test passed: profileMusic fields cleared correctly');
}

run();

