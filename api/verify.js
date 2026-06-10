// Verify a BBM access code and return the tier it unlocks.
//
// Code sources (checked in order):
//   1. Vercel KV (if configured) — codes written by api/webhook.js at purchase
//   2. CODE_STORE env var — JSON string of { "CODE": "tier" } pairs (fallback)
//
// Device binding (anti-sharing):
//   The app sends a stable per-browser device ID. Each code may be redeemed on
//   up to MAX_DEVICES distinct devices (KV key devices:<CODE>). Re-verifying
//   from a known device is always allowed — this honors the "works on any
//   device all season" promise in the purchase email while blocking one code
//   being shared across a Discord.
//   If KV is not configured, device limits are skipped (verification still works).
//
// POST { code: "BBM-XXXX-XX", device: "<uuid>" }
//   → { valid: true, tier: "pro" | "elite" }
//   → { valid: false }
//   → { valid: false, reason: "device_limit" }

const MAX_DEVICES = 3;

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

async function lookupTier(code) {
  // 1. KV
  if (kvConfigured()) {
    const entry = await kvGet(`code:${code}`);
    if (entry) {
      try {
        const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
        if (parsed?.tier) return parsed.tier;
      } catch { /* fall through */ }
    }
  }
  // 2. Env fallback
  const store = process.env.CODE_STORE;
  if (store) {
    try {
      const map = JSON.parse(store);
      if (map[code]) return map[code];
    } catch { /* ignore */ }
  }
  return null;
}

// Returns true if this device is allowed to use the code.
async function checkDeviceLimit(code, device) {
  if (!kvConfigured()) return true; // can't enforce without storage

  const key = `devices:${code}`;
  let devices = [];
  const raw = await kvGet(key);
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) devices = parsed;
    } catch { /* treat as empty */ }
  }

  if (devices.includes(device)) return true;       // known device — always ok
  if (devices.length >= MAX_DEVICES) return false;  // cap reached

  devices.push(device);
  await kvSet(key, devices); // best-effort; if write fails, user still gets in
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, device } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, error: 'No code provided' });
  }

  const normalized = code.trim().toUpperCase();

  // Basic format check: BBM-XXXX-XX
  if (!/^BBM-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(normalized)) {
    return res.status(200).json({ valid: false });
  }

  const tier = await lookupTier(normalized);
  if (!tier) {
    return res.status(200).json({ valid: false });
  }

  // Device binding. Legacy clients that don't send a device ID share one
  // slot per IP, so old cached bundles keep working but can't fan out.
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const deviceId = (typeof device === 'string' && device.length >= 8 && device.length <= 64)
    ? device
    : `ip:${ip}`;

  const allowed = await checkDeviceLimit(normalized, deviceId);
  if (!allowed) {
    return res.status(200).json({ valid: false, reason: 'device_limit' });
  }

  return res.status(200).json({ valid: true, tier });
}
