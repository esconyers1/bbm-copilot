// Vercel serverless proxy — FantasyPros Best Ball ADP (Underdog column)
// Best ball ADP differs materially from season-long: QBs go earlier, roster construction differs.
// Source: fantasypros.com/nfl/adp/best-ball-overall.php (free, no auth)
// Edge-cached 1 hour; stale-while-revalidate 24h.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

  try {
        const csv = await fetchFantasyProsCSV();
        const players = parseCSV(csv);

      if (players.length < 50) {
              throw new Error(`Too few players parsed (${players.length}) — FantasyPros may have changed format`);
      }

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.json({
                players,
                source: 'fantasypros.com/best-ball',
                year: new Date().getFullYear(),
                count: players.length,
                fetched: Date.now(),
        });
  } catch (err) {
        return res.status(500).json({ error: err.message });
  }
}

async function fetchFantasyProsCSV() {
    const url = 'https://www.fantasypros.com/nfl/adp/best-ball-overall.php?export=csv';
    const r = await fetch(url, {
          headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Referer': 'https://www.fantasypros.com/nfl/adp/',
          },
    });
    if (!r.ok) throw new Error(`FantasyPros returned ${r.status}`);
    const text = await r.text();
    if (text.trimStart().startsWith('<')) throw new Error('Got HTML instead of CSV — likely blocked');
    return text;
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

function parseCSV(csv) {
    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length < 2) throw new Error('CSV empty or malformed');

  const header = parseCSVLine(lines[0]);

  // Prefer Underdog column (UDFT / UND / Underdog) — best ball specific ADP
  // Fall back to AVG if not present
  const underdogCol = header.findIndex(h => /udft|underdog|und/i.test(h));
    const avgCol      = header.findIndex(h => /\bavg\b/i.test(h));
    const adpCol      = underdogCol >= 0 ? underdogCol : avgCol >= 0 ? avgCol : 3;

  const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
    const players = [];

  for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 3) continue;

      // FantasyPros format: Rank | "Name TEAM (BYE)" | POS | ...adp cols
      const playerField = parts[1] || '';
        const pos = (parts[2] || '').toUpperCase().trim();

      if (!POSITIONS.has(pos)) continue;

      // Extract team (2-3 uppercase letters before the optional bye week)
      const teamMatch = playerField.match(/([A-Z]{2,3})\s*(?:\(\d+\))?$/);
        const team = teamMatch ? teamMatch[1] : 'FA';

      // Extract name (everything before the team abbrev)
      const name = playerField
          .replace(/\s+[A-Z]{2,3}\s*(?:\(\d+\))?$/, '')
          .trim();

      if (!name || name.length < 2) continue;

      const adp = parseFloat(parts[adpCol] || '');
        if (isNaN(adp)) continue;

      players.push({ name, pos, team, adp });
  }

  return players.sort((a, b) => a.adp - b.adp);
}
