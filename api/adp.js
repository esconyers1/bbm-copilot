// Vercel serverless proxy — FantasyPros Best Ball ADP
// Best ball ADP differs materially from season-long: QBs go earlier, roster construction differs.
// Source: fantasypros.com/nfl/adp/best-ball-overall.php (free, no auth)
//
// NOTE (June 2026): FantasyPros' ?export=csv endpoint now returns HTML, so we
// parse the rendered ADP table directly. CSV parsing is kept as a fallback in
// case the export endpoint is restored.
//
// Query params:
//   ?format=ppr      → prefer DraftKings column (Full PPR)
//   ?format=half-ppr → prefer Underdog column (Half PPR, default)
//
// Edge-cached 1 hour; stale-while-revalidate 24h.

const SPORTS = {
  nfl: {
    url: 'https://www.fantasypros.com/nfl/adp/best-ball-overall.php',
    positions: new Set(['QB', 'RB', 'WR', 'TE']),
  },
  nba: {
    url: 'https://www.fantasypros.com/nba/adp/overall.php',
    positions: new Set(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']),
    embedded: true, // player cell format: "Name (TEAM - POS,POS)"
  },
  mlb: {
    url: 'https://www.fantasypros.com/mlb/adp/overall.php',
    positions: new Set(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP', 'DH', 'UTIL']),
    embedded: true,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const format = (req.query && req.query.format) || 'half-ppr';
    const sportKey = String((req.query && req.query.sport) || 'nfl').toLowerCase();
    const sport = SPORTS[sportKey] || SPORTS.nfl;
    const body = await fetchFantasyPros(sport.url);

    // Detect payload type: real CSV has no tags and is comma-delimited
    const looksLikeHTML = /<\s*(html|table|tr|td)/i.test(body);
    const players = looksLikeHTML ? parseHTML(body, format, sport) : parseCSV(body, format, sport);

    if (players.length < 50) {
      throw new Error(`Too few players parsed (${players.length}) — FantasyPros may have changed format`);
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.json({
      players,
      source: 'fantasypros.com',
      sport: sportKey in SPORTS ? sportKey : 'nfl',
      format,
      year: new Date().getFullYear(),
      count: players.length,
      fetched: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function fetchFantasyPros(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,text/csv,text/plain,*/*',
      'Referer': 'https://www.fantasypros.com/',
    },
  });
  if (!r.ok) throw new Error(`FantasyPros returned ${r.status}`);
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

// "WR1" → "WR"; "RB12" → "RB"; "SS,2B" → "SS"; "PG-SG" → "PG"
function normalizePos(raw, sport) {
  const first = (raw || '').toUpperCase().trim().split(/[,/-]/)[0].trim();
  if (sport && sport.positions.has(first)) return first; // exact match incl. 1B/2B/3B
  return first.replace(/[0-9]+$/, '');
}

// "Ja'Marr Chase CIN (6)" → { name: "Ja'Marr Chase", team: "CIN" }
function splitPlayerField(field) {
  const teamMatch = field.match(/([A-Z]{2,3})\s*(?:\(\d+\))?$/);
  const team = teamMatch ? teamMatch[1] : 'FA';
  const name = field.replace(/\s+[A-Z]{2,3}\s*(?:\(\d+\))?$/, '').trim();
  return { name, team };
}

// Choose ADP column by header names and requested format.
// half-ppr → Underdog first; ppr → DraftKings first; both fall back to AVG.
function pickAdpColumn(headers, format) {
  const find = (re) => headers.findIndex(h => re.test(h));
  const ud  = find(/underdog|udft/i);
  const dk  = find(/draftkings|\bdk\b/i);
  const avg = find(/\bavg\b/i);
  const preferred = format === 'ppr' ? dk : ud;
  const fallback  = format === 'ppr' ? ud : dk;
  if (preferred >= 0) return { primary: preferred, secondary: avg >= 0 ? avg : fallback };
  if (avg >= 0) return { primary: avg, secondary: fallback };
  return { primary: headers.length - 1, secondary: -1 };
}

function buildPlayer(playerField, posRaw, cells, cols, sport) {
  let name, team, pos;
  if (sport.embedded) {
    // NBA/MLB format: "Nikola Jokic (DEN - C)" or "Luka Doncic (LAL - PG,SG) DTD"
    const m = playerField.match(/^(.*?)\s*\(([A-Z]{2,3})\s*-\s*([A-Z0-9,\/\- ]+)\)/);
    if (!m) return null;
    name = m[1].trim();
    team = m[2];
    pos = normalizePos(m[3], sport);
  } else {
    pos = normalizePos(posRaw, sport);
    const split = splitPlayerField(playerField);
    name = split.name;
    team = split.team;
  }
  if (!sport.positions.has(pos)) return null;
  if (!name || name.length < 2) return null;
  let adp = parseFloat(cells[cols.primary]);
  if (isNaN(adp) && cols.secondary >= 0) adp = parseFloat(cells[cols.secondary]);
  if (isNaN(adp)) return null;
  return { name, pos, team, adp };
}

// ── HTML parser (current FantasyPros format) ─────────────────────────────────

function parseHTML(html, format, sport) {
  const tableMatch =
    html.match(/<table[^>]*id=["']data["'][\s\S]*?<\/table>/i) ||
    html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) throw new Error('No ADP table found in FantasyPros HTML');
  const table = tableMatch[0];

  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => stripTags(m[1]));
  if (!headers.length) throw new Error('No table headers found');
  const cols = pickAdpColumn(headers, format);

  const players = [];
  for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripTags(m[1]));
    if (cells.length < 4) continue;
    const p = buildPlayer(cells[1] || '', cells[2] || '', cells, cols, sport);
    if (p) players.push(p);
  }
  return players.sort((a, b) => a.adp - b.adp);
}

// ── CSV parser (legacy fallback) ──────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csv, format, sport) {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length < 2) throw new Error('CSV empty or malformed');

  const headers = parseCSVLine(lines[0]);
  const cols = pickAdpColumn(headers, format);

  const players = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < 3) continue;
    const p = buildPlayer(cells[1] || '', cells[2] || '', cells, cols, sport);
    if (p) players.push(p);
  }
  return players.sort((a, b) => a.adp - b.adp);
}
