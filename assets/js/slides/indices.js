// MCV, MCH, MCHC: size, hemoglobin amount and hemoglobin concentration of
// the average red cell, for a normal cell and for our patient.
import { s, svgRoot, damp, mix, segmented, rng } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1664, H = 690;
  const svg = svgRoot(box, W, H);
  const R = rng(14);
  const defs = s('defs', {}, svg);

  const COLS = [
    { key: 'MCV', name: 'Mean corpuscular volume', q: 'Average size', normal: '90–95 fL', normalSub: 'normal cell volume (Guyton)', pat: '68 fL', scale: ['Microcytic', 'Normocytic', 'Macrocytic'], np: 1, pp: 0 },
    { key: 'MCH', name: 'Mean corpuscular hemoglobin', q: 'Hemoglobin per cell', normal: 'Normal amount', normalSub: '', pat: '21 pg', scale: ['Low', 'Normal', 'High'], np: 1, pp: 0 },
    { key: 'MCHC', name: 'Mean corpuscular Hb concentration', q: 'Hemoglobin concentration', normal: '≈ 34 g/dL', normalSub: 'cells fill near this maximum (Guyton)', pat: '29 g/dL', scale: ['Hypochromic', 'Normochromic', ''], np: 1, pp: 0 },
  ];
  const CW = W / 3;
  const NORM_R = 120, PAT_R = 120 * Math.cbrt(68 / 92.5);

  const cols = COLS.map((c, i) => {
    const x = CW * i + CW / 2;
    const g = s('g', { opacity: 0 }, svg);
    const gid = `ind-g${i}`;
    const gr = s('radialGradient', { id: gid, cx: '45%', cy: '42%', r: '60%' }, defs);
    const s0 = s('stop', { offset: 0, 'stop-color': '#f39aa6' }, gr);
    const s1 = s('stop', { offset: 0.55, 'stop-color': '#d8274a' }, gr);
    const s2 = s('stop', { offset: 1, 'stop-color': '#9e0b25' }, gr);
    const cy = 170;
    const ref = s('circle', { cx: x, cy, r: NORM_R, fill: 'none', stroke: 'var(--text-3)', 'stroke-width': 2, 'stroke-dasharray': '6 8', opacity: 0 }, g);
    const body = s('circle', { cx: x, cy, r: NORM_R, fill: i === 1 ? 'rgba(255,90,110,0.12)' : `url(#${gid})` }, g);
    const pallor = i === 1 ? null : s('circle', { cx: x, cy, r: NORM_R * 0.34, fill: '#fff', opacity: 0.12 }, g);
    if (i === 1) body.setAttribute('stroke', '#ff6b81'), body.setAttribute('stroke-width', 3);
    const dots = [];
    if (i === 1) {
      for (let k = 0; k < 46; k++) {
        const a = k * 2.399 + R() * 0.3, d = Math.sqrt((k + 0.5) / 46) * (NORM_R - 16);
        dots.push({ el: s('circle', { cx: x + Math.cos(a) * d, cy: cy + Math.sin(a) * d, r: 8, fill: '#e3274a' }, g), a, d });
      }
    }
    s('text', { x, y: 350, 'text-anchor': 'middle', 'font-size': 64, 'font-weight': 750, fill: 'var(--text)', text: c.key, 'letter-spacing': '-2' }, g);
    s('text', { x, y: 392, 'text-anchor': 'middle', 'font-size': 27, 'font-weight': 600, fill: 'var(--text-2)', text: c.q }, g);
    // scale
    const sx0 = x - 175, sx1 = x + 175, sy = 470;
    s('line', { x1: sx0, x2: sx1, y1: sy, y2: sy, stroke: 'var(--line-2)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    c.scale.forEach((t, k) => {
      if (!t) return;
      const tx = sx0 + (k / 2) * (sx1 - sx0);
      s('circle', { cx: tx, cy: sy, r: 6, fill: 'var(--text-3)' }, g);
      s('text', { x: tx, y: sy + 40, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 600, fill: 'var(--text-3)', text: t }, g);
    });
    const marker = s('path', { d: 'M -14 -30 L 14 -30 L 0 -8 Z', fill: 'var(--text)' }, g);
    const val = s('text', { x, y: 590, 'text-anchor': 'middle', 'font-size': 48, 'font-weight': 750, fill: 'var(--text)', class: 'num' }, g);
    const sub = s('text', { x, y: 630, 'text-anchor': 'middle', 'font-size': 22, fill: 'var(--text-3)' }, g);
    return { c, g, x, cy, ref, body, pallor, dots, stops: [s0, s1, s2], marker, val, sub, sx0, sx1, sy, a: 0 };
  });

  let mode = 0, step = 0, m = 0;
  const seg = segmented(slide.querySelector('[data-seg]'), ['Normal cell', 'Our patient'], (i) => (mode = i), 0);

  return {
    steps: 3,
    enter() { cols.forEach((c) => (c.a = 0)); m = 0; seg.set(0); },
    step(n) { step = n; seg.set(n >= 3 ? 1 : 0); },
    frame(_, dt) {
      m = damp(m, mode, 2.6, dt);
      cols.forEach((col, i) => {
        col.a = damp(col.a, step >= i ? 1 : 0, 3.2, dt);
        col.g.setAttribute('opacity', col.a.toFixed(3));
        const r = i === 0 ? NORM_R + (PAT_R - NORM_R) * m : NORM_R;
        col.body.setAttribute('r', r.toFixed(1));
        col.ref.setAttribute('opacity', (i === 0 ? m * 0.9 : 0).toFixed(3));
        if (col.pallor) {
          col.pallor.setAttribute('r', (r * (0.34 + (i === 2 ? 0.26 : 0.12) * m)).toFixed(1));
          col.pallor.setAttribute('opacity', (0.12 + (i === 2 ? 0.35 : 0.1) * m).toFixed(3));
        }
        const fade = i === 2 ? m : i === 0 ? m * 0.5 : 0;
        col.stops[0].setAttribute('stop-color', mix('#f39aa6', '#fbd9dd', fade));
        col.stops[1].setAttribute('stop-color', mix('#d8274a', '#e88a99', fade));
        col.stops[2].setAttribute('stop-color', mix('#9e0b25', '#d0566b', fade));
        if (col.dots.length) {
          const visible = Math.round(46 - m * (46 - 31));
          col.dots.forEach((d, k) => d.el.setAttribute('opacity', k < visible ? 1 : 0));
        }
        const pos = 1 - m;   // normal → middle, patient → left (low)
        const mx = col.sx0 + (pos / 2) * (col.sx1 - col.sx0);
        col.marker.setAttribute('transform', `translate(${mx.toFixed(1)} ${col.sy})`);
        const pat = mode === 1;
        col.val.textContent = pat ? `${col.c.pat} ↓` : col.c.normal;
        col.val.setAttribute('fill', pat ? 'var(--blood)' : 'var(--text)');
        col.sub.textContent = pat ? 'our patient' : col.c.normalSub;
      });
    },
  };
}
