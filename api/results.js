// api/results.js — cross-device sync for DFS ROI tracker results.
//
// Identity: Pro/Elite users sync by license code (stable across their devices)
// → true cross-device sync. Free users fall back to per-browser device ID
// (backup/restore only). Keys are prefix-separated so the two can't collide.
//
// Tombstones: deletions are synced as { id: deletedAtMs } so a delete on one
// device propagates instead of being resurrected by another device's merge.
//
// GET  /api/results?device=<id>[&code=BBM-XXXX-XX]
//   → { synced: true, results: [...], deleted: { id: ts } }
// POST /api/results { device, code?, results, deleted }
//   → { synced: true }
// When KV is unavailable: { synced: false, results: [], deleted: {} }
//
// Back-compat: v10 stored a bare array; reads normalize it to { results, deleted:{} }.

const MAX_RESULTS = 500;
const MAX_TOMBSTONES = 1000;
const TOMBSTONE_TTL_MS = 90 * 24 * 3600 * 1000; // prune after 90 days
const DEVICE_PREFIX = 'dfsresults:';
const CODE_PREFIX = 'dfsresults:code:';

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

function validCode(c) {
  return typeof c === 'string' && /^BBM-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(c.trim().toUpperCase());
}

function storageKey(device, code) {
  if (validCode(code)) return CODE_PREFIX + code.trim().toUpperCase();
  return DEVICE_PREFIX + device;
}

function sanitizeResults(results) {
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

// { "<numeric id>": deletedAtMs } — prune stale, cap size (newest kept).
function sanitizeDeleted(deleted) {
  if (deleted == null) return {};
  if (typeof deleted !== 'object' || Array.isArray(deleted)) return null;
  const now = Date.now();
  const entries = Object.entries(deleted)
    .map(([id, ts]) => [Number(id), Number(ts)])
    .filter(([id, ts]) => Number.isFinite(id) && Number.isFinite(ts) &&
      ts > 0 && ts <= now + 86400000 && now - ts < TOMBSTONE_TTL_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOMBSTONES);
  return Object.fromEntries(entries);
}

function normalizeStored(raw) {
  if (!raw) return { results: [], deleted: {} };
  let parsed = raw;
  try {
    if (typeof raw === 'string') parsed = JSON.parse(raw);
  } catch {
    return { results: [], deleted: {} };
  }
  if (Array.isArray(parsed)) return { results: sanitizeResults(parsed) || [], deleted: {} }; // v10 format
  return {
    results: sanitizeResults(parsed.results) || [],
    deleted: sanitizeDeleted(parsed.deleted) || {},
  };
}

// Apply tombstones: a result whose id has a tombstone newer than the result is gone.
function applyTombstones(results, deleted) {
  return results.filter(r => !(r.id in deleted));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!kvConfigured()) return res.status(200).json({ synced: false, results: [], deleted: {} });

  if (req.method === 'GET') {
    const { device, code } = req.query || {};
    if (!validDevice(device) && !validCode(code)) {
      return res.status(400).json({ synced: false, error: 'Bad identity' });
    }
    const stored = normalizeStored(await kvGet(storageKey(device, code)));
    return res.status(200).json({
      synced: true,
      results: applyTombstones(stored.results, stored.deleted),
      deleted: stored.deleted,
    });
  }

  if (req.method === 'POST') {
    const { device, code, results, deleted } = req.body || {};
    if (!validDevice(device) && !validCode(code)) {
      return res.status(400).json({ synced: false, error: 'Bad identity' });
    }
    const cleanResults = sanitizeResults(results);
    const cleanDeleted = sanitizeDeleted(deleted);
    if (!cleanResults || cleanDeleted === null) {
      return res.status(400).json({ synced: false, error: 'Bad payload' });
    }
    // Merge with what's stored so a stale client can't wipe newer data:
    // union results, union tombstones, then apply tombstones.
    const stored = normalizeStored(await kvGet(storageKey(device, code)));
    const mergedDeleted = sanitizeDeleted({ ...stored.deleted, ...cleanDeleted }) || {};
    const byId = {};
    [...stored.results, ...cleanResults].forEach(r => { byId[r.id] = r; });
    const mergedResults = applyTombstones(
      Object.values(byId).sort((a, b) => b.id - a.id).slice(0, MAX_RESULTS),
      mergedDeleted
    );
    const ok = await kvSet(storageKey(device, code), { results: mergedResults, deleted: mergedDeleted });
    return res.status(200).json({ synced: ok, results: mergedResults, deleted: mergedDeleted });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
