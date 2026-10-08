import { Deck } from './deck.js';

const registry = {
  hero: () => import('./slides/hero.js'),
  case: () => import('./slides/case.js'),
  roadmap: () => import('./slides/roadmap.js'),
  hematopoiesis: () => import('./slides/hematopoiesis.js'),
  marrow: () => import('./slides/marrow.js'),
  skeleton: () => import('./slides/skeleton.js'),
  lobule: () => import('./slides/lobule.js'),
  spleen: () => import('./slides/spleen.js'),
  slit: () => import('./slides/slit.js'),
  macrophage: () => import('./slides/macrophage.js'),
  liverrole: () => import('./slides/liverrole.js'),
  leak: () => import('./slides/leak.js'),
  erythro: () => import('./slides/erythro.js'),
  epo: () => import('./slides/epo.js'),
  lifespan: () => import('./slides/lifespan.js'),
  anemia: () => import('./slides/anemia.js'),
  polycythemia: () => import('./slides/polycythemia.js'),
  viscosity: () => import('./slides/viscosity.js'),
  hct: () => import('./slides/hct.js'),
  indices: () => import('./slides/indices.js'),
  rdw: () => import('./slides/rdw.js'),
  cbc: () => import('./slides/cbc.js'),
  patterns: () => import('./slides/patterns.js'),
  absorption: () => import('./slides/absorption.js'),
  budget: () => import('./slides/budget.js'),
  heme: () => import('./slides/heme.js'),
  hemoglobin: () => import('./slides/hemoglobin.js'),
  studies: () => import('./slides/studies.js'),
  summary: () => import('./slides/summary.js'),
};

const deck = new Deck({
  viewport: document.getElementById('viewport'),
  stage: document.getElementById('stage'),
  registry,
});

deck.start();
window.__deck = deck;
