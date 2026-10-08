// Where red marrow lives: child vs adult (Guyton & Hall, Ch. 33).
import { s, svgRoot, segmented } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const svg = svgRoot(box, 820, 1010);
  const g = s('g', { transform: 'translate(130 0)' }, svg);

  const RED = 'var(--blood)';
  const YEL = 'var(--fat)';
  const bones = []; // {el, adultRed}

  const line = (d, w, adultRed, parent = g) => {
    const el = s('path', { d, fill: 'none', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
    el.style.transition = 'stroke 0.9s cubic-bezier(.2,.8,.2,1)';
    bones.push({ el, adultRed, prop: 'stroke' });
    return el;
  };
  const shape = (tag, attrs, adultRed) => {
    const el = s(tag, { ...attrs, stroke: 'var(--bg)', 'stroke-width': 3 }, g);
    el.style.transition = 'fill 0.9s cubic-bezier(.2,.8,.2,1)';
    bones.push({ el, adultRed, prop: 'fill' });
    return el;
  };

  const X = 250;
  // skull
  shape('ellipse', { cx: X, cy: 78, rx: 56, ry: 66 }, true);
  shape('path', { d: `M ${X - 34} 128 Q ${X} 168 ${X + 34} 128 L ${X + 26} 150 Q ${X} 178 ${X - 26} 150 Z` }, true);
  // clavicles
  line(`M ${X + 14} 196 Q ${X + 60} 182 ${X + 104} 188`, 11, false);
  line(`M ${X - 14} 196 Q ${X - 60} 182 ${X - 104} 188`, 11, false);
  // ribs
  for (let i = 0; i < 10; i++) {
    const y = 214 + i * 17;
    const spread = 70 + Math.sin((i / 9) * Math.PI) * 26 - i * 1.5;
    line(`M ${X + 12} ${y} C ${X + spread} ${y - 12}, ${X + spread + 22} ${y + 20}, ${X + spread - 4} ${y + 42}`, 8, true);
    line(`M ${X - 12} ${y} C ${X - spread} ${y - 12}, ${X - spread - 22} ${y + 20}, ${X - spread + 4} ${y + 42}`, 8, true);
  }
  // vertebral column
  for (let i = 0; i < 20; i++) {
    const y = 176 + i * 16.5;
    shape('rect', { x: X - 15, y, width: 30, height: 13, rx: 5 }, true);
  }
  // sternum (drawn over the column)
  shape('path', { d: `M ${X - 13} 204 L ${X + 13} 204 L ${X + 10} 330 Q ${X} 346 ${X - 10} 330 Z` }, true);
  // pelvis: ilia + sacrum
  shape('path', { d: `M ${X - 18} 520 C ${X - 70} 500, ${X - 132} 488, ${X - 128} 540 C ${X - 124} 580, ${X - 86} 600, ${X - 52} 610 C ${X - 40} 590, ${X - 26} 570, ${X - 18} 556 Z` }, true);
  shape('path', { d: `M ${X + 18} 520 C ${X + 70} 500, ${X + 132} 488, ${X + 128} 540 C ${X + 124} 580, ${X + 86} 600, ${X + 52} 610 C ${X + 40} 590, ${X + 26} 570, ${X + 18} 556 Z` }, true);
  shape('path', { d: `M ${X - 16} 512 L ${X + 16} 512 L ${X + 10} 586 Q ${X} 598 ${X - 10} 586 Z` }, true);

  // arms: humerus split proximal / distal
  [-1, 1].forEach((sd) => {
    const sx = X + sd * 112;
    line(`M ${sx} 200 L ${sx + sd * 10} 280`, 22, true);          // proximal humerus
    line(`M ${sx + sd * 10} 280 L ${sx + sd * 22} 380`, 22, false); // distal humerus
    line(`M ${sx + sd * 24} 396 L ${sx + sd * 40} 540`, 11, false); // radius
    line(`M ${sx + sd * 12} 398 L ${sx + sd * 26} 542`, 11, false); // ulna
    line(`M ${sx + sd * 34} 560 l ${sd * 8} 46`, 9, false);
    line(`M ${sx + sd * 26} 562 l ${sd * 2} 50`, 9, false);
    line(`M ${sx + sd * 42} 556 l ${sd * 14} 40`, 9, false);
  });
  // legs: femur (fatty in adults), tibia split proximal / distal, fibula
  [-1, 1].forEach((sd) => {
    const hx = X + sd * 64;
    line(`M ${hx} 616 L ${hx - sd * 6} 790`, 26, false);                 // femur
    line(`M ${hx - sd * 8} 820 L ${hx - sd * 8} 880`, 22, true);         // proximal tibia
    line(`M ${hx - sd * 8} 880 L ${hx - sd * 6} 966`, 22, false);        // distal tibia
    line(`M ${hx + sd * 16} 826 L ${hx + sd * 18} 962`, 9, false);       // fibula
    line(`M ${hx - sd * 6} 986 l ${sd * 34} 4`, 12, false);              // foot
  });

  // legend
  const lg = s('g', { transform: 'translate(540 420)' }, svg);
  [['Red marrow', RED, 'active hematopoiesis'], ['Yellow marrow', YEL, 'mostly adipose tissue']].forEach(([t, c, sub], i) => {
    const y = i * 130;
    s('circle', { cx: 0, cy: y - 12, r: 18, fill: c }, lg);
    s('text', { x: 34, y: y, 'font-size': 40, 'font-weight': 700, fill: 'var(--text)', text: t }, lg);
    s('text', { x: 34, y: y + 42, 'font-size': 30, fill: 'var(--text-3)', text: sub }, lg);
  });

  function paint(adult) {
    bones.forEach((b) => {
      const col = adult && !b.adultRed ? YEL : RED;
      b.el.style[b.prop] = col;
      if (b.prop === 'stroke') b.el.setAttribute('stroke', col);
      else b.el.setAttribute('fill', col);
    });
  }

  const holder = slide.querySelector('[data-seg]');
  const seg = segmented(holder, ['Age 5', 'Adult (20 y +)'], (i, user) => {
    paint(i === 1);
    if (user) api.setStep(i);
  });

  return {
    steps: 1,
    enter() { paint(false); seg.set(0); },
    step(n) { seg.set(n); paint(n === 1); },
  };
}
