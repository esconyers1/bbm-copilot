// Email capture endpoint — Monetization Playbook Touchpoint 1 (post-draft Recap).
// POST { email, source } → { ok: true }
//
// Storage strategy (best-effort, fails open, always returns ok):
//   1. Vercel KV (if configured): SET subscriber:<email> = { source, ts }
//      and INCR subscribers:count — the list is the asset.
//   2. Resend notification (if RESEND_API_KEY): emails the new signup to the
//      founder inbox so no lead is lost even before KV exists.

const NOTIFY_TO = 'eric.sconyers@spothero.com';

function kvConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvStore(email, source) {
  if (!kvConfigured()) return false;
  const auth = { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` };
  const key = `subscriber:${email.toLowerCase()}`;
  try {
    // NX = only set if new, so re-submits don't inflate the count
    const res = await fetch(
      `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify({ source, ts: Date.now() }))}/nx`,
      { method: 'POST', headers: auth }
    );
    const data = await res.json().catch(() => null);
    const isNew = data?.result === 'OK';
    if (isNew) {
      fetch(`${process.env.KV_REST_API_URL}/incr/subscribers:count`, { method: 'POST', headers: auth }).catch(() => {});
    }
    return isNew;
  } catch {
    return false;
  }
}

async function notify(email, source, stored) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PickSetter <noreply@picksetter.com>',
        to: [NOTIFY_TO],
        subject: `New PickSetter waitlist signup: ${email}`,
        text: `Email: ${email}\nSource: ${source || 'unknown'}\nStored in KV: ${stored}\nTime: ${new Date().toISOString()}`,
      }),
    });
  } catch {
    // best-effort
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source } = req.body || {};
  const normalized = (email || '').trim().toLowerCase();

  // Light validation — don't fight users, just block junk
  if (!normalized || normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const src = typeof source === 'string' ? source.slice(0, 40) : 'app';
  const stored = await kvStore(normalized, src);
  // Only notify on new signups (or always, when KV is absent and we can't tell)
  if (stored || !kvConfigured()) await notify(normalized, src, stored);

  return res.status(200).json({ ok: true });
}
