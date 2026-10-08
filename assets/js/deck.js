// Presentation engine: scaling stage, slides, build steps, keyboard/clicker,
// touch, overview, presenter sync, theme, blackout.

const W = 1920;
const H = 1080;
const TRANSITION_MS = 1000;

export class Deck {
  constructor({ viewport, stage, registry }) {
    this.viewport = viewport;
    this.stage = stage;
    this.registry = registry;
    this.slides = [...stage.querySelectorAll(':scope > .slide')];
    this.ctrls = new Array(this.slides.length).fill(null);
    this.index = -1;
    this.step = 0;
    this.scale = 1;
    this.resizeCbs = new Set();
    this.themeCbs = new Set();
    this.leaving = [];
    this.numBuf = '';
    this.done = new Set();
    this.channel = 'BroadcastChannel' in window ? new BroadcastChannel('iron-deck') : null;
  }

  async start() {
    this.slides.forEach((s, i) => {
      s.dataset.index = i;
      let max = 0;
      s.querySelectorAll('[data-step]').forEach((e) => (max = Math.max(max, +e.dataset.step || 0)));
      s.querySelectorAll('[data-step-hide]').forEach((e) => (max = Math.max(max, +e.dataset.stepHide || 0)));
      s.querySelectorAll('.captions > .cap').forEach((e) => (max = Math.max(max, +e.dataset.cap || 0)));
      s._steps = Math.max(max, +s.dataset.steps || 0);
      s.querySelectorAll('.rv').forEach((e, j) => {
        if (!e.style.getPropertyValue('--i')) e.style.setProperty('--i', j);
      });
    });

    this.buildChrome();
    this.fit();
    window.addEventListener('resize', () => this.fit());
    this.bindInput();
    this.restoreTheme();

    try { await document.fonts.ready; } catch (_) { /* ignore */ }
    await this.initModules();

    const { i, s } = this.parseHash();
    this.go(i, s, 1);
    requestAnimationFrame(() => document.body.classList.add('ready'));
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    if (this.channel) {
      this.channel.onmessage = (e) => this.onRemote(e.data);
    }
    window.addEventListener('hashchange', () => {
      const { i, s } = this.parseHash();
      if (i !== this.index || s !== this.step) this.go(i, s, i >= this.index ? 1 : -1);
    });
  }

  // ------------------------------------------------------------- modules
  makeApi(slide) {
    const deck = this;
    return {
      deck,
      slide,
      get scale() { return deck.scale; },
      onResize(cb) { deck.resizeCbs.add(cb); },
      onTheme(cb) { deck.themeCbs.add(cb); },
      color(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); },
      isActive() { return deck.slides[deck.index] === slide; },
      theme() { return document.documentElement.dataset.theme || 'dark'; },
      next() { deck.next(); },
      gotoId(id) { deck.gotoId(id); },
      setStep(n) { if (deck.slides[deck.index] === slide) deck.setStep(n, n >= deck.step ? 1 : -1); },
    };
  }

  async initModules() {
    const jobs = this.slides.map(async (slide, i) => {
      const name = slide.dataset.module;
      if (!name || !this.registry[name]) return;
      try {
        const mod = await this.registry[name]();
        const ctrl = (mod.default || mod.setup)(slide, this.makeApi(slide)) || {};
        this.ctrls[i] = ctrl;
        if (ctrl.steps != null) slide._steps = Math.max(slide._steps, ctrl.steps);
      } catch (err) {
        console.error(`[deck] module "${name}" failed`, err);
      }
    });
    await Promise.all(jobs);
    this.resizeCbs.forEach((cb) => { try { cb(this.scale); } catch (e) { console.error(e); } });
  }

  // ------------------------------------------------------------- layout
  fit() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = Math.min(vw / W, vh / H);
    this.scale = s;
    const tx = (vw - W * s) / 2;
    const ty = (vh - H * s) / 2;
    this.stage.style.setProperty('--s', s);
    this.stage.style.setProperty('--tx', `${tx}px`);
    this.stage.style.setProperty('--ty', `${ty}px`);
    this.resizeCbs.forEach((cb) => { try { cb(s); } catch (e) { console.error(e); } });
  }

  // ------------------------------------------------------------- navigation
  get total() { return this.slides.length; }
  get cur() { return this.slides[this.index]; }

  go(i, s = 0, dir = 1) {
    i = Math.max(0, Math.min(this.total - 1, i | 0));
    const prev = this.index;
    if (i !== prev) {
      const old = this.slides[prev];
      if (old) {
        old.classList.remove('active');
        old.classList.add('leaving');
        old.setAttribute('aria-hidden', 'true');
        const ctrl = this.ctrls[prev];
        try { ctrl?.leave?.(); } catch (e) { console.error(e); }
        const until = performance.now() + TRANSITION_MS;
        this.leaving.push({ idx: prev, until });
        setTimeout(() => {
          if (this.index !== prev) old.classList.remove('leaving');
        }, TRANSITION_MS);
      }
      const el = this.slides[i];
      el.classList.remove('leaving');
      el.classList.add('active');
      el.removeAttribute('aria-hidden');
      this.index = i;
      this.step = -1;
      this.stage.dataset.brand = el.dataset.brand || 'corner';
      try { this.ctrls[i]?.enter?.(dir); } catch (e) { console.error(e); }
      this.updateHud();
    }
    this.setStep(Math.max(0, Math.min(s, this.cur._steps)), dir);
  }

  setStep(n, dir = 1) {
    const slide = this.cur;
    n = Math.max(0, Math.min(slide._steps, n));
    this.step = n;
    slide.dataset.cur = n;
    slide.querySelectorAll('[data-step]').forEach((e) => e.classList.toggle('on', n >= +e.dataset.step));
    slide.querySelectorAll('[data-step-hide]').forEach((e) => e.classList.toggle('off', n >= +e.dataset.stepHide));
    slide.querySelectorAll('.captions > .cap').forEach((e) => {
      const from = +e.dataset.cap || 0;
      const to = e.dataset.capTo != null ? +e.dataset.capTo : from;
      e.classList.toggle('on', n >= from && n <= to);
    });
    try { this.ctrls[this.index]?.step?.(n, dir); } catch (e) { console.error(e); }
    this.updateSteps();
    this.updateHash();
    this.broadcast();
  }

  next(skipSteps = false) {
    if (!skipSteps && this.step < this.cur._steps) this.setStep(this.step + 1, 1);
    else if (this.index < this.total - 1) this.go(this.index + 1, 0, 1);
  }

  prev(skipSteps = false) {
    if (!skipSteps && this.step > 0) this.setStep(this.step - 1, -1);
    else if (this.index > 0) {
      const p = this.slides[this.index - 1];
      this.go(this.index - 1, skipSteps ? 0 : p._steps, -1);
    }
  }

  gotoId(id) {
    const i = this.slides.findIndex((s) => s.id === id);
    if (i >= 0) this.go(i, 0, i >= this.index ? 1 : -1);
  }

  parseHash() {
    const m = /^#\/(\d+)(?:\.(\d+))?/.exec(location.hash);
    if (!m) return { i: 0, s: 0 };
    return { i: Math.max(0, +m[1] - 1), s: +(m[2] || 0) };
  }

  updateHash() {
    const h = `#/${this.index + 1}${this.step ? '.' + this.step : ''}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ------------------------------------------------------------- loop
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden) {
      const t = now / 1000;
      const ctrl = this.ctrls[this.index];
      if (ctrl?.frame) {
        try { ctrl.frame(t, dt); } catch (e) { console.error(e); ctrl.frame = null; }
      }
      this.leaving = this.leaving.filter((l) => l.until > now && l.idx !== this.index);
      for (const l of this.leaving) {
        const c = this.ctrls[l.idx];
        if (c?.frame) { try { c.frame(t, dt); } catch (e) { /* ignore */ } }
      }
    }
    requestAnimationFrame(this.loop);
  }

  // ------------------------------------------------------------- chrome
  buildChrome() {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud-steps"></div>
      <div class="hud-section"><span class="hud-nav"></span><span class="n"></span></div>
      <div class="hud-progress"><i></i></div>`;
    this.stage.appendChild(hud);
    this.hud = hud;
    const hnav = hud.querySelector('.hud-nav');
    hnav.innerHTML = `<button data-go="roadmap" title="All six points (H)">⌂</button>` +
      [1, 2, 3, 4, 5, 6].map((n) => `<button data-go="d${n}" data-slo-nav="${n}" title="Point ${n} (Shift+${n})">${n}</button>`).join('');
    hnav.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) this.gotoId(b.dataset.go);
    });

    const nav = document.createElement('div');
    nav.className = 'navbtns';
    nav.innerHTML = `<button aria-label="Previous" data-a="prev">‹</button><button aria-label="Overview" data-a="ov">▦</button><button aria-label="Next" data-a="next">›</button>`;
    nav.addEventListener('click', (e) => {
      const a = e.target.closest('button')?.dataset.a;
      if (a === 'prev') this.prev();
      if (a === 'next') this.next();
      if (a === 'ov') this.toggleOverview();
      e.target.blur();
    });
    this.viewport.appendChild(nav);

    // overview
    const ov = document.createElement('div');
    ov.id = 'overview';
    ov.className = 'overlay';
    const sections = [];
    this.slides.forEach((s, i) => {
      const sec = s.dataset.section || 'Intro';
      let g = sections.find((x) => x.name === sec);
      if (!g) sections.push((g = { name: sec, items: [] }));
      g.items.push({ i, title: s.dataset.title || `Slide ${i + 1}` });
    });
    ov.innerHTML = `<div class="inner"><h2>All slides</h2><p class="hint">Click a slide to jump · Esc to close</p>${sections
      .map(
        (g) => `<div class="sec"><h3>${g.name}</h3><div class="grid">${g.items
          .map((it) => `<button class="tile" data-i="${it.i}"><div class="n">${String(it.i + 1).padStart(2, '0')}</div><div class="t">${it.title}</div></button>`)
          .join('')}</div></div>`
      )
      .join('')}</div>`;
    ov.addEventListener('click', (e) => {
      const t = e.target.closest('.tile');
      if (t) {
        const i = +t.dataset.i;
        this.go(i, 0, i >= this.index ? 1 : -1);
        this.toggleOverview(false);
      } else if (e.target === ov) this.toggleOverview(false);
    });
    document.body.appendChild(ov);
    this.overview = ov;

    // help
    const help = document.createElement('div');
    help.id = 'help';
    help.className = 'overlay';
    help.innerHTML = `<div class="inner"><h2>Presenter shortcuts</h2><dl>
      <dt><span class="k">→</span><span class="k">Space</span><span class="k">PgDn</span></dt><dd>Next build / slide</dd>
      <dt><span class="k">←</span><span class="k">PgUp</span></dt><dd>Previous</dd>
      <dt><span class="k">Shift</span> + <span class="k">→</span></dt><dd>Skip to next slide</dd>
      <dt><span class="k">F</span></dt><dd>Full screen</dd>
      <dt><span class="k">H</span></dt><dd>Hub: the six points</dd>
      <dt><span class="k">Shift</span> + <span class="k">1</span>…<span class="k">6</span></dt><dd>Open point 1–6 directly</dd>
      <dt><span class="k">O</span></dt><dd>Overview of all slides</dd>
      <dt><span class="k">S</span></dt><dd>Presenter view (notes + timer) in a new window</dd>
      <dt><span class="k">T</span></dt><dd>Switch light / dark (for bright rooms)</dd>
      <dt><span class="k">B</span></dt><dd>Black screen</dd>
      <dt><span class="k">12</span> <span class="k">Enter</span></dt><dd>Jump to slide 12</dd>
      <dt><span class="k">Home</span> <span class="k">End</span></dt><dd>First / last slide</dd>
      </dl></div>`;
    help.addEventListener('click', () => this.toggleHelp(false));
    document.body.appendChild(help);
    this.help = help;

    const black = document.createElement('div');
    black.id = 'blackout';
    black.addEventListener('click', () => black.classList.remove('on'));
    document.body.appendChild(black);
    this.black = black;

    const toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
    this.toastEl = toast;
  }

  updateHud() {
    const s = this.cur;
    const m = /^SLO (\d)/.exec(s.dataset.section || '');
    const cur = m ? m[1] : (s.id === 'roadmap' ? 'hub' : '');
    this.hud.querySelectorAll('.hud-nav button').forEach((b) => {
      b.classList.toggle('cur', cur === 'hub' ? b.dataset.go === 'roadmap' : b.dataset.sloNav === cur);
    });
    this.hud.querySelector('.n').textContent = `${String(this.index + 1).padStart(2, '0')} / ${this.total}`;
    this.hud.querySelector('.hud-progress i').style.width = `${(this.index / (this.total - 1)) * 100}%`;
    this.hud.classList.toggle('hidden', s.dataset.hud === 'off');
    this.overview.querySelectorAll('.tile').forEach((t) => t.classList.toggle('cur', +t.dataset.i === this.index));
  }

  updateSteps() {
    const wrap = this.hud.querySelector('.hud-steps');
    const n = this.cur._steps;
    if (wrap.childElementCount !== n + 1 || n === 0) {
      wrap.innerHTML = n > 0 ? '<i></i>'.repeat(n + 1) : '';
    }
    [...wrap.children].forEach((d, k) => d.classList.toggle('on', k <= this.step));
  }

  markDone(n) {
    this.done.add(String(n));
    document.querySelectorAll(`[data-slo-nav="${n}"], #roadmap .tile[data-slo="${n}"]`).forEach((el) => el.classList.add('done'));
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('on');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('on'), 1600);
  }

  toggleOverview(force) {
    const open = force ?? !this.overview.classList.contains('open');
    this.overview.classList.toggle('open', open);
    if (open) this.overview.querySelector('.tile.cur')?.scrollIntoView({ block: 'center' });
  }

  toggleHelp(force) {
    const open = force ?? !this.help.classList.contains('open');
    this.help.classList.toggle('open', open);
  }

  // ------------------------------------------------------------- theme
  restoreTheme() {
    let t = 'dark';
    try { t = localStorage.getItem('iron-deck-theme') || 'dark'; } catch (_) { /* ignore */ }
    document.documentElement.dataset.theme = t;
  }

  toggleTheme() {
    const next = (document.documentElement.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('iron-deck-theme', next); } catch (_) { /* ignore */ }
    this.themeCbs.forEach((cb) => { try { cb(next); } catch (e) { console.error(e); } });
    this.toast(next === 'light' ? 'Light mode' : 'Dark mode');
  }

  // ------------------------------------------------------------- input
  bindInput() {
    window.addEventListener('keydown', (e) => this.onKey(e));

    // mouse presence → show nav buttons, hide cursor when idle
    let idleT;
    window.addEventListener('mousemove', () => {
      this.viewport.classList.add('mouse');
      this.viewport.classList.remove('idle');
      clearTimeout(idleT);
      idleT = setTimeout(() => this.viewport.classList.add('idle'), 2600);
    });

    // touch swipe
    let sx = 0, sy = 0, st = 0, tracking = false;
    this.viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      tracking = true; sx = e.clientX; sy = e.clientY; st = performance.now();
    });
    this.viewport.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (performance.now() - st < 700 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (e.target.closest('.scrub, .no-swipe')) return;
        dx < 0 ? this.next() : this.prev();
      }
    });

    // keep buttons from keeping focus (so arrows/space always navigate)
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) setTimeout(() => b.blur(), 0);
    });
  }

  onKey(e) {
    if (e.target.matches?.('input, textarea, [contenteditable]')) return;
    const k = e.key;
    const overlayOpen = this.overview.classList.contains('open') || this.help.classList.contains('open');

    if (e.shiftKey && /^Digit[1-6]$/.test(e.code)) {
      e.preventDefault();
      this.toggleOverview(false); this.toggleHelp(false);
      this.gotoId(`d${e.code.slice(5)}`);
      return;
    }

    if (/^[0-9]$/.test(k) && !e.metaKey && !e.ctrlKey) {
      this.numBuf += k;
      clearTimeout(this._numT);
      this._numT = setTimeout(() => (this.numBuf = ''), 1800);
      this.toast(`Go to slide ${this.numBuf}…`);
      return;
    }

    switch (k) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'n':
      case 'N':
        e.preventDefault();
        if (overlayOpen) return;
        this.black.classList.remove('on');
        this.next(e.shiftKey);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.numBuf) {
          const n = parseInt(this.numBuf, 10);
          this.numBuf = '';
          this.go(n - 1, 0, n - 1 >= this.index ? 1 : -1);
          this.toggleOverview(false);
        } else if (!overlayOpen) this.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
      case 'p':
      case 'P':
        e.preventDefault();
        if (overlayOpen) return;
        this.black.classList.remove('on');
        this.prev(e.shiftKey);
        break;
      case 'Home':
        e.preventDefault(); this.go(0, 0, -1); break;
      case 'End':
        e.preventDefault(); this.go(this.total - 1, 0, 1); break;
      case 'f':
      case 'F':
      case 'F5':
        e.preventDefault(); this.toggleFullscreen(); break;
      case 'o':
      case 'O':
      case 'g':
      case 'G':
        e.preventDefault(); this.toggleHelp(false); this.toggleOverview(); break;
      case 'Escape':
        if (overlayOpen) { this.toggleOverview(false); this.toggleHelp(false); }
        this.black.classList.remove('on');
        break;
      case 't':
      case 'T':
        this.toggleTheme(); break;
      case 'b':
      case 'B':
      case '.':
        this.black.classList.toggle('on'); break;
      case 's':
      case 'S':
        this.openPresenter(); break;
      case '?':
        this.toggleOverview(false); this.toggleHelp(); break;
      case 'h':
      case 'H':
        this.toggleOverview(false); this.toggleHelp(false); this.black.classList.remove('on');
        this.gotoId('roadmap'); break;
      default:
        break;
    }
  }

  toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {});
    else d.exitFullscreen?.();
  }

  // ------------------------------------------------------------- presenter
  openPresenter() {
    window.open('presenter.html', 'iron-presenter', 'width=1280,height=820');
    setTimeout(() => this.broadcast(), 600);
  }

  broadcast() {
    if (!this.channel || this.index < 0) return;
    const s = this.cur;
    const nx = this.slides[this.index + 1];
    this.channel.postMessage({
      type: 'state',
      index: this.index,
      total: this.total,
      step: this.step,
      steps: s._steps,
      title: s.dataset.title || '',
      section: s.dataset.section || '',
      notes: s.querySelector('aside.notes')?.innerHTML || '',
      next: nx ? nx.dataset.title || '' : '— End —',
      list: this.slides.map((x) => x.dataset.title || ''),
    });
  }

  onRemote(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'hello') this.broadcast();
    if (msg.type === 'next') this.next();
    if (msg.type === 'prev') this.prev();
    if (msg.type === 'goto') this.go(+msg.index || 0, 0, (+msg.index || 0) >= this.index ? 1 : -1);
    if (msg.type === 'black') this.black.classList.toggle('on');
  }
}
