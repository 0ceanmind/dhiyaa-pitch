// Hematocrit tubes (45% example vs patient 29%) and the "not interchangeable"
// demonstration: same RBC count, different cell size or hemoglobin.
import { s, svgRoot, damp, rng } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 900, H = 700;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);
  const R = rng(12);

  const TUBE_H = 470, TUBE_W = 96, TOP = 90;
  const tube = (x, pct, title, sub, col) => {
    const g = s('g', { opacity: 0 }, svg);
    const clipId = `hct-c${x}`;
    const cp = s('clipPath', { id: clipId }, svg);
    const shape = `M ${x - TUBE_W / 2} ${TOP} L ${x + TUBE_W / 2} ${TOP} L ${x + TUBE_W / 2} ${TOP + TUBE_H - TUBE_W / 2} A ${TUBE_W / 2} ${TUBE_W / 2} 0 0 1 ${x - TUBE_W / 2} ${TOP + TUBE_H - TUBE_W / 2} Z`;
    s('path', { d: shape }, cp);
    const inner = s('g', { 'clip-path': `url(#${clipId})` }, g);
    s('rect', { x: x - TUBE_W, y: TOP, width: TUBE_W * 2, height: TUBE_H, fill: '#f4d58d', opacity: 0.75 }, inner);
    const buffy = s('rect', { x: x - TUBE_W, y: 0, width: TUBE_W * 2, height: 6, fill: '#f5f5f7' }, inner);
    const red = s('rect', { x: x - TUBE_W, y: TOP + TUBE_H, width: TUBE_W * 2, height: TUBE_H, fill: '#b5102e' }, inner);
    s('path', { d: shape, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 3 }, g);
    s('rect', { x: x - TUBE_W / 2 - 8, y: TOP - 18, width: TUBE_W + 16, height: 22, rx: 6, fill: 'var(--surface-3)' }, g);
    const val = s('text', { x, y: TOP + TUBE_H + 70, 'text-anchor': 'middle', 'font-size': 52, 'font-weight': 750, fill: col, class: 'num', text: '0%' }, g);
    s('text', { x, y: TOP + TUBE_H + 106, 'text-anchor': 'middle', 'font-size': 25, 'font-weight': 600, fill: 'var(--text-2)', text: title }, g);
    s('text', { x: x + TUBE_W / 2 + 18, y: TOP + 60, 'font-size': 22, fill: 'var(--text-3)', text: sub }, g);
    return { g, red, buffy, val, pct, cur: 0, a: 0 };
  };
  const t1 = tube(120, 45, 'Example', 'plasma', 'var(--text)');
  const t2 = tube(330, 29, 'Our patient', 'plasma', 'var(--blood)');
  s('text', { x: 120 + TUBE_W / 2 + 18, y: TOP + TUBE_H - 60, 'font-size': 22, fill: 'var(--text-3)', text: 'red cells' }, t1.g);

  // demo: same count, different size / hemoglobin
  const demo = s('g', { opacity: 0 }, svg);
  const rows = [
    { y: 110, title: 'Person A', sub: 'reference', r: 17, sym: I.RBC, bar: 0.45, barLab: 'Hct' },
    { y: 330, title: 'Person B', sub: 'same count · larger cells → higher Hct', r: 22, sym: I.RBC, bar: 0.6, barLab: 'Hct' },
    { y: 550, title: 'Person C', sub: 'same count · less hemoglobin → lower Hb', r: 17, sym: I.RBCpale, bar: 0.3, barLab: 'Hb' },
  ];
  const X0 = 500;
  rows.forEach((rw) => {
    s('text', { x: X0, y: rw.y - 50, 'font-size': 28, 'font-weight': 700, fill: 'var(--text)', text: rw.title }, demo);
    s('text', { x: X0, y: rw.y - 18, 'font-size': 21, fill: 'var(--text-3)', text: rw.sub }, demo);
    for (let i = 0; i < 10; i++) {
      const cx = X0 + 22 + (i % 5) * 54 + (R() - 0.5) * 6, cy = rw.y + 30 + Math.floor(i / 5) * 54 + (R() - 0.5) * 6;
      use(demo, rw.sym, cx, cy, rw.r);
    }
    s('rect', { x: X0 + 300, y: rw.y + 10, width: 26, height: 110, rx: 13, fill: 'var(--surface-2)' }, demo);
    s('rect', { x: X0 + 300, y: rw.y + 10 + 110 * (1 - rw.bar), width: 26, height: 110 * rw.bar, rx: 13, fill: rw.barLab === 'Hb' ? 'var(--o2)' : 'var(--blood)' }, demo);
    s('text', { x: X0 + 340, y: rw.y + 72, 'font-size': 24, 'font-weight': 700, fill: 'var(--text-2)', text: rw.barLab }, demo);
  });
  s('text', { x: X0, y: 690, 'font-size': 20, 'font-weight': 650, 'letter-spacing': '2', fill: 'var(--text-3)', text: '10 CELLS EACH · SCHEMATIC' }, demo);

  let step = 0, demoA = 0;
  return {
    steps: 2,
    enter() { [t1, t2].forEach((t) => { t.cur = 0; t.a = 0; }); demoA = 0; },
    step(n) { step = n; },
    frame(_, dt) {
      [t1, t2].forEach((t, i) => {
        const on = i === 0 || step >= 1;
        t.a = damp(t.a, on ? 1 : 0, 3, dt);
        t.cur = damp(t.cur, on ? t.pct : 0, 2, dt);
        t.g.setAttribute('opacity', t.a.toFixed(3));
        const redTop = TOP + TUBE_H * (1 - t.cur / 100);
        t.red.setAttribute('y', redTop.toFixed(1));
        t.buffy.setAttribute('y', (redTop - 6).toFixed(1));
        t.val.textContent = `${Math.round(t.cur)}%`;
      });
      demoA = damp(demoA, step >= 2 ? 1 : 0, 3, dt);
      demo.setAttribute('opacity', demoA.toFixed(3));
      [t1.g, t2.g].forEach((g) => g.setAttribute('transform', `translate(${-40 * demoA} 0)`));
    },
  };
}
