// Stripe webhook → generate access code → email via Resend
// Env vars required: STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, CODE_STORE (JSON string)
//
// CODE_STORE is a JSON object: { "BBM-XXXX-XX": "pro" | "elite" }
// Store this in Vercel environment variables. Update it when new codes are issued.
// For production, replace with Vercel KV or a database.

import crypto from 'crypto';

// Generate a short, readable access code: BBM-XXXX-XX
function generateCode(tier) {
  const rand4 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `BBM-${rand4}-${rand2}`;
}

// Verify Stripe webhook signature
function verifyStripeSignature(payload, signature, secret) {
  const parts = signature.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  const sigHash = parts.v1;

  if (!timestamp || !sigHash) return false;

  // Reject events older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(sigHash, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

async function sendCodeEmail(email, code, tier) {
  const tierLabel = tier === 'elite' ? 'BBM Copilot Elite' : 'BBM Copilot Pro';
  const features = tier === 'elite'
    ? 'Unlimited AI picks · Full portfolio analytics · Custom rankings · Roster export · Opponent modeling · Early ADP · Post-draft optimizer'
    : 'Unlimited AI picks · Full portfolio analytics · Custom rankings · Roster export';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #060A12; color: #EBEEf8; padding: 32px; border-radius: 12px;">
      <div style="font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #FFD166; margin-bottom: 4px;">COPILOT</div>
      <div style="font-size: 13px; color: #8892AA; letter-spacing: 1px; margin-bottom: 32px;">Best Ball Intelligence</div>

      <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">You're in. 🎯</div>
      <p style="color: #8892AA; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Your <strong style="color: #FFD166;">${tierLabel}</strong> access code is ready. Enter it in the app to unlock all your features.
      </p>

      <div style="background: #0C1422; border: 2px solid #FFD166; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 11px; color: #8892AA; letter-spacing: 2px; margin-bottom: 8px;">YOUR ACCESS CODE</div>
        <div style="font-family: 'Courier New', monospace; font-size: 28px; font-weight: 900; color: #FFD166; letter-spacing: 4px;">${code}</div>
      </div>

      <div style="font-size: 13px; color: #8892AA; margin-bottom: 8px; font-weight: 700;">How to activate:</div>
      <ol style="color: #8892AA; font-size: 13px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
        <li>Open BBM Copilot</li>
        <li>Tap the gear icon (⚙) in the top right</li>
        <li>Tap "Enter Pro Code"</li>
        <li>Enter your code above and tap UNLOCK</li>
      </ol>

      <div style="background: #111C30; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
        <div style="font-size: 11px; color: #475068; letter-spacing: 1.5px; margin-bottom: 6px;">YOUR TIER INCLUDES</div>
        <div style="font-size: 12px; color: #8892AA; line-height: 1.8;">${features}</div>
      </div>

      <p style="color: #475068; font-size: 11px; line-height: 1.6;">
        Save this email — your code works on any device all season. If you switch devices, just re-enter the code.
        Questions? Reply to this email.
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BBM Copilot <noreply@bbmcopilot.com>',
      to: [email],
      subject: `Your BBM Copilot ${tierLabel} access code`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

// Store a new code in Vercel KV (or log it for manual env update)
// In production, replace with actual Vercel KV calls
async function storeCode(code, tier, email) {
  // Log to console — Vercel captures these in deployment logs
  // You can also push to a Vercel KV store here
  console.log(JSON.stringify({
    event: 'new_code_issued',
    code,
    tier,
    email,
    ts: new Date().toISOString(),
  }));

  // If VERCEL_KV available, store there:
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    await fetch(`${process.env.KV_REST_API_URL}/set/code:${code}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tier, email, issued: Date.now() }),
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  // Get raw body for signature verification
  const signature = req.headers['stripe-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // Only handle successful payments
  if (event.type !== 'checkout.session.completed' && event.type !== 'payment_intent.succeeded') {
    return res.status(200).json({ received: true });
  }

  try {
    const session = event.data.object;
    const email = session.customer_details?.email || session.receipt_email || session.metadata?.email;

    if (!email) {
      console.error('No email found in Stripe event', JSON.stringify(session).slice(0, 200));
      return res.status(200).json({ received: true, warning: 'no_email' });
    }

    // Determine tier from product name or metadata
    const productName = (session.metadata?.product || '').toLowerCase();
    const amount = session.amount_total || 0;
    const tier = productName.includes('elite') || amount >= 19900 ? 'elite' : 'pro';

    const code = generateCode(tier);
    await storeCode(code, tier, email);
    await sendCodeEmail(email, code, tier);

    console.log(`Code issued: ${code} [${tier}] → ${email}`);
    return res.status(200).json({ received: true, code_issued: true });

  } catch (err) {
    console.error('Webhook handler error:', err.message);
    // Still return 200 so Stripe doesn't retry — log the error for manual follow-up
    return res.status(200).json({ received: true, error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: true, // Stripe sends JSON — bodyParser is fine here
  },
};
