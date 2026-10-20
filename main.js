// Subtle fade-in as sections scroll into view. Content stays visible
// without JavaScript and for anyone who prefers reduced motion.
(() => {
  const items = document.querySelectorAll('[data-reveal]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window) || !items.length) return;

  document.documentElement.classList.add('reveal-on');

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

  items.forEach((el) => io.observe(el));
})();

// Spider cursor: follows the mouse, spins a thread to links and buttons,
// and leaves a small web where you click. Mouse or trackpad only; touch
// and reduced motion keep the normal cursor.
(() => {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  const TARGETS = 'a[href], button, [role="button"], summary, label';
  const TEXT = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
  const SIZE = 20;
  const EASE = 0.3;
  const OFFSET = 14; // spider sits below-right of the pointer tip, like an arrow cursor
  const DROP = 12;   // and hangs a little lower on its thread over a link

  const legs = [
    'M9.6 11 L6.5 7.6 L4.6 3.6', 'M9.2 12.6 L5.4 10.8 L2.4 9.2',
    'M9.2 14.6 L5.4 16 L2.6 18.8', 'M9.8 16.2 L7 19.6 L5.6 22.6',
  ];
  const mirror = (d) => d.replace(/([\d.]+) ([\d.]+)/g, (_, x, y) => `${+(24 - x).toFixed(1)} ${y}`);
  const spiderSvg = `<svg class="spider" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}">
    <path d="${[...legs, ...legs.map(mirror)].join(' ')}"/>
    <circle cx="12" cy="8.8" r="1.9"/><ellipse cx="12" cy="14.4" rx="2.7" ry="3.4"/></svg>`;

  // One web, drawn once: 8 spokes and 3 rings that sag slightly between spokes.
  const webPath = (() => {
    const R = 34, C = 36, n = 8, at = (r, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return [C + r * Math.cos(a), C + r * Math.sin(a)];
    };
    let d = '';
    for (let i = 0; i < n; i++) d += `M${C} ${C} L${at(R, i).join(' ')} `;
    for (const r of [10, 19, 28]) {
      d += `M${at(r, 0).join(' ')} `;
      for (let i = 1; i <= n; i++) {
        const [cx, cy] = at(r * 0.86, i - 0.5);
        d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${at(r, i).map((v) => v.toFixed(1)).join(' ')} `;
      }
    }
    return d.trim();
  })();

  const layer = document.createElement('div');
  layer.className = 'spider-layer is-hidden';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `<svg class="spider-thread" width="100%" height="100%"><line pathLength="1"/></svg>${spiderSvg}`;
  document.body.append(layer);
  document.documentElement.classList.add('has-cursor');

  const spider = layer.querySelector('.spider');
  const thread = layer.querySelector('.spider-thread');
  const line = thread.querySelector('line');

  const mouse = { x: 0, y: 0 };
  const drawn = { x: 0, y: 0 };
  let target = null;
  let frame = 0;
  let seen = false;

  const tick = () => {
    const dx = mouse.x + OFFSET - drawn.x;
    const dy = mouse.y + OFFSET + (target ? DROP : 0) - drawn.y;
    drawn.x += dx * EASE;
    drawn.y += dy * EASE;
    spider.style.transform = `translate3d(${drawn.x - SIZE / 2}px, ${drawn.y - SIZE / 2}px, 0)`;
    line.setAttribute('x1', drawn.x);
    line.setAttribute('y1', drawn.y - 3); // from the spider's head
    if (target) {
      // Hang from the element's bottom edge above the pointer; re-read each frame so it holds on scroll.
      const r = target.getBoundingClientRect();
      line.setAttribute('x2', Math.min(Math.max(mouse.x, r.left), r.right));
      line.setAttribute('y2', r.bottom);
    }
    const moving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
    frame = moving || target ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!seen) { seen = true; drawn.x = e.clientX + OFFSET; drawn.y = e.clientY + OFFSET; }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    layer.classList.toggle('is-hidden', !!e.target.closest?.(TEXT));
    wake();
  });

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.(TARGETS) || null;
    if (t === target) return;
    target = t;
    thread.classList.remove('is-on');
    if (target) {
      tick();
      void line.getBoundingClientRect(); // restart the draw-out from the spider
      thread.classList.add('is-on');
    }
    wake();
  });

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest?.(TEXT)) return;
    const web = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    web.setAttribute('class', 'web');
    web.setAttribute('viewBox', '0 0 72 72');
    web.innerHTML = `<path d="${webPath}"/>`;
    web.style.left = `${e.clientX}px`;
    web.style.top = `${e.clientY}px`;
    web.addEventListener('animationend', () => web.remove(), { once: true });
    layer.append(web);
  });

  document.documentElement.addEventListener('pointerleave', () => layer.classList.add('is-hidden'));
  window.addEventListener('blur', () => layer.classList.add('is-hidden'));
})();
