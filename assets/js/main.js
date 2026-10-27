/* A.Nails Ongles · Brest — comportement et mouvement
   Couche 1 (toujours) : statut d'ouverture, menu, avis, atelier, navigation.
   Couche 2 (si mouvement autorisé) : GSAP + ScrollTrigger + SplitText + Lenis. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  let lenis = null;
  const scrollLock = (on) => {
    if (lenis) { on ? lenis.stop() : lenis.start(); }
    else { doc.body.style.overflow = on ? 'hidden' : ''; }
  };

  /* ------------------------------------------------------------------
     Horaires et statut « ouvert / fermé » (fuseau Europe/Paris)
     ------------------------------------------------------------------ */
  const HOURS = { 0: null, 1: [570, 1140], 2: [570, 1140], 3: null, 4: [750, 1140], 5: [660, 1140], 6: [570, 840] };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const fmt = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;

  function parisNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
    return { day: WD[p.weekday], min: (+p.hour) * 60 + (+p.minute) };
  }

  function updateStatus() {
    const { day, min } = parisNow();
    const el = $('#status'); const txt = $('#status-text');
    $$('.hours tr').forEach((tr) => tr.classList.toggle('is-today', +tr.dataset.day === day));
    if (!el || !txt) return;
    const today = HOURS[day];
    let open = false; let msg;
    if (today && min >= today[0] && min < today[1]) {
      open = true; msg = `Ouvert · jusqu’à ${fmt(today[1])}`;
    } else if (today && min < today[0]) {
      msg = `Fermé · ouvre aujourd’hui à ${fmt(today[0])}`;
    } else {
      for (let i = 1; i <= 7; i++) {
        const nd = (day + i) % 7;
        if (HOURS[nd]) { msg = `Fermé · ouvre ${i === 1 ? 'demain' : DAYS[nd]} à ${fmt(HOURS[nd][0])}`; break; }
      }
    }
    el.classList.toggle('is-open', open);
    txt.textContent = msg;
  }
  updateStatus();
  setInterval(updateStatus, 60000);
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Navigation : masquage au scroll, progression, bouton flottant, menu
     ------------------------------------------------------------------ */
  const nav = $('#nav'); const fab = $('#fab'); const bar = $('.progress span');
  const burger = $('#burger'); const menu = $('#menu');
  let lastY = window.scrollY; let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = doc.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 40);
      const menuOpen = menu && menu.classList.contains('is-open');
      if (!menuOpen) {
        if (y > 160 && y > lastY + 5) nav.classList.add('is-hidden');
        else if (y < lastY - 5 || y <= 160) nav.classList.remove('is-hidden');
      }
    }
    if (fab) fab.classList.toggle('is-on', y > window.innerHeight * 0.75);
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    if (open) nav.classList.remove('is-hidden');
    scrollLock(open);
    if (open) { const first = $('a', menu); if (first) setTimeout(() => first.focus({ preventScroll: true }), 500); }
    else { burger.focus({ preventScroll: true }); }
  }
  if (burger) burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) setMenu(false); });

  // Ancres : défilement fluide (Lenis si actif, sinon natif)
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 ? $(id) : null;
    if (!target && id !== '#accueil') return;
    e.preventDefault();
    const wasOpen = menu && menu.classList.contains('is-open');
    if (wasOpen) { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu'); scrollLock(false); }
    const go = () => {
      if (lenis) lenis.scrollTo(target || 0, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else (target || doc.body).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    };
    wasOpen ? setTimeout(go, 350) : go();
  });

  /* ------------------------------------------------------------------
     Avis : onglets accessibles + rotation automatique
     ------------------------------------------------------------------ */
  (function reviews() {
    const section = $('.reviews'); if (!section) return;
    const tabs = $$('.rtab', section); const panels = $$('.rev', section);
    const list = $('.reviews__tabs', section); const body = $('.reviews__body', section);
    panels[0].classList.add('rev--long');
    let index = 0; let auto = !reduce; let visible = false;

    function placeBar() {
      const t = tabs[index]; if (!t || !list) return;
      list.style.setProperty('--y', `${t.offsetTop}px`);
      list.style.setProperty('--h', `${t.offsetHeight}px`);
    }
    function select(i, user) {
      index = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { const on = k === index; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p, k) => { const on = k === index; p.classList.toggle('is-active', on); p.hidden = !on; });
      placeBar();
      if (user) { auto = false; section.classList.remove('is-auto'); }
      const t = tabs[index];
      if (list && list.scrollWidth > list.clientWidth) list.scrollTo({ left: t.offsetLeft - 24, behavior: reduce ? 'auto' : 'smooth' });
      doc.dispatchEvent(new CustomEvent('review:change', { detail: { index } }));
    }
    tabs.forEach((t, k) => t.addEventListener('click', () => select(k, true)));
    list.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (e.key in keys) { e.preventDefault(); select(index + keys[e.key], true); tabs[index].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); select(0, true); tabs[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); tabs[tabs.length - 1].focus(); }
    });
    // La barre de progression CSS de l'onglet actif pilote la rotation
    list.addEventListener('animationend', (e) => { if (e.animationName === 'rprog' && auto) select(index + 1, false); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        section.classList.toggle('is-auto', auto && visible);
      }, { threshold: 0.35 }).observe(body);
    }
    window.addEventListener('resize', placeBar);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeBar);
    select(0, false);
  })();

  /* ------------------------------------------------------------------
     Atelier : composer son set (forme / couleur / finition)
     ------------------------------------------------------------------ */
  const SHAPES = {
    amande: 'M50 4C60 14 88 62 88 104L88 138Q88 160 50 160Q12 160 12 138L12 104C12 62 40 14 50 4Z',
    stiletto: 'M50 0C54 24 88 78 88 112L88 138Q88 160 50 160Q12 160 12 138L12 112C12 78 46 24 50 0Z',
    ovale: 'M50 14C74 14 88 46 88 88L88 138Q88 160 50 160Q12 160 12 138L12 88C12 46 26 14 50 14Z',
    carre: 'M24 34Q50 30 76 34Q88 36 88 50L88 138Q88 160 50 160Q12 160 12 138L12 50Q12 36 24 34Z'
  };
  const atelier = (function () {
    const form = $('#atelier-form'); if (!form) return null;
    const nails = $$('.nl');
    const bodies = nails.map((n) => $('.nl__body', n));
    const gloss = nails.map((n) => $('.nl__gloss', n));
    const glit = nails.map((n) => $('.nl__glit', n));
    const out = { shape: $('#sum-shape'), color: $('#sum-color'), finish: $('#sum-finish') };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const state = () => ({
      shape: form.elements.shape.value,
      color: form.elements.color.value,
      colorName: $('input[name="color"]:checked', form).dataset.name,
      finish: form.elements.finish.value
    });
    const animated = !reduce && hasGsap;
    let twinkle = null;

    function render(first, what) {
      const s = state();
      out.shape.textContent = cap(s.shape === 'carre' ? 'carré' : s.shape);
      out.color.textContent = s.colorName;
      out.finish.textContent = cap(s.finish);
      const d = SHAPES[s.shape];
      const gl = s.finish === 'mat' ? 0 : s.finish === 'pailleté' ? 0.55 : 1;
      const gt = s.finish === 'pailleté' ? 1 : 0;
      if (first || !animated) {
        [...bodies, ...gloss, ...glit].forEach((p) => p.setAttribute('d', d));
        bodies.forEach((p) => { p.style.fill = s.color; });
        gloss.forEach((p) => { p.style.opacity = gl; });
        glit.forEach((p) => { p.style.opacity = gt; });
        return;
      }
      const wave = { each: 0.07, from: 'center' };
      if (what === 'shape' && !window.MorphSVGPlugin) {
        [...bodies, ...gloss, ...glit].forEach((p) => p.setAttribute('d', d));
      } else if (what === 'shape') {
        gsap.to([...bodies, ...gloss, ...glit], { morphSVG: { shape: d }, duration: 0.9, ease: 'power3.inOut', stagger: { each: 0.0, from: 'center' } });
        gsap.to(nails, { y: '-=10', duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1, stagger: wave, overwrite: 'auto' });
      }
      if (what === 'color') {
        gsap.to(bodies, { fill: s.color, duration: 0.7, ease: 'power2.out', stagger: wave });
        gsap.to(nails, { y: '-=10', duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1, stagger: wave, overwrite: 'auto' });
      }
      if (what === 'finish') {
        gsap.to(gloss, { opacity: gl, duration: 0.6 });
        gsap.to(glit, { opacity: gt, duration: 0.6 });
        gsap.to(nails, { y: '-=10', duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1, stagger: wave, overwrite: 'auto' });
      }
      if (twinkle) { twinkle.kill(); twinkle = null; }
      if (s.finish === 'pailleté') {
        twinkle = gsap.to(glit, { opacity: 0.55, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.18, delay: 0.7 });
      }
    }
    form.addEventListener('change', (e) => render(false, e.target.name));
    if (animated && window.MorphSVGPlugin) gsap.registerPlugin(MorphSVGPlugin);
    render(true);
    return { render };
  })();

  /* ------------------------------------------------------------------
     Couche mouvement
     ------------------------------------------------------------------ */
  const loader = $('#loader');
  const killLoader = () => { if (loader && loader.parentNode) loader.remove(); scrollLock(false); };

  if (reduce || !hasGsap) {
    killLoader();
    return;
  }

  // Filet de sécurité : le préchargeur ne doit jamais bloquer la page
  const safety = setTimeout(killLoader, 12000);

  try { initMotion(); } catch (err) { console.error(err); killLoader(); }

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    if (window.MorphSVGPlugin) gsap.registerPlugin(MorphSVGPlugin);
    gsap.defaults({ ease: 'power3.out' });
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    /* ---- Défilement fluide (Lenis) ---- */
    if (window.Lenis) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      root.classList.add('lenis', 'lenis-smooth');
    }
    scrollLock(true);

    /* ---- Mise en page des découpes de texte ---- */
    const heroName = SplitText.create('.hero__name', { type: 'chars', charsClass: 'ch', aria: 'none' });
    const heroHook = SplitText.create('.hero__hook', { type: 'words', mask: 'words', wordsClass: 'wd', aria: 'none' });

    /* ---- Préchargeur : ongles qui se peignent, puis fenêtre en amande ---- */
    const pageLoaded = new Promise((res) => {
      if (doc.readyState === 'complete') res(); else window.addEventListener('load', res, { once: true });
    });
    const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();

    function runLoader(onReveal) {
      return new Promise((resolve) => {
        if (!loader) { onReveal(); resolve(); return; }
        const paths = $$('.ln path', loader);
        paths.forEach((p) => {
          const len = p.getTotalLength();
          p.style.stroke = p.parentNode.dataset.c;
          p.style.fill = p.parentNode.dataset.c;
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
        });
        const hole = $('.loader__hole', loader);
        gsap.set(hole, { transformOrigin: '50% 50%', scale: 0 });
        const counter = { v: 0 }; const countEl = $('#loader-count');
        const intro = gsap.timeline();
        intro
          .from('.loader__name', { y: 28, opacity: 0, duration: 1, ease: 'expo.out' }, 0.1)
          .to(paths, { strokeDashoffset: 0, duration: 0.9, stagger: 0.13, ease: 'power2.inOut' }, 0.15)
          .to(paths, { fillOpacity: 1, duration: 0.55, stagger: 0.13, ease: 'power1.out' }, 0.75)
          .to(counter, { v: 100, duration: 1.9, ease: 'power2.inOut', onUpdate: () => { countEl.textContent = Math.round(counter.v); } }, 0);

        const ready = Promise.race([Promise.all([pageLoaded, fontsReady]), new Promise((r) => setTimeout(r, 5000))]);
        Promise.all([new Promise((r) => intro.eventCallback('onComplete', r)), ready]).then(() => {
          const out = gsap.timeline({ onComplete: () => { clearTimeout(safety); killLoader(); resolve(); } });
          out
            .to('.loader__core', { opacity: 0, scale: 0.7, duration: 0.6, ease: 'power3.in' })
            .fromTo(hole, { scale: 0.4 }, { scale: 70, duration: 1.45, ease: 'power3.inOut' }, 0.05)
            .add(onReveal, 0.35);
        });
      });
    }

    /* ---- Intro du hero ---- */
    function heroIntro() {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from(heroName.chars, { yPercent: 115, rotate: 9, opacity: 0, duration: 1.6, stagger: 0.07 }, 0)
        .from('.hero__sub', { y: 24, opacity: 0, duration: 1.1 }, 0.55)
        .from(heroHook.words, { yPercent: 115, duration: 1.2, stagger: 0.08 }, 0.7)
        .from('.hero__lead', { y: 26, opacity: 0, duration: 1.1 }, 0.9)
        .from('.hero__actions .btn', { y: 34, opacity: 0, duration: 1.1, stagger: 0.1 }, 1.0)
        .from('.status', { y: 22, opacity: 0, duration: 1.1 }, 1.15)
        .from('.hero__item .frame', { y: 140, opacity: 0, scale: 0.82, rotate: (i) => [-7, 6, 9][i] || 0, duration: 1.8, stagger: 0.16 }, 0.1)
        .from('.hero__item img', { scale: 1.55, duration: 2.2, stagger: 0.16 }, 0.1)
        .from('.hero__spark', { scale: 0, rotate: -120, duration: 1.3, stagger: 0.12, ease: 'back.out(2.2)' }, 0.9)
        .from('.hero__scroll', { opacity: 0, duration: 1.2 }, 1.5)
        .from('.nav', { yPercent: -130, opacity: 0, duration: 1.2, clearProps: 'transform,opacity' }, 0.7)
        .add(() => {
          $$('.hero__item img').forEach((img, i) => {
            gsap.to(img, { scale: 1.12, duration: 14 + i * 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          });
          scrollLock(false);
        }, 1.4);
    }

    runLoader(heroIntro).then(() => ScrollTrigger.refresh());

    /* ---- Paillettes statiques du hero + étincelles qui scintillent ---- */
    (function flakes() {
      const bg = $('.hero__bg'); if (!bg) return;
      const cv = doc.createElement('canvas'); cv.className = 'hero__flakes'; bg.appendChild(cv);
      const ctx = cv.getContext('2d');
      const cols = ['#05eccc', '#d93ea4', '#d3a2ee', '#fff6fb'];
      function draw() {
        const w = bg.clientWidth, h = bg.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
        const n = Math.round((w * h) / 9000);
        for (let i = 0; i < n; i++) {
          const x = Math.random() * w, y = Math.random() * h, s = 0.8 + Math.random() * 2.6;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.random() * Math.PI);
          ctx.globalAlpha = 0.1 + Math.random() * 0.5; ctx.fillStyle = cols[(Math.random() * cols.length) | 0];
          ctx.beginPath(); ctx.moveTo(0, -s * 1.5); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.5); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
      draw();
      let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 250); });
      // quelques étincelles qui scintillent (transform + opacity uniquement)
      const NS = 'http://www.w3.org/2000/svg';
      for (let i = 0; i < 12; i++) {
        const s = doc.createElementNS(NS, 'svg'); s.setAttribute('class', 'spark');
        const u = doc.createElementNS(NS, 'use'); u.setAttribute('href', '#i-sparkle'); s.appendChild(u);
        const size = 8 + Math.random() * 14;
        Object.assign(s.style, { position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${size}px`, height: `${size}px`, color: cols[i % cols.length] });
        bg.appendChild(s);
        gsap.fromTo(s, { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.9, duration: 0.9 + Math.random(), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: Math.random() * 4, repeatDelay: Math.random() * 3 });
      }
    })();

    /* ---- Traînée de paillettes au curseur (hero, atelier, appel à l'action) ---- */
    if (finePointer) (function trail() {
      const cv = $('.glitter'); if (!cv) return;
      const ctx = cv.getContext('2d'); let w = 0, h = 0, dpr = 1;
      const zones = $$('[data-glitter]');
      const parts = []; let running = false; let lx = -99, ly = -99;
      const cols = ['#05eccc', '#fff6fb', '#d3a2ee', '#f58ccb', '#ffffff'];
      function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      size(); window.addEventListener('resize', size);
      const inZone = (y) => zones.some((z) => { const r = z.getBoundingClientRect(); return y >= r.top && y <= r.bottom; });
      function loop() {
        ctx.clearRect(0, 0, w, h);
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.life -= 1; p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.rot += p.vr;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          const a = Math.min(1, p.life / 24); const s = p.s * (0.4 + 0.6 * a);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = a; ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0); ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s); ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0); ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s); ctx.fill(); ctx.restore();
        }
        if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, w, h); }
      }
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (Math.hypot(e.clientX - lx, e.clientY - ly) < 16 || !inZone(e.clientY)) return;
        lx = e.clientX; ly = e.clientY;
        for (let i = 0; i < 2 && parts.length < 90; i++) {
          parts.push({ x: lx + (Math.random() - 0.5) * 14, y: ly + (Math.random() - 0.5) * 14, vx: (Math.random() - 0.5) * 1.2, vy: -0.3 - Math.random() * 0.8, s: 3 + Math.random() * 6, life: 38 + Math.random() * 28, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.12, c: cols[(Math.random() * cols.length) | 0] });
        }
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
    })();

    /* ---- Barre de bandeaux et marquees réactifs au scroll ---- */
    (function marquees() {
      const items = $$('[data-marquee]').map((el) => {
        const track = $('.band__track', el); const dir = parseFloat(el.dataset.marquee) || -1;
        const isBand = el.classList.contains('band');
        gsap.set(track, { xPercent: dir < 0 ? 0 : -50 });
        const tw = gsap.to(track, { xPercent: dir < 0 ? -50 : 0, duration: isBand ? 34 : 60, ease: 'none', repeat: -1 });
        return { tw, dir };
      });
      let boost = 0; let way = 1; let wayS = 1;
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { boost = Math.min(Math.abs(self.getVelocity()) / 140, 9); way = self.direction; } });
      gsap.ticker.add(() => {
        boost *= 0.94; wayS += (way - wayS) * 0.08;
        items.forEach(({ tw }) => tw.timeScale(wayS * (1 + boost)));
      });
    })();

    /* ---- Titres animés : une mise en scène par section ---- */
    const reveal = (el, o) => ({ trigger: el, start: o || 'top 86%', once: true });
    const splitters = {
      'words-left': (el) => SplitText.create(el, { type: 'words', wordsClass: 'wd', autoSplit: true, onSplit: (s) => gsap.from(s.words, { xPercent: -60, opacity: 0, duration: 1.3, stagger: 0.09, ease: 'expo.out', scrollTrigger: reveal(el) }) }),
      'words-skew': (el) => SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'wd', autoSplit: true, onSplit: (s) => gsap.from(s.words, { yPercent: 120, skewY: 9, duration: 1.3, stagger: 0.08, ease: 'expo.out', scrollTrigger: reveal(el, 'top 80%') }) }),
      'chars-drop': (el) => SplitText.create(el, { type: 'words,chars', charsClass: 'ch', wordsClass: 'wd', autoSplit: true, onSplit: (s) => gsap.from(s.chars, { yPercent: -130, opacity: 0, duration: 1.1, stagger: 0.03, ease: 'back.out(1.7)', scrollTrigger: reveal(el) }) }),
      'words-rise': (el) => SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'wd', autoSplit: true, onSplit: (s) => gsap.from(s.words, { yPercent: 125, duration: 1.2, stagger: 0.09, ease: 'expo.out', scrollTrigger: reveal(el) }) }),
      'chars-pop': (el) => SplitText.create(el, { type: 'chars', charsClass: 'ch', autoSplit: true, onSplit: (s) => gsap.from(s.chars, { scale: 0, rotate: () => gsap.utils.random(-40, 40), opacity: 0, duration: 1.2, stagger: { each: 0.05, from: 'random' }, ease: 'back.out(2.2)', scrollTrigger: reveal(el, 'top 88%') }) }),
      'words-flip': (el) => { gsap.set(el, { transformPerspective: 700 }); return SplitText.create(el, { type: 'words', wordsClass: 'wd', autoSplit: true, onSplit: (s) => gsap.from(s.words, { rotationX: -95, transformOrigin: '50% 100%', opacity: 0, y: 30, duration: 1.3, stagger: 0.1, ease: 'expo.out', scrollTrigger: reveal(el, 'top 82%') }) }); },
      'words-mask': (el) => SplitText.create(el, { type: 'lines,words', mask: 'lines', wordsClass: 'wd', autoSplit: true, onSplit: (s) => gsap.from(s.words, { yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.07, ease: 'expo.out', scrollTrigger: reveal(el) }) }),
      'chars-foot': (el) => SplitText.create(el, { type: 'chars', charsClass: 'ch', aria: 'none', autoSplit: true, onSplit: (s) => { s.chars.forEach((c) => { if (c.textContent === '.') c.classList.add('dot'); }); return gsap.from(s.chars, { yPercent: 105, opacity: 0, duration: 1.4, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 95%', once: true } }); } })
    };
    $$('[data-split]').forEach((el) => { const f = splitters[el.dataset.split]; if (f) f(el); });
    if (finePointer) {
      const word = $('.foot__word');
      word.addEventListener('pointerover', (e) => { const ch = e.target.closest('.ch'); if (ch) gsap.to(ch, { yPercent: -7, rotate: -4, duration: 0.45, ease: 'power3.out', overwrite: 'auto' }); });
      word.addEventListener('pointerout', (e) => { const ch = e.target.closest('.ch'); if (ch) gsap.to(ch, { yPercent: 0, rotate: 0, duration: 0.9, ease: 'elastic.out(1,.5)', overwrite: 'auto' }); });
    }

    /* ---- Avis : les mots du témoignage apparaissent un à un ---- */
    (function reviewWords() {
      const sets = $$('.rev').map((rev) => {
        const split = SplitText.create($$('p', rev), { type: 'words', wordsClass: 'wd', aria: 'auto' });
        return split.words;
      });
      doc.addEventListener('review:change', (e) => {
        const words = sets[e.detail.index]; if (!words) return;
        gsap.fromTo(words, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, stagger: { each: 0.012, ease: 'none' }, ease: 'power2.out', delay: 0.2, overwrite: true });
      });
    })();

    /* ---- Compteurs ---- */
    $$('[data-count]').forEach((el) => {
      const target = +el.dataset.count; const o = { v: 0 };
      const nf = new Intl.NumberFormat('fr-FR');
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => {
        gsap.to(o, { v: target, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = nf.format(Math.round(o.v)); } });
      } });
    });
    gsap.from('.row', { clipPath: 'inset(0 100% 0 0)', duration: 1.4, stagger: 0.14, ease: 'expo.out', scrollTrigger: { trigger: '.stats__list', start: 'top 85%', once: true } });

    /* ---- Barre « barre de progression » + tilt 3D + boutons magnétiques ---- */
    function tilt() {
      $$('[data-tilt]').forEach((el) => {
        const shape = $('.frame__in, .tile__shape', el); if (!shape) return;
        const glare = doc.createElement('span'); glare.className = 'glare'; glare.setAttribute('aria-hidden', 'true'); shape.appendChild(glare);
        gsap.set(el, { transformPerspective: 900 });
        gsap.set(glare, { xPercent: -50, yPercent: -50 });
        const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
        const gx = gsap.quickTo(glare, 'x', { duration: 0.35, ease: 'power3.out' });
        const gy = gsap.quickTo(glare, 'y', { duration: 0.35, ease: 'power3.out' });
        el.addEventListener('pointerenter', () => gsap.to(glare, { opacity: 1, duration: 0.4 }));
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * 14); rx(-(py - 0.5) * 14);
          const sr = shape.getBoundingClientRect(); gx(e.clientX - sr.left); gy(e.clientY - sr.top);
        });
        el.addEventListener('pointerleave', () => { rx(0); ry(0); gsap.to(glare, { opacity: 0, duration: 0.5 }); });
      });
    }
    function magnetic() {
      $$('[data-magnetic]').forEach((el) => {
        const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,.55)' });
        const qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,.55)' });
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          qx((e.clientX - (r.left + r.width / 2)) * 0.32); qy((e.clientY - (r.top + r.height / 2)) * 0.42);
        });
        el.addEventListener('pointerleave', () => { qx(0); qy(0); });
      });
    }
    if (finePointer) { tilt(); magnetic(); }

    /* ---- Confettis d'étincelles sur les boutons d'action finale ---- */
    $$('[data-confetti]').forEach((el) => {
      el.addEventListener('click', () => {
        const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
        const cols = ['#14061f', '#fff6fb', '#05eccc', '#a83ad1', '#ffffff'];
        for (let i = 0; i < 26; i++) {
          const d = doc.createElement('div'); d.className = 'confetti'; d.setAttribute('aria-hidden', 'true');
          d.style.color = cols[i % cols.length];
          d.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-sparkle"/></svg>';
          doc.body.appendChild(d);
          const a = Math.random() * Math.PI * 2; const dist = 90 + Math.random() * 190; const s = 0.7 + Math.random() * 1.6;
          gsap.set(d, { x: cx - 6, y: cy - 6, scale: 0 });
          gsap.timeline({ onComplete: () => d.remove() })
            .to(d, { x: cx - 6 + Math.cos(a) * dist, y: cy - 6 + Math.sin(a) * dist - 40, scale: s, rotation: Math.random() * 360, duration: 0.9, ease: 'expo.out' })
            .to(d, { y: '+=120', opacity: 0, scale: 0, duration: 0.8, ease: 'power2.in' }, 0.45);
        }
      });
    });

    /* ---- Médias : Ken Burns + parallaxe interne + révélations par masque ---- */
    $$('.reveal[data-reveal]').forEach((el) => {
      const type = el.dataset.reveal;
      const from = type === 'circle' ? 'circle(0% at 50% 50%)' : type === 'left' ? 'inset(0 100% 0 0)' : 'inset(100% 0 0 0)';
      const to = type === 'circle' ? 'circle(78% at 50% 50%)' : 'inset(0% 0% 0% 0%)';
      gsap.fromTo(el, { clipPath: from }, { clipPath: to, duration: 1.7, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 84%', once: true } });
    });

    const mm = gsap.matchMedia();

    /* ============ Desktop : sections épinglées, défilement horizontal ============ */
    mm.add('(min-width: 900px)', () => {
      root.classList.add('desk-motion');

      /* --- Rituel : section épinglée, une étape après l'autre --- */
      const steps = $$('.story .step'); const n = steps.length;
      const roll = $('.story__roll-in'); const railFill = $('.story__rail span');
      steps.forEach((s, i) => {
        const text = $('.step__text', s); const rev = $('.reveal', s); const img = $('img', s); const title = $('.step__title', s);
        if (i > 0) {
          gsap.set(s, { autoAlpha: 0 });
          gsap.set(text, { autoAlpha: 0, y: 50 });
          gsap.set(rev, { clipPath: 'inset(100% 0 0 0)' });
          gsap.set(img, { scale: 1.3 });
        }
      });
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '.story__pin', start: 'top top', end: () => `+=${window.innerHeight * n * 0.78}`, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(railFill, { scaleY: self.progress })
        }
      });
      steps.forEach((s, i) => {
        const text = $('.step__text', s); const rev = $('.reveal', s); const img = $('img', s); const title = $('.step__title', s);
        const words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'wd' }).words;
        if (i > 0) {
          const at = i - 0.32;
          tl.set(s, { autoAlpha: 1 }, at)
            .to(text, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, at + 0.04)
            .from(words, { yPercent: 115, duration: 0.45, stagger: 0.05, ease: 'power3.out' }, at + 0.04)
            .to(rev, { clipPath: 'inset(0% 0 0 0)', duration: 0.5, ease: 'power3.inOut' }, at)
            .to(img, { scale: 1.02, duration: 0.9, ease: 'power2.out' }, at)
            .to(roll, { yPercent: -20 * i, duration: 0.4, ease: 'power3.inOut' }, at);
        }
        if (i < n - 1) {
          const out = i + 0.7;
          tl.to(text, { autoAlpha: 0, y: -50, duration: 0.3, ease: 'power2.in' }, out)
            .to(rev, { clipPath: 'inset(0 0 100% 0)', duration: 0.36, ease: 'power2.in' }, out)
            .set(s, { autoAlpha: 0 }, i + 1.08);
        }
      });
      tl.to({}, { duration: 0.001 }, n - 0.2);
      gsap.to('.story__lattice', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } });

      /* --- Créations : défilement horizontal piloté par le scroll vertical --- */
      const pin = $('.services__pin'); const track = $('.services__track');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const hz = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist() * 1.3}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true }
      });
      $$('.svc', track).forEach((card) => {
        const img = $('.parallax-img', card); const bg = $('.svc__bg', card); const fr = $('.frame', card);
        if (img) {
          gsap.set(img, { scale: 1.3 });
          gsap.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
        }
        if (bg) gsap.fromTo(bg, { xPercent: -14 }, { xPercent: 14, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
        if (fr) gsap.from(fr, { y: 90, rotate: 4, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: card, containerAnimation: hz, start: 'left 92%', once: true } });
      });

      /* --- Hero : parallaxe multicouche au scroll + à la souris --- */
      const hero = $('.hero');
      const layers = $$('.hero [data-depth]');
      layers.forEach((el) => {
        const d = parseFloat(el.dataset.depth);
        gsap.to(el, { y: () => -d * window.innerHeight * 0.95, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      });
      gsap.to('.hero__body', { y: () => -window.innerHeight * 0.12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true } });
      let offMouse = () => {};
      if (finePointer) {
        const movers = layers.map((el) => {
          const tgt = el.classList.contains('hero__item') ? $('.frame', el) : el; const d = parseFloat(el.dataset.depth);
          const isItem = tgt !== el;
          return { d, qx: gsap.quickTo(tgt, 'x', { duration: 1.2, ease: 'power3.out' }), qy: isItem ? gsap.quickTo(tgt, 'y', { duration: 1.2, ease: 'power3.out' }) : null };
        });
        const mv = (e) => {
          const nx = e.clientX / window.innerWidth - 0.5; const ny = e.clientY / window.innerHeight - 0.5;
          movers.forEach((m) => { m.qx(-nx * m.d * 110); if (m.qy) m.qy(-ny * m.d * 70); });
        };
        hero.addEventListener('pointermove', mv);
        offMouse = () => hero.removeEventListener('pointermove', mv);
      }

      /* --- Galerie : flottaisons différentes par tuile --- */
      [[-40], [60], [-60], [40], [-30]].forEach(([v], i) => {
        const t = $(`.tile--${i + 1}`); if (!t) return;
        gsap.to(t, { y: v, ease: 'none', scrollTrigger: { trigger: '.gallery__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      $$('.tile .parallax-img').forEach((img) => {
        gsap.set(img, { scale: 1.25 });
        gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.closest('.tile'), start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      return () => { root.classList.remove('desk-motion'); offMouse(); };
    });

    /* ============ Mobile / tablette : version allégée ============ */
    mm.add('(max-width: 899px)', () => {
      $$('.story .step').forEach((s) => {
        const text = $('.step__text', s); const rev = $('.reveal', s); const img = $('img', s);
        gsap.from(text, { y: 40, opacity: 0, duration: 1.1, scrollTrigger: reveal(s, 'top 78%') });
        gsap.fromTo(rev, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: reveal(s, 'top 72%') });
        gsap.from(img, { scale: 1.3, duration: 1.8, scrollTrigger: reveal(s, 'top 72%') });
      });
      $$('.svc').forEach((c, i) => gsap.from(c, { y: 40, opacity: 0, duration: 1, scrollTrigger: reveal($('.services__track'), 'top 85%') }));
      gsap.to('.hero__bloom', { y: -80, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });

    /* ---- Sections : petits détails d'entrée ---- */
    gsap.from('.atelier__arch', { scale: 0.86, opacity: 0, rotate: -3, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.atelier__stage', start: 'top 80%', once: true } });
    gsap.from('.atelier__form fieldset', { y: 40, opacity: 0, duration: 1, stagger: 0.12, scrollTrigger: { trigger: '.atelier__form', start: 'top 88%', once: true } });
    gsap.from('.map-frame', { clipPath: 'inset(100% 0 0 0)', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.map-frame', start: 'top 85%', once: true } });
    gsap.from('.hours tr', { opacity: 0, x: -24, duration: 0.9, stagger: 0.07, scrollTrigger: { trigger: '.hours', start: 'top 88%', once: true } });
    gsap.from('.cta__tel, .cta__lead, .cta__actions .btn', { y: 40, opacity: 0, duration: 1.2, stagger: 0.12, scrollTrigger: { trigger: '.cta__actions', start: 'top 90%', once: true } });
    gsap.from('.reviews__stack', { y: 60, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '.reviews__body', start: 'top 85%', once: true } });
    gsap.from('.gallery__lead', { y: 30, opacity: 0, duration: 1.1, scrollTrigger: { trigger: '.gallery__lead', start: 'top 90%', once: true } });
    gsap.from('.foot__grid > *', { y: 30, opacity: 0, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '.foot__grid', start: 'top 95%', once: true } });

    /* ---- Rafraîchir après chargement complet ---- */
    fontsReady.then(() => ScrollTrigger.refresh());
    pageLoaded.then(() => ScrollTrigger.refresh());
  }
})();
