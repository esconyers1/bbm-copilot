// Vercel serverless proxy — NFL Best Ball ADP
// Best ball ADP differs materially from season-long: QBs go earlier, roster construction differs.
//
// SOURCE CHANGE (July 2026): FantasyPros' best-ball ADP page now truncates the
// public/anonymous table to the top 5 players and gates the rest behind a
// sign-in wall (confirmed via live inspection — the anonymous HTML contains
// exactly 6 <tr> total, header + 5 rows, followed by a login/signup panel).
// That is a structural change, not a markup tweak, so no amount of regex
// tuning on the old scraper could recover it.
//
// We now source from fantasypoints.com's public Best Ball ADP report, which
// aggregates Underdog + FFPC + NFFC data, is fully server-rendered (402 rows
// confirmed in raw HTML, no auth wall), and is itself best-ball-specific
// (not season-long redraft ADP — checked, and rejected, fantasyfootballcalculator.com's
// free REST API for this reason: it only has standard/PPR/half-PPR *redraft* ADP).
//
// Query params:
//   ?format=ppr      → prefer FFPC column (Full PPR best ball)
//   ?format=half-ppr → prefer Underdog column (Half PPR, default — Underdog is
//                       the closest thing to an industry-standard best-ball ADP)
//
// Edge-cached 1 hour; stale-while-revalidate 24h.

const NFL_ADP_URL = 'https://www.fantasypoints.com/nfl/adp/best-ball';
const NFL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

// Legacy multi-sport scraper, kept only for nba/mlb/nhl (unused by the app today —
// grepped the frontend, no callers pass ?sport= — but left intact rather than
// deleted, since fantasypoints.com has no equivalent for those sports).
const LEGACY_SPORTS = {
  nba: {
    url: 'https://www.fantasypros.com/nba/adp/overall.php',
    positions: new Set(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']),
    embedded: true,
  },
  mlb: {
    url: 'https://www.fantasypros.com/mlb/adp/overall.php',
    positions: new Set(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'DH', 'UTIL']),
    embedded: true,
  },
  nhl: {
    url: 'https://www.fantasypros.com/nhl/adp/overall.php',
    positions: new Set(['C', 'LW', 'RW', 'W', 'D', 'G', 'F', 'UTIL']),
    embedded: true,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const format = (req.query && req.query.format) || 'half-ppr';
    const sportKey = String((req.query && req.query.sport) || 'nfl').toLowerCase();

    let players, source;
    if (sportKey === 'nfl' || !LEGACY_SPORTS[sportKey]) {
      const html = await fetchUrl(NFL_ADP_URL);
      players = parseFantasyPointsTable(html, format);
      source = 'fantasypoints.com';
    } else {
      const sport = LEGACY_SPORTS[sportKey];
      const body = await fetchUrl(sport.url);
      players = parseLegacyHTML(body, format, sport);
      source = 'fantasypros.com';
    }

    if (players.length < 50) {
      throw new Error(`Too few players parsed (${players.length}) — source may have changed format`);
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.json({
      players,
      source,
      sport: sportKey in LEGACY_SPORTS ? sportKey : 'nfl',
      format,
      year: new Date().getFullYear(),
      count: players.length,
      fetched: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function fetchUrl(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,text/csv,text/plain,*/*',
    },
  });
  if (!r.ok) throw new Error(`${url} returned ${r.status}`);
  return r.text();
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── fantasypoints.com Best Ball ADP parser ───────────────────────────────────
//
// Table structure (verified live, July 2026): a real server-rendered <table
// class="... table-nfl-adp-best-ball ...">, DataTables-enhanced client-side
// for sorting but NOT lazy-loaded — the plain HTML response already contains
// every row. Two-row <thead> (grouping row + column-label row); we only need
// the second row's labels. Each <tbody> row is 10 <td>: RANK, NAME, POS, TEAM,
// Underdog ADP, Underdog POS-rank, FFPC ADP, FFPC POS-rank, NFFC ADP, NFFC POS-rank.
function parseFantasyPointsTable(html, format) {
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-nfl-adp-best-ball[^"]*"[\s\S]*?<\/table>/i);
  const table = tableMatch ? tableMatch[0] : (html.match(/<table[\s\S]*?<\/table>/i) || [])[0];
  if (!table) throw new Error('No ADP table found in fantasypoints.com HTML');

  const tbodyMatch = table.match(/<tbody[\s\S]*?<\/tbody>/i);
  const tbody = tbodyMatch ? tbodyMatch[0] : table;

  // format=ppr → FFPC (full PPR best ball) primary, Underdog secondary fallback.
  // format=half-ppr (default) → Underdog (half PPR, the de facto best-ball
  // standard) primary, FFPC secondary fallback.
  const useFfpcPrimary = format === 'ppr';

  const players = [];
  for (const row of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripTags(m[1]));
    if (cells.length < 9) continue;

    const name = cells[1];
    const pos = cells[2].toUpperCase().trim();
    const team = cells[3].toUpperCase().trim();
    if (!NFL_POSITIONS.has(pos)) continue;
    if (!name || name.length < 2) continue;

    const underdogAdp = parseFloat(cells[4]);
    const ffpcAdp = parseFloat(cells[6]);
    const primary = useFfpcPrimary ? ffpcAdp : underdogAdp;
    const secondary = useFfpcPrimary ? underdogAdp : ffpcAdp;
    const adp = !isNaN(primary) ? primary : secondary;
    if (isNaN(adp)) continue;

    players.push({ name, pos, team: team || 'FA', adp });
  }

  return players.sort((a, b) => a.adp - b.adp);
}

// ── Legacy FantasyPros HTML parser — nba/mlb/nhl only (dormant, unused) ─────

function normalizePos(raw, sport) {
  const first = (raw || '').toUpperCase().trim().split(/[,/-]/)[0].trim();
  if (sport && sport.positions.has(first)) return first;
  return first.replace(/[0-9]+$/, '');
}

function parseLegacyHTML(html, format, sport) {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  let best = [];
  if (best.length < 50 && sport.embedded) {
    const players = [];
    for (const chunk of html.split(/<tr[^>]*>/i).slice(1)) {
      const rowHtml = chunk.split(/<\/tr>|<\/tbody>|<\/table>/i)[0];
      const cells = rowHtml.split(/<td[^>]*>/i).slice(1).map(c => stripTags(c.split(/<\/td>/i)[0]));
      if (cells.length < 3) continue;
      const field = cells.find(c => /\(\s*[A-Z]{2,3}\s*-\s*[A-Z0-9,\/\- ]+\)/.test(c));
      if (!field) continue;
      const m = field.match(/^(.*?)\s*\(\s*([A-Z]{2,3})\s*-\s*([A-Z0-9,\/\- ]+)\)/);
      if (!m) continue;
      const pos = normalizePos(m[3], sport);
      if (!sport.positions.has(pos)) continue;
      let adp = NaN;
      for (let k = cells.length - 1; k >= 0; k--) {
        const v = parseFloat(cells[k]);
        if (!isNaN(v)) { adp = v; break; }
      }
      if (isNaN(adp) || !m[1].trim()) continue;
      players.push({ name: m[1].trim(), pos, team: m[2], adp });
    }
    if (players.length > best.length) best = players;
  }
  void tables;
  return best.sort((a, b) => a.adp - b.adp);
}
