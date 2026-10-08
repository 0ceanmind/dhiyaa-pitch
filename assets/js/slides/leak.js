// The iron loop with a leak: recycling keeps iron in the body, bleeding
// takes it out. Bars: average long-term iron loss (Guyton & Hall, Ch. 33).
import { s, svgRoot, PathFlow, drawable, damp, clamp } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 960, H = 720;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);
  const gTrack = s('g', {}, svg), gFlow = s('g', {}, svg), gNode = s('g', {}, svg), gLeak = s('g', { opacity: 0 }, svg);

  const cx = 430, cy = 330, rx = 290, ry = 230;
  const pt = (a) => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  const arc = (a0, a1) => {
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rx} ${ry} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const A = { marrow: -Math.PI * 0.82, circ: -Math.PI * 0.18, mac: Math.PI * 0.25, tf: Math.PI * 0.78 };
  const gap = 0.24;
  const segs = [
    { d: arc(A.marrow + gap, A.circ - gap), sym: I.RBC, r: 13, n: 4 },
    { d: arc(A.circ + gap, A.mac - gap), sym: I.RBC, r: 13, n: 4 },
    { d: arc(A.mac + gap, A.tf - gap), sym: I.FE, r: 10, n: 6 },
    { d: arc(A.tf + gap, A.marrow + Math.PI * 2 - gap), sym: I.FE, r: 10, n: 5 },
  ].map((sg) => {
    const p = s('path', { d: sg.d, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 4, 'stroke-linecap': 'round' }, gTrack);
    const f = new PathFlow(p, gFlow, { count: sg.n, speed: 95, symbol: sg.sym, r: sg.r, fade: 0.1 });
    return { p, f, sg };
  });

  const node = (a, title, sub, draw, color = 'var(--text)') => {
    const [x, y] = pt(a);
    s('circle', { cx: x, cy: y, r: 58, fill: 'var(--bg-2)', stroke: 'var(--line-2)', 'stroke-width': 1.5 }, gNode);
    draw(x, y);
    const below = y > cy;
    const ty = below ? y + 96 : y - 104;
    s('text', { x, y: ty, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: color, text: title }, gNode);
    if (sub) s('text', { x, y: ty + 30, 'text-anchor': 'middle', 'font-size': 22, fill: 'var(--text-3)', text: sub }, gNode);
  };
  node(A.marrow, 'Bone marrow', 'makes red cells', (x, y) => use(gNode, I.RBC, x, y, 28));
  node(A.circ, 'Circulating red cells', '≈ 120 days', (x, y) => { use(gNode, I.RBC, x - 14, y - 8, 22); use(gNode, I.RBC, x + 14, y + 10, 22); });
  node(A.mac, 'Macrophages', 'spleen · liver · marrow', (x, y) => s('circle', { cx: x, cy: y, r: 34, fill: I.macro }, gNode), 'var(--macro)');
  node(A.tf, 'Transferrin', 'carries iron back', (x, y) => { use(gNode, I.FE, x - 12, y, 15); use(gNode, I.FE, x + 12, y, 15); }, 'var(--iron)');
  s('text', { x: cx, y: cy + 10, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 700, fill: 'var(--text)', text: 'Iron recycling' }, gNode);
  s('text', { x: cx, y: cy + 46, 'text-anchor': 'middle', 'font-size': 24, fill: 'var(--text-3)', text: 'a closed loop' }, gNode);

  // leak from circulation
  const [lx, ly] = pt(A.circ);
  const leakPath = s('path', { d: `M ${lx + 50} ${ly + 40} C ${lx + 140} ${ly + 120}, ${lx + 160} ${ly + 260}, ${lx + 150} ${ly + 420}`, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 4, 'stroke-dasharray': '8 10', opacity: 0.8 }, gLeak);
  const leakFlow = new PathFlow(leakPath, gLeak, { count: 6, speed: 120, symbol: I.RBC, r: 12, fade: 0.2 });
  s('text', { x: lx + 170, y: ly + 470, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: 'var(--bad)', text: 'Blood loss = iron loss' }, gLeak);
  s('text', { x: lx + 170, y: ly + 502, 'text-anchor': 'middle', 'font-size': 22, fill: 'var(--text-3)', text: 'heavy menstrual bleeding' }, gLeak);
  // weak dietary inflow
  const [tx, ty] = pt(A.tf);
  const inPath = s('path', { d: `M ${tx - 110} ${ty + 170} C ${tx - 80} ${ty + 120}, ${tx - 60} ${ty + 80}, ${tx - 40} ${ty + 50}`, fill: 'none', stroke: 'var(--iron)', 'stroke-width': 3, 'stroke-dasharray': '4 8', opacity: 0.6 }, gLeak);
  const inFlow = new PathFlow(inPath, gLeak, { count: 1, speed: 40, symbol: I.FE, r: 8, fade: 0.3 });
  s('text', { x: tx - 120, y: ty + 206, 'text-anchor': 'middle', 'font-size': 22, fill: 'var(--text-3)', text: 'diet: limited iron in' }, gLeak);

  // bar chart
  const chart = slide.querySelector('[data-chart]');
  chart.innerHTML = `
    <div class="bars" style="display:grid; gap:26px">
      ${[['Men', 0.6, 'mainly in feces', 'var(--text-2)'], ['Women', 1.3, 'average, with menstrual loss', 'var(--blood)']].map(([k, v, sub, col]) => `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:baseline">
            <span class="t-label">${k}</span><span class="num" style="font-size:44px; font-weight:750; letter-spacing:-.02em; color:${col}">≈ ${v} <span style="font-size:26px; color:var(--text-3); font-weight:600">mg/day</span></span>
          </div>
          <div style="height:22px; border-radius:11px; background:var(--surface-2); margin-top:10px; overflow:hidden">
            <i data-w="${(v / 1.4) * 100}" style="display:block; height:100%; width:0; border-radius:11px; background:${col === 'var(--blood)' ? 'linear-gradient(90deg,var(--blood),var(--iron))' : 'var(--text-3)'}; transition: width 1.4s cubic-bezier(.2,.8,.2,1)"></i>
          </div>
          <div class="t-cap" style="margin-top:8px">${sub}</div>
        </div>`).join('')}
    </div>`;
  const bars = [...chart.querySelectorAll('i[data-w]')];

  let step = 0, leakA = 0, dep = 0;
  return {
    steps: 2,
    enter() { dep = 0; leakA = 0; bars.forEach((b) => (b.style.width = '0')); },
    step(n) {
      step = n;
      bars.forEach((b) => (b.style.width = n >= 1 ? b.dataset.w + '%' : '0'));
      if (n === 0) dep = 0;
    },
    frame(_, dt) {
      leakA = damp(leakA, step >= 1 ? 1 : 0, 3, dt);
      gLeak.setAttribute('opacity', leakA.toFixed(3));
      if (step >= 1) dep = clamp(dep + dt / 10);
      // the loop runs dry: fewer iron particles, paler cells
      segs[2].f.setCount(Math.max(2, Math.round(6 - dep * 4)));
      segs[3].f.setCount(Math.max(1, Math.round(5 - dep * 4)));
      const pale = dep > 0.5;
      [segs[0], segs[1]].forEach((sg) => sg.f.items.forEach((it) => it.setAttribute('href', pale ? I.RBCpale : I.RBC)));
      segs.forEach((sg) => sg.f.frame(dt));
      leakFlow.frame(dt);
      inFlow.frame(dt);
    },
  };
}
