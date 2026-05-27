#!/usr/bin/env node
/**
   * COPILOT ADP Updater
   * Fetches current Underdog Best Ball ADP from FantasyPros
   * Updates src/players-data.js and rebuilds public/app.js
   *
   * Run manually: node scripts/update-adp.js
   * Or via GitHub Action: runs every Monday automatically
   */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLAYERS_FILE = path.join(ROOT, 'src/players-data.js');

// FantasyPros best ball ADP — Underdog-specific column
// This CSV is publicly accessible, no auth required
const ADP_URL = 'https://www.fantasypros.com/nfl/adp/best-ball-overall.php?export=csv';

// Known bye weeks (update after schedule release each May)
// These will be overridden if FantasyPros includes them
const BYE_WEEKS = {
    ARI:11, ATL:12, BAL:14, BUF:12, CAR:11, CHI:7,  CIN:12, CLE:10,
    DAL:7,  DEN:9,  DET:5,  GB:12,  HOU:14, IND:14, JAX:12, KC:10,
    LAC:5,  LAR:6,  LV:10,  MIA:6,  MIN:6,  NE:14,  NO:11,  NYG:11,
    NYJ:12, PHI:5,  PIT:9,  SEA:10, SF:9,   TB:11,  TEN:12, WAS:14,
};

function fetchURL(url, attempt = 1) {
    return new Promise((resolve, reject) => {
          const options = {
                  headers: {
                            // Full browser UA — FantasyPros blocks simple bot strings from GitHub Actions
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'identity',
                            'Referer': 'https://www.fantasypros.com/nfl/adp/',
                            'Cache-Control': 'no-cache',
                  },
                  timeout: 20000,
          };
          https.get(url, options, (res) => {
                  // Follow redirects
                          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                                    return fetchURL(res.headers.location, attempt).then(resolve).catch(reject);
                          }
                  if (res.statusCode === 429 && attempt < 3) {
                            // Rate limited — wait 5s and retry
                    console.log(`Rate limited (429), retrying in 5s... (attempt ${attempt})`);
                            setTimeout(() => fetchURL(url, attempt + 1).then(resolve).catch(reject), 5000);
                            return;
                  }
                  if (res.statusCode !== 200) {
                            return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                  }
                  let data = '';
                  res.on('data', c => data += c);
                  res.on('end', () => {
                            // FantasyPros sometimes returns an HTML error page instead of CSV
                                 if (data.trimStart().startsWith('<')) {
                                             return reject(new Error('Got HTML instead of CSV — likely blocked or rate-limited'));
                                 }
                            resolve(data);
                  });
          }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')));
    });
}

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

function parseFantasyProsCSV(csv) {
    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length < 2) throw new Error('CSV too short — fetch may have failed');

  // Parse header to find column indices
  const header = parseCSVLine(lines[0]);
    console.log('CSV headers:', header.join(' | '));

  // Find Underdog ADP column (UDFT or UND or Underdog)
  const underdogCol = header.findIndex(h =>
        /udft|underdog|und/i.test(h)
                                         );
    // Fallback to AVG column
  const avgCol = header.findIndex(h => /avg/i.test(h));
    const adpCol = underdogCol >= 0 ? underdogCol : avgCol >= 0 ? avgCol : 3;

  console.log(`Using column ${adpCol} (${header[adpCol]}) for ADP`);

  const players = [];
    for (let i = 1; i < lines.length; i++) {
          const parts = parseCSVLine(lines[i]);
          if (parts.length < 3) continue;

      // FantasyPros format: Rank | "Name TEAM (BYE)" | POS | adp cols...
      const playerField = parts[1] || '';
          const pos = (parts[2] || '').toUpperCase().trim();

      // Only include fantasy-relevant positions
      if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;

      // Extract bye week from "(N)" in the player field
      const byeMatch = playerField.match(/\((\d+)\)/);
          const bye = byeMatch ? parseInt(byeMatch[1]) : 9;

      // Extract team abbreviation (2-3 uppercase letters before the bye)
      const teamMatch = playerField.match(/([A-Z]{2,3})\s*(?:\(\d+\))?$/);
          const team = teamMatch ? teamMatch[1] : 'FA';

      // Extract player name (everything before team)
      const name = playerField
            .replace(/\s+[A-Z]{2,3}\s*(?:\(\d+\))?$/, '')
            .replace(/\s+$/, '')
            .trim();

      if (!name || name.length < 2) continue;

      // Parse ADP
      const adpRaw = parts[adpCol] || parts[parts.length - 1] || '';
          const adp = parseFloat(adpRaw);
          if (isNaN(adp)) continue;

      players.push([name, pos, team, adp, bye]);
    }

  return players;
}

function buildPlayersFile(players, dateStr) {
    // Sort by ADP
  players.sort((a, b) => a[3] - b[3]);

  // Format as compact RAW array (same format as existing)
  const rawLines = [];
    for (let i = 0; i < players.length; i += 3) {
          const chunk = players.slice(i, i + 3).map(p =>
                  `["${p[0]}","${p[1]}","${p[2]}",${p[3]}]`
                                                        ).join(',');
          rawLines.push('  ' + chunk);
    }

  return `// AUTO-GENERATED — do not edit manually
  // Updated: ${dateStr} via FantasyPros Best Ball/Underdog ADP
  // Re-run: node scripts/update-adp.js
  const RAW = [
  ${rawLines.join(',\n')},
  ];

  const BYE_WEEKS = ${JSON.stringify(BYE_WEEKS, null, 2)};

  module.exports = { RAW, BYE_WEEKS };
  `;
}

async function main() {
    console.log('=== COPILOT ADP Updater ===');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Fetching: ${ADP_URL}`);

  let players;
    try {
          const csv = await fetchURL(ADP_URL);
          console.log(`Received ${csv.length} bytes`);
          players = parseFantasyProsCSV(csv);
          console.log(`Parsed ${players.length} players`);
    } catch (err) {
          console.error(`Fetch failed: ${err.message}`);
          console.log('Keeping existing player data — no changes made');
          process.exit(0); // Exit cleanly so GitHub Action does not fail the build
    }

  if (players.length < 50) {
        console.error(`Only got ${players.length} players — suspiciously low. Aborting.`);
        process.exit(0);
  }

  const dateStr = new Date().toISOString().split('T')[0];
    const fileContent = buildPlayersFile(players, dateStr);

  fs.writeFileSync(PLAYERS_FILE, fileContent, 'utf8');
    console.log(`Written: ${PLAYERS_FILE}`);

  // Rebuild
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
