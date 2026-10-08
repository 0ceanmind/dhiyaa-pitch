// The case: a fast heartbeat trace runs quietly under the symptoms.
import { makeCanvas, h, css } from '../lib/util.js';

function ecg(x) {
  // one beat on x ∈ [0,1): P, QRS, T as gaussians
  const g = (m, s, a) => a * Math.exp(-((x - m) ** 2) / (2 * s * s));
  return g(0.18, 0.025, 0.12) + g(0.36, 0.008, -0.12) + g(0.4, 0.011, 1) + g(0.44, 0.009, -0.28) + g(0.66, 0.045, 0.24);
}

export default function setup(slide, api) {
  const box = h('div', { style: 'position:absolute; left:0; right:0; bottom:118px; height:180px; z-index:0; pointer-events:none' });
  slide.prepend(box);
  const c = makeCanvas(box, api);
  let t = 0;
  const beat = 0.52; // seconds per beat (fast)
  const pxPerSec = 520;

  function frame(_, dt) {
    t += dt;
    const { ctx, w, h: hh } = c;
    ctx.clearRect(0, 0, w, hh);
    const col = css('--blood');
    const mid = hh * 0.62;
    const amp = hh * 0.5;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    const head = w * 0.86;
    const grad = ctx.createLinearGradient(0, 0, head, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.55, col + '55');
    grad.addColorStop(1, col);
    ctx.strokeStyle = grad;
    ctx.beginPath();
    for (let x = 0; x <= head; x += 2) {
      const time = t - (head - x) / pxPerSec;
      const ph = ((time / beat) % 1 + 1) % 1;
      const y = mid - ecg(ph) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    const ph = ((t / beat) % 1 + 1) % 1;
    const y = mid - ecg(ph) * amp;
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(head, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  return { frame };
}
