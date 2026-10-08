// The liver's role: hemoglobin from old cells splits into an iron lane
// (transferrin → marrow or ferritin) and a pigment lane
// (porphyrin → bilirubin → albumin → conjugation → bile).
import { s, svgRoot, PathFlow, drawable, damp } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1664, H = 560;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);
  const gEdge = s('g', {}, svg), gFlow = s('g', {}, svg), gNode = s('g', {}, svg);

  const node = (x, y, lines, draw, { color = 'var(--text)', sub, side } = {}) => {
    const g = s('g', { opacity: 0 }, gNode);
    s('circle', { cx: x, cy: y, r: 56, fill: 'var(--surface-2)', stroke: 'var(--line-2)', 'stroke-width': 1.5 }, g);
    draw(g, x, y);
    lines.forEach((t, i) => {
      const pos = side ? { x: x + 76, y: y - 4 + i * 32, 'text-anchor': 'start' } : { x, y: y + 96 + i * 32, 'text-anchor': 'middle' };
      s('text', { ...pos, 'font-size': 27, 'font-weight': i === 0 ? 700 : 500, fill: i === 0 ? color : 'var(--text-2)', text: t }, g);
    });
    if (sub) s('text', { x, y: y + 96 + lines.length * 32, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 500, fill: 'var(--text-3)', text: sub }, g);
    return { g, a: 0 };
  };
  const edge = (d, color, sym, r) => {
    const p = s('path', { d, fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, gEdge);
    const draw = drawable(p);
    const flow = new PathFlow(p, gFlow, { count: 5, speed: 110, symbol: sym, r, fade: 0.15 });
    flow.setVisible(false, true);
    return { p, draw, flow, a: 0 };
  };

  const y0 = 270, yT = 92, yB = 400;
  const N = {
    old: node(110, y0, ['Old red cell', '~120 days'], (g, x, y) => use(g, I.RBCold, x, y, 38)),
    mac: node(400, y0, ['Hemoglobin', 'broken down'], (g, x, y) => { s('circle', { cx: x, cy: y, r: 40, fill: I.macro }, g); use(g, I.RBC, x - 6, y + 4, 18); }, { sub: 'Kupffer cells · spleen & marrow macrophages' }),
    fe: node(700, yT, ['Iron'], (g, x, y) => use(g, I.FE, x, y, 22), { color: 'var(--iron)' }),
    tf: node(960, yT, ['Transferrin'], (g, x, y) => { use(g, I.FE, x - 13, y, 17); use(g, I.FE, x + 13, y, 17); }, { color: 'var(--iron)' }),
    bm: node(1330, 40, ['Bone marrow', 'new red cells'], (g, x, y) => use(g, I.RBC, x, y, 32), { side: true }),
    fer: node(1330, 196, ['Liver', 'stored as ferritin'], (g, x, y) => { for (let i = 0; i < 9; i++) { const a = i * 2.4, d = Math.sqrt(i / 9) * 26; use(g, I.FE, x + Math.cos(a) * d, y + Math.sin(a) * d, 8); } s('circle', { cx: x, cy: y, r: 36, fill: 'none', stroke: 'var(--iron)', 'stroke-dasharray': '5 5', 'stroke-width': 2 }, g); }, { side: true }),
    bili: node(700, yB, ['Porphyrin', '→ bilirubin'], (g, x, y) => s('circle', { cx: x, cy: y, r: 20, fill: '#ffd60a' }, g), { color: 'var(--bili)' }),
    alb: node(960, yB, ['Unconjugated', 'on albumin'], (g, x, y) => { s('ellipse', { cx: x, cy: y, rx: 36, ry: 26, fill: '#d6dbe6', opacity: 0.85 }, g); s('circle', { cx: x + 12, cy: y - 4, r: 13, fill: '#ffd60a' }, g); }, { color: 'var(--bili)' }),
    ugt: node(1250, yB, ['Liver conjugates it', 'UDP-glucuronosyl-', 'transferase'], (g, x, y) => { s('rect', { x: x - 30, y: y - 30, width: 60, height: 60, rx: 14, fill: 'var(--hepatocyte)' }, g); s('circle', { cx: x, cy: y, r: 11, fill: '#ffd60a' }, g); }, { color: 'var(--hepatocyte)' }),
    bile: node(1540, yB, ['Water-soluble', '→ secreted in bile'], (g, x, y) => s('path', { d: `M ${x} ${y - 30} C ${x + 26} ${y}, ${x + 22} ${y + 26}, ${x} ${y + 26} C ${x - 22} ${y + 26}, ${x - 26} ${y}, ${x} ${y - 30} Z`, fill: 'var(--bile)' }, g), { color: 'var(--bile)' }),
  };

  const E = {
    a: edge(`M 170 ${y0} L 340 ${y0}`, 'var(--text-3)', I.RBCold, 12),
    fe: edge(`M 456 ${y0 - 10} C 560 ${y0 - 10}, 560 ${yT}, 640 ${yT}`, 'var(--iron)', I.FE, 9),
    tf: edge(`M 760 ${yT} L 900 ${yT}`, 'var(--iron)', I.FE, 9),
    bm: edge(`M 1020 ${yT} C 1150 ${yT}, 1160 40, 1270 40`, 'var(--iron)', I.FE, 9),
    fer: edge(`M 1020 ${yT} C 1150 ${yT}, 1160 196, 1270 196`, 'var(--iron)', I.FE, 9),
    bi: edge(`M 456 ${y0 + 10} C 560 ${y0 + 10}, 560 ${yB}, 640 ${yB}`, '#ffd60a', null, 0),
    al: edge(`M 760 ${yB} L 900 ${yB}`, '#ffd60a', null, 0),
    ug: edge(`M 1020 ${yB} L 1190 ${yB}`, '#ffd60a', null, 0),
    bl: edge(`M 1310 ${yB} L 1480 ${yB}`, 'var(--bile)', null, 0),
  };
  // yellow / green dots for the pigment lane
  [E.bi, E.al, E.ug].forEach((e) => { e.flow.g.remove(); e.flow = new PathFlow(e.p, gFlow, { count: 5, speed: 110, r: 8, fill: '#ffd60a', fade: 0.15 }); e.flow.setVisible(false, true); });
  E.bl.flow.g.remove(); E.bl.flow = new PathFlow(E.bl.p, gFlow, { count: 5, speed: 110, r: 8, fill: '#30d158', fade: 0.15 }); E.bl.flow.setVisible(false, true);

  const showAt = {
    nodes: { old: 0, mac: 0, fe: 1, tf: 1, bm: 1, fer: 1, bili: 2, alb: 2, ugt: 2, bile: 2 },
    edges: { a: 0, fe: 1, tf: 1, bm: 1, fer: 1, bi: 2, al: 2, ug: 2, bl: 2 },
  };
  let step = 0;
  return {
    steps: 2,
    enter() { Object.values(N).forEach((n) => { n.a = 0; }); Object.values(E).forEach((e) => { e.a = 0; e.draw(0); e.flow.setVisible(false, true); }); },
    step(n) { step = n; },
    frame(_, dt) {
      Object.entries(N).forEach(([k, n]) => {
        n.a = damp(n.a, step >= showAt.nodes[k] ? 1 : 0, 3.2, dt);
        n.g.setAttribute('opacity', n.a.toFixed(3));
      });
      Object.entries(E).forEach(([k, e]) => {
        e.a = damp(e.a, step >= showAt.edges[k] ? 1 : 0, 2.4, dt);
        e.draw(e.a);
        e.flow.setVisible(e.a > 0.85);
        e.flow.frame(dt);
      });
    },
  };
}
