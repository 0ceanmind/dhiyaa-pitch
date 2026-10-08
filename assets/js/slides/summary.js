// Key-points slide at the end of each point: marks the point as presented
// and offers a way back to the hub.
export default function setup(slide, api) {
  const n = slide.dataset.slo;
  slide.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => api.gotoId(b.dataset.goto)));
  return {
    enter() { api.deck.markDone(n); },
  };
}
