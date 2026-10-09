// VisionNav page: scroll reveals, the hero radar, and the button-panel simulator.
document.documentElement.classList.add('js');

/* ---- reveal on scroll ---- */
(() => {
  const els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
})();

/* ---- hero radar: clock marks, LiDAR wall points, earpiece ticker ---- */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const cx = 200, cy = 240;
  const clock = document.getElementById('clockMarks');
  const walls = document.getElementById('wallDots');
  if (!clock || !walls) return;

  // 12 o'clock is straight ahead; only the front half (9 to 3) is drawn.
  [9, 10, 11, 12, 1, 2, 3].forEach(h => {
    const a = ((h % 12) > 6 ? (h % 12) - 12 : (h % 12)) * Math.PI / 6;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', (cx + 158 * Math.sin(a)).toFixed(1));
    t.setAttribute('y', (cy - 158 * Math.cos(a) + 4).toFixed(1));
    t.setAttribute('text-anchor', 'middle');
    t.textContent = h;
    clock.appendChild(t);
  });

  // A room outline as the LiDAR sees it: left wall, front wall with a door gap, right wall.
  const segs = [[[40, 236], [40, 66]], [[40, 66], [90, 66]], [[118, 66], [372, 66]], [[372, 66], [372, 236]],
                [[250, 236], [250, 214]], [[250, 214], [372, 214]]];
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  segs.forEach(([[x1, y1], [x2, y2]]) => {
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 9));
    for (let i = 0; i <= n; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (x1 + (x2 - x1) * i / n + (rnd() - .5) * 3).toFixed(1));
      c.setAttribute('cy', (y1 + (y2 - y1) * i / n + (rnd() - .5) * 3).toFixed(1));
      c.setAttribute('r', 1.6);
      walls.appendChild(c);
    }
  });

  const lines = [
    '“Chair at 2 o\'clock, 6 feet.”',
    '“Table at 12 o\'clock, 4 feet. Bear right.”',
    '“Door at 11 o\'clock, 12 feet.”',
    '“Almost there. 2 feet.”',
    '“You have arrived. The chair is in front of you.”',
  ];
  const ear = document.getElementById('earLine');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    i = (i + 1) % lines.length;
    ear.style.opacity = 0;
    setTimeout(() => { ear.textContent = lines[i]; ear.style.opacity = 1; }, 300);
  }, 3200);
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
        return seq([[1500, () => say('Alex is at 1 o\'clock, 8 feet.')]]);
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
