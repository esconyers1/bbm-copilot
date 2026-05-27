// Vercel serverless proxy for Fantasy Football Calculator ADP
// Free API, no auth required. Edge-cached for 1 hour.
// Usage: GET /api/adp?format=half-ppr  (or ?format=ppr for DraftKings)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const format = req.query.format === 'ppr' ? 'ppr' : 'half-ppr';
  const year   = new Date().getFullYear();

  try {
    const r = await fetch(
      `https://fantasyfootballcalculator.com/api/v1/adp/${format}?teams=12&year=${year}&count=300`,
      {
        headers: {
          'User-Agent': 'BBM-Copilot/2.0 (https://bbm-copilot.vercel.app)',
          'Accept': 'application/json',
        },
      }
    );

    if (!r.ok) throw new Error(`FFC returned ${r.status}`);

    const data = await r.json();

    // Normalize to {name, pos, team, adp}; keep only relevant positions
    const POSITIONS = new Set(['QB','RB','WR','TE']);
    const players = (data.players || [])
      .filter(p => POSITIONS.has(p.position))
      .map(p => ({
        name: p.name,
        pos:  p.position,
        team: p.team || '',
        adp:  parseFloat(p.adp) || 999,
      }))
      .sort((a, b) => a.adp - b.adp);

    // Cache at Vercel edge for 1 hour, serve stale for 24h while revalidating
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.json({
      players,
      format,
      year,
      count: players.length,
      source: 'fantasyfootballcalculator.com',
      fetched: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
