// Body iron distribution (Guyton & Hall, Ch. 33): ~65% hemoglobin, ~4%
// myoglobin, ~1% heme compounds, ~0.1% transferrin, 15–30% stored.
import { s, svgRoot, damp } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1000, H = 700;
  const svg = svgRoot(box, W, H);
  const cx = 330, cy = 350, r = 250, sw = 78;

  const segs = [
    { name: 'Hemoglobin', v: 65, label: '≈ 65%', col: 'var(--blood)' },
    { name: 'Stored as ferritin', v: 15, label: '15–30%', col: 'var(--iron)' },
    { name: '', v: 14.9, label: '', col: 'var(--iron)', hatch: true },
    { name: 'Myoglobin', v: 4, label: '≈ 4%', col: '#ff8fa3' },
    { name: 'Heme enzymes', v: 1, label: '≈ 1%', col: 'var(--o2)' },
    { name: 'Transferrin', v: 0.1, label: '≈ 0.1%', col: 'var(--fpn)' },
  ];
  const C = 2 * Math.PI * r;
  s('circle', { cx, cy, r, fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': sw }, svg);
  const defs = s('defs', {}, svg);
  const pat = s('pattern', { id: 'bud-hatch', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  s('rect', { width: 14, height: 14, fill: 'rgba(255,159,10,0.18)' }, pat);
  s('rect', { width: 6, height: 14, fill: 'rgba(255,159,10,0.75)' }, pat);

  let acc = 0;
  const arcs = segs.map((sg) => {
    const len = (sg.v / 100) * C;
    const el = s('circle', {
      cx, cy, r, fill: 'none', stroke: sg.hatch ? 'url(#bud-hatch)' : sg.col, 'stroke-width': sw,
      'stroke-dasharray': `0 ${C}`, 'stroke-dashoffset': -acc, transform: `rotate(-90 ${cx} ${cy})`,
    }, svg);
    const out = { ...sg, el, len, start: acc, p: 0 };
    acc += len;
    return out;
  });
  s('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 92, 'font-weight': 750, fill: 'var(--text)', 'letter-spacing': '-3', text: '4–5 g' }, svg);
  s('text', { x: cx, y: cy + 50, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 600, fill: 'var(--text-3)', text: 'total body iron' }, svg);

  // legend
  const lg = s('g', {}, svg);
  segs.filter((x) => x.name).forEach((sg, i) => {
    const y = 170 + i * 92;
    const g = s('g', { opacity: 0 }, lg);
    s('circle', { cx: 680, cy: y - 10, r: 13, fill: sg.col }, g);
    s('text', { x: 706, y, 'font-size': 29, 'font-weight': 650, fill: 'var(--text)', text: sg.name }, g);
    s('text', { x: 706, y: y + 38, 'font-size': 34, 'font-weight': 750, fill: sg.col, class: 'num', text: sg.label }, g);
    arcs.find((a) => a.name === sg.name).leg = g;
  });

  let t = 0;
  return {
    enter() { t = 0; arcs.forEach((a) => (a.p = 0)); },
    frame(_, dt) {
      t += dt;
      arcs.forEach((a, i) => {
        const delay = 0.3 + i * 0.25;
        a.p = t > delay ? damp(a.p, 1, 3, dt) : 0;
        const L = Math.max(a.v < 1 ? 3 : 0, a.len * a.p);
        a.el.setAttribute('stroke-dasharray', `${L.toFixed(2)} ${C}`);
        if (a.leg) a.leg.setAttribute('opacity', a.p.toFixed(3));
      });
    },
  };
}
