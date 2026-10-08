// Duodenal iron absorption: Fe³⁺ reduced to Fe²⁺ → DMT1 → ferritin or
// ferroportin → transferrin. Hepcidin decides how much leaves the cell.
import { makeCanvas, clamp, lerp, rng, css, segmented } from '../lib/util.js';

const VW = 1000, VH = 700;
const AP = 270, BL = 640;          // apical and basolateral membrane x
const DMT1 = [{ x: AP, y: 240 }, { x: AP, y: 420 }];
const STORE = { x: 455, y: 520 };
const FPN = [{ x: BL, y: 250, s: 'on', t: 0 }, { x: BL, y: 380, s: 'on', t: 0 }];

const TEXT = {
  3: 'High hepcidin reduces ferroportin, so <span class="strong">less iron enters the blood</span>.',
  4: 'In iron deficiency, hepcidin falls, so <span class="strong">more iron is absorbed and released from stores</span>. In our patient, chronic blood loss still outpaced it, and stores ran out.',
};

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const c = makeCanvas(box, api);
  const R = rng(6);
  const hepText = slide.querySelector('[data-hep-text]');
  const seg = segmented(slide.querySelector('[data-seg]'), ['Hepcidin high', 'Iron deficiency'], (i, user) => { if (user) api.setStep(3 + i); }, 0);

  let step = 0, time = 0;
  let lumen = [], inside = [], tfs = [], heps = [];
  let store = 6, spawnT = 0;

  function reset() {
    lumen = []; inside = []; tfs = []; heps = []; store = 6;
    FPN.forEach((f) => { f.s = 'on'; f.t = 0; });
    for (let i = 0; i < 10; i++) lumen.push({ x: 30 + R() * 200, y: 80 + R() * 560, red: false, tgt: null, v: 0.5 + R() });
  }

  const label = (ctx, t, x, y, col, al = 'center', size = 25, w = 650) => {
    ctx.font = `${w} ${size}px Inter, system-ui, sans-serif`; ctx.textAlign = al; ctx.fillStyle = col; ctx.fillText(t, x, y);
  };

  function frame(_, dt) {
    time += dt;
    const { ctx, w, h } = c;
    ctx.setTransform(c.pr, 0, 0, c.pr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const k = Math.min(w / VW, h / VH);
    ctx.translate((w - VW * k) / 2, (h - VH * k) / 2);
    ctx.scale(k, k);
    const txt = css('--text'), txt3 = css('--text-3');
    const mode = step >= 3 ? step : 0;
    const deficient = mode === 4;

    // zones
    label(ctx, 'Gut lumen', 130, 40, txt3, 'center', 24, 650);
    label(ctx, 'Duodenal enterocyte', (AP + BL) / 2, 40, txt3, 'center', 24, 650);
    label(ctx, 'Blood', 820, 40, txt3, 'center', 24, 650);
    // enterocyte body
    ctx.fillStyle = 'rgba(232,165,143,0.13)';
    ctx.strokeStyle = 'rgba(232,165,143,0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(AP, 70, BL - AP, 600, 36); ctx.fill(); ctx.stroke();
    // microvilli
    ctx.strokeStyle = 'rgba(232,165,143,0.6)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let y = 100; y < 650; y += 26) { ctx.beginPath(); ctx.moveTo(AP, y); ctx.lineTo(AP - 22, y); ctx.stroke(); }
    // blood vessel
    const bg = ctx.createLinearGradient(700, 0, 1000, 0);
    bg.addColorStop(0, 'rgba(255,90,110,0)'); bg.addColorStop(0.3, 'rgba(255,90,110,0.08)'); bg.addColorStop(1, 'rgba(255,90,110,0.12)');
    ctx.fillStyle = bg; ctx.fillRect(680, 60, 320, 620);

    // DMT1 channels
    DMT1.forEach((d) => {
      ctx.fillStyle = css('--bile');
      ctx.beginPath(); ctx.roundRect(d.x - 16, d.y - 26, 32, 18, 6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(d.x - 16, d.y + 8, 32, 18, 6); ctx.fill();
    });
    label(ctx, 'DMT1', AP + 26, DMT1[0].y - 34, css('--bile'), 'left', 25, 750);

    // ferroportin
    FPN.forEach((f) => {
      if (mode === 3) { if (f.s === 'on' && R() < dt * 0.6) { f.s = 'off'; f.t = 0; } }
      if (f.s === 'off') { f.t += dt; if (mode !== 3 && f.t > 0.6) f.s = 'on'; else if (mode === 3 && f.t > 3.5) f.s = 'on'; }
      const a = f.s === 'on' ? 1 : Math.max(0.15, 1 - f.t);
      const dx = f.s === 'on' ? 0 : -Math.min(50, f.t * 50);
      ctx.globalAlpha = a;
      ctx.fillStyle = css('--fpn');
      ctx.beginPath(); ctx.roundRect(f.x - 16 + dx, f.y - 26, 32, 18, 6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(f.x - 16 + dx, f.y + 8, 32, 18, 6); ctx.fill();
      ctx.globalAlpha = 1;
    });
    if (step >= 1) label(ctx, 'Ferroportin', BL - 24, FPN[0].y - 36, css('--fpn'), 'right', 25, 750);

    // ferritin store
    if (step >= 1) {
      const sr = 34 + Math.min(36, store * 1.2);
      ctx.strokeStyle = 'rgba(255,159,10,0.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(STORE.x, STORE.y, sr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < store; i++) {
        const a = i * 2.399, d = Math.sqrt(i / Math.max(1, store)) * (sr - 10);
        ctx.fillStyle = '#ffae2e'; ctx.beginPath(); ctx.arc(STORE.x + Math.cos(a) * d, STORE.y + Math.sin(a) * d, 6, 0, Math.PI * 2); ctx.fill();
      }
      label(ctx, 'Ferritin', STORE.x, STORE.y + sr + 34, css('--iron'), 'center', 25, 750);
    }

    // lumen iron: Fe³⁺ (dark) reduced to Fe²⁺ (bright) near the brush border
    spawnT -= dt;
    const absorbRate = deficient ? 0.55 : 1.1;
    if (spawnT <= 0 && lumen.length < 14) { lumen.push({ x: 10, y: 90 + R() * 540, red: false, tgt: null, v: 0.5 + R() }); spawnT = 0.5; }
    lumen.forEach((p) => {
      if (!p.tgt && R() < dt / absorbRate * 0.5) p.tgt = DMT1[(R() * 2) | 0];
      if (p.tgt) {
        const dx = p.tgt.x - p.x, dy = p.tgt.y - p.y, d = Math.hypot(dx, dy);
        p.x += (dx / d) * 120 * dt; p.y += (dy / d) * 120 * dt;
        if (p.x > AP - 70) p.red = true;
        if (d < 10) { p.dead = true; inside.push({ x: AP + 10, y: p.y, tgt: null }); }
      } else {
        p.x = clamp(p.x + Math.sin(time + p.y) * 12 * dt + 6 * dt, 10, AP - 60);
        p.y += Math.cos(time * 0.7 + p.x) * 10 * dt;
      }
      ctx.fillStyle = p.red ? '#ffb340' : '#b8622a';
      ctx.strokeStyle = p.red ? 'rgba(255,200,120,.9)' : 'rgba(255,170,90,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    lumen = lumen.filter((p) => !p.dead);
    label(ctx, 'Fe³⁺', 70, 680, '#d98a4a', 'center', 27, 750);
    label(ctx, '→ Fe²⁺', 175, 680, css('--iron'), 'center', 27, 750);

    // inside the enterocyte
    const active = FPN.filter((f) => f.s === 'on');
    inside.forEach((p) => {
      if (!p.tgt) {
        if (step < 1) p.tgt = STORE;
        else {
          const exportP = mode === 3 ? 0.25 : mode === 4 ? 0.9 : 0.6;
          p.tgt = active.length && R() < exportP ? active[(R() * active.length) | 0] : STORE;
        }
      }
      if (p.tgt !== STORE && p.tgt.s !== 'on') p.tgt = STORE;
      const dx = p.tgt.x - p.x, dy = p.tgt.y - p.y, d = Math.hypot(dx, dy);
      p.x += (dx / d) * 130 * dt; p.y += (dy / d) * 130 * dt;
      if (d < 10) {
        p.dead = true;
        if (p.tgt === STORE) { store = Math.min(30, store + 1); if (deficient && store > 4 && R() < 0.8) store -= 2; }
        else if (step >= 2) tfs.push({ x: BL + 30, y: p.tgt.y, load: 1, v: 80 + R() * 30, dir: R() < (deficient ? 0.85 : 0.6) ? -1 : 1 });
      }
      ctx.fillStyle = '#ffb340'; ctx.shadowColor = '#ff9f0a'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
    inside = inside.filter((p) => !p.dead);
    if (deficient && store > 2 && R() < dt * 1.5) { store -= 1; inside.push({ x: STORE.x, y: STORE.y, tgt: active[0] || STORE }); }

    // transferrin in blood: up = bone marrow, down = tissue stores
    if (step >= 2) {
      tfs.forEach((t) => {
        t.x = lerp(t.x, 830, dt * 1.2);
        t.y += t.dir * t.v * dt;
        ctx.fillStyle = '#ffb340'; ctx.strokeStyle = 'rgba(255,190,110,.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(t.x - 9, t.y, 11, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(t.x + 9, t.y, 11, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      tfs = tfs.filter((t) => t.y > 70 && t.y < 670);
      label(ctx, 'Transferrin', 830, 330, css('--iron'), 'center', 26, 750);
      label(ctx, '↑ Bone marrow', 840, 100, txt, 'center', 25, 700);
      label(ctx, 'red-cell production', 840, 130, txt3, 'center', 21, 550);
      label(ctx, '↓ Tissue stores', 840, 620, txt, 'center', 25, 700);
      label(ctx, 'as ferritin', 840, 650, txt3, 'center', 21, 550);
    }

    // hepcidin
    if (mode) {
      const want = mode === 3 ? 7 : 0;
      if (heps.length < want && R() < dt * 3) heps.push({ x: 980, y: 180 + R() * 300, a: 1 });
      heps.forEach((hp, i) => {
        const tgt = FPN[i % 2];
        const tx = tgt.x + 34, ty = tgt.y + ((i % 3) - 1) * 26;
        if (mode === 4) { hp.x += 160 * dt; hp.a -= dt; }
        else { hp.x = lerp(hp.x, tx, dt * 1.5); hp.y = lerp(hp.y, ty, dt * 1.5); }
        ctx.globalAlpha = Math.max(0, hp.a);
        ctx.fillStyle = '#c66cf5';
        ctx.beginPath();
        for (let j = 0; j < 6; j++) { const an = (j / 6) * Math.PI * 2 + time; const x = hp.x + Math.cos(an) * 12, y = hp.y + Math.sin(an) * 12; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      });
      heps = heps.filter((hp) => hp.a > 0 && hp.x < 1040);
      label(ctx, mode === 3 ? 'Hepcidin ↑ (from the liver)' : 'Hepcidin ↓', 830, 470, css('--hep'), 'center', 25, 750);
    }
  }

  return {
    steps: 4,
    enter() { reset(); },
    step(n) {
      step = n;
      if (n >= 3) { seg.set(n - 3); hepText.innerHTML = TEXT[n]; }
      if (n < 3) heps = [];
    },
    frame,
  };
}
