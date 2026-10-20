// Loaded in <head> without defer so the .js flag is set before first paint.
// Every hidden state in the CSS is gated on it, so the page reads fine without script.
document.documentElement.classList.add('js');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  menu();
  film();
  reveals();
  workStage();
  clock();
  const rerun = document.getElementById('audit-rerun');
  if (rerun) rerun.addEventListener('click', () => audit(true));
});

window.addEventListener('load', () => audit(false));

/* ---------- phone menu ---------- */
function menu() {
  const nav = document.querySelector('.top-links');
  const toggle = nav && nav.querySelector('.menu-toggle');
  if (!toggle) return;
  const close = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  // Escape closes the open menu and puts focus back on its button
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { close(); toggle.focus(); }
  });
}

/* ---------- the rain film: a pause control, and no loop under reduced motion ---------- */
function film() {
  const video = document.getElementById('rain-film');
  const button = document.querySelector('.band-toggle');
  if (!video || !button) return;
  const show = () => {
    const paused = video.paused;
    button.textContent = paused ? 'Play film' : 'Pause film';
    button.setAttribute('aria-pressed', String(paused));
  };
  if (reduced) { video.removeAttribute('autoplay'); video.pause(); }
  button.addEventListener('click', () => { if (video.paused) video.play().catch(() => {}); else video.pause(); });
  video.addEventListener('play', show);
  video.addEventListener('pause', show);
  show();
}

/* ---------- section entrances, once ---------- */
function reveals() {
  // A position check rather than IntersectionObserver: a jump (an anchor link, a fast fling)
  // can skip over a section, and anything above the fold line must still be shown.
  let pending = [...document.querySelectorAll('[data-reveal], .poster-list, .band')];
  const check = () => {
    const line = window.innerHeight * 0.88;
    // read every position first, then write the classes, so the browser lays out once
    const due = pending.map((t) => t.getBoundingClientRect().top < line);
    pending.forEach((t, n) => { if (due[n]) t.classList.add('in'); });
    pending = pending.filter((t, n) => !due[n]);
    if (!pending.length) window.removeEventListener('scroll', onScroll);
  };
  // run straight from the event, not on the next frame: a background tab or a jump may never paint one
  const onScroll = () => check();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  check();
}

/* ---------- work: one viewport of scroll per project ---------- */
function workStage() {
  const section = document.querySelector('.work');
  const projects = [...document.querySelectorAll('.project')];
  const rows = [...document.querySelectorAll('.work-index button')];
  if (!section || !projects.length) return;
  const wide = window.matchMedia('(min-width: 960px)');
  let current = -1;
  let bury = 0;

  const now = section.querySelector('.work-now');
  const nowName = now && now.querySelector('.work-now-name');
  const nowText = now && now.querySelector('.work-now-text');
  const nowLink = now && now.querySelector('.work-now-link');

  const set = (i) => {
    if (i === current) return;
    current = i;
    if (now) {
      nowName.textContent = projects[i].querySelector('.project-name').textContent;
      nowText.textContent = projects[i].querySelector('.project-text p').textContent;
      // the project text is hidden on desktop, so its link (the IEEE paper) is copied across
      const link = projects[i].querySelector('.project-link a');
      if (nowLink) nowLink.replaceChildren(...(link ? [link.cloneNode(true)] : []));
      now.classList.remove('swap');
      void now.offsetWidth;
      if (!reduced) now.classList.add('swap');
    }
    projects.forEach((p, n) => {
      p.classList.toggle('is-shown', n <= i);
      // panels fully covered by later ones leave the stage; the one just below goes once the wipe is done
      p.classList.toggle('is-buried', n < i - 1);
    });
    clearTimeout(bury);
    bury = setTimeout(() => projects.forEach((p, n) => p.classList.toggle('is-buried', n < current)), 650);
    projects.forEach((p, n) => {
      p.classList.toggle('is-on', n === i);
      p.setAttribute('aria-hidden', wide.matches && n !== i ? 'true' : 'false');
    });
    rows.forEach((r, n) => r.setAttribute('aria-current', n === i ? 'true' : 'false'));
  };

  const update = () => {
    if (!wide.matches) { projects.forEach((p) => p.removeAttribute('aria-hidden')); return; }
    const rect = section.getBoundingClientRect();
    const stage = parseFloat(getComputedStyle(section).paddingTop) || 0;
    const run = section.offsetHeight - stage - window.innerHeight;
    const progress = Math.min(Math.max((-rect.top - stage) / Math.max(run, 1), 0), 0.999);
    set(Math.floor(progress * projects.length));
  };

  rows.forEach((r) => r.addEventListener('click', () => {
    const i = Number(r.dataset.go);
    const stage = parseFloat(getComputedStyle(section).paddingTop) || 0;
    const run = section.offsetHeight - stage - window.innerHeight;
    const y = window.scrollY + section.getBoundingClientRect().top + stage + run * ((i + 0.5) / projects.length);
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  wide.addEventListener('change', () => { current = -1; update(); });
  set(0);
  update();
}

/* ---------- local time in Puttur ---------- */
function clock() {
  const el = document.getElementById('puttur-time');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const tick = () => { el.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30000);
}

/* ---------- the live audit: real checks against this page ---------- */
function audit(again) {
  const list = document.getElementById('audit-checks');
  if (!list) return;
  const panel = list.closest('.audit-panel');

  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  const policy = csp ? csp.content : '';
  const scriptSrc = (policy.match(/script-src([^;]*)/) || [, ''])[1];
  const blank = [...document.querySelectorAll('a[target="_blank"]')];
  const unsafeBlank = blank.filter((a) => !/\bnoopener\b/.test(a.rel));
  const handlers = [...document.querySelectorAll('*')].filter((el) => [...el.attributes].some((at) => /^on/i.test(at.name)));
  const thirdParty = [...document.scripts].filter((s) => s.src && new URL(s.src, location.href).origin !== location.origin);
  const noAlt = [...document.images].filter((img) => !img.hasAttribute('alt'));
  const referrer = document.querySelector('meta[name="referrer"]');
  let stored = 0;
  try { stored = localStorage.length + sessionStorage.length; } catch (e) { stored = 0; }

  const resources = performance.getEntriesByType('resource');
  const nav = performance.getEntriesByType('navigation')[0];
  const insecure = location.protocol === 'https:' ? resources.filter((r) => r.name.startsWith('http:')) : [];
  const bytes = resources.reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0) + (nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0);
  const ready = nav ? Math.round(nav.domContentLoadedEventEnd) : 0;
  const kb = Math.round(bytes / 1024);

  const checks = [
    { name: 'Content security policy is set', detail: csp ? `${policy.split(';').filter((d) => d.trim()).length} directives` : 'no policy found', ok: !!csp },
    { name: 'No inline or eval script allowed', detail: scriptSrc ? `script-src${scriptSrc}` : 'script-src not set', ok: !!scriptSrc && !/unsafe-(inline|eval)/.test(scriptSrc) },
    { name: 'No inline event handlers', detail: `${handlers.length} found in ${document.getElementsByTagName('*').length} elements`, ok: handlers.length === 0 },
    { name: 'No third-party scripts', detail: `${document.scripts.length} script, ${thirdParty.length} from elsewhere`, ok: thirdParty.length === 0 },
    { name: 'New-tab links cannot reach back', detail: `${blank.length - unsafeBlank.length} of ${blank.length} carry rel="noopener"`, ok: unsafeBlank.length === 0 },
    { name: 'Referrer is trimmed', detail: referrer ? referrer.content : 'browser default', ok: !!referrer },
    { name: 'No cookies set', detail: document.cookie ? `${document.cookie.split(';').length} cookie(s)` : 'document.cookie is empty', ok: !document.cookie },
    { name: 'Nothing kept in your browser', detail: `${stored} storage entries`, ok: stored === 0 },
    { name: 'No mixed content', detail: location.protocol === 'https:' ? `${insecure.length} insecure requests` : `served over ${location.protocol.replace(':', '')}`, ok: location.protocol !== 'https:' || insecure.length === 0, warn: location.protocol !== 'https:' },
    { name: 'Not framed by another site', detail: window.top === window.self ? 'top-level window' : 'inside a frame', ok: window.top === window.self },
    { name: 'Every image has alt text', detail: `${document.images.length - noAlt.length} of ${document.images.length}`, ok: noAlt.length === 0 },
    { name: 'Light enough for a 3G phone', detail: `${kb.toLocaleString('en-IN')} KB so far`, ok: kb > 0 && kb < 2500, warn: kb === 0 },
  ];

  const pass = checks.filter((c) => c.ok && !c.warn).length;
  document.getElementById('audit-pass').textContent = pass;
  document.getElementById('audit-total').textContent = checks.length;
  const heroPass = document.getElementById('hero-pass');
  if (heroPass) heroPass.textContent = `${pass} of ${checks.length} layers holding right now.`;
  // non-breaking space keeps each figure and its unit on one line
  document.getElementById('audit-weight').textContent = kb ? `${kb.toLocaleString('en-IN')} KB` : 'cached';
  document.getElementById('audit-time').textContent = ready ? `${ready.toLocaleString('en-IN')} ms` : 'n/a';
  document.getElementById('audit-requests').textContent = String(resources.length + 1);
  document.getElementById('audit-url').textContent = location.host || 'local file';

  list.replaceChildren(...checks.map((c, n) => {
    const li = document.createElement('li');
    li.className = 'ui-check';
    li.style.setProperty('--n', n);
    const name = document.createElement('span'); name.className = 'ui-name'; name.textContent = c.name;
    const pill = document.createElement('span');
    pill.className = 'ui-pill ' + (c.warn ? 'warn' : c.ok ? 'pass' : 'fail');
    pill.textContent = c.warn ? 'Check' : c.ok ? 'Holds' : 'Gap';
    const detail = document.createElement('span'); detail.className = 'ui-detail'; detail.textContent = c.detail;
    li.append(name, pill, detail);
    return li;
  }));

  if (panel && !reduced) {
    panel.classList.remove('is-running');
    void panel.offsetWidth;
    panel.classList.add('is-running');
  }
  if (again) list.querySelector('.ui-check')?.scrollIntoView({ block: 'nearest' });
}
