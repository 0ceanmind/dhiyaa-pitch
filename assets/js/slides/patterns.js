// RDW + MCV patterns: the patient's row lights up.
export default function setup(slide) {
  const rows = [...slide.querySelectorAll('tbody tr')];
  return {
    step(n) { rows.forEach((r, i) => r.classList.toggle('hl', n >= 1 && i === 0)); },
  };
}
