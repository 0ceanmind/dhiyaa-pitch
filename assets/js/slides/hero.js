// Title / closing slide: a red cell modelled on Guyton's dimensions,
// with a slow drift of cells receding into the dark.
import { THREE, stage3D, addLights, cellGrid, normalRBC, rbcMaterial } from '../lib/three-kit.js';
import { rng, damp, ease } from '../lib/util.js';

export default function hero(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const thanks = slide.dataset.variant === 'thanks';
  const { scene, camera, size, render } = stage3D(box, api, { fov: 30, exposure: 0.95 });
  addLights(scene, { key: 2.4, rim: 2.2 });

  camera.position.set(0, 0, 23);
  camera.lookAt(0, 0, 0);

  const fog = new THREE.Fog(0x000000, 20, 60);
  scene.fog = fog;
  const setFog = () => fog.color.set(api.theme() === 'light' ? 0xfbfbfd : 0x000000);
  setFog();
  api.onTheme(setFog);

  // Main cell
  const main = new THREE.Mesh(normalRBC(cellGrid(96, 160)), rbcMaterial());
  const pivot = new THREE.Group();
  pivot.add(main);
  pivot.position.set(thanks ? 5.2 : 5.6, 0, 0);
  scene.add(pivot);
  main.rotation.x = 1.05;

  // Drifting background cells
  const R = rng(thanks ? 7 : 3);
  const N = 30;
  const small = new THREE.InstancedMesh(normalRBC(cellGrid(32, 56)), rbcMaterial({ clearcoat: 0.3 }), N);
  const cells = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const z = -14 - R() * 34;
    cells.push({
      x: (R() - 0.5) * 60, y: (R() - 0.5) * 36, z,
      rx: R() * 6, ry: R() * 6, rz: R() * 6,
      vx: 0.25 + R() * 0.4, vy: 0.12 + R() * 0.25,
      wr: (R() - 0.5) * 0.5, s: 0.55 + R() * 0.45,
    });
  }
  scene.add(small);

  // parallax
  let mx = 0, my = 0, tx = 0, ty = 0;
  slide.addEventListener('pointermove', (ev) => {
    const r = slide.getBoundingClientRect();
    mx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
    my = ((ev.clientY - r.top) / r.height - 0.5) * 2;
  });

  let intro = 1;
  let time = 0;

  function frame(t, dt) {
    time += dt;
    intro = Math.min(1, intro + dt / 2.2);
    const k = ease.outCubic(intro);
    tx = damp(tx, mx, 2, dt);
    ty = damp(ty, my, 2, dt);

    const s = 0.82 + 0.18 * k;
    main.scale.setScalar(s);
    main.rotation.z = time * 0.16 + (1 - k) * 1.2;
    pivot.rotation.x = Math.sin(time * 0.35) * 0.12 + ty * 0.18;
    pivot.rotation.y = Math.sin(time * 0.27) * 0.18 + tx * 0.28;
    pivot.position.y = Math.sin(time * 0.6) * 0.18;

    for (let i = 0; i < N; i++) {
      const c = cells[i];
      c.x += c.vx * dt * 0.6;
      c.y += c.vy * dt * 0.6;
      if (c.x > 30) c.x -= 60;
      if (c.y > 18) c.y -= 36;
      c.rx += c.wr * dt; c.ry += c.wr * 0.7 * dt;
      e.set(c.rx, c.ry, c.rz);
      q.setFromEuler(e);
      p.set(c.x - tx * 0.6, c.y + ty * 0.4, c.z);
      sc.setScalar(c.s);
      m.compose(p, q, sc);
      small.setMatrixAt(i, m);
    }
    small.instanceMatrix.needsUpdate = true;
    render();
  }

  return {
    enter() { intro = 0; },
    frame,
  };
}
