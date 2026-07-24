#!/usr/bin/env node
/**
 * PickSetter ADP Updater
 * Fetches current Underdog Best Ball ADP from fantasypoints.com
 * Updates src/players-data.js and rebuilds public/app.js
 *
 * Run manually: node scripts/update-adp.js
 * Or via GitHub Action: runs every Monday automatically
 *
 * SOURCE CHANGE (July 2026): this used to scrape FantasyPros'
 * ?export=csv endpoint. FantasyPros now truncates their best-ball ADP
 * page to the top 5 players for anonymous/non-logged-in requests (confirmed
 * live: the served HTML has exactly 6 <tr> — header + 5 rows — followed by
 * a sign-in wall), so that CSV/HTML scrape can never return more than a
 * handful of players again. There is no auth-free way to get the rest from
 * FantasyPros.
 *
 * NOTE: this script's silent-failure design (exit 0 on fetch error, keep old
 * data) meant this had been failing every Monday with nobody noticing —
 * src/players-data.js was last genuinely updated 2026-05-19, well over two
 * months stale as of this fix. The "Verify data freshness" step in the
 * GitHub Action logs a warning in this case but does not fail the build or
 * notify anyone, so it's worth periodically checking the Action's run log
 * (or the "Updated:" stamp at the top of src/players-data.js) by hand.
 *
 * New source: fantasypoints.com's public Best Ball ADP report (Underdog +
 * FFPC + NFFC), fully server-rendered, no auth wall, best-ball-specific
 * (unlike fantasyfootballcalculator.com's free API, which is season-long
 * redraft ADP only — checked and rejected for that reason).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLAYERS_FILE = path.join(ROOT, 'src/players-data.js');

const ADP_URL = 'https://www.fantasypoints.com/nfl/adp/best-ball';

// Known bye weeks (update after schedule release each May).
// Looked up by team elsewhere in the app — not derived from the ADP source.
const BYE_WEEKS = {
  ARI:11, ATL:12, BAL:14, BUF:12, CAR:11, CHI:7,  CIN:12, CLE:10,
  DAL:7,  DEN:9,  DET:5,  GB:12,  HOU:14, IND:14, JAX:12, KC:10,
  LAC:5,  LAR:6,  LV:10,  MIA:6,  MIN:6,  NE:14,  NO:11,  NYG:11,
  NYJ:12, PHI:5,  PIT:9,  SEA:10, SF:9,   TB:11,  TEN:12, WAS:14,
};

const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

function fetchURL(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Referer': 'https://www.fantasypoints.com/',
        'Cache-Control': 'no-cache',
      },
      timeout: 20000,
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location, attempt).then(resolve).catch(reject);
      }
      if (res.statusCode === 429 && attempt < 3) {
        console.log(`Rate limited (429), retrying in 5s... (attempt ${attempt})`);
        setTimeout(() => fetchURL(url, attempt + 1).then(resolve).catch(reject), 5000);
        return;
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')));
  });
}

function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&rsquo;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Table structure (verified live, July 2026): real server-rendered <table
// class="... table-nfl-adp-best-ball ...">. Two-row <thead> (grouping row +
// column-label row) — we skip both and rely on fixed column positions, which
// is safe because we only read from <tbody>. Each <tbody> row is 10 <td>:
// RANK, NAME, POS, TEAM, Underdog ADP, Underdog POS-rank, FFPC ADP,
// FFPC POS-rank, NFFC ADP, NFFC POS-rank.
function parseFantasyPointsHTML(html) {
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-nfl-adp-best-ball[^"]*"[\s\S]*?<\/table>/i);
  const table = tableMatch ? tableMatch[0] : (html.match(/<table[\s\S]*?<\/table>/i) || [])[0];
  if (!table) throw new Error('No ADP table found in fantasypoints.com HTML — page format may have changed');

  const tbodyMatch = table.match(/<tbody[\s\S]*?<\/tbody>/i);
  const tbody = tbodyMatch ? tbodyMatch[0] : table;

  const players = [];
  for (const row of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripTags(m[1]));
    if (cells.length < 9) continue;

    const name = cells[1];
    const pos = cells[2].toUpperCase().trim();
    const team = (cells[3] || 'FA').toUpperCase().trim();
    if (!POSITIONS.has(pos)) continue;
    if (!name || name.length < 2) continue;

    // Underdog is the target format for this static player pool (matches the
    // header comment above); fall back to FFPC if Underdog is blank/NaN.
    const underdogAdp = parseFloat(cells[4]);
    const ffpcAdp = parseFloat(cells[6]);
    const adp = !isNaN(underdogAdp) ? underdogAdp : ffpcAdp;
    if (isNaN(adp)) continue;

    players.push([name, pos, team, adp]);
  }

  return players;
}

function buildPlayersFile(players, dateStr) {
  players.sort((a, b) => a[3] - b[3]);

  const rawLines = [];
  for (let i = 0; i < players.length; i += 3) {
    const chunk = players.slice(i, i + 3).map(p =>
      `["${p[0]}","${p[1]}","${p[2]}",${p[3]}]`
    ).join(',');
    rawLines.push('  ' + chunk);
  }

  return `// AUTO-GENERATED — do not edit manually
// Updated: ${dateStr} via fantasypoints.com Best Ball ADP (Underdog)
// Re-run: node scripts/update-adp.js
const RAW = [
${rawLines.join(',\n')},
];

const BYE_WEEKS = ${JSON.stringify(BYE_WEEKS, null, 2)};

module.exports = { RAW, BYE_WEEKS };
`;
}

async function main() {
  console.log('=== PickSetter ADP Updater ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Fetching: ${ADP_URL}`);

  let players;
  try {
    const html = await fetchURL(ADP_URL);
    console.log(`Received ${html.length} bytes`);
    players = parseFantasyPointsHTML(html);
    console.log(`Parsed ${players.length} players`);
  } catch (err) {
    console.error(`Fetch failed: ${err.message}`);
    console.log('Keeping existing player data — no changes made');
    process.exit(0); // Exit cleanly so GitHub Action doesn't fail the build
  }

  if (players.length < 50) {
    console.error(`Only got ${players.length} players — suspiciously low. Aborting.`);
    process.exit(0);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const fileContent = buildPlayersFile(players, dateStr);

  fs.writeFileSync(PLAYERS_FILE, fileContent, 'utf8');
  console.log(`Written: ${PLAYERS_FILE}`);

  console.log('Rebuilding bundle...');
  execSync(
    'npx esbuild src/index.jsx --bundle --outfile=public/app.js --loader:.jsx=jsx --define:process.env.NODE_ENV=\'"production"\' --minify --legal-comments=none',
    { stdio: 'inherit', cwd: ROOT }
  );

  console.log(`Done. Bundle: ${(fs.statSync(path.join(ROOT, 'public/app.js')).size / 1024).toFixed(0)}KB`);
  console.log(`Top 5 players: ${players.slice(0, 5).map(p => p[0]).join(', ')}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
