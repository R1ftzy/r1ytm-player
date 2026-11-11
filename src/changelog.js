  /* ---------- "What's new": a popup with the changes, after an update ---------- */
  // The version last seen is kept in localStorage ("am-seen-version"). When the script's VERSION (put in by build.mjs
  // from the manifest) is newer, the popup lists every version since then, once, a moment after the page has loaded.
  // Setting "Show what's new after an update" (Misc) turns it off; Misc > What's new opens the whole list any time.
  // CHANGELOG: newest first. An entry newer than VERSION is the next update, still being made: it shows only in the
  // whole list (marked "Next update"), never as a popup.
  const CHANGELOG = [
    { v: '1.9.2', date: '2026-11-11', items: [
      'The player page slides in from the side the bar is on (top, left or right), and slides back toward it when it closes',
    ] },
    { v: '1.9.1', date: '2026-11-11', title: 'A Misc category, a vinyl to try and this list', items: [
      "What's new: this popup. It shows once after each update; turn it off under Misc",
      'Misc: one category at the end of the settings for the YouTube Music header, updates and experimental features',
      'Experimental: Vinyl (off by default). The art on the player page becomes a big spinning record, centered on the left column. It stops while the music is paused',
    ] },
    { v: '1.9.0', date: '2026-11-10', title: 'The bar on the left or right', items: [
      'New Left and Right positions: an upright rail with the art, the progress as an outline around it, the heart, playback and the rest',
      "Compact + Left sits in YouTube Music's sidebar: a rail when the sidebar is collapsed, a card when it is expanded",
      'Full runs the whole height of the window, and the page moves aside for it. On the right, your account picture goes into the rail',
      'Point at the art to roll out a tape with the song, the time and a progress bar you can drag',
      'The volume slider opens upright, and the outline shrinks around the art while paused',
      "Header settings: “R1ytm logo” shows R1ytm next to YouTube Music's red mark (off by default)",
    ] },
    { v: '1.8.0', date: '2026-11-10', title: 'The bar at the top, and a classic layout', items: [
      "Position: Bottom or Top. Top + Compact sits in YouTube Music's header, next to a shorter search box that grows while you search",
      "Classic layout, in YouTube Music's own order, next to Full and Compact",
      "Floating: turn it off to make the bar full width at the edge of the window, like YouTube Music's own",
      'Menus open on the page side of the bar, wherever the bar is',
    ] },
    { v: '1.7.0', date: '2026-11-09', title: 'Zen lyrics and a new settings layout', items: [
      'Zen shows the line being sung from Better Lyrics: 1 or 2 lines, at the bottom or under the title, with a hard cut or a smooth slide',
      'Zen settings: the layout, the fonts, which parts show, and what each line ends with',
      'Settings come in two layouts: Modern (categories on the side) or Legacy (one long list)',
      'Settings are faster, and sliders no longer slow the page down',
    ] },
    { v: '1.6.1', date: '2026-11-08', items: ['Zen mode uses less battery'] },
    { v: '1.6.0', date: '2026-11-08', title: 'Zen mode', items: [
      'A black title-card screen that locks the music for a time you pick (or with no limit)',
      'Only play / pause, next, a sleep timer and a close button that unlocks when the time is up',
    ] },
    { v: '1.5.3', date: '2026-11-08', items: [
      'Right-click works on the upcoming songs in the queue',
      'The playing song gets a rounded highlight that fits its row',
    ] },
    { v: '1.5.2', date: '2026-11-05', items: [
      'Hide the big banners at the top of pages',
      'Artist pages: show the banner, a round picture, both or neither, and remove the dark shadow',
      'Dim and blur the background separately for each kind of page',
    ] },
    { v: '1.5.1', date: '2026-11-05', items: ['Easy progress bar: it grows when you point at it, so it is easier to drag'] },
    { v: '1.5.0', date: '2026-11-05', title: 'Fonts, backgrounds and the gradient maker', items: [
      'Use any font from your device, from Google Fonts or from a font file',
      'Set your own background: a color, an image or GIF, or a gradient',
      'The gradient maker: paint with soft glowing brushes, then add grain, bloom and glass',
    ] },
    { v: '1.4.2', date: '2026-11-05', items: ['Clicking the bar no longer pauses the song in some YouTube Music layouts'] },
    { v: '1.4.1', date: '2026-11-03', items: ['The r1ytm settings entry also shows in the collapsed sidebar'] },
    { v: '1.4.0', date: '2026-11-03', items: ['Refraction: the edges of the bar bend the background like glass (Chrome, Edge and Brave)'] },
    { v: '1.3.0', date: '2026-11-03', items: ['A settings panel for the bar and menus: how see-through and blurred they are'] },
    { v: '1.2.0', date: '2026-11-03', items: ['Every 3-dot menu and right-click opens in one cleaner popup'] },
    { v: '1.1.0', date: '2026-11-01', items: ['Works in the phone layout of YouTube Music'] },
    { v: '1.0.0', date: '2026-11-01', title: 'The first version', items: [
      "A floating, Apple Music style bar in place of YouTube Music's own, with playback, like, volume, lyrics and the queue",
      'Click the bar to open the player page, with a smoother open animation',
    ] },
  ];
  const SEEN_KEY = 'am-seen-version';
  // -1, 0, 1 for "1.10.0" vs "1.9.0" (number by number, not as text)
  const cmpV = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return Math.sign(d);
    }
    return 0;
  };

  let clEl = null;
  const closeChangelog = () => {
    if (!clEl) return;
    const c = clEl;
    clEl = null;
    c.classList.add('am-set-out');
    setTimeout(() => c.remove(), 180);
  };
  // which: 'all', or a list of entries (the ones since the last version seen)
  const openChangelog = which => {
    if (clEl) return;
    closeMenu();
    const all = which === 'all';
    const back = el('div', 'am-set-back am-cl-back', document.body);
    const p = el('div', 'am-set am-cl', back);
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', "What's new in r1ytm");
    const head = el('div', 'am-set-head', p);
    el('div', 'am-set-logo', head).append(ytLogo());
    const ht = el('div', 'am-set-htext', head);
    el('div', 'am-set-title', ht).textContent = "What's new";
    el('div', 'am-set-sub', ht).textContent = 'r1ytm ' + VERSION;
    const x = el('button', 'am-set-x', head);
    x.title = 'Close';
    x.append(svg(P_CLOSE));
    x.addEventListener('click', closeChangelog);

    const list = el('div', 'am-cl-list', p);
    const render = entries => {
      list.replaceChildren();
      for (const e of entries) {
        const box = el('div', 'am-cl-ver', list);
        const top = el('div', 'am-cl-top', box);
        el('span', 'am-cl-v', top).textContent = e.v;
        const next = cmpV(e.v, VERSION) > 0;
        if (next || e.date) el('span', 'am-cl-date', top).textContent = next ? 'Next update' : e.date;
        if (e.title) el('div', 'am-cl-title', box).textContent = e.title;
        const ul = el('ul', 'am-cl-items', box);
        for (const t of e.items) el('li', null, ul).textContent = t;
      }
    };
    const shown = all ? CHANGELOG : which;
    render(shown);
    if (!all && shown.length < CHANGELOG.length) {
      const more = ui.button(el('div', 'am-cl-more', p), 'Earlier versions', () => { render(CHANGELOG); more.parentNode.remove(); });
    }

    const opt = el('div', 'am-set-card am-cl-opt', p);
    ui.toggle(opt, "Show what's new after an update", () => settings.whatsNew,
      v => { settings.whatsNew = v; saveSettings(); });
    const foot = el('div', 'am-set-foot', p);
    const done = el('button', 'am-set-btn am-set-primary', foot);
    done.textContent = 'Done';
    done.addEventListener('click', closeChangelog);
    done.style.marginLeft = 'auto';

    back.addEventListener('click', e => { if (e.target === back) closeChangelog(); });
    back.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') closeChangelog();
    });
    clEl = back;
    done.focus({ preventScroll: true });
  };
  window.amWhatsNew = () => openChangelog('all');

  const clStyle = el('style', null, document.head);
  clStyle.textContent = `
    .am-cl-back { z-index: 100004; }
    .am-set.am-cl { width: min(460px, 100%); display: flex; flex-direction: column; }
    .am-cl-list { overflow-y: auto; min-height: 0; margin: 0 -4px; padding: 0 4px; scrollbar-width: thin; }
    .am-cl-ver { padding: 12px 14px; border-radius: 14px; background: rgb(255 255 255 / .06); }
    .am-cl-ver + .am-cl-ver { margin-top: 8px; }
    .am-cl-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    .am-cl-v { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .am-cl-date { font-size: 12px; color: rgb(255 255 255 / .45); font-variant-numeric: tabular-nums; }
    .am-cl-title { font-size: 13.5px; font-weight: 600; margin-top: 4px; color: rgb(255 255 255 / .85); }
    .am-cl-items { margin: 8px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.45; color: rgb(255 255 255 / .75); }
    .am-cl-items li + li { margin-top: 4px; }
    .am-cl-items li::marker { color: rgb(255 255 255 / .35); }
    .am-cl-more { display: flex; justify-content: center; margin-top: 10px; }
    .am-cl-opt { margin-top: 12px; }
  `;

  // after an update: the versions since the one last seen. Not on a new install, not over zen or the settings panel.
  // A new install is told apart from an update by any r1ytm settings saved before (a user who never changed a setting
  // looks like a new install, and sees the next update's list instead of this one).
  const whatsNewCheck = () => {
    const seen = store.get(SEEN_KEY, '');
    if (seen && cmpV(seen, VERSION) >= 0) { if (seen !== VERSION) store.set(SEEN_KEY, VERSION); return; }
    const before = store.get('am-settings', null) !== null || store.get('am-look', null) !== null;
    const entries = !settings.whatsNew || (!seen && !before) ? [] : CHANGELOG.filter(e =>
      cmpV(e.v, VERSION) <= 0 && (seen ? cmpV(e.v, seen) > 0 : e.v === VERSION));
    if (!entries.length) { store.set(SEEN_KEY, VERSION); return; }
    let tries = 0;
    const show = () => {
      // wait while something else covers the page or the tab is in the background (up to about 10 minutes)
      if (zenEl || setEl || clEl || gmEl || document.hidden) { if (++tries < 300) setTimeout(show, 2000); return; }
      store.set(SEEN_KEY, VERSION);
      openChangelog(entries);
    };
    setTimeout(show, 1500);
  };
  whatsNewCheck();

  const changelogOff = () => {
    if (clEl) clEl.remove();
    clEl = null;
    clStyle.remove();
  };
