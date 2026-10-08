// Bone marrow in 3D: a cord between two sinusoids, with a reticular scaffold,
// an erythroblastic island, a megakaryocyte shedding platelets into the lumen,
// adipocytes, and maturing cells crossing the sinusoid wall.
import { THREE, stage3D, addLights, normalRBC, cellGrid, rbcMaterial, Labels3D, dragRotate, CamRig, blobGeometry } from '../lib/three-kit.js';
import { rng, damp, clamp, css } from '../lib/util.js';

function fresnelMat(color, base = 0.04, power = 2.2, strength = 0.75) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uPow: { value: power }, uStr: { value: strength }, uFade: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uBase; uniform float uPow; uniform float uStr; uniform float uFade; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow); gl_FragColor = vec4(uColor, (uBase + f*uStr) * uFade); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

const blob = (radius, detail, amp, seed, hf = 0.5) => blobGeometry(radius, detail, amp, seed, hf);

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const { scene, camera, size, render } = stage3D(box, api, { fov: 34, exposure: 1.0 });
  addLights(scene, { key: 2.0, rim: 1.4, fill: 0.5, rimColor: 0xffc2cc });
  const labels = new Labels3D(box, camera);
  const R = rng(11);

  const world = new THREE.Group();
  scene.add(world);
  const groups = {};
  const mk = (name) => { const g = new THREE.Group(); world.add(g); groups[name] = g; g.userData.mats = []; return g; };
  const reg = (name, mat, base = 1) => { mat.transparent = true; mat.userData.base = base; mat.opacity = base; groups[name].userData.mats.push(mat); return mat; };

  // ---------------------------------------------------------- sinusoids
  const SIN_R = 1.8, SIN_Y = 4.1, LEN = 26;
  const gSin = mk('sin');
  const tubeGeo = new THREE.CylinderGeometry(SIN_R, SIN_R, LEN, 64, 1, true);
  tubeGeo.rotateZ(Math.PI / 2);
  const sinMat = fresnelMat('#ff8b9b', 0.03, 2.0, 0.85);
  [SIN_Y, -SIN_Y].forEach((y) => {
    const t = new THREE.Mesh(tubeGeo, sinMat);
    t.position.y = y;
    gSin.add(t);
  });
  const rbcGeo = normalRBC(cellGrid(24, 40));
  const rbcMat = rbcMaterial({ clearcoat: 0.2 });
  const NF = 72;
  const flow = new THREE.InstancedMesh(rbcGeo, rbcMat, NF);
  gSin.add(flow);
  const flowCells = [];
  for (let i = 0; i < NF; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * (SIN_R - 0.55);
    flowCells.push({ x: (R() - 0.5) * LEN, y: (i % 2 ? SIN_Y : -SIN_Y) + Math.cos(a) * rr, z: Math.sin(a) * rr, rx: R() * 6, ry: R() * 6, w: 0.5 + R(), v: 1.6 + R() * 0.9 });
  }

  // ---------------------------------------------------------- reticular network
  const gNet = mk('net');
  const netMat = reg('net', new THREE.MeshStandardMaterial({ color: 0xe9e1d2, roughness: 0.6, emissive: 0xffe8c0, emissiveIntensity: 0.05 }), 0.45);
  const nodes = [];
  for (let i = 0; i < 22; i++) nodes.push(new THREE.Vector3((R() - 0.5) * 20, (R() - 0.5) * 4.2, (R() - 0.5) * 3.6));
  for (let i = 0; i < 30; i++) {
    const a = nodes[(R() * nodes.length) | 0];
    let b = nodes[(R() * nodes.length) | 0];
    if (a.distanceTo(b) > 7 || a === b) continue;
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3((R() - 0.5) * 1.5, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2));
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    gNet.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.035, 6), netMat));
  }
  const retCellMat = reg('net', new THREE.MeshStandardMaterial({ color: 0xf2eadc, roughness: 0.5, emissive: 0xffe8c0, emissiveIntensity: 0.05 }), 0.55);
  nodes.slice(0, 9).forEach((n) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), retCellMat);
    m.scale.set(1.7, 0.7, 0.9);
    m.position.copy(n);
    gNet.add(m);
  });

  // ---------------------------------------------------------- erythroblastic island
  const gIsl = mk('island');
  const ISL = new THREE.Vector3(-4.2, -0.2, 0.6);
  gIsl.position.copy(ISL);
  const macMat = reg('island', new THREE.MeshPhysicalMaterial({ color: 0x9c7af0, roughness: 0.42, sheen: 0.8, sheenColor: new THREE.Color('#e7dcff'), clearcoat: 0.3 }), 1);
  const mac = new THREE.Mesh(blob(1.2, 5, 0.16, 2.3, 0.12), macMat);
  gIsl.add(mac);
  const macNuc = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), reg('island', new THREE.MeshStandardMaterial({ color: 0x5b3cc4, roughness: 0.6 }), 1));
  macNuc.position.set(0.25, 0.3, 0.7);
  gIsl.add(macNuc);
  const early = new THREE.Color('#7f78ea'), late = new THREE.Color('#e44a64');
  const blasts = [];
  for (let i = 0; i < 10; i++) {
    const k = i / 9;
    const col = early.clone().lerp(late, k);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.46 - k * 0.08, 28, 18), reg('island', new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.45, sheen: 0.6, sheenColor: col.clone().offsetHSL(0, 0, 0.2) }), 1));
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.24 - k * 0.1, 16, 12), reg('island', new THREE.MeshStandardMaterial({ color: 0x3b2a8f, roughness: 0.7 }), 1));
    nuc.position.set(0.18, 0.12, 0.26);
    m.add(nuc);
    const th = (i / 10) * Math.PI * 2, ph = (i % 2 ? 0.45 : -0.35);
    m.userData = { th, ph, r: 1.78 };
    gIsl.add(m);
    blasts.push(m);
  }

  // released reticulocytes crossing into the lower sinusoid
  const gRel = mk('release');
  const relMat = reg('release', rbcMaterial({ clearcoat: 0.2 }), 1);
  const relGeo = rbcGeo;
  const releasers = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(relGeo, relMat);
    m.scale.setScalar(0.24);
    gRel.add(m);
    return { m, t: i / 3 };
  });
  const relCurve = new THREE.CatmullRomCurve3([
    ISL.clone().add(new THREE.Vector3(1.4, -1.0, 0.4)),
    new THREE.Vector3(-1.6, -2.0, 0.8),
    new THREE.Vector3(-0.8, -SIN_Y + SIN_R + 0.1, 0.4),
    new THREE.Vector3(0.4, -SIN_Y + 0.6, 0.2),
    new THREE.Vector3(4, -SIN_Y + 0.2, 0.0),
    new THREE.Vector3(10, -SIN_Y, 0.0),
  ]);

  // ---------------------------------------------------------- megakaryocyte
  const gMeg = mk('mega');
  const MEG = new THREE.Vector3(2.6, 1.05, -0.1);
  gMeg.position.copy(MEG);
  const megMat = reg('mega', new THREE.MeshPhysicalMaterial({ color: 0xb48cff, roughness: 0.35, sheen: 0.7, sheenColor: new THREE.Color('#f0e6ff'), clearcoat: 0.4, depthWrite: false }), 0.72);
  const meg = new THREE.Mesh(blob(1.25, 5, 0.07, 5.1, 0.1), megMat);
  gMeg.add(meg);
  const lobMat = reg('mega', new THREE.MeshStandardMaterial({ color: 0x6a45d8, roughness: 0.6 }), 1);
  [[0.25, 0.1, 0.62, 0.42], [-0.3, -0.05, 0.6, 0.38], [0.05, -0.38, 0.55, 0.36], [0.0, 0.42, 0.5, 0.34]].forEach(([x, y, z, r]) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), lobMat);
    l.position.set(x, y, z);
    gMeg.add(l);
  });
  // proplatelet process reaching into the upper sinusoid
  const procCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 1.0, 0.1), new THREE.Vector3(0.45, 1.8, 0.05), new THREE.Vector3(0.9, 2.7, -0.1), new THREE.Vector3(1.6, 3.2, -0.2),
  ]);
  gMeg.add(new THREE.Mesh(new THREE.TubeGeometry(procCurve, 40, 0.13, 10), megMat));
  const pltMat = reg('mega', new THREE.MeshPhysicalMaterial({ color: 0xc4a6ff, roughness: 0.4, sheen: 0.6 }), 1);
  const plts = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), pltMat);
    p.scale.set(1, 0.45, 0.8);
    gMeg.add(p);
    plts.push({ m: p, t: i / 9 });
  }

  // ---------------------------------------------------------- adipocytes + other cells
  const gFat = mk('fat');
  const fatMat = reg('fat', new THREE.MeshPhysicalMaterial({ color: 0xffcf5c, roughness: 0.2, clearcoat: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#fff0b0'), depthWrite: false }), 0.55);
  const fats = [[7.2, -0.5, -0.4, 1.45], [-9.0, 0.7, -0.7, 1.35], [9.6, 1.3, 1.0, 1.0]].map(([x, y, z, r]) => {
    const m = new THREE.Mesh(blob(r, 4, 0.04, x, 0.1), fatMat);
    m.position.set(x, y, z);
    gFat.add(m);
    return m;
  });
  const gMisc = mk('misc');
  const miscCols = [0xc9c0ff, 0xe8e2ff, 0x9fb6ff, 0xd7c7ff, 0xbfa6f5];
  const miscMats = miscCols.map((c) => reg('misc', new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, sheen: 0.5 }), 1));
  const nucMat = reg('misc', new THREE.MeshStandardMaterial({ color: 0x4c35b5, roughness: 0.7 }), 1);
  const plasma = [];
  for (let i = 0; i < 26; i++) {
    const r = 0.3 + R() * 0.22;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), miscMats[i % miscMats.length]);
    const n = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 14, 10), nucMat);
    n.position.set(r * 0.35, r * 0.2, r * 0.45);
    m.add(n);
    let x, y, z, tries = 0;
    do {
      x = (R() - 0.5) * 21; y = (R() - 0.5) * 4.0; z = (R() - 0.5) * 3.4; tries++;
    } while (tries < 40 && (new THREE.Vector3(x, y, z).distanceTo(ISL) < 3.0 || new THREE.Vector3(x, y, z).distanceTo(MEG) < 2.2 || fats.some((f) => f.position.distanceTo(new THREE.Vector3(x, y, z)) < 1.9)));
    m.position.set(x, y, z);
    gMisc.add(m);
    if (i < 3) plasma.push(m);
  }

  // ---------------------------------------------------------- labels
  const mid = nodes.filter((n) => n.x > -1 && n.x < 3);
  const byX = (mid.length >= 2 ? mid : nodes).slice().sort((a, b) => b.y - a.y);
  const retRight = byX[0];
  const anchor = (v) => { const o = new THREE.Object3D(); o.position.copy(v); world.add(o); return o; };
  const L = {
    sinA: labels.add('Sinusoid', css('--blood'), anchor(new THREE.Vector3(-7.5, SIN_Y + SIN_R + 0.2, 0))),
    sinB: labels.add('Sinusoid', css('--blood'), anchor(new THREE.Vector3(-7.5, -SIN_Y - SIN_R - 0.3, 0))),
    cord: labels.add('Marrow cord', '#c9c0ff', anchor(new THREE.Vector3(0.2, -1.4, 2.2))),
    fiber: labels.add('Reticulin fibers · type III collagen', '#e9e1d2', anchor(byX[byX.length - 1].clone())),
    retcell: labels.add('Reticular cell', '#e9e1d2', anchor(retRight.clone())),
    fat: labels.add('Adipocyte', '#ffd97a', anchor(fats[0].position.clone().add(new THREE.Vector3(0, 1.8, 0))), { dx: -110 }),
    plasma: labels.add('Developing cells', '#c9c0ff', anchor(plasma[0].position.clone().add(new THREE.Vector3(0, 0.8, 0)))),
    mac: labels.add('Central macrophage', '#a98cf5', anchor(ISL.clone().add(new THREE.Vector3(0, 0.4, 1.6))), { dy: -10 }),
    blast: labels.add('Erythroid precursors', '#e44a64', anchor(ISL.clone().add(new THREE.Vector3(2.2, 1.7, 0.6)))),
    meg: labels.add('Megakaryocyte', '#d9c2ff', anchor(MEG.clone().add(new THREE.Vector3(-0.6, -1.7, 0.6)))),
    plt: labels.add('Platelets → circulation', '#c4a6ff', anchor(new THREE.Vector3(6.4, SIN_Y + 0.4, 0.4))),
    wall: labels.add('Crossing the sinusoidal wall', css('--blood'), anchor(new THREE.Vector3(-0.6, -SIN_Y + SIN_R + 0.6, 1.4))),
  };
  const stepLabels = [
    ['sinA', 'sinB', 'cord'],
    ['fiber', 'retcell', 'fat', 'plasma'],
    ['mac', 'blast'],
    ['meg', 'plt'],
    ['wall'],
  ];
  const focusOf = [null, 'net', 'island', 'mega', 'release'];
  const cams = [
    [new THREE.Vector3(0, 0.6, 21), new THREE.Vector3(0, 0, 0)],
    [new THREE.Vector3(-2, 1.2, 15), new THREE.Vector3(-1, 0, 0)],
    [new THREE.Vector3(-3.2, 0.8, 8.6), new THREE.Vector3(-4.0, -0.1, 0.6)],
    [new THREE.Vector3(4.6, 2.6, 9.4), new THREE.Vector3(3.6, 2.2, -0.1)],
    [new THREE.Vector3(-0.5, -1.6, 12), new THREE.Vector3(0.4, -2.2, 0.3)],
  ];
  const rig = new CamRig(camera, cams[0][0], cams[0][1]);
  const drag = dragRotate(renderer(), world, { auto: 0, minX: -0.6, maxX: 0.6 });
  function renderer() { return box.querySelector('canvas'); }

  let step = 0;
  let focus = 0;
  const fade = {};
  Object.keys(groups).forEach((k) => (fade[k] = 1));

  function applyStep(n) {
    step = n;
    labels.hideAll();
    stepLabels[n].forEach((k) => labels.show(L[k], true));
    rig.set(cams[n][0], cams[n][1]);
  }

  let time = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(0.17, 0.17, 0.17);

  return {
    enter() {
      world.rotation.set(0, 0, 0);
      rig.jump(cams[0][0].clone().add(new THREE.Vector3(0, 0, 6)), cams[0][1]);
    },
    step(n) { applyStep(n); },
    frame(_, dt) {
      time += dt;
      drag.frame(dt);
      if (drag.idle > 6) {
        world.rotation.y = damp(world.rotation.y, 0, 1.2, dt);
        world.rotation.x = damp(world.rotation.x, 0, 1.2, dt);
      }
      rig.frame(dt, 2.0);

      // focus dimming
      const f = focusOf[step];
      Object.entries(groups).forEach(([k, g]) => {
        const target = !f || k === f || (f === 'release' && (k === 'sin' || k === 'island')) || (f === 'mega' && k === 'sin') ? 1 : 0.18;
        fade[k] = damp(fade[k], target, 4, dt);
        g.userData.mats.forEach((m) => (m.opacity = m.userData.base * fade[k]));
      });
      sinMat.uniforms.uFade.value = 0.5 + 0.5 * fade.sin;
      netMat.emissiveIntensity = damp(netMat.emissiveIntensity, step === 1 ? 0.9 : 0.05, 3, dt);
      netMat.userData.base = step === 1 ? 1 : 0.45;
      retCellMat.emissiveIntensity = netMat.emissiveIntensity;

      // flowing cells
      for (let i = 0; i < NF; i++) {
        const c = flowCells[i];
        c.x += c.v * dt;
        if (c.x > LEN / 2 - 0.5) c.x -= LEN - 1;
        c.rx += c.w * dt; c.ry += c.w * 0.6 * dt;
        e.set(c.rx, c.ry, 0);
        q.setFromEuler(e);
        p.set(c.x, c.y, c.z);
        m4.compose(p, q, sc);
        flow.setMatrixAt(i, m4);
      }
      flow.instanceMatrix.needsUpdate = true;

      // island: precursors orbit gently and pulse
      blasts.forEach((b, i) => {
        const u = b.userData;
        const th = u.th + time * 0.12;
        b.position.set(Math.cos(th) * u.r, Math.sin(u.ph) * 1.05 + Math.sin(time * 0.8 + i) * 0.05, Math.sin(th) * u.r * 0.9);
      });
      mac.rotation.y = time * 0.1;

      // released cells travel along the curve into the lower sinusoid
      releasers.forEach((r) => {
        r.t = (r.t + dt * 0.085) % 1;
        const pt = relCurve.getPointAt(r.t);
        r.m.position.copy(pt);
        r.m.rotation.set(time * 0.8 + r.t * 5, time * 0.5, 0);
        const s = 0.24 * clamp(Math.min(r.t / 0.08, (1 - r.t) / 0.08));
        r.m.scale.setScalar(Math.max(0.001, s));
      });

      // platelets bud from the proplatelet tip and flow downstream
      plts.forEach((pl) => {
        pl.t = (pl.t + dt * 0.09) % 1;
        const x = 1.6 + pl.t * 9.0;
        pl.m.position.set(x, 3.2 + Math.sin(pl.t * 9 + pl.m.id) * 0.25, -0.2 + Math.cos(pl.t * 7 + pl.m.id) * 0.3);
        const s = clamp(Math.min(pl.t / 0.06, (1 - pl.t) / 0.1));
        pl.m.scale.set(s, 0.45 * s, 0.8 * s);
        pl.m.rotation.y = time + pl.t * 4;
      });

      labels.update(size.w, size.h);
      render();
    },
  };
}
