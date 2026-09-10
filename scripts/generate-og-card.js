// Generates docs/og-card.png — a 1200×630 social-share card for WhatsApp / Twitter.
// Requires: npm install canvas  (installed in CI by the workflow)
//
// Reads:  docs/stats.json  (optional — falls back gracefully)
//         docs/icon.png    (app icon, 512×512)
// Writes: docs/og-card.png  (1200×630 RGB PNG)

const { createCanvas, loadImage } = require('canvas');
const fs   = require('fs');
const path = require('path');

const W = 1200, H = 630;
const OUT     = path.join(__dirname, '..', 'docs', 'og-card.png');
const ICON    = path.join(__dirname, '..', 'docs', 'icon.png');
const STATSF  = path.join(__dirname, '..', 'docs', 'stats.json');

let stats = { version: '2.4', installs: '10+', rating: null };
try { stats = { ...stats, ...JSON.parse(fs.readFileSync(STATSF, 'utf8')) }; } catch (_) { /* fallback */ }

async function main() {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── background gradient ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0f0e');
  bg.addColorStop(1, '#0d1a14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ambient green glow (top-right)
  const glow = ctx.createRadialGradient(900, -50, 0, 900, -50, 500);
  glow.addColorStop(0, 'rgba(34,197,94,0.22)');
  glow.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // subtle card panel
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  roundRect(ctx, 60, 60, W - 120, H - 120, 28); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  roundRect(ctx, 60, 60, W - 120, H - 120, 28); ctx.stroke();

  // ── app icon ──
  const IS = 160, IX = 100, IY = (H - IS) / 2;
  try {
    const img = await loadImage(ICON);
    ctx.save();
    ctx.shadowColor = 'rgba(34,197,94,0.6)'; ctx.shadowBlur = 30;
    roundRect(ctx, IX, IY, IS, IS, 28); ctx.clip();
    ctx.drawImage(img, IX, IY, IS, IS);
    ctx.restore();
  } catch (_) {
    ctx.fillStyle = '#22c55e'; ctx.fillRect(IX, IY, IS, IS);
  }

  // ── title ──
  const TX = IX + IS + 60;
  ctx.fillStyle = '#f0fdf4';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('Video Poker:', TX, 210);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('Jacks or Better', TX, 272);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '28px sans-serif';
  ctx.fillText('4 variants · multi-hand play · live leaderboards', TX, 322);

  // ── stat pills ──
  const pills = [
    { text: '🏆  Top 5 · "Jacks or Better"', gold: true },
    { text: `📥  ${stats.installs} installs` },
    { text: `🆙  v${stats.version}` },
    ...(stats.rating ? [{ text: `⭐  ${stats.rating} rating` }] : []),
    { text: '🌍  16 languages' },
  ];

  let px = TX, py = 362;
  ctx.font = '22px sans-serif';
  for (const p of pills) {
    const tw = ctx.measureText(p.text).width;
    const pw = tw + 32, ph = 40;
    if (px + pw > W - 80) { px = TX; py += 52; }
    ctx.fillStyle   = p.gold ? 'rgba(251,191,36,0.12)'   : 'rgba(255,255,255,0.07)';
    ctx.strokeStyle = p.gold ? 'rgba(251,191,36,0.35)'   : 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    roundRect(ctx, px, py, pw, ph, ph / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.gold ? '#fbbf24' : '#d1fae5';
    ctx.fillText(p.text, px + 16, py + ph / 2 + 8);
    px += pw + 10;
  }

  // ── free / no-ads badge ──
  ctx.fillStyle = 'rgba(34,197,94,0.12)'; ctx.strokeStyle = 'rgba(34,197,94,0.3)'; ctx.lineWidth = 1;
  roundRect(ctx, TX, H - 130, 310, 48, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('✓  FREE  ·  NO ADS  ·  ALWAYS', TX + 16, H - 97);

  // ── Play Store label ──
  ctx.fillStyle = '#d1fae5'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText('▶  Get it on Google Play', W - 290, H - 97);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(OUT, buf);
  console.log(`✓ og-card.png written (${(buf.length / 1024).toFixed(0)} KB)`);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

main().catch(e => { console.error(e); process.exit(1); });
