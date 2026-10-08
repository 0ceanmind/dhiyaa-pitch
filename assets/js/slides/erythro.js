// Erythropoiesis: stem cell → proerythroblast → erythroblast → reticulocyte
// → erythrocyte. Hemoglobin accumulates as the cell matures; with iron
// deficient, the output cells are smaller, paler and vary in size.
import { s, svgRoot, PathFlow, damp, mix, segmented, rng } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1664, H = 500;
  const svg = svgRoot(box, W, H, { preserveAspectRatio: 'xMidYMin meet' });
  const R = rng(3);
  const defs = s('defs', {}, svg);
  let gid = 0;
  const grad = (inner, outer) => {
    const id = `ery-g${++gid}`;
    const g = s('radialGradient', { id, cx: '42%', cy: '40%', r: '62%' }, defs);
    const a = s('stop', { offset: 0, 'stop-color': inner }, g);
    const b = s('stop', { offset: 1, 'stop-color': outer }, g);
    return { url: `url(#${id})`, a, b };
  };

  const cy = 250;
  const xs = [130, 480, 830, 1180, 1500];
  const names = ['Hematopoietic stem cell', 'Proerythroblast', 'Erythroblast', 'Reticulocyte', 'Erythrocyte'];
  // [cytoplasm inner, outer] for iron-available vs iron-deficient
  const COL = [
    [['#f2edff', '#c9b8ff'], ['#f2edff', '#c9b8ff']],
    [['#8f86f0', '#5a4fd0'], ['#8f86f0', '#5a4fd0']],
    [['#d78bb0', '#a05cb8'], ['#d9a6c6', '#ad7cc4']],
    [['#f07a8d', '#c8274a'], ['#f3b0ba', '#d56d82']],
    [['#f39aa6', '#b30f2c'], ['#fbd9dd', '#e07a8b']],
  ];
  const RAD = [[66, 66], [76, 76], [62, 58], [54, 46], [54, 44]];
  const NUC = [[0.62], [0.6], [0.36], [0], [0]];

  const gArrow = s('g', {}, svg), gFlow = s('g', {}, svg), gCells = s('g', {}, svg), gIron = s('g', {}, svg);
  // connectors
  const flows = [];
  for (let i = 0; i < 4; i++) {
    const x0 = xs[i] + 96, x1 = xs[i + 1] - 96;
    const p = s('path', { d: `M ${x0} ${cy} L ${x1} ${cy}`, stroke: 'var(--line-2)', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }, gArrow);
    s('path', { d: `M ${x1 - 14} ${cy - 12} L ${x1} ${cy} L ${x1 - 14} ${cy + 12}`, stroke: 'var(--line-2)', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gArrow);
    flows.push(new PathFlow(p, gFlow, { count: 2, speed: 90, r: 5, fill: 'var(--text-3)', fade: 0.3 }));
  }

  const cells = xs.map((x, i) => {
    const g = s('g', { opacity: 0 }, gCells);
    const gr = grad(COL[i][0][0], COL[i][0][1]);
    const body = s('circle', { cx: x, cy, r: RAD[i][0], fill: gr.url }, g);
    let pallor = null, nuc = null, ret = null, extra = [];
    if (NUC[i][0]) nuc = s('circle', { cx: x + 4, cy: cy + 2, r: RAD[i][0] * NUC[i][0], fill: i === 0 ? '#8f6df0' : '#3b2a8f' }, g);
    if (i === 3) {
      ret = s('path', { d: `M ${x - 30} ${cy - 10} q 16 -18 30 0 t 30 4 M ${x - 20} ${cy + 18} q 14 -10 26 2`, stroke: '#5a4fd0', 'stroke-width': 3, fill: 'none', opacity: 0.7 }, g);
      // extruded nucleus drifting away
      nuc = s('circle', { cx: x - 70, cy: cy + 70, r: 14, fill: '#3b2a8f', opacity: 0.8 }, g);
    }
    if (i === 4) {
      pallor = s('circle', { cx: x, cy, r: RAD[i][0] * 0.36, fill: '#ffffff', opacity: 0.16 }, g);
      // extra output cells for anisocytosis in deficient mode
      [[x + 96, cy - 54, 30], [x + 100, cy + 40, 36], [x - 78, cy - 62, 24]].forEach(([ex, ey, er]) => {
        const eg = grad('#fbd9dd', '#e07a8b');
        const c = s('circle', { cx: ex, cy: ey, r: er, fill: eg.url, opacity: 0 }, g);
        extra.push(c);
      });
    }
    const label = s('text', { x, y: cy + 140, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: 'var(--text)' }, g);
    if (i === 0) {
      label.textContent = 'Stem cell';
      s('text', { x, y: cy + 174, 'text-anchor': 'middle', 'font-size': 23, fill: 'var(--text-3)', text: 'hematopoietic' }, g);
    } else label.textContent = names[i];
    return { g, gr, body, nuc, pallor, extra, a: 0, k: 0 };
  });

  // iron supply line
  const ironPath = s('path', { d: `M 330 ${cy - 170} L 1300 ${cy - 170}`, fill: 'none', stroke: 'var(--iron)', 'stroke-width': 3, 'stroke-dasharray': '2 12', 'stroke-linecap': 'round', opacity: 0.6 }, gIron);
  const ironFlow = new PathFlow(ironPath, gIron, { count: 12, speed: 120, r: 8, fill: '#ffae2e', fade: 0.12 });
  const feeds = [1, 2, 3].map((i) => {
    const p = s('path', { d: `M ${xs[i]} ${cy - 160} L ${xs[i]} ${cy - RAD[i][0] - 16}`, fill: 'none', stroke: 'var(--iron)', 'stroke-width': 3, opacity: 0.5 }, gIron);
    return new PathFlow(p, gIron, { count: 2, speed: 70, r: 7, fill: '#ffae2e', fade: 0.2 });
  });
  s('text', { x: 300, y: cy - 162, 'text-anchor': 'end', 'font-size': 26, 'font-weight': 700, fill: 'var(--iron)', text: 'Iron supply' }, gIron);
  gIron.setAttribute('opacity', 0);

  let mode = 0, step = 0, ironA = 0, def = 0;
  const seg = segmented(slide.querySelector('[data-seg]'), ['Iron available', 'Iron deficient'], (i) => (mode = i), 0);

  return {
    steps: 2,
    enter() { cells.forEach((c) => (c.a = 0)); def = 0; seg.set(0); },
    step(n) { step = n; seg.set(n >= 2 ? 1 : 0); },
    frame(_, dt) {
      def = damp(def, mode, 2.4, dt);
      cells.forEach((c, i) => {
        c.a = damp(c.a, 1, 2.6 - i * 0.35, dt);
        c.g.setAttribute('opacity', c.a.toFixed(3));
        const r = RAD[i][0] + (RAD[i][1] - RAD[i][0]) * def;
        c.body.setAttribute('r', r.toFixed(1));
        c.gr.a.setAttribute('stop-color', mix(COL[i][0][0], COL[i][1][0], def));
        c.gr.b.setAttribute('stop-color', mix(COL[i][0][1], COL[i][1][1], def));
        if (c.pallor) { c.pallor.setAttribute('r', (r * (0.36 + 0.22 * def)).toFixed(1)); c.pallor.setAttribute('opacity', (0.16 + 0.3 * def).toFixed(3)); }
        c.extra.forEach((e) => e.setAttribute('opacity', def.toFixed(3)));
      });
      ironA = damp(ironA, step >= 1 ? 1 : 0, 3, dt);
      gIron.setAttribute('opacity', ironA.toFixed(3));
      const n = Math.round(12 - def * 9);
      ironFlow.setCount(n);
      ironFlow.frame(dt);
      feeds.forEach((f) => { f.setCount(def > 0.5 ? 1 : 2); f.frame(dt); });
      flows.forEach((f) => f.frame(dt));
    },
  };
}
