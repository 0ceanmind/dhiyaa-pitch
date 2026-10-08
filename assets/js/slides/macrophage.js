// Inside a red-pulp macrophage: erythrophagocytosis → heme → HO-1 → Fe²⁺ →
// ferroportin → transferrin, with hepcidin as the switch
// (normal / iron deficiency / inflammation).
import { makeCanvas, clamp, lerp, rng, css, segmented } from '../lib/util.js';

const VW = 1060, VH = 700;
const CX = 420, CY = 360, CR = 290;      // cell
const PHAGO = { x: 270, y: 250 };
const HO1 = { x: 430, y: 330 };
const STORE = { x: 395, y: 500 };
const FPN_ANG = [-0.62, -0.2, 0.22, 0.62];

const MODES = {
  3: { hep: 3, text: 'Binds ferroportin → degraded' },
  4: { hep: 0, text: 'Iron deficiency: hepcidin ↓ → more iron out' },
  5: { hep: 14, text: 'Inflammation: IL-6 → hepcidin ↑ → iron trapped' },
};

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const c = makeCanvas(box, api);
  const R = rng(4);
  const hepText = slide.querySelector('[data-hep-text]');
  const segHolder = slide.querySelector('[data-seg]');
  segHolder.setAttribute('data-step', '3');
  const seg = segmented(segHolder, ['Normal', 'Iron deficiency', 'Inflammation'], (i, user) => { if (user) api.setStep(3 + i); }, 0);

  let step = 0, time = 0;
  let engulf = null;        // {t}
  let content = 0;          // hemoglobin remaining in phagosome (0..1)
  let parts = [];           // {x,y,vx,vy,kind,target,a}
  let tfs = [];             // transferrins outside {x,y,load}
  let heps = [];            // hepcidins {x,y,vx,vy,bound}
  let store = 12;           // ferritin iron count
  let emitT = 0, engulfT = 0;
  const fpn = FPN_ANG.map((a) => ({ a, state: 'on', k: 1, t: 0, hep: null }));
  const fpnPos = (f, inward = 0) => ({
    x: CX + Math.cos(f.a) * (CR - inward), y: CY + Math.sin(f.a) * (CR - inward) * 0.92,
  });

  function reset() {
    engulf = null; content = step >= 1 ? 0.8 : 0; parts = []; tfs = []; heps = []; store = 12; engulfT = 0.4;
    fpn.forEach((f) => { f.state = 'on'; f.k = 1; f.hep = null; });
    for (let i = 0; i < 7; i++) tfs.push({ x: 760 + R() * 300, y: 120 + R() * 460, load: R() < 0.4 ? 1 : 0, v: 40 + R() * 30 });
  }

  function mode() { return step >= 3 ? step : 0; }

  function spawnHep() {
    heps.push({ x: 1080, y: 40 + R() * 620, vx: -60 - R() * 40, vy: (R() - 0.5) * 30, bound: null });
  }

  function label(ctx, text, x, y, col, align = 'center', size = 25, weight = 650) {
    ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.fillStyle = col;
    ctx.fillText(text, x, y);
  }

  function drawRBC(ctx, x, y, r, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#f39aa6'); g.addColorStop(0.4, '#e64a63'); g.addColorStop(1, '#a40d29');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
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
    const m = mode();
    const txt = css('--text'), txt3 = css('--text-3');

    // ---------- plasma side
    const pg = ctx.createLinearGradient(720, 0, 1060, 0);
    pg.addColorStop(0, 'rgba(255,90,110,0)'); pg.addColorStop(0.25, 'rgba(255,90,110,0.07)'); pg.addColorStop(1, 'rgba(255,90,110,0.1)');
    ctx.fillStyle = pg;
    ctx.fillRect(720, 0, 340, VH);
    label(ctx, 'Plasma', 900, 40, txt3, 'center', 24, 600);

    // ---------- cell body
    ctx.save();
    const cg = ctx.createRadialGradient(CX - 80, CY - 80, 40, CX, CY, CR * 1.1);
    cg.addColorStop(0, 'rgba(190,160,255,0.22)'); cg.addColorStop(1, 'rgba(150,110,240,0.12)');
    ctx.fillStyle = cg;
    ctx.strokeStyle = 'rgba(190,160,255,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      const rr = CR * (1 + 0.025 * Math.sin(a * 6 + time * 0.9) + 0.02 * Math.sin(a * 3 - time * 0.6));
      const x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr * 0.92;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // nucleus
    ctx.fillStyle = 'rgba(110,70,210,0.55)';
    ctx.beginPath(); ctx.ellipse(CX - 150, CY + 140, 90, 58, 0.5, 0, Math.PI * 2); ctx.fill();
    label(ctx, 'Red-pulp macrophage', 40, 40, txt, 'left', 28, 700);

    // ---------- engulfing
    engulfT -= dt;
    if (!engulf && content < 0.15 && engulfT <= 0) engulf = { t: 0 };
    if (engulf) {
      engulf.t += dt / 3.2;
      const u = clamp(engulf.t);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const x = lerp(30, PHAGO.x, e), y = lerp(120, PHAGO.y, e);
      drawRBC(ctx, x, y, 46);
      // pseudopods wrapping
      ctx.strokeStyle = 'rgba(190,160,255,0.9)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, 62, Math.PI * (1.2 - u * 1.1), Math.PI * (1.2 + u * 1.1 + 0.2)); ctx.stroke();
      if (u >= 1) { engulf = null; content = 1; engulfT = 2.5; }
    }
    // phagosome
    if (content > 0) {
      ctx.strokeStyle = 'rgba(190,160,255,0.9)'; ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath(); ctx.arc(PHAGO.x, PHAGO.y, 64, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      drawRBC(ctx, PHAGO.x, PHAGO.y, 46 * (0.45 + 0.55 * content), 0.25 + 0.75 * content);
      if (step >= 1) content = Math.max(0, content - dt * 0.09);
    }
    label(ctx, step === 0 ? 'Old red cell engulfed' : 'Phagosome', PHAGO.x - 10, PHAGO.y - 86, txt, 'center', 25, 650);

    // ---------- breakdown: heme to HO-1, globin to amino acids
    if (step >= 1 && content > 0.02) {
      emitT -= dt;
      if (emitT <= 0) {
        emitT = 0.32;
        parts.push({ x: PHAGO.x + 30, y: PHAGO.y + 10, kind: 'heme', a: 1 });
        if (R() < 0.6) parts.push({ x: PHAGO.x, y: PHAGO.y + 40, vx: (R() - 0.7) * 40, vy: 30 + R() * 30, kind: 'aa', a: 1, life: 2.4 });
      }
    }
    // HO-1 enzyme
    if (step >= 1) {
      ctx.save();
      ctx.translate(HO1.x, HO1.y);
      ctx.fillStyle = 'rgba(100,210,255,0.9)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 34, 0.5 + Math.sin(time * 6) * 0.15, Math.PI * 2 - 0.5 - Math.sin(time * 6) * 0.15); ctx.closePath(); ctx.fill();
      ctx.restore();
      label(ctx, 'HO-1', HO1.x, HO1.y - 48, css('--o2'), 'center', 26, 750);
      label(ctx, 'heme oxygenase-1', HO1.x, HO1.y + 66, txt3, 'center', 21, 550);
    }

    // ferritin store
    ctx.save();
    ctx.strokeStyle = 'rgba(255,159,10,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    const sr = 40 + Math.min(40, store * 0.9);
    ctx.beginPath(); ctx.arc(STORE.x, STORE.y, sr, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < store; i++) {
      const a = i * 2.399, d = Math.sqrt(i / Math.max(1, store)) * (sr - 10);
      ctx.fillStyle = '#ffae2e';
      ctx.beginPath(); ctx.arc(STORE.x + Math.cos(a) * d, STORE.y + Math.sin(a) * d, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    label(ctx, 'Ferritin', STORE.x - sr - 14, STORE.y - 4, css('--iron'), 'right', 25, 700);
    label(ctx, '(stored iron)', STORE.x - sr - 14, STORE.y + 24, txt3, 'right', 21, 550);

    // ---------- ferroportin channels
    const active = fpn.filter((f) => f.state === 'on');
    fpn.forEach((f) => {
      if (f.state === 'bound') { f.t += dt; f.k = Math.max(0, 1 - f.t / 1.6); if (f.t > 1.6) { f.state = 'gone'; f.t = 0; f.hep = null; } }
      else if (f.state === 'gone') { f.t += dt; if (m !== 5 && f.t > (m === 3 ? 3.5 : 1)) { f.state = 'on'; f.t = 0; } }
      else f.k = Math.min(1, f.k + dt * 1.5);
      const inward = f.state === 'bound' ? f.t * 60 : f.state === 'gone' ? 999 : 0;
      if (inward > 200) return;
      const p = fpnPos(f, inward);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(f.a);
      ctx.globalAlpha = f.state === 'on' ? Math.max(0.2, f.k) : f.k;
      ctx.fillStyle = css('--fpn');
      ctx.beginPath(); ctx.roundRect(-22, -15, 44, 11, 5); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-22, 4, 44, 11, 5); ctx.fill();
      ctx.restore();
    });
    if (step >= 2) {
      const p = fpnPos(fpn[0]);
      label(ctx, 'Ferroportin', p.x + 30, p.y - 28, css('--fpn'), 'left', 25, 700);
    }

    // ---------- particles
    parts.forEach((p) => {
      if (p.kind === 'heme') {
        const dx = HO1.x - p.x, dy = HO1.y - p.y, d = Math.hypot(dx, dy);
        p.x += (dx / d) * 150 * dt; p.y += (dy / d) * 150 * dt;
        if (d < 14) {
          p.dead = true;
          // iron out, porphyrin becomes bilirubin
          let target = 'store';
          if (step >= 2 && active.length) {
            const pref = m === 4 ? 0.95 : m === 5 ? 0 : 0.7;
            if (R() < pref) target = active[(R() * active.length) | 0];
          }
          parts.push({ x: HO1.x + 20, y: HO1.y, kind: 'fe', target, a: 1 });
          parts.push({ x: HO1.x, y: HO1.y + 20, vx: -20 - R() * 30, vy: 50 + R() * 20, kind: 'bili', a: 1, life: 2.2 });
        }
        ctx.fillStyle = '#d8344f';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const x = p.x + Math.cos(a) * 9, y = p.y + Math.sin(a) * 9; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath(); ctx.fill();
      } else if (p.kind === 'fe') {
        let tx, ty;
        if (p.target === 'store') { tx = STORE.x; ty = STORE.y; }
        else {
          if (p.target.state !== 'on') p.target = 'store';
          const q = p.target === 'store' ? STORE : fpnPos(p.target, -40);
          tx = q.x; ty = q.y;
        }
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        const sp = 170;
        p.x += (dx / d) * sp * dt + Math.sin(time * 5 + p.y) * 0.6; p.y += (dy / d) * sp * dt;
        if (d < 12) {
          p.dead = true;
          if (p.target === 'store') store = Math.min(46, store + 1);
          else tfs.push({ x: tx + 10, y: ty, load: 1, v: 70 + R() * 30 });
        }
        ctx.fillStyle = '#ffb340';
        ctx.shadowColor = '#ff9f0a'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.a = clamp(p.life / 1.2);
        if (p.life <= 0) p.dead = true;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.kind === 'aa' ? '#9ee6a8' : '#ffd60a';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.kind === 'aa' ? 5 : 6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    parts = parts.filter((p) => !p.dead);
    if (step === 1 || step === 2) {
      label(ctx, 'heme', (PHAGO.x + HO1.x) / 2 - 4, (PHAGO.y + HO1.y) / 2 + 40, '#ff6b81', 'center', 23, 650);
      label(ctx, 'globin → amino acids', PHAGO.x - 70, PHAGO.y + 150, '#9ee6a8', 'center', 23, 600);
      label(ctx, 'Fe²⁺', HO1.x + 64, HO1.y + 8, css('--iron'), 'left', 27, 750);
    }

    // ---------- transferrin in plasma
    if (step >= 2) {
      tfs.forEach((t) => {
        t.x += t.v * dt * (t.load ? 1 : 0.6);
        t.y += Math.sin(time + t.x * 0.02) * 0.3;
        ctx.fillStyle = t.load ? '#ffb340' : 'rgba(255,200,120,0.25)';
        ctx.strokeStyle = 'rgba(255,190,110,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(t.x - 9, t.y, 11, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(t.x + 9, t.y, 11, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      tfs = tfs.filter((t) => t.x < VW + 30);
      if (tfs.length < 5 && R() < dt * 2) tfs.push({ x: 745, y: 100 + R() * 500, load: 0, v: 40 + R() * 30 });
      label(ctx, 'Transferrin', 900, 640, css('--iron'), 'center', 26, 700);
      label(ctx, '→ bone marrow', 900, 674, txt3, 'center', 23, 600);
    }

    // ---------- hepcidin
    if (m) {
      const want = MODES[m].hep;
      const free = heps.filter((x) => !x.bound).length;
      if (free < want && R() < dt * (m === 5 ? 6 : 1.2)) spawnHep();
      if (m === 4) heps.forEach((x) => { if (!x.bound) x.vx = 120; });
      heps.forEach((hp) => {
        if (hp.bound) {
          const f = hp.bound;
          const p = fpnPos(f, f.state === 'bound' ? f.t * 60 - 26 : -26);
          hp.x = p.x; hp.y = p.y;
          hp.a = f.state === 'bound' ? f.k : 0;
          if (f.state !== 'bound') hp.dead = true;
        } else {
          const tgt = fpn.find((f) => f.state === 'on' && !f.hep);
          if (tgt && m !== 4) {
            const p = fpnPos(tgt, -26);
            const dx = p.x - hp.x, dy = p.y - hp.y, d = Math.hypot(dx, dy);
            hp.vx = lerp(hp.vx, (dx / d) * 110, dt * 2); hp.vy = lerp(hp.vy, (dy / d) * 110, dt * 2);
            if (d < 12 && (m === 5 || R() < 0.5)) { hp.bound = tgt; tgt.hep = hp; tgt.state = 'bound'; tgt.t = 0; }
          } else {
            hp.vy += Math.sin(time * 2 + hp.x) * 4 * dt;
          }
          hp.x += hp.vx * dt; hp.y += hp.vy * dt;
          hp.x = Math.max(760, hp.x);
          if (hp.x > 1100 || hp.y < -30 || hp.y > VH + 30) hp.dead = true;
          hp.a = 1;
        }
        ctx.globalAlpha = hp.a ?? 1;
        ctx.fillStyle = '#c66cf5';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + time; const x = hp.x + Math.cos(a) * 12, y = hp.y + Math.sin(a) * 12; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      });
      heps = heps.filter((x) => !x.dead);
      label(ctx, 'Hepcidin', 1000, 92, css('--hep'), 'center', 26, 750);
      label(ctx, 'from the liver', 1000, 122, txt3, 'center', 21, 600);
      if (m === 5) {
        ctx.fillStyle = 'rgba(255,214,10,0.9)';
        label(ctx, 'IL-6 ↑', 1000, 172, '#ffd60a', 'center', 26, 750);
      }
      if (m === 5 && fpn.every((f) => f.state !== 'on')) {
        label(ctx, 'Iron trapped', STORE.x, STORE.y + 96, css('--bad'), 'center', 28, 750);
      }
    }
  }

  return {
    steps: 5,
    enter() { reset(); },
    step(n) {
      const prev = step;
      step = n;
      if (n >= 3) {
        seg.set(n - 3);
        hepText.innerHTML = MODES[n].text;
        if (n === 4) heps.forEach((x) => { if (x.bound) { x.bound.state = 'gone'; x.bound.t = 0.5; x.dead = true; x.bound.hep = null; } });
      }
      if (n < 3) heps = [];
      if (n === 0 && prev !== 0) reset();
      if (n >= 1 && content === 0 && !engulf) content = 0.85;
    },
    frame,
  };
}
