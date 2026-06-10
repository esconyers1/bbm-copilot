// api/injuries.js — NFL injury statuses from Sleeper's public players API (no auth).
// Edge-cached 10 min. Returns { updated, count, players: { nameKey → { name, team, pos, status } } }
// nameKey matches App.jsx projNameKey(): lowercase alpha+space, suffixes stripped.

function nameKey(name) {
  return String(name).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+(jr|sr|ii|iii|iv|v)$/, '').replace(/\s+/g, ' ').trim();
}

const RELEVANT = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!r.ok) throw new Error('Sleeper responded ' + r.status);
    const all = await r.json();
    const players = {};
    for (const id in all) {
      const p = all[id];
      if (!p || !p.injury_status || !p.full_name) continue;
      if (p.position && !RELEVANT.has(p.position)) continue;
      players[nameKey(p.full_name)] = {
        name: p.full_name,
        team: p.team || '',
        pos: p.position || '',
        status: p.injury_status, // Questionable | Doubtful | Out | IR | PUP | Sus | etc.
      };
    }
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    res.status(200).json({ updated: Date.now(), count: Object.keys(players).length, players });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
}
