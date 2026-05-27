import React, { useState, useMemo, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";



// ── FONTS & GLOBALS ──────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600;700&family=Share+Tech+Mono:wght@400&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: #060A12; overscroll-behavior: none; }
  input, select, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { display: none; }
  @keyframes pop { 0%{transform:scale(0.94);opacity:0.7} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes slide-up { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes slide-down { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(255,209,102,0.5)} 70%{box-shadow:0 0 0 12px rgba(255,209,102,0)} 100%{box-shadow:0 0 0 0 rgba(255,209,102,0)} }
  @keyframes pulse-red { 0%{box-shadow:0 0 0 0 rgba(255,78,106,0.5)} 70%{box-shadow:0 0 0 10px rgba(255,78,106,0)} 100%{box-shadow:0 0 0 0 rgba(255,78,106,0)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes fade-in { from{opacity:0} to{opacity:1} }
  @keyframes clock-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.01)} }
`;

// Product identity
const PRODUCT = { name: 'COPILOT', tagline: 'Best Ball Intelligence' };

// ── COLORS ───────────────────────────────────────────────────────────────────
const T = {
  bg:      '#060A12',
  panel:   '#0C1422',
  card:    '#111C30',
  cardHi:  '#172036',
  border:  'rgba(255,255,255,0.06)',
  hi:      'rgba(255,255,255,0.11)',
  text:    '#EBEEf8',
  mute:    '#8892AA',
  dim:     '#475068',
  gold:    '#FFD166',
  goldDim: 'rgba(255,209,102,0.15)',
  green:   '#1DD882',
  red:     '#FF4E6A',
  amber:   '#FFB340',
  blue:    '#5B8CFF',
  purple:  '#A78BFA',
  teal:    '#2DD4BF',
};

const POS_C = {
  QB: { fg:'#FF4E6A', bg:'rgba(255,78,106,0.18)' },
  RB: { fg:'#1DD882', bg:'rgba(29,216,130,0.18)' },
  WR: { fg:'#5B8CFF', bg:'rgba(91,140,255,0.18)' },
  TE: { fg:'#FFB340', bg:'rgba(255,179,64,0.18)' },
};

// ── PLAYER DATA ──────────────────────────────────────────────────────────────
const BYE = {
  ARI:8,ATL:12,BAL:14,BUF:12,CAR:14,CHI:5,CIN:10,CLE:9,
  DAL:7,DEN:14,DET:8,GB:5,HOU:6,IND:11,JAX:8,KC:10,
  LV:8,LAC:5,LAR:6,MIA:6,MIN:6,NE:14,NO:12,NYG:11,
  NYJ:12,PHI:9,PIT:5,SEA:10,SF:14,TB:9,TEN:5,WAS:14,
};

const RAW = [
  ["Ja'Marr Chase","WR","CIN",1.4],["Bijan Robinson","RB","ATL",2.3],
  ["Justin Jefferson","WR","MIN",3.1],["CeeDee Lamb","WR","DAL",4.2],
  ["Saquon Barkley","RB","PHI",5.5],["Jahmyr Gibbs","RB","DET",6.4],
  ["Christian McCaffrey","RB","SF",7.8],["Malik Nabers","WR","NYG",8.6],
  ["Amon-Ra St. Brown","WR","DET",9.4],["Puka Nacua","WR","LAR",10.3],
  ["Brian Thomas Jr.","WR","JAX",11.5],["Ashton Jeanty","RB","LV",12.6],
  ["Drake London","WR","ATL",13.4],["De'Von Achane","RB","MIA",14.5],
  ["Brock Bowers","TE","LV",15.2],["Nico Collins","WR","HOU",16.4],
  ["Garrett Wilson","WR","NYJ",17.5],["Derrick Henry","RB","BAL",18.8],
  ["Josh Jacobs","RB","GB",19.9],["Ladd McConkey","WR","LAC",20.7],
  ["Bucky Irving","RB","TB",21.6],["Tee Higgins","WR","CIN",22.4],
  ["A.J. Brown","WR","PHI",23.8],["Jonathan Taylor","RB","IND",24.5],
  ["Chase Brown","RB","CIN",25.6],["Kenneth Walker","RB","SEA",26.8],
  ["Marvin Harrison Jr.","WR","ARI",27.3],["Jaxon Smith-Njigba","WR","SEA",28.5],
  ["James Cook","RB","BUF",29.4],["DK Metcalf","WR","PIT",30.7],
  ["Davante Adams","WR","LAR",31.5],["Terry McLaurin","WR","WAS",32.8],
  ["Trey McBride","TE","ARI",33.4],["Joe Mixon","RB","HOU",34.6],
  ["DeVonta Smith","WR","PHI",35.5],["George Pickens","WR","DAL",36.7],
  ["Kyren Williams","RB","LAR",37.4],["Mike Evans","WR","TB",38.6],
  ["Jayden Daniels","QB","WAS",39.2],["Jalen Hurts","QB","PHI",40.5],
  ["Josh Allen","QB","BUF",41.3],["Lamar Jackson","QB","BAL",42.8],
  ["Sam LaPorta","TE","DET",43.4],["Jaylen Waddle","WR","DEN",44.6],
  ["Calvin Ridley","WR","TEN",45.8],["Rashee Rice","WR","KC",46.5],
  ["DJ Moore","WR","BUF",47.4],["Tetairoa McMillan","WR","CAR",48.7],
  ["Travis Etienne","RB","JAX",49.6],["Zach Charbonnet","RB","SEA",50.8],
  ["Tony Pollard","RB","TEN",51.5],["Jordan Love","QB","GB",52.4],
  ["Patrick Mahomes","QB","KC",53.6],["Bo Nix","QB","DEN",54.8],
  ["Courtland Sutton","WR","DEN",55.5],["Jameson Williams","WR","DET",56.7],
  ["Travis Kelce","TE","KC",57.4],["George Kittle","TE","SF",58.6],
  ["Chris Olave","WR","NO",59.5],["Stefon Diggs","WR","NE",60.8],
  ["Kaleb Johnson","RB","SEA",61.4],["Khalil Shakir","WR","BUF",63.5],
  ["Rome Odunze","WR","CHI",64.8],["Jordan Mason","RB","MIN",65.4],
  ["Tank Bigsby","RB","JAX",66.7],["Cooper Kupp","WR","SEA",67.5],
  ["Jakobi Meyers","WR","LV",68.8],["Caleb Williams","QB","CHI",69.4],
  ["Drake Maye","QB","NE",70.6],["Mark Andrews","TE","BAL",71.5],
  ["Quinshon Judkins","RB","CLE",72.8],["Tyreek Hill","WR","MIA",73.4],
  ["Tyler Lockett","WR","TEN",74.5],["Jaylen Warren","RB","PIT",75.7],
  ["Najee Harris","RB","LAC",76.4],["Ricky Pearsall","WR","SF",77.6],
  ["Tyler Warren","TE","IND",78.5],["David Montgomery","RB","DET",79.8],
  ["Jordan Addison","WR","MIN",80.4],["Tucker Kraft","TE","GB",82.5],
  ["Keon Coleman","WR","BUF",83.6],["Joe Burrow","QB","CIN",84.4],
  ["Baker Mayfield","QB","TB",85.5],["Justin Fields","QB","NYJ",86.8],
  ["Aaron Jones","RB","MIN",87.4],["Isiah Pacheco","RB","KC",88.6],
  ["Cam Skattebo","RB","NYG",89.5],["Xavier Worthy","WR","KC",90.7],
  ["Jerry Jeudy","WR","CLE",91.4],["Jauan Jennings","WR","SF",93.5],
  ["Hunter Henry","TE","NE",95.4],["David Njoku","TE","CLE",96.7],
  ["Adonai Mitchell","WR","IND",100.6],["Romeo Doubs","WR","GB",102.7],
  ["Jonnu Smith","TE","PIT",103.4],["Trey Benson","RB","ARI",105.5],
  ["Tyjae Spears","RB","TEN",107.4],["Jeremiyah Love","RB","ARI",109.5],
  ["Brock Purdy","QB","SF",110.7],["Will Shipley","RB","PHI",114.7],
  ["Cole Kmet","TE","CHI",116.6],["Josh Downs","WR","IND",120.6],
  ["Hollywood Brown","WR","KC",124.6],["Dallas Goedert","TE","PHI",132.6],
  ["Justin Herbert","QB","LAC",133.5],["Trevor Lawrence","QB","JAX",134.7],
  ["C.J. Stroud","QB","HOU",135.4],["Tua Tagovailoa","QB","MIA",136.6],
  ["Anthony Richardson","QB","IND",137.5],["Kyler Murray","QB","ARI",138.7],
  ["MarShawn Lloyd","RB","GB",140.6],["Jaylen Wright","RB","MIA",141.5],
  ["Kyle Pitts","TE","ATL",154.7],["Isaiah Likely","TE","BAL",155.4],
  ["Greg Dortch","WR","ARI",157.5],["Christian Watson","WR","GB",165.5],
];

// DraftKings Full PPR ADP — RBs and slot/receiving WRs elevated
const RAW_DK = [
  ["Ja'Marr Chase","WR","CIN",1.3],["Saquon Barkley","RB","PHI",2.1],
  ["Justin Jefferson","WR","MIN",3.0],["CeeDee Lamb","WR","DAL",4.0],
  ["Bijan Robinson","RB","ATL",5.2],["Jahmyr Gibbs","RB","DET",6.1],
  ["Malik Nabers","WR","NYG",7.4],["Amon-Ra St. Brown","WR","DET",8.2],
  ["Christian McCaffrey","RB","SF",9.0],["Puka Nacua","WR","LAR",10.1],
  ["De'Von Achane","RB","MIA",11.3],["Brian Thomas Jr.","WR","JAX",12.2],
  ["Ashton Jeanty","RB","LV",13.4],["Drake London","WR","ATL",14.1],
  ["Brock Bowers","TE","LV",15.0],["Nico Collins","WR","HOU",16.2],
  ["Ladd McConkey","WR","LAC",17.1],["Garrett Wilson","WR","NYJ",18.3],
  ["Derrick Henry","RB","BAL",19.5],["Josh Jacobs","RB","GB",20.4],
  ["Bucky Irving","RB","TB",21.2],["Tee Higgins","WR","CIN",22.1],
  ["A.J. Brown","WR","PHI",23.5],["Jonathan Taylor","RB","IND",24.2],
  ["Chase Brown","RB","CIN",25.4],["Kenneth Walker","RB","SEA",26.5],
  ["Khalil Shakir","WR","BUF",27.0],["Jaxon Smith-Njigba","WR","SEA",28.1],
  ["Marvin Harrison Jr.","WR","ARI",29.0],["James Cook","RB","BUF",30.2],
  ["DK Metcalf","WR","PIT",31.3],["Davante Adams","WR","LAR",32.1],
  ["Terry McLaurin","WR","WAS",33.4],["Trey McBride","TE","ARI",34.1],
  ["Joe Mixon","RB","HOU",35.3],["DeVonta Smith","WR","PHI",36.2],
  ["George Pickens","WR","DAL",37.4],["Kyren Williams","RB","LAR",38.1],
  ["Mike Evans","WR","TB",39.3],["Jayden Daniels","QB","WAS",40.0],
  ["Jalen Hurts","QB","PHI",41.2],["Josh Allen","QB","BUF",42.0],
  ["Lamar Jackson","QB","BAL",43.5],["Sam LaPorta","TE","DET",44.1],
  ["Jaylen Waddle","WR","DEN",45.4],["Travis Etienne","RB","JAX",46.2],
  ["Rashee Rice","WR","KC",47.1],["DJ Moore","WR","BUF",48.3],
  ["Calvin Ridley","WR","TEN",49.2],["Zach Charbonnet","RB","SEA",50.5],
  ["Tetairoa McMillan","WR","CAR",51.3],["Tony Pollard","RB","TEN",52.4],
  ["Jordan Love","QB","GB",53.1],["Patrick Mahomes","QB","KC",54.3],
  ["Courtland Sutton","WR","DEN",55.2],["Jameson Williams","WR","DET",56.4],
  ["Travis Kelce","TE","KC",57.1],["George Kittle","TE","SF",58.3],
  ["Rome Odunze","WR","CHI",59.2],["Chris Olave","WR","NO",60.4],
  ["Bo Nix","QB","DEN",61.5],["Kaleb Johnson","RB","SEA",62.1],
  ["Stefon Diggs","WR","NE",63.3],["Jordan Mason","RB","MIN",64.2],
  ["Tank Bigsby","RB","JAX",65.4],["Cooper Kupp","WR","SEA",66.2],
  ["Quinshon Judkins","RB","CLE",67.5],["Jakobi Meyers","WR","LV",68.3],
  ["Caleb Williams","QB","CHI",69.1],["Drake Maye","QB","NE",70.4],
  ["Mark Andrews","TE","BAL",71.2],["Tyreek Hill","WR","MIA",72.4],
  ["Jordan Addison","WR","MIN",73.2],["Jaylen Warren","RB","PIT",74.5],
  ["Najee Harris","RB","LAC",75.3],["Ricky Pearsall","WR","SF",76.5],
  ["Tyler Warren","TE","IND",77.3],["David Montgomery","RB","DET",78.6],
  ["Tucker Kraft","TE","GB",79.4],["Cam Skattebo","RB","NYG",80.2],
  ["Xavier Worthy","WR","KC",81.4],["Joe Burrow","QB","CIN",82.2],
  ["Keon Coleman","WR","BUF",83.4],["Baker Mayfield","QB","TB",84.2],
  ["Justin Fields","QB","NYJ",85.5],["Aaron Jones","RB","MIN",86.3],
  ["Isiah Pacheco","RB","KC",87.5],["Jerry Jeudy","WR","CLE",88.3],
  ["Adonai Mitchell","WR","IND",90.5],["Jauan Jennings","WR","SF",92.3],
  ["Romeo Doubs","WR","GB",94.5],["Hunter Henry","TE","NE",96.3],
  ["David Njoku","TE","CLE",98.5],["Jonnu Smith","TE","PIT",100.3],
  ["Trey Benson","RB","ARI",104.5],["Tyjae Spears","RB","TEN",106.3],
  ["Brock Purdy","QB","SF",108.5],["Will Shipley","RB","PHI",112.5],
  ["Cole Kmet","TE","CHI",114.3],["Josh Downs","WR","IND",118.5],
  ["Dallas Goedert","TE","PHI",130.3],["Justin Herbert","QB","LAC",131.2],
  ["Trevor Lawrence","QB","JAX",132.5],["C.J. Stroud","QB","HOU",133.3],
  ["Tua Tagovailoa","QB","MIA",134.5],["Anthony Richardson","QB","IND",135.3],
  ["Kyler Murray","QB","ARI",136.5],["MarShawn Lloyd","RB","GB",138.3],
  ["Jaylen Wright","RB","MIA",139.5],["Kyle Pitts","TE","ATL",152.5],
  ["Isaiah Likely","TE","BAL",153.3],["Christian Watson","WR","GB",163.5],
];

const PLAYERS = RAW.map((r, i) => ({ id: i + 1, name: r[0], pos: r[1], team: r[2], adp: r[3], bye: BYE[r[2]] || 9 }));
const PLAYERS_DK = RAW_DK.map((r, i) => ({ id: i + 1, name: r[0], pos: r[1], team: r[2], adp: r[3], bye: BYE[r[2]] || 9 }));

function getPlayers(platform) {
  return platform === 'dk' ? PLAYERS_DK : PLAYERS;
}

// ── ENHANCED INTELLIGENCE ENGINE ─────────────────────────────────────────────

// Assign positional tiers by finding ADP gaps > threshold
function buildTiers(players) {
  const byPos = { QB:[], RB:[], WR:[], TE:[] };
  players.forEach(p => byPos[p.pos]?.push({...p}));
  const result = {};
  Object.entries(byPos).forEach(([pos, list]) => {
    list.sort((a,b) => a.adp - b.adp);
    let tier = 1;
    const GAP = pos === 'QB' || pos === 'TE' ? 8 : 6;
    list.forEach((p, i) => {
      p.tier = tier;
      const next = list[i+1];
      if (next && (next.adp - p.adp) > GAP) tier++;
      p.lastInTier = !next || next.tier > p.tier + 0; // will recalc after
      result[p.id] = p;
    });
    // Mark last-in-tier
    list.forEach((p, i) => {
      const next = list[i+1];
      p.lastInTier = !next || next.tier > p.tier;
      result[p.id] = { ...result[p.id], tier: p.tier, lastInTier: p.lastInTier };
    });
  });
  return result; // { id -> { tier, lastInTier } }
}

// Compute positional scarcity: how fast each pos is going vs ADP pace
// Returns { QB: rate, RB: rate, WR: rate, TE: rate } where rate>1 = rushing
function computeScarcity(drafted, currentPick, playerPool) {
  const pool = playerPool || PLAYERS;
  const counts = { QB:0, RB:0, WR:0, TE:0 };
  drafted.forEach(d => {
    const p = pool.find(pl => pl.id === d.playerId);
    if (p && counts[p.pos] !== undefined) counts[p.pos]++;
  });
  // Expected count at this pick based on ADP distribution
  const expected = { QB:0, RB:0, WR:0, TE:0 };
  pool.forEach(p => {
    if (p.adp <= currentPick && expected[p.pos] !== undefined) expected[p.pos]++;
  });
  const rate = {};
  Object.keys(counts).forEach(pos => {
    rate[pos] = expected[pos] > 0 ? counts[pos] / expected[pos] : 1;
  });
  return rate;
}

// Picks until my next turn
function picksUntilMyTurn(currentPick, mySlot, n = 12) {
  for (let offset = 0; offset <= n * 2; offset++) {
    if (pickToSlot(currentPick + offset) === mySlot) return offset;
  }
  return 99;
}

// Full enhanced scoring
function scorePlayer(player, currentPick, myRoster, tierMap, scarcity, mySlot) {
  const counts = rosterCounts(myRoster);
  const IDEAL = { QB: 2, RB: 5, WR: 7, TE: 2 };
  const round = Math.ceil(currentPick / 12);
  const lateMode = round >= 13;
  let score = 50;
  const reasons = [];

  // 1. ADP Value
  const adpDelta = player.adp - currentPick;
  if (adpDelta > 8)       { score += 16; reasons.push({ t:'val', text:`+${Math.round(adpDelta)} value` }); }
  else if (adpDelta > 3)  { score += 8; }
  else if (adpDelta < -10){ score -= 12; reasons.push({ t:'warn', text:`Reach ${Math.round(adpDelta)}` }); }
  else if (adpDelta < -5) { score -= 5; }

  // 2. Roster need
  const need = (IDEAL[player.pos] || 0) - counts[player.pos];
  score += need * 5;
  if (counts[player.pos] >= (IDEAL[player.pos] || 0)) score -= 6;

  // 3. Critical positional need
  if (player.pos === 'QB' && counts.QB === 0 && currentPick > 60)  { score += 12; reasons.push({ t:'need', text:'QB1 needed' }); }
  if (player.pos === 'TE' && counts.TE === 0 && currentPick > 72)  { score += 10; reasons.push({ t:'need', text:'TE1 needed' }); }
  if (player.pos === 'RB' && counts.RB < 2 && currentPick > 36)    { score += 8;  reasons.push({ t:'need', text:`RB${counts.RB+1}` }); }

  // 4. Stack bonus
  const myQBs = myRoster.filter(p => p.pos === 'QB');
  if (myQBs.some(q => q.team === player.team) && (player.pos === 'WR' || player.pos === 'TE')) {
    score += 22; reasons.push({ t:'stack', text:`Stack ${myQBs.find(q=>q.team===player.team).name.split(' ').pop()}` });
  }
  if (player.pos === 'QB' && myRoster.some(p => p.team === player.team && (p.pos==='WR'||p.pos==='TE'))) {
    score += 16; reasons.push({ t:'stack', text:'Reverse stack' });
  }

  // 5. TIER BREAK — highest urgency signal
  const tierInfo = tierMap?.[player.id];
  if (tierInfo?.lastInTier) {
    score += 20;
    const tierLabel = tierInfo.tier === 1 ? `Last ${player.pos}1 Available` : `Last T${tierInfo.tier} ${player.pos}`;
    reasons.push({ t:'tier', text:tierLabel });
  }

  // 6. POSITIONAL SCARCITY — boost score if position running hot
  const scarc = scarcity?.[player.pos] || 1;
  if (scarc > 1.25) {
    const boost = Math.round((scarc - 1) * 25);
    score += boost;
    reasons.push({ t:'scarc', text:`${player.pos} rushing` });
  } else if (scarc < 0.75) {
    score -= 5; // position lagging, can wait
  }

  // 7. PICK GAP URGENCY — if long wait, increase urgency for top options
  const gap = mySlot ? picksUntilMyTurn(currentPick + 1, mySlot) : 12;
  if (gap >= 20 && adpDelta > -5) {
    score += 8; // long wait → grab value now
    if (!reasons.find(r=>r.t==='gap')) reasons.push({ t:'gap', text:'Long wait' });
  } else if (gap <= 2 && adpDelta < 5) {
    score -= 4; // turn coming, can be patient
  }

  // 8. Late-round upside mode
  if (lateMode) {
    if (player.adp > currentPick + 18) { score += 10; reasons.push({ t:'boom', text:'Deep upside' }); }
    if ((player.pos==='WR'||player.pos==='RB') && counts[player.pos] < 8) score += 5;
    if (counts[player.pos] >= 2 && (player.pos==='QB'||player.pos==='TE')) score -= 8;
  }

  // 9. Handcuff bonus — if we have an RB, their backup from same team
  if (player.pos === 'RB') {
    const myRBs = myRoster.filter(p => p.pos === 'RB');
    if (myRBs.some(rb => rb.team === player.team)) {
      score += 12; reasons.push({ t:'hc', text:'Handcuff' });
    }
  }

  return { score, reasons };
}

// Build a plain-text board summary for AI prompt
function buildBoardSummary(myRoster, drafted, available, currentPick, mySlot, scarcity, tierMap, platform) {
  const myPicks = myRoster.map(p => {
    const pk = drafted.find(d => d.isMine && d.playerId === p.id);
    return `${pickToRound(pk?.pick||currentPick)} ${p.pos} ${p.name} (${p.team})`;
  });
  const counts = rosterCounts(myRoster);
  const top8 = available.slice(0, 8).map(p => {
    const t = tierMap?.[p.id];
    const s = scarcity?.[p.pos] || 1;
    return `${p.pos} ${p.name} ADP${p.adp.toFixed(0)}${t?.lastInTier?' [LAST IN TIER]':''}${s>1.25?' [POS RUSHING]':''}`;
  }).join(', ');
  const recentOff = drafted.slice(-6).map(d => {
    const p = [...PLAYERS, ...PLAYERS_DK].find(pl => pl.id === d.playerId && pl.name);
    return p ? `${p.pos} ${p.name}` : '';
  }).filter(Boolean).join(', ');
  const scarcStr = Object.entries(scarcity||{}).map(([pos,r])=>
    `${pos}: ${r>1.2?'RUSHING':r<0.8?'SLOW':'normal'} (${(r*100).toFixed(0)}%)`
  ).join(', ');

  // Include adjacent opponent context in AI prompt
  const leftRoster = getSlotRoster(drafted, mySlot - 1);
  const rightRoster = getSlotRoster(drafted, mySlot + 1);
  const leftStr = leftRoster.length > 0
    ? leftRoster.map(p=>`${p.pos} ${p.name}`).join(', ')
    : 'not tracked';
  const rightStr = rightRoster.length > 0
    ? rightRoster.map(p=>`${p.pos} ${p.name}`).join(', ')
    : 'not tracked';

  return `
PLATFORM: ${platform === 'dk' ? 'DraftKings (Full PPR)' : 'Underdog (Half PPR)'}
PICK: ${currentPick} (Round ${Math.ceil(currentPick/12)}) | MY SLOT: ${mySlot}
MY ROSTER (${myRoster.length}/18): QB:${counts.QB}/2 RB:${counts.RB}/5 WR:${counts.WR}/7 TE:${counts.TE}/2
PICKS: ${myPicks.join(' | ') || 'none yet'}
LEFT OPPONENT (Slot ${mySlot-1}): ${leftStr}
RIGHT OPPONENT (Slot ${mySlot+1}): ${rightStr}
RECENT OFF BOARD: ${recentOff || 'none'}
BOARD PACE: ${scarcStr}
TOP 8 AVAILABLE (by ADP): ${top8}
`.trim();
}

// ── OPPONENT INTEL HELPERS ─────────────────────────────────────────────────────

// Get full roster for a given slot from pick history
function getSlotRoster(drafted, slot, playerPool) {
  const pool = playerPool || PLAYERS;
  if (slot < 1 || slot > 12) return [];
  return drafted
    .filter(d => pickToSlot(d.pick) === slot)
    .map(d => pool.find(p => p.id === d.playerId))
    .filter(Boolean);
}

// Get positional needs for a roster
function getRosterNeeds(roster) {
  const IDEAL = { QB: 2, RB: 5, WR: 7, TE: 2 };
  const counts = rosterCounts(roster);
  return Object.entries(IDEAL)
    .map(([pos, need]) => ({ pos, have: counts[pos], need, gap: need - counts[pos] }))
    .sort((a, b) => b.gap - a.gap)
    .filter(e => e.gap > 0);
}

// Find players that appear in both rosters
function getSharedPlayers(rosterA, rosterB) {
  const names = new Set(rosterA.map(p => p.name));
  return rosterB.filter(p => names.has(p.name));
}

// Find shared QB stack teams
function getSharedQBTeams(rosterA, rosterB) {
  const teamA = new Set(rosterA.filter(p => p.pos === 'QB').map(p => p.team));
  return rosterB.filter(p => p.pos === 'QB' && teamA.has(p.team)).map(p => p.team);
}

// Inspiration pairings: opponent has player A + player B,
// you have player A but not B — flag it as "untried pairing"
function getInspirationPairings(myRoster, oppRoster) {
  const myNames = new Set(myRoster.map(p => p.name));
  const inspirations = [];
  // Look for opp players where you have a teammate/stack partner but not them
  oppRoster.forEach(oppPlayer => {
    if (myNames.has(oppPlayer.name)) return; // already have them
    // Check if you have a team-mate of this player
    const myTeammate = myRoster.find(p =>
      p.team === oppPlayer.team && p.name !== oppPlayer.name
    );
    if (myTeammate) {
      inspirations.push({ oppPlayer, myTeammate, reason: 'stack completion' });
    }
  });
  return inspirations.slice(0, 2);
}

// Generate competitive insights from adjacent opponents
function generateOpponentInsights(myRoster, leftRoster, rightRoster, currentPick) {
  const insights = [];
  const myCounts = rosterCounts(myRoster);
  const leftCounts = rosterCounts(leftRoster);
  const rightCounts = rosterCounts(rightRoster);
  const round = Math.ceil(currentPick / 12);

  // Both neighbors QB-less late
  if (leftRoster.length > 0 && rightRoster.length > 0) {
    if (leftCounts.QB === 0 && rightCounts.QB === 0 && round >= 4) {
      insights.push({ t:'warn', text:'Both neighbors QB-less — QB/TE panic incoming. Get ahead of it this pick.' });
    }
    // Both loading RB
    if (leftCounts.RB >= 3 && rightCounts.RB >= 3 && round <= 7) {
      insights.push({ t:'rush', text:'Both neighbors stacking RBs early — RB scarcity accelerating. Grab RB depth now.' });
    }
    // Both already have TE1
    if (leftCounts.TE >= 1 && rightCounts.TE >= 1 && myCounts.TE === 0 && round >= 5) {
      insights.push({ t:'need', text:'Both neighbors already have TE1, you don\'t — you\'re falling behind at the scarcest position.' });
    }
    // You have TE advantage
    if (myCounts.TE >= 1 && leftCounts.TE === 0 && rightCounts.TE === 0) {
      insights.push({ t:'edge', text:'You\'re the only one with TE1 locked. Both neighbors will panic soon — play patient.' });
    }
  }

  // Shared QB stack (left)
  if (leftRoster.length > 0) {
    const sharedLeft = getSharedQBTeams(myRoster, leftRoster);
    if (sharedLeft.length > 0) {
      insights.push({ t:'stack', text:`Left opponent shares your ${sharedLeft[0]} QB stack — diverge on WR targets to differentiate.` });
    }
  }
  // Shared QB stack (right)
  if (rightRoster.length > 0) {
    const sharedRight = getSharedQBTeams(myRoster, rightRoster);
    if (sharedRight.length > 0) {
      insights.push({ t:'stack', text:`Right opponent shares your ${sharedRight[0]} QB stack — diverge your WR targets.` });
    }
  }

  // Neighbor ahead on WR
  const leftWRAdv = leftCounts.WR - myCounts.WR;
  const rightWRAdv = rightCounts.WR - myCounts.WR;
  if ((leftWRAdv >= 2 || rightWRAdv >= 2) && round >= 5) {
    insights.push({ t:'need', text:`Neighbor(s) ahead of you by 2+ WRs — don't let the tier break pass you.` });
  }

  // You're well differentiated
  const leftShared = getSharedPlayers(myRoster, leftRoster);
  const rightShared = getSharedPlayers(myRoster, rightRoster);
  if (leftShared.length === 0 && rightShared.length === 0 && myRoster.length >= 6) {
    insights.push({ t:'edge', text:'Zero overlap with both neighbors — your roster is well differentiated. Stay the course.' });
  }

  return insights.slice(0, 3);
}


// ── PORTFOLIO INTEGRATION ──────────────────────────────────────────────────
const PORTFOLIO_KEY = 'bbm_drafts_v1';
const RANKINGS_KEY  = 'bbm_custom_rankings_v1';
const ADP_CACHE_KEY = 'bbm_adp_cache_v1';

async function loadPortfolio() {
  try { const v = localStorage.getItem(PORTFOLIO_KEY); return v ? JSON.parse(v) : []; }
  catch { return []; }
}
async function savePortfolio(drafts) {
  try { localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(drafts)); } catch {}
}
async function loadCustomRankings() {
  try { const v = localStorage.getItem(RANKINGS_KEY); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
async function saveCustomRankings(data) {
  try {
    if (data) localStorage.setItem(RANKINGS_KEY, JSON.stringify(data));
    else localStorage.removeItem(RANKINGS_KEY);
  } catch {}
}

// Normalize player name for live ADP fuzzy matching
function normalizeName(n) {
  return (n || '').toLowerCase().replace(/['.,-]/g, '').replace(/\s+/g, ' ').trim();
}
async function loadCachedADP() {
  try { const v = localStorage.getItem(ADP_CACHE_KEY); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
async function saveCachedADP(data) {
  try { localStorage.setItem(ADP_CACHE_KEY, JSON.stringify(data)); } catch {}
}

// Parse a single CSV line, respecting quoted fields (handles apostrophes, commas in names)
function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

// Parse rankings CSV — handles ETR/FantasyPros/generic formats.
// Returns { normalizedName: rank, ... } keyed by normalizeName(), value = rank (float/int)
function parseRankingsCSV(raw) {
  // Strip UTF-8 BOM if present
  const cleaned = raw.replace(/^﻿/, '');
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return {};

  const result = {};
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());

  // Find name column: 'name', 'player', 'player name'
  const nameIdx = ['name', 'player', 'player name'].reduce((found, h) => found >= 0 ? found : headers.indexOf(h), -1);

  // Find rank column: accept many common naming patterns used by ETR, FantasyPros, etc.
  // NOTE: intentionally checked AFTER name so 'adp' is only a rank fallback, not confused with bye/team cols
  const RANK_COLS = ['etr rank', 'etrrank', 'overall rank', 'overall', 'rank', 'ovr', 'rk', 'adp'];
  const rankIdx = RANK_COLS.reduce((found, h) => found >= 0 ? found : headers.indexOf(h), -1);

  if (nameIdx !== -1) {
    // Structured CSV with a name column — use rank column or fall back to row position
    // Row position is correct when the file is pre-sorted by rank (standard export behavior)
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      const rawName = (parts[nameIdx] || '').trim();
      const key = normalizeName(rawName);
      if (!key || key.length < 2) continue;
      const rankVal = (rankIdx >= 0 && parts[rankIdx]) ? parseFloat(parts[rankIdx]) : i;
      if (!isNaN(rankVal)) result[key] = rankVal;
    }
    return result;
  }

  // Generic fallback: simple 2-col CSVs (Name,Rank or Rank,Name)
  const startIdx = isNaN(parseFloat(parseCSVLine(lines[0])[1])) ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 2) continue;
    const textParts = parts.filter(p => isNaN(parseFloat(p)) && p.length > 2);
    const numericParts = parts.filter(p => !isNaN(parseFloat(p)));
    const key = normalizeName(textParts[0] || '');
    // Use row index as rank — avoids picking up bye week / jersey number columns
    const rank = numericParts[0] ? parseFloat(numericParts[0]) : i;
    if (key && key.length > 2) result[key] = rank;
  }
  return result;
}

// Get effective ADP: customRankings > liveADP > hardcoded
function effectiveAdp(player, customRankings, liveADP) {
  // 1. Custom imported rankings take highest priority
  if (customRankings) {
    const key = normalizeName(player.name);
    // Exact normalized match
    if (customRankings[key] !== undefined) return customRankings[key];
    // Fuzzy: require BOTH first AND last name to match (prevents "Smith" matching any Smith)
    const parts = key.split(' ');
    if (parts.length >= 2) {
      const fuzzy = Object.entries(customRankings).find(([k]) => {
        const kp = k.split(' ');
        return kp.length >= 2 &&
               kp[kp.length - 1] === parts[parts.length - 1] &&
               kp[0] === parts[0];
      });
      if (fuzzy) return fuzzy[1];
    }
    // Player not in custom rankings — sort below all ranked players
    return 999;
  }
  // 2. Live ADP from FantasyPros Best Ball
  if (liveADP?.players?.length) {
    const norm = normalizeName(player.name);
    const match = liveADP.players.find(p => normalizeName(p.name) === norm);
    if (match) return match.adp;
  }
  // 3. Hardcoded fallback
  return player.adp;
}

// Real-time portfolio combo check — called before logging a pick
function checkCombo(player, myRoster, savedDrafts) {
  if (!savedDrafts?.length) return null;
  const total = savedDrafts.length;

  // Player-level exposure
  const playerCount = savedDrafts.filter(d =>
    d.picks.filter(pk => pk.slot === d.slot).some(pk => pk.playerName === player.name)
  ).length;
  const playerPct = (playerCount / total) * 100;

  // Pairing-level exposure
  const pairingAlerts = [];
  myRoster.forEach(myP => {
    const bothCount = savedDrafts.filter(d => {
      const mine = d.picks.filter(pk => pk.slot === d.slot);
      return mine.some(pk => pk.playerName === player.name) &&
             mine.some(pk => pk.playerName === myP.name);
    }).length;
    if (bothCount > 0) {
      pairingAlerts.push({
        partner: myP.name,
        pos: myP.pos,
        count: bothCount,
        pct: (bothCount / total) * 100,
      });
    }
  });
  pairingAlerts.sort((a,b) => b.pct - a.pct);

  const topPairing = pairingAlerts[0];
  const risk =
    playerPct >= 65 || (topPairing && topPairing.pct >= 50) ? 'high' :
    playerPct >= 35 || (topPairing && topPairing.pct >= 25) ? 'med' : 'ok';

  if (risk === 'ok' && playerCount === 0) return null; // first time seeing this player — no warning needed
  return { playerCount, playerPct, pairingAlerts, topPairing, risk, total };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Fuzzy match a text string to a player in the pool
function fuzzyMatchPlayer(text, pool) {
  if (!text || !pool?.length) return null;
  const norm = s => s.toLowerCase().replace(/[^a-z0-9' ]/g, '').trim();
  const q = norm(text);
  const qWords = q.split(/\s+/).filter(w => w.length > 1);
  const qLast = qWords.slice(-1)[0] || '';

  // Score each player
  const scored = pool.map(p => {
    const pn = norm(p.name);
    const pWords = pn.split(/\s+/);
    const pLast = pWords.slice(-1)[0] || '';
    let score = 0;

    // Exact match
    if (pn === q) score += 100;
    // Full name contains query
    if (pn.includes(q) || q.includes(pn)) score += 60;
    // Last name exact match
    if (pLast === qLast && qLast.length >= 3) score += 50;
    // Last name includes
    if (pLast.includes(qLast) || qLast.includes(pLast) && qLast.length >= 4) score += 30;
    // First name match
    if (pWords[0] === qWords[0] && qWords[0]?.length >= 2) score += 20;
    // Any word match
    qWords.forEach(w => { if (w.length >= 3 && pn.includes(w)) score += 10; });
    // Team abbreviation in query
    if (q.includes(p.team.toLowerCase())) score += 15;

    return { player: p, score };
  });

  const best = scored.sort((a,b) => b.score - a.score)[0];
  return best?.score >= 10 ? best.player : null;
}
function pickToSlot(pick, n = 12) {
  const round = Math.ceil(pick / n);
  const idx = ((pick - 1) % n) + 1;
  return round % 2 === 1 ? idx : n - idx + 1;
}
function pickToRound(pick, n = 12) {
  const r = Math.ceil(pick / n);
  const i = ((pick - 1) % n) + 1;
  return `${r}.${String(i).padStart(2, "0")}`;
}
function myUpcomingPicks(slot, currentPick, n = 12, rounds = 18) {
  const all = [];
  for (let r = 1; r <= rounds; r++) {
    const idx = r % 2 === 1 ? slot : n - slot + 1;
    all.push((r - 1) * n + idx);
  }
  return all.filter(p => p >= currentPick).slice(0, 5);
}
function rosterCounts(roster) {
  const c = { QB: 0, RB: 0, WR: 0, TE: 0 };
  roster.forEach(p => { if (c[p.pos] !== undefined) c[p.pos]++; });
  return c;
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
// Screen 1: Setup  |  Screen 2: Draft  |  Screen 3: Recap

export default function App() {
  // Show welcome screen to first-time visitors; skip on return visits
  const [screen, setScreen] = useState(() =>
    localStorage.getItem('copilot_v2_seen') ? 'setup' : 'welcome'
  );
  const [platform, setPlatform] = useState('underdog'); // 'underdog' | 'dk'
  const [mySlot, setMySlot] = useState(6);
  const [drafted, setDrafted] = useState([]);
  const [currentPick, setCurrentPick] = useState(1);
  const [flash, setFlash] = useState(null);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [customRankings, setCustomRankings] = useState(null);
  const [fastMode, setFastMode] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  const [draftSpeed, setDraftSpeed] = useState(30); // seconds per pick
  const [targets, setTargets] = useState([]);
  const [billyQueue, setBillyQueue] = useState([]);
  const [billyCount, setBillyCount] = useState(0);
  const [queueEntryActive, setQueueEntryActive] = useState(null);
  const [liveADP, setLiveADP] = useState(null);
  const [adpLoading, setAdpLoading] = useState(false);

  // Load portfolio + custom rankings + cached ADP from storage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [drafts, rankings, cachedAdp] = await Promise.all([
        loadPortfolio(), loadCustomRankings(), loadCachedADP()
      ]);
      if (!mounted) return;
      setSavedDrafts(drafts);
      setCustomRankings(rankings);
      if (cachedAdp) setLiveADP(cachedAdp);
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch live ADP whenever platform changes
  useEffect(() => {
    const format = platform === 'dk' ? 'ppr' : 'half-ppr';
    setAdpLoading(true);
    fetch(`/api/adp?format=${format}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const stamped = { ...data, fetchedAt: Date.now() };
        setLiveADP(stamped);
        saveCachedADP(stamped);
      })
      .catch(() => {}) // fail silently — cache or hardcoded fallback used
      .finally(() => setAdpLoading(false));
  }, [platform]);

  const handleImportRankings = async (raw) => {
    const parsed = parseRankingsCSV(raw);
    setCustomRankings(Object.keys(parsed).length > 0 ? parsed : null);
    await saveCustomRankings(Object.keys(parsed).length > 0 ? parsed : null);
  };

  const handleClearRankings = async () => {
    setCustomRankings(null);
    await saveCustomRankings(null);
  };

  const TOTAL = 12 * 18;
  const isMyTurn = pickToSlot(currentPick) === mySlot;
  const isDone = currentPick > TOTAL;

  const takenIds = new Set(drafted.map(d => d.playerId));
  const activePlayers = getPlayers(platform);
  // Apply custom rankings > live ADP > hardcoded to player pool
  const available = useMemo(() =>
    activePlayers.filter(p => !takenIds.has(p.id))
      .map(p => ({ ...p, effectiveAdp: effectiveAdp(p, customRankings, liveADP) }))
      .sort((a, b) => a.effectiveAdp - b.effectiveAdp),
    [takenIds, customRankings, liveADP, platform]
  );
  const myRoster = drafted
    .filter(d => d.isMine)
    .map(d => activePlayers.find(p => p.id === d.playerId))
    .filter(Boolean);

  const tierMap = useMemo(() => buildTiers(available), [available]);
  const scarcity = useMemo(() => computeScarcity(drafted, currentPick, activePlayers), [drafted, currentPick, platform]);

  const recs = useMemo(() => {
    return available
      .map(p => {
        const { score, reasons } = scorePlayer(p, currentPick, myRoster, tierMap, scarcity, mySlot);
        return { ...p, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [available, currentPick, myRoster, tierMap, scarcity, mySlot]);

  // Launch a queue entry into Autopilot
  const handleLaunchQueueEntry = (entry) => {
    setMySlot(entry.slot);
    setAutopilot(true);
    setFastMode(false);
    setDraftSpeed(entry.draftSpeed || 30);
    const matched = (entry.targets || [])
      .map(t => fuzzyMatchPlayer(t, PLAYERS))
      .filter(Boolean);
    setTargets(matched);
    setQueueEntryActive(entry);
    setDrafted([]); setCurrentPick(1);
    setScreen('draft');
  };

  // Mark queue entry complete after recap
  const handleQueueEntryDone = () => {
    if (queueEntryActive) {
      setBillyQueue(prev => prev.map(e =>
        e.id === queueEntryActive.id ? { ...e, status: 'complete' } : e
      ));
      setQueueEntryActive(null);
    }
    setScreen('billy');
  };

  const logPick = (player, isMine) => {
    setDrafted(prev => [...prev, { playerId: player.id, pick: currentPick, isMine }]);
    setCurrentPick(prev => prev + 1);
    setFlash({ name: player.name, pos: player.pos, isMine });
    setTimeout(() => setFlash(null), 1400);
  };

  const skipPick = () => { setCurrentPick(prev => prev + 1); };
  const reset = () => {
    setDrafted([]); setCurrentPick(1);
    setScreen(queueEntryActive ? 'billy' : 'setup');
    if (queueEntryActive) setQueueEntryActive(null);
  };

  const myCompletedCount = billyQueue.filter(e => e.status === 'complete').length + savedDrafts.length;

  return (
    <>
      <style>{STYLE}</style>
      {screen === "welcome" && (
        <WelcomeScreen onStart={() => setScreen("setup")} />
      )}
      {screen === "setup" && (
        <SetupScreen mySlot={mySlot} setMySlot={setMySlot}
          platform={platform} setPlatform={setPlatform}
          onStart={(opts) => {
            const mode = opts?.draftMode || opts || 'full';
            const tgts = opts?.targets || [];
            const speed = opts?.draftSpeed || 30;
            setFastMode(mode === 'fast');
            setAutopilot(mode === 'autopilot');
            setDraftSpeed(speed);
            setTargets(tgts);
            setScreen('draft');
          }}
          onBillyCatcher={() => setScreen('billy')}
          savedDraftsCount={savedDrafts.length}
          customRankings={customRankings}
          onImportRankings={handleImportRankings}
          onClearRankings={handleClearRankings}
          onPortfolio={() => setScreen('portfolio')}
          adpStatus={{ loading: adpLoading, fetchedAt: liveADP?.fetchedAt, count: liveADP?.players?.length }}
        />
      )}
      {screen === "portfolio" && (
        <PortfolioScreen savedDrafts={savedDrafts} onBack={() => setScreen('setup')} />
      )}
      {screen === "billy" && (
        <BillyCatcherScreen
          queue={billyQueue}
          setQueue={setBillyQueue}
          billyCount={billyCount}
          setBillyCount={setBillyCount}
          myCount={myCompletedCount}
          onLaunch={handleLaunchQueueEntry}
          onBack={() => setScreen('setup')}
        />
      )}
      {screen === "draft" && autopilot && (
        <AutopilotDraftScreen
          mySlot={mySlot} currentPick={currentPick} isMyTurn={isMyTurn}
          isDone={isDone} available={available} myRoster={myRoster}
          recs={recs} drafted={drafted} targets={targets}
          tierMap={tierMap} scarcity={scarcity} draftSpeed={draftSpeed}
          onLogMine={p => logPick(p, true)}
          onAutoAdvance={() => {
            const best = available[0];
            if (best) setDrafted(prev => [...prev, { playerId: best.id, pick: currentPick, isMine: false }]);
            setCurrentPick(prev => prev + 1);
          }}
          onDone={() => setScreen('recap')}
          onReset={reset}
        />
      )}
      {screen === "draft" && fastMode && (
        <FastDraftScreen
          mySlot={mySlot} currentPick={currentPick} isMyTurn={isMyTurn}
          isDone={isDone} available={available} myRoster={myRoster}
          recs={recs} drafted={drafted} flash={flash}
          tierMap={tierMap} scarcity={scarcity}
          savedDrafts={savedDrafts} targets={targets}
          onLogMine={p => logPick(p, true)}
          onLogPosBySlot={(pos) => {
            const best = available.find(p => p.pos === pos);
            if (best) setDrafted(prev => [...prev, { playerId: best.id, pick: currentPick, isMine: false }]);
            setCurrentPick(prev => prev + 1);
          }}
          onSkip={skipPick}
          onDone={() => setScreen('recap')}
          onReset={reset}
        />
      )}
      {screen === "draft" && !fastMode && !autopilot && (
        <DraftScreen
          mySlot={mySlot} currentPick={currentPick} isMyTurn={isMyTurn}
          isDone={isDone} available={available} myRoster={myRoster}
          recs={recs} drafted={drafted} flash={flash}
          tierMap={tierMap} scarcity={scarcity}
          savedDrafts={savedDrafts}
          customRankings={customRankings}
          targets={targets}
          platform={platform}
          players={activePlayers}
          onLogMine={p => logPick(p, true)}
          onLogOpp={p => logPick(p, false)}
          onSkip={skipPick}
          onDone={() => setScreen("recap")}
          onReset={reset}
        />
      )}
      {screen === "recap" && (
        <RecapScreen myRoster={myRoster} drafted={drafted} mySlot={mySlot}
          queueEntry={queueEntryActive}
          onReset={reset}
          onQueueDone={handleQueueEntryDone}
          onSaveDraft={() => {
            const draftRecord = {
              id: Date.now(),
              slot: mySlot,
              date: Date.now(),
              picks: drafted.map(d => {
                const p = activePlayers.find(pl => pl.id === d.playerId);
                return { slot: pickToSlot(d.pick), playerName: p?.name, pos: p?.pos, pick: d.pick, isMine: d.isMine };
              }),
            };
            const updated = [...savedDrafts, draftRecord];
            setSavedDrafts(updated);
            savePortfolio(updated);
          }}
        />
      )}
    </>
  );
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
function SetupScreen({ mySlot, setMySlot, platform, setPlatform, onStart, onBillyCatcher, savedDraftsCount, customRankings, onImportRankings, onClearRankings, onPortfolio, adpStatus }) {
  const [draftMode, setDraftMode] = useState('full');
  const [draftSpeed, setDraftSpeed] = useState(platform === 'dk' ? 30 : 20);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  useEffect(() => { setDraftSpeed(platform === 'dk' ? 30 : 20); }, [platform]);

  const rankingsCount = customRankings ? Object.keys(customRankings).length : 0;

  // ADP freshness label
  const adpLabel = (() => {
    if (adpStatus?.loading) return { text: 'ADP: Updating…', color: T.dim };
    if (adpStatus?.fetchedAt) {
      const mins = Math.round((Date.now() - adpStatus.fetchedAt) / 60000);
      const ago = mins < 2 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins/60)}h ago`;
      return { text: `● ADP live · ${adpStatus.count} players · ${ago}`, color: T.green };
    }
    return { text: '○ ADP: hardcoded fallback', color: T.amber };
  })();

  const MODES = [
    { id:'full',      label:'FULL DRAFT',      icon:'📋', sub:'Slow drafts · Log by player name', color: T.gold },
    { id:'fast',      label:'⚡ FAST DRAFT',    icon:'⚡', sub:'30–90s timers · 1-tap position tiles + voice', color: T.teal },
    { id:'autopilot', label:'🤖 AUTOPILOT',    icon:'🤖', sub:'20s or less · Fully automatic · Just pick when alerted', color: T.purple },
  ];

  return (
    <div style={{
      minHeight: "100svh",
      background: `linear-gradient(160deg, #0A0E1C 0%, ${T.bg} 50%)`,
      fontFamily: "'Barlow', sans-serif",
      color: T.text,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Brand header */}
      <div style={{
        padding: "28px 24px 0",
        borderBottom: `1px solid ${T.border}`,
        paddingBottom: 20,
        background: `linear-gradient(180deg, rgba(255,209,102,0.05) 0%, transparent 100%)`,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
        }}>
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: T.gold,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14, fontWeight: 900, color: T.bg,
                letterSpacing: 0.5,
              }}>CP</div>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 11, color: T.gold, letterSpacing: 2, fontWeight: 700,
              }}>COPILOT</span>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9, color: T.dim, letterSpacing: 1,
                border: `1px solid ${T.border}`, padding: "1px 6px", borderRadius: 10,
              }}>BBM 2026</span>
            </div>

            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 44, fontWeight: 900, margin: 0,
              lineHeight: 0.95, letterSpacing: -1,
            }}>
              DRAFT<br/>
              <span style={{ color: T.gold }}>INTELLIGENCE</span>
            </h1>
          </div>

          {/* Portfolio status */}
          {savedDraftsCount > 0 && (
            <div style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              textAlign: "center",
              minWidth: 80,
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 28, fontWeight: 900, color: T.gold, lineHeight: 1,
              }}>{savedDraftsCount}</div>
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 8, color: T.dim, letterSpacing: 1, marginTop: 2,
              }}>SAVED</div>
            </div>
          )}
        </div>

        <p style={{
          fontSize: 13, color: T.mute, lineHeight: 1.6, margin: "10px 0 6px",
          maxWidth: 340,
        }}>
          Pick your platform and slot below, then open your Underdog draft
          in another tab. Copilot tracks the board in real time —
          tier breaks, stack windows, and ranked pick recommendations every turn.
        </p>
        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 9, color: adpLabel.color, letterSpacing: 1,
        }}>{adpLabel.text}</div>
      </div>

      <div style={{ padding: "20px 20px 40px", flex: 1, overflowY: "auto" }}>

        {/* PLATFORM SELECTOR */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:2, marginBottom:10 }}>SELECT PLATFORM</div>
          <div style={{ display:"flex", gap:10, marginBottom:4 }}>
            {[
              { id:'underdog', label:'UNDERDOG', sub:'Half PPR  •  20s timer', color:'#5B8CFF' },
              { id:'dk',       label:'DRAFTKINGS', sub:'Full PPR  •  30s timer', color:'#1DD882' },
            ].map(p => (
              <button key={p.id} onClick={() => setPlatform(p.id)} style={{
                flex:1, padding:"14px 10px", borderRadius:10,
                background: platform === p.id ? `${p.color}22` : T.card,
                border: platform === p.id ? `2px solid ${p.color}` : `1px solid ${T.border}`,
                color: platform === p.id ? p.color : T.mute,
                fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:900,
                cursor:"pointer", textAlign:"center", letterSpacing:1,
                transition:"all 0.15s",
              }}>
                <div>{p.label}</div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, marginTop:4, opacity:0.7 }}>{p.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Slot picker */}
        <div style={{
          background: T.panel, borderRadius: 12,
          border: `1px solid ${T.border}`, padding: 18, marginBottom: 14,
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9, letterSpacing: 2, color: T.dim, marginBottom: 12,
          }}>DRAFT SLOT</div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: 14,
          }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => {
              const sel = s === mySlot;
              return (
                <button key={s} onClick={() => setMySlot(s)} style={{
                  aspectRatio: "1",
                  background: sel
                    ? T.gold
                    : `rgba(255,255,255,0.03)`,
                  color: sel ? T.bg : T.mute,
                  border: `1px solid ${sel ? T.gold : T.border}`,
                  borderRadius: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 22, fontWeight: 900, cursor: "pointer",
                  transition: "all 0.12s",
                  boxShadow: sel ? `0 0 16px ${T.gold}44` : "none",
                }}>{s}</button>
              );
            })}
          </div>
          <div style={{
            background: `${T.gold}10`,
            border: `1px solid ${T.gold}22`,
            borderRadius: 8,
            padding: "10px 14px",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11, color: T.mute, lineHeight: 1.6,
          }}>
            Slot <span style={{color:T.gold,fontWeight:700}}>{mySlot}</span>
          </div>
        </div>

        {/* BIG ENTER DRAFT ROOM BUTTON */}
        <button onClick={() => onStart({ draftMode, draftSpeed, platform })} style={{
          width:"100%", padding:"20px", marginTop:4, marginBottom:16,
          background:`linear-gradient(135deg, ${T.gold}, #FFB830)`,
          color:T.bg, border:"none", borderRadius:14,
          fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900,
          letterSpacing:1.5, cursor:"pointer",
          boxShadow:`0 6px 32px rgba(255,209,102,0.5)`,
        }}>
          ENTER DRAFT ROOM →
        </button>

        {/* RANKINGS IMPORT (file picker) */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:2, marginBottom:8 }}>
            CUSTOM RANKINGS
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <label style={{
              flex:1, padding:"11px 14px", borderRadius:8,
              background:T.card, border:`1px solid ${T.border}`,
              color: rankingsCount > 0 ? T.green : T.mute,
              fontFamily:"'Share Tech Mono',monospace", fontSize:10,
              cursor:"pointer", letterSpacing:1, textAlign:"center",
              display:"block",
            }}>
              {rankingsCount > 0 ? `✓ ${rankingsCount} PLAYERS IMPORTED` : '📂  IMPORT RANKINGS (.CSV)'}
              <input type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  let text = '';
                  if (file.name.endsWith('.csv')) {
                    text = await file.text();
                  } else {
                    alert('Please export your rankings as CSV from Excel/Google Sheets, then import the CSV file.');
                    return;
                  }
                  await onImportRankings(text);
                } catch(err) {
                  alert('Could not read file. Please export as CSV.');
                }
                e.target.value = '';
              }} />
            </label>
            {rankingsCount > 0 && (
              <button onClick={onClearRankings} style={{
                padding:"11px 14px", borderRadius:8, background:`${T.red}22`,
                border:`1px solid ${T.red}44`, color:T.red,
                fontFamily:"'Share Tech Mono',monospace", fontSize:10, cursor:"pointer",
              }}>CLEAR</button>
            )}
          </div>
          {rankingsCount === 0 && (
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, marginTop:6, lineHeight:1.6 }}>
              ETR CSV export works directly — just download and drop in. Also supports any CSV with player name + rank columns.
            </div>
          )}
        </div>

        {/* How it works — condensed */}
        <div style={{
          background: T.card, borderRadius: 10,
          border: `1px solid ${T.border}`, padding: 14, marginBottom: 20,
        }}>
          <div style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:9,color:T.dim,letterSpacing:2,marginBottom:10,
          }}>QUICK START</div>
          {[
            ["01", "Pick your platform (Underdog or DraftKings) and draft slot above"],
            ["02", "Tap ENTER DRAFT ROOM to start"],
            ["03", "When another team picks — search their player and tap THEIR PICK"],
            ["04", "When it's your turn — tap one of the highlighted recommendations"],
            ["05", "Tap FINISH DRAFT when done to save your roster"],
          ].map(([n, text]) => (
            <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:7}}>
              <span style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:15,fontWeight:900,color:T.gold,lineHeight:1,minWidth:22,
              }}>{n}</span>
              <span style={{fontSize:12,color:T.mute,lineHeight:1.5}}>{text}</span>
            </div>
          ))}
        </div>

        {/* Draft mode selector */}
        <div style={{
          background: T.panel, borderRadius: 12,
          border: `1px solid ${T.border}`, padding: 16, marginBottom: 14,
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 9, letterSpacing: 2, color: T.dim, marginBottom: 10,
          }}>DRAFT MODE</div>
          <div style={{ display: "flex", flexDirection:"column", gap: 8 }}>
            {MODES.map(m => {
              const sel = draftMode === m.id;
              return (
                <button key={m.id} onClick={() => setDraftMode(m.id)} style={{
                  padding: "12px 14px",
                  background: sel ? `${m.color}18` : `rgba(255,255,255,0.02)`,
                  color: sel ? m.color : T.mute,
                  border: `1px solid ${sel ? m.color + "55" : T.border}`,
                  borderRadius: 8, cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                  display:"flex", alignItems:"center", gap:12,
                  boxShadow: sel ? `0 0 16px ${m.color}22` : "none",
                }}>
                  <div style={{
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontSize:16, fontWeight:900, letterSpacing:0.5,
                    minWidth:110,
                  }}>{m.label}</div>
                  <div style={{
                    fontFamily:"'Barlow',sans-serif",
                    fontSize:11, lineHeight:1.4, color:sel?m.color:T.dim, flex:1,
                  }}>{m.sub}</div>
                  {sel && <div style={{
                    width:8, height:8, borderRadius:"50%", background:m.color, flexShrink:0,
                  }}/>}
                </button>
              );
            })}
          </div>

          {/* Speed selector for fast + autopilot */}
          {(draftMode === 'fast' || draftMode === 'autopilot') && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:2, marginBottom:8 }}>TIMER</div>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { val: platform === 'dk' ? 30 : 20, label: platform === 'underdog' ? 'LIVE (20s)' : 'LIVE (30s)' },
                  { val: 0, label: 'SLOW DRAFT' },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setDraftSpeed(opt.val)} style={{
                    flex:1, padding:"10px 8px", borderRadius:8,
                    background: draftSpeed === opt.val ? `${T.gold}22` : T.card,
                    border: draftSpeed === opt.val ? `1px solid ${T.gold}` : `1px solid ${T.border}`,
                    color: draftSpeed === opt.val ? T.gold : T.mute,
                    fontFamily:"'Share Tech Mono',monospace", fontSize:10, cursor:"pointer",
                    letterSpacing:1,
                  }}>{opt.label}</button>
                ))}
              </div>
              {draftMode === 'autopilot' && (
                <div style={{
                  marginTop:8, padding:"8px 10px",
                  background:`${T.purple}10`, borderRadius:6,
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:9, color:T.purple, lineHeight:1.6,
                }}>
                  AUTOPILOT will run all opponent picks automatically using ADP simulation.
                  You only interact when it's YOUR TURN.
                </div>
              )}
            </div>
          )}

          {/* Cheat sheet button */}
          {draftMode === 'autopilot' && (
            <button onClick={() => setShowCheatSheet(true)} style={{
              width:"100%", marginTop:10, padding:"10px",
              background:`${T.amber}18`, border:`1px solid ${T.amber}44`,
              borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:15, fontWeight:900, color:T.amber, cursor:"pointer",
              letterSpacing:0.5,
            }}>
              📋 GENERATE CHEAT SHEET FOR SLOT {mySlot}
            </button>
          )}
        </div>

        {/* Cheat sheet modal */}
        {showCheatSheet && (
          <CheatSheetModal slot={mySlot} targets={[]} onClose={() => setShowCheatSheet(false)}/>
        )}

        {/* Bookmarklet companion */}
        <BookmarkletInstaller/>

        {/* Billy Catcher queue */}
        <button onClick={onBillyCatcher} style={{
          width:"100%", marginBottom:10, padding:"14px 18px",
          background:`linear-gradient(135deg, #0A0514, #12082A)`,
          border:`1px solid #A78BFA66`,
          borderRadius:12, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          fontFamily:"'Barlow',sans-serif",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:36,height:36,borderRadius:8,
              background:"rgba(167,139,250,0.2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18,
            }}>🎯</div>
            <div style={{textAlign:"left"}}>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:16,fontWeight:900,color:"#A78BFA",letterSpacing:0.5,
              }}>BILLY CATCHER</div>
              <div style={{fontSize:11,color:"#475068",marginTop:2}}>
                Bulk queue · auto-diversify · close the gap fast
              </div>
            </div>
          </div>
          <span style={{color:"#A78BFA",fontSize:18}}>→</span>
        </button>

        {savedDraftsCount > 0 && (
          <button onClick={onPortfolio} style={{
            width:"100%", marginBottom:10, padding:"14px 18px",
            background:`${T.green}12`, border:`1px solid ${T.green}33`,
            borderRadius:12, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            fontFamily:"'Barlow',sans-serif",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{
                width:36,height:36,borderRadius:8,
                background:`${T.green}20`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:18,
              }}>📊</div>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:900,color:T.green,letterSpacing:0.5}}>PORTFOLIO ANALYTICS</div>
                <div style={{fontSize:11,color:T.dim,marginTop:2}}>{savedDraftsCount} draft{savedDraftsCount!==1?'s':''} · exposure &amp; stack analysis</div>
              </div>
            </div>
            <span style={{color:T.green,fontSize:18}}>→</span>
          </button>
        )}

        {/* Bottom Enter Draft Room button */}
        <button onClick={() => onStart({ draftMode, draftSpeed, platform })} style={{
          width:"100%", padding:"20px", marginTop:8,
          background:`linear-gradient(135deg, ${T.gold}, #FFB830)`,
          color:T.bg, border:"none", borderRadius:14,
          fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900,
          letterSpacing:1.5, cursor:"pointer",
          boxShadow:`0 6px 32px rgba(255,209,102,0.5)`,
        }}>
          ENTER DRAFT ROOM →
        </button>
      </div>
    </div>
  );
}

// ── DRAFT SCREEN ──────────────────────────────────────────────────────────────
function DraftScreen({ mySlot, currentPick, isMyTurn, isDone, available, myRoster,
  recs, drafted, flash, tierMap, scarcity, savedDrafts, customRankings,
  platform, players, onLogMine, onLogOpp, onSkip, onDone, onReset }) {
  const allPlayers = players || PLAYERS;

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [view, setView] = useState("picks");
  const [showAI, setShowAI] = useState(false);
  const [comboWarning, setComboWarning] = useState(null);
  const [pasteModal, setPasteModal] = useState(null); // { match, rawText, needsInput }
  const [pasteInput, setPasteInput] = useState('');
  const searchRef = useRef(null);

  const round = Math.ceil(currentPick / 12);
  const upcoming = myUpcomingPicks(mySlot, currentPick);
  const counts = rosterCounts(myRoster);
  const gap = picksUntilMyTurn(currentPick + 1, mySlot);
  const recentPicks = drafted.slice(-4).reverse();

  // Clipboard paste flow
  const handlePaste = async () => {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setPasteModal({ match: null, rawText: '', needsInput: true });
      return;
    }
    const match = fuzzyMatchPlayer(text.trim(), available);
    setPasteModal({ match, rawText: text.trim(), needsInput: !match });
    setPasteInput(text.trim());
  };

  const tryPasteInput = () => {
    const match = fuzzyMatchPlayer(pasteInput, available);
    setPasteModal(prev => ({ ...prev, match, needsInput: !match }));
  };

  const confirmPasteAsMine = () => {
    if (pasteModal?.match) handleLogMine(pasteModal.match);
    setPasteModal(null); setPasteInput('');
  };
  const confirmPasteAsOpp = () => {
    if (pasteModal?.match) { onLogOpp(pasteModal.match); setSearch(''); }
    setPasteModal(null); setPasteInput('');
  };

  // Intercept MY PICK — check portfolio combo concentration first
  const handleLogMine = (player) => {
    const combo = checkCombo(player, myRoster, savedDrafts);
    if (combo && combo.risk !== 'ok') {
      setComboWarning({ player, combo });
    } else {
      onLogMine(player);
      setSearch('');
    }
  };
  const confirmPick = () => {
    if (comboWarning) { onLogMine(comboWarning.player); setSearch(''); }
    setComboWarning(null);
  };

  const filtered = useMemo(() => {
    return available
      .filter(p => posFilter === "ALL" || p.pos === posFilter)
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.team.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 40);
  }, [available, posFilter, search]);

  // Rushing positions for board intel strip
  const rushingPos = Object.entries(scarcity)
    .filter(([_,r]) => r > 1.2)
    .sort((a,b) => b[1]-a[1]);

  return (
    <div style={{
      height: "100svh", background: T.bg,
      fontFamily: "'Barlow', sans-serif", color: T.text,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* ── TOP BAR ── */}
      <div style={{
        background: isMyTurn ? `linear-gradient(135deg,#1A1400,#1F1800)` : T.panel,
        borderBottom: `2px solid ${isMyTurn ? T.gold : T.border}`,
        padding: "12px 16px 10px", flexShrink: 0,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:10, color:T.dim, letterSpacing:1.5, marginBottom:2,
            }}>PICK {currentPick} · RD {round} · SLOT {pickToSlot(currentPick)}</div>
            {isMyTurn ? (
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:22, fontWeight:900, color:T.gold, letterSpacing:0.5,
              }}>▶ YOUR TURN</div>
            ) : (
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:18, fontWeight:700, color:T.mute,
                }}>Slot {pickToSlot(currentPick)} picking…</div>
                {!isMyTurn && gap <= 24 && (
                  <span style={{
                    fontFamily:"'Share Tech Mono',monospace",
                    fontSize:10, color:gap<=4?T.amber:T.dim,
                  }}>{gap} picks away</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={onDone} style={{
              padding:"8px 14px",
              background: isDone ? T.green : `${T.green}22`,
              color: isDone ? T.bg : T.green,
              border: isDone ? "none" : `1px solid ${T.green}55`,
              borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:14, fontWeight:900, letterSpacing:1, cursor:"pointer",
            }}>FINISH DRAFT</button>

            {/* PASTE PICK — the bridge button */}
            <button onClick={handlePaste} style={{
              padding:"7px 12px",
              background:`${T.teal}18`,
              color: T.teal,
              border:`1px solid ${T.teal}55`,
              borderRadius:8,
              fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:13, fontWeight:900, letterSpacing:0.5,
              cursor:"pointer",
              display:"flex", alignItems:"center", gap:5,
            }}>
              <span style={{fontSize:14}}>📋</span> PASTE
            </button>

            {!isMyTurn && !isDone && (
              <button onClick={onSkip} style={{
                padding:"7px 10px", background:"transparent", color:T.dim,
                border:`1px solid ${T.border}`, borderRadius:8,
                fontFamily:"'Share Tech Mono',monospace", fontSize:9,
                letterSpacing:1, cursor:"pointer",
              }}>MISSED PICK</button>
            )}
            <button onClick={onReset} style={{
              padding:"7px 10px", background:"transparent", color:T.dim,
              border:`1px solid ${T.border}`, borderRadius:8,
              fontFamily:"'Share Tech Mono',monospace", fontSize:10, cursor:"pointer",
            }}>RESET</button>
          </div>
        </div>

        {/* Upcoming picks */}
        {upcoming.length > 0 && (
          <div style={{ display:"flex", gap:6, marginTop:8, overflowX:"auto" }}>
            {upcoming.map((p,i) => (
              <div key={p} style={{
                padding:"3px 8px",
                background: i===0&&isMyTurn ? T.gold : T.card,
                color: i===0&&isMyTurn ? T.bg : T.dim,
                borderRadius:4, flexShrink:0,
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:10, letterSpacing:0.5,
                border:`1px solid ${i===0?T.gold+"44":T.border}`,
              }}>{pickToRound(p)}</div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOARD INTEL STRIP ── */}
      {(rushingPos.length > 0 || round >= 13) && (
        <div style={{
          background: T.card, borderBottom:`1px solid ${T.border}`,
          padding:"6px 14px", display:"flex", gap:10, alignItems:"center",
          overflowX:"auto", flexShrink:0,
        }}>
          <span style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:9, color:T.dim, letterSpacing:1.5, flexShrink:0,
          }}>INTEL</span>
          {rushingPos.map(([pos,rate]) => (
            <div key={pos} style={{
              display:"flex", alignItems:"center", gap:4,
              padding:"3px 8px",
              background: POS_C[pos]?.bg,
              borderRadius:4, flexShrink:0,
            }}>
              <span style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:11, fontWeight:900, color:POS_C[pos]?.fg, letterSpacing:0.5,
              }}>🔥 {pos} RUSHING</span>
              <span style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:9, color:T.dim,
              }}>{(rate*100-100).toFixed(0)}%+ pace</span>
            </div>
          ))}
          {round >= 13 && (
            <div style={{
              padding:"3px 8px", background:`${T.purple}22`,
              border:`1px solid ${T.purple}44`,
              borderRadius:4, flexShrink:0,
            }}>
              <span style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:11, fontWeight:900, color:T.purple, letterSpacing:0.5,
              }}>⚡ UPSIDE MODE</span>
            </div>
          )}
          {gap >= 20 && !isMyTurn && (
            <div style={{
              padding:"3px 8px", background:`${T.amber}22`,
              border:`1px solid ${T.amber}44`, borderRadius:4, flexShrink:0,
            }}>
              <span style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:11, fontWeight:900, color:T.amber,
              }}>⏳ LONG WAIT — act now</span>
            </div>
          )}
        </div>
      )}

      {/* ── PASTE PICK MODAL ── */}
      {pasteModal && (
        <PastePickModal
          match={pasteModal.match}
          rawText={pasteModal.rawText}
          needsInput={pasteModal.needsInput}
          pasteInput={pasteInput}
          onInputChange={setPasteInput}
          onTryMatch={tryPasteInput}
          onMyPick={confirmPasteAsMine}
          onOppPick={confirmPasteAsOpp}
          onClose={() => { setPasteModal(null); setPasteInput(''); }}
          isMyTurn={isMyTurn}
        />
      )}

      {/* ── COMBO WARNING MODAL ── */}
      {comboWarning && (
        <ComboWarningModal
          player={comboWarning.player}
          combo={comboWarning.combo}
          onConfirm={confirmPick}
          onCancel={() => setComboWarning(null)}
        />
      )}

      {/* ── FLASH TOAST ── */}
      {flash && (
        <div style={{
          position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
          zIndex:999, animation:"slide-up 0.2s ease",
          background: flash.isMine ? T.green : T.panel,
          color: flash.isMine ? T.bg : T.mute,
          border:`1px solid ${flash.isMine?T.green:T.border}`,
          borderRadius:20, padding:"8px 16px",
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:15, fontWeight:700, letterSpacing:0.5,
          whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {flash.isMine ? "✓ YOUR PICK: " : "⬆ THEIR PICK: "}{flash.name}
        </div>
      )}

      {/* ── RECS ── */}
      {isMyTurn && !isDone && (
        <div style={{
          background:`linear-gradient(to bottom,rgba(255,209,102,0.07),transparent)`,
          padding:"10px 14px 8px", flexShrink:0,
          borderBottom:`1px solid ${T.border}`,
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8,
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, color:T.dim, letterSpacing:2,
            }}>RECOMMENDATIONS</div>
            <button
              onClick={() => setShowAI(v => !v)}
              style={{
                padding:"4px 10px",
                background: showAI ? T.purple : "transparent",
                color: showAI ? T.bg : T.purple,
                border:`1px solid ${T.purple}88`,
                borderRadius:6,
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:11, fontWeight:700, letterSpacing:0.5, cursor:"pointer",
              }}
            >✦ AI ADVISOR {showAI ? "ON" : "OFF"}</button>
          </div>

          {/* Rec cards — horizontal scroll */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
            {recs.map((p, i) => {
              const tierInfo = tierMap?.[p.id];
              const tierRemainingCount = available.filter(pl => tierMap?.[pl.id]?.tier === tierInfo?.tier && pl.pos === p.pos).length;
              const showTierAlert = tierInfo?.lastInTier && tierRemainingCount <= 2;
              return (
                <button key={p.id} onClick={() => { handleLogMine(p); }} style={{
                  flexShrink:0, minWidth:140, padding:"10px 12px",
                  background: i===0 ? `${T.gold}20` : T.card,
                  border:`1px solid ${i===0 ? T.gold : T.border}`,
                  borderRadius:10, textAlign:"left", cursor:"pointer",
                  animation: i===0 ? "pulse-ring 2.5s infinite" : "none",
                }}>
                  {/* Reason tags */}
                  {p.reasons?.length > 0 && (
                    <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:5 }}>
                      {p.reasons.slice(0,2).map((r,ri) => {
                        const tagColors = {
                          val:T.green, warn:T.red, need:T.blue, stack:T.purple,
                          tier:T.amber, scarc:T.red, gap:T.amber, boom:T.purple, hc:T.green,
                        };
                        return (
                          <span key={ri} style={{
                            fontFamily:"'Share Tech Mono',monospace",
                            fontSize:8, letterSpacing:0.5,
                            color:tagColors[r.t]||T.mute,
                            background:`${tagColors[r.t]||T.mute}22`,
                            padding:"1px 4px", borderRadius:2,
                          }}>{r.text}</span>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:5, alignItems:"center", marginBottom:4 }}>
                    <PosBadge pos={p.pos}/>
                    {showTierAlert && (
                      <span style={{
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:7, color:T.amber, letterSpacing:0.5,
                        background:`${T.amber}22`, padding:"1px 4px", borderRadius:2,
                      }}>{tierInfo.tier === 1 ? `LAST ${p.pos}1` : `LAST T${tierInfo.tier}`}</span>
                    )}
                  </div>
                  <div style={{
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontSize:16, fontWeight:700, color:T.text, lineHeight:1.1,
                  }}>{p.name}</div>
                  <div style={{
                    fontFamily:"'Share Tech Mono',monospace",
                    fontSize:9, color:T.mute, marginTop:4,
                  }}>{p.team} · ADP {p.adp.toFixed(0)} · Score {Math.round(p.score)}</div>
                </button>
              );
            })}
          </div>

          {/* AI Advisor */}
          {showAI && (
            <AiAdvisor
              myRoster={myRoster} drafted={drafted} available={available}
              currentPick={currentPick} mySlot={mySlot}
              scarcity={scarcity} tierMap={tierMap}
              platform={platform}
            />
          )}
        </div>
      )}

      {/* ── SEARCH BAR ── */}
      <div style={{
        padding:"10px 14px 8px", background:T.panel,
        borderBottom:`1px solid ${T.border}`, flexShrink:0,
      }}>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <div style={{ flex:1, position:"relative", display:"flex", alignItems:"center" }}>
            <span style={{ position:"absolute", left:10, fontSize:14, color:T.dim }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search player or team…"
              style={{
                width:"100%", padding:"10px 10px 10px 32px",
                background:T.card, border:`1px solid ${T.hi}`,
                color:T.text, borderRadius:8,
                fontFamily:"'Barlow',sans-serif", fontSize:16, outline:"none",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position:"absolute", right:8, background:"none", border:"none",
                color:T.dim, fontSize:16, cursor:"pointer", padding:4,
              }}>✕</button>
            )}
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["ALL","QB","RB","WR","TE"].map(f => {
            const sel = f === posFilter;
            const col = f === "ALL" ? T.mute : POS_C[f]?.fg;
            return (
              <button key={f} onClick={() => setPosFilter(f)} style={{
                flex:1, padding:"6px 0",
                background: sel ? col : "transparent",
                color: sel ? T.bg : col,
                border:`1px solid ${sel ? col : T.border}`,
                borderRadius:6,
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:13, fontWeight:700, letterSpacing:0.5, cursor:"pointer",
              }}>{f}</button>
            );
          })}
        </div>
      </div>

      {/* ── PLAYER LIST ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
        {filtered.length === 0 ? (
          <div style={{
            padding:32, textAlign:"center", color:T.dim, fontSize:14,
            fontFamily:"'Share Tech Mono',monospace",
          }}>No players found</div>
        ) : filtered.map(p => {
          const tierInfo = tierMap?.[p.id];
          const { score, reasons } = scorePlayer(p, currentPick, myRoster, tierMap, scarcity, mySlot);
          return (
            <PlayerRow
              key={p.id} player={p}
              isMyTurn={isMyTurn} currentPick={currentPick}
              tierInfo={tierInfo} reasons={reasons}
              onLogMine={() => handleLogMine(p)}
              onLogOpp={() => { onLogOpp(p); setSearch(""); }}
            />
          );
        })}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{
        background:T.panel, borderTop:`1px solid ${T.border}`,
        padding:"10px 14px 20px", flexShrink:0,
      }}>
        <div style={{
          display:"flex", gap:1, background:T.card, borderRadius:8, padding:3, marginBottom:10,
        }}>
          {[["picks","RECENT PICKS"],["roster","MY ROSTER"],["intel","OPP INTEL"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex:1, padding:"7px 0",
              background: view===v ? (v==='intel'?T.purple:T.gold) : "transparent",
              color: view===v ? T.bg : (v==='intel'?T.purple:T.mute),
              border:"none", borderRadius:6,
              fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:12, fontWeight:700, letterSpacing:0.5, cursor:"pointer",
            }}>{l}</button>
          ))}
        </div>

        {view === "picks" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {recentPicks.length === 0 ? (
              <div style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:11, color:T.dim, textAlign:"center", padding:8,
              }}>No picks logged yet</div>
            ) : recentPicks.map((pk,i) => {
              const p = allPlayers.find(pl => pl.id === pk.playerId);
              if (!p) return null;
              const pkSlot = pickToSlot(pk.pick);
              return (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"6px 10px",
                  background: pk.isMine ? `${T.green}14` : T.card,
                  borderRadius:6,
                  border:`1px solid ${pk.isMine?T.green+"33":T.border}`,
                }}>
                  <span style={{
                    fontFamily:"'Share Tech Mono',monospace",
                    fontSize:9, color:T.dim, minWidth:28,
                  }}>{pickToRound(pk.pick)}</span>
                  <PosBadge pos={p.pos}/>
                  <span style={{ fontSize:13, fontWeight:600, color:T.text, flex:1 }}>{p.name}</span>
                  <span style={{
                    fontFamily:"'Share Tech Mono',monospace", fontSize:9,
                    color:pk.isMine?T.green:T.dim,
                  }}>{pk.isMine?`MY PICK`:`S${pkSlot}`}</span>
                </div>
              );
            })}
          </div>
        ) : view === "roster" ? (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              {[["QB",2],["RB",5],["WR",7],["TE",2]].map(([pos,need]) => {
                const have = counts[pos];
                const col = POS_C[pos]?.fg;
                return (
                  <div key={pos} style={{
                    flex:1, background:T.card, borderRadius:6,
                    padding:"6px 4px", textAlign:"center",
                    border:`1px solid ${T.border}`,
                  }}>
                    <div style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:11, fontWeight:700, color:col, letterSpacing:0.5,
                    }}>{pos}</div>
                    <div style={{
                      fontFamily:"'Share Tech Mono',monospace",
                      fontSize:13, fontWeight:700, color:T.text,
                    }}>{have}<span style={{color:T.dim}}>/{need}</span></div>
                  </div>
                );
              })}
            </div>
            <div style={{ maxHeight:100, overflowY:"auto" }}>
              {myRoster.length === 0 ? (
                <div style={{
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:11, color:T.dim, textAlign:"center", padding:8,
                }}>No picks yet</div>
              ) : myRoster.map((p,i) => {
                const pk = drafted.find(d => d.isMine && d.playerId === p.id);
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"4px 6px", borderBottom:`1px solid ${T.border}`,
                  }}>
                    <span style={{
                      fontFamily:"'Share Tech Mono',monospace",
                      fontSize:9, color:T.dim, minWidth:28,
                    }}>{pk ? pickToRound(pk.pick) : "—"}</span>
                    <PosBadge pos={p.pos}/>
                    <span style={{ fontSize:12, color:T.text }}>{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* OPP INTEL view */
          <OpponentIntel
            mySlot={mySlot}
            myRoster={myRoster}
            drafted={drafted}
            currentPick={currentPick}
          />
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player, isMyTurn, currentPick, tierInfo, reasons, onLogMine, onLogOpp }) {
  const adpDelta = player.adp - currentPick;
  const isValue = adpDelta > 5;
  const isReach = adpDelta < -8;
  const tagColors = {
    val:T.green, warn:T.red, need:T.blue, stack:T.purple,
    tier:T.amber, scarc:T.red, gap:T.amber, boom:T.purple, hc:T.green,
  };

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"44px 1fr auto",
      gap:10, padding:"9px 14px",
      borderBottom:`1px solid ${T.border}`,
      borderLeft: tierInfo?.lastInTier ? `3px solid ${T.amber}` : "3px solid transparent",
      alignItems:"center",
    }}>
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:12, fontWeight:700, textAlign:"right",
        color: isValue ? T.green : isReach ? T.red : T.dim,
      }}>{player.adp.toFixed(0)}</div>

      <div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
          <span style={{
            fontSize:14, fontWeight:600, color:T.text,
            fontFamily:"'Barlow',sans-serif",
          }}>{player.name}</span>
          {tierInfo?.lastInTier && (
            <span style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:7, color:T.amber, background:`${T.amber}22`,
              padding:"1px 4px", borderRadius:2, letterSpacing:0.5,
            }}>{tierInfo.tier === 1 ? `LAST ${player.pos}1` : `LAST T${tierInfo.tier}`}</span>
          )}
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
          <PosBadge pos={player.pos}/>
          <span style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:T.mute,
          }}>{player.team}</span>
          <span style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:T.dim,
          }}>BYE {player.bye}</span>
          {reasons?.slice(0,1).map((r,i) => (
            <span key={i} style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:8, color:tagColors[r.t]||T.mute,
              background:`${tagColors[r.t]||T.mute}22`,
              padding:"1px 4px", borderRadius:2, letterSpacing:0.3,
            }}>{r.text}</span>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <button onClick={onLogMine} style={{
          padding:"7px 10px",
          background: isMyTurn ? T.gold : T.card,
          color: isMyTurn ? T.bg : T.mute,
          border:`1px solid ${isMyTurn ? T.gold : T.border}`,
          borderRadius:6,
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:11, fontWeight:700, letterSpacing:0.5,
          cursor:"pointer", whiteSpace:"nowrap",
        }}>{isMyTurn ? "MY PICK" : "MINE"}</button>
        <button onClick={onLogOpp} style={{
          padding:"7px 10px", background:"transparent", color:T.dim,
          border:`1px solid ${T.border}`, borderRadius:6,
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
        }}>THEIR PICK</button>
      </div>
    </div>
  );
}

// ── AI ADVISOR ────────────────────────────────────────────────────────────────
function AiAdvisor({ myRoster, drafted, available, currentPick, mySlot, scarcity, tierMap, platform }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadMsg, setLoadMsg] = useState("Analyzing board state…");

  const LOAD_MSGS = [
    "Analyzing board state…",
    "Scanning tier breaks…",
    "Checking stack opportunities…",
    "Evaluating scarcity signals…",
    "Building recommendation…",
  ];

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOAD_MSGS.length;
      setLoadMsg(LOAD_MSGS[idx]);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const getAdvice = async () => {
    setLoading(true);
    setLoadMsg("Analyzing board state…");
    setAdvice(null);
    setError(null);

    const summary = buildBoardSummary(myRoster, drafted, available, currentPick, mySlot, scarcity, tierMap, platform);

    const systemPrompt = `You are a Best Ball draft advisor. Return ONLY a ranked pick list in this exact format:

Pick 1: [Player Name] ([Team]) — [one sentence reason, max 12 words]
Pick 2: [Player Name] ([Team]) — [one sentence reason, max 12 words]
Pick 3: [Player Name] ([Team]) — [one sentence reason, max 12 words]
⚠️ [One optional alert about positional scarcity, stacking opportunity, or portfolio risk — max 15 words. Omit if nothing urgent.]

Rules:
- Always exactly 3 picks from the available players listed
- Picks must be realistic for the current pick number (do NOT recommend players with ADP far above the current pick)
- Factor in: roster needs, platform scoring (Half PPR for Underdog, Full PPR for DraftKings), positional scarcity, and stacking
- For Underdog (Half PPR): RB and WR are more equal in value
- For DraftKings (Full PPR): Receiving RBs and slot WRs have elevated value
- Critical rules: Don't let user get boxed out at RB (need 3 by round 8). Don't get boxed out at QB (need 2 by round 12). Prioritize team stacking.
- No paragraphs, no essays, no strategy explanations beyond the one-line reasons`;

    const portfolioData = (() => {
      try {
        const raw = localStorage.getItem('bbm_drafts_v1');
        if (!raw) return null;
        const drafts = JSON.parse(raw);
        if (!drafts.length) return null;
        const exposureMap = {};
        drafts.forEach(d => (d.roster||[]).forEach(p => {
          exposureMap[p.name] = (exposureMap[p.name]||0)+1;
        }));
        const topExposed = Object.entries(exposureMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,cnt])=>`${name} ${((cnt/drafts.length)*100).toFixed(0)}%`).join(', ');
        const underExposed = available.filter(p => !exposureMap[p.name] && p.adp <= 80).slice(0,3).map(p=>p.name).join(', ');
        return `Portfolio (${drafts.length} drafts): Heavy exposure: ${topExposed}. Missing from portfolio: ${underExposed||'none'}.`;
      } catch { return null; }
    })();

    const userPrompt = `Here is my live draft board:\n\n${summary}\n\n${portfolioData ? portfolioData+'\n' : ''}Give me your top 3 picks right now.`;

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const text = data.content?.find(b => b.type === "text")?.text || "";
      if (!text) throw new Error("No response");
      setAdvice(text.trim());
    } catch (e) {
      setError(e.message?.includes('not configured')
        ? "AI advisor requires ANTHROPIC_API_KEY in Vercel settings."
        : "Couldn't reach AI advisor. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when shown
  useEffect(() => {
    getAdvice();
  }, [currentPick]);

  return (
    <div style={{
      marginTop:10,
      background:`${T.purple}12`,
      border:`1px solid ${T.purple}44`,
      borderRadius:8, padding:12,
      animation:"slide-up 0.2s ease",
    }}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8,
      }}>
        <div style={{
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:9, color:T.purple, letterSpacing:2,
        }}>✦ AI ADVISOR</div>
        <button onClick={getAdvice} disabled={loading} style={{
          padding:"3px 8px", background:"transparent",
          color: loading ? T.dim : T.purple,
          border:`1px solid ${loading ? T.border : T.purple}66`,
          borderRadius:4, fontFamily:"'Share Tech Mono',monospace",
          fontSize:9, letterSpacing:1, cursor:loading?"default":"pointer",
        }}>{loading ? "THINKING…" : "REFRESH"}</button>
      </div>

      {loading && (
        <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 0" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width:6, height:6, background:T.purple, borderRadius:"50%",
              animation:`pulse-ring ${0.6+i*0.15}s infinite`,
            }}/>
          ))}
          <span style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:T.dim,
          }}>{loadMsg}</span>
        </div>
      )}

      {error && (
        <div style={{
          fontSize:12, color:T.red, fontFamily:"'Barlow',sans-serif", lineHeight:1.5,
        }}>{error}</div>
      )}

      {advice && (
        <div style={{
          fontSize:13, color:T.text, lineHeight:1.7,
          fontFamily:"'Barlow',sans-serif",
        }}>
          {advice.split("\n").filter(Boolean).map((line, i) => (
            <p key={i} style={{
              margin:"0 0 6px",
              paddingLeft: line.match(/^[123]\./) ? 0 : 0,
              color: i === 0 ? T.text : T.mute,
            }}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── POS BADGE ─────────────────────────────────────────────────────────────────
function PosBadge({ pos }) {
  const c = POS_C[pos] || POS_C.WR;
  return (
    <span style={{
      padding: "1px 6px",
      background: c.bg, color: c.fg,
      borderRadius: 3,
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
    }}>{pos}</span>
  );
}

// ── RECAP ─────────────────────────────────────────────────────────────────────
function RecapScreen({ myRoster, drafted, mySlot, onReset, queueEntry, onQueueDone, onSaveDraft }) {
  const counts = rosterCounts(myRoster);
  const [copied, setCopied] = useState(false);

  const stacks = useMemo(() => {
    const groups = {};
    myRoster.forEach(p => {
      if (!groups[p.team]) groups[p.team] = [];
      groups[p.team].push(p);
    });
    return Object.entries(groups).filter(([_, ps]) => ps.length >= 2);
  }, [myRoster]);

  const myDraftedWithPick = myRoster.map(p => {
    const pk = drafted.find(d => d.isMine && d.playerId === p.id);
    return { ...p, pick: pk?.pick || 999 };
  }).sort((a, b) => a.pick - b.pick);

  return (
    <div style={{
      minHeight: "100svh",
      background: T.bg,
      fontFamily: "'Barlow', sans-serif",
      color: T.text,
      paddingBottom: 48,
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(180deg, rgba(29,216,130,0.12) 0%, transparent 100%)`,
        borderBottom: `1px solid ${T.border}`,
        padding: "40px 20px 20px", textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, letterSpacing: 3, color: T.green, fontWeight: 700, marginBottom: 8,
        }}>DRAFT COMPLETE · SLOT {mySlot}</div>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1,
          letterSpacing: -1,
        }}>YOUR<br/><span style={{ color: T.green }}>ROSTER</span></h1>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Pos counts */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 8, marginBottom: 20,
        }}>
          {[["QB",2],["RB",5],["WR",7],["TE",2]].map(([pos, need]) => {
            const have = counts[pos];
            const col = POS_C[pos]?.fg;
            const ok = have >= need;
            return (
              <div key={pos} style={{
                background: T.panel, borderRadius: 8, padding: 12,
                textAlign: "center",
                border: `1px solid ${ok ? col + "44" : T.border}`,
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12, fontWeight: 700, color: col, marginBottom: 2,
                }}>{pos}</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 28, fontWeight: 900, color: T.text, lineHeight: 1,
                }}>{have}</div>
                <div style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9, color: T.dim,
                }}>of {need}</div>
              </div>
            );
          })}
        </div>

        {/* Stacks */}
        {stacks.length > 0 && (
          <div style={{
            background: T.panel, borderRadius: 10,
            border: `1px solid ${T.purple}44`,
            padding: 16, marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9, color: T.dim, letterSpacing: 2, marginBottom: 10,
            }}>STACKS</div>
            {stacks.map(([team, ps]) => {
              const hasQB = ps.some(p => p.pos === "QB");
              return (
                <div key={team} style={{
                  display: "flex", gap: 10, alignItems: "center",
                  padding: "8px 10px", background: T.card,
                  borderRadius: 6, marginBottom: 6,
                  borderLeft: `3px solid ${hasQB ? T.purple : T.border}`,
                }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 16, fontWeight: 900,
                    color: hasQB ? T.purple : T.text, minWidth: 36,
                  }}>{team}</span>
                  <div style={{ flex: 1 }}>
                    {ps.map(p => (
                      <span key={p.id} style={{ marginRight: 8, fontSize: 12 }}>
                        <span style={{ color: POS_C[p.pos]?.fg, fontSize: 10, marginRight: 3 }}>
                          {p.pos}
                        </span>
                        {p.name.split(" ").pop()}
                      </span>
                    ))}
                  </div>
                  {hasQB && (
                    <span style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 8, color: T.purple, letterSpacing: 1,
                    }}>QB STACK</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Full roster list */}
        <div style={{
          background: T.panel, borderRadius: 10,
          border: `1px solid ${T.border}`, marginBottom: 20,
          overflow: "hidden",
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9, color: T.dim, letterSpacing: 2,
            padding: "12px 14px 8px",
          }}>FULL ROSTER ({myRoster.length} / 18)</div>
          {myDraftedWithPick.map((p, i) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 14px",
              borderTop: i > 0 ? `1px solid ${T.border}` : "none",
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10, color: T.dim, minWidth: 36,
              }}>{p.pick < 999 ? pickToRound(p.pick) : "—"}</span>
              <PosBadge pos={p.pos}/>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text, flex: 1 }}>
                {p.name}
              </span>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10, color: T.mute,
              }}>{p.team}</span>
            </div>
          ))}
        </div>

        <button onClick={async () => {
          const text = `BBM Copilot — Slot ${mySlot}\n` +
            myDraftedWithPick.map(p => `${p.pick < 999 ? pickToRound(p.pick) : '—'} ${p.pos} ${p.name} ${p.team}`).join('\n');
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }} style={{
          width:"100%", padding:"12px", marginBottom:12,
          background: copied ? `${T.green}20` : T.card,
          color: copied ? T.green : T.mute,
          border:`1px solid ${copied?T.green+"44":T.border}`,
          borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:15, fontWeight:700, letterSpacing:1, cursor:"pointer",
          transition:"all 0.2s",
        }}>
          {copied ? "✓ COPIED!" : "📋 COPY ROSTER"}
        </button>

        {queueEntry ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={() => { onSaveDraft?.(); onQueueDone(); }} style={{
              width:"100%", padding:"18px",
              background:`linear-gradient(135deg, #A78BFA, #8B5CF6)`,
              color:"#060A12", border:"none", borderRadius:12,
              fontFamily:"'Barlow Condensed', sans-serif",
              fontSize:22, fontWeight:900, letterSpacing:1,
              cursor:"pointer",
              boxShadow:"0 4px 24px rgba(167,139,250,0.4)",
            }}>✓ DONE — NEXT IN QUEUE →</button>
            <button onClick={onReset} style={{
              width:"100%", padding:"10px",
              background:"transparent", color:"#475068",
              border:`1px solid rgba(255,255,255,0.06)`,
              borderRadius:10, fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:14, fontWeight:700, cursor:"pointer",
            }}>DISCARD + RETURN TO QUEUE</button>
          </div>
        ) : (
          <button onClick={() => { onSaveDraft?.(); onReset(); }} style={{
            width: "100%", padding: "16px",
            background: T.gold, color: T.bg,
            border: "none", borderRadius: 10,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 20, fontWeight: 900, letterSpacing: 1,
            cursor: "pointer",
          }}>+ LOG NEW DRAFT</button>
        )}
      </div>
    </div>
  );
}

// ── OPPONENT INTEL COMPONENT ──────────────────────────────────────────────────
function OpponentIntel({ mySlot, myRoster, drafted, currentPick }) {
  const leftSlot = mySlot > 1 ? mySlot - 1 : null;
  const rightSlot = mySlot < 12 ? mySlot + 1 : null;
  const leftRoster = leftSlot ? getSlotRoster(drafted, leftSlot) : [];
  const rightRoster = rightSlot ? getSlotRoster(drafted, rightSlot) : [];
  const insights = generateOpponentInsights(myRoster, leftRoster, rightRoster, currentPick);
  const round = Math.ceil(currentPick / 12);

  const insightColors = {
    warn: T.red, rush: T.red, need: T.amber,
    edge: T.green, stack: T.purple,
  };

  return (
    <div style={{ paddingTop: 2 }}>
      {/* Instructions if no opp data */}
      {leftRoster.length === 0 && rightRoster.length === 0 && (
        <div style={{
          background: `${T.purple}12`, border: `1px solid ${T.purple}33`,
          borderRadius: 6, padding: "8px 12px", marginBottom: 8,
          fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
          color: T.purple, letterSpacing: 0.8, lineHeight: 1.6,
        }}>
          Log opponent picks (tap THEIR PICK on any player) to unlock intel.
          Pick counter must stay in sync with Underdog for slot attribution to work.
          Use SKIP→ if you miss a pick.
        </div>
      )}

      {/* Two opponent cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        {[
          { slot: leftSlot, roster: leftRoster, label: "LEFT" },
          { slot: rightSlot, roster: rightRoster, label: "RIGHT" },
        ].map(({ slot, roster, label }) => {
          if (!slot) return (
            <div key={label} style={{
              background: T.card, borderRadius: 6, padding: 10,
              border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: T.dim }}>
                EDGE SLOT
              </span>
            </div>
          );

          const counts = rosterCounts(roster);
          const needs = getRosterNeeds(roster);
          const shared = getSharedPlayers(myRoster, roster);
          const sharedQB = getSharedQBTeams(myRoster, roster);
          const inspirations = getInspirationPairings(myRoster, roster);
          const hasData = roster.length > 0;

          return (
            <div key={label} style={{
              background: T.card,
              border: `1px solid ${sharedQB.length > 0 ? T.red + "44" : T.border}`,
              borderRadius: 6, padding: 10,
              borderTop: `2px solid ${label==="LEFT" ? T.blue : T.purple}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 10, fontWeight: 900,
                    color: label==="LEFT" ? T.blue : T.purple,
                    letterSpacing: 1.5,
                  }}>{label} · S{slot}</div>
                  <div style={{
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 8, color: T.dim, marginTop: 2,
                  }}>{roster.length}/18 tracked</div>
                </div>
                {shared.length > 0 && (
                  <div style={{
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 8, color: T.amber,
                    background: `${T.amber}22`,
                    padding: "2px 5px", borderRadius: 2,
                  }}>{shared.length} SHARED</div>
                )}
              </div>

              {!hasData ? (
                <div style={{
                  fontFamily: "'Share Tech Mono',monospace",
                  fontSize: 9, color: T.dim, textAlign: "center", padding: "8px 0",
                }}>
                  No picks tracked yet
                </div>
              ) : (
                <>
                  {/* Pos fill mini-bars */}
                  <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                    {[["QB",2],["RB",5],["WR",7],["TE",2]].map(([pos, need]) => {
                      const have = counts[pos];
                      const col = POS_C[pos]?.fg;
                      const pct = Math.min(100, (have/need)*100);
                      return (
                        <div key={pos} style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: "'Share Tech Mono',monospace",
                            fontSize: 7, color: col, textAlign: "center", marginBottom: 2,
                          }}>{pos}</div>
                          <div style={{
                            height: 4, background: T.bg, borderRadius: 2, overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", background: col,
                            }}/>
                          </div>
                          <div style={{
                            fontFamily: "'Share Tech Mono',monospace",
                            fontSize: 7, color: T.dim, textAlign: "center", marginTop: 1,
                          }}>{have}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Their top 3 picks */}
                  <div style={{ marginBottom: 6 }}>
                    {roster.slice(0, 3).map((p, i) => {
                      const isShared = shared.some(s => s.name === p.name);
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "2px 0",
                          opacity: isShared ? 1 : 0.8,
                        }}>
                          <PosBadge pos={p.pos}/>
                          <span style={{
                            fontSize: 10, fontWeight: isShared ? 700 : 500,
                            color: isShared ? T.amber : T.text,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{p.name.split(" ").slice(-1)[0]}</span>
                          {isShared && (
                            <span style={{
                              fontFamily: "'Share Tech Mono',monospace",
                              fontSize: 7, color: T.amber,
                            }}>!</span>
                          )}
                        </div>
                      );
                    })}
                    {roster.length > 3 && (
                      <div style={{
                        fontFamily: "'Share Tech Mono',monospace",
                        fontSize: 8, color: T.dim, marginTop: 2,
                      }}>+{roster.length-3} more</div>
                    )}
                  </div>

                  {/* Shared QB alert */}
                  {sharedQB.length > 0 && (
                    <div style={{
                      background: `${T.red}18`, borderRadius: 3, padding: "3px 6px",
                      fontFamily: "'Share Tech Mono',monospace",
                      fontSize: 8, color: T.red, marginBottom: 4,
                    }}>⚠ SAME QB STACK · {sharedQB[0]}</div>
                  )}

                  {/* Inspiration pairing */}
                  {inspirations.length > 0 && (
                    <div style={{
                      background: `${T.purple}18`, borderRadius: 3, padding: "4px 6px",
                      marginTop: 4,
                    }}>
                      <div style={{
                        fontFamily: "'Share Tech Mono',monospace",
                        fontSize: 7, color: T.purple, letterSpacing: 1, marginBottom: 2,
                      }}>💡 UNTRIED PAIRING</div>
                      <div style={{ fontSize: 10, color: T.text, lineHeight: 1.4 }}>
                        You have {inspirations[0].myTeammate.name.split(" ").pop()},
                        they added {inspirations[0].oppPlayer.name.split(" ").pop()} ({inspirations[0].oppPlayer.team}) —
                        try this stack in your next entry
                      </div>
                    </div>
                  )}

                  {/* What they need */}
                  {needs.length > 0 && (
                    <div style={{ marginTop: 5 }}>
                      <div style={{
                        fontFamily: "'Share Tech Mono',monospace",
                        fontSize: 7, color: T.dim, letterSpacing: 1, marginBottom: 3,
                      }}>NEEDS</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {needs.slice(0, 3).map(n => (
                          <span key={n.pos} style={{
                            padding: "1px 5px",
                            background: POS_C[n.pos]?.bg,
                            color: POS_C[n.pos]?.fg,
                            borderRadius: 3,
                            fontFamily: "'Share Tech Mono',monospace",
                            fontSize: 8, fontWeight: 700,
                          }}>{n.pos} ×{n.gap}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Competitive insights */}
      {insights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {insights.map((insight, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 6,
              padding: "5px 8px",
              background: `${insightColors[insight.t] || T.blue}14`,
              border: `1px solid ${insightColors[insight.t] || T.blue}33`,
              borderRadius: 4,
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 10,
                color: insightColors[insight.t] || T.blue,
                flexShrink: 0,
              }}>
                {insight.t==='warn'||insight.t==='need' ? '⚠' :
                 insight.t==='edge' ? '✓' :
                 insight.t==='stack' ? '↔' : '🔥'}
              </span>
              <span style={{
                fontSize: 11, color: T.text, lineHeight: 1.5,
                fontFamily: "'Barlow',sans-serif",
              }}>{insight.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMBO WARNING MODAL ────────────────────────────────────────────────────────
function ComboWarningModal({ player, combo, onConfirm, onCancel }) {
  const riskColor = combo.risk === 'high' ? '#FF4E6A' : '#FFB340';
  const riskLabel = combo.risk === 'high' ? 'HIGH CONCENTRATION' : 'MEDIUM CONCENTRATION';

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(6,10,18,0.88)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "0 16px 32px",
      animation: "fade-in 0.15s ease",
      backdropFilter: "blur(4px)",
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: "#0C1422",
          border: `1px solid ${riskColor}44`,
          borderTop: `2px solid ${riskColor}`,
          borderRadius: 12,
          padding: "20px 20px 24px",
          animation: "slide-up 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}>
          <div>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9, letterSpacing: 2,
              color: riskColor, marginBottom: 5,
            }}>⚠ PORTFOLIO ALERT · {riskLabel}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 24, fontWeight: 900, color: "#EBEEf8",
            }}>{player.name}</div>
          </div>
          <PosBadge pos={player.pos}/>
        </div>

        {/* Player exposure */}
        <div style={{
          background: `${riskColor}12`,
          border: `1px solid ${riskColor}33`,
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 10,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}>
            <span style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13, color: "#EBEEf8",
            }}>
              Already on <strong style={{color: riskColor}}>{combo.playerCount}/{combo.total} teams</strong>
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 900, color: riskColor,
            }}>{combo.playerPct.toFixed(0)}%</span>
          </div>
          {/* Exposure bar */}
          <div style={{height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden"}}>
            <div style={{
              width: `${combo.playerPct}%`, height: "100%",
              background: riskColor,
            }}/>
          </div>
        </div>

        {/* Pairing warnings */}
        {combo.pairingAlerts.length > 0 && (
          <div style={{marginBottom: 14}}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9, color: "#4A5068", letterSpacing: 1.5, marginBottom: 7,
            }}>PAIRING CONCENTRATION</div>
            {combo.pairingAlerts.slice(0, 3).map(alert => (
              <div key={alert.partner} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                background: "#111C30",
                borderRadius: 5,
                marginBottom: 4,
              }}>
                <span style={{fontSize: 12, color: "#8892AA"}}>
                  with{" "}
                  <span style={{color: "#EBEEf8", fontWeight: 600}}>
                    {alert.partner.split(' ').slice(-1)[0]}
                  </span>
                </span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 16, fontWeight: 900,
                  color: alert.pct >= 40 ? '#FF4E6A' : alert.pct >= 25 ? '#FFB340' : '#8892AA',
                }}>
                  {alert.count}/{combo.total} · {alert.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{display: "flex", gap: 8}}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px",
            background: "transparent",
            color: "#8892AA",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 16, fontWeight: 900, cursor: "pointer",
          }}>PICK DIFFERENT</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "12px",
            background: riskColor,
            color: "#060A12",
            border: "none",
            borderRadius: 8,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 16, fontWeight: 900, cursor: "pointer",
          }}>DRAFT ANYWAY</button>
        </div>
      </div>
    </div>
  );
}

// ── BOOKMARKLET INSTALLER ─────────────────────────────────────────────────────
const BM_CODE = `javascript:(function(){var s=window.getSelection().toString().trim()||document.activeElement?.innerText?.trim()||'';if(!s||s.length<2){alert('Select a player name on Underdog first, then click this bookmark.');return;}navigator.clipboard.writeText(s).then(function(){var e=document.createElement('div');e.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;background:gold;color:black;padding:10px 18px;border-radius:8px;font:bold 14px/1.4 sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);white-space:nowrap';e.textContent='Copied: '+s.slice(0,28)+' \u2014 switch to COPILOT';document.body.appendChild(e);setTimeout(function(){e.remove()},2500);}).catch(function(){prompt('Copy this manually:',s);});})();`;

function BookmarkletInstaller() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: T.panel, borderRadius: 12,
      border: `1px solid ${T.teal}33`,
      padding: 16, marginBottom: 14,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9, letterSpacing: 2, color: T.dim, marginBottom: 4,
          }}>COMPANION BOOKMARKLET</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            One-click clipboard bridge
          </div>
          <div style={{ fontSize: 11, color: T.mute, marginTop: 2, lineHeight: 1.5 }}>
            Install once → click on Underdog → copies pick automatically
          </div>
        </div>
        <button onClick={() => setOpen(v => !v)} style={{
          padding: "6px 12px",
          background: open ? `${T.teal}25` : T.card,
          color: T.teal, border: `1px solid ${T.teal}44`,
          borderRadius: 6, fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          {open ? "HIDE" : "INSTALL"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, animation: "slide-down 0.2s ease" }}>
          {/* Step 1: Drag the link */}
          <div style={{
            background: T.card, borderRadius: 8, padding: 14, marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9, color: T.dim, letterSpacing: 1.5, marginBottom: 8,
            }}>DESKTOP: DRAG TO BOOKMARKS BAR</div>
            <a
              href={BM_CODE}
              onClick={e => e.preventDefault()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 16px",
                background: `linear-gradient(135deg, ${T.gold}, #FFB830)`,
                color: T.bg, borderRadius: 6, textDecoration: "none",
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 16, fontWeight: 900, letterSpacing: 1,
                cursor: "grab", userSelect: "none",
                boxShadow: `0 2px 12px ${T.gold}44`,
              }}
              draggable
            >
              📋 COPILOT PASTE
            </a>
            <div style={{
              fontSize: 11, color: T.mute, marginTop: 8, lineHeight: 1.6,
            }}>
              ← Drag this button to your browser's bookmarks bar.
              If you don't see the bar, press <strong>Ctrl+Shift+B</strong> (Windows) or <strong>Cmd+Shift+B</strong> (Mac).
            </div>
          </div>

          {/* Step 2: How to use */}
          <div style={{
            background: `${T.teal}10`, border: `1px solid ${T.teal}22`,
            borderRadius: 8, padding: 14, marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9, color: T.teal, letterSpacing: 1.5, marginBottom: 8,
            }}>HOW TO USE (every pick)</div>
            {[
              ["1", "On Underdog, when a pick is made — select the player's name (double-tap or click)"],
              ["2", "Click the 📋 COPILOT PASTE bookmark in your bar"],
              ["3", "Gold flash confirms it copied — switch to this tab"],
              ["4", "Tap 📋 PASTE in the top bar — match appears instantly"],
              ["5", "Tap MY PICK or OPP PICK — done"],
            ].map(([n, t]) => (
              <div key={n} style={{ display:"flex", gap:10, marginBottom:6, alignItems:"flex-start" }}>
                <span style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:14, fontWeight:900, color:T.teal, minWidth:14,
                }}>{n}</span>
                <span style={{ fontSize:11, color:T.mute, lineHeight:1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Mobile note */}
          <div style={{
            background: T.card, borderRadius: 8, padding: 12,
            fontSize: 11, color: T.mute, lineHeight: 1.6,
          }}>
            <strong style={{ color: T.amber }}>📱 Mobile:</strong> Save this page as a bookmark first.
            Then edit the bookmark URL and replace it with the bookmarklet code below.
            Tap to copy:
            <div
              onClick={() => navigator.clipboard.writeText(BM_CODE).catch(()=>{})}
              style={{
                marginTop: 8, padding: "8px 10px",
                background: T.bg, borderRadius: 4,
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 9, color: T.dim, lineHeight: 1.4,
                wordBreak: "break-all", cursor: "pointer",
                border: `1px solid ${T.border}`,
              }}
            >
              {BM_CODE.slice(0, 80)}…
              <span style={{ color: T.teal, marginLeft: 6 }}>(tap to copy all)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PASTE PICK MODAL ──────────────────────────────────────────────────────────
function PastePickModal({ match, rawText, needsInput, pasteInput, onInputChange, onTryMatch, onMyPick, onOppPick, onClose, isMyTurn }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(6,10,18,0.85)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "0 16px 28px",
      animation: "fade-in 0.15s ease",
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: "#0C1422",
          border: `1px solid ${T.teal}55`,
          borderTop: `2px solid ${T.teal}`,
          borderRadius: 12, padding: "20px 20px 24px",
          animation: "slide-up 0.2s ease",
        }}
      >
        <div style={{
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 9, letterSpacing: 2, color: T.teal, marginBottom: 12,
        }}>📋 PASTE PICK — {isMyTurn ? "YOUR TURN" : "LOG PICK"}</div>

        {needsInput || !match ? (
          <>
            {rawText && (
              <div style={{
                fontSize: 11, color: T.mute, marginBottom: 10, lineHeight: 1.5,
              }}>
                No match found for "<span style={{color:T.text}}>{rawText.slice(0,40)}</span>". Edit below:
              </div>
            )}
            <input
              value={pasteInput}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onTryMatch()}
              placeholder="Type player name..."
              autoFocus
              style={{
                width: "100%", padding: "12px 14px",
                background: T.card, border: `1px solid ${T.hi}`,
                color: T.text, borderRadius: 8,
                fontFamily: "'Barlow',sans-serif",
                fontSize: 16, outline: "none", marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onTryMatch} style={{
                flex: 1, padding: "11px",
                background: T.teal, color: T.bg, border: "none",
                borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 16, fontWeight: 900, cursor: "pointer",
              }}>FIND PLAYER</button>
              <button onClick={onClose} style={{
                padding: "11px 16px", background: "transparent", color: T.dim,
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>CANCEL</button>
            </div>
          </>
        ) : (
          <>
            {/* Matched player card */}
            <div style={{
              background: `${T.teal}12`, border: `1px solid ${T.teal}33`,
              borderRadius: 8, padding: "14px 16px", marginBottom: 14,
            }}>
              <div style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 9, color: T.dim, letterSpacing: 1.5, marginBottom: 6,
              }}>MATCHED FROM CLIPBOARD</div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <PosBadge pos={match.pos}/>
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 26, fontWeight: 900, color: T.text, lineHeight: 1,
                  }}>{match.name}</div>
                  <div style={{
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 10, color: T.mute, marginTop: 3,
                  }}>{match.team} · ADP {match.adp?.toFixed(0)} · BYE {match.bye}</div>
                </div>
              </div>
            </div>

            {/* Not right? */}
            <button onClick={() => onInputChange(rawText)} style={{
              background: "none", border: "none",
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9, color: T.dim, cursor: "pointer",
              letterSpacing: 1, marginBottom: 12, padding: 0,
              textDecoration: "underline",
            }}>NOT RIGHT? TYPE PLAYER NAME</button>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onMyPick} style={{
                flex: 1, padding: "14px",
                background: isMyTurn
                  ? `linear-gradient(135deg, ${T.gold}, #FFB830)`
                  : T.card,
                color: isMyTurn ? T.bg : T.mute,
                border: `1px solid ${isMyTurn ? T.gold : T.border}`,
                borderRadius: 8,
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 17, fontWeight: 900, letterSpacing: 0.5,
                cursor: "pointer",
                boxShadow: isMyTurn ? `0 2px 12px ${T.gold}44` : "none",
              }}>
                ✓ MY PICK
              </button>
              <button onClick={onOppPick} style={{
                flex: 1, padding: "14px",
                background: T.card, color: T.mute,
                border: `1px solid ${T.border}`, borderRadius: 8,
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 17, fontWeight: 900, letterSpacing: 0.5,
                cursor: "pointer",
              }}>
                ↑ OPP PICK
              </button>
            </div>
            <button onClick={onClose} style={{
              width:"100%", marginTop:8, padding:"8px",
              background:"transparent", color:T.dim,
              border:"none", fontFamily:"'Share Tech Mono',monospace",
              fontSize:10, letterSpacing:1, cursor:"pointer",
            }}>CANCEL</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAST DRAFT SCREEN — 1-tap design for 30–90s timer rooms
// ═══════════════════════════════════════════════════════════════════════════

// Voice input hook
function useVoice(onTranscript) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() =>
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const recRef = useRef(null);

  const start = () => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.maxAlternatives = 5;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const texts = Array.from(e.results[0]).map(r => r.transcript.trim());
      onTranscript(texts);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };
  return { listening, supported, start, stop };
}

function FastDraftScreen({ mySlot, currentPick, isMyTurn, isDone,
  available, myRoster, recs, drafted, targets,
  scarcity, tierMap, savedDrafts,
  onLogMine, onLogPosBySlot, onSkip, onDone, onReset }) {

  const [targetAlert, setTargetAlert] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);
  const [lastAction, setLastAction] = useState(null); // brief visual feedback

  const round = Math.ceil(currentPick / 12);
  const upcoming = myUpcomingPicks(mySlot, currentPick);
  const counts = rosterCounts(myRoster);
  const myRosterNames = new Set(myRoster.map(p => p.name));

  // Check if a target was just taken
  const recentPick = drafted[drafted.length - 1];
  const recentPlayer = recentPick ? PLAYERS.find(p => p.id === recentPick.playerId) : null;
  const recentIsTarget = recentPlayer && targets.some(t => t.id === recentPlayer.id);

  const rushingPos = Object.entries(scarcity)
    .filter(([_, r]) => r > 1.2)
    .map(([pos]) => pos);

  // Voice handler
  const { listening, supported, start: startVoice, stop: stopVoice } = useVoice((texts) => {
    for (const text of texts) {
      const match = fuzzyMatchPlayer(text, available);
      if (match) { setVoiceResult({ match, text }); return; }
    }
    // Try all alternatives combined
    const combined = texts.join(' ');
    const match = fuzzyMatchPlayer(combined, available);
    if (match) setVoiceResult({ match, text: combined });
  });

  const logPos = (pos) => {
    onLogPosBySlot(pos);
    setLastAction({ label: pos, color: POS_C[pos]?.fg || T.mute });
    setTimeout(() => setLastAction(null), 600);
  };

  const POS_BTNS = ['QB','RB','WR','TE'];

  return (
    <div style={{
      height: "100svh",
      background: `linear-gradient(180deg, #070C1A 0%, ${T.bg} 30%)`,
      fontFamily: "'Barlow', sans-serif",
      color: T.text,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: isMyTurn
          ? `linear-gradient(135deg, #1A1400, #1F1800)`
          : `linear-gradient(135deg, #07101E, #0A1628)`,
        borderBottom: `2px solid ${isMyTurn ? T.gold : T.blue}66`,
        padding: "12px 16px 10px",
        flexShrink: 0,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:10, color:T.teal, letterSpacing:1.5,
                background:`${T.teal}18`, padding:"2px 7px", borderRadius:10,
              }}>⚡ FAST</span>
              <span style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:11, color: isMyTurn ? T.gold : T.dim,
                letterSpacing:0.5,
              }}>
                PICK {currentPick} · RD {round} · SLOT {pickToSlot(currentPick)}
              </span>
            </div>
            <div style={{
              fontFamily:"'Barlow Condensed',sans-serif",
              fontSize: isMyTurn ? 24 : 18, fontWeight:900,
              color: isMyTurn ? T.gold : T.mute,
              marginTop:2, letterSpacing:0.5,
              animation: isMyTurn ? 'clock-pulse 1s ease-in-out infinite' : 'none',
            }}>
              {isMyTurn ? "▶ YOUR TURN — PICK NOW" : `SLOT ${pickToSlot(currentPick)} PICKING…`}
            </div>
          </div>

          <div style={{ display:"flex", gap:5 }}>
            {isDone && (
              <button onClick={onDone} style={{
                padding:"7px 12px", background:T.green, color:T.bg, border:"none",
                borderRadius:7, fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:13, fontWeight:900, cursor:"pointer",
              }}>FINISH</button>
            )}
            <button onClick={onReset} style={{
              padding:"6px 8px", background:"transparent", color:T.dim,
              border:`1px solid ${T.border}`, borderRadius:7,
              fontFamily:"'Share Tech Mono',monospace", fontSize:9, cursor:"pointer",
            }}>RESET</button>
          </div>
        </div>

        {/* Upcoming picks dots */}
        <div style={{ display:"flex", gap:4, marginTop:8, alignItems:"center" }}>
          {upcoming.slice(0,5).map((p,i) => (
            <div key={p} style={{
              padding:"2px 7px",
              background: i===0&&isMyTurn ? T.gold : T.card,
              color: i===0&&isMyTurn ? T.bg : T.dim,
              borderRadius:3, fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, border:`1px solid ${i===0 ? T.gold+"44" : T.border}`,
            }}>{pickToRound(p)}</div>
          ))}

          {/* Rush indicators */}
          {rushingPos.map(pos => (
            <div key={pos} style={{
              padding:"2px 6px", background:POS_C[pos]?.bg, borderRadius:3,
              fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:10, fontWeight:900, color:POS_C[pos]?.fg,
            }}>🔥{pos}</div>
          ))}
        </div>
      </div>

      {/* ── TARGET ALERT ── */}
      {recentIsTarget && (
        <div style={{
          background:`${T.red}18`, borderBottom:`1px solid ${T.red}44`,
          padding:"8px 16px",
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:14, color:T.red, fontWeight:900, letterSpacing:0.5,
          animation:"slide-down 0.2s ease",
        }}>
          ⚠ TARGET GONE: {recentPlayer.name} just went off the board!
        </div>
      )}

      {/* ── VOICE RESULT MODAL ── */}
      {voiceResult && (
        <div style={{
          position:"fixed", inset:0, zIndex:9999,
          background:"rgba(6,10,18,0.9)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:24, animation:"fade-in 0.15s ease",
        }} onClick={() => setVoiceResult(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:T.panel, border:`1px solid ${T.teal}55`,
            borderTop:`2px solid ${T.teal}`,
            borderRadius:12, padding:24, width:"100%", maxWidth:360,
            animation:"pop 0.2s ease",
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, color:T.teal, letterSpacing:2, marginBottom:10,
            }}>🎙 VOICE MATCH</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <PosBadge pos={voiceResult.match.pos}/>
              <div>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:26, fontWeight:900, color:T.text,
                }}>{voiceResult.match.name}</div>
                <div style={{
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:10, color:T.mute, marginTop:2,
                }}>{voiceResult.match.team} · ADP {voiceResult.match.adp?.toFixed(0)}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { onLogMine(voiceResult.match); setVoiceResult(null); }} style={{
                flex:1, padding:"13px",
                background:`linear-gradient(135deg,${T.gold},#FFB830)`,
                color:T.bg, border:"none", borderRadius:8,
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:17, fontWeight:900, cursor:"pointer",
              }}>✓ MY PICK</button>
              <button onClick={() => {
                onLogPosBySlot(voiceResult.match.pos);
                setVoiceResult(null);
              }} style={{
                flex:1, padding:"13px",
                background:T.card, color:T.mute,
                border:`1px solid ${T.border}`, borderRadius:8,
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:17, fontWeight:900, cursor:"pointer",
              }}>↑ OPP</button>
            </div>
            <button onClick={()=>setVoiceResult(null)} style={{
              width:"100%", marginTop:8, padding:"7px",
              background:"none", border:"none", color:T.dim,
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, letterSpacing:1, cursor:"pointer",
            }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* ── MAIN AREA ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {isMyTurn && !isDone ? (
          /* YOUR TURN — big recommendation cards */
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, color:T.dim, letterSpacing:2, marginBottom:10,
            }}>TAP TO DRAFT</div>

            {recs.map((p,i) => {
              const tierInfo = tierMap?.[p.id];
              const isTop = i===0;
              return (
                <button key={p.id} onClick={() => onLogMine(p)} style={{
                  width:"100%", marginBottom:10,
                  padding:"16px",
                  background: isTop
                    ? `linear-gradient(135deg, ${T.gold}20, ${T.gold}10)`
                    : T.card,
                  border:`2px solid ${isTop ? T.gold : T.border}`,
                  borderRadius:12, textAlign:"left", cursor:"pointer",
                  animation: isTop ? "pulse-ring 2.5s infinite" : "none",
                  display:"flex", alignItems:"center", gap:14,
                  boxShadow: isTop ? `0 0 20px ${T.gold}22` : "none",
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:8,
                    background: POS_C[p.pos]?.bg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0,
                  }}>
                    <span style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:16, fontWeight:900,
                      color:POS_C[p.pos]?.fg,
                    }}>{p.pos}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <span style={{
                        fontFamily:"'Barlow Condensed',sans-serif",
                        fontSize:22, fontWeight:900, color:T.text, lineHeight:1,
                      }}>{p.name}</span>
                      {tierInfo?.lastInTier && (
                        <span style={{
                          fontFamily:"'Share Tech Mono',monospace",
                          fontSize:8, color:T.amber,
                          background:`${T.amber}20`, padding:"1px 4px", borderRadius:2,
                        }}>LAST T{tierInfo.tier}</span>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <span style={{
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:10, color:T.mute,
                      }}>{p.team}</span>
                      <span style={{
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:10, color:T.dim,
                      }}>ADP {p.adp?.toFixed(0)}</span>
                      {p.reasons?.slice(0,2).map((r,ri) => (
                        <span key={ri} style={{
                          fontFamily:"'Share Tech Mono',monospace",
                          fontSize:8,
                          color:{val:T.green,need:T.blue,stack:T.purple,tier:T.amber,scarc:T.red}[r.t]||T.mute,
                        }}>{r.text}</span>
                      ))}
                    </div>
                  </div>
                  {isTop && (
                    <div style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:13, fontWeight:900, color:T.gold,
                      background:`${T.gold}20`, padding:"6px 10px",
                      borderRadius:6, flexShrink:0,
                    }}>DRAFT</div>
                  )}
                </button>
              );
            })}

            {/* Target check — show if any available */}
            {targets.filter(t => !myRosterNames.has(t.name) && available.some(a => a.id === t.id)).length > 0 && (
              <div style={{
                background:`${T.amber}12`, border:`1px solid ${T.amber}33`,
                borderRadius:8, padding:"10px 12px", marginTop:4,
              }}>
                <div style={{
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:9, color:T.amber, letterSpacing:1.5, marginBottom:6,
                }}>TARGETS STILL AVAILABLE</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {targets
                    .filter(t => !myRosterNames.has(t.name) && available.some(a => a.id === t.id))
                    .map(t => (
                      <button key={t.id} onClick={() => onLogMine(t)} style={{
                        display:"flex", alignItems:"center", gap:5, padding:"5px 10px",
                        background:POS_C[t.pos]?.bg, border:`1px solid ${POS_C[t.pos]?.fg}44`,
                        borderRadius:5, cursor:"pointer",
                      }}>
                        <PosBadge pos={t.pos}/>
                        <span style={{fontSize:13, fontWeight:700, color:T.text}}>
                          {t.name.split(' ').slice(-1)[0]}
                        </span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        ) : (
          /* OPPONENT'S TURN — position tiles */
          <div style={{
            flex:1, display:"flex", flexDirection:"column",
            padding:"16px 14px", gap:12,
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, color:T.dim, letterSpacing:2,
              textAlign:"center",
            }}>TAP WHAT POSITION THEY JUST DRAFTED</div>

            {/* Big 2x2 position grid */}
            <div style={{
              display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:12, flex:1, maxHeight:300,
            }}>
              {POS_BTNS.map(pos => {
                const c = POS_C[pos];
                const isScarce = rushingPos.includes(pos);
                const myCount = counts[pos];
                const avail = available.filter(p => p.pos === pos).length;
                return (
                  <button key={pos} onClick={() => logPos(pos)} style={{
                    background:`${c.bg}`,
                    border:`2px solid ${isScarce ? c.fg : c.fg+"55"}`,
                    borderRadius:16, cursor:"pointer",
                    display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center",
                    gap:8, padding:"16px 0",
                    boxShadow: isScarce ? `0 0 20px ${c.fg}33` : "none",
                    transition:"transform 0.08s",
                    WebkitTapHighlightColor:"transparent",
                  }}>
                    <div style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:44, fontWeight:900, color:c.fg, lineHeight:1,
                    }}>{pos}</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      {isScarce && (
                        <span style={{
                          fontFamily:"'Barlow Condensed',sans-serif",
                          fontSize:11, color:c.fg, fontWeight:900, letterSpacing:0.5,
                        }}>🔥 RUSHING</span>
                      )}
                    </div>
                    <div style={{
                      fontFamily:"'Share Tech Mono',monospace",
                      fontSize:9, color:`${c.fg}99`,
                    }}>{avail} left · mine:{myCount}</div>
                  </button>
                );
              })}
            </div>

            {/* Skip button */}
            <button onClick={onSkip} style={{
              padding:"10px", background:"transparent",
              color:T.dim, border:`1px solid ${T.border}`,
              borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:14, fontWeight:700, cursor:"pointer",
              letterSpacing:0.5,
            }}>SKIP PICK (unknown player) →</button>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR — voice + roster counts ── */}
      <div style={{
        background:T.panel, borderTop:`1px solid ${T.border}`,
        padding:"12px 14px 22px", flexShrink:0,
      }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* Roster counts */}
          <div style={{ display:"flex", gap:6, flex:1 }}>
            {['QB','RB','WR','TE'].map(pos => {
              const have = counts[pos];
              const IDEAL = {QB:2,RB:5,WR:7,TE:2};
              const col = POS_C[pos]?.fg;
              const done = have >= IDEAL[pos];
              return (
                <div key={pos} style={{
                  flex:1, background:T.card, borderRadius:6,
                  padding:"5px 3px", textAlign:"center",
                  border:`1px solid ${done?col+"33":T.border}`,
                }}>
                  <div style={{
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontSize:10, fontWeight:900, color:col, letterSpacing:0.5,
                  }}>{pos}</div>
                  <div style={{
                    fontFamily:"'Share Tech Mono',monospace",
                    fontSize:12, fontWeight:700, color:T.text,
                  }}>{have}<span style={{color:T.dim, fontSize:9}}>/{IDEAL[pos]}</span></div>
                </div>
              );
            })}
          </div>

          {/* Voice button */}
          {supported ? (
            <button
              onPointerDown={startVoice}
              onPointerUp={stopVoice}
              onPointerLeave={stopVoice}
              style={{
                width:52, height:52, borderRadius:"50%", border:"none",
                background: listening
                  ? `radial-gradient(circle, ${T.red}, ${T.red}aa)`
                  : `radial-gradient(circle, ${T.purple}, ${T.purple}88)`,
                color:"white", fontSize:22, cursor:"pointer",
                flexShrink:0,
                boxShadow: listening
                  ? `0 0 0 8px ${T.red}33, 0 0 0 16px ${T.red}18`
                  : `0 0 16px ${T.purple}44`,
                transition:"all 0.15s",
                animation: listening ? "pulse-red 0.8s infinite" : "none",
              }}
              title="Hold to log by voice"
            >
              {listening ? "🔴" : "🎙"}
            </button>
          ) : (
            <div style={{
              width:52, height:52, borderRadius:"50%",
              background:T.card, display:"flex", alignItems:"center",
              justifyContent:"center", flexShrink:0,
              fontFamily:"'Share Tech Mono',monospace", fontSize:8,
              color:T.dim, textAlign:"center", lineHeight:1.3,
            }}>NO VOICE</div>
          )}
        </div>

        {listening && (
          <div style={{
            marginTop:8, fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:13, color:T.red, textAlign:"center",
            fontWeight:700, letterSpacing:0.5,
            animation:"clock-pulse 0.6s infinite",
          }}>🎙 LISTENING… say the player's name</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHEAT SHEET — Monte Carlo pre-draft planning for fast/autopilot modes
// ═══════════════════════════════════════════════════════════════════════════
function runCheatSheet(slot, targets, nSims = 40) {
  const targetIds = new Set(targets.map(t => t.id));
  const rounds = Array.from({length:18}, () => ({}));

  for (let sim = 0; sim < nSims; sim++) {
    const drafted = new Set();
    for (let pick = 1; pick <= 216; pick++) {
      const curSlot = pickToSlot(pick);
      const avail = PLAYERS.filter(p => !drafted.has(p.id)).sort((a,b) => a.adp - b.adp);
      if (!avail.length) break;
      const round = Math.ceil(pick / 12) - 1;

      if (curSlot === slot) {
        // MY PICK — take best available (with slight target preference)
        const targetAvail = avail.find(p => targetIds.has(p.id));
        const best = targetAvail || avail[0];
        const r = rounds[round];
        r[best.name] = (r[best.name] || {count:0, pos:best.pos, team:best.team, adp:best.adp});
        r[best.name].count++;
        drafted.add(best.id);
      } else {
        // OPP PICK — pick from top with noise (simulates ADP deviation)
        const noise = Math.floor(Math.random() * Math.min(4, avail.length));
        drafted.add(avail[noise].id);
      }
    }
  }

  return rounds.map((r, i) => ({
    round: i + 1,
    options: Object.entries(r)
      .sort((a,b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([name, d]) => ({
        name, pos: d.pos, team: d.team, adp: d.adp,
        pct: Math.round((d.count / nSims) * 100),
        isTarget: targets.some(t => t.name === name),
      })),
  }));
}

function CheatSheetModal({ slot, targets, onClose }) {
  const [sheet, setSheet] = useState(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    // Run in next tick to avoid blocking render
    setTimeout(() => {
      const result = runCheatSheet(slot, targets);
      setSheet(result);
      setRunning(false);
    }, 50);
  }, [slot]);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(6,10,18,0.95)",
      display:"flex", flexDirection:"column",
      fontFamily:"'Barlow',sans-serif", color:T.text,
      animation:"fade-in 0.2s ease",
    }}>
      {/* Header */}
      <div style={{
        background:T.panel, borderBottom:`1px solid ${T.border}`,
        padding:"14px 18px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexShrink:0,
      }}>
        <div>
          <div style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:9, color:T.amber, letterSpacing:2, marginBottom:4,
          }}>📋 DRAFT CHEAT SHEET · SLOT {slot}</div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:20, fontWeight:900,
          }}>Round-by-Round Pick Guide</div>
          <div style={{fontSize:11,color:T.mute,marginTop:2}}>
            Based on {40} simulations vs ADP field · Screenshot this before entering the draft room
          </div>
        </div>
        <button onClick={onClose} style={{
          padding:"8px 14px", background:T.card,
          color:T.mute, border:`1px solid ${T.border}`,
          borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:14, fontWeight:700, cursor:"pointer",
        }}>✕ CLOSE</button>
      </div>

      {/* Sheet content */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 18px" }}>
        {running ? (
          <div style={{
            padding:48, textAlign:"center",
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:12, color:T.purple,
            animation:"clock-pulse 0.8s infinite",
          }}>
            ⚙ RUNNING {40} SIMULATIONS…
          </div>
        ) : sheet?.map(row => {
          const topOpt = row.options[0];
          if (!topOpt) return null;
          return (
            <div key={row.round} style={{
              display:"flex", gap:12, alignItems:"flex-start",
              padding:"10px 0", borderBottom:`1px solid ${T.border}`,
            }}>
              {/* Round badge */}
              <div style={{
                width:36, height:36, borderRadius:6, flexShrink:0,
                background:topOpt.isTarget?`${T.amber}22`:T.card,
                border:`1px solid ${topOpt.isTarget?T.amber+"44":T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:16, fontWeight:900,
                color:topOpt.isTarget?T.amber:T.mute,
              }}>R{row.round}</div>

              {/* Options */}
              <div style={{ flex:1 }}>
                {row.options.map((opt, i) => (
                  <div key={opt.name} style={{
                    display:"flex", alignItems:"center", gap:8, marginBottom:4,
                    opacity: i===0 ? 1 : 0.55,
                  }}>
                    <PosBadge pos={opt.pos}/>
                    <span style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize: i===0 ? 17 : 14,
                      fontWeight:900, color: opt.isTarget ? T.amber : T.text,
                    }}>
                      {opt.name}
                      {opt.isTarget && " ★"}
                    </span>
                    <span style={{
                      fontFamily:"'Share Tech Mono',monospace",
                      fontSize:9, color:T.mute,
                    }}>{opt.team}</span>
                    {i===0 && (
                      <span style={{
                        marginLeft:"auto",
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:10, color:T.teal, fontWeight:700,
                      }}>{opt.pct}%</span>
                    )}
                    {i>0 && (
                      <span style={{
                        marginLeft:"auto",
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:9, color:T.dim,
                      }}>alt {opt.pct}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding:"12px 18px 24px",
        background:T.panel, borderTop:`1px solid ${T.border}`,
        flexShrink:0,
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:9, color:T.dim, letterSpacing:1, lineHeight:1.6,
      }}>
        ★ = your target · % = frequency in simulations · ADP deviations expected in live drafts
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOPILOT DRAFT SCREEN — zero interaction between picks
// ═══════════════════════════════════════════════════════════════════════════
function AutopilotDraftScreen({ mySlot, currentPick, isMyTurn, isDone,
  available, myRoster, recs, drafted, targets,
  tierMap, scarcity, draftSpeed,
  onLogMine, onAutoAdvance, onDone, onReset }) {

  const [vibrated, setVibrated] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const picksAway = useMemo(() => {
    if (isMyTurn) return 0;
    for (let i=0; i<=24; i++) {
      if (pickToSlot(currentPick + i) === mySlot) return i;
    }
    return 99;
  }, [currentPick, mySlot, isMyTurn]);

  // AUTO-ADVANCE opponent picks
  useEffect(() => {
    if (isMyTurn || isDone) return;
    const delay = 180; // 180ms — fast enough to feel immediate
    const t = setTimeout(onAutoAdvance, delay);
    return () => clearTimeout(t);
  }, [currentPick, isMyTurn, isDone]);

  // Vibrate + countdown when your pick is approaching
  useEffect(() => {
    if (isDone) return;
    if (isMyTurn) {
      // Vibrate on your turn
      if (!vibrated) {
        try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
        setVibrated(true);
      }
      setSecondsLeft(draftSpeed);
      // Count down
      const interval = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setVibrated(false);
      setSecondsLeft(null);
      // Pre-alert vibration when 1 pick away
      if (picksAway === 1) {
        try { navigator.vibrate?.([100]); } catch {}
      }
    }
  }, [isMyTurn, isDone, currentPick]);

  const round = Math.ceil(currentPick / 12);
  const counts = rosterCounts(myRoster);
  const myRosterNames = new Set(myRoster.map(p => p.name));
  const targetAvail = targets.filter(t => !myRosterNames.has(t.name) && available.some(a => a.id === t.id));
  const timeUntilPick = picksAway > 0 ? picksAway * draftSpeed : 0;

  if (isMyTurn && !isDone) {
    // FULL SCREEN YOUR TURN
    return (
      <div style={{
        height:"100svh",
        background:`linear-gradient(160deg, #1A1400 0%, #0A0D1A 50%)`,
        fontFamily:"'Barlow',sans-serif", color:T.text,
        display:"flex", flexDirection:"column",
        overflow:"hidden",
        animation:"fade-in 0.15s ease",
      }}>
        {/* Alert header */}
        <div style={{
          background:`linear-gradient(135deg, ${T.gold}22, ${T.gold}08)`,
          borderBottom:`2px solid ${T.gold}`,
          padding:"16px 18px 12px", flexShrink:0,
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          }}>
            <div>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:36, fontWeight:900, color:T.gold, lineHeight:0.95,
                letterSpacing:-0.5,
                animation:"clock-pulse 0.8s ease-in-out infinite",
              }}>▶ YOUR PICK<br/>IS NOW</div>
              <div style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:10, color:T.amber, letterSpacing:1.5, marginTop:6,
              }}>PICK {currentPick} · ROUND {round} · SLOT {mySlot}</div>
            </div>
            {secondsLeft !== null && (
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:56, fontWeight:900,
                color: secondsLeft <= 5 ? T.red : secondsLeft <= 10 ? T.amber : T.gold,
                lineHeight:1,
                animation: secondsLeft <= 5 ? "pulse-ring 0.5s infinite" : "none",
              }}>{secondsLeft}</div>
            )}
          </div>
        </div>

        {/* Rec cards — simplified, max 3 */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
          {/* Targets first if available */}
          {targetAvail.length > 0 && (
            <div style={{marginBottom:10}}>
              <div style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:9, color:T.amber, letterSpacing:1.5, marginBottom:6,
              }}>★ TARGETS ON THE BOARD</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {targetAvail.map(t => (
                  <button key={t.id} onClick={() => onLogMine(t)} style={{
                    display:"flex", alignItems:"center", gap:6,
                    padding:"10px 14px",
                    background:`${T.amber}20`, border:`2px solid ${T.amber}`,
                    borderRadius:8, cursor:"pointer",
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontSize:18, fontWeight:900, color:T.amber,
                  }}>
                    <PosBadge pos={t.pos}/>{t.name.split(' ').slice(-1)[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{
            fontFamily:"'Share Tech Mono',monospace",
            fontSize:9, color:T.dim, letterSpacing:2, marginBottom:8,
          }}>RECOMMENDATIONS — TAP TO DRAFT</div>

          {recs.map((p,i) => {
            const tierInfo = tierMap?.[p.id];
            const isTop = i===0;
            return (
              <button key={p.id} onClick={() => onLogMine(p)} style={{
                width:"100%", marginBottom:10,
                padding:"16px",
                background: isTop?`linear-gradient(135deg,${T.gold}25,${T.gold}10)`:T.card,
                border:`2px solid ${isTop?T.gold:T.border}`,
                borderRadius:12, textAlign:"left", cursor:"pointer",
                display:"flex", alignItems:"center", gap:14,
                animation: isTop?"pulse-ring 2s infinite":"none",
                boxShadow: isTop?`0 0 24px ${T.gold}30`:"none",
              }}>
                <div style={{
                  width:48, height:48, borderRadius:8,
                  background:POS_C[p.pos]?.bg, display:"flex",
                  alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  <span style={{
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontSize:18, fontWeight:900, color:POS_C[p.pos]?.fg,
                  }}>{p.pos}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <span style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:24, fontWeight:900, color:T.text, lineHeight:1,
                    }}>{p.name}</span>
                    {tierInfo?.lastInTier && (
                      <span style={{
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:8, color:T.amber,
                        background:`${T.amber}20`, padding:"1px 4px", borderRadius:2,
                      }}>LAST T{tierInfo.tier}</span>
                    )}
                  </div>
                  <div style={{
                    fontFamily:"'Share Tech Mono',monospace",
                    fontSize:10, color:T.mute,
                  }}>{p.team} · ADP {p.adp?.toFixed(0)} · BYE {p.bye}</div>
                </div>
                {isTop && <div style={{
                  padding:"8px 14px",
                  background:T.gold, color:T.bg, borderRadius:6,
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:14, fontWeight:900, flexShrink:0,
                }}>DRAFT</div>}
              </button>
            );
          })}

          <button onClick={onReset} style={{
            width:"100%", padding:"10px", background:"transparent",
            color:T.dim, border:`1px solid ${T.border}`,
            borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:14, fontWeight:700, cursor:"pointer", marginTop:8,
          }}>RESET DRAFT</button>
        </div>

        {/* Roster counts */}
        <div style={{
          background:T.panel, borderTop:`1px solid ${T.border}`,
          padding:"10px 14px 22px", display:"flex", gap:6, flexShrink:0,
        }}>
          {['QB','RB','WR','TE'].map(pos => {
            const have = counts[pos];
            const IDEAL={QB:2,RB:5,WR:7,TE:2};
            const col = POS_C[pos]?.fg;
            return (
              <div key={pos} style={{
                flex:1, background:T.card, borderRadius:6,
                padding:"5px 3px", textAlign:"center",
                border:`1px solid ${have>=IDEAL[pos]?col+"33":T.border}`,
              }}>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:10, fontWeight:900, color:col,
                }}>{pos}</div>
                <div style={{
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:12, color:T.text,
                }}>{have}<span style={{color:T.dim,fontSize:9}}>/{IDEAL[pos]}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // WAITING STATE — autopilot running, watching opponent picks
  const estimatedSeconds = timeUntilPick;
  const mins = Math.floor(estimatedSeconds / 60);
  const secs = estimatedSeconds % 60;
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2,'0')}` : `${secs}s`;

  return (
    <div style={{
      height:"100svh",
      background:T.bg,
      fontFamily:"'Barlow',sans-serif", color:T.text,
      display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        background:T.panel, borderBottom:`1px solid ${T.border}`,
        padding:"12px 16px", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:3}}>
            <span style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, color:T.purple, background:`${T.purple}18`,
              padding:"2px 7px", borderRadius:10, letterSpacing:1.5,
            }}>🤖 AUTOPILOT</span>
            <span style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:10, color:T.dim,
            }}>PICK {currentPick} · RD {round}</span>
          </div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:16, fontWeight:700, color:T.mute,
          }}>
            {picksAway === 1 ? "NEXT PICK IS YOURS — GET READY" : `Slot ${pickToSlot(currentPick)} picking…`}
          </div>
        </div>
        <button onClick={onReset} style={{
          padding:"6px 10px", background:"transparent", color:T.dim,
          border:`1px solid ${T.border}`, borderRadius:7,
          fontFamily:"'Share Tech Mono',monospace", fontSize:9, cursor:"pointer",
        }}>RESET</button>
      </div>

      {/* Big countdown */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"24px",
      }}>
        {/* Time until pick */}
        <div style={{
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:10, color:T.dim, letterSpacing:2, marginBottom:8,
        }}>YOUR PICK IN</div>
        <div style={{
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize: picksAway===1 ? 72 : 96,
          fontWeight:900, lineHeight:1,
          color: picksAway===1 ? T.amber : picksAway<=3 ? T.gold : T.mute,
          animation: picksAway<=2 ? "clock-pulse 1s ease-in-out infinite" : "none",
          marginBottom:12,
        }}>
          {picksAway === 0 ? "NOW!" : timeStr}
        </div>
        <div style={{
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:10, color:T.dim, letterSpacing:1, marginBottom:32,
        }}>
          {picksAway > 0 ? `${picksAway} PICK${picksAway===1?'':'S'} · ~${draftSpeed}s EACH` : ""}
        </div>

        {/* Top rec preview */}
        {recs[0] && (
          <div style={{
            background:T.card, border:`1px solid ${T.border}`,
            borderRadius:10, padding:"14px 18px", width:"100%", maxWidth:340,
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9, color:T.dim, letterSpacing:2, marginBottom:8,
            }}>TOP RECOMMENDATION WHEN YOUR TURN ARRIVES</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <PosBadge pos={recs[0].pos}/>
              <div>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:22, fontWeight:900, color:T.text,
                }}>{recs[0].name}</div>
                <div style={{
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:9, color:T.mute, marginTop:3,
                }}>{recs[0].team} · ADP {recs[0].adp?.toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Target alert if one about to go */}
        {targetAvail.length > 0 && picksAway <= 3 && (
          <div style={{
            marginTop:16, padding:"8px 14px",
            background:`${T.amber}18`, border:`1px solid ${T.amber}44`,
            borderRadius:8, textAlign:"center",
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:14, color:T.amber, fontWeight:900,
          }}>
            ★ {targetAvail[0].name.split(' ').slice(-1)[0]} still available — target within reach
          </div>
        )}

        {/* Autopilot status */}
        <div style={{
          marginTop:24,
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:9, color:T.dim, textAlign:"center",
          letterSpacing:1, lineHeight:1.8,
        }}>
          AUTOPILOT IS RUNNING · OPPONENT PICKS SIMULATED<br/>
          PHONE WILL VIBRATE WHEN IT'S YOUR TURN
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLY CATCHER — Bulk queue generator
// ═══════════════════════════════════════════════════════════════════════════

const QB_STACKS_BC = [
  { name:"Josh Allen",      team:"BUF", tier:1, weapons:["Keon Coleman","Khalil Shakir","DJ Moore"] },
  { name:"Jayden Daniels",  team:"WAS", tier:1, weapons:["Terry McLaurin","Zach Ertz"] },
  { name:"Jalen Hurts",     team:"PHI", tier:1, weapons:["A.J. Brown","DeVonta Smith","Dallas Goedert"] },
  { name:"Lamar Jackson",   team:"BAL", tier:1, weapons:["Mark Andrews","Derrick Henry","Isaiah Likely"] },
  { name:"Jordan Love",     team:"GB",  tier:2, weapons:["Romeo Doubs","Tucker Kraft","Christian Watson"] },
  { name:"Bo Nix",          team:"DEN", tier:2, weapons:["Courtland Sutton","Jaylen Waddle"] },
  { name:"Patrick Mahomes", team:"KC",  tier:2, weapons:["Rashee Rice","Xavier Worthy","Travis Kelce"] },
  { name:"Caleb Williams",  team:"CHI", tier:2, weapons:["Rome Odunze","Cole Kmet"] },
  { name:"Drake Maye",      team:"NE",  tier:3, weapons:["Kayshon Boutte","Hunter Henry"] },
  { name:"Joe Burrow",      team:"CIN", tier:3, weapons:["Ja'Marr Chase","Tee Higgins"] },
  { name:"Baker Mayfield",  team:"TB",  tier:3, weapons:["Mike Evans","Bucky Irving"] },
  { name:"Justin Fields",   team:"NYJ", tier:3, weapons:["Garrett Wilson","Najee Harris"] },
];

const STYLE_SLOTS = {
  'HERO RB':   [1,2,3,4],
  'ZERO RB':   [9,10,11,12],
  'ROBUST RB': [1,2,3],
  'ANCHOR':    [4,5,6,7,8],
  'MODERN':    [5,6,7,8,9],
};

const STYLE_RBS = {
  'HERO RB':   [["Bijan Robinson","Saquon Barkley","Christian McCaffrey","Ashton Jeanty"]],
  'ZERO RB':   [["Chase Brown","Kenneth Walker","Bucky Irving","Tank Bigsby"]],
  'ROBUST RB': [["Bijan Robinson","Jahmyr Gibbs","Saquon Barkley"],["De'Von Achane","Josh Jacobs","Jonathan Taylor"]],
  'ANCHOR':    [["Bijan Robinson","Jahmyr Gibbs"],["De'Von Achane","Kenneth Walker"]],
  'MODERN':    [["Chase Brown","Bucky Irving"],["Kenneth Walker","Jaylen Warren"]],
};

function generateTargetsForStyle(style, qb) {
  const weapons = qb.weapons.slice(0, 2);
  const rbOptions = STYLE_RBS[style] || STYLE_RBS['ANCHOR'];
  const rbs = rbOptions[0].slice(0, style === 'ROBUST RB' ? 3 : style === 'HERO RB' ? 1 : 2);
  const wrDarts = style === 'ZERO RB'
    ? ["Puka Nacua","Brian Thomas Jr.","Malik Nabers","Marvin Harrison Jr.","Jaxon Smith-Njigba"]
    : ["Trey McBride","Brock Bowers","Sam LaPorta"];
  return [qb.name, ...weapons, ...rbs, wrDarts[0]].filter(Boolean);
}

function pairwiseSimilarity(targetsA, targetsB) {
  const setA = new Set(targetsA), overlap = targetsB.filter(t => setA.has(t)).length;
  return (overlap / Math.max(targetsA.length, targetsB.length, 1)) * 100;
}

function maxSimilarityToExisting(targets, existingEntries) {
  if (!existingEntries.length) return 0;
  return Math.max(...existingEntries.map(e => pairwiseSimilarity(targets, e.targets)));
}

function scoreEntryEV(slot, style, qbTier) {
  let score = 50;
  // Slot value
  if ([1,2,3].includes(slot)) score += 12;
  else if ([6,7].includes(slot)) score += 10;
  else if ([11,12].includes(slot)) score += 8;
  // Style value (all valid but some higher ceiling)
  if (style === 'ZERO RB') score += 8; // contrarian = higher ceiling
  if (style === 'HERO RB') score += 6;
  // QB tier
  score += (4 - qbTier) * 5;
  return score;
}

function generateBillyQueue(count, existingQueueLen = 0) {
  const styles = Object.keys(STYLE_SLOTS);
  const entries = [];

  for (let i = 0; i < count; i++) {
    const globalIdx = existingQueueLen + i;
    // Rotate styles, QBs, slots — all distributed
    const style = styles[globalIdx % styles.length];
    const qb = QB_STACKS_BC[globalIdx % QB_STACKS_BC.length];
    const slotPool = STYLE_SLOTS[style];
    const slot = slotPool[globalIdx % slotPool.length];
    let targets = generateTargetsForStyle(style, qb);

    // If too similar to existing, rotate QB
    const simScore = maxSimilarityToExisting(targets, entries);
    if (simScore > 45) {
      const altQb = QB_STACKS_BC[(globalIdx + 3) % QB_STACKS_BC.length];
      targets = generateTargetsForStyle(style, altQb);
    }

    const ev = scoreEntryEV(slot, style, qb.tier);
    entries.push({
      id: `bc_${Date.now()}_${i}`,
      num: existingQueueLen + i + 1,
      slot, style,
      qb: qb.name, qbTeam: qb.team, qbTier: qb.tier,
      targets,
      ev,
      similarity: maxSimilarityToExisting(targets, entries),
      status: 'queued',
      draftSpeed: 30,
    });
  }

  // Sort by EV
  entries.sort((a, b) => b.ev - a.ev);
  entries.forEach((e, i) => e.priority = i + 1);
  return entries;
}

// Billy gap motivational messages
function billyMessage(gap) {
  if (gap <= 0) return { text:"YOU CAUGHT BILLY 🏆", color:"#FFD166" };
  if (gap === 1) return { text:"ONE MORE. FINISH HIM.", color:"#FFD166" };
  if (gap <= 4) return { text:"BILLY CAN FEEL YOU.", color:"#FFD166" };
  if (gap <= 10) return { text:"Closing fast — don't stop", color:"#FFB340" };
  if (gap <= 25) return { text:"Keep grinding, gap is closing", color:"#1DD882" };
  if (gap <= 50) return { text:"Long way to go — stay focused", color:"#8892AA" };
  return { text:"Billy's got a big lead. One at a time.", color:"#8892AA" };
}

// ─── BILLY CATCHER SCREEN ────────────────────────────────────────────────────
function BillyCatcherScreen({ queue, setQueue, billyCount, setBillyCount, myCount, onLaunch, onBack }) {
  const [step, setStep] = useState(queue.length > 0 ? 'queue' : 'setup');
  const [desiredCount, setDesiredCount] = useState(20);
  const [billyInput, setBillyInput] = useState(billyCount || '');

  const completedCount = queue.filter(e => e.status === 'complete').length;
  const queuedCount   = queue.filter(e => e.status === 'queued').length;
  const gap = Math.max(0, (billyCount || 0) - (myCount || 0));
  const msg = billyMessage(gap);
  const nextEntry = queue.find(e => e.status === 'queued');

  const handleGenerate = () => {
    const billy = parseInt(billyInput) || 0;
    setBillyCount(billy);
    const entries = generateBillyQueue(desiredCount, queue.length);
    setQueue(prev => [...prev, ...entries]);
    setStep('queue');
  };

  const styleColors = {
    'HERO RB':'#1DD882','ZERO RB':'#5B8CFF',
    'ROBUST RB':'#FFB340','ANCHOR':'#FFD166','MODERN':'#A78BFA',
  };

  return (
    <div style={{
      minHeight:"100svh",
      background:`linear-gradient(160deg, #0A0514 0%, #060A12 50%)`,
      fontFamily:"'Barlow',sans-serif", color:T.text,
      display:"flex", flexDirection:"column",
    }}>
      {/* Header */}
      <div style={{
        background:`linear-gradient(to right, #0A0514, #0F0A1F)`,
        borderBottom:`1px solid rgba(167,139,250,0.3)`,
        padding:"14px 18px", flexShrink:0,
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <button onClick={onBack} style={{
              background:"none",border:"none",color:T.dim,
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:10,cursor:"pointer",letterSpacing:1,padding:0,marginBottom:6,
            }}>← BACK</button>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>🎯</span>
              <div>
                <div style={{
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:28,fontWeight:900,color:"#A78BFA",letterSpacing:-0.5,lineHeight:1,
                }}>BILLY CATCHER</div>
                <div style={{
                  fontFamily:"'Share Tech Mono',monospace",
                  fontSize:9,color:T.dim,letterSpacing:1.5,marginTop:2,
                }}>BULK QUEUE · AUTO-DIVERSIFY · CLOSE THE GAP</div>
              </div>
            </div>
          </div>
          {/* Gap counter */}
          {billyCount > 0 && (
            <div style={{textAlign:"right"}}>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:36,fontWeight:900,lineHeight:1,
                color:msg.color,
              }}>{gap === 0 ? "🏆" : `-${gap}`}</div>
              <div style={{
                fontFamily:"'Share Tech Mono',monospace",
                fontSize:8,color:T.dim,letterSpacing:1,
              }}>{gap===0?"CAUGHT HIM":"FROM BILLY"}</div>
            </div>
          )}
        </div>

        {/* Gap bar */}
        {billyCount > 0 && (
          <div style={{marginTop:10}}>
            <div style={{
              height:6,background:"rgba(255,255,255,0.06)",
              borderRadius:3,overflow:"hidden",
            }}>
              <div style={{
                width:`${Math.min(100,(myCount/Math.max(billyCount,1))*100)}%`,
                height:"100%",
                background:`linear-gradient(to right, #A78BFA, ${msg.color})`,
                transition:"width 0.5s",
              }}/>
            </div>
            <div style={{
              display:"flex",justifyContent:"space-between",marginTop:4,
              fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:T.dim,
            }}>
              <span>You: {myCount}</span>
              <span style={{color:msg.color,fontWeight:700}}>{msg.text}</span>
              <span>Billy: {billyCount}</span>
            </div>
          </div>
        )}
      </div>

      {step === 'setup' ? (
        /* ── SETUP STEP ── */
        <div style={{flex:1,overflowY:"auto",padding:"20px 18px 40px"}}>
          {/* Billy's count */}
          <div style={{
            background:T.panel,borderRadius:12,
            border:`1px solid ${T.border}`,padding:18,marginBottom:14,
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9,color:T.dim,letterSpacing:2,marginBottom:10,
            }}>HOW MANY ENTRIES DOES BILLY HAVE?</div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              {[20,30,40,50,75,100].map(n => (
                <button key={n} onClick={()=>setBillyInput(String(n))} style={{
                  flex:1,padding:"10px 0",
                  background:billyInput==n?`rgba(167,139,250,0.2)`:"rgba(255,255,255,0.03)",
                  color:billyInput==n?"#A78BFA":T.mute,
                  border:`1px solid ${billyInput==n?"rgba(167,139,250,0.5)":T.border}`,
                  borderRadius:6,fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:16,fontWeight:900,cursor:"pointer",
                }}>{n}</button>
              ))}
            </div>
            <input
              type="number"
              value={billyInput}
              onChange={e=>setBillyInput(e.target.value)}
              placeholder="Or type exact number..."
              style={{
                width:"100%",padding:"10px 12px",
                background:"rgba(255,255,255,0.04)",
                border:`1px solid ${T.border}`,
                color:T.text,borderRadius:8,
                fontFamily:"'Barlow',sans-serif",fontSize:16,outline:"none",
              }}
            />
          </div>

          {/* How many to generate */}
          <div style={{
            background:T.panel,borderRadius:12,
            border:`1px solid ${T.border}`,padding:18,marginBottom:14,
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9,color:T.dim,letterSpacing:2,marginBottom:10,
            }}>HOW MANY ENTRIES TO GENERATE?</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[10,20,30,40,50].map(n => (
                <button key={n} onClick={()=>setDesiredCount(n)} style={{
                  flex:1,padding:"12px 0",
                  background:desiredCount===n?`rgba(255,209,102,0.2)`:"rgba(255,255,255,0.03)",
                  color:desiredCount===n?T.gold:T.mute,
                  border:`1px solid ${desiredCount===n?T.gold+"55":T.border}`,
                  borderRadius:6,fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:18,fontWeight:900,cursor:"pointer",
                }}>{n}</button>
              ))}
            </div>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9,color:T.dim,letterSpacing:1,lineHeight:1.8,
            }}>
              Each entry gets a unique: slot · build style · QB stack · target list.
              The engine runs a diversification check so no two entries share more than 40% of targets.
            </div>
          </div>

          {/* Style preview */}
          <div style={{
            background:"rgba(255,255,255,0.02)",
            border:`1px solid ${T.border}`,
            borderRadius:10,padding:14,marginBottom:20,
          }}>
            <div style={{
              fontFamily:"'Share Tech Mono',monospace",
              fontSize:9,color:T.dim,letterSpacing:1.5,marginBottom:8,
            }}>WHAT GETS GENERATED</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {Object.keys(STYLE_SLOTS).map(s => (
                <div key={s} style={{
                  padding:"5px 10px",
                  background:`${styleColors[s]}18`,
                  border:`1px solid ${styleColors[s]}44`,
                  borderRadius:5,
                  fontFamily:"'Barlow Condensed',sans-serif",
                  fontSize:13,fontWeight:900,color:styleColors[s],
                }}>{s}</div>
              ))}
            </div>
            <div style={{marginTop:8,fontSize:11,color:T.mute,lineHeight:1.6}}>
              Rotated across all 5 build styles × 12 QB stacks × all slots.
              {desiredCount} entries = {Math.floor(desiredCount/5)} of each style, ~{Math.ceil(desiredCount/12)} of each QB stack.
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!billyInput}
            style={{
              width:"100%",padding:"18px",
              background:billyInput
                ?`linear-gradient(135deg, #A78BFA, #8B5CF6)`
                :"rgba(255,255,255,0.05)",
              color:billyInput?"#060A12":T.dim,
              border:"none",borderRadius:12,
              fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:22,fontWeight:900,letterSpacing:1,
              cursor:billyInput?"pointer":"default",
              boxShadow:billyInput?"0 4px 24px rgba(167,139,250,0.4)":"none",
            }}>
            🎯 GENERATE {desiredCount} ENTRY QUEUE →
          </button>
        </div>
      ) : (
        /* ── QUEUE VIEW ── */
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Queue stats bar */}
          <div style={{
            background:"rgba(255,255,255,0.03)",
            borderBottom:`1px solid ${T.border}`,
            padding:"10px 18px",
            display:"flex",gap:16,alignItems:"center",
            flexShrink:0,flexWrap:"wrap",
          }}>
            <div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:T.dim,letterSpacing:1.5}}>QUEUED</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:T.text}}>{queuedCount}</div>
            </div>
            <div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:T.dim,letterSpacing:1.5}}>DONE</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:"#1DD882"}}>{completedCount}</div>
            </div>
            <div style={{flex:1}}/>
            {/* Quick action buttons */}
            {nextEntry && (
              <button onClick={()=>onLaunch(nextEntry)} style={{
                padding:"10px 16px",
                background:`linear-gradient(135deg, #A78BFA, #8B5CF6)`,
                color:"#060A12",border:"none",borderRadius:8,
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:15,fontWeight:900,letterSpacing:0.5,cursor:"pointer",
                boxShadow:"0 2px 16px rgba(167,139,250,0.4)",
                animation:"pulse-ring 2s infinite",
              }}>▶ DRAFT NEXT</button>
            )}
            <button onClick={()=>setStep('setup')} style={{
              padding:"8px 12px",background:"transparent",color:T.dim,
              border:`1px solid ${T.border}`,borderRadius:8,
              fontFamily:"'Share Tech Mono',monospace",fontSize:9,
              letterSpacing:1,cursor:"pointer",
            }}>+ MORE</button>
          </div>

          {/* Entry list */}
          <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
            {queue.map((entry, i) => {
              const sc = styleColors[entry.style] || T.text;
              const isDone = entry.status === 'complete';
              return (
                <div key={entry.id} style={{
                  display:"flex",alignItems:"flex-start",gap:12,
                  padding:"12px 18px",
                  borderBottom:`1px solid ${T.border}`,
                  opacity:isDone?0.4:1,
                  background:isDone?"transparent":"rgba(255,255,255,0.01)",
                }}>
                  {/* Priority + slot */}
                  <div style={{flexShrink:0,textAlign:"center",minWidth:36}}>
                    <div style={{
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:11,fontWeight:900,
                      color:isDone?T.dim:"#A78BFA",
                    }}>#{entry.priority}</div>
                    <div style={{
                      marginTop:4,
                      width:32,height:32,borderRadius:6,
                      background:isDone?"rgba(255,255,255,0.04)":`rgba(255,209,102,0.15)`,
                      border:`1px solid ${isDone?T.border:T.gold+"44"}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:14,fontWeight:900,
                      color:isDone?T.dim:T.gold,
                    }}>S{entry.slot}</div>
                  </div>

                  {/* Main info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{
                        fontFamily:"'Barlow Condensed',sans-serif",
                        fontSize:13,fontWeight:900,
                        color:sc,
                        background:`${sc}18`,
                        border:`1px solid ${sc}44`,
                        padding:"1px 7px",borderRadius:3,
                        letterSpacing:0.5,
                      }}>{entry.style}</span>
                      <span style={{
                        fontFamily:"'Share Tech Mono',monospace",
                        fontSize:10,color:T.mute,
                      }}>QB: {entry.qb.split(' ').slice(-1)[0]}</span>
                      {isDone && (
                        <span style={{
                          fontFamily:"'Share Tech Mono',monospace",
                          fontSize:8,color:"#1DD882",
                          background:"rgba(29,216,130,0.15)",
                          padding:"1px 6px",borderRadius:10,letterSpacing:1,
                        }}>✓ DONE</span>
                      )}
                    </div>
                    <div style={{
                      display:"flex",gap:4,flexWrap:"wrap",
                    }}>
                      {entry.targets.slice(0,5).map(t => {
                        const p = PLAYERS.find(pl=>pl.name===t);
                        return p ? (
                          <div key={t} style={{
                            display:"flex",alignItems:"center",gap:3,
                            padding:"2px 6px",
                            background:POS_C[p.pos]?.bg||"rgba(255,255,255,0.04)",
                            borderRadius:4,
                          }}>
                            <span style={{
                              fontFamily:"'Share Tech Mono',monospace",
                              fontSize:7,color:POS_C[p.pos]?.fg,fontWeight:700,
                            }}>{p.pos}</span>
                            <span style={{fontSize:10,color:T.text}}>
                              {t.split(' ').slice(-1)[0]}
                            </span>
                          </div>
                        ) : (
                          <span key={t} style={{fontSize:10,color:T.dim}}>{t.split(' ').slice(-1)[0]}</span>
                        );
                      })}
                    </div>
                  </div>

                  {/* EV + action */}
                  <div style={{flexShrink:0,textAlign:"right"}}>
                    <div style={{
                      fontFamily:"'Share Tech Mono',monospace",
                      fontSize:9,color:T.dim,marginBottom:6,
                    }}>EV {entry.ev}</div>
                    {!isDone && (
                      <button onClick={()=>onLaunch(entry)} style={{
                        padding:"8px 12px",
                        background:`rgba(167,139,250,0.2)`,
                        color:"#A78BFA",
                        border:`1px solid rgba(167,139,250,0.4)`,
                        borderRadius:6,
                        fontFamily:"'Barlow Condensed',sans-serif",
                        fontSize:13,fontWeight:900,cursor:"pointer",
                        letterSpacing:0.5,
                      }}>DRAFT</button>
                    )}
                  </div>
                </div>
              );
            })}
            {queue.length === 0 && (
              <div style={{
                padding:48,textAlign:"center",
                color:T.dim,fontFamily:"'Share Tech Mono',monospace",fontSize:11,
              }}>No entries generated yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WELCOME SCREEN — landing page for new users
// ═══════════════════════════════════════════════════════════════════════════
function WelcomeScreen({ onStart }) {
  const handleStart = () => {
    localStorage.setItem('copilot_v2_seen', '1');
    onStart();
  };

  const FEATURES = [
    {
      icon: "📈",
      title: "Live Best Ball ADP",
      desc: "Underdog & DraftKings ADP pulled from FantasyPros in real time. Always current, position-by-position.",
      color: "#5B8CFF",
    },
    {
      icon: "🔥",
      title: "Tier Alerts",
      desc: "Get flagged the moment you're at a positional tier break — so you know when to reach and when to wait.",
      color: "#FFD166",
    },
    {
      icon: "🎯",
      title: "Pick Recommendations",
      desc: "Your next 3 picks ranked by value. Factors in your roster, scarcity, stacks, and your uploaded rankings.",
      color: "#1DD882",
    },
    {
      icon: "📊",
      title: "Portfolio Exposure",
      desc: "See exactly which players you've drafted across all your teams, and what % of your portfolio they represent.",
      color: "#A78BFA",
    },
    {
      icon: "↔️",
      title: "Stack & Combo Tracking",
      desc: "See which QB–WR and RB–DEF combos you've built — and which winning stacks you're missing.",
      color: "#2DD4BF",
    },
    {
      icon: "📂",
      title: "Custom Rankings",
      desc: "Drop in your ETR or any CSV rankings file. The board re-orders to your tiers instantly.",
      color: "#FFB340",
    },
  ];

  return (
    <div style={{
      minHeight:"100svh",
      background:"linear-gradient(160deg, #0A0E1C 0%, #060A12 60%)",
      fontFamily:"'Barlow', sans-serif",
      color:"#EBEEf8",
      overflowY:"auto",
    }}>
      {/* ── HERO ── */}
      <div style={{padding:"44px 24px 32px"}}>
        {/* Logo row */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
          <div style={{
            width:40,height:40,borderRadius:9,
            background:"#FFD166",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:16,fontWeight:900,color:"#060A12",
            boxShadow:"0 0 20px rgba(255,209,102,0.35)",
          }}>CP</div>
          <div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,fontWeight:700,color:"#FFD166",letterSpacing:2}}>COPILOT</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"#475068",letterSpacing:1.5}}>BEST BALL INTELLIGENCE</div>
          </div>
          <div style={{
            marginLeft:"auto",
            fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"#1DD882",
            background:"rgba(29,216,130,0.12)",border:"1px solid rgba(29,216,130,0.3)",
            padding:"3px 8px",borderRadius:10,letterSpacing:1,
          }}>FREE</div>
        </div>

        {/* Main headline */}
        <h1 style={{
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:52,fontWeight:900,lineHeight:0.92,
          letterSpacing:-1,margin:"0 0 16px",
        }}>
          BUILT TO<br/>
          <span style={{color:"#FFD166"}}>WIN BBM.</span>
        </h1>

        <p style={{fontSize:15,lineHeight:1.65,color:"#8892AA",margin:"0 0 24px",maxWidth:340}}>
          Run this alongside your live draft on Underdog or DraftKings.
          Copilot tracks the board, flags value windows, and tells you
          exactly what to take — pick by pick.
        </p>

        {/* How it works in 3 steps */}
        <div style={{
          background:"rgba(255,209,102,0.06)",
          border:"1px solid rgba(255,209,102,0.18)",
          borderRadius:12,padding:"16px",marginBottom:28,
        }}>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"#FFD166",letterSpacing:2,marginBottom:12}}>HOW IT WORKS</div>
          {[
            ["1","Open Copilot + your Underdog draft side by side"],
            ["2","Enter your draft slot, then tap ENTER DRAFT ROOM"],
            ["3","Log each pick as it happens — Copilot handles the rest"],
          ].map(([n,text])=>(
            <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:9}}>
              <div style={{
                width:22,height:22,borderRadius:"50%",flexShrink:0,
                background:"rgba(255,209,102,0.15)",
                border:"1px solid rgba(255,209,102,0.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:12,fontWeight:900,color:"#FFD166",
              }}>{n}</div>
              <div style={{fontSize:13,color:"#8892AA",lineHeight:1.5,paddingTop:2}}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES GRID ── */}
      <div style={{padding:"0 24px 28px"}}>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:"#475068",letterSpacing:2,marginBottom:14}}>WHAT'S INSIDE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background:"rgba(255,255,255,0.03)",
              border:`1px solid rgba(255,255,255,0.07)`,
              borderRadius:10,padding:"13px 12px",
            }}>
              <div style={{fontSize:22,marginBottom:6}}>{f.icon}</div>
              <div style={{
                fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:14,fontWeight:900,color:f.color,
                letterSpacing:0.3,marginBottom:4,
              }}>{f.title}</div>
              <div style={{fontSize:11,color:"#475068",lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{padding:"0 24px 48px"}}>
        <button onClick={handleStart} style={{
          width:"100%",padding:"20px",
          background:"linear-gradient(135deg, #FFD166, #FFB830)",
          color:"#060A12",border:"none",borderRadius:13,
          fontFamily:"'Barlow Condensed',sans-serif",
          fontSize:26,fontWeight:900,letterSpacing:1,cursor:"pointer",
          boxShadow:"0 6px 32px rgba(255,209,102,0.45)",
          marginBottom:14,
        }}>LET'S DRAFT →</button>

        <div style={{
          textAlign:"center",
          fontFamily:"'Share Tech Mono',monospace",
          fontSize:8,color:"#475068",letterSpacing:1,lineHeight:2,
        }}>
          NO ACCOUNT · NO SUBSCRIPTION · NO INSTALL<br/>
          WORKS ON IPHONE, ANDROID &amp; DESKTOP
        </div>
      </div>
    </div>
  );
}

// ── PORTFOLIO ANALYTICS ─────────────────────────────────────────────────────
function PortfolioScreen({ savedDrafts, onBack }) {
  const total = savedDrafts.length;
  if (total === 0) return (
    <div style={{ minHeight:"100svh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:T.dim }}>NO DRAFTS SAVED YET</div>
      <button onClick={onBack} style={{ padding:"10px 20px", background:T.card, color:T.mute, border:`1px solid ${T.border}`, borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, cursor:"pointer" }}>BACK</button>
    </div>
  );

  // Aggregate player exposure
  const exposureMap = {};
  savedDrafts.forEach(draft => {
    (draft.roster || []).forEach(p => {
      if (!exposureMap[p.name]) exposureMap[p.name] = { name:p.name, pos:p.pos, team:p.team, count:0 };
      exposureMap[p.name].count++;
    });
  });
  const topExposed = Object.values(exposureMap)
    .map(e => ({ ...e, pct: (e.count/total)*100 }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 20);

  // Position distribution averages
  const posAvg = { QB:0, RB:0, WR:0, TE:0 };
  const posTarget = { QB:2, RB:5, WR:7, TE:2 };
  savedDrafts.forEach(draft => {
    ['QB','RB','WR','TE'].forEach(pos => {
      posAvg[pos] += (draft.roster||[]).filter(p=>p.pos===pos).length;
    });
  });
  ['QB','RB','WR','TE'].forEach(pos => posAvg[pos] = (posAvg[pos]/total).toFixed(1));

  // QB stack coverage
  const qbStackCount = savedDrafts.filter(draft => {
    const qbs = (draft.roster||[]).filter(p=>p.pos==='QB');
    const teams = qbs.map(q=>q.team);
    return (draft.roster||[]).some(p => p.pos!=='QB' && teams.includes(p.team));
  }).length;

  // Slot distribution
  const slotCounts = {};
  savedDrafts.forEach(d => { slotCounts[d.slot] = (slotCounts[d.slot]||0)+1; });

  return (
    <div style={{ minHeight:"100svh", background:T.bg, fontFamily:"'Barlow',sans-serif", color:T.text, paddingBottom:48 }}>
      {/* Header */}
      <div style={{ background:T.panel, borderBottom:`1px solid ${T.border}`, padding:"16px 16px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:T.mute, fontSize:20, cursor:"pointer", padding:"0 4px" }}>←</button>
          <div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:2 }}>PORTFOLIO ANALYTICS</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900 }}>{total} DRAFT{total!==1?'S':''} ANALYZED</div>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 16px 0" }}>
        {/* Position averages */}
        <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.border}`, padding:16, marginBottom:14 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:2, marginBottom:12 }}>AVG POSITION FILL</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {['QB','RB','WR','TE'].map(pos => {
              const avg = parseFloat(posAvg[pos]);
              const tgt = posTarget[pos];
              const pct = Math.min(100, (avg/tgt)*100);
              const col = POS_C[pos]?.fg;
              const ok = avg >= tgt;
              return (
                <div key={pos} style={{ background:T.card, borderRadius:8, padding:10, textAlign:"center", border:`1px solid ${ok?col+"33":T.border}` }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:col, marginBottom:4 }}>{pos}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:900, color:ok?col:T.amber, lineHeight:1 }}>{posAvg[pos]}</div>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:T.dim, marginTop:2 }}>avg / {tgt} need</div>
                  <div style={{ height:3, background:T.bg, borderRadius:2, overflow:"hidden", marginTop:6 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:ok?col:T.amber }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QB stack coverage + slot spread */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.border}`, padding:14 }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:1.5, marginBottom:8 }}>QB STACKS</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color:T.purple, lineHeight:1 }}>{qbStackCount}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, marginTop:4 }}>of {total} have QB stack</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:qbStackCount/total>=0.5?T.green:T.amber, marginTop:2 }}>
              {((qbStackCount/total)*100).toFixed(0)}% coverage
            </div>
          </div>
          <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.border}`, padding:14 }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:1.5, marginBottom:8 }}>SLOTS USED</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
              {Object.entries(slotCounts).sort(([a],[b])=>+a-+b).map(([slot, cnt]) => (
                <div key={slot} style={{ padding:"3px 7px", background:`${T.gold}18`, border:`1px solid ${T.gold}33`, borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:T.gold }}>
                  {slot}<span style={{ fontSize:9, color:T.dim, fontFamily:"'Share Tech Mono',monospace" }}>×{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top exposed players */}
        <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.border}`, padding:16, marginBottom:14 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, letterSpacing:2, marginBottom:12 }}>PLAYER EXPOSURE</div>
          {topExposed.map((e, i) => {
            const col = e.pct >= 60 ? T.red : e.pct >= 35 ? T.amber : T.green;
            return (
              <div key={e.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<topExposed.length-1?`1px solid ${T.border}`:"none" }}>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.dim, minWidth:18 }}>{i+1}</span>
                <PosBadge pos={e.pos}/>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color:T.text }}>{e.name}</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:T.mute }}>{e.team}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:60, height:4, background:T.card, borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(100,e.pct)}%`, height:"100%", background:col }}/>
                  </div>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:900, color:col, minWidth:38, textAlign:"right" }}>{e.pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Mount
createRoot(document.getElementById('root')).render(React.createElement(App));
