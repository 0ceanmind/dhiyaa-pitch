// 120 days in the life of a red cell: drag through time, watch flexibility
// fade, the membrane become fragile, rupture, and the parts be recycled.
import { s, h, svgRoot, damp, clamp, mix, scrubber, rng } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const W = 1664, H = 560;
  const svg = svgRoot(box, W, H, { preserveAspectRatio: 'xMidYMin meet' });
  svg.style.height = 'calc(100% - 110px)';
  const R = rng(17);
  const defs = s('defs', {}, svg);
  const g = s('radialGradient', { id: 'life-g', cx: '42%', cy: '40%', r: '62%' }, defs);
  const st0 = s('stop', { offset: 0, 'stop-color': '#f39aa6' }, g);
  const st1 = s('stop', { offset: 0.55, 'stop-color': '#d8274a' }, g);
  const st2 = s('stop', { offset: 1, 'stop-color': '#9e0b25' }, g);

  const CX = 330, CY = 270, RAD = 165;
  const cell = s('path', { fill: 'url(#life-g)' }, svg);
  const membrane = s('path', { fill: 'none', stroke: '#ffd0d6', 'stroke-width': 4, opacity: 0.5 }, svg);
  const pallor = s('ellipse', { cx: CX, cy: CY, rx: 60, ry: 56, fill: '#fff', opacity: 0.12 }, svg);
  const gFrag = s('g', {}, svg);
  const frags = [...Array(28)].map((_, i) => ({
    el: s(i < 12 ? 'path' : 'circle', i < 12 ? { fill: 'none', stroke: '#a8344e', 'stroke-width': 8, 'stroke-linecap': 'round' } : { r: 6, fill: '#e8304f' }, gFrag),
    a: R() * Math.PI * 2, sp: 60 + R() * 140, rot: R() * 6, mem: i < 12,
  }));

  // Day counter
  const dayT = s('text', { x: 820, y: 96, 'font-size': 120, 'font-weight': 750, fill: 'var(--text)', 'letter-spacing': '-4', class: 'num' }, svg);
  const daySub = s('text', { x: 826, y: 150, 'font-size': 28, 'font-weight': 600, fill: 'var(--text-3)' }, svg);

  // meters
  const gMeters = s('g', {}, svg);
  const meters = [
    { label: 'Metabolic enzyme activity', f: (d) => 1 - 0.85 * (d / 120), col: 'var(--o2)' },
    { label: 'Membrane pliability', f: (d) => 1 - 0.9 * Math.pow(d / 120, 1.3), col: 'var(--good)' },
    { label: 'Fragility', f: (d) => 0.08 + 0.92 * Math.pow(d / 120, 2.2), col: 'var(--bad)' },
  ].map((m, i) => {
    const y = 220 + i * 92;
    s('text', { x: 820, y, 'font-size': 28, 'font-weight': 650, fill: 'var(--text)', text: m.label }, gMeters);
    s('rect', { x: 820, y: y + 16, width: 760, height: 18, rx: 9, fill: 'var(--surface-2)' }, gMeters);
    const bar = s('rect', { x: 820, y: y + 16, width: 0, height: 18, rx: 9, fill: m.col }, gMeters);
    return { ...m, bar };
  });
  s('text', { x: 1580, y: 476, 'text-anchor': 'end', 'font-size': 20, fill: 'var(--text-3)', text: 'schematic trends' }, gMeters);

  // outcome panel (after rupture)
  const out = s('g', { opacity: 0 }, svg);
  const chip = (x, y, w, title, sub, col) => {
    s('rect', { x, y, width: w, height: 104, rx: 22, fill: 'var(--surface)', stroke: 'var(--line)' }, out);
    s('circle', { cx: x + 34, cy: y + 36, r: 10, fill: col }, out);
    s('text', { x: x + 56, y: y + 45, 'font-size': 28, 'font-weight': 700, fill: 'var(--text)', text: title }, out);
    s('text', { x: x + 30, y: y + 82, 'font-size': 23, fill: 'var(--text-2)', text: sub }, out);
  };
  chip(40, 470, 600, 'Hemoglobin phagocytized', 'Kupffer cells · spleen and marrow macrophages', '#b48cff');

  // live caption under the day counter
  const status = s('text', { x: 820, y: 500, 'font-size': 30, 'font-weight': 600, fill: 'var(--text-2)' }, svg);

  // scrubber
  const sc = scrubber(h('div', { style: 'position:absolute; left:0; right:0; bottom:0; height:90px' }, box), {
    ticks: ['Day 0', '30', '60', '90', '120'],
    onInput: (v, user) => { if (user) { day = v * 120; target = day; auto = false; } },
  });

  const outro = h('div', { style: 'position:absolute; left:820px; right:0; top:200px; display:grid; gap:22px; opacity:0; transition:opacity .8s' }, box);
  outro.innerHTML = `
    <div class="t-h2" style="font-size:44px">Recycled</div>
    <ul class="pts sm"><li><span class="c-iron">Iron</span> → marrow or ferritin</li><li><span class="c-bili">Porphyrin</span> → bilirubin → bile</li></ul>`;

  let day = 0, target = 0, auto = true, step = 0, time = 0, burst = 0;

  function shape(age, t) {
    const flex = 1 - age;
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const rr = RAD * (1 + flex * (0.07 * Math.sin(2 * a + t * 2.2) + 0.04 * Math.sin(3 * a - t * 1.7)) + age * 0.012 * Math.sin(7 * a));
      pts.push(`${(CX + Math.cos(a) * rr * (1 + flex * 0.06 * Math.sin(t * 1.4))).toFixed(1)},${(CY + Math.sin(a) * rr * (1 - flex * 0.06 * Math.sin(t * 1.4))).toFixed(1)}`);
    }
    return `M ${pts.join(' L ')} Z`;
  }

  return {
    steps: 3,
    enter() { day = 0; target = 0; auto = true; burst = 0; },
    step(n) {
      step = n; auto = true;
      target = [0, 100, 120, 120][n];
      if (n < 2) burst = 0;
    },
    frame(_, dt) {
      time += dt;
      if (auto) day = day < target ? Math.min(target, day + dt * 34) : Math.max(target, day - dt * 60);
      if (!sc.isDragging()) sc.set(day / 120);
      const age = clamp(day / 120);
      dayT.textContent = day >= 119.5 ? 'Day 120' : `Day ${Math.round(day)}`;
      daySub.textContent = day < 20 ? 'Young and flexible' : day < 90 ? 'Ageing' : day < 119.5 ? 'Old and fragile' : 'Ruptured, then recycled';
      meters.forEach((m) => m.bar.setAttribute('width', (760 * clamp(m.f(day))).toFixed(1)));
      st0.setAttribute('stop-color', mix('#f39aa6', '#a85a6c', age));
      st1.setAttribute('stop-color', mix('#d8274a', '#86243c', age));
      st2.setAttribute('stop-color', mix('#9e0b25', '#4f0f20', age));
      membrane.setAttribute('stroke-dasharray', age > 0.7 ? `${(30 - age * 18).toFixed(0)} ${(age * 14).toFixed(0)}` : 'none');
      status.textContent = day >= 119.5 ? '' : day > 95 ? 'Fragile: ruptures in the spleen' : '';

      const broken = day >= 119.5;
      burst = damp(burst, broken ? 1 : 0, broken ? 2.2 : 8, dt);
      const d = shape(age, time);
      cell.setAttribute('d', d);
      membrane.setAttribute('d', d);
      const alive = 1 - clamp(burst * 3);
      [cell, membrane, pallor].forEach((e) => e.setAttribute('opacity', (e === pallor ? 0.12 : e === membrane ? 0.5 : 1) * alive));
      frags.forEach((f) => {
        const dist = burst * f.sp;
        const x = CX + Math.cos(f.a) * dist * 1.4, y = CY + Math.sin(f.a) * dist;
        if (f.mem) f.el.setAttribute('d', `M ${x} ${y} a 22 22 0 0 1 ${Math.cos(f.rot) * 30} ${Math.sin(f.rot) * 30}`);
        else { f.el.setAttribute('cx', x); f.el.setAttribute('cy', y); }
      });
      gFrag.setAttribute('opacity', (broken ? clamp(burst * 3) * (step >= 3 ? 0.35 : 1) : 0).toFixed(3));
      out.setAttribute('opacity', (step >= 3 && broken ? 1 : 0).toString());
      outro.style.opacity = step >= 3 && broken ? 1 : 0;
      gMeters.setAttribute('opacity', step >= 3 && broken ? 0 : 1);
      gMeters.style.transition = 'opacity .6s';
    },
  };
}
