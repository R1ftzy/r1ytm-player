  /* ---------- sync loop ---------- */
  let wasPaused = null, wasMuted = null, wasLiked = null, miniShowAt = 0, wasOpen = false, tick = 0;
  const timer = setInterval(() => {
    if (zenEl) return;                                    // zen covers everything: nothing here is visible, save the work
    if (performance.now() > animatingUntil) hideBase();   // skip layout-heavy work mid-animation
    if (tick++ % 4 === 0) syncGuideEntry();               // sidebar entry: once a second is plenty
    if (tick % 4 === 2 && performance.now() > animatingUntil) sweepBg();   // custom background: clear new page backgrounds
    const pk = pageKey();                                 // another kind of page: its own dim / blur / header
    if (pk !== curPage) {
      html.classList.remove('am-page-' + curPage);
      curPage = pk;
      html.classList.add('am-page-' + curPage);
      applyBgVars();
      clearShade();
    }
    if (tick % 4 === 1 && curPage === 'artist') syncArtist();
    if (tick % 4 === 3) roomForPlaying();                 // room for the playing row's overlay
    updateRefractMap();                                   // no-op unless refraction is on and the bar changed size
    watchPage();
    onPageState();
    bar.classList.toggle('am-hidden', isFullscreen());

    const m = navigator.mediaSession.metadata;
    const idle = !m || !m.title;
    bar.classList.toggle('am-idle', idle);
    if (!idle) {
      if (title.textContent !== m.title) title.textContent = m.title;
      renderByline(m);
      const src = m.artwork && m.artwork.length ? m.artwork[m.artwork.length - 1].src : '';
      if (src && art.src !== src) art.src = src;
    }

    // mobile: YTM's own mini art is hidden while the player page is open, and fades back in after it closed
    const openNow = stateOpen();
    if (openNow) document.documentElement.classList.add('am-mini-hidden');
    else if (wasOpen) miniShowAt = performance.now() + MINI_ART_DELAY_MS;      // just closed: start the delay now
    else if (performance.now() > miniShowAt) document.documentElement.classList.remove('am-mini-hidden');
    wasOpen = openNow;

    // mobile: line YTM's own mini art up with the art in our bar (center to center)
    const yp = document.querySelector('ytmusic-player[player-ui-state="PLAYER_BAR_ONLY"]');
    const ypImg = yp && yp.querySelector('#song-image');
    if (yp && ypImg && !idle && matchMedia('(max-width: 700px)').matches) {
      const a = art.getBoundingClientRect(), t = ypImg.getBoundingClientRect();
      if (a.width && t.width) {
        const dx = (parseFloat(yp.style.getPropertyValue('--am-dx')) || 0) + (a.left + a.width / 2 - t.left - t.width / 2);
        const dy = (parseFloat(yp.style.getPropertyValue('--am-dy')) || 0) + (a.top + a.height / 2 - t.top - t.height / 2);
        yp.style.setProperty('--am-dx', dx.toFixed(1) + 'px');
        yp.style.setProperty('--am-dy', dy.toFixed(1) + 'px');
      }
    }

    const v = video();
    if (v) {
      if (seeking === null) fill.style.width = (v.duration ? (v.currentTime / v.duration) * 100 : 0) + '%';
      if (v.paused !== wasPaused) {
        wasPaused = v.paused;
        play.replaceChildren(svg(v.paused ? P.play : P.pause));
      }
      const muted = v.muted || getVolume() === 0;
      if (muted !== wasMuted) {
        wasMuted = muted;
        volBtn.replaceChildren(svg(muted ? P.mute : P.vol));
      }
    }
    if (document.activeElement !== volRange) volRange.value = String(getVolume());

    const lk = ytLike();
    const liked = isLiked(lk);
    if (liked !== wasLiked) {
      wasLiked = liked;
      likeBtn.replaceChildren(svg(liked ? P.heartFill : P.heart));
      likeBtn.classList.toggle('am-on', liked);
      likeBtn.title = liked ? 'Remove like' : 'Like';
    }

    const s = yt('Shuffle');
    shuf.classList.toggle('am-on', !!s && s.getAttribute('aria-pressed') === 'true');
    const r = yt('Repeat');
    const rl = ((r && r.getAttribute('aria-label')) || '').toLowerCase();
    rep.classList.toggle('am-on', rl.includes('all') || rl.includes('one'));
    rep.classList.toggle('am-one', rl.includes('one'));

    bar.classList.toggle('am-page-mode', isMobile() && stateOpen() && !sheetOpen());
    lyricsBtn.classList.toggle('am-on', tabActive(...LYRICS));
    queueBtn.classList.toggle('am-on', tabActive(...UPNEXT));
  }, 250);

  // amOff(): undo everything this script did to the page, so you can check whether a problem is ours or YTM's
  window.amOff = () => {
    clearInterval(timer);
    closeMenu();
    closeSettings();
    bar.remove();
    for (const list of guideEntries.values()) list.forEach(e => e.g.remove());
    for (const n of [...roomed.keys()]) unroom(n);
    styleEl.remove();
    setStyle.remove();
    for (const s of SETTINGS) if (s.css) document.documentElement.style.removeProperty(s.css(0)[0]);
    document.documentElement.classList.remove('am-refract', 'am-easy-track');
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
