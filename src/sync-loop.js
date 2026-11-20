  /* ---------- sync loop ---------- */
  let wasPaused = null, wasMuted = null, wasLiked = null, wasShuf = null, wasRep = null, miniShowAt = 0, wasOpen = false, tick = 0;

  /* amPerf(): run it in the console, use YTM for a while (30 s), then it prints how long each part of the loop takes
     (average and slowest, in ms) and how long the bar took to show each click. Run it again to stop early. Off, it
     costs nothing: perfPart() just calls the function. */
  let perf = null;
  const perfAdd = (name, d) => {
    const x = perf.parts.get(name) || { calls: 0, total: 0, max: 0 };
    x.calls++; x.total += d; x.max = Math.max(x.max, d);
    perf.parts.set(name, x);
  };
  const perfPart = (name, fn) => {
    if (!perf) return fn();
    const t = performance.now();
    try { return fn(); } finally { perfAdd(name, performance.now() - t); }
  };
  // a bar button was clicked / a shortcut pressed, and the bar's icon for it has now changed
  let perfClickAt = 0, perfClickWhat = '';
  const perfClick = what => { if (perf) { perfClickAt = performance.now(); perfClickWhat = what; } };
  // syncState saw one of the bar's icons change: kickState can stop soon (and amPerf times the click)
  let stateChanged = false, changedAt = 0;
  const sawChange = what => { stateChanged = true; changedAt = performance.now(); perfSaw(what); };
  const perfSaw = what => {
    if (!perf || !perfClickAt || performance.now() - perfClickAt > 3000) return;
    perf.clicks.push({ click: perfClickWhat, shown: what, ms: Math.round(performance.now() - perfClickAt) });
    perfClickAt = 0;
  };
  // laps inside one part (syncState): each lap is the time since the last one, listed as its own row
  let lapAt = 0;
  const perfLapStart = () => { if (perf) lapAt = performance.now(); };
  const perfLap = name => { if (!perf) return; const t = performance.now(); perfAdd(name, t - lapAt); lapAt = t; };
  const perfReport = () => {
    const p = perf;
    perf = null;
    clearTimeout(p.timer);
    const s = (performance.now() - p.t0) / 1000;
    const rows = [...p.parts].sort((a, b) => b[1].total - a[1].total).map(([part, x]) => ({ part, calls: x.calls,
      'avg ms': +(x.total / x.calls).toFixed(2), 'max ms': +x.max.toFixed(2), 'ms per s': +(x.total / s).toFixed(2) }));
    console.log(`[am-bar] amPerf: ${s.toFixed(1)} s`);
    console.table(rows);
    if (p.clicks.length) console.table(p.clicks); else console.log('[am-bar] amPerf: no bar clicks measured');
  };
  window.amPerf = (seconds = 30) => {
    if (perf) { perfReport(); return; }
    perf = { t0: performance.now(), parts: new Map(), clicks: [] };
    perf.timer = setTimeout(() => perf && perfReport(), seconds * 1000);
    console.log(`[am-bar] amPerf: measuring for ${seconds} s. Run amPerf() again to stop early`);
  };

  /* the bar's state from YTM: song, progress, play / pause, mute, volume, like, shuffle, repeat, lyrics / queue. The
     loop runs it 4 times a second; after an action, kickState() runs it on every frame for a moment, so the bar shows
     YTM's new state as soon as YTM has it (not on the next tick). It only ever shows what YTM shows. */
  const syncState = () => {
    perfLapStart();
    const m = navigator.mediaSession.metadata;
    const idle = !m || !m.title;
    bar.classList.toggle('am-idle', idle);
    if (!idle) {
      if (title.textContent !== m.title) { if (title.textContent) sawChange('song'); title.textContent = m.title; }
      renderByline(m);
      const src = m.artwork && m.artwork.length ? m.artwork[m.artwork.length - 1].src : '';
      if (src && art.src !== src) art.src = src;
    }
    perfLap('  state: song, byline');
    const v = video();
    if (v) {
      const st = songTime(), pct = st ? (st.cur / st.dur) * 100 : 0;
      if (seeking === null) fill.style.width = pct + '%';
      if (formNow === 'rail') { drawRing(); setProgress(pct); }
      if (formNow === 'classic' || formNow === 'rail') {
        const tt = st ? mmss(st.cur) + ' / ' + mmss(st.dur) : '0:00 / 0:00';
        if (timeEl.textContent !== tt) timeEl.textContent = tt;
      }
      if (v.paused !== wasPaused) {
        if (wasPaused !== null) sawChange('play / pause');
        wasPaused = v.paused;
        bar.classList.toggle('am-paused', v.paused);
        play.replaceChildren(svg(v.paused ? P.play : P.pause));
      }
      const muted = v.muted || getVolume() === 0;
      if (muted !== wasMuted) {
        if (wasMuted !== null) sawChange('mute');
        wasMuted = muted;
        volBtn.replaceChildren(svg(muted ? P.mute : P.vol));
      }
    }
    perfLap('  state: progress, play, mute');
    if (document.activeElement !== volRange && volTarget === null) {                     // not mid-glide
      const vol = String(getVolume());
      if (volRange.value !== vol) volRange.value = vol;
    }
    showVolPct();
    perfLap('  state: volume');

    const lk = ytLike();
    const liked = isLiked(lk);
    if (liked !== wasLiked) {
      if (wasLiked !== null) sawChange('like');
      // a small bounce is the feedback (YTM's own toast is hidden); not on the first look or a new song
      if (wasLiked !== null && performance.now() - lastLikeAt < 4000) bounceHeart();
      wasLiked = liked;
      likeBtn.replaceChildren(svg(liked ? P.heartFill : P.heart));
      likeBtn.classList.toggle('am-on', liked);
      likeBtn.title = liked ? 'Remove like' : 'Like';
    }

    perfLap('  state: like');
    // YTM's store first (ytQueueModes, ytm-hooks.js); else what its buttons say
    const qm = ytQueueModes();
    const s = !qm && yt('Shuffle');
    const shufOn = qm ? qm.shuffle : !!s && s.getAttribute('aria-pressed') === 'true';
    if (shuf.classList.toggle('am-on', shufOn) !== wasShuf) { if (wasShuf !== null) sawChange('shuffle'); wasShuf = !wasShuf; }
    const r = !qm && yt('Repeat');
    // the store's 'NONE' contains "one": mapped exactly, not matched by text
    const rl = qm ? ({ ALL: 'all', ONE: 'one' }[qm.repeat] || 'off') : ((r && r.getAttribute('aria-label')) || '').toLowerCase();
    rep.classList.toggle('am-on', rl.includes('all') || rl.includes('one'));
    rep.classList.toggle('am-one', rl.includes('one'));
    if (rl !== wasRep) { if (wasRep !== null) sawChange('repeat'); wasRep = rl; }

    perfLap('  state: shuffle, repeat');
    bar.classList.toggle('am-page-mode', isMobile() && stateOpen() && !sheetOpen());
    const open = pageOpen();
    lyricsBtn.classList.toggle('am-on', tabActive(...LYRICS, open));
    queueBtn.classList.toggle('am-on', tabActive(...UPNEXT, open));
    perfLap('  state: lyrics, queue');
    return { m, idle };
  };
  let kickRaf = 0, kickUntil = 0, loopOff = false;
  const kickState = (ms = 400) => {
    // the bar has just shown a change (this is likely the event of that same change, e.g. volumechange after the
    // mute button): two frames are enough
    if (performance.now() - changedAt < 100) ms = Math.min(ms, 33);
    kickUntil = Math.max(kickUntil, performance.now() + ms);
    if (kickRaf || loopOff) return;
    const frame = () => {
      kickRaf = 0;
      if (zenEl) return;
      stateChanged = false;
      perfPart('syncState (after an action)', syncState);
      // the change has shown: two more frames (a second part of it, e.g. the art after the title), then the loop again
      if (stateChanged) kickUntil = Math.min(kickUntil, performance.now() + 33);
      if (performance.now() < kickUntil && !loopOff) kickRaf = requestAnimationFrame(frame);
    };
    kickRaf = requestAnimationFrame(frame);
  };
  // YTM's own controls and keys too (space, media keys): the video says when it plays, pauses, mutes or loads a song.
  // Media events don't bubble, so they are caught on the way down. Volume: only a mute change (a drag fires many)
  let evMuted = null;
  for (const t of ['play', 'pause', 'loadeddata', 'emptied']) document.addEventListener(t, () => kickState(t === 'loadeddata' ? 800 : 300), true);
  document.addEventListener('volumechange', e => {
    const v = e.target;
    if (v && v.muted !== evMuted) { evMuted = v.muted; kickState(300); }
  }, true);

  /* page scans (hideBase's strip check, the custom background's sweep): they hit-test the page, which is slow. They
     run on every tick for SCAN_BURST_MS after something changed that can bring new elements or move them (the address,
     the player page, the bar's place or form, the window's size, fullscreen, the look settings; a scroll that ended
     adds SCAN_SCROLL_MS: the home page loads more shelves), and every 2 s at other times. */
  const SCAN_BURST_MS = 3000, SCAN_SCROLL_MS = 1000;
  let scanUntil = 0, scanKey = '';
  const scanSoon = ms => { scanUntil = Math.max(scanUntil, performance.now() + ms); };
  const scanDue = () => performance.now() < scanUntil || tick % 8 === 0;
  addEventListener('scrollend', () => scanSoon(SCAN_SCROLL_MS), { capture: true, passive: true });
  const watchScan = () => {
    const k = [location.href, stateOpen(), isFullscreen(), posNow, formNow, settings.barFloat, innerWidth, innerHeight,
      look.bg, look.bgPlayer].join('|');
    if (k !== scanKey) { scanKey = k; scanSoon(SCAN_BURST_MS); }
  };

  const loopTick = () => {
    perfPart('syncSpeed', syncSpeed);                                          // also in zen: the speed stays what it is set to
    perfPart('checkPrompts', checkPrompts);                                       // also in zen ("Listen on this device?")
    if (zenEl) return;                                    // zen covers everything: nothing here is visible, save the work
    if (document.hidden) return;                          // a background tab: nothing shows; a full tick on return (below)
    // the settings panel covers the page: the page checks below (they measure the page, which is slow) wait, so the
    // panel stays smooth. The bar keeps updating, it is the live preview for the bar settings.
    const busy = !!setEl;
    perfPart('watchScan', watchScan);
    if (!busy && performance.now() > animatingUntil) perfPart('hideBase', hideBase);   // skip layout-heavy work mid-animation
    if (tick++ % 4 === 0 && !busy) { perfPart('syncGuideEntry', syncGuideEntry); perfPart('syncBrand', syncBrand); }   // sidebar entry, header logo: once a second is plenty
    // custom background: clear new page backgrounds (every other tick while scans run often, else every 2 s)
    if (!busy && performance.now() > animatingUntil && (performance.now() < scanUntil ? tick % 2 === 0 : tick % 8 === 2)) perfPart('sweepBg', sweepBg);
    const pk = pageKey();                                 // another kind of page: its own dim / blur / header
    if (pk !== curPage) {
      html.classList.remove('am-page-' + curPage);
      curPage = pk;
      html.classList.add('am-page-' + curPage);
      perfPart('applyBgVars', applyBgVars);
      perfPart('clearShade', clearShade);
    }
    if (tick % 4 === 1 && !busy && curPage === 'artist') perfPart('syncArtist', syncArtist);
    if (tick % 4 === 3 && !busy) perfPart('roomForPlaying', roomForPlaying);        // room for the playing row's overlay
    if (tick % 4 === 1 && !busy) perfPart('syncHqArt', syncHqArt);             // high-quality art (off by default)
    perfPart('placeBar', placeBar);                                           // bottom / top, in or under the header
    perfPart('syncSearch', syncSearch);
    perfPart('syncSearchGlass', syncSearchGlass);                                    // the glass behind search suggestions (bar-position.js)
    perfPart('updateRefractMap', updateRefractMap);                                   // no-op unless refraction is on and the bar changed size
    perfPart('watchPage', watchPage);
    perfPart('onPageState', onPageState);
    bar.classList.toggle('am-hidden', isFullscreen());
    perfPart('syncAutoHide', syncAutoHide);
    perfPart('syncPeek', syncPeek);
    perfPart('syncYtToast', syncYtToast);

    const { m, idle } = perfPart('syncState', syncState);
    const artSrc = idle ? '' : (m.artwork && m.artwork.length ? m.artwork[m.artwork.length - 1].src : '');
    perfPart('syncCircle', () => syncCircle(artSrc));
    { const v = video(); perfPart('syncVinyl', () => syncVinyl(artSrc, !v || v.paused)); }

    // mobile: YTM's own mini art is hidden while the player page is open, and fades back in after it closed
    const openNow = stateOpen();
    if (openNow) document.documentElement.classList.add('am-mini-hidden');
    else if (wasOpen) miniShowAt = performance.now() + dur(MINI_ART_DELAY_MS);      // just closed: start the delay now
    else if (performance.now() > miniShowAt) document.documentElement.classList.remove('am-mini-hidden');
    wasOpen = openNow;

    // mobile: line YTM's own mini art up with the art in our bar (center to center)
    const yp = document.querySelector('ytmusic-player[player-ui-state="PLAYER_BAR_ONLY"]');
    const ypImg = yp && yp.querySelector('#song-image');
    if (yp && ypImg && !idle && isMobile()) {
      const a = art.getBoundingClientRect(), t = ypImg.getBoundingClientRect();
      if (a.width && t.width) {
        const dx = (parseFloat(yp.style.getPropertyValue('--am-dx')) || 0) + (a.left + a.width / 2 - t.left - t.width / 2);
        const dy = (parseFloat(yp.style.getPropertyValue('--am-dy')) || 0) + (a.top + a.height / 2 - t.top - t.height / 2);
        yp.style.setProperty('--am-dx', dx.toFixed(1) + 'px');
        yp.style.setProperty('--am-dy', dy.toFixed(1) + 'px');
      }
    }
  };
  const timer = setInterval(() => perfPart('(whole tick)', loopTick), 250);
  // back from the background: everything at once, not on the next tick
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !loopOff) loopTick(); });

  // amOff(): undo everything this script did to the page, so you can check whether a problem is ours or YTM's
  window.amOff = () => {
    clearInterval(timer);
    loopOff = true;
    cancelAnimationFrame(kickRaf);
    closeMenu();
    closeSettings();
    closePalette();
    promptObs.disconnect();
    peekReset();
    for (const n of [toastEl, peekEl, pFly, pEdge, pShade, shareStyle, peekStyle, ahStyle, keyStyle, themeStyle]) n.remove();
    bar.remove();
    for (const list of guideEntries.values()) list.forEach(e => e.g.remove());
    for (const n of [...roomed.keys()]) unroom(n);
    styleEl.remove();
    setStyle.remove();
    setVars.remove();
    posBase.remove();
    posStyle.remove();
    searchGlass.remove();
    glassObs.disconnect();
    hqReset();
    ['--am-hx', '--am-hw', '--am-hy', '--am-vx', '--am-vw', '--am-vy', '--am-vb', '--am-rpad'].forEach(v => bar.style.removeProperty(v));
    gFoot.remove();
    if (brandEl) brandEl.remove();
    document.querySelectorAll('.am-brand-crop, .am-lib-out').forEach(n => { n.classList.remove('am-brand-crop', 'am-lib-out'); n.style.removeProperty('--am-brand-h'); });
    flyClear();
    fly.remove();
    shade.remove();
    edge.remove();
    rope.remove();
    document.documentElement.classList.remove('am-pos-' + posNow, 'am-in-header', 'am-top-float', 'am-search-open', 'am-dock',
      'am-side', 'am-side-in', 'am-side-float', 'am-side-full', 'am-side-fallback', 'am-brand-on');
    sideEdgeLines(false);
    document.documentElement.classList.remove('am-refract', 'am-easy-track', 'am-show-volpct', 'am-ah');
    refractDefs.remove();
    document.documentElement.classList.remove('am-player-open', 'am-animating', 'am-fs', 'am-mini-hidden');
    document.querySelectorAll(`${MINI}, ytmusic-player-bar, #player-bar-background`).forEach(n => {
      n.style.removeProperty('opacity'); n.style.removeProperty('pointer-events');
    });
    document.querySelectorAll('ytmusic-app, ytmusic-app-layout, ytmusic-player-page').forEach(n =>
      n.style.removeProperty('--ytmusic-player-bar-height'));
    document.querySelectorAll('ytmusic-player').forEach(n => { n.style.removeProperty('--am-dx'); n.style.removeProperty('--am-dy'); });
    if (gmEl) gmEl.remove();
    zenOff();
    vinylOff();
    circleOff();
    changelogOff();
    bgLayer.remove();
    restoreCleared();
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    lookStyle.remove();
    googleStyle.remove();
    if (fileFace) document.fonts.delete(fileFace);
    html.classList.remove('am-bg-on', 'am-font-all', 'am-hide-banner', 'am-artist-nobanner', 'am-artist-noshade', 'am-page-' + curPage);
    if (pfpEl) pfpEl.remove();
    clearShade();
    for (const v of ['--am-font', '--am-bg-dim', '--am-bg-blur']) html.style.removeProperty(v);
    console.log('[am-bar] off: bar, styles and inline overrides removed');
  };
