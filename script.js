// VisionNav page: scroll reveals, spoken earpiece lines, the day carousel,
// the animation player and the button-panel simulator.
document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- reveal on scroll ---- */
(() => {
  const els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px 15% 0px' });
  els.forEach(e => io.observe(e));
})();

/* ---- nav border once the page scrolls ---- */
(() => {
  const nav = document.getElementById('nav');
  const upd = () => nav.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', upd, { passive: true });
  upd();
})();

/* ---- "hear this line": read an earpiece line aloud ---- */
(() => {
  if (!('speechSynthesis' in window)) return;
  let current = null;
  const stop = () => { speechSynthesis.cancel(); current?.classList.remove('on'); current = null; };
  document.querySelectorAll('.hear').forEach(btn => {
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const was = current;
      stop();
      if (was === btn) return;
      const text = btn.closest('.ear').querySelector('.ear-text').textContent.replace(/[“”]/g, '');
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.onend = u.onerror = () => { if (current === btn) { btn.classList.remove('on'); current = null; } };
      current = btn;
      btn.classList.add('on');
      speechSynthesis.speak(u);
    });
  });
})();

/* ---- hero earpiece ticker ---- */
(() => {
  const lines = [
    '“Chair at 2 o\'clock, 6 feet.”',
    '“Turn right, to 2 o\'clock. 12 feet.”',
    '“The cup is behind you, 4 feet.”',
    '“Left 2 inches… Stop. The cup is at your hand.”',
    '“You have arrived. The chair is at 12 o\'clock, within reach.”',
  ];
  const ear = document.getElementById('earLine');
  if (!ear || reduceMotion) return;
  const btn = ear.closest('.ear').querySelector('.hear');
  let i = 0;
  setInterval(() => {
    if (document.hidden || btn?.classList.contains('on')) return;
    i = (i + 1) % lines.length;
    ear.style.opacity = 0;
    setTimeout(() => { ear.textContent = lines[i]; ear.style.opacity = 1; }, 300);
  }, 3600);
})();

/* ---- scroll progress bar ---- */
(() => {
  const bar = document.getElementById('progress');
  if (!bar) return;
  const upd = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max) : 0);
  };
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  upd();
})();

/* ---- a day: sideways rail with arrows and dots ---- */
(() => {
  const rail = document.getElementById('rail');
  if (!rail) return;
  const slides = [...rail.querySelectorAll('.slide')];
  const ctl = document.querySelector('.rail-ctl');
  const [prev, next] = ctl.querySelectorAll('.rail-btn');
  const dots = document.getElementById('railDots');
  slides.forEach(() => dots.appendChild(document.createElement('span')));
  ctl.hidden = false;
  let cur = -1;
  const pad = () => parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
  function mark() {
    const x = rail.scrollLeft + pad();
    let best = 0;
    slides.forEach((sl, i) => { if (Math.abs(sl.offsetLeft - x) < Math.abs(slides[best].offsetLeft - x)) best = i; });
    if (best === cur) return;
    cur = best;
    slides.forEach((sl, i) => sl.classList.toggle('cur', i === cur));
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === cur));
    prev.disabled = cur === 0;
    next.disabled = cur === slides.length - 1;
  }
  const go = i => rail.scrollTo({ left: slides[i].offsetLeft - pad(), behavior: reduceMotion ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => go(Math.max(0, cur - 1)));
  next.addEventListener('click', () => go(Math.min(slides.length - 1, cur + 1)));
  rail.addEventListener('keydown', e => {
    if (e.target !== rail) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.min(slides.length - 1, cur + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.max(0, cur - 1)); }
  });
  // clicking a faded neighbour brings it to the front
  slides.forEach((sl, i) => sl.addEventListener('click', e => {
    if (i === cur) return;
    e.preventDefault();
    e.stopPropagation();
    go(i);
  }, true));
  rail.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  addEventListener('resize', mark);
  mark();
})();

/* ---- cards light up where the pointer is ---- */
document.querySelectorAll('.glowcard').forEach(el => el.addEventListener('pointermove', e => {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}));

/* ---- result numbers count up once ---- */
(() => {
  const els = document.querySelectorAll('.count');
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 1400), v = to * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  els.forEach(el => io.observe(el));
})();

/* ---- animation player: pick a clip; it loops silently while on screen ---- */
(() => {
  const v = document.getElementById('watchVid');
  if (!v) return;
  const player = v.closest('.player');
  const list = player.querySelector('.player-list');
  const btns = [...list.querySelectorAll('.pl')];
  const ext = v.canPlayType('video/webm; codecs="vp9"') ? 'webm' : 'mp4';
  player.classList.add('ready');
  list.hidden = false;
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', x === b));
    v.poster = `assets/${b.dataset.v}-poster.webp`;
    v.src = `assets/${b.dataset.v}.${ext}`;
    v.setAttribute('aria-label', b.dataset.label);
    if (!reduceMotion) v.play().catch(() => {});
  }));
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }, { threshold: .4 }).observe(v);
})();

/* ---- demo video: YouTube loads only when you press play ---- */
(() => {
  const link = document.getElementById('ytLink');
  if (!link) return;
  link.addEventListener('click', e => {
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${link.dataset.id}?autoplay=1&rel=0`;
    f.title = 'VisionNav: what if AI could be your eyes? (YouTube)';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    link.replaceWith(f);
    f.focus();
  });
})();

/* ---- footer email / phone: show the detail instead of opening an app ---- */
(() => {
  const btns = [...document.querySelectorAll('.reveal button')];
  const close = except => btns.forEach(b => {
    if (b === except) return;
    b.setAttribute('aria-expanded', 'false');
    document.getElementById(b.getAttribute('aria-controls')).hidden = true;
  });
  btns.forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const open = b.getAttribute('aria-expanded') !== 'true';
    close(b);
    b.setAttribute('aria-expanded', open);
    document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
  }));
  document.addEventListener('click', e => { if (!e.target.closest('.reveal')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

/* ---- silent loops (live map) play only while on screen ---- */
(() => {
  const vids = document.querySelectorAll('video[data-auto]');
  if (reduceMotion || !('IntersectionObserver' in window)) { vids.forEach(v => { v.controls = true; }); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
  }), { threshold: .35 });
  vids.forEach(v => io.observe(v));
})();

/* ---- button-panel simulator ---- */
(() => {
  const sim = document.getElementById('sim');
  const log = document.getElementById('log');
  if (!sim || !log) return;

  const HOLD_MS = 600, DOUBLE_MS = 300;
  const st = { sensors: false, outdoor: false, hand: false, face: false, nav: false, sound: false };
  let seqTimers = [];

  /* output */
  function add(cls, text) {
    const li = document.createElement('li');
    li.className = cls;
    li.textContent = text;
    log.appendChild(li);
    while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function say(text) {
    add('say', text);
    if (st.sound && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      speechSynthesis.speak(u);
    }
  }
  const you = t => add('you', t);
  // Run [delayMs, fn] steps one after another; cancellable with stopSeq().
  function seq(steps) {
    let t = 0;
    steps.forEach(([d, fn]) => { t += d; seqTimers.push(setTimeout(fn, t)); });
  }
  function stopSeq() {
    seqTimers.forEach(clearTimeout);
    seqTimers = [];
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function stopNav() { stopSeq(); st.nav = false; }

  function leds() {
    const set = (id, on, label) => {
      const el = document.getElementById(id);
      el.classList.toggle('on', on);
      if (label) el.textContent = label;
    };
    set('ledSensors', st.sensors);
    set('ledMode', st.sensors && !st.outdoor, st.outdoor ? 'outdoor' : 'indoor');
    document.getElementById('ledMode').classList.toggle('alt', st.sensors && st.outdoor);
    set('ledHand', st.hand);
    set('ledFace', st.face);
    set('ledNav', st.nav);
  }

  /* what each gesture does: mirrors the real rig's button table */
  const actions = {
    SENSORS(g) {
      if (g === 'hold') {
        if (!st.sensors) return say('Sensors are already off.');
        stopNav(); Object.assign(st, { sensors: false, hand: false, face: false });
        return say('Sensors turned off.');
      }
      if (st.sensors) return say('Sensors are already on.');
      st.sensors = true;
      say('Sensors turned on.');
      seq([[900, () => say(st.outdoor ? 'Outdoor mode.' : 'Indoor mode. Mapping the room.')]]);
    },
    LOOK(g) {
      if (g === 'double') { stopSeq(); return say('Vision AI off.'); }
      if (g === 'hold') {
        you('What colour is the bottle on the table?');
        return seq([[1200, () => say('The bottle is red.')]]);
      }
      say('Looking.');
      seq([[1300, () => say(st.outdoor
        ? 'A pavement with shops on the left. A zebra crossing ahead, and a parked car at 1 o\'clock.'
        : 'A desk with a laptop and two bottles. A chair to your right, and a door beyond it.')]]);
    },
    MODE(g) {
      stopNav();
      if (g === 'hold') {
        Object.assign(st, { hand: false, face: false });
        return say('Map and camera closed. This session is forgotten.');
      }
      st.outdoor = !st.outdoor;
      if (st.outdoor) {
        say('Outdoor mode.');
        seq([[1600, () => say('Kerb at 12 o\'clock, 5 feet. Step up.')]]);
      } else {
        say('Indoor mode. Mapping the room.');
      }
    },
    HAND(g) {
      if (g === 'double') {
        stopSeq();
        if (st.face) { Object.assign(st, { face: false, hand: false }); return say('Face and hand mode off.'); }
        st.face = true;
        say('Face mode on.');
        return seq([[1500, () => say('Kamal is at 1 o\'clock, 8 feet.')]]);
      }
      if (g === 'hold') {
        if (!st.hand) return say('Tap HAND first to turn on hand mode.');
        you('Cup');
        return seq([
          [900, () => say('Looking for the cup.')],
          [1300, () => say('Left 2 inches.')],
          [1300, () => say('Forward 4 inches.')],
          [1300, () => say('Down 1 inch.')],
          [1300, () => say('Stop. The cup is at your hand.')],
        ]);
      }
      st.hand = !st.hand;
      say(st.hand ? 'Hand mode on.' : 'Hand mode off.');
    },
    TALK(g) {
      if (g === 'double') { stopNav(); return say('Navigation stopped.'); }
      if (g === 'hold') {
        if (st.outdoor) return say('Navigation works in indoor mode. Tap MODE to switch.');
        stopNav();
        st.nav = true;
        you('Take me to the chair next to the door');
        return seq([
          [1000, () => say('Going to the chair next to the door.')],
          [1600, () => say('Turn to your 2 o\'clock, then walk 6 feet.')],
          [2400, () => say('Bear slightly left.')],
          [2000, () => say('Almost there. 2 feet.')],
          [1800, () => { st.nav = false; leds(); say('You have arrived. The chair is in front of you.'); }],
        ]);
      }
      say(st.outdoor
        ? 'Path clear ahead. Zebra crossing at 12 o\'clock, 20 feet.'
        : 'Chair at 2 o\'clock, 6 feet. Table at 12 o\'clock, 4 feet. Door at 11 o\'clock, 12 feet.');
    },
  };

  function act(b, g) {
    add('ev', `${b} · ${g === 'double' ? 'double tap' : g}`);
    if (b !== 'SENSORS' && !st.sensors) say('Sensors are off. Tap SENSORS first.');
    else actions[b](g);
    leds();
  }

  /* gesture detection: tap / hold / double tap, by pointer or keys 1–5 */
  const btns = [...sim.querySelectorAll('.rb')];
  const g = new Map(btns.map(el => [el, { down: false, held: false, holdT: 0, tapT: 0 }]));

  function press(el) {
    const s = g.get(el);
    if (s.down) return;
    s.down = true; s.held = false;
    el.classList.add('down', 'holding');
    s.holdT = setTimeout(() => {
      s.held = true;
      el.classList.remove('holding');
      clearTimeout(s.tapT); s.tapT = 0;
      act(el.dataset.b, 'hold');
    }, HOLD_MS);
  }
  function release(el) {
    const s = g.get(el);
    if (!s.down) return;
    s.down = false;
    el.classList.remove('down', 'holding');
    clearTimeout(s.holdT);
    if (s.held) return;
    if (s.tapT) { clearTimeout(s.tapT); s.tapT = 0; act(el.dataset.b, 'double'); return; }
    s.tapT = setTimeout(() => { s.tapT = 0; act(el.dataset.b, 'tap'); }, DOUBLE_MS);
  }

  btns.forEach(el => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); press(el); });
    el.addEventListener('pointerup', () => release(el));
    el.addEventListener('pointercancel', () => release(el));
    el.addEventListener('contextmenu', e => e.preventDefault());
    // keyboard users on a focused button: Space/Enter behave like the finger
    el.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(el); } });
    el.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(el); });
  });

  const byKey = Object.fromEntries(btns.map(el => [el.dataset.k, el]));
  const inView = () => { const r = sim.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  addEventListener('keydown', e => {
    const el = byKey[e.key];
    if (!el || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !inView()) return;
    e.preventDefault(); press(el);
  });
  addEventListener('keyup', e => { const el = byKey[e.key]; if (el) release(el); });

  const snd = document.getElementById('soundBtn');
  if (!('speechSynthesis' in window)) snd.hidden = true;
  snd.addEventListener('click', () => {
    st.sound = !st.sound;
    snd.setAttribute('aria-pressed', st.sound);
    snd.textContent = 'Sound: ' + (st.sound ? 'on' : 'off');
    if (!st.sound) speechSynthesis.cancel();
  });

  add('hint', 'Tap SENSORS to start.');
  leds();
})();
