  /* ---------- art circle: the bar bounces, then a blurred, spinning copy of the art grows in a circle behind everything ---------- */
  // Misc > Experimental (off by default). CIRCLE_DELAY_MS after the player page starts to open, the bar bounces away from
  // its edge and back (bottom bar: up, left bar: right ...). As it springs back, a circle grows out of the bar's middle
  // until it covers the whole window. Inside it: the album art, heavily blurred and darkened, turning slowly.
  // The layer is fixed behind the whole app (like the custom background, .am-bg, and above it). While it shows, the
  // fills that would hide it are see-through: the page, YTM's header and sidebar, and any other big dark fill
  // (measured; put back when the page closes). On a new song the next art fades in over the old one.
  const acBox = el('div', 'am-circle');
  const acClip = el('div', 'am-circle-clip', acBox);      // the growing circle
  const acSpin = el('div', 'am-circle-spin', acClip);
  const acStyle = el('style', null, document.head);
  acStyle.textContent = `
    /* the base outside the circle: YTM's own dark, or the custom background (.am-bg, under this layer) when there is one */
    .am-circle { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; display: none; background: #030303;
      transition: opacity .3s ease; }
    html.am-bg-on .am-circle { background: transparent; }
    html.am-circle-show .am-circle { display: block; }
    .am-circle-clip { position: absolute; inset: 0; overflow: hidden; }
    .am-circle.am-circle-wait .am-circle-clip { clip-path: circle(0px at 50% 100%); }
    .am-circle.am-circle-out { opacity: 0; }
    /* a square bigger than the window's diagonal, so the turning art always covers it */
    .am-circle-spin { position: absolute; left: 50%; top: 50%; width: 150vmax; height: 150vmax; margin: -75vmax 0 0 -75vmax;
      will-change: transform; animation: am-circle-spin ${CIRCLE_SPIN_S}s linear infinite; }
    @keyframes am-circle-spin { to { transform: rotate(360deg); } }
    /* larger than the square: a blur fades out at its own edges */
    .am-circle-art { position: absolute; inset: calc(-2 * ${CIRCLE_BLUR}px); background: center / cover no-repeat;
      filter: blur(${CIRCLE_BLUR}px) saturate(1.4) brightness(.55); opacity: 0; transition: opacity ${CIRCLE_FADE_MS}ms ease; }
    .am-circle-art.am-ready { opacity: 1; }
    @media (prefers-reduced-motion: reduce) { .am-circle-spin { animation: none; } }
    /* see-through while it shows: the page, YTM's header and sidebar, and the app behind them */
    html.am-circle-show, html.am-circle-show body,
    html.am-circle-show :is(ytmusic-app, ytmusic-app-layout, #layout, ytmusic-player-page, #nav-bar-background,
      #guide-wrapper, #guide-content, #guide-renderer, #mini-guide, #mini-guide-background, #mini-guide-renderer) {
      background: transparent !important; }
    html.am-circle-show #nav-bar-background { backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
      box-shadow: none !important; border: 0 !important; }
  `;

  let acSrc = '', acPending = '', acAnim = null, acTimer = 0, acHideTimer = 0;
  let acShown = false;                      // the circle is open (or opening) for this opening of the page
  const acCleared = new Map();              // element -> its inline background-color before (to put back)

  // the next art: loaded first, then faded in over the old one, which goes once the fade is done
  const acSetArt = src => {
    acSrc = src;
    acPending = src;
    const im = new Image();
    im.onload = () => {
      if (acPending !== src) return;        // a newer song came meanwhile
      const layer = el('div', 'am-circle-art', acSpin);
      layer.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`;
      requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('am-ready')));
      setTimeout(() => { for (const n of [...acSpin.children]) if (n !== layer && layer.isConnected) n.remove(); }, CIRCLE_FADE_MS + 100);
    };
    im.src = src;
  };

  const acSide = () => (isMobile() ? 'bottom' : posNow);

  // the bar jumps away from its edge and comes back with a small overshoot (translate: the bar's transform is in use)
  const bounceBar = () => {
    if (reduceMotion.matches || ['am-hidden', 'am-autohid', 'am-idle'].some(c => bar.classList.contains(c))) return;
    const side = acSide();
    const [dx, dy] = side === 'bottom' ? [0, -1] : side === 'top' ? [0, 1] : side === 'left' ? [1, 0] : [-1, 0];
    const at = k => `${(dx * k).toFixed(1)}px ${(dy * k).toFixed(1)}px`;
    const B = CIRCLE_BOUNCE_PX;
    bar.animate([
      { translate: '0px 0px', easing: 'cubic-bezier(.2, .7, .3, 1)' },
      { translate: at(B), offset: 0.3, easing: 'cubic-bezier(.5, 0, .7, .4)' },
      { translate: at(-B * 0.22), offset: 0.62, easing: 'cubic-bezier(.3, .6, .4, 1)' },
      { translate: at(B * 0.06), offset: 0.82 },
      { translate: '0px 0px' },
    ], { duration: CIRCLE_BOUNCE_MS });
  };

  // other dark fills that would cover the circle (YTM's layouts differ between accounts): measured on a grid that
  // includes the header row and the sidebar column. Only big ones: a full-width strip or a full-height column.
  const acSweep = () => {
    for (const fx of [0.01, 0.04, 0.3, 0.6, 0.97]) for (const fy of [0.02, 0.05, 0.5, 0.92]) {
      for (const n of document.elementsFromPoint(innerWidth * fx, innerHeight * fy)) {
        if (n === html || n === document.body || acCleared.has(n)) continue;
        if (n.closest('.am-bar, .am-menu, .am-set-back, .am-gm, .am-bg, .am-circle, .am-zen, ytmusic-player, .am-vinyl, ' +
          'tp-yt-iron-dropdown, tp-yt-paper-dialog')) continue;
        const r = n.getBoundingClientRect();
        if (!(r.height >= innerHeight * 0.6 || r.width >= innerWidth * 0.6)) continue;
        const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none' || !darkOpaque(cs.backgroundColor)) continue;
        acCleared.set(n, n.style.getPropertyValue('background-color'));
        n.style.setProperty('background-color', 'transparent', 'important');
      }
    }
  };
  const acUnsweep = () => {
    for (const [n, v] of acCleared) { if (v) n.style.setProperty('background-color', v); else n.style.removeProperty('background-color'); }
    acCleared.clear();
  };

  // the circle, from the middle of the bar (or the middle of the bar's edge when the bar isn't on screen) to the
  // farthest corner of the window
  const acGrow = () => {
    const w = innerWidth, h = innerHeight;
    const b = bar.getBoundingClientRect();
    const side = acSide();
    let cx, cy;
    if (b.width && !bar.classList.contains('am-hidden')) { cx = b.left + b.width / 2; cy = b.top + b.height / 2; }
    else { cx = side === 'left' ? 0 : side === 'right' ? w : w / 2; cy = side === 'top' ? 0 : side === 'bottom' ? h : h / 2; }
    const R = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + 2;
    const at = `at ${cx.toFixed(0)}px ${cy.toFixed(0)}px`;
    acBox.classList.remove('am-circle-wait');
    if (acAnim) acAnim.cancel();
    const anim = acAnim = acClip.animate([{ clipPath: `circle(0px ${at})` }, { clipPath: `circle(${R.toFixed(0)}px ${at})` }],
      { duration: CIRCLE_GROW_MS, easing: 'cubic-bezier(.45, 0, .2, 1)' });
    const done = () => { if (acAnim === anim) acAnim = null; };
    anim.finished.then(done, done);
  };

  // player-page.js calls these when the page opens / starts to close
  const circleOpen = () => {
    if (!settings.artCircle) return;
    if (!acBox.isConnected) document.body.append(acBox);   // after the custom background layer: drawn over it
    clearTimeout(acTimer);
    clearTimeout(acHideTimer);
    acTimer = acHideTimer = 0;
    if (acAnim) { acAnim.cancel(); acAnim = null; }
    acShown = true;
    acBox.classList.remove('am-circle-out');
    html.classList.add('am-circle-show');
    acSweep();
    if (reduceMotion.matches) { acBox.classList.remove('am-circle-wait'); return; }
    acBox.classList.add('am-circle-wait');
    acTimer = setTimeout(() => {
      acTimer = 0;
      bounceBar();
      // out of the bar as it springs back
      acTimer = setTimeout(() => { acTimer = 0; acGrow(); }, CIRCLE_BOUNCE_MS * 0.3);
    }, CIRCLE_DELAY_MS);
  };
  // fades out while the page closes, then the header, sidebar and page get their own fills back
  const circleClose = () => {
    clearTimeout(acTimer);
    acTimer = 0;
    if (!acShown) return;
    acShown = false;
    acBox.classList.add('am-circle-out');
    clearTimeout(acHideTimer);
    acHideTimer = setTimeout(() => {
      acHideTimer = 0;
      if (acShown) return;
      if (acAnim) { acAnim.cancel(); acAnim = null; }
      html.classList.remove('am-circle-show');
      acUnsweep();
    }, 320);
  };

  // sync loop: keep the art ready, and turn on / off with the setting
  const syncCircle = src => {
    if (!settings.artCircle) {
      if (acShown || html.classList.contains('am-circle-show')) {
        circleClose();
        clearTimeout(acHideTimer);
        acHideTimer = 0;
        html.classList.remove('am-circle-show');
        acUnsweep();
      }
      return;
    }
    if (src && src !== acSrc) acSetArt(src);
    if (lastOpen !== true) return;
    if (!acShown) { circleOpen(); return; }                 // turned on while the page is open
    if (tick % 8 === 0 && performance.now() > animatingUntil) acSweep();
  };
  const circleOff = () => {
    circleClose();
    clearTimeout(acHideTimer);
    if (acAnim) acAnim.cancel();
    acBox.remove();
    acStyle.remove();
    acUnsweep();
    html.classList.remove('am-circle-show');
  };
