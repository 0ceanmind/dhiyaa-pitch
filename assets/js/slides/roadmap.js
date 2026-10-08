// Roadmap tiles jump to their section.
export default function setup(slide, api) {
  slide.querySelectorAll('[data-goto]').forEach((b) => {
    b.addEventListener('click', () => api.gotoId(b.dataset.goto));
  });
  return {};
}
