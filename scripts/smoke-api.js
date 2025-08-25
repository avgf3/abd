import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function run() {
  const results = [];
  const record = (name, ok, status, extra) => {
    results.push({ name, ok, status, extra });
    console.log(`${ok ? '✅' : '❌'} ${name} -> ${status}${extra ? ' ' + extra : ''}`);
  };

  try {
    const r1 = await fetch(`${BASE}/health`);
    record('GET /health', r1.ok, r1.status);
  } catch (e) {
    record('GET /health', false, 'ERR', e.message);
  }

  try {
    const r2 = await fetch(`${BASE}/api/health`);
    record('GET /api/health', r2.ok, r2.status);
  } catch (e) {
    record('GET /api/health', false, 'ERR', e.message);
  }

  try {
    const r3 = await fetch(`${BASE}/api/rooms`);
    record('GET /api/rooms', r3.ok, r3.status);
  } catch (e) {
    record('GET /api/rooms', false, 'ERR', e.message);
  }

  try {
    const r4 = await fetch(`${BASE}/api/messages/room/general?limit=5`);
    record('GET /api/messages/room/:roomId', r4.ok, r4.status);
  } catch (e) {
    record('GET /api/messages/room/:roomId', false, 'ERR', e.message);
  }

  try {
    const r5 = await fetch(`${BASE}/api/security/report`);
    record('GET /api/security/report (should be 401/403)', !r5.ok ? true : false, r5.status);
  } catch (e) {
    record('GET /api/security/report', false, 'ERR', e.message);
  }

  const failed = results.filter(r => !r.ok);
  console.log('\nSummary:', `${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

run();

