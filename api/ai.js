// Vercel serverless proxy for Anthropic API — hardened.
// Set ANTHROPIC_API_KEY in your Vercel project environment variables.
//
// Protections:
//   1. Request clamping — only the fields the app actually sends are forwarded.
//      Model is forced to ALLOWED_MODEL and max_tokens capped, so this endpoint
//      can't be used as a general-purpose free Claude proxy.
//   2. Per-IP rate limiting via Vercel KV (fixed 1-hour window, RATE_LIMIT/hr).
//      Skipped gracefully if KV is not configured.

const ALLOWED_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS_CAP = 600;       // app sends 350–400
const MAX_INPUT_CHARS = 24000;    // system + messages combined
const RATE_LIMIT = 30;            // requests per IP per hour

function kvConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Returns true if the request is within limits (fails open on KV errors).
async function checkRateLimit(ip) {
  if (!kvConfigured()) return true;
  const hour = Math.floor(Date.now() / 3600000);
  const key = `rl:ai:${ip}:${hour}`;
  const auth = { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` };
  try {
    const res = await fetch(`${process.env.KV_REST_API_URL}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: auth,
    });
    if (!res.ok) return true;
    const data = await res.json();
    const count = Number(data?.result) || 0;
    if (count === 1) {
      // First hit this window — set TTL so keys self-clean (best-effort).
      fetch(`${process.env.KV_REST_API_URL}/expire/${encodeURIComponent(key)}/7200`, {
        method: 'POST',
        headers: auth,
      }).catch(() => {});
    }
    return count <= RATE_LIMIT;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI advisor not configured. Set ANTHROPIC_API_KEY in Vercel environment variables.' });
  }

  // ── Rate limit ──
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!(await checkRateLimit(ip))) {
    return res.status(429).json({ error: 'Rate limit reached. Try again in a bit.' });
  }

  // ── Clamp the request to exactly what the app needs ──
  const body = req.body || {};
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const system = typeof body.system === 'string' ? body.system : '';
  const messages = body.messages
    .slice(0, 4)
    .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: m.content }));

  if (messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const totalChars = system.length + messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: 'Request too large' });
  }

  const safeBody = {
    model: ALLOWED_MODEL, // ignore client-supplied model
    max_tokens: Math.min(Number(body.max_tokens) || 400, MAX_TOKENS_CAP),
    messages,
  };
  if (system) safeBody.system = system;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'AI request failed: ' + e.message });
  }
}
