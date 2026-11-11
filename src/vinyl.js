  /* ---------- vinyl: the player page art as a big spinning record, centered on the left edge ---------- */
  // A layer inside the player page's main panel (so it opens / closes with the page). Its center sits on the screen's
  // left edge and it is cut only by the screen edges, so the right half of the record shows. Only the art turns (one
  // composited layer, cheap); the grooves and the light on top stay still, as on a real turntable.
  // Not in video mode (the video is the point there) and not on phones (other layout).
  const vinylBox = el('div', 'am-vinyl');
  const vinylDisc = el('div', 'am-vinyl-disc', vinylBox);
  const vinylArt = el('img', 'am-vinyl-art', vinylDisc);
  vinylArt.alt = '';
  vinylArt.decoding = 'async';
  el('div', 'am-vinyl-grooves', vinylDisc);
  el('div', 'am-vinyl-shine', vinylDisc);
  el('div', 'am-vinyl-hole', vinylDisc);
  let vinylSrc = '';

  const vinylStyle = el('style', null, document.head);
  vinylStyle.textContent = `
    html.am-vinyl-on ytmusic-player-page #main-panel { position: relative; isolation: isolate; }
    html.am-vinyl-on .am-vinyl-unclip { overflow: visible !important; contain: none !important; clip-path: none !important; }
    /* YTM's own art (the whole player element; in song mode it only shows the art) */
    html.am-vinyl-on ytmusic-player-page #main-panel ytmusic-player:not([player-ui-state="PLAYER_BAR_ONLY"]):not([player-ui-state="MINIPLAYER"]) {
      opacity: 0 !important; }
    /* the box covers the whole window (placed from the panel's position), so the record is cut at the screen edges */
    .am-vinyl { position: absolute; left: var(--am-vbx, 0); top: var(--am-vby, 0); width: 100vw; height: 100vh;
      z-index: -1; overflow: hidden; pointer-events: none; display: none; }
    html.am-vinyl-on .am-vinyl { display: block; }
    .am-vinyl-disc { --r: var(--am-vr, 40vh); position: absolute; left: calc(var(--am-vcx, 0px) - var(--r)); top: calc(var(--am-vcy, 50vh) - var(--r));
      width: calc(var(--r) * 2); height: calc(var(--r) * 2); border-radius: 50%; overflow: hidden; background: #111;
      box-shadow: 0 0 0 1px rgb(255 255 255 / .06), 0 30px 80px rgb(0 0 0 / .55); }
    .am-vinyl-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
      opacity: 0; transition: opacity .5s ease; will-change: transform;
      animation: am-vinyl-spin var(--am-vinyl-dur, 40s) linear infinite; }
    .am-vinyl-art.am-ready { opacity: 1; }
    html.am-vinyl-paused .am-vinyl-art { animation-play-state: paused; }
    @keyframes am-vinyl-spin { to { transform: rotate(360deg); } }
    /* fine grooves, a darker outer band, the edge of the label and a lead-out ring */
    .am-vinyl-grooves { position: absolute; inset: 0; border-radius: 50%;
      background:
        radial-gradient(circle, transparent 33.6%, rgb(0 0 0 / .45) 34%, transparent 34.6%),
        radial-gradient(circle, transparent 37%, rgb(0 0 0 / .25) 37.4%, transparent 38%),
        radial-gradient(circle, transparent 94%, rgb(0 0 0 / .35) 96%, rgb(0 0 0 / .6) 100%),
        repeating-radial-gradient(circle, rgb(0 0 0 / 0) 0 3px, rgb(0 0 0 / .09) 3px 4px); }
    /* the light: two soft wedges, fixed while the record turns */
    .am-vinyl-shine { position: absolute; inset: 0; border-radius: 50%; mix-blend-mode: soft-light;
      background: conic-gradient(from 20deg, transparent 0deg, rgb(255 255 255 / .55) 18deg, transparent 40deg,
        transparent 180deg, rgb(255 255 255 / .4) 198deg, transparent 220deg); }
    .am-vinyl-hole { position: absolute; left: 50%; top: 50%; width: 3%; height: 3%; translate: -50% -50%; border-radius: 50%;
      background: #0b0b0b; box-shadow: 0 0 0 2px rgb(255 255 255 / .12), inset 0 2px 4px rgb(0 0 0 / .8); }
    @media (prefers-reduced-motion: reduce) { .am-vinyl-art { animation: none; } }
  `;
  vinylArt.addEventListener('load', () => vinylArt.classList.add('am-ready'));

  // YTM art urls end in "=w544-h544-…": ask for a bigger one, the record is much larger than YTM's art
  const bigArt = src => src.replace(/=w\d+-h\d+/, '=w1200-h1200');
  const videoMode = pp => pp.hasAttribute('video-mode') ||
    !!pp.querySelector('ytmusic-player[video-mode], ytmusic-player[video-mode_]');

  // Placement, from the main panel's place on screen: the box over the window, the center on the screen's left edge
  // at the panel's middle height, and the radius so the record reaches as far right as before (not into the queue).
  // Not while the page animates in: it is scaled then, and the values would be off.
  let vinylKey = '';
  const placeVinyl = main => {
    if (performance.now() < animatingUntil) return;
    const r = main.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // the center hole: in the middle of YTM's sidebar column when one is on screen, else on the screen's edge
    const fs = isFullscreen();
    const gd = !fs && activeGuide();
    const cx = gd ? clamp(gd.mid, 0, r.left) : 0;
    const rad = r.left - cx + Math.min(r.width * 0.84, r.height * 0.72);
    // fullscreen: YTM's panel isn't centered on the screen there, so the record is centered on the window instead
    const cy = fs ? innerHeight / 2 : r.top + r.height / 2;
    const vals = [['--am-vbx', -r.left], ['--am-vby', -r.top], ['--am-vcx', cx], ['--am-vcy', cy], ['--am-vr', rad]];
    const key = vals.map(v => Math.round(v[1])).join(',');
    if (key === vinylKey) return;
    vinylKey = key;
    for (const [k, v] of vals) vinylBox.style.setProperty(k, Math.round(v) + 'px');
  };

  // The panel and the boxes between it and the player page may cut off what overflows them; those get a class that
  // lets the record show past them (only while the record is on). Checked once each time the record is attached.
  const unclipVinyl = (main, pp) => {
    for (let n = main; n && n !== pp; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible' ||
          /paint|strict|content/.test(cs.contain || '') || cs.clipPath !== 'none') n.classList.add('am-vinyl-unclip');
    }
  };

  // called by the sync loop (4 times a second): one rect read, and only while the record shows
  const syncVinyl = (src, paused) => {
    const pp = playerPage();
    const main = pp && pp.querySelector('#main-panel');
    const on = !!settings.vinyl && !!main && !!src && !videoMode(pp) && !isMobile();
    html.classList.toggle('am-vinyl-on', on);
    html.classList.toggle('am-vinyl-paused', !!paused);
    if (!on) return;
    if (vinylBox.parentNode !== main) { main.prepend(vinylBox); vinylKey = ''; unclipVinyl(main, pp); }
    placeVinyl(main);
    const big = bigArt(src);
    if (big !== vinylSrc) {
      vinylSrc = big;
      vinylArt.classList.remove('am-ready');
      // the bigger size can fail for some art: fall back to the url as it was
      vinylArt.onerror = big !== src ? () => { vinylArt.onerror = null; vinylArt.src = src; } : null;
      vinylArt.src = big;
    }
  };
  const vinylOff = () => {
    vinylBox.remove();
    vinylStyle.remove();
    document.querySelectorAll('.am-vinyl-unclip').forEach(n => n.classList.remove('am-vinyl-unclip'));
    html.classList.remove('am-vinyl-on', 'am-vinyl-paused');
  };
