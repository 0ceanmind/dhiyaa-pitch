// The hepatic lobule in 3D: hexagonal unit, hepatocyte plates radiating from
// the central vein, portal triads at the corners, sinusoidal blood flowing in,
// bile flowing out along canaliculi, Kupffer cells lining the sinusoids.
import { THREE, stage3D, addLights, Labels3D, dragRotate, CamRig } from '../lib/three-kit.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { rng, damp, clamp, segmented } from '../lib/util.js';

const C = {
  hep: 0xe39a82, portal: 0x7f7cff, artery: 0xff453a, bile: 0x30d158, vein: 0x3d8bff, kupffer: 0xb48cff, blood: 0xd8344f,
};

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const { scene, camera, size, render } = stage3D(box, api, { fov: 34, exposure: 1.0 });
  addLights(scene, { key: 2.1, rim: 1.2, fill: 0.55, rimColor: 0xffd6c8 });
  const labels = new Labels3D(box, camera);
  const R = rng(5);

  const lobe = new THREE.Group();
  scene.add(lobe);

  const Rh = 6.6;                      // corner distance
  const apo = Rh * Math.cos(Math.PI / 6);
  const HGT = 1.9;
  const corners = [...Array(6)].map((_, k) => new THREE.Vector3(Math.cos((k * Math.PI) / 3) * Rh, 0, Math.sin((k * Math.PI) / 3) * Rh));
  const boundary = (th) => {
    const n = Math.PI / 6 + (Math.PI / 3) * Math.round((th - Math.PI / 6) / (Math.PI / 3));
    return apo / Math.cos(th - n);
  };

  // outline
  const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
  [-HGT / 2, HGT / 2].forEach((y) => {
    const pts = corners.map((c) => new THREE.Vector3(c.x, y, c.z));
    lobe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), outlineMat));
  });

  // ---------------------------------------------------------- hepatocytes
  const NDIR = 30;
  const cells = [];
  for (let i = 0; i < NDIR; i++) {
    const th = (i / NDIR) * Math.PI * 2;
    const rb = boundary(th);
    for (let r = 1.45; r < rb - 0.75; r += 0.5) {
      const w = Math.min(0.42, ((2 * Math.PI * r) / NDIR) * 0.58);
      for (const y of [-0.42, 0.42]) cells.push({ th, r, y, w });
    }
  }
  const hepGeo = new RoundedBoxGeometry(0.46, 0.78, 1, 2, 0.08);
  const hepMat = new THREE.MeshPhysicalMaterial({ color: C.hep, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffd2c2'), clearcoat: 0.15, transparent: true });
  const hep = new THREE.InstancedMesh(hepGeo, hepMat, cells.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  cells.forEach((c, i) => {
    p.set(Math.cos(c.th) * c.r, c.y, Math.sin(c.th) * c.r);
    q.setFromAxisAngle(yAxis, -c.th);
    sc.set(1, 1, c.w);
    m4.compose(p, q, sc);
    hep.setMatrixAt(i, m4);
    tint.setHex(C.hep).offsetHSL((R() - 0.5) * 0.02, (R() - 0.5) * 0.08, (R() - 0.5) * 0.06);
    hep.setColorAt(i, tint);
  });
  lobe.add(hep);
  // nuclei
  const nucGeo = new THREE.SphereGeometry(0.1, 12, 8);
  const nucMat = new THREE.MeshStandardMaterial({ color: 0x6b2f45, roughness: 0.7, transparent: true });
  const nuc = new THREE.InstancedMesh(nucGeo, nucMat, cells.length);
  cells.forEach((c, i) => {
    p.set(Math.cos(c.th) * c.r, c.y + (c.y > 0 ? 0.39 : -0.39), Math.sin(c.th) * c.r);
    m4.compose(p, q.identity(), sc.set(1, 0.4, 1));
    nuc.setMatrixAt(i, m4);
  });
  lobe.add(nuc);

  // ---------------------------------------------------------- central vein
  const cvMat = new THREE.MeshPhysicalMaterial({ color: C.vein, roughness: 0.25, clearcoat: 0.8, transparent: true, opacity: 0.82 });
  const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, HGT + 0.9, 48, 1, true), cvMat);
  cvMat.side = THREE.DoubleSide;
  lobe.add(cv);

  // ---------------------------------------------------------- portal triads
  const triadMats = {
    portal: new THREE.MeshPhysicalMaterial({ color: C.portal, roughness: 0.3, clearcoat: 0.7, transparent: true }),
    artery: new THREE.MeshPhysicalMaterial({ color: C.artery, roughness: 0.3, clearcoat: 0.7, transparent: true }),
    bile: new THREE.MeshPhysicalMaterial({ color: C.bile, roughness: 0.3, clearcoat: 0.7, transparent: true }),
  };
  const sheathMat = new THREE.MeshPhysicalMaterial({ color: 0xf3ece4, roughness: 0.6, transparent: true, opacity: 0.18, depthWrite: false });
  const triadAnchors = [];
  corners.forEach((c, k) => {
    const g = new THREE.Group();
    g.position.copy(c);
    const out = c.clone().normalize();
    const tang = new THREE.Vector3(-out.z, 0, out.x);
    const mk = (mat, r, off) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, HGT + 0.7, 28), mat);
      m.position.copy(off);
      g.add(m);
      return m;
    };
    const pv = mk(triadMats.portal, 0.44, tang.clone().multiplyScalar(-0.35));
    const ha = mk(triadMats.artery, 0.19, tang.clone().multiplyScalar(0.42).add(out.clone().multiplyScalar(0.18)));
    const bd = mk(triadMats.bile, 0.21, tang.clone().multiplyScalar(0.3).add(out.clone().multiplyScalar(-0.38)));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, HGT + 0.4, 32), sheathMat);
    g.add(sh);
    lobe.add(g);
    triadAnchors.push({ pv, ha, bd });
  });

  // ---------------------------------------------------------- Kupffer cells
  const kGeo = new THREE.IcosahedronGeometry(0.2, 1);
  {
    const a = kGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i); v.multiplyScalar(1 + 0.6 * Math.abs(Math.sin(v.x * 23) * Math.cos(v.y * 19 + v.z * 7))); a.setXYZ(i, v.x, v.y, v.z); }
    kGeo.computeVertexNormals();
  }
  const kMat = new THREE.MeshPhysicalMaterial({ color: C.kupffer, roughness: 0.4, emissive: 0x6f3fe0, emissiveIntensity: 0.0, sheen: 0.5, transparent: true });
  const kupffer = [];
  for (let i = 0; i < 12; i++) {
    const gi = (i * 5 + 2) % NDIR;
    const th = ((gi + 0.5) / NDIR) * Math.PI * 2;
    const r = 2.2 + R() * (boundary(th) - 3.4);
    const m = new THREE.Mesh(kGeo, kMat);
    m.position.set(Math.cos(th) * r, (R() - 0.5) * 0.9, Math.sin(th) * r);
    lobe.add(m);
    kupffer.push(m);
  }

  // ---------------------------------------------------------- flows
  const NB = 260;
  const bloodMat = new THREE.MeshBasicMaterial({ color: C.blood, transparent: true });
  const blood = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), bloodMat, NB);
  const bl = [];
  for (let i = 0; i < NB; i++) {
    const gi = (R() * NDIR) | 0;
    const th = ((gi + 0.5) / NDIR) * Math.PI * 2;
    bl.push({ th, rb: boundary(th) - 0.6, u: R(), y: (R() - 0.5) * 1.3, v: 0.12 + R() * 0.06 });
  }
  lobe.add(blood);
  const NBile = 200;
  const bileMat = new THREE.MeshBasicMaterial({ color: 0x5cff8a, transparent: true });
  const bile = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), bileMat, NBile);
  const bi = [];
  for (let i = 0; i < NBile; i++) {
    const di = (R() * NDIR) | 0;
    const th = (di / NDIR) * Math.PI * 2;
    bi.push({ th, rb: boundary(th) - 0.75, u: R(), y: (R() < 0.5 ? -0.42 : 0.42), v: 0.1 + R() * 0.05 });
  }
  lobe.add(bile);
  // vein outflow column
  const NCV = 40;
  const cvf = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7fb4ff, transparent: true }), NCV);
  const cvp = [...Array(NCV)].map(() => ({ a: R() * Math.PI * 2, r: R() * 0.55, u: R() }));
  lobe.add(cvf);

  // ---------------------------------------------------------- labels
  const anchor = (v, parent = lobe) => { const o = new THREE.Object3D(); o.position.copy(v); parent.add(o); return o; };
  const L = {
    lobule: labels.add('Hepatic lobule', null, anchor(new THREE.Vector3(0, 1.6, -apo - 0.4))),
    cv: labels.add('Central vein', '#3d8bff', anchor(new THREE.Vector3(0, HGT / 2 + 0.75, 0))),
    triad: labels.add('Portal triad', '#c9c6ff', anchor(corners[0].clone().add(new THREE.Vector3(0.3, HGT / 2 + 0.9, 0)))),
    hep: labels.add('Hepatocyte plates', '#e39a82', anchor(new THREE.Vector3(Math.cos(0.35) * 3.6, 0.95, Math.sin(0.35) * 3.6))),
    pv: labels.add('Portal vein', '#7f7cff', triadAnchors[0].pv, { dx: -110, dy: -40 }),
    ha: labels.add('Hepatic artery', '#ff453a', triadAnchors[0].ha, { dx: 120, dy: -70 }),
    bd: labels.add('Bile duct', '#30d158', triadAnchors[0].bd, { dx: 40, dy: 80 }),
    sin: labels.add('Sinusoids', '#d8344f', anchor(new THREE.Vector3(Math.cos(1.2) * 3.4, 1.0, Math.sin(1.2) * 3.4))),
    kup: labels.add('Kupffer cell', '#b48cff', kupffer[1], { dy: -44 }),
    can: labels.add('Bile canaliculi', '#30d158', anchor(new THREE.Vector3(Math.cos(2.4) * 3.8, 0.9, Math.sin(2.4) * 3.8))),
  };
  const stepLabels = [['lobule', 'cv', 'triad'], ['hep', 'cv'], ['pv', 'ha', 'bd'], ['sin', 'cv'], ['kup'], ['can', 'bd']];
  const cams = [
    [new THREE.Vector3(1.5, 16.5, 15.5), new THREE.Vector3(1.2, -0.8, 0.4)],
    [new THREE.Vector3(6.5, 7.4, 9.4), new THREE.Vector3(3.0, 0, 1.2)],
    [new THREE.Vector3(11.2, 4.6, 5.6), new THREE.Vector3(5.8, 0.2, 0.6)],
    [new THREE.Vector3(2.0, 12.5, 11.5), new THREE.Vector3(1.4, -0.4, 0.4)],
    [new THREE.Vector3(3.0, 7.5, 9.6), new THREE.Vector3(1.8, 0, 1.4)],
    [new THREE.Vector3(6.5, 9.0, 10.2), new THREE.Vector3(2.6, -0.2, 0.6)],
  ];
  const rig = new CamRig(camera, cams[0][0], cams[0][1]);
  const drag = dragRotate(box.querySelector('canvas'), lobe, { auto: 0.06, minX: -0.5, maxX: 0.5 });

  // flow switch
  let flowMode = 0; // 0 blood, 1 bile, 2 both
  const seg = segmented(slide.querySelector('[data-seg]'), ['Blood flow', 'Bile flow', 'Both'], (i) => (flowMode = i), 0);

  let step = 0;
  const vis = { blood: 1, bile: 0, kup: 0, hepOp: 1 };
  let time = 0;

  return {
    enter() {
      lobe.rotation.set(0, -0.35, 0);
      rig.jump(cams[0][0].clone().multiplyScalar(1.25), cams[0][1]);
    },
    step(n) {
      step = n;
      labels.hideAll();
      stepLabels[n].forEach((k) => labels.show(L[k], true));
      rig.set(cams[n][0], cams[n][1]);
      if (n === 5) seg.set(1);
      else if (n < 5 && seg.get() === 1) seg.set(0);
      if (n >= 2 && n <= 4) lobe.rotation.y = lobe.rotation.y % (Math.PI * 2);
    },
    frame(_, dt) {
      time += dt;
      drag.frame(dt);
      if (step >= 2 && drag.idle > 0.2) lobe.rotation.y = damp(lobe.rotation.y, step === 2 ? 0 : lobe.rotation.y, 2, dt);
      rig.frame(dt, 2.0);

      const showBlood = flowMode !== 1;
      const showBile = flowMode !== 0;
      vis.blood = damp(vis.blood, showBlood ? 1 : 0, 4, dt);
      vis.bile = damp(vis.bile, showBile ? 1 : 0, 4, dt);
      vis.kup = damp(vis.kup, step === 4 ? 1 : 0, 4, dt);
      vis.hepOp = damp(vis.hepOp, step === 3 ? 0.55 : step === 5 ? 0.32 : 1, 3, dt);
      hepMat.opacity = vis.hepOp;
      nucMat.opacity = vis.hepOp;
      kMat.emissiveIntensity = vis.kup * (0.6 + 0.4 * Math.sin(time * 4));
      kupffer.forEach((k, i) => k.scale.setScalar(1 + vis.kup * (0.35 + 0.15 * Math.sin(time * 4 + i))));

      bloodMat.opacity = vis.blood;
      for (let i = 0; i < NB; i++) {
        const b = bl[i];
        b.u = (b.u + b.v * dt) % 1;
        const r = b.rb - b.u * (b.rb - 0.6);
        const fade = clamp(Math.min(b.u / 0.08, (1 - b.u) / 0.1));
        p.set(Math.cos(b.th) * r, b.y * (r > 1.2 ? 1 : r / 1.2), Math.sin(b.th) * r);
        m4.compose(p, q.identity(), sc.setScalar(Math.max(0.001, fade * vis.blood)));
        blood.setMatrixAt(i, m4);
      }
      blood.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < NCV; i++) {
        const c = cvp[i];
        c.u = (c.u + dt * 0.35) % 1;
        p.set(Math.cos(c.a) * c.r, -HGT / 2 + c.u * (HGT + 1.4), Math.sin(c.a) * c.r);
        m4.compose(p, q.identity(), sc.setScalar(Math.max(0.001, vis.blood * clamp(Math.min(c.u / 0.1, (1 - c.u) / 0.2)))));
        cvf.setMatrixAt(i, m4);
      }
      cvf.instanceMatrix.needsUpdate = true;

      bileMat.opacity = vis.bile;
      for (let i = 0; i < NBile; i++) {
        const b = bi[i];
        b.u = (b.u + b.v * dt) % 1;
        const r = 1.3 + b.u * (b.rb - 1.3);
        const fade = clamp(Math.min(b.u / 0.08, (1 - b.u) / 0.1));
        p.set(Math.cos(b.th) * r, b.y, Math.sin(b.th) * r);
        m4.compose(p, q.identity(), sc.setScalar(Math.max(0.001, fade * vis.bile)));
        bile.setMatrixAt(i, m4);
      }
      bile.instanceMatrix.needsUpdate = true;

      labels.update(size.w, size.h);
      render();
    },
  };
}
