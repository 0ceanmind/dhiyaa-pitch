// The erythropoietin feedback loop, blocked at the iron step.
import { s, svgRoot, PathFlow, drawable, damp } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1000, H = 720;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);
  const gArc = s('g', {}, svg), gFlow = s('g', {}, svg), gNode = s('g', {}, svg), gGate = s('g', { opacity: 0 }, svg);

  const cx = 500, cy = 345, rx = 300, ry = 225;
  const ang = [-90, -30, 30, 90, 150, 210].map((d) => (d * Math.PI) / 180);
  const P = ang.map((a) => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);

  const icons = [
    (g, x, y) => use(g, I.RBCpale, x, y, 30),
    (g, x, y) => use(g, I.O2, x, y, 26, { opacity: 0.45 }),
    (g, x, y) => { [[-14, -10], [14, -10], [0, 14]].forEach(([dx, dy]) => s('circle', { cx: x + dx, cy: y + dy, r: 13, fill: '#7aa0c8', opacity: 0.8 }, g)); },
    (g, x, y) => s('path', { d: `M ${x + 6} ${y - 30} C ${x + 34} ${y - 30}, ${x + 36} ${y + 30}, ${x + 6} ${y + 30} C ${x - 24} ${y + 30}, ${x - 30} ${y + 8}, ${x - 10} ${y} C ${x - 30} ${y - 8}, ${x - 24} ${y - 30}, ${x + 6} ${y - 30} Z`, fill: '#b5525e' }, g),
    (g, x, y) => s('path', { d: `M ${x - 28} ${y - 18} a 10 10 0 1 1 12 -6 L ${x + 16} ${y + 18} a 10 10 0 1 1 6 12 L ${x - 28} ${y - 18} Z`, fill: '#efe4d4', transform: `rotate(-10 ${x} ${y})` }, g),
    (g, x, y) => { use(g, I.RBCpale, x - 12, y - 8, 18); use(g, I.RBCpale, x + 14, y + 6, 14); use(g, I.RBCpale, x - 4, y + 18, 11); },
  ];
  const labels = [
    ['Hemoglobin ↓', ''], ['O₂-carrying', 'capacity ↓'], ['Tissue', 'hypoxia'], ['Kidney:', 'erythropoietin ↑'], ['Bone marrow', 'stimulated'], ['Poorly hemoglobinized', 'red cells'],
  ];
  const labelPos = [[0, -82, 'middle'], [78, -10, 'start'], [78, -10, 'start'], [0, 92, 'middle'], [72, -10, 'start'], [72, -10, 'start']];

  const nodes = P.map(([x, y], i) => {
    const g = s('g', { opacity: 0 }, gNode);
    s('circle', { cx: x, cy: y, r: 54, fill: 'var(--bg-2)', stroke: i === 3 ? 'var(--blood)' : 'var(--line-2)', 'stroke-width': 2 }, g);
    icons[i](g, x, y);
    const [dx, dy, anchor] = labelPos[i];
    labels[i].forEach((t, k) => t && s('text', { x: x + dx, y: y + dy + k * 32, 'text-anchor': anchor, 'font-size': 28, 'font-weight': k === 0 ? 700 : 600, fill: k === 0 ? 'var(--text)' : 'var(--text-2)', text: t }, g));
    return { g, a: 0 };
  });

  const arcs = P.map((p0, i) => {
    const a0 = ang[i] + 0.27, a1 = ang[(i + 1) % 6] - 0.27 + (i === 5 ? Math.PI * 2 : 0);
    const x0 = cx + Math.cos(a0) * rx, y0 = cy + Math.sin(a0) * ry;
    const x1 = cx + Math.cos(a1) * rx, y1 = cy + Math.sin(a1) * ry;
    const path = s('path', { d: `M ${x0} ${y0} A ${rx} ${ry} 0 0 1 ${x1} ${y1}`, fill: 'none', stroke: i === 3 ? 'var(--blood)' : 'var(--line-2)', 'stroke-width': 4, 'stroke-linecap': 'round' }, gArc);
    const draw = drawable(path);
    const flow = new PathFlow(path, gFlow, { count: i === 3 ? 4 : 3, speed: 80, r: i === 3 ? 8 : 6, fill: i === 3 ? '#ff6b81' : '#d7d7dc', fade: 0.2 });
    flow.setVisible(false, true);
    return { path, draw, flow, a: 0 };
  });

  // EPO label on kidney → marrow arc
  const epoLab = s('text', { x: cx - 150, y: cy + ry + 6, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: 'var(--blood)', text: 'EPO', opacity: 0 }, svg);

  // iron gate on marrow → output arc
  const gx = cx + Math.cos(Math.PI) * rx, gy = cy;
  s('circle', { cx: gx, cy: gy, r: 30, fill: 'var(--bad)' }, gGate);
  s('rect', { x: gx - 16, y: gy - 5, width: 32, height: 10, rx: 3, fill: '#fff' }, gGate);
  s('text', { x: gx - 44, y: gy - 2, 'text-anchor': 'end', 'font-size': 27, 'font-weight': 750, fill: 'var(--iron)', text: 'Iron' }, gGate);
  s('text', { x: gx - 44, y: gy + 28, 'text-anchor': 'end', 'font-size': 27, 'font-weight': 750, fill: 'var(--iron)', text: 'deficient' }, gGate);

  // centre
  const center = s('g', { opacity: 0 }, svg);


  const nodeAt = [0, 0, 0, 1, 1, 2];
  const arcAt = [0, 0, 1, 1, 2, 2];
  let step = 0, gate = 0, cA = 0, eA = 0;
  return {
    steps: 3,
    enter() { nodes.forEach((n) => (n.a = 0)); arcs.forEach((a) => { a.a = 0; a.draw(0); a.flow.setVisible(false, true); }); gate = 0; },
    step(n) { step = n; },
    frame(_, dt) {
      nodes.forEach((n, i) => { n.a = damp(n.a, step >= nodeAt[i] ? 1 : 0, 3, dt); n.g.setAttribute('opacity', n.a.toFixed(3)); });
      arcs.forEach((a, i) => {
        a.a = damp(a.a, step >= arcAt[i] ? 1 : 0, 2.2, dt);
        a.draw(a.a);
        a.flow.setVisible(a.a > 0.8);
        if (i === 4) a.flow.setSpeed(step >= 2 ? 26 : 80);
        a.flow.frame(dt);
      });
      gate = damp(gate, step >= 2 ? 1 : 0, 3, dt);
      gGate.setAttribute('opacity', gate.toFixed(3));
      cA = damp(cA, 1, 2, dt); center.setAttribute('opacity', cA.toFixed(3));
      eA = damp(eA, step >= 1 ? 1 : 0, 3, dt); epoLab.setAttribute('opacity', eA.toFixed(3));
    },
  };
}
