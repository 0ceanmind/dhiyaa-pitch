// Red-cell count ranges (Guyton & Hall, Ch. 33) with the patient's value.
import { s, svgRoot, damp } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 960, H = 660;
  const svg = svgRoot(box, W, H);
  const X0 = 330, X1 = 930, V0 = 3, V1 = 9;
  const x = (v) => X0 + ((v - V0) / (V1 - V0)) * (X1 - X0);

  s('text', { x: 0, y: 36, 'font-size': 24, 'font-weight': 650, 'letter-spacing': '2', fill: 'var(--text-3)', text: 'RED CELL COUNT · MILLION PER MM³' }, svg);
  for (let v = V0; v <= V1; v++) {
    s('line', { x1: x(v), x2: x(v), y1: 70, y2: 580, stroke: 'var(--line)', 'stroke-width': 1.5 }, svg);
    s('text', { x: x(v), y: 620, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 600, fill: 'var(--text-3)', text: v, class: 'num' }, svg);
  }

  const rows = [
    { name: 'Our patient', lo: 4.1, hi: 4.1, label: '4.1', col: 'var(--blood)', at: 0, dot: true },
    { name: 'Normal women', lo: 4.4, hi: 5.0, label: '4.7 ± 0.3', col: 'var(--text-2)', at: 0 },
    { name: 'Normal men', lo: 4.9, hi: 5.5, label: '5.2 ± 0.3', col: 'var(--text-2)', at: 0 },
    { name: 'Secondary', lo: 6, hi: 7, label: '6–7', col: 'var(--iron)', at: 1 },
    { name: 'Polycythemia vera', lo: 7, hi: 8, label: '7–8', col: 'var(--blood)', at: 2 },
  ].map((r, i) => {
    const y = 120 + i * 100;
    const g = s('g', { opacity: 0 }, svg);
    s('text', { x: 0, y: y + 10, 'font-size': 30, 'font-weight': 700, fill: r.dot ? 'var(--blood)' : 'var(--text)', text: r.name }, g);
    let bar;
    if (r.dot) {
      bar = s('circle', { cx: x(r.lo), cy: y, r: 0, fill: r.col }, g);
      s('circle', { cx: x(r.lo), cy: y, r: 26, fill: 'none', stroke: r.col, 'stroke-width': 2, opacity: 0.5 }, g);
    } else {
      bar = s('rect', { x: x(r.lo), y: y - 18, width: 0, height: 36, rx: 18, fill: r.col, opacity: 0.9 }, g);
    }
    const lab = s('text', { x: x(r.hi) + (r.dot ? 40 : 18), y: y + 10, 'font-size': 28, 'font-weight': 700, fill: r.col, text: r.label, class: 'num' }, g);
    return { ...r, g, bar, lab, a: 0, w: 0 };
  });

  let step = 0;
  return {
    steps: 2,
    enter() { rows.forEach((r) => { r.a = 0; r.w = 0; }); },
    step(n) { step = n; },
    frame(_, dt) {
      rows.forEach((r, i) => {
        const on = step >= r.at ? 1 : 0;
        r.a = damp(r.a, on, 3.5, dt);
        r.w = damp(r.w, on, 2.6 - (i % 3) * 0.4, dt);
        r.g.setAttribute('opacity', r.a.toFixed(3));
        if (r.dot) r.bar.setAttribute('r', (14 * r.w).toFixed(1));
        else r.bar.setAttribute('width', Math.max(0, (x(r.hi) - x(r.lo)) * r.w).toFixed(1));
      });
    },
  };
}
