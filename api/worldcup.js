// api/worldcup.js — FIFA World Cup 2026 tracker data via ESPN's public site API (no auth).
// ?view=standings            → { updated, groups: [{ name, teams: [...] }] }   (cached 5 min)
// ?dates=YYYYMMDD (default)  → { updated, matches: [...] }                     (cached 60s — live scores)
// Display-only tracker: ESPN embeds sportsbook odds in this feed — deliberately
// STRIPPED here (PickSetter guardrail: analytics/tracking only, no betting content).

const BASE = 'https://site.api.espn.com/apis';
const LEAGUE = 'soccer/fifa.world';

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function statBy(stats, names) {
  for (const n of names) {
    const s = (stats || []).find(x => x && (x.name === n || x.abbreviation === n));
    if (s) return num(s.value != null ? s.value : s.displayValue);
  }
  return 0;
}

function normTeam(c) {
  const t = (c && c.team) || {};
  return {
    abbr: t.abbreviation || '',
    name: t.displayName || t.name || '',
    logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || '',
    score: c && c.score != null ? String(c.score) : '',
    winner: !!(c && c.winner),
  };
}

function normMatch(ev) {
  try {
    const comp = (ev.competitions && ev.competitions[0]) || {};
    const home = (comp.competitors || []).find(c => c.homeAway === 'home');
    const away = (comp.competitors || []).find(c => c.homeAway === 'away');
    if (!ev.id || !home || !home.team || !away || !away.team) return null;
    const st = (comp.status || ev.status || {});
    const stType = st.type || {};
    const bc = (comp.broadcasts && comp.broadcasts[0] && comp.broadcasts[0].names) || [];
    return {
      id: ev.id,
      date: ev.date,
      stage: (ev.season && ev.season.slug) || '',
      venue: (comp.venue && comp.venue.fullName) || '',
      city: (comp.venue && comp.venue.address && comp.venue.address.city) || '',
      state: stType.state || 'pre',            // pre | in | post
      completed: !!stType.completed,
      detail: stType.shortDetail || stType.description || '',
      clock: st.displayClock || '',
      tv: bc.slice(0, 3),
      home: normTeam(home),
      away: normTeam(away),
      // NOTE: comp.odds intentionally not forwarded.
    };
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  const view = (req.query && req.query.view) || 'matches';
  try {
    if (view === 'standings') {
      const r = await fetch(`${BASE}/v2/sports/${LEAGUE}/standings`);
      if (!r.ok) throw new Error('ESPN standings responded ' + r.status);
      const d = await r.json();
      const groups = (d.children || []).map(g => ({
        name: g.name || g.abbreviation || '',
        teams: (((g.standings || {}).entries) || []).map(en => {
          const t = en.team || {};
          const s = en.stats || [];
          const gf = statBy(s, ['pointsFor', 'GF']);
          const ga = statBy(s, ['pointsAgainst', 'GA']);
          return {
            abbr: t.abbreviation || '',
            name: t.displayName || t.name || '',
            logo: (t.logos && t.logos[0] && t.logos[0].href) || '',
            gp: statBy(s, ['gamesPlayed', 'GP']),
            w: statBy(s, ['wins', 'W']),
            d: statBy(s, ['ties', 'draws', 'D']),
            l: statBy(s, ['losses', 'L']),
            gf, ga, gd: gf - ga,
            pts: statBy(s, ['points', 'P', 'PTS']),
            rank: statBy(s, ['rank']),
          };
        }).sort((a, b) => (a.rank && b.rank) ? a.rank - b.rank : (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf)),
      })).filter(g => g.teams.length > 0);
      if (!groups.length) throw new Error('No standings data');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ updated: Date.now(), groups });
    }

    // matches view — single day; YYYYMMDD validated, defaults to today UTC
    const raw = String((req.query && req.query.dates) || '').replace(/[^0-9]/g, '');
    const dates = /^[0-9]{8}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r = await fetch(`${BASE}/site/v2/sports/${LEAGUE}/scoreboard?dates=${dates}`);
    if (!r.ok) throw new Error('ESPN scoreboard responded ' + r.status);
    const d = await r.json();
    const matches = (d.events || []).map(normMatch).filter(Boolean)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ updated: Date.now(), dates, matches });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
}
