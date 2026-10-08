// Thin blood vs thick blood: a live vessel plus the circulatory effects of
// severe anemia and polycythemia vera (Guyton & Hall, Ch. 33).
import { h, makeCanvas, segmented, rng, damp, css, clamp } from '../lib/util.js';

const STATES = [
  { key: 'Severe anemia', n: 16, v: 380, visc: 1.5, viscLabel: '≈ 1.5×', hct: 'Hematocrit ↓', co: 'Cardiac output ↑ (3–4×)', risk: 'Heart strain on exertion' },
  { key: 'Normal', n: 46, v: 210, visc: 3, viscLabel: '≈ 3×', hct: 'Hematocrit 40–45%', co: 'Normal cardiac output', risk: '' },
  { key: 'Polycythemia vera', n: 96, v: 70, visc: 10, viscLabel: 'up to 10×', hct: 'Hematocrit 60–70%', co: 'Cardiac output ≈ normal', risk: 'Sluggish flow · ↑ BP · ruddy skin' },
];

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  box.style.display = 'grid';
  box.style.gridTemplateColumns = '1fr 620px';
  box.style.gap = '56px';
  const left = h('div', { style: 'position:relative; min-height:0' }, box);
  const panel = h('div', { style: 'display:flex; flex-direction:column; gap:26px; justify-content:center' }, box);
  const c = makeCanvas(left, api);
  c.cv.style.cssText = 'position:absolute; inset:0; width:100%; height:100%';
  const R = rng(8);

  panel.innerHTML = `
    <div>
      <p class="t-cap" style="letter-spacing:.12em; font-weight:650; margin:0 0 16px">BLOOD VISCOSITY · × WATER</p>
      <div data-bars style="display:grid; gap:14px"></div>
    </div>
    <ul class="pts sm" style="margin-top:8px">
      <li data-co></li>
      <li data-risk></li>
    </ul>`;
  const barsEl = panel.querySelector('[data-bars]');
  const bars = STATES.map((st) => {
    const row = h('div', { style: 'display:grid; grid-template-columns: 250px 1fr 140px; align-items:center; gap:16px; transition: opacity .5s' }, barsEl);
    row.innerHTML = `<span style="font-size:26px; font-weight:650">${st.key}</span>
      <span style="height:20px; border-radius:10px; background:var(--surface-2); overflow:hidden"><i style="display:block; height:100%; width:${(st.visc / 10) * 100}%; border-radius:10px; background:linear-gradient(90deg,var(--blood),var(--iron))"></i></span>
      <span class="num" style="font-size:30px; font-weight:750; text-align:right">${st.viscLabel}</span>`;
    return row;
  });
  const coEl = panel.querySelector('[data-co]'), riskEl = panel.querySelector('[data-risk]');

  const cells = [...Array(110)].map(() => ({ x: R(), y: (R() * 2 - 1) * 0.86, rot: R() * Math.PI, w: (R() - 0.5) * 3, s: 0.85 + R() * 0.3 }));
  let cur = 1, vis = 46, speed = 210, time = 0, hctTxt = STATES[1].hct;

  function apply(i) {
    cur = i;
    bars.forEach((b, k) => (b.style.opacity = k === i ? 1 : 0.35));
    const st = STATES[i];
    coEl.textContent = st.co;
    riskEl.textContent = st.risk;
    riskEl.style.display = st.risk ? '' : 'none';
    hctTxt = st.hct;
  }
  const stepOf = [1, 0, 2];   // seg index → step
  const segOf = [1, 0, 2];    // step → seg index
  const seg = segmented(slide.querySelector('[data-seg]'), STATES.map((s) => s.key), (i, user) => {
    apply(i);
    if (user) api.setStep(stepOf[i]);
  }, 1);

  function frame(_, dt) {
    time += dt;
    const st = STATES[cur];
    vis = damp(vis, st.n, 3, dt);
    speed = damp(speed, st.v, 2.5, dt);
    const { ctx, w, h: hh } = c;
    ctx.setTransform(c.pr, 0, 0, c.pr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    const cy = hh * 0.46, rad = Math.min(170, hh * 0.32);
    // plasma
    const pg = ctx.createLinearGradient(0, cy - rad, 0, cy + rad);
    pg.addColorStop(0, 'rgba(255,200,170,0.10)'); pg.addColorStop(0.5, 'rgba(255,200,170,0.05)'); pg.addColorStop(1, 'rgba(255,200,170,0.10)');
    ctx.fillStyle = pg;
    ctx.fillRect(0, cy - rad, w, rad * 2);
    // cells
    const n = Math.round(vis);
    for (let i = 0; i < n; i++) {
      const cl = cells[i];
      const prof = 1 - cl.y * cl.y;
      cl.x += (speed * (0.25 + 0.75 * prof) * dt) / w;
      if (cl.x > 1.05) cl.x -= 1.1;
      cl.rot += cl.w * dt * (speed / 200);
      const px = cl.x * w, py = cy + cl.y * (rad - 16);
      const rx = 17 * cl.s, ry = Math.max(4, Math.abs(Math.cos(cl.rot)) * 17 * cl.s);
      const g = ctx.createRadialGradient(px, py, 0, px, py, rx);
      g.addColorStop(0, '#ef8796'); g.addColorStop(0.5, '#d8274a'); g.addColorStop(1, '#9e0b25');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // walls
    ctx.fillStyle = 'rgba(255,139,155,0.55)';
    ctx.beginPath(); ctx.roundRect(0, cy - rad - 14, w, 14, 7); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, cy + rad, w, 14, 7); ctx.fill();
    // velocity arrows
    ctx.strokeStyle = css('--text-3');
    ctx.fillStyle = css('--text-3');
    ctx.lineWidth = 3;
    const ax = 40, len = clamp(speed / 380) * 220 + 30;
    ctx.beginPath(); ctx.moveTo(ax, cy + rad + 70); ctx.lineTo(ax + len, cy + rad + 70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax + len + 14, cy + rad + 70); ctx.lineTo(ax + len, cy + rad + 62); ctx.lineTo(ax + len, cy + rad + 78); ctx.fill();
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('flow', ax + len + 28, cy + rad + 79);
    ctx.fillStyle = css('--text');
    ctx.font = '700 30px Inter, system-ui, sans-serif';
    ctx.fillText(hctTxt, 0, cy - rad - 40);
  }

  return {
    steps: 2,
    enter() { vis = STATES[1].n; speed = STATES[1].v; },
    step(n) { seg.set(segOf[n]); },
    frame,
  };
}
