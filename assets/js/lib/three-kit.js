// Shared Three.js helpers: renderer per slide, environment lighting,
// red-cell geometry (Evans–Fung biconcave profile), morphable cell shapes,
// projected HTML labels, drag-to-rotate and a damped camera rig.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/BufferGeometryUtils.js';
import { h, damp, clamp } from './util.js';

export { THREE };

export function stage3D(container, api, { fov = 32, exposure = 1.0, envBlur = 0.04 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), envBlur).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 400);
  const size = { w: 1, h: 1 };
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const hh = Math.max(1, container.clientHeight);
    size.w = w; size.h = hh;
    const pr = Math.min(2.25, (api.scale || 1) * Math.min(window.devicePixelRatio || 1, 2));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    camera.updateProjectionMatrix();
  };
  api.onResize(resize);
  resize();
  return { renderer, scene, camera, size, resize, render: () => renderer.render(scene, camera) };
}

export function addLights(scene, { key = 2.2, rim = 1.6, fill = 0.35, rimColor = 0xff8fa0 } = {}) {
  const k = new THREE.DirectionalLight(0xffffff, key);
  k.position.set(-6, 9, 8);
  scene.add(k);
  const r = new THREE.DirectionalLight(rimColor, rim);
  r.position.set(8, -2, -6);
  scene.add(r);
  const a = new THREE.HemisphereLight(0xffffff, 0x220008, fill);
  scene.add(a);
  return { key: k, rim: r, amb: a };
}

// ------------------------------------------------------------------ cell shapes
// Parametric grid with single pole vertices: s ∈ [0,1] runs from the top pole
// (0) through the rim (0.5) to the bottom pole (1); phi ∈ [0, 2π).
export function cellGrid(nS = 72, nPhi = 112) {
  const rings = nS - 1;
  const count = 2 + rings * nPhi;
  const params = new Float32Array(count * 2);
  params[0] = 0; params[1] = 0;
  let v = 1;
  for (let i = 1; i <= rings; i++) {
    const sv = i / nS;
    for (let j = 0; j < nPhi; j++) {
      params[v * 2] = sv;
      params[v * 2 + 1] = (j / nPhi) * Math.PI * 2;
      v++;
    }
  }
  params[v * 2] = 1; params[v * 2 + 1] = 0;
  const bottom = v;
  const idx = [];
  const ring = (i, j) => 1 + (i - 1) * nPhi + (((j % nPhi) + nPhi) % nPhi);
  for (let j = 0; j < nPhi; j++) idx.push(0, ring(1, j + 1), ring(1, j));
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < nPhi; j++) {
      const a = ring(i, j), b = ring(i, j + 1), c = ring(i + 1, j), d = ring(i + 1, j + 1);
      idx.push(a, b, c, b, d, c);
    }
  }
  for (let j = 0; j < nPhi; j++) idx.push(bottom, ring(rings, j), ring(rings, j + 1));
  return { params, index: idx, count };
}

// Evans–Fung thickness profile (µm): T(u) = √(1−u)·(a0 + a1·u + a2·u²), u = (r/R)².
// Defaults give ~7.8 µm diameter, ~2.5 µm max thickness and ~0.8 µm centre,
// matching Guyton's description of the normal red cell.
export function discShape({ R = 3.91, a0 = 0.81, a1 = 7.83, a2 = -4.39, sx = 1, sz = 1, ty = 1, wob = 0 } = {}) {
  return (sv, phi, out) => {
    const top = sv <= 0.5;
    const th = (top ? sv : 1 - sv) * Math.PI;
    const rn = Math.sin(th);
    const u = rn * rn;
    const T = Math.sqrt(Math.max(0, 1 - u)) * (a0 + a1 * u + a2 * u * u) * ty;
    const w = 1 + wob * Math.sin(phi * 3 + 0.7) * rn;
    out[0] = rn * R * Math.cos(phi) * sx * w;
    out[1] = (top ? 0.5 : -0.5) * T;
    out[2] = rn * R * Math.sin(phi) * sz * w;
    return T;
  };
}

export function sphereShape({ R = 2.6, squash = 1 } = {}) {
  return (sv, phi, out) => {
    const th = sv * Math.PI;
    out[0] = R * Math.sin(th) * Math.cos(phi);
    out[1] = R * Math.cos(th) * squash;
    out[2] = R * Math.sin(th) * Math.sin(phi);
    return 2.6; // treat as "thick" everywhere → no central pallor
  };
}

// Sickle: an elongated, tapered, thin body bent along an arc.
export function sickleShape({ L = 6.2, W = 1.35, Rb = 5.4, thick = 1.0 } = {}) {
  return (sv, phi, out) => {
    const top = sv <= 0.5;
    const th = (top ? sv : 1 - sv) * Math.PI;
    const rn = Math.sin(th);
    const x0 = rn * Math.cos(phi);
    const z0 = rn * Math.sin(phi);
    const taper = Math.pow(Math.max(0, 1 - x0 * x0), 0.55);
    const X = x0 * L;
    const Zw = z0 * W * taper;
    const T = Math.sqrt(Math.max(0, 1 - rn * rn)) * thick * (0.35 + 0.65 * taper);
    const a = X / Rb;
    out[0] = (Rb + Zw) * Math.sin(a);
    out[2] = Rb - (Rb + Zw) * Math.cos(a) - 1.6;
    out[1] = (top ? 0.5 : -0.5) * T * 2;
    return 2.4;
  };
}

/** Build positions + thickness arrays for a shape on a grid. */
export function evalShape(grid, fn) {
  const pos = new Float32Array(grid.count * 3);
  const thick = new Float32Array(grid.count);
  const tmp = [0, 0, 0];
  for (let v = 0; v < grid.count; v++) {
    const T = fn(grid.params[v * 2], grid.params[v * 2 + 1], tmp);
    pos[v * 3] = tmp[0]; pos[v * 3 + 1] = tmp[1]; pos[v * 3 + 2] = tmp[2];
    thick[v] = T;
  }
  return { pos, thick };
}

/** Vertex colours: thin centre → pale (central pallor), thick rim → deep red. */
export function colorsFor(thick, { pale = '#f08a96', deep = '#c8102e', lo = 0.7, hi = 2.0 } = {}) {
  const c1 = new THREE.Color(pale), c2 = new THREE.Color(deep), c = new THREE.Color();
  const out = new Float32Array(thick.length * 3);
  for (let i = 0; i < thick.length; i++) {
    let t = clamp((thick[i] - lo) / (hi - lo));
    t = t * t * (3 - 2 * t);
    c.lerpColors(c1, c2, t);
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
  return out;
}

export function cellGeometry(grid, shape, colorOpts) {
  const geo = new THREE.BufferGeometry();
  const { pos, thick } = evalShape(grid, shape);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colorsFor(thick, colorOpts), 3));
  geo.setIndex(grid.index);
  geo.computeVertexNormals();
  return geo;
}

export function rbcMaterial(extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    sheen: 0.6,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#ff3d5c'),
    envMapIntensity: 0.75,
    ...extra,
  });
}

export function normalRBC(grid = cellGrid(48, 80)) {
  return cellGeometry(grid, discShape(), { pale: '#e2566a', deep: '#a80a24', lo: 0.8, hi: 2.1 });
}

/** Morphing cell: holds several targets with the same topology and blends between them. */
export class MorphCell {
  constructor(grid, targets) {
    this.grid = grid;
    this.targets = targets; // [{pos, col}]
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(targets[0].pos);
    this.col = new Float32Array(targets[0].col);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setIndex(grid.index);
    this.geo.computeVertexNormals();
    this.from = 0; this.to = 0; this.t = 1;
  }
  go(i) {
    if (i === this.to && this.t >= 1) return;
    this.fromPos = new Float32Array(this.pos);
    this.fromCol = new Float32Array(this.col);
    this.to = i; this.t = 0;
  }
  frame(dt, speed = 1.4) {
    if (this.t >= 1) return false;
    this.t = Math.min(1, this.t + dt * speed);
    const k = this.t < 0.5 ? 4 * this.t ** 3 : 1 - Math.pow(-2 * this.t + 2, 3) / 2;
    const tp = this.targets[this.to];
    for (let i = 0; i < this.pos.length; i++) this.pos[i] = this.fromPos[i] + (tp.pos[i] - this.fromPos[i]) * k;
    for (let i = 0; i < this.col.length; i++) this.col[i] = this.fromCol[i] + (tp.col[i] - this.fromCol[i]) * k;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeVertexNormals();
    return true;
  }
}

/** Smooth organic blob (cells, proteins). */
export function blobGeometry(radius, detail = 5, amp = 0.12, seed = 1, hf = 0.15) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 3.7 + seed * 1.3) * Math.sin(v.z * 2.9 + seed * 0.7)
      + hf * Math.sin(v.x * 7 + seed * 2) * Math.sin(v.y * 6 + 1) * Math.sin(v.z * 8 + seed);
    v.multiplyScalar(radius * (1 + amp * n));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ labels
export class Labels3D {
  constructor(container, camera) {
    this.root = h('div', { class: 'labels3d' }, container);
    this.camera = camera;
    this.items = [];
    this.v = new THREE.Vector3();
  }
  add(text, color, target, { dx = 0, dy = 0 } = {}) {
    const el = h('div', { class: 'lab3d' }, this.root);
    el.innerHTML = `<span class="pill">${color ? `<i style="background:${color}"></i>` : ''}${text}</span>`;
    const it = { el, target, dx, dy, on: false };
    this.items.push(it);
    return it;
  }
  show(it, on) { it.on = on; it.el.classList.toggle('on', on); }
  hideAll() { this.items.forEach((it) => this.show(it, false)); }
  update(w, hh) {
    for (const it of this.items) {
      if (!it.on) continue;
      const t = it.target;
      if (t.isObject3D) t.getWorldPosition(this.v);
      else this.v.copy(t);
      this.v.project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * w + it.dx;
      const y = (-this.v.y * 0.5 + 0.5) * hh + it.dy;
      it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
}

// ------------------------------------------------------------------ interaction
export function dragRotate(dom, obj, { speed = 0.006, minX = -0.9, maxX = 0.9, auto = 0.12 } = {}) {
  const st = { vx: 0, vy: 0, drag: false, lx: 0, ly: 0, idle: 10, auto, baseX: obj.rotation.x };
  dom.style.touchAction = 'none';
  dom.style.cursor = 'grab';
  dom.classList.add('no-swipe');
  dom.addEventListener('pointerdown', (e) => {
    st.drag = true; st.lx = e.clientX; st.ly = e.clientY; st.idle = 0;
    dom.setPointerCapture(e.pointerId);
    dom.style.cursor = 'grabbing';
  });
  dom.addEventListener('pointermove', (e) => {
    if (!st.drag) return;
    const dx = e.clientX - st.lx, dy = e.clientY - st.ly;
    st.lx = e.clientX; st.ly = e.clientY;
    st.vy = dx * speed; st.vx = dy * speed;
    obj.rotation.y += st.vy;
    obj.rotation.x = clamp(obj.rotation.x + st.vx, minX, maxX);
  });
  const up = () => { st.drag = false; dom.style.cursor = 'grab'; };
  dom.addEventListener('pointerup', up);
  dom.addEventListener('pointercancel', up);
  st.frame = (dt) => {
    st.idle += dt;
    if (!st.drag) {
      st.vy *= Math.pow(0.04, dt); st.vx *= Math.pow(0.04, dt);
      obj.rotation.y += st.vy;
      obj.rotation.x = clamp(obj.rotation.x + st.vx, minX, maxX);
      if (st.idle > 2.5 && st.auto) obj.rotation.y += st.auto * dt * Math.min(1, (st.idle - 2.5) / 2);
    }
  };
  st.reset = (rx = st.baseX, ry = 0) => { st.resetTo = { rx, ry }; };
  return st;
}

export class CamRig {
  constructor(camera, pos, look) {
    this.camera = camera;
    this.pos = pos.clone(); this.look = look.clone();
    this.tPos = pos.clone(); this.tLook = look.clone();
    camera.position.copy(pos); camera.lookAt(look);
  }
  set(pos, look) { this.tPos.copy(pos); this.tLook.copy(look); }
  jump(pos, look) { this.set(pos, look); this.pos.copy(pos); this.look.copy(look); }
  frame(dt, lambda = 2.4) {
    const k = 1 - Math.exp(-lambda * dt);
    this.pos.lerp(this.tPos, k);
    this.look.lerp(this.tLook, k);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}

export { damp };
