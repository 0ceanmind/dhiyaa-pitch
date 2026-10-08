// The patient's CBC: values count up on entry; each build step spotlights the
// tiles behind one interpretation.
export default function setup(slide, api) {
  const tiles = [...slide.querySelectorAll('.tiles .tile')];
  const groups = { 1: ['hb', 'hct'], 2: ['mcv'], 3: ['mch', 'mchc'], 4: ['rdw'] };
  const vals = tiles.map((t) => {
    const v = t.querySelector('.v');
    return { el: v, target: parseFloat(v.textContent), dec: v.textContent.includes('.') ? 1 : 0 };
  });
  let t0 = -1;

  return {
    enter() { t0 = performance.now(); vals.forEach((v) => (v.el.textContent = (0).toFixed(v.dec))); },
    step(n) {
      const on = groups[n] || [];
      tiles.forEach((t) => {
        const k = t.dataset.k;
        t.classList.toggle('hl', on.includes(k));
        t.classList.toggle('lo', n >= 1 && n <= 4 && !on.includes(k));
      });
    },
    frame() {
      if (t0 < 0) return;
      const u = Math.min(1, (performance.now() - t0 - 500) / 1400);
      if (u < 0) return;
      const e = 1 - Math.pow(1 - u, 3);
      vals.forEach((v) => (v.el.textContent = (v.target * e).toFixed(v.dec)));
      if (u >= 1) t0 = -1;
    },
  };
}
