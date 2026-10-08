// Types of anemia: one 3D red cell morphs between shapes. A faint ring marks
// the normal 7.8 µm diameter so size changes read at a glance.
import { THREE, stage3D, addLights, cellGrid, evalShape, colorsFor, discShape, sphereShape, sickleShape, MorphCell, rbcMaterial, dragRotate } from '../lib/three-kit.js';
import { h, damp } from '../lib/util.js';

const TYPES = [
  { name: 'Blood loss: acute', shape: 'normal', desc: 'Plasma replaced → cells <b>diluted</b>' },
  { name: 'Blood loss: chronic', shape: 'micro', patient: true, desc: 'Iron lost → <b>small, pale</b> cells' },
  { name: 'Aplastic', shape: 'normal', desc: '<b>Marrow failure</b> · half idiopathic' },
  { name: 'Megaloblastic', shape: 'macro', desc: '↓ B12 / folate / intrinsic factor → <b>large</b> cells' },
  { name: 'Hereditary spherocytosis', shape: 'sphere', desc: '<b>Spherical</b> cells rupture in the spleen' },
  { name: 'Sickle cell', shape: 'sickle', desc: '<b>HbS</b> crystallizes at low O₂ → sickling' },
  { name: 'Erythroblastosis fetalis', shape: 'normal', ab: true, desc: 'Rh⁻ mother\'s <b>antibodies</b> vs Rh⁺ fetal cells' },
  { name: 'Severe hypochromic', shape: 'pale', desc: '<b>Transferrin</b> deficiency' },
];

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const list = slide.querySelector('[data-list]');
  const desc = slide.querySelector('[data-desc]');
  const { scene, camera, render } = stage3D(box, api, { fov: 30, exposure: 1.0 });
  addLights(scene, { key: 2.3, rim: 2.0 });
  camera.position.set(0, 0, 25);
  camera.lookAt(0, 0, 0);

  const grid = cellGrid(72, 120);
  const mk = (fn, col) => { const { pos, thick } = evalShape(grid, fn); return { pos, col: colorsFor(thick, col) }; };
  const deep = { pale: '#b0102a', deep: '#a80a24', lo: 0, hi: 1 };
  const shapes = {
    normal: mk(discShape(), { pale: '#e2566a', deep: '#a80a24', lo: 0.8, hi: 2.1 }),
    micro: mk(discShape({ R: 3.3, a0: 0.28, a1: 6.6, a2: -3.9 }), { pale: '#f7cdd2', deep: '#dc5d70', lo: 0.9, hi: 2.3 }),
    macro: mk(discShape({ R: 4.9, a0: 1.7, a1: 5.6, a2: -3.4, sx: 1.12, sz: 0.86 }), { pale: '#d44a60', deep: '#a80a24', lo: 0.6, hi: 1.7 }),
    sphere: mk(sphereShape({ R: 2.75 }), deep),
    sickle: mk(sickleShape(), deep),
    pale: mk(discShape({ a0: 0.45 }), { pale: '#fadde0', deep: '#e57786', lo: 1.0, hi: 2.4 }),
  };
  const keys = Object.keys(shapes);
  const morph = new MorphCell(grid, keys.map((k) => shapes[k]));
  const mesh = new THREE.Mesh(morph.geo, rbcMaterial());
  const pivot = new THREE.Group();
  pivot.add(mesh);
  pivot.rotation.x = 0.95;
  scene.add(pivot);

  // reference ring: the normal 7.8 µm diameter
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.95, 0.03, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
  ring.rotation.x = Math.PI / 2;
  pivot.add(ring);
  const ringLab = h('div', { class: 'labels3d' }, box);
  ringLab.innerHTML = '<div class="t-cap" style="position:absolute; right:40px; top:40px">Ring = normal cell, 7.8 µm</div>';

  // antibodies (Y shapes) for erythroblastosis fetalis
  const abMat = new THREE.MeshPhysicalMaterial({ color: 0xffd60a, roughness: 0.35, emissive: 0x6a5200, emissiveIntensity: 0.4 });
  const abs = [];
  const yGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.0, 10);
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(yGeo, abMat); stem.position.y = 0.5; g.add(stem);
    const a1 = new THREE.Mesh(yGeo, abMat); a1.position.set(0.28, 1.22, 0); a1.rotation.z = -0.6; g.add(a1);
    const a2 = new THREE.Mesh(yGeo, abMat); a2.position.set(-0.28, 1.22, 0); a2.rotation.z = 0.6; g.add(a2);
    const th = (i / 9) * Math.PI * 2;
    const top = i % 2 === 0;
    const r = top ? 2.6 : 3.75;
    g.position.set(Math.cos(th) * r, top ? 1.05 : 0, Math.sin(th) * r);
    const n = top ? new THREE.Vector3(Math.cos(th) * 0.4, 1, Math.sin(th) * 0.4).normalize() : new THREE.Vector3(Math.cos(th), 0.1, Math.sin(th)).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    g.scale.setScalar(0.001);
    pivot.add(g);
    abs.push(g);
  }

  // list
  const btns = TYPES.map((t, i) => {
    const b = h('button', { type: 'button', html: `<span class="ix">${String(i + 1).padStart(2, '0')}</span>${t.name}${t.patient ? '<span class="pt">Patient</span>' : ''}` }, list);
    b.addEventListener('click', () => api.setStep(i));
    return b;
  });
  desc.innerHTML = '<div class="card" style="padding:26px 34px"><p class="one" style="margin:0; color:var(--text); font-size:40px" data-d></p></div>';
  const dEl = desc.querySelector('[data-d]');

  const drag = dragRotate(box.querySelector('canvas'), pivot, { auto: 0.25, minX: -0.2, maxX: 1.5 });
  let cur = 0, abA = 0, time = 0;

  function select(i) {
    cur = i;
    btns.forEach((b, k) => b.classList.toggle('on', k === i));
    morph.go(keys.indexOf(TYPES[i].shape));
    dEl.innerHTML = TYPES[i].desc.replace(/<b>/g, '<span class="strong">').replace(/<\/b>/g, '</span>');
  }

  return {
    steps: TYPES.length - 1,
    enter() { pivot.rotation.set(0.95, 0, 0); },
    step(n) { select(n); },
    frame(_, dt) {
      time += dt;
      morph.frame(dt, 1.3);
      drag.frame(dt);
      if (drag.idle > 4) pivot.rotation.x = damp(pivot.rotation.x, 0.95, 1.5, dt);
      abA = damp(abA, TYPES[cur].ab ? 1 : 0, 4, dt);
      abs.forEach((a, i) => a.scale.setScalar(Math.max(0.001, abA * (1 + 0.06 * Math.sin(time * 3 + i)))));
      pivot.position.y = Math.sin(time * 0.7) * 0.15;
      render();
    },
  };
}
