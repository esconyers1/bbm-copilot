// api/results.js — cross-device sync for DFS ROI tracker results.
// Keyed by the app's stable per-browser device ID (bbm_device_id).
// Offline-first: localStorage stays the source of truth client-side;
// this endpoint is the sync layer. Graceful no-op when KV isn't configured.
//
// GET  /api/results?device=<id>          → { synced: true, results: [...] }
// POST /api/results { device, results }  → { synced: true }
// When KV is unavailable: { synced: false, results: [] }

const MAX_RESULTS = 500;
const KEY_PREFIX = 'dfsresults:';

function kvConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvGet(key) {
  try {
    const res = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result ?? null;
  } catch {
    return null;
  }
}

async function kvSet(key, value) {
  try {
    const res = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function validDevice(d) {
  return typeof d === 'string' && d.length >= 8 && d.length <= 64;
}

// Keep only well-formed entries, newest first, capped.
function sanitize(results) {
  if (!Array.isArray(results)) return null;
  return results
    .filter(r => r && typeof r.id === 'number' && typeof r.fee === 'number' &&
      typeof r.won === 'number' && typeof r.date === 'string' && r.date.length <= 10)
    .map(r => ({
      id: r.id,
      date: r.date,
      fee: Math.max(0, r.fee),
      type: String(r.type || 'GPP').slice(0, 8),
      score: typeof r.score === 'number' ? r.score : null,
      won: Math.max(0, r.won),
    }))
    .sort((a, b) => b.id - a.id)
    .slice(0, MAX_RESULTS);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!kvConfigured()) return res.status(200).json({ synced: false, results: [] });

  if (req.method === 'GET') {
    const device = req.query?.device;
    if (!validDevice(device)) return res.status(400).json({ synced: false, error: 'Bad device id' });
    const raw = await kvGet(KEY_PREFIX + device);
    let results = [];
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        results = sanitize(parsed) || [];
      } catch { /* corrupted — return empty */ }
    }
    return res.status(200).json({ synced: true, results });
  }

  if (req.method === 'POST') {
    const { device, results } = req.body || {};
    if (!validDevice(device)) return res.status(400).json({ synced: false, error: 'Bad device id' });
    const clean = sanitize(results);
    if (!clean) return res.status(400).json({ synced: false, error: 'Bad results payload' });
    const ok = await kvSet(KEY_PREFIX + device, clean);
    return res.status(200).json({ synced: ok });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
