// Spleen histology: capsule, trabeculae, white pulp around arterial branches,
// red pulp of cords and sinusoids. Each step spotlights one region.
import { s, svgRoot, rng, damp } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1000, H = 760;
  const svg = svgRoot(box, W, H);
  const R = rng(21);
  const defs = s('defs', {}, svg);
  const organ = 'M 120 120 C 260 40, 640 30, 820 110 C 940 165, 960 330, 910 470 C 860 610, 700 700, 500 705 C 300 710, 130 640, 90 500 C 55 380, 40 190, 120 120 Z';
  const clip = s('clipPath', { id: 'spl-clip' }, defs);
  s('path', { d: organ }, clip);
  const rpGrad = s('radialGradient', { id: 'spl-rp', cx: '45%', cy: '40%', r: '70%' }, defs);
  s('stop', { offset: 0, 'stop-color': '#b3203a' }, rpGrad);
  s('stop', { offset: 1, 'stop-color': '#6d0b1e' }, rpGrad);
  const wpGrad = s('radialGradient', { id: 'spl-wp' }, defs);
  s('stop', { offset: 0, 'stop-color': '#efe9ff' }, wpGrad);
  s('stop', { offset: 0.7, 'stop-color': '#c9b8ff' }, wpGrad);
  s('stop', { offset: 1, 'stop-color': '#a48df0', 'stop-opacity': 0.9 }, wpGrad);

  const body = s('g', { 'clip-path': 'url(#spl-clip)' }, svg);

  // red pulp
  const gRed = s('g', {}, body);
  s('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#spl-rp)' }, gRed);
  const sinusoids = [];
  for (let i = 0; i < 46; i++) {
    const x = 80 + R() * 860, y = 60 + R() * 660, a = R() * 180;
    sinusoids.push(s('ellipse', { cx: x, cy: y, rx: 34 + R() * 26, ry: 7 + R() * 4, fill: '#ff9aa9', opacity: 0.32, transform: `rotate(${a} ${x} ${y})` }, gRed));
  }
  const rbcDots = [];
  for (let i = 0; i < 520; i++) {
    const x = R() * W, y = R() * H;
    rbcDots.push(s('circle', { cx: x, cy: y, r: 3 + R() * 1.6, fill: R() < 0.5 ? '#ff4d66' : '#d9223f', opacity: 0.75 }, gRed));
  }

  // trabeculae
  const gTrab = s('g', {}, body);
  const trabs = [
    'M 300 60 C 320 160, 290 240, 330 330 S 360 430, 340 470',
    'M 640 50 C 610 150, 650 230, 620 320',
    'M 900 300 C 820 320, 760 360, 700 420 S 640 520, 600 560',
    'M 140 560 C 220 520, 260 520, 320 560',
    'M 520 700 C 520 640, 470 590, 480 520',
    'M 330 330 C 400 340, 470 330, 520 300',
  ];
  trabs.forEach((d, i) => s('path', { d, fill: 'none', stroke: '#eadfce', 'stroke-width': 14 - (i % 3) * 2, 'stroke-linecap': 'round', opacity: 0.85 }, gTrab));

  // splenic artery branches (enter from the hilum, bottom right) + white pulp
  const gWhite = s('g', {}, body);
  const artery = s('g', {}, gWhite);
  const nodules = [
    [230, 250, 78], [470, 190, 70], [740, 230, 66], [420, 450, 84], [700, 520, 70], [230, 470, 60],
  ];
  const hilum = [820, 690];
  nodules.forEach(([x, y], i) => {
    const mx = (x + hilum[0]) / 2 + (i % 2 ? 60 : -40), my = (y + hilum[1]) / 2 + 30;
    s('path', { d: `M ${hilum[0]} ${hilum[1]} Q ${mx} ${my} ${x + 6} ${y + 4}`, fill: 'none', stroke: '#ff5a4f', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.9 }, artery);
  });
  nodules.forEach(([x, y, r]) => {
    s('circle', { cx: x, cy: y, r, fill: 'url(#spl-wp)', opacity: 0.95 }, gWhite);
    for (let k = 0; k < Math.round(r * 1.5); k++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * (r - 6);
      s('circle', { cx: x + Math.cos(a) * d, cy: y + Math.sin(a) * d, r: 3.2, fill: '#6d4fd0', opacity: 0.5 }, gWhite);
    }
    s('circle', { cx: x + 6, cy: y + 4, r: 9, fill: '#ff453a', stroke: '#fff', 'stroke-width': 3 }, gWhite);
  });

  // capsule
  const capsule = s('path', { d: organ, fill: 'none', stroke: '#efe4d4', 'stroke-width': 16 }, svg);

  // labels
  const gLab = s('g', {}, svg);
  const label = (x, y, lx, ly, text, color) => {
    const g = s('g', { opacity: 0 }, gLab);
    s('line', { x1: x, y1: y, x2: lx, y2: ly, stroke: 'var(--text)', 'stroke-width': 2, opacity: 0.7 }, g);
    s('circle', { cx: x, cy: y, r: 6, fill: 'var(--text)' }, g);
    const tw = text.length * 15.5 + 44;
    const ax = lx > x ? lx : lx - tw;
    s('rect', { x: ax, y: ly - 26, width: tw, height: 52, rx: 26, fill: 'var(--bg-2)', stroke: 'var(--line-2)' }, g);
    s('circle', { cx: ax + 24, cy: ly, r: 8, fill: color }, g);
    s('text', { x: ax + 40, y: ly + 9, 'font-size': 25, 'font-weight': 650, fill: 'var(--text)', text }, g);
    return { g, a: 0 };
  };
  const labs = {
    capsule: label(820, 110, 870, 40, 'Capsule', '#efe4d4'),
    trab: label(626, 250, 700, 330, 'Trabecula', '#eadfce'),
    trab2: label(318, 300, 120, 360, 'Trabecula', '#eadfce'),
    white: label(470, 150, 520, 60, 'White pulp', '#c9b8ff'),
    art: label(560, 560, 600, 640, 'Branch of splenic artery', '#ff453a'),
    red: label(590, 640, 640, 730, 'Red pulp', '#d9223f'),
    cords: label(860, 380, 820, 300, 'Splenic cords', '#ff4d66'),
    sin: label(150, 420, 200, 330, 'Sinusoids', '#ff9aa9'),
  };
  const stepLabs = [['capsule', 'white', 'red'], ['capsule', 'trab', 'trab2'], ['white', 'art'], ['red', 'cords', 'sin']];
  const focus = [null, 'trab', 'white', 'red'];
  const groups = { trab: gTrab, white: gWhite, red: gRed };
  const op = { trab: 1, white: 1, red: 1, cap: 1 };

  let step = 0, t = 0;
  return {
    step(n) { step = n; },
    frame(_, dt) {
      t += dt;
      const f = focus[step];
      Object.keys(groups).forEach((k) => {
        op[k] = damp(op[k], !f || f === k ? 1 : 0.22, 4, dt);
        groups[k].setAttribute('opacity', op[k].toFixed(3));
      });
      op.cap = damp(op.cap, !f || f === 'trab' ? 1 : 0.35, 4, dt);
      capsule.setAttribute('opacity', op.cap.toFixed(3));
      Object.entries(labs).forEach(([k, l]) => {
        l.a = damp(l.a, stepLabs[step].includes(k) ? 1 : 0, 5, dt);
        l.g.setAttribute('opacity', l.a.toFixed(3));
      });
      // red cells drift slowly through the red pulp
      if (step === 3 || step === 0) {
        for (let i = 0; i < rbcDots.length; i += 2) {
          const c = rbcDots[i];
          let x = +c.getAttribute('cx') + dt * (14 + (i % 7) * 3);
          let y = +c.getAttribute('cy') + Math.sin(t + i) * dt * 6;
          if (x > W) x -= W;
          c.setAttribute('cx', x.toFixed(1));
          c.setAttribute('cy', y.toFixed(1));
        }
      }
    },
  };
}
