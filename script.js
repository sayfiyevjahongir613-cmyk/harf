(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const stage = $('stage'), lamp = $('lamp'), pull = $('pull'), hint = $('hint');
  const message = $('message'), row = $('row'), sI = $('sI'), sH = $('sH'), sY = $('sY');
  const wl = $('wl'), wr = $('wr'), bigF = $('bigF'), flash = $('flash');
  const cv = $('fx'), ctx = cv.getContext('2d');

  /* ---------- Audio ---------- */
  const audio = new Audio('music.mp3');
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 1;

  /* ---------- Helpers ---------- */
  const HEART = '\u2665\uFE0E';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const ease = {
    io: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    in: t => t * t,
    out: t => 1 - Math.pow(1 - t, 3)
  };

  function tween(ms, fn, e = ease.io) {
    return new Promise(res => {
      const t0 = performance.now();
      (function f(now) {
        const p = Math.min(1, (now - t0) / ms);
        fn(e(p), p);
        p < 1 ? requestAnimationFrame(f) : res();
      })(t0);
    });
  }

  function fadeTo(v, ms) {
    const from = audio.volume;
    return tween(ms, e => {
      audio.volume = Math.max(0, Math.min(1, from + (v - from) * e));
    });
  }

  /* ---------- Canvas / sizing ---------- */
  let W = 0, H = 0, DPR = 1, K = 1, V = 1;
  const heartScale = () => Math.min(W * 0.9 / 34, H * 0.6 / 32);

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    K = Math.max(.7, Math.min(W, H) / 420);
    V = Math.max(.7, Math.min(1.6, H / 700));
    bigF.style.setProperty('--fsz', heartScale() * 11 + 'px');
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- Entities ---------- */
  const pieces = [], hearts = [], letters = [], rings = [], finals = [];
  let finalT0 = 0;

  const RAIN_COLORS = ['#ff2d55', '#ff6fa5', '#ff9f1c', '#ffd60a', '#bf5af2', '#5ac8fa', '#30d158', '#ff453a', '#ffffff'];
  const FINAL_COLORS = ['#ff2d55', '#ff4f8b', '#ff7aa8', '#ff9ec0', '#ffd6e5', '#ff3b6b'];
  const SPARK_COLORS = ['#ffffff', '#ffd6e5', '#ff7aa8', '#ff3b6b', '#ffd36b', '#ffffff'];

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - loop.last) / 1000 || 0);
    loop.last = now;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* final hearts forming the big heart */
    if (finals.length) {
      const T = (now - finalT0) / 1000;
      const s = heartScale();
      const beat = 1 + Math.min(1, Math.max(0, (T - 2.6) / 1)) * .03 * Math.sin(T * 4.2);
      ctx.globalCompositeOperation = 'source-over';
      for (const f of finals) {
        const p = Math.min(1, Math.max(0, (T - f.d) / f.dur));
        if (p <= 0) continue;
        const e = ease.out(p);
        const tx = W / 2 + f.u * s * beat;
        const ty = H / 2 - f.v * s * beat;
        const x = f.x0 + (tx - f.x0) * e;
        const y = f.y0 + (ty - f.y0) * e;
        const sz = f.sz * s * (1 + (p >= 1 ? .12 * Math.sin(T * 3 + f.ph) : 0));
        ctx.globalAlpha = Math.min(1, p * 4);
        ctx.fillStyle = f.col;
        ctx.font = `${sz}px system-ui, sans-serif`;
        ctx.fillText(HEART, x, y);
      }
      ctx.globalAlpha = 1;
    }

    /* falling hearts */
    ctx.globalCompositeOperation = 'source-over';
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.y += h.vy * dt;
      h.t += dt;
      if (h.y > H + h.size) { hearts.splice(i, 1); continue; }
      const sw = Math.sin(h.t * h.f + h.ph);
      ctx.save();
      ctx.translate(h.x + sw * h.amp, h.y);
      ctx.rotate(sw * .35);
      ctx.font = `${h.size}px system-ui, sans-serif`;
      ctx.fillStyle = h.col;
      ctx.fillText(HEART, 0, 0);
      ctx.restore();
    }

    /* falling F letters */
    if (letters.length) {
      ctx.shadowColor = '#ee5316';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#e6c234';
      for (let i = letters.length - 1; i >= 0; i--) {
        const l = letters[i];
        l.y += l.vy * dt;
        if (l.y > H + l.size) { letters.splice(i, 1); continue; }
        ctx.font = `800 ${l.size}px system-ui, sans-serif`;
        ctx.fillText('M', l.x, l.y);
      }
      ctx.shadowBlur = 0;
    }

    /* shockwave rings */
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt;
      const p = r.life / r.dur;
      if (p >= 1) { rings.splice(i, 1); continue; }
      ctx.globalAlpha = (1 - p) * .8;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * (1 - p) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + (r.max - 10) * ease.out(p), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* explosion sparks */
    if (pieces.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.life += dt;
        if (p.life >= p.max) { pieces.splice(i, 1); continue; }
        p.vx *= .99;
        p.vy = p.vy * .99 + 140 * K * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.pow(1 - p.life / p.max, 1.4);
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  loop.last = performance.now();
  requestAnimationFrame(loop);

  /* ---------- Step 2: squeeze ---------- */
  let M = null;

  function setup() {
    const r = sH.getBoundingClientRect();
    M = {
      hcx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      wI: sI.offsetWidth,
      wY: sY.offsetWidth,
      hw: sH.offsetWidth,
      fs: parseFloat(getComputedStyle(row).fontSize)
    };
    wl.style.top = wr.style.top = M.cy + 'px';
    pos(1, 1, 0);
  }

  function pos(s, hsx, dx) {
    const c = M.hcx + dx;
    const hh = (M.hw / 2) * hsx;
    wl.style.left = c - hh - M.wI * s - 2 + 'px';
    wr.style.left = c + hh + M.wY * s + 2 + 'px';
    sI.style.transform = `scaleX(${s})`;
    sY.style.transform = `scaleX(${s})`;
    row.style.transform = `translateX(${dx}px)`;
    sH.style.transform = `scaleX(${hsx}) scaleY(${1 + (1 - hsx) * .8})`;
  }

  async function squeeze() {
    const dx = W / 2 - M.hcx;
    await tween(3200, e => pos(Math.max(0, 1 - e), 1, dx * e));
    await tween(750, (e, p) => {
      const shake = Math.sin(p * 60) * 3 * p;
      pos(0, 1 - .55 * e, dx + shake);
    }, ease.in);
  }

  /* ---------- Burst ---------- */
  function burst() {
    const cx = W / 2, cy = M.cy;
    const n = W < 600 ? 560 : 850;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = (70 + Math.pow(Math.random(), 1.6) * 640) * K;
      pieces.push({
        x: cx + rand(-.5, .5) * M.hw,
        y: cy + rand(-.6, .6) * M.fs,
        vx: Math.cos(a) * sp * 1.25,
        vy: Math.sin(a) * sp,
        life: 0,
        max: rand(1.4, 3.2),
        size: rand(1, 3.4) * K,
        col: pick(SPARK_COLORS)
      });
    }
    rings.push({ x: cx, y: cy, life: 0, dur: 1.1, max: Math.max(W, H) * .7 });
    flash.style.transition = 'none';
    flash.style.opacity = .55;
    requestAnimationFrame(() => {
      flash.style.transition = 'opacity .7s ease-out';
      flash.style.opacity = 0;
    });
    message.classList.add('gone');
    lamp.classList.add('gone');
    stage.classList.add('soft');
  }

  /* ---------- Step 3: heart rain (4s) ---------- */
  function heartRain(ms) {
    const t0 = performance.now();
    const id = setInterval(() => {
      if (performance.now() - t0 > ms) { clearInterval(id); return; }
      for (let i = 0; i < 2; i++) {
        hearts.push({
          x: rand(0, W),
          y: -40,
          vy: rand(190, 440) * V,
          size: rand(14, 54) * K,
          col: pick(RAIN_COLORS),
          amp: rand(8, 30) * K,
          f: rand(1.2, 3),
          ph: rand(0, 6.28),
          t: 0
        });
      }
    }, 45);
  }

  /* ---------- Step 4: small F letters ---------- */
function letterRain(ms) {
  return new Promise(res => {
    const t0 = performance.now();
    const id = setInterval(() => {
      if (performance.now() - t0 > ms) { clearInterval(id); res(); return; }
      letters.push({
        x: rand(14, W - 14),
        y: -30,
        vy: rand(110, 220) * V,   // sekinroq (avval 230–460)
        size: rand(16, 30) * K
      });
    }, 45);                       // ko'proq (avval 110 ms)
  });
}

  /* ---------- Step 5: big F + heart of hearts ---------- */
  async function dropF() {
    bigF.style.opacity = 1;
    const a = bigF.animate([
      { transform: 'translate(-50%,-50%) translateY(-120vh)', easing: 'cubic-bezier(.5,0,.9,.5)' },
      { transform: 'translate(-50%,-50%) translateY(0)', offset: .62, easing: 'ease-out' },
      { transform: 'translate(-50%,-50%) translateY(-5vh)', offset: .78, easing: 'ease-in' },
      { transform: 'translate(-50%,-50%) translateY(0)' }
    ], { duration: 1900, fill: 'forwards' });
    await a.finished;
    bigF.classList.add('pulse');
  }

  function heartPts(n, k) {
    const M_ = 600, P = [], L = [0];
    for (let i = 0; i <= M_; i++) {
      const t = i / M_ * Math.PI * 2;
      P.push([
        16 * Math.pow(Math.sin(t), 3),
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5
      ]);
      if (i) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    }
    const tot = L[M_], out = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const d = i / n * tot;
      while (L[j + 1] < d) j++;
      const a = (d - L[j]) / (L[j + 1] - L[j]);
      out.push([
        (P[j][0] + (P[j + 1][0] - P[j][0]) * a) * k,
        (P[j][1] + (P[j + 1][1] - P[j][1]) * a) * k
      ]);
    }
    return out;
  }

  function startFinal() {
    const R = Math.max(W, H) * .8;
    const make = (pts, szMin, szMax) => pts.forEach(([u, v]) => {
      const a = rand(0, Math.PI * 2);
      finals.push({
        u, v,
        x0: W / 2 + Math.cos(a) * R,
        y0: H / 2 + Math.sin(a) * R,
        d: rand(0, 1.4),
        dur: rand(1.2, 2),
        sz: rand(szMin, szMax),
        col: pick(FINAL_COLORS),
        ph: rand(0, 6.28)
      });
    });
    make(heartPts(120, 1), 1.25, 1.85);
    make(heartPts(70, .7), .95, 1.4);
    finalT0 = performance.now();
  }

  function land() {
    flash.style.transition = 'none';
    flash.style.opacity = .8;
    requestAnimationFrame(() => {
      flash.style.transition = 'opacity 1.2s ease-out';
      flash.style.opacity = 0;
    });
    rings.push({ x: W / 2, y: H / 2, life: 0, dur: 1.4, max: Math.max(W, H) * .8 });
    stage.classList.add('final');
    fadeTo(.95, 1600);
    startFinal();
  }

  /* ---------- Main sequence ---------- */
  async function run() {
    stage.classList.add('pulled');
    hint.classList.add('hide');

    // 1) lamp + music (user gesture allows audio)
    try { audio.currentTime = 0; } catch (_) {}
    audio.volume = 1;
    audio.play().catch(() => {});
    await sleep(300);
    lamp.classList.add('on');
    stage.classList.add('lit');
    await sleep(900);

    // 2) "I ♥ YOU" between walls, squeeze, burst
    setup();
    message.classList.add('show');
    await sleep(2200);
    await squeeze();
    burst();
    await sleep(500);

    // 3) heart rain (4 s)
    heartRain(4000);
    await sleep(5500);

    // 4) darkness, volume down, small F letters
    stage.classList.remove('lit', 'soft');
    fadeTo(.2, 1800);
    await sleep(1800);
    await letterRain(4500);   // avval 3200, harflar uzoqroq yog'adi
    await sleep(2500);        // avval 900, sekin harflar tushib bo'lishi uchun

    // 5) big F, light returns, heart of hearts
    await dropF();
    land();
  }

  let started = false;
  const trigger = e => {
    if (e) e.preventDefault();
    if (started) return;
    started = true;
    run();
  };
  pull.addEventListener('pointerdown', trigger);
  pull.addEventListener('click', trigger); // keyboard (Enter / Space)
})();