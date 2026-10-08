// RDW as spread, MCV as average: two schematic blood films with a size strip.
import { s, svgRoot, damp, rng } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1040, H = 700;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);

  const panel = (x0, title, sub, cells, sym, col) => {
    const g = s('g', { opacity: 0 }, svg);
    s('rect', { x: x0, y: 0, width: 490, height: 420, rx: 30, fill: 'var(--surface)', stroke: 'var(--line)' }, g);
    cells.forEach(([x, y, r]) => use(g, sym, x0 + x, y, r));
    s('text', { x: x0 + 4, y: 476, 'font-size': 32, 'font-weight': 700, fill: col, text: title }, g);
    s('text', { x: x0 + 4, y: 512, 'font-size': 24, fill: 'var(--text-3)', text: sub }, g);
    // size strip
    const sx0 = x0 + 10, sx1 = x0 + 480, sy = 600;
    s('line', { x1: sx0, x2: sx1, y1: sy, y2: sy, stroke: 'var(--line-2)', 'stroke-width': 3 }, g);
    const rs = cells.map((c) => c[2]);
    const mn = 14, mx = 44;
    const px = (r) => sx0 + ((r - mn) / (mx - mn)) * (sx1 - sx0);
    rs.forEach((r) => s('circle', { cx: px(r), cy: sy - 18, r: 6, fill: col, opacity: 0.75 }, g));
    const lo = Math.min(...rs), hi = Math.max(...rs), mean = rs.reduce((a, b) => a + b, 0) / rs.length;
    s('path', { d: `M ${px(lo)} ${sy + 22} L ${px(lo)} ${sy + 32} L ${px(hi)} ${sy + 32} L ${px(hi)} ${sy + 22}`, fill: 'none', stroke: 'var(--iron)', 'stroke-width': 3 }, g);
    s('text', { x: (px(lo) + px(hi)) / 2, y: sy + 66, 'text-anchor': 'middle', 'font-size': 23, 'font-weight': 700, fill: 'var(--iron)', text: 'RDW: spread' }, g);
    s('path', { d: `M ${px(mean) - 10} ${sy - 46} L ${px(mean) + 10} ${sy - 46} L ${px(mean)} ${sy - 30} Z`, fill: 'var(--text)' }, g);
    s('text', { x: px(mean), y: sy - 56, 'text-anchor': 'middle', 'font-size': 23, 'font-weight': 700, fill: 'var(--text)', text: 'MCV: average' }, g);
    return { g, a: 0 };
  };

  const grid = (seed, rMean, spread) => {
    const R = rng(seed);
    const out = [];
    for (let i = 0; i < 20; i++) {
      const col = i % 5, row = Math.floor(i / 5);
      const r = rMean * (1 + (R() * 2 - 1) * spread);
      out.push([60 + col * 92 + (R() - 0.5) * 18, 62 + row * 98 + (R() - 0.5) * 16, r]);
    }
    return out;
  };
  const normal = panel(0, 'Similar sizes', 'normal RDW · normocytic', grid(3, 33, 0.05), I.RBC, 'var(--text)');
  const patient = panel(550, 'Different sizes', 'high RDW (anisocytosis) · smaller, paler', grid(7, 25, 0.38), I.RBCpale, 'var(--blood)');

  let step = 0;
  return {
    steps: 1,
    enter() { normal.a = 0; patient.a = 0; },
    step(n) { step = n; },
    frame(_, dt) {
      normal.a = damp(normal.a, 1, 3, dt);
      patient.a = damp(patient.a, step >= 1 ? 1 : 0, 3, dt);
      normal.g.setAttribute('opacity', normal.a.toFixed(3));
      patient.g.setAttribute('opacity', patient.a.toFixed(3));
    },
  };
}
