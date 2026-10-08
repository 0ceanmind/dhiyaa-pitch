// Iron studies: four markers, each with a small schematic.
import { h } from '../lib/util.js';

const FE = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffae2e"/>`;
const TF = (x, y, l, rr) => `
  <g transform="translate(${x} ${y})">
    <ellipse cx="-12" cy="0" rx="14" ry="18" fill="${l > 0 ? '#ffae2e' : 'none'}" stroke="rgba(255,190,110,.85)" stroke-width="3"/>
    <ellipse cx="12" cy="0" rx="14" ry="18" fill="${l > 1 ? '#ffae2e' : 'none'}" stroke="rgba(255,190,110,.85)" stroke-width="3"/>
  </g>`;

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const wrap = h('div', { style: 'display:grid; grid-template-columns:repeat(4,1fr); gap:24px; height:100%' }, box);

  const cards = [
    {
      k: 'Ferritin', dir: '↓', col: 'var(--bad)', mean: 'Iron stores depleted',
      svg: `<circle cx="120" cy="110" r="78" fill="none" stroke="rgba(255,159,10,.65)" stroke-width="4" stroke-dasharray="8 8"/>${FE(104, 120)}${FE(132, 98)}`,
    },
    {
      k: 'Serum iron', dir: '↓', col: 'var(--bad)', mean: 'Less iron in the plasma',
      svg: `<path d="M120 26 C 160 80, 190 118, 190 150 a70 70 0 0 1 -140 0 C 50 118, 80 80, 120 26Z" fill="rgba(255,200,170,.12)" stroke="rgba(255,200,170,.55)" stroke-width="3"/>${FE(104, 150)}${FE(140, 168)}`,
    },
    {
      k: 'TIBC', dir: '↑', col: 'var(--iron)', mean: 'More unfilled iron-binding capacity on transferrin',
      svg: [[60, 50], [120, 50], [180, 50], [60, 110], [120, 110], [180, 110], [60, 170], [120, 170], [180, 170]].map(([x, y], i) => TF(x, y, i === 4 ? 1 : 0)).join(''),
    },
    {
      k: 'Transferrin saturation', dir: '↓', col: 'var(--bad)', mean: 'Few binding sites actually carry iron',
      svg: `<circle cx="120" cy="110" r="74" fill="none" stroke="var(--surface-3)" stroke-width="26"/>
            <circle cx="120" cy="110" r="74" fill="none" stroke="#ffae2e" stroke-width="26" stroke-dasharray="${0.1 * 2 * Math.PI * 74} ${2 * Math.PI * 74}" transform="rotate(-90 120 110)" stroke-linecap="round"/>`,
    },
  ].map((c, i) => {
    const el = h('div', { class: 'card', 'data-step': String(i === 0 ? 0 : i), style: 'display:flex; flex-direction:column; gap:14px; padding:34px 32px' }, wrap);
    if (i === 0) el.removeAttribute('data-step');
    el.innerHTML = `
      <svg viewBox="0 0 240 220" style="width:100%; height:240px">${c.svg}</svg>
      <div style="display:flex; align-items:baseline; justify-content:space-between; gap:12px">
        <span style="font-size:36px; font-weight:750; letter-spacing:-.02em; line-height:1.1">${c.k}</span>
        <span style="font-size:64px; font-weight:800; color:${c.col}; line-height:1">${c.dir}</span>
      </div>
      <p class="t-body" style="font-size:29px">${c.mean}</p>`;
    return el;
  });

  const banner = h('div', { 'data-step': '4', style: 'position:absolute; left:0; right:0; bottom:6px; padding:26px 36px; border-radius:26px; background:linear-gradient(100deg, color-mix(in srgb, var(--blood) 28%, transparent), color-mix(in srgb, var(--iron) 16%, transparent))' }, box);
  banner.innerHTML = '<p class="t-h2" style="font-size:44px">Depleted iron stores and reduced iron available for red-cell production.</p>';
  box.style.paddingBottom = '150px';
  return { steps: 4 };
}
