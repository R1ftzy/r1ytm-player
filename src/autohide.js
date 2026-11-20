  /* ---------- auto-hide: the bar goes after a few seconds, and comes back when the pointer comes near it ---------- */
  // "Near": over the bar's place (plus a margin), or at the window's edge on the bar's side. It stays while something of
  // it is in use (a menu, the settings, a drag on the progress bar, the volume, the tape, the peek, keyboard focus),
  // shows for a moment when the song changes, and never hides on phones or while nothing plays.
  // The page keeps the bar's room (nothing jumps when it comes and goes).
  const AUTOHIDE_NEAR = 48;                   // px around the bar's place that count as near
  const AUTOHIDE_EDGE = 10;                   // px from the window's edge on the bar's side
  const AUTOHIDE_SONG_MS = 3000;              // shown this long when a new song starts
  let ahPointer = null, ahAwakeUntil = 0, ahRect = null, ahTitle = '';
  let ahMoveRaf = 0;
  addEventListener('pointermove', e => {
    ahPointer = { x: e.clientX, y: e.clientY };
    // hidden and the pointer came near: back now, not on the next tick (once a frame at most). Hiding stays on the loop
    if (!ahMoveRaf && bar.classList.contains('am-autohid')) ahMoveRaf = requestAnimationFrame(() => {
      ahMoveRaf = 0;
      if (bar.classList.contains('am-autohid') && ahNear()) syncAutoHide();
    });
  }, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', () => { ahPointer = null; });
  // show the bar now (a shortcut, a song change); it hides again after the delay
  const revealBar = (ms = AUTOHIDE_SONG_MS) => { ahAwakeUntil = Math.max(ahAwakeUntil, performance.now() + ms); };
  const ahNear = () => {
    if (!ahPointer || !ahRect) return false;
    const { x, y } = ahPointer, r = ahRect;
    if (x >= r.left - AUTOHIDE_NEAR && x <= r.right + AUTOHIDE_NEAR && y >= r.top - AUTOHIDE_NEAR && y <= r.bottom + AUTOHIDE_NEAR) return true;
    return posNow === 'bottom' ? y >= innerHeight - AUTOHIDE_EDGE : posNow === 'top' ? y <= AUTOHIDE_EDGE
      : posNow === 'left' ? x <= AUTOHIDE_EDGE : x >= innerWidth - AUTOHIDE_EDGE;
  };
  const ahBusy = () => !!menuEl || !!setEl || seeking !== null || flyOn || peekOn || peekT > 0 ||
    volWrap.classList.contains('am-vol-on') || bar.contains(document.activeElement) || inHeader;
  const syncAutoHide = () => {
    const now = performance.now();
    const on = !!settings.autoHide && !isMobile() && !bar.classList.contains('am-idle');
    const m = navigator.mediaSession.metadata, t = (m && m.title) || '';
    if (t !== ahTitle) { if (ahTitle && settings.autoHideSong) revealBar(); ahTitle = t; }
    const wasHid = bar.classList.contains('am-autohid');
    if (!wasHid) { const r = bar.getBoundingClientRect(); if (r.width) ahRect = r; }      // its place while shown
    if (!on || ahNear() || ahBusy()) { revealBar(settings.autoHideDelay * 1000); }
    const hide = on && now > ahAwakeUntil;
    if (hide !== wasHid) {
      bar.classList.toggle('am-autohid', hide);
      // a rail's glass, outline and shadow are separate shapes (the tape's, title-links.js): they go with it
      document.documentElement.classList.toggle('am-ah', hide);
      if (hide) hidePeek(true);
    }
  };
  const ahStyle = el('style', null, document.head);
  ahStyle.textContent = `
    .am-bar.am-autohid { opacity: 0; transform: translateY(24px); pointer-events: none; }
    html.am-pos-top .am-bar.am-autohid { transform: translateY(-24px); }
    html.am-pos-left .am-bar.am-autohid { transform: translateX(-24px); }
    html.am-pos-right .am-bar.am-autohid { transform: translateX(24px); }
    .am-fly, .am-fly-edge, .am-fly-shade { transition: opacity .25s ease, transform .25s ease; }
    html.am-ah :is(.am-fly, .am-fly-edge, .am-fly-shade) { opacity: 0; pointer-events: none; transform: translateY(24px); }
    html.am-ah.am-pos-top :is(.am-fly, .am-fly-edge, .am-fly-shade) { transform: translateY(-24px); }
    html.am-ah .am-fly-in { pointer-events: none; }                    /* the tape's strip can't be clicked while hidden */
    html.am-ah.am-pos-left :is(.am-fly, .am-fly-edge, .am-fly-shade) { transform: translateX(-24px); }
    html.am-ah.am-pos-right :is(.am-fly, .am-fly-edge, .am-fly-shade) { transform: translateX(24px); }
  `;
