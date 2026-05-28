// Verify a BBM access code and return the tier it unlocks.
// Sources (checked in order):
//   1. Vercel KV (if configured) — real-time, supports any volume
//   2. CODE_STORE env var — JSON string of { "CODE": "tier" } pairs (fallback for small deployments)
//
// POST { code: "BBM-XXXX-XX" } → { valid: true, tier: "pro" | "elite" }
// POST { code: "bad" }         → { valid: false }

async function lookupInKV(code) {
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return null;

  try {
    const res = await fetch(`${kvUrl}/get/code:${code.toUpperCase()}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Vercel KV returns { result: <value> }
    const entry = data?.result;
    if (!entry) return null;
    const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
    return parsed?.tier || null;
  } catch {
    return null;
  }
}

function lookupInEnv(code) {
  const store = process.env.CODE_STORE;
  if (!store) return null;
  try {
    const map = JSON.parse(store);
    return map[code.toUpperCase()] || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, error: 'No code provided' });
  }

  const normalized = code.trim().toUpperCase();

  // Basic format check: BBM-XXXX-XX
  if (!/^BBM-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(normalized)) {
    return res.status(200).json({ valid: false });
  }

  // Check KV first, then env fallback
  let tier = await lookupInKV(normalized);
  if (!tier) tier = lookupInEnv(normalized);

  if (!tier) {
    return res.status(200).json({ valid: false });
  }

  return res.status(200).json({ valid: true, tier });
}
