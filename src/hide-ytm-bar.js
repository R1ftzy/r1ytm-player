  /* ---------- hide YTM's bar, gray strip, reserved space ---------- */
  // These run every tick, but a property is only written when the element's inline style doesn't already have it: a
  // write, even of the same value, can make Firefox restyle everything under the element (for ytmusic-app: all of YTM,
  // about 10 ms a tick), and the next style read pays for it. Reading n.style never makes the browser restyle.
  // `check`: the longhand to compare when `prop` is a shorthand.
  const setImportant = (n, prop, val, check = prop) => {
    if (n.style.getPropertyValue(check) !== val || n.style.getPropertyPriority(check) !== 'important') n.style.setProperty(prop, val, 'important');
  };
  const hideNode = n => {
    setImportant(n, 'opacity', '0');
    setImportant(n, 'pointer-events', 'none');
  };
  const clearBg = n => {
    setImportant(n, 'background', 'transparent', 'background-color');
    setImportant(n, 'box-shadow', 'none');
    setImportant(n, 'border-color', 'transparent', 'border-top-color');
  };
  const setBarHeight = (n, v) => setImportant(n, '--ytmusic-player-bar-height', v);
  const isOpaque = c => c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c);

  const hideBase = () => {
    const fs = isFullscreen();
    document.documentElement.classList.toggle('am-fs', fs);

    // normal pages: no reserved space, content scrolls under the floating bar
    // the bar's size is read before anything is written (a read after a write makes the browser lay the page out again)
    const bh = bar.offsetHeight;
    for (const n of document.querySelectorAll('ytmusic-app, ytmusic-app-layout')) setBarHeight(n, '0px');
    // player page: keep YTM's own bottom space so its layout stays aligned (none in fullscreen, none with the bar at
    // the top: placeBar() gives it space at the start instead)
    const pp = playerPage();
    const space = bh ? (bh + (settings.barFloat ? 28 : 0)) + 'px' : PLAYER_PAGE_BAR_SPACE;   // bar + its margins
    if (pp) setBarHeight(pp, fs || posNow !== 'bottom' ? '0px' : space);

    document.querySelectorAll(`${MINI}, ytmusic-player-bar, #player-bar-background`).forEach(hideNode);

    // a gray strip along the bottom (hit-tested, which is slow): only when page scans are due (sync-loop.js: every tick
    // for a moment after the page changed, else every 2 s)
    if (!scanDue()) return;
    const y = innerHeight - 20;
    for (const x of [40, innerWidth - 40]) {
      for (const n of document.elementsFromPoint(x, y)) {
        if (n === document.documentElement || n === document.body || n.closest('.am-bar')) continue;
        const cs = getComputedStyle(n);
        if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
        const r = n.getBoundingClientRect();
        if (r.height > 140 || r.bottom < innerHeight - 4 || r.width < innerWidth * 0.6) continue;
        if (isOpaque(cs.backgroundColor)) clearBg(n);
      }
    }
  };

