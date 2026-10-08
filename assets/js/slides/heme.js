// Heme synthesis: glycine + succinyl-CoA → (ALA synthase, vitamin B6) → ALA
// → … → protoporphyrin IX → (ferrochelatase + Fe²⁺) → heme → + globin →
// hemoglobin. Switch iron off and the last steps starve.
import { s, svgRoot, PathFlow, drawable, damp, segmented } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1664, H = 690;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);
  const gEdge = s('g', {}, svg), gFlow = s('g', {}, svg), gNode = s('g', {}, svg);
  const Y = 250;

  const ring = (g, x, y, withFe) => {
    s('rect', { x: x - 34, y: y - 34, width: 68, height: 68, rx: 22, fill: 'none', stroke: '#d8344f', 'stroke-width': 9, transform: `rotate(45 ${x} ${y})` }, g);
    [[0, -40], [40, 0], [0, 40], [-40, 0]].forEach(([dx, dy]) => s('circle', { cx: x + dx, cy: y + dy, r: 10, fill: '#d8344f' }, g));
    if (withFe) use(g, I.FE, x, y, 15);
  };
  const node = (x, title, sub, draw, at, color = 'var(--text)') => {
    const g = s('g', { opacity: 0 }, gNode);
    s('circle', { cx: x, cy: Y, r: 66, fill: 'var(--bg-2)', stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    draw(g, x, Y);
    s('text', { x, y: Y + 110, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 750, fill: color, text: title }, g);
    if (sub) s('text', { x, y: Y + 144, 'text-anchor': 'middle', 'font-size': 23, fill: 'var(--text-3)', text: sub }, g);
    return { g, at, a: 0 };
  };
  const enzyme = (x, name, cof, at, col = 'var(--o2)') => {
    const g = s('g', { opacity: 0 }, gNode);
    const w = name.length * 15 + 40;
    s('rect', { x: x - w / 2, y: Y - 128, width: w, height: 48, rx: 24, fill: 'var(--surface-2)', stroke: col, 'stroke-width': 2 }, g);
    s('text', { x, y: Y - 96, 'text-anchor': 'middle', 'font-size': 25, 'font-weight': 700, fill: col, text: name }, g);
    if (cof) {
      const w2 = cof.length * 13 + 36;
      s('rect', { x: x - w2 / 2, y: Y - 190, width: w2, height: 42, rx: 21, fill: 'var(--surface)', stroke: 'var(--line-2)' }, g);
      s('text', { x, y: Y - 162, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--text-2)', text: cof }, g);
    }
    return { g, at, a: 0 };
  };
  const edge = (x0, x1, at, dashed = false) => {
    const p = s('path', { d: `M ${x0} ${Y} L ${x1} ${Y}`, stroke: 'var(--line-2)', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none', 'stroke-dasharray': dashed ? '3 14' : null }, gEdge);
    const draw = dashed ? () => {} : drawable(p);
    const flow = new PathFlow(p, gFlow, { count: 3, speed: 110, r: 8, fill: '#ff6b81', fade: 0.2 });
    flow.setVisible(false, true);
    return { p, draw, flow, at, a: 0 };
  };

  const X = [200, 520, 830, 1160, 1490];
  const nodes = [
    node(X[0], 'Glycine + succinyl-CoA', 'amino acid + Krebs intermediate', (g, x, y) => { s('circle', { cx: x - 20, cy: y, r: 22, fill: '#9ee6a8' }, g); s('circle', { cx: x + 22, cy: y, r: 22, fill: '#ffd60a', opacity: 0.85 }, g); }, 0),
    node(X[1], 'ALA', 'δ-aminolevulinic acid', (g, x, y) => s('circle', { cx: x, cy: y, r: 24, fill: '#ffb3c1' }, g), 0),
    node(X[2], 'Protoporphyrin IX', 'after several steps', (g, x, y) => ring(g, x, y, false), 1),
    node(X[3], 'Heme', 'iron inside the ring', (g, x, y) => ring(g, x, y, true), 2, 'var(--blood)'),
    node(X[4], 'Hemoglobin', 'heme + globin chains', (g, x, y) => { [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(([dx, dy], i) => s('circle', { cx: x + dx, cy: y + dy, r: 21, fill: i % 3 ? '#c9184a' : '#ff5a6e' }, g)); }, 3, 'var(--blood)'),
  ];
  const enzymes = [
    enzyme((X[0] + X[1]) / 2 + 20, 'ALA synthase', 'Vitamin B6 · cofactor', 0),
    enzyme((X[2] + X[3]) / 2, 'Ferrochelatase', '', 2, 'var(--iron)'),
    enzyme((X[3] + X[4]) / 2, '+ Globin', '', 3, 'var(--text-2)'),
  ];
  const edges = [edge(X[0] + 70, X[1] - 70, 0), edge(X[1] + 70, X[2] - 70, 1, true), edge(X[2] + 70, X[3] - 70, 2), edge(X[3] + 70, X[4] - 70, 3)];
  s('text', { x: (X[1] + X[2]) / 2, y: Y - 26, 'text-anchor': 'middle', 'font-size': 22, fill: 'var(--text-3)', text: 'several steps' }, gNode);

  // iron supply into ferrochelatase
  const fx = (X[2] + X[3]) / 2;
  const ironG = s('g', { opacity: 0 }, svg);
  const ironPath = s('path', { d: `M ${fx} ${Y + 300} L ${fx} ${Y + 10}`, stroke: 'var(--iron)', 'stroke-width': 3, 'stroke-dasharray': '2 12', 'stroke-linecap': 'round', fill: 'none' }, ironG);
  const ironFlow = new PathFlow(ironPath, ironG, { count: 6, speed: 110, symbol: I.FE, r: 12, fade: 0.15 });
  s('text', { x: fx - 18, y: Y + 300, 'text-anchor': 'end', 'font-size': 28, 'font-weight': 750, fill: 'var(--iron)', text: 'Fe²⁺ supply' }, ironG);

  // outcome strip
  const outG = s('g', { opacity: 0 }, svg);
  s('rect', { x: 1080, y: Y + 200, width: 584, height: 200, rx: 28, fill: 'var(--surface)', stroke: 'var(--line)' }, outG);
  [[1130, Y + 280, 30], [1190, Y + 292, 22], [1240, Y + 274, 26]].forEach(([x, y, r]) => use(outG, I.RBCpale, x, y, r));
  s('text', { x: 1290, y: Y + 270, 'font-size': 30, 'font-weight': 750, fill: 'var(--text)', text: 'Less hemoglobin' }, outG);
  s('text', { x: 1290, y: Y + 306, 'font-size': 24, fill: 'var(--text-2)', text: 'hypochromic + microcytic' }, outG);
  s('text', { x: 1110, y: Y + 368, 'font-size': 30, 'font-weight': 750, fill: 'var(--blood)', text: '↓ MCV   ↓ MCH   ↓ MCHC' }, outG);

  // Guyton note
  const note = s('g', { opacity: 0 }, svg);
  s('rect', { x: 0, y: Y + 200, width: 820, height: 200, rx: 28, fill: 'var(--surface)', stroke: 'var(--line)' }, note);
  s('text', { x: 40, y: Y + 296, 'font-size': 40, 'font-weight': 700, fill: 'var(--text)', text: 'Less hemoglobin → smaller cells' }, note);
  s('text', { x: 40, y: Y + 350, 'font-size': 22, 'font-weight': 650, fill: 'var(--text-3)', text: 'GUYTON & HALL, CH. 33' }, note);

  let step = 0, mode = 0, def = 0, ironA = 0, outA = 0, noteA = 0;
  const seg = segmented(slide.querySelector('[data-seg]'), ['Iron available', 'Iron deficient'], (i) => (mode = i), 0);

  return {
    steps: 5,
    enter() { [...nodes, ...enzymes, ...edges].forEach((x) => (x.a = 0)); edges.forEach((e) => { e.draw(0); e.flow.setVisible(false, true); }); seg.set(0); },
    step(n) { step = n; seg.set(n >= 4 ? 1 : 0); },
    frame(_, dt) {
      def = damp(def, mode, 2.5, dt);
      [...nodes, ...enzymes].forEach((x) => { x.a = damp(x.a, step >= x.at ? 1 : 0, 3.2, dt); x.g.setAttribute('opacity', x.a.toFixed(3)); });
      edges.forEach((e, i) => {
        e.a = damp(e.a, step >= e.at ? 1 : 0, 2.4, dt);
        e.draw(e.a);
        e.flow.setVisible(e.a > 0.8);
        if (i >= 2) { e.flow.setCount(def > 0.5 ? 1 : 3); e.flow.setSpeed(110 - def * 60); }
        e.flow.frame(dt);
      });
      ironA = damp(ironA, step >= 2 ? 1 : 0, 3, dt);
      ironG.setAttribute('opacity', ironA.toFixed(3));
      ironFlow.setCount(Math.max(1, Math.round(6 - def * 5)));
      ironFlow.frame(dt);
      outA = damp(outA, step >= 4 && mode === 1 ? 1 : 0, 3, dt);
      outG.setAttribute('opacity', outA.toFixed(3));
      noteA = damp(noteA, step >= 5 ? 1 : 0, 3, dt);
      note.setAttribute('opacity', noteA.toFixed(3));
      const hb = nodes[4];
      hb.g.style.filter = def > 0.05 ? `saturate(${1 - def * 0.6}) brightness(${1 + def * 0.15})` : '';
      nodes[3].g.style.filter = hb.g.style.filter;
    },
  };
}
