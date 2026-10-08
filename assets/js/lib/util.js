// Small shared helpers for slide modules.

export const SVGNS = 'http://www.w3.org/2000/svg';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const TAU = Math.PI * 2;

export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Seeded RNG so diagrams look identical every run.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create an SVG element. */
export function s(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  if (parent) parent.appendChild(el);
  return el;
}

/** Create an HTML element. */
export function h(tag, attrs = {}, parent) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  if (parent) parent.appendChild(el);
  return el;
}

/** Root SVG with a fixed viewBox that fills its container. */
export function svgRoot(container, w, h, extra = {}) {
  return s('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet', ...extra }, container);
}

/** Read a CSS custom property from :root. */
export function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** A canvas that tracks its container size and the stage scale for crisp drawing. */
export function makeCanvas(container, api, cls = '') {
  const cv = h('canvas', { class: cls }, container);
  const ctx = cv.getContext('2d');
  const state = { w: 0, h: 0, pr: 1, cv, ctx };
  const resize = () => {
    const w = container.clientWidth, hgt = container.clientHeight;
    const pr = Math.min(2.5, (api.scale || 1) * Math.min(window.devicePixelRatio || 1, 2));
    state.w = w; state.h = hgt; state.pr = pr;
    cv.width = Math.max(1, Math.round(w * pr));
    cv.height = Math.max(1, Math.round(hgt * pr));
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
  };
  api.onResize(resize);
  resize();
  state.resize = resize;
  return state;
}

/** Segmented control (Apple-style). Returns {el, set(i), get()}. */
export function segmented(parent, labels, onChange, initial = 0) {
  const el = h('div', { class: 'seg' }, parent);
  const thumb = h('div', { class: 'thumb' }, el);
  const btns = labels.map((l, i) => {
    const b = h('button', { type: 'button', html: l }, el);
    b.addEventListener('click', () => set(i, true));
    return b;
  });
  let cur = -1;
  function place() {
    const b = btns[cur];
    if (!b) return;
    thumb.style.left = b.offsetLeft + 'px';
    thumb.style.width = b.offsetWidth + 'px';
  }
  function set(i, user = false) {
    if (i === cur) return;
    cur = i;
    btns.forEach((b, k) => b.classList.toggle('on', k === i));
    place();
    if (onChange) onChange(i, user);
  }
  set(initial);
  requestAnimationFrame(place);
  document.fonts?.ready?.then(place);
  return { el, set, get: () => cur, place, btns };
}

/** Draggable scrubber 0..1. */
export function scrubber(parent, { ticks = [], onInput } = {}) {
  const el = h('div', { class: 'scrub no-swipe' }, parent);
  h('div', { class: 'track' }, el);
  const fill = h('div', { class: 'fill' }, el);
  const knob = h('div', { class: 'knob' }, el);
  const tk = h('div', { class: 'ticks' }, el);
  ticks.forEach((t) => h('span', { text: t }, tk));
  let v = 0;
  let dragging = false;
  function set(x, user = false) {
    v = clamp(x);
    fill.style.width = `${v * 100}%`;
    knob.style.left = `${v * 100}%`;
    if (onInput) onInput(v, user);
  }
  function fromEvent(e) {
    const r = el.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  }
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    set(fromEvent(e), true);
  });
  el.addEventListener('pointermove', (e) => { if (dragging) set(fromEvent(e), true); });
  el.addEventListener('pointerup', () => (dragging = false));
  el.addEventListener('pointercancel', () => (dragging = false));
  set(0);
  return { el, set, get: () => v, isDragging: () => dragging };
}

/**
 * Particles flowing along an SVG path.
 * Particles fade in/out at path ends, so loops read as continuous streams.
 * opts.symbol (href) + opts.r draws symbols instead of circles.
 */
export class PathFlow {
  constructor(path, layer, opts = {}) {
    this.path = path;
    this.len = path.getTotalLength();
    this.o = Object.assign({ count: 8, speed: 140, r: 7, fill: '#fff', fade: 0.08, opacity: 1, symbol: null, stroke: null, jitter: 0 }, opts);
    this.g = s('g', {}, layer);
    this.items = [];
    for (let i = 0; i < this.o.count; i++) {
      const c = this.o.symbol
        ? s('use', { href: this.o.symbol, width: this.o.r * 2, height: this.o.r * 2 }, this.g)
        : s('circle', { r: this.o.r, fill: this.o.fill }, this.g);
      if (this.o.stroke) c.setAttribute('stroke', this.o.stroke);
      c._j = (Math.random() - 0.5) * 2 * this.o.jitter;
      this.items.push(c);
    }
    this.offset = Math.random() * this.len;
    this.speed = this.o.speed;
    this.alpha = 1;
    this.targetAlpha = 1;
    this.frame(0);
  }
  setSpeed(v) { this.speed = v; }
  setVisible(v, instant = false) { this.targetAlpha = v ? 1 : 0; if (instant) this.alpha = this.targetAlpha; }
  setColor(c) { this.items.forEach((it) => it.setAttribute('fill', c)); }
  setCount(n) { this.items.forEach((it, i) => (it.style.display = i < n ? '' : 'none')); }
  frame(dt) {
    this.alpha = damp(this.alpha, this.targetAlpha, 6, dt);
    this.g.style.opacity = this.alpha.toFixed(3);
    if (this.alpha < 0.01 && this.targetAlpha === 0) return;
    this.offset = (this.offset + this.speed * dt) % this.len;
    if (this.offset < 0) this.offset += this.len;
    const n = this.items.length;
    const r = this.o.r;
    for (let i = 0; i < n; i++) {
      const it = this.items[i];
      const d = (this.offset + (i * this.len) / n) % this.len;
      const p = this.path.getPointAtLength(d);
      const u = d / this.len;
      const f = this.o.fade;
      const a = f > 0 ? Math.min(1, u / f, (1 - u) / f) : 1;
      const x = p.x, y = p.y + it._j;
      if (this.o.symbol) {
        it.setAttribute('x', (x - r).toFixed(1));
        it.setAttribute('y', (y - r).toFixed(1));
      } else {
        it.setAttribute('cx', x.toFixed(1));
        it.setAttribute('cy', y.toFixed(1));
      }
      it.setAttribute('opacity', (a * this.o.opacity).toFixed(3));
    }
  }
}

/** Animate a path being drawn: returns setter(t ∈ 0..1). */
export function drawable(path) {
  const L = path.getTotalLength();
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = L;
  return (t) => { path.style.strokeDashoffset = (L * (1 - clamp(t))).toFixed(1); };
}

/** Simple time-based tween list driven by frame(dt). */
export class Tweens {
  constructor() { this.list = []; }
  add(dur, fn, { delay = 0, easing = ease.inOutCubic, done } = {}) {
    const tw = { t: -delay, dur, fn, easing, done };
    this.list.push(tw);
    return tw;
  }
  clear() { this.list.length = 0; }
  frame(dt) {
    for (const tw of this.list) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = clamp(tw.t / tw.dur);
      tw.fn(tw.easing(k));
      if (k >= 1) tw.finished = true;
    }
    const fin = this.list.filter((x) => x.finished);
    this.list = this.list.filter((x) => !x.finished);
    fin.forEach((x) => x.done && x.done());
  }
}
