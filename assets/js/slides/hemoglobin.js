// Hemoglobin in 3D: two α and two β globin chains, each holding a heme with
// one iron atom; O₂ molecules bind and release. Then: capacity in numbers.
import { THREE, stage3D, addLights, blobGeometry, Labels3D, dragRotate } from '../lib/three-kit.js';
import { damp, clamp, rng, css } from '../lib/util.js';

export default function setup(slide, api) {
  const box = slide.querySelector('[data-vis]');
  const { scene, camera, size, render } = stage3D(box, api, { fov: 30, exposure: 1.0 });
  addLights(scene, { key: 2.2, rim: 1.8, fill: 0.5 });
  camera.position.set(0, 0.3, 27);
  camera.lookAt(0, 0, 0);
  const labels = new Labels3D(box, camera);
  const R = rng(2);

  const pivot = new THREE.Group();
  pivot.position.x = 2.2;
  scene.add(pivot);

  const matA = new THREE.MeshPhysicalMaterial({ color: 0xf0405a, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: new THREE.Color('#ff8fa3') });
  const matB = new THREE.MeshPhysicalMaterial({ color: 0x9e1035, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: new THREE.Color('#ff5a78') });
  const hemeMat = new THREE.MeshStandardMaterial({ color: 0x5a0d1d, roughness: 0.5, metalness: 0.1 });
  const pyrMat = new THREE.MeshStandardMaterial({ color: 0x8a1a30, roughness: 0.5 });
  const feMat = new THREE.MeshPhysicalMaterial({ color: 0xffa31a, emissive: 0xff8a00, emissiveIntensity: 0.9, roughness: 0.25, clearcoat: 1 });
  const o2Mat = new THREE.MeshPhysicalMaterial({ color: 0x7fdcff, emissive: 0x1aa7e6, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 });

  const subs = [
    { name: 'α', pos: new THREE.Vector3(-1.55, 1.25, 1.0), mat: matA, seed: 1.1 },
    { name: 'β', pos: new THREE.Vector3(1.55, 1.25, -1.0), mat: matB, seed: 2.3 },
    { name: 'α', pos: new THREE.Vector3(1.55, -1.25, 1.0), mat: matA, seed: 3.7 },
    { name: 'β', pos: new THREE.Vector3(-1.55, -1.25, -1.0), mat: matB, seed: 4.2 },
  ];
  const sites = [];
  subs.forEach((sb) => {
    const m = new THREE.Mesh(blobGeometry(2.05, 5, 0.13, sb.seed, 0.2), sb.mat);
    m.position.copy(sb.pos);
    pivot.add(m);
    const d = sb.pos.clone().normalize();
    const hp = sb.pos.clone().add(d.clone().multiplyScalar(1.85));
    const heme = new THREE.Group();
    heme.position.copy(hp);
    heme.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 40), hemeMat);
    heme.add(disk);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), pyrMat);
      p.position.set(Math.cos(a) * 0.62, 0.05, Math.sin(a) * 0.62);
      heme.add(p);
    }
    const fe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), feMat);
    fe.position.y = 0.16;
    heme.add(fe);
    pivot.add(heme);
    sb.mesh = m; sb.heme = heme; sb.fe = fe; sb.dir = d;
    sites.push({ fe, dir: d, bindAt: hp.clone().add(d.clone().multiplyScalar(0.62)) });
  });

  // O₂ molecules
  const o2s = sites.map((st, i) => {
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), o2Mat);
    const b = a.clone();
    a.position.x = -0.2; b.position.x = 0.2;
    g.add(a, b);
    pivot.add(g);
    return { g, site: st, t: i * 0.9, phase: 'out', far: st.bindAt.clone().add(st.dir.clone().multiplyScalar(6 + R() * 2)).add(new THREE.Vector3((R() - 0.5) * 3, (R() - 0.5) * 3, 0)) };
  });

  const L = {
    a: labels.add('α globin chain', '#ff6175', subs[0].mesh, { dx: -40, dy: -10 }),
    b: labels.add('β globin chain', '#b8173f', subs[1].mesh, { dx: 40, dy: -10 }),
    heme: labels.add('Heme + Fe²⁺', '#ffa31a', subs[2].fe, { dx: 70, dy: 46 }),
    o2: labels.add('O₂', '#7fdcff', o2s[3].g, { dx: -36, dy: -30 }),
  };

  // capacity bars
  const barsEl = slide.querySelector('[data-bars]');
  barsEl.innerHTML = [
    ['Normal woman', '14 g/dL Hb', 19, '≈ 19', 'var(--text-2)'],
    ['Our patient', '8.9 g/dL Hb', 8.9 * 1.34, '≈ 11.9', 'var(--o2)'],
  ].map(([k, sub, v, lab, col]) => `
    <div style="margin-bottom:20px">
      <div style="display:flex; justify-content:space-between; align-items:baseline">
        <span class="t-label">${k} <span class="c-3" style="font-weight:500; font-size:24px">· ${sub}</span></span>
        <span class="num" style="font-size:40px; font-weight:750; color:${col}">${lab} <span style="font-size:22px; color:var(--text-3); font-weight:600">mL O₂/dL</span></span>
      </div>
      <div style="height:20px; border-radius:10px; background:var(--surface-2); margin-top:8px; overflow:hidden">
        <i data-w="${(v / 20) * 100}" style="display:block; height:100%; width:0; border-radius:10px; background:${col === 'var(--o2)' ? 'linear-gradient(90deg,#1aa7e6,#7fdcff)' : 'var(--text-3)'}; transition: width 1.4s cubic-bezier(.2,.8,.2,1)"></i>
      </div>
    </div>`).join('');
  const bars = [...barsEl.querySelectorAll('i[data-w]')];

  const drag = dragRotate(box.querySelector('canvas'), pivot, { auto: 0.22, minX: -0.8, maxX: 0.8 });
  let step = 0, time = 0;

  return {
    steps: 2,
    enter() { pivot.rotation.set(0.2, -0.4, 0); bars.forEach((b) => (b.style.width = 0)); },
    step(n) {
      step = n;
      Object.values(L).forEach((l) => labels.show(l, n === 0));
      bars.forEach((b) => (b.style.width = n >= 1 ? b.dataset.w + '%' : 0));
    },
    frame(_, dt) {
      time += dt;
      drag.frame(dt);
      pivot.position.y = Math.sin(time * 0.6) * 0.12;
      subs.forEach((sb, i) => (sb.fe.material.emissiveIntensity = 0.8 + 0.25 * Math.sin(time * 3 + i)));
      o2s.forEach((o) => {
        o.t += dt;
        const cyc = 6.5;
        const u = ((o.t % cyc) + cyc) % cyc;
        let pos;
        if (u < 1.6) pos = o.far.clone().lerp(o.site.bindAt, 1 - Math.pow(1 - u / 1.6, 3));
        else if (u < 4.4) pos = o.site.bindAt.clone();
        else pos = o.site.bindAt.clone().lerp(o.far, Math.pow((u - 4.4) / 2.1, 2));
        o.g.position.copy(pos);
        o.g.lookAt(pos.clone().add(o.site.dir));
        const fade = clamp(Math.min(u / 0.3, (cyc - u) / 0.3));
        o.g.scale.setScalar(Math.max(0.001, fade));
      });
      labels.update(size.w, size.h);
      render();
    },
  };
}
