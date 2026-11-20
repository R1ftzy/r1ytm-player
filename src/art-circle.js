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
    /* the blurred art: a small canvas, drawn once per song (acSetArt), stretched over the turning square */
    .am-circle-art { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0;
      transition: opacity ${CIRCLE_FADE_MS}ms ease; }
    /* a browser without canvas filters: the art at full size with a CSS blur, larger than the square (a blur fades out at
       its own edges) */
    .am-circle-art.am-circle-css { left: calc(-2 * ${CIRCLE_BLUR}px); top: calc(-2 * ${CIRCLE_BLUR}px);
      width: calc(100% + 4 * ${CIRCLE_BLUR}px); height: calc(100% + 4 * ${CIRCLE_BLUR}px);
      filter: blur(${CIRCLE_BLUR}px) saturate(1.4) brightness(.55); }
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

  /* The art, blurred, drawn once per song on a small canvas (AC_CANVAS px) that is stretched over the turning square.
     The blur makes it smooth, so the small size doesn't show. Chrome gives a canvas a layer of its own and uses its
     256 px picture as it is, scaled; nothing is painted. Before, the art was a CSS-blurred layer of ~3000 px a side
     that took ~50 ms to paint (measured: a local copy of this layer, Chromium). An <img> made from the canvas was
     tried too: Chrome paints it at full size (~27 ms), so the canvas it is.
     CIRCLE_BLUR is meant for the full square (150vmax): it is scaled down with it. The art is drawn larger than the
     canvas (as the CSS version was larger than the square), so the blur doesn't darken the edges. A browser without
     canvas filters gets the CSS version. */
  const AC_CANVAS = 256;
  const acArtLayer = im => {
    const c = el('canvas', 'am-circle-art');
    c.width = c.height = AC_CANVAS;
    const ctx = c.getContext('2d');
    if (!ctx || !('filter' in ctx)) {
      const d = el('div', 'am-circle-art am-circle-css');
      d.style.background = `center / cover no-repeat url("${im.src.replace(/"/g, '%22')}")`;
      return d;
    }
    const sq = 1.5 * Math.max(innerWidth, innerHeight), b = CIRCLE_BLUR * AC_CANVAS / sq, pad = 2 * b;
    ctx.filter = `blur(${b.toFixed(2)}px) saturate(1.4) brightness(.55)`;
    const s = Math.min(im.naturalWidth, im.naturalHeight) || 1;     // cover: the art's middle square
    ctx.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, -pad, -pad, AC_CANVAS + 2 * pad, AC_CANVAS + 2 * pad);
    return c;
  };
  // the next art: loaded first, then faded in over the old one, which goes once the fade is done
  const acSetArt = src => {
    acSrc = src;
    acPending = src;
    const im = new Image();
    im.onload = () => {
      if (acPending !== src) return;        // a newer song came meanwhile
      const layer = acArtLayer(im);
      acSpin.append(layer);
      requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('am-ready')));
      setTimeout(() => { for (const n of [...acSpin.children]) if (n !== layer && layer.parentNode === acSpin) n.remove(); }, dur(CIRCLE_FADE_MS) + 100);
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
    ], { duration: dur(CIRCLE_BOUNCE_MS) });
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

  // the bar takes the circle back in: a small push into its edge, then back with a little overshoot (the open's
  // bounce, reversed and smaller)
  const catchBar = () => {
    if (reduceMotion.matches || ['am-hidden', 'am-autohid', 'am-idle'].some(c => bar.classList.contains(c))) return;
    const side = acSide();
    const [dx, dy] = side === 'bottom' ? [0, -1] : side === 'top' ? [0, 1] : side === 'left' ? [1, 0] : [-1, 0];
    const at = k => `${(dx * k).toFixed(1)}px ${(dy * k).toFixed(1)}px`;
    const B = CIRCLE_BOUNCE_PX * CIRCLE_CATCH;
    bar.animate([
      { translate: '0px 0px', easing: 'cubic-bezier(.2, .7, .3, 1)' },
      { translate: at(-B), offset: 0.35, easing: 'cubic-bezier(.3, .6, .4, 1)' },
      { translate: at(B * 0.25), offset: 0.7 },
      { translate: '0px 0px' },
    ], { duration: dur(CIRCLE_CATCH_MS) });
  };

  // where the circle grows from and shrinks back to: the middle of the bar (or the middle of the bar's edge when the
  // bar isn't on screen); R reaches the farthest corner of the window
  const acGeom = () => {
    const w = innerWidth, h = innerHeight;
    const b = bar.getBoundingClientRect();
    const side = acSide();
    let cx, cy;
    if (b.width && !bar.classList.contains('am-hidden')) { cx = b.left + b.width / 2; cy = b.top + b.height / 2; }
    else { cx = side === 'left' ? 0 : side === 'right' ? w : w / 2; cy = side === 'top' ? 0 : side === 'bottom' ? h : h / 2; }
    const R = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + 2;
    return { R, at: `at ${cx.toFixed(0)}px ${cy.toFixed(0)}px` };
  };
  // the circle's radius on screen now, mid-animation too (null: no circle clip, the whole window)
  const acRadius = () => { const m = /circle\(\s*([\d.]+)px/.exec(getComputedStyle(acClip).clipPath); return m ? +m[1] : null; };

  // grows to cover the window, from radius `from` (0: out of the bar; more when it turns back mid-close)
  const acGrow = (from = 0) => {
    const { R, at } = acGeom();
    acBox.classList.remove('am-circle-wait');
    if (acAnim) acAnim.cancel();
    const anim = acAnim = acClip.animate([{ clipPath: `circle(${from.toFixed(0)}px ${at})` }, { clipPath: `circle(${R.toFixed(0)}px ${at})` }],
      { duration: dur(CIRCLE_GROW_MS * Math.max(.35, 1 - from / R)), easing: from ? 'cubic-bezier(.2, .7, .3, 1)' : 'cubic-bezier(.45, 0, .2, 1)' });
    const done = () => { if (acAnim === anim) acAnim = null; };
    anim.finished.then(done, done);
  };
  // the close: the circle shrinks back into the bar, faster as it goes (it is drawn in), and the bar catches it.
  // From where it is when the page closes mid-grow. Outside the circle is YTM's own dark (or the custom background),
  // so when it is gone and the page gets its own fills back, nothing changes on screen
  const acShrink = () => {
    const { R, at } = acGeom();
    const from = Math.min(R, acRadius() ?? R);
    if (acAnim) acAnim.cancel();
    const anim = acAnim = acClip.animate([{ clipPath: `circle(${from.toFixed(0)}px ${at})` }, { clipPath: `circle(0px ${at})` }],
      { duration: dur(CIRCLE_SHRINK_MS * Math.max(.35, from / R)), easing: 'cubic-bezier(.55, 0, .8, .25)', fill: 'forwards' });
    anim.finished.then(() => {
      if (acAnim !== anim || acShown) return;
      catchBar();
      acHide();
    }, () => {});
  };
  // the header, sidebar and page get their own fills back
  const acHide = () => {
    clearTimeout(acHideTimer);
    acHideTimer = 0;
    if (acShown) return;
    if (acAnim) { acAnim.cancel(); acAnim = null; }
    html.classList.remove('am-circle-show');
    acUnsweep();
  };

  // player-page.js calls these when the page opens / starts to close
  const circleOpen = () => {
    if (!settings.artCircle) return;
    if (!acBox.isConnected) document.body.append(acBox);   // after the custom background layer: drawn over it
    // opened again while the circle was shrinking: it turns around from where it is, no bounce
    const turn = !!acAnim && !acShown && !reduceMotion.matches ? acRadius() : null;
    clearTimeout(acTimer);
    clearTimeout(acHideTimer);
    acTimer = acHideTimer = 0;
    acShown = true;
    acBox.classList.remove('am-circle-out');
    html.classList.add('am-circle-show');
    acSweep();
    if (turn) { acGrow(turn); return; }
    if (acAnim) { acAnim.cancel(); acAnim = null; }
    if (reduceMotion.matches) { acBox.classList.remove('am-circle-wait'); return; }
    acBox.classList.add('am-circle-wait');
    acTimer = setTimeout(() => {
      acTimer = 0;
      bounceBar();
      // out of the bar as it springs back
      acTimer = setTimeout(() => { acTimer = 0; acGrow(); }, dur(CIRCLE_BOUNCE_MS * 0.3));
    }, dur(CIRCLE_DELAY_MS));
  };
  // shrinks back into the bar while the page closes. Not grown yet (closed during the bounce): it just goes. Reduced
  // motion / animations off: a fade
  const circleClose = () => {
    clearTimeout(acTimer);
    acTimer = 0;
    if (!acShown) return;
    acShown = false;
    clearTimeout(acHideTimer);
    acHideTimer = 0;
    if (acBox.classList.contains('am-circle-wait')) { acHide(); return; }
    if (reduceMotion.matches) {
      acBox.classList.add('am-circle-out');
      acHideTimer = setTimeout(acHide, dur(320));
      return;
    }
    acShrink();
  };

  // sync loop: keep the art ready, and turn on / off with the setting
  const syncCircle = src => {
    if (!settings.artCircle) {
      // turned off while it shows: it shrinks back into the bar, as when the page closes (acHide at the end)
      if (acShown) circleClose();
      else if (html.classList.contains('am-circle-show') && !acAnim && !acHideTimer) acHide();
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
