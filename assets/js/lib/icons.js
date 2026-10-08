// Shared SVG defs (gradients + symbols) so every diagram speaks the same
// visual language. Symbols use viewBox -1..1 and are placed with <use>.
import { s } from './util.js';

let uid = 0;

export function iconDefs(svg) {
  const p = `i${++uid}_`;
  const d = s('defs', {}, svg);

  const rg = (id, stops, extra = {}) => {
    const g = s('radialGradient', { id: p + id, cx: '50%', cy: '50%', r: '50%', ...extra }, d);
    stops.forEach(([o, c, a = 1]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
    return `url(#${p + id})`;
  };

  const ids = {
    rbcFill: rg('rbc', [[0, '#f08b98'], [0.34, '#e8526a'], [0.62, '#d21f3e'], [1, '#9e0b25']]),
    rbcPale: rg('rbcp', [[0, '#fbe1e4'], [0.55, '#f4b3bb'], [0.8, '#e77f8e'], [1, '#c8495e']]),
    rbcOld: rg('rbco', [[0, '#a8566a'], [0.5, '#8a2a40'], [1, '#5e1426']]),
    sphere: rg('sph', [[0, '#e04a62'], [0.7, '#b8142f'], [1, '#860a20']], { cx: '40%', cy: '38%', r: '62%' }),
    wbc: rg('wbc', [[0, '#f6f3ff'], [0.8, '#ddd4fb'], [1, '#b9aaf0']]),
    macro: rg('mac', [[0, '#c9b2ff', 0.55], [0.75, '#9a76f0', 0.35], [1, '#7a52e0', 0.55]]),
    iron: rg('fe', [[0, '#ffe2a8'], [0.45, '#ffb340'], [1, '#e07b00']]),
    o2: rg('o2', [[0, '#d9f5ff'], [0.6, '#64d2ff'], [1, '#2a9fd6']]),
    hep: rg('hep', [[0, '#ecd0ff'], [0.6, '#bf5af2'], [1, '#8d2fc0']]),
    glow: rg('glow', [[0, '#ffffff', 0.5], [1, '#ffffff', 0]]),
    redGlow: rg('rglow', [[0, '#ff3b52', 0.55], [1, '#ff3b52', 0]]),
    ironGlow: rg('fglow', [[0, '#ff9f0a', 0.6], [1, '#ff9f0a', 0]]),
  };

  const sym = (id, build) => {
    const el = s('symbol', { id: p + id, viewBox: '-1 -1 2 2', overflow: 'visible' }, d);
    build(el);
    return `#${p + id}`;
  };

  ids.RBC = sym('RBC', (g) => {
    s('circle', { r: 1, fill: ids.rbcFill }, g);
    s('ellipse', { cx: -0.3, cy: -0.38, rx: 0.34, ry: 0.18, fill: '#fff', opacity: 0.18, transform: 'rotate(-30 -0.3 -0.38)' }, g);
  });
  ids.RBCpale = sym('RBCp', (g) => {
    s('circle', { r: 1, fill: ids.rbcPale }, g);
  });
  ids.RBCold = sym('RBCo', (g) => {
    s('circle', { r: 1, fill: ids.rbcOld }, g);
  });
  ids.SPH = sym('SPH', (g) => s('circle', { r: 1, fill: ids.sphere }, g));
  ids.WBC = sym('WBC', (g) => {
    s('circle', { r: 1, fill: ids.wbc }, g);
    s('path', { d: 'M-0.5 -0.1 C-0.55 -0.5 -0.1 -0.55 0 -0.25 C0.15 -0.6 0.6 -0.45 0.5 -0.05 C0.75 0.2 0.45 0.6 0.15 0.35 C0 0.6 -0.5 0.55 -0.4 0.2 C-0.7 0.15 -0.7 -0.1 -0.5 -0.1Z', fill: '#7a5bd6' }, g);
  });
  ids.PLT = sym('PLT', (g) => {
    s('path', { d: 'M-0.9 -0.2 C-0.8 -0.8 0.2 -0.9 0.6 -0.5 C1 -0.1 0.9 0.6 0.3 0.8 C-0.3 1 -1 0.5 -0.9 -0.2Z', fill: '#c4a6ff' }, g);
    s('circle', { cx: -0.1, cy: 0, r: 0.22, fill: '#8a64e6' }, g);
  });
  ids.FE = sym('FE', (g) => {
    s('circle', { r: 1, fill: ids.iron }, g);
  });
  ids.O2 = sym('O2', (g) => {
    s('circle', { cx: -0.42, r: 0.6, fill: ids.o2 }, g);
    s('circle', { cx: 0.42, r: 0.6, fill: ids.o2 }, g);
  });
  ids.HEP = sym('HEP', (g) => {
    s('path', { d: 'M-1 0 L-0.5 -0.85 L0.5 -0.85 L1 0 L0.5 0.85 L-0.5 0.85Z', fill: ids.hep }, g);
  });
  ids.HSC = sym('HSC', (g) => {
    s('circle', { r: 1, fill: '#f2edff' }, g);
    s('circle', { cx: 0.05, cy: 0.02, r: 0.62, fill: '#8f6df0' }, g);
    s('circle', { cx: -0.12, cy: -0.1, r: 0.14, fill: '#c9b8ff' }, g);
  });

  return ids;
}

/** Place a symbol centred at (x, y) with radius r. */
export function use(parent, href, x, y, r, attrs = {}) {
  return s('use', { href, x: x - r, y: y - r, width: r * 2, height: r * 2, ...attrs }, parent);
}

/** Move an existing <use> to a new centre/radius. */
export function place(el, x, y, r) {
  el.setAttribute('x', (x - r).toFixed(1));
  el.setAttribute('y', (y - r).toFixed(1));
  el.setAttribute('width', (r * 2).toFixed(1));
  el.setAttribute('height', (r * 2).toFixed(1));
}
