// Hematopoiesis: one stem cell, three lineages, with regulators.
import { s, svgRoot, PathFlow, drawable, damp, css } from '../lib/util.js';
import { iconDefs, use } from '../lib/icons.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1080, H = 720;
  const svg = svgRoot(box, W, H);
  const I = iconDefs(svg);

  const gBranch = s('g', {}, svg);
  const gFlow = s('g', {}, svg);
  const gNodes = s('g', {}, svg);
  const gReg = s('g', {}, svg);

  const cx = 150, cy = 360;
  // stem cell glow + cell
  const glow = s('circle', { cx, cy, r: 130, fill: I.glow, opacity: 0.25 }, gNodes);
  use(gNodes, I.HSC, cx, cy, 74);
  s('text', { x: cx, y: cy + 128, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 650, fill: 'var(--text)', text: 'Hematopoietic' }, gNodes);
  s('text', { x: cx, y: cy + 162, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 650, fill: 'var(--text)', text: 'stem cell' }, gNodes);

  const lines = [
    { y: 130, label: 'Erythrocytes', sub: 'red cells', color: 'var(--blood)', sym: I.RBC, r: 11 },
    { y: 360, label: 'Leukocytes', sub: 'white cells', color: 'var(--lymph)', sym: I.WBC, r: 11 },
    { y: 590, label: 'Platelets', sub: 'via megakaryocytes', color: 'var(--macro)', sym: I.PLT, r: 8 },
  ];

  const branches = lines.map((ln, i) => {
    const d = `M ${cx + 80} ${cy} C ${cx + 300} ${cy}, ${cx + 330} ${ln.y}, 690 ${ln.y}`;
    const path = s('path', { d, fill: 'none', stroke: ln.color, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.55 }, gBranch);
    const draw = drawable(path);
    const flow = new PathFlow(path, gFlow, { count: 7, speed: 120, symbol: ln.sym, r: ln.r, fade: 0.12 });
    flow.setVisible(false, true);
    const node = s('g', { opacity: 0 }, gNodes);
    if (i === 0) {
      use(node, I.RBC, 760, ln.y - 22, 36);
      use(node, I.RBC, 800, ln.y + 18, 36);
      use(node, I.RBC, 742, ln.y + 30, 30);
    } else if (i === 1) {
      use(node, I.WBC, 760, ln.y - 14, 38);
      use(node, I.WBC, 800, ln.y + 26, 32);
    } else {
      [[748, -18, 16], [784, 0, 18], [756, 22, 14], [804, -26, 13], [812, 28, 15]].forEach(([x, dy, r]) => use(node, I.PLT, x, ln.y + dy, r));
    }
    s('text', { x: 850, y: ln.y - 4, 'font-size': 34, 'font-weight': 700, fill: 'var(--text)', text: ln.label }, node);
    s('text', { x: 850, y: ln.y + 32, 'font-size': 24, 'font-weight': 500, fill: 'var(--text-3)', text: ln.sub }, node);
    return { path, draw, flow, node, p: 0 };
  });

  // regulators
  const regs = [
    { x: 250, y: 150, text: 'Stem cell factor', col: '--iron' },
    { x: 400, y: 640, text: 'Cytokines', col: '--o2' },
    { x: 560, y: 54, text: 'Erythropoietin', col: '--blood' },
  ].map((r) => {
    const g = s('g', { opacity: 0, transform: `translate(${r.x} ${r.y})` }, gReg);
    const w = r.text.length * 15.5 + 70;
    const ring = s('rect', { x: -w / 2, y: -28, width: w, height: 56, rx: 28, fill: 'none', stroke: `var(${r.col})`, 'stroke-width': 2, opacity: 0 }, g);
    s('rect', { x: -w / 2, y: -28, width: w, height: 56, rx: 28, fill: 'var(--bg-2)', stroke: 'var(--line-2)', 'stroke-width': 1.5 }, g);
    s('circle', { cx: -w / 2 + 28, cy: 0, r: 9, fill: `var(${r.col})` }, g);
    s('text', { x: -w / 2 + 48, y: 9, 'font-size': 25, 'font-weight': 650, fill: 'var(--text)', text: r.text }, g);
    return { g, ring, w, p: 0 };
  });

  let step = 0;
  let t = 0;
  return {
    enter() {
      branches.forEach((b) => { b.p = 0; b.draw(0); b.node.setAttribute('opacity', 0); b.flow.setVisible(false, true); });
      regs.forEach((r) => { r.p = 0; r.g.setAttribute('opacity', 0); });
    },
    step(n) { step = n; },
    frame(_, dt) {
      t += dt;
      glow.setAttribute('opacity', (0.18 + 0.12 * Math.sin(t * 2.2)).toFixed(3));
      branches.forEach((b, i) => {
        const target = step >= 1 ? 1 : 0;
        b.p = damp(b.p, target, 2.6 - i * 0.35, dt);
        b.draw(b.p);
        b.node.setAttribute('opacity', Math.max(0, (b.p - 0.6) / 0.4).toFixed(3));
        b.flow.setVisible(step >= 1 && b.p > 0.8);
        b.flow.frame(dt);
      });
      regs.forEach((r, i) => {
        r.p = damp(r.p, step >= 2 ? 1 : 0, 3 - i * 0.5, dt);
        r.g.setAttribute('opacity', r.p.toFixed(3));
        const ph = ((t * 0.7 + i * 0.33) % 1);
        r.ring.setAttribute('opacity', ((1 - ph) * 0.8 * r.p).toFixed(3));
        r.ring.setAttribute('transform', `scale(${1 + ph * 0.25})`);
      });
    },
  };
}
