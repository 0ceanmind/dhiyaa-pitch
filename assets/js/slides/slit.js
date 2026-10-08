// The spleen's stress test: ~8 µm red cells squeezing through ~3 µm spaces
// between red-pulp trabeculae (Guyton & Hall). Young cells deform and pass;
// an aged, fragile cell ruptures and a macrophage engulfs the debris.
import { makeCanvas, clamp, lerp, smooth, rng, css } from '../lib/util.js';

const VW = 1060, VH = 700;
const UM = 26;               // px per micrometre
const CELL = 8 * UM / 2;     // radius of an 8 µm cell
const GAP = 3 * UM;          // 3 µm slit
const SX = 560, CY = 350;    // slit centre

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const c = makeCanvas(box, api);
  const R = rng(9);

  let step = 0;
  let young = [];
  let spawnT = 0;
  let old = null;       // {x, state, t}
  let debris = [];
  let mac = { x: 250, y: 585, r: 92, tx: 250, ty: 585, eat: 0 };
  let time = 0;
  let flash = 0;

  function reset(n) {
    young = [];
    spawnT = n === 0 ? 0 : 99;
    old = n >= 1 ? { x: n === 1 ? -CELL : SX - GAP / 2 - CELL * 0.9, state: n === 1 ? 'approach' : 'gone', t: 0 } : null;
    debris = [];
    if (n === 2) burst(SX - GAP / 2 - CELL * 0.9, CY, true);
    mac = { x: 250, y: 585, r: 92, tx: 250, ty: 585, eat: 0 };
  }

  function burst(x, y, settled = false) {
    for (let i = 0; i < 46; i++) {
      const a = R() * Math.PI * 2, sp = 40 + R() * 120;
      debris.push({
        x: x + (settled ? Math.cos(a) * R() * 70 : 0), y: y + (settled ? Math.sin(a) * R() * 70 : 0),
        vx: settled ? 0 : Math.cos(a) * sp, vy: settled ? 0 : Math.sin(a) * sp,
        r: i < 14 ? 10 + R() * 8 : 3 + R() * 3, kind: i < 14 ? 'mem' : 'hb', a: 1, rot: R() * 6,
      });
    }
    flash = settled ? 0 : 1;
  }

  function deform(x, rigid) {
    const d = Math.abs(x - SX);
    const k = smooth(clamp((240 - d) / 170));
    const minRy = rigid ? CELL * 0.86 : GAP / 2 - 5;
    const ry = lerp(CELL, minRy, k);
    const rx = CELL * Math.pow(CELL / ry, rigid ? 0.2 : 0.75);
    return { rx, ry };
  }

  function drawCell(ctx, x, y, rx, ry, kind, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
    if (kind === 'old') {
      g.addColorStop(0, '#9b3a52'); g.addColorStop(0.6, '#7a1f36'); g.addColorStop(1, '#4f0f20');
    } else {
      g.addColorStop(0, '#f39aa6'); g.addColorStop(0.38, '#e64a63'); g.addColorStop(0.75, '#cc1a39'); g.addColorStop(1, '#990b25');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'old') {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function dim(ctx, x1, y1, x2, y2, text, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    [[x1, y1, ang + Math.PI], [x2, y2, ang]].forEach(([x, y, a]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(a - 0.45) * 13, y - Math.sin(a - 0.45) * 13);
      ctx.lineTo(x - Math.cos(a + 0.45) * 13, y - Math.sin(a + 0.45) * 13);
      ctx.closePath(); ctx.fill();
    });
    ctx.font = '700 30px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, (x1 + x2) / 2 + (x1 === x2 ? 62 : 0), (y1 + y2) / 2 + (y1 === y2 ? -16 : 10));
  }

  function drawMac(ctx) {
    const { x, y, r } = mac;
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 10, x, y, r * 1.2);
    g.addColorStop(0, 'rgba(214,196,255,0.95)'); g.addColorStop(1, 'rgba(140,100,235,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const rr = r * (1 + 0.09 * Math.sin(a * 5 + time * 1.7) + 0.06 * Math.sin(a * 3 - time * 1.1));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.86;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(80,45,180,0.9)';
    ctx.beginPath(); ctx.ellipse(x + 18, y + 8, r * 0.32, r * 0.26, 0.4, 0, Math.PI * 2); ctx.fill();
    // engulfed debris
    for (let i = 0; i < Math.min(14, Math.round(mac.eat)); i++) {
      const a = i * 2.39, d = 18 + (i % 4) * 11;
      ctx.fillStyle = 'rgba(160,30,60,0.75)';
      ctx.beginPath(); ctx.arc(x - 22 + Math.cos(a) * d * 0.8, y - 10 + Math.sin(a) * d * 0.6, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = '650 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = css('--text');
    ctx.textAlign = 'center';
    ctx.fillText('Macrophage', x, y + r + 44);
    ctx.restore();
  }

  function frame(_, dt) {
    time += dt;
    const { ctx, w, h } = c;
    ctx.setTransform(c.pr, 0, 0, c.pr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const k = Math.min(w / VW, h / VH);
    ctx.translate((w - VW * k) / 2, (h - VH * k) / 2);
    ctx.scale(k, k);

    // plasma stream lines
    ctx.strokeStyle = css('--line');
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = CY + (i - 3) * 60;
      ctx.setLineDash([18, 22]);
      ctx.lineDashOffset = -time * 60;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // young cells
    if (step === 0) {
      spawnT -= dt;
      if (spawnT <= 0) { young.push({ x: -CELL - 20 }); spawnT = 2.6; }
    }
    young.forEach((y) => {
      const d = Math.abs(y.x - SX);
      y.x += (d < 120 ? 120 : 210) * dt;
    });
    young = young.filter((y) => y.x < VW + CELL * 2);

    // trabeculae (walls)
    const wallW = 180;
    const wg = ctx.createLinearGradient(SX - wallW / 2, 0, SX + wallW / 2, 0);
    wg.addColorStop(0, '#d9c9b4'); wg.addColorStop(0.5, '#f1e6d6'); wg.addColorStop(1, '#d9c9b4');
    ctx.fillStyle = wg;
    const rr = 60;
    const wall = (y0, y1) => {
      ctx.beginPath();
      ctx.roundRect(SX - wallW / 2, y0, wallW, y1 - y0, rr);
      ctx.fill();
    };
    wall(-80, CY - GAP / 2);
    wall(CY + GAP / 2, VH + 80);

    young.forEach((y) => { const { rx, ry } = deform(y.x, false); drawCell(ctx, y.x, CY, rx, ry, 'young'); });

    // old cell
    if (old) {
      old.t += dt;
      const stopX = SX - wallW / 2 - CELL * 0.82;
      if (old.state === 'approach') {
        old.x = Math.min(stopX, old.x + 200 * dt);
        if (old.x >= stopX) { old.state = 'stuck'; old.t = 0; }
      } else if (old.state === 'stuck' && old.t > 1.7) {
        old.state = 'gone';
        burst(old.x, CY);
      }
      if (old.state !== 'gone') {
        const wob = old.state === 'stuck' ? Math.sin(old.t * 22) * 3 * (old.t / 1.7) : 0;
        drawCell(ctx, old.x + wob, CY, CELL * 0.98, CELL * 0.98, 'old');
        ctx.font = '650 26px Inter, system-ui, sans-serif';
        ctx.fillStyle = css('--text-2');
        ctx.textAlign = 'center';
        ctx.fillText('aged, fragile cell', old.x - 20, CY + CELL + 44);
      }
    }

    // debris physics + macrophage
    if (step === 2) { mac.tx = SX - wallW / 2 - CELL * 0.85; mac.ty = CY + 30; }
    else { mac.tx = 250; mac.ty = 585; }
    mac.x = lerp(mac.x, mac.tx, 1 - Math.exp(-1.2 * dt));
    mac.y = lerp(mac.y, mac.ty, 1 - Math.exp(-1.2 * dt));
    debris.forEach((d) => {
      d.vx *= Math.pow(0.15, dt); d.vy *= Math.pow(0.15, dt);
      if (step === 2) {
        const dx = mac.x - d.x, dy = mac.y - d.y, dist = Math.hypot(dx, dy);
        if (dist < mac.r * 0.75) { if (d.a > 0.5) mac.eat += 0.32; d.a = Math.max(0, d.a - dt * 2.2); }
        d.vx += (dx / (dist + 1)) * 90 * dt; d.vy += (dy / (dist + 1)) * 90 * dt;
      }
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.rot += dt;
    });
    drawMac(ctx);
    debris.forEach((d) => {
      if (d.a <= 0) return;
      ctx.globalAlpha = d.a;
      if (d.kind === 'mem') {
        ctx.strokeStyle = '#a8344e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, d.rot, d.rot + 1.6); ctx.stroke();
      } else {
        ctx.fillStyle = '#e8304f';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    if (flash > 0) {
      flash = Math.max(0, flash - dt * 1.8);
      const fx = SX - wallW / 2 - CELL * 0.82;
      const g = ctx.createRadialGradient(fx, CY, 0, fx, CY, 200);
      g.addColorStop(0, `rgba(255,120,140,${0.6 * flash})`); g.addColorStop(1, 'rgba(255,120,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, CY, 200, 0, Math.PI * 2); ctx.fill();
    }

    // dimensions
    const txt = css('--text');
    dim(ctx, SX + wallW / 2 + 40, CY - GAP / 2, SX + wallW / 2 + 40, CY + GAP / 2, '≈ 3 µm', txt);
    dim(ctx, 70, CY - CELL - 70, 70 + CELL * 2, CY - CELL - 70, '≈ 8 µm red cell', css('--blood'));
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = css('--text-3');
    ctx.textAlign = 'center';
    ctx.textAlign = 'left';
    ctx.fillText('red-pulp trabeculae', SX + wallW / 2 + 22, 120);
  }

  return {
    enter() { reset(0); },
    step(n) { const prev = step; step = n; if (n === 0 || prev === 0 || n < prev) reset(n); else if (n === 1) reset(1); },
    frame,
  };
}
