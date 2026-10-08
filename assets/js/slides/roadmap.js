// The hub: each tile opens its point; footer links open the case,
// conclusion and sources. Presented points are ticked by the deck.
export default function setup(slide, api) {
  slide.querySelectorAll('[data-goto]').forEach((b) => {
    b.addEventListener('click', () => api.gotoId(b.dataset.goto));
  });
  return {};
}
