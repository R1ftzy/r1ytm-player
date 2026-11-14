  /* ---------- bar position: bottom / top / left / right ---------- */
  // settings.barPos: 0 bottom (as always), 1 top, 2 left, 3 right. A phone always gets the bottom bar.
  // Top has two forms, picked again on every tick:
  //  - in the header: Compact bar and enough room. The bar sits in YTM's header, centered on it, between the search
  //    pill (made shorter) and the buttons on the right. Pages keep their full height. While the search has focus,
  //    the pill grows back toward its own width and the bar gets narrower to make room (never below TOP_MIN_W).
  //  - above the header: Full bar, or not enough room in the header. The full bar is at the very top of the window,
  //    and YTM's header (search, account), its sidebar, the pages and the player page move down to make room.
  // Left and right use the upright forms of the bar (title-links.js: 'rail', 'card'). Only Compact and Full exist
  // there (Classic counts as Full):
  //  - Full: the rail runs the whole height of the window at that edge, and YTM's header, sidebar, pages and player
  //    page move away from it (like Top + Full). On the right, YTM's account picture moves into the rail.
  //  - Compact, left, in YTM's sidebar (the sidebar stays): YTM's Home / Explore / Library at the top, the bar under
  //    them, our Zen and r1ytm entries at the bottom of the column. A collapsed sidebar gets the rail (as wide as the
  //    column), an expanded one gets the card at the bottom, above Zen / r1ytm. The page doesn't move.
  //  - Compact, right, or left with no sidebar on screen (narrow window, drawer closed): a rail at that edge, under
  //    the header (the account picture stays above it); pages and the player page get space on that side.
  // The bar stays our own fixed element in every form. YTM rebuilds its header and sidebar, so we only measure them.
  // All CSS hangs off html.am-pos-* (+ am-in-header / am-top-float / am-side / am-side-in / am-side-float).
  const TOP_SEARCH_W = 260;      // the search pill's width while the bar is in the header (and the search is not in use)
  const TOP_MIN_W = 520;         // the narrowest compact bar that still has room for its buttons and a title
  const TOP_MAX_W = 760;         // wider than this looks lost in the header
  const TOP_GAP = 16;            // space on each side of the bar in the header
  const TOP_SLACK = 24;          // a little more room is needed to go into the header than to stay (no flapping)
  const HDR_S = 0.86;            // the bar's scale in the header: 56px compact bar -> 48px, in a 64px header
  const FLOAT_GAP = 8;           // the gap above the full top bar, and between it and YTM's header
  const RAIL_W = 64;             // the rail's width (less in a narrower sidebar column)
  const SIDE_GAP = 8;            // the rail's / card's distance from the edges around it
  const RAIL_SHORT = 470, RAIL_SHORTER = 380;   // a rail shorter than this drops shuffle / repeat, then lyrics / queue

  const posBase = el('style', null, document.head);
  posBase.textContent = `
    html.am-pos-top .am-bar { bottom: auto; top: var(--am-top, 72px); }
    /* floating off: the bar fills the width and sits on the edge of the window, like YTM's own */
    html.am-dock:not(.am-in-header):not(.am-side) .am-bar { left: 0; right: 0; bottom: 0; border-radius: 0; border-width: 1px 0 0; box-shadow: none; }
    html.am-dock.am-pos-top:not(.am-in-header) .am-bar { top: 0; bottom: auto; border-width: 0 0 1px; }
    html.am-pos-top .am-bar.am-hidden { transform: translateY(-24px); }
    /* in the header: placed by placeBar(), a little smaller, a lighter shadow */
    html.am-in-header .am-bar { --am-s: min(calc(var(--am-size, 1) * ${HDR_S}), 1);
      left: var(--am-hx); right: auto; width: var(--am-hw); top: var(--am-hy);
      box-shadow: 0 4px 16px rgb(0 0 0 / .22), inset 0 1px 0 rgb(255 255 255 / .08);
      transition: left .25s cubic-bezier(.2, .8, .2, 1), width .25s cubic-bezier(.2, .8, .2, 1), height .35s cubic-bezier(.2, .8, .2, 1),
                  border-radius .35s, padding .35s, opacity .25s ease, transform .25s ease; }
    /* the pill's width comes from placeBar() (posStyle); this makes it move together with the bar */
    html.am-in-header ytmusic-nav-bar ytmusic-search-box { transition: max-width .25s cubic-bezier(.2, .8, .2, 1);
      /* keep the short pill at the left of its column: YTM centers it there on some pages (search results) */
      margin-left: 0 !important; margin-right: auto !important; }
    /* no space at the end of pages: nothing is at the bottom */
    html.am-pos-top ytmusic-section-list-renderer::after,
    html.am-pos-top ytmusic-search-page::after { display: none; }
    /* left / right: placed by placeBar() */
    html.am-side .am-bar { left: var(--am-vx); right: auto; width: var(--am-vw); top: var(--am-vy); bottom: var(--am-vb);
      height: auto; }
    html.am-pos-left .am-bar.am-hidden { transform: translateX(-24px); }
    html.am-pos-right .am-bar.am-hidden { transform: translateX(24px); }
    html.am-dock.am-side-float .am-bar { border-radius: 0; box-shadow: none; border-width: 0 1px 0 0; }
    html.am-dock.am-side-float.am-pos-right .am-bar { border-width: 0 0 0 1px; }
    html.am-dock.am-side-in .am-bar { border-radius: 0; box-shadow: none; border-width: 1px 0; }
    /* left in the sidebar: our entries move from YTM's list to the bottom of the column (.am-gfoot) */
    html.am-side-in ytmusic-guide-section-renderer .am-guide,
    html.am-side-in ytmusic-guide-entry-renderer.am-lib-out { display: none !important; }
    .am-gfoot { position: fixed; z-index: 99998; display: none; flex-direction: column; box-sizing: border-box; }
    .am-gfoot .am-guide.am-active .am-guide-item { background: rgb(255 255 255 / .1); }
    html.am-side-in .am-gfoot { display: flex; }

    /* the rail: one upright column */
    .am-bar.am-rail { display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: var(--am-rpad, 10px) 0 10px;                 /* the art as far from the top as from the sides (placeSide) */
      /* corners around the art's: its radius plus the gap around it, so the two curves run side by side (the same
         radius would look sharper, being further out) */
      border-radius: calc(var(--am-art-r, 8px) + var(--am-rpad, 10px)); }
    .am-rtop { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .am-rail .am-btn.am-lcd-btn { margin: 0; }
    /* the heart: its button starts the art's side / top distance (--am-rpad) below the art's outline (4px outside
       the art), plus the column's own 6px gap */
    .am-rail > .am-btn.am-like { margin-top: calc(var(--am-rpad, 10px) + 4px); }
    .am-rail > .am-left, .am-rail > .am-right { flex-direction: column; gap: 2px; }
    /* lyrics / queue / volume drop to the bottom, just above the menu (the free room is above them, where the
       volume slider opens); the menu stays last, away from the heart */
    .am-rail > .am-right { margin-top: auto; }
    .am-rail .am-mode { display: none; }
    /* the volume slider stands upright above its button, and opens while the pointer is on the button (or the slider) */
    .am-rail .am-vol { flex-direction: column; gap: 0; }
    .am-bar.am-rail .am-vol input { writing-mode: vertical-lr; direction: rtl; width: 18px; height: 0; margin: 0;
      opacity: 0; transition: height .22s cubic-bezier(.2, .8, .2, 1), opacity .18s ease, margin .22s ease; }
    .am-bar.am-rail .am-vol:is(:hover, :focus-within, .am-vol-on) input { height: 96px; opacity: 1; margin-bottom: 6px; }
    /* the % under the upright slider, above the button */
    .am-bar.am-rail .am-vol .am-vol-pct { width: auto; height: 0; text-align: center; font-size: 10.5px; line-height: 14px;
      transition: height .22s cubic-bezier(.2, .8, .2, 1), opacity .18s ease; }
    .am-bar.am-rail .am-vol:is(:hover, :focus-within, .am-vol-on) .am-vol-pct { width: auto; height: 14px; opacity: 1; }
    .am-rail.am-rshort > .am-left > .am-dim, .am-rail.am-rshorter > .am-right > :not(.am-vol) { display: none; }
    /* right + Full: the account picture at the top of the rail */
    .am-avatar { display: none; }
    html.am-side-full.am-pos-right .am-rail .am-avatar.am-has { display: grid; }
    .am-rtop > .am-avatar { margin-bottom: 8px; }          /* clear of the art's outline (4px outside the art) */
    .am-avatar img { width: calc(28px * var(--am-s)); height: calc(28px * var(--am-s)); border-radius: 50%; object-fit: cover; }
    /* the progress outline around the art */
    .am-artbox { position: relative; display: grid; }
    .am-ring { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); overflow: visible;
      pointer-events: none; transition: scale .35s cubic-bezier(.2, .8, .2, 1); }
    /* paused: the outline shrinks in, close around the art */
    .am-bar.am-paused .am-ring { scale: .9; }
    .am-ring path, .am-rope path { fill: none; stroke-width: var(--am-rope-w, 2.5px); }
    .am-ring-bg { stroke: rgb(255 255 255 / .16); }
    .am-ring-fg { stroke: rgb(255 255 255 / .85); stroke-dasharray: 0 100; }   /* square ends: no white dots */
    /* the rope while it unwinds (title-links.js flyDraw): in window pixels, above the bar */
    .am-rope { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; z-index: 100000; display: none;
      pointer-events: none; overflow: visible; }
    .am-rope.am-fly-on { display: block; }
    .am-idle .am-ring { display: none; }
    /* the tape (title-links.js flyShow): one shape for the rail and the strip together, with the bar's own glass,
       outline and shadow. The rail's own glass is off while it shows (.am-skinned), so there is no join */
    .am-fly { position: fixed; z-index: 99998; display: none; pointer-events: none; color: #fff; cursor: default;
      font-family: var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif);
      background: rgb(40 40 40 / var(--am-bar-a, .28));
      backdrop-filter: blur(var(--am-bar-blur, 28px)) saturate(200%); -webkit-backdrop-filter: blur(var(--am-bar-blur, 28px)) saturate(200%); }
    .am-fly-edge, .am-fly-shade { position: fixed; display: none; pointer-events: none; overflow: visible; }
    .am-fly-edge { z-index: 99998; }
    .am-shade-b { position: absolute; inset: 0; filter: blur(16px); }       /* box-shadow blur 32px = a 16px blur */
    .am-shade-s { position: absolute; inset: 0; translate: 0 8px; background: rgb(0 0 0 / .3); }
    .am-fly-edge > path { fill: none; stroke: rgb(255 255 255 / .12); stroke-width: 1; }   /* drawn .5px inside the shape */
    .am-fly-shade { z-index: 99997; }
    .am-fly.am-fly-on, .am-fly-edge.am-fly-on, .am-fly-shade.am-fly-on { display: block; }
    .am-bar.am-skinned { background: transparent !important; border-color: transparent !important; box-shadow: none !important;
      backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .am-fly-in { position: absolute; box-sizing: border-box; padding: 8px 16px 9px; pointer-events: auto; }
    .am-fly .am-info { padding: 0; }
    .am-fly .am-track { position: relative; left: auto; right: auto; bottom: auto; margin: 0 0 8px; }
    .am-fly .am-time { display: block; margin: 0; }
    /* Full: the rail touches the window's edges when Floating is off */
    html.am-dock.am-side-full .am-bar { border-radius: 0; box-shadow: none; border-width: 0 1px 0 0; }
    html.am-dock.am-side-full.am-pos-right .am-bar { border-width: 0 0 0 1px; }

    /* the card: the expanded sidebar's bottom */
    .am-bar.am-card { display: flex; flex-direction: column; align-items: stretch; gap: 4px; padding: 10px;
      border-radius: calc(var(--am-art-r, 8px) + 10px); --am-s: min(var(--am-size, 1), 1.1); }   /* around the art's corners (its padding) */
    .am-ctop { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .am-ctop .am-info { padding-bottom: 0; min-width: 0; flex: 1; }
    .am-card .am-btn.am-lcd-btn { margin: 0; }
    .am-card > .am-track { position: relative; left: auto; right: auto; bottom: auto; margin: 2px 0; }
    .am-card > .am-left { justify-content: space-between; }
    .am-cbot { display: flex; align-items: center; justify-content: space-between; }
    .am-cbot > .am-right { gap: 2px; }
    .am-card .am-mode, .am-card .am-vol input, .am-card .am-vol-pct { display: none; }
    .am-card .am-btn { width: calc(30px * var(--am-s)); height: calc(30px * var(--am-s)); }

    /* "R1ytm logo" (syncBrand): YTM's picture cropped to its mark, at its own size; "R1ytm" after it in the page font */
    html.am-brand-on img.am-brand-crop { width: var(--am-brand-h) !important; height: var(--am-brand-h) !important;
      max-width: none !important; object-fit: cover !important; object-position: 0 50% !important; }
    .am-brand { display: none; align-items: center; height: var(--am-brand-h); margin-left: calc(var(--am-brand-h) * .2);
      color: #fff; white-space: nowrap; vertical-align: middle; font-weight: 700; font-size: calc(var(--am-brand-h) * .82);
      line-height: 1; letter-spacing: -.03em; }
    html.am-brand-on .am-brand { display: inline-flex; }

    /* the bar's 3-dot menu opens downward: it comes in from above */
    .am-menu.am-menu-down { animation-name: am-menu-in-down; }
    @keyframes am-menu-in-down { from { opacity: 0; scale: .92; translate: 0 -6px; } to { opacity: 1; scale: 1; translate: 0 0; } }
  `;
  // the space for the bar under the header, rewritten only when it changes
  const posStyle = el('style', null, document.head);

  let posNow = 'bottom', inHeader = false, searchOpen = false, floatSpace = 0;
  let searchNat = 480;           // the pill's own width, measured while we don't change it (YTM's is about 480px)
  html.classList.add('am-pos-bottom');

  // the bar's inner edge, for things placed next to it: { side, at }. side is the screen edge the bar is on, at is
  // the bar's edge toward the page (its top for a bottom bar, its bottom for a top bar). null while it is hidden.
  const barEdge = () => {
    if (!bar.isConnected || bar.classList.contains('am-hidden')) return null;
    const r = bar.getBoundingClientRect();
    return posNow === 'bottom' ? { side: 'bottom', at: r.top } : posNow === 'top' ? { side: 'top', at: r.bottom }
      : posNow === 'left' ? { side: 'left', at: r.right } : { side: 'right', at: r.left };
  };

  const navBar = () => document.querySelector('ytmusic-nav-bar');
  const searchBox = nav => nav && nav.querySelector('ytmusic-search-box');
  // the header's free row: where the search pill starts, and the left edge of the first button on the right
  const headerRoom = nav => {
    const s = searchBox(nav) && searchBox(nav).getBoundingClientRect();
    if (!s || s.width < 120) return null;                 // small header: the search is only an icon
    if (!inHeader) searchNat = s.width;                   // our max-width is not on it now: this is its own width
    let right = nav.getBoundingClientRect().right;
    const rc = nav.querySelector('#right-content, .right-content');
    if (rc) {
      for (const c of rc.children) {
        const r = c.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.width < 400) right = Math.min(right, r.left);   // < 400: not a spacer
      }
    }
    return { search: s.left, right: right - TOP_GAP };
  };
  // the bar's height in the header (the same sum as --am-s in the CSS above, on the 56px compact bar)
  const headerBarH = () => 56 * Math.min(settings.barSize / 100 * HDR_S, 1);

  const setVar = (n, k, v) => { if (n.style.getPropertyValue(k) !== v) n.style.setProperty(k, v); };
  const setClass = (k, on) => { if (html.classList.contains(k) !== on) html.classList.toggle(k, on); };

  // the search pill has focus or its suggestions are open: it grows and the bar gets narrower (placeBar)
  const syncSearch = () => {
    const sb = searchBox(navBar());
    const open = inHeader && !!sb && (sb.hasAttribute('opened') || sb.matches(':focus-within'));
    if (open === searchOpen) return;
    searchOpen = open;
    setClass('am-search-open', open);
    placeBar();
  };
  addEventListener('focusin', syncSearch, true);
  addEventListener('focusout', () => setTimeout(syncSearch, 0), true);    // focus has moved on only after the event

  // YTM's sidebar column on screen now: the guide whose primary section (Home / Explore / Library) is visible at the
  // left edge. YTM keeps two (expanded and mini) and can leave one "visible" off-screen, so it is checked by place.
  const activeGuide = () => {
    for (const items of document.querySelectorAll('ytmusic-guide-section-renderer[is-primary] #items')) {
      if (!shown(items)) continue;
      const g = items.closest('ytmusic-guide-renderer') || items;
      const r = g.getBoundingClientRect();
      if (r.width < 40 || r.width > 420 || r.left < -10 || r.left > 40) continue;
      const own = [...items.children].filter(n => !n.classList.contains('am-guide') && shown(n));
      const last = own[own.length - 1];
      if (!last) continue;
      // the entries' column: #items' content box (the guide around it can be wider, e.g. a scrollbar's room)
      const ir = items.getBoundingClientRect(), ics = getComputedStyle(items);
      const pl = parseFloat(ics.paddingLeft) || 0, pr = parseFloat(ics.paddingRight) || 0;
      const entries = [...items.querySelectorAll('ytmusic-guide-entry-renderer')];
      const ref = entries.find(n => !n.hasAttribute('active') && shown(n)) || entries.find(shown);
      const rr = ref && ref.getBoundingClientRect();
      return { items, r, collapsed: r.width < 140, below: last.getBoundingClientRect().bottom, ref,
        col: { left: ir.left + pl, width: ir.width - pl - pr },
        mid: rr && rr.width ? rr.left + rr.width / 2 : ir.left + ir.width / 2 };        // the entries' center line
    }
    return null;
  };
  /* the bottom of the sidebar column (left position): YTM's Library entry, then our Zen / r1ytm entries. All of them
     are our own copies (styled after YTM's entries, like the ones in the list) in a fixed box of our own; YTM's own
     Library entry is hidden in its list (YTM rebuilds the list, so its element is never moved), and our copy clicks it. */
  const gFoot = el('div', 'am-gfoot', document.body);
  let footList = [], footKey = '', footLib = null, libReal = null;
  const P_LIBRARY = 'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z';
  // YTM's Library entry: by where it goes (its endpoint), else by its name
  const libraryEntry = items => {
    const all = [...items.querySelectorAll('ytmusic-guide-entry-renderer')];
    const dest = n => {
      let id = '';
      try { const d = n.data || (n.__data && n.__data.data); id = d.navigationEndpoint.browseEndpoint.browseId; } catch {}
      const a = n.querySelector('a[href]');
      return id + ' ' + (a ? a.getAttribute('href') : '');
    };
    return all.find(n => /library/i.test(dest(n))) ||
      all.find(n => /^library$/i.test((n.querySelector('.title') || n).textContent.trim()));
  };
  const clickEntry = n => { if (n && n.isConnected) (n.querySelector('a[href], tp-yt-paper-item') || n).click(); };
  const syncFoot = gd => {
    const lib = libraryEntry(gd.items);
    if (lib) { lib.classList.add('am-lib-out'); libReal = lib; }
    const libLabel = lib ? (lib.querySelector('.title') || lib).textContent.trim() || 'Library' : '';
    if (footList.length !== GUIDE.length + (lib ? 1 : 0) || (footLib && footLib.ttl.textContent !== libLabel)) {
      footLib = lib ? makeGuideEntry({ label: libLabel, tip: libLabel, icon: P_LIBRARY, open: () => clickEntry(libReal) }) : null;
      if (footLib) {                                         // YTM's own icon, when it has a plain SVG one
        const ic = [...lib.querySelectorAll('yt-icon svg, svg')].find(n => n.closest('ytmusic-guide-entry-renderer') === lib);
        if (ic) footLib.icon.replaceChildren(ic.cloneNode(true));
      }
      footList = [...(footLib ? [footLib] : []), ...GUIDE.map(makeGuideEntry)];
      gFoot.replaceChildren(...footList.map(e => e.g));
      footKey = '';
    }
    if (footLib) footLib.g.classList.toggle('am-active', lib.hasAttribute('active'));
    const key = Math.round(gd.col.left) + ' ' + Math.round(gd.col.width) + ' ' + gd.collapsed;
    if (key !== footKey && gd.ref && shown(gd.ref)) {
      footKey = key;
      for (const e of footList) styleGuideEntry(e, gd.ref, gd.items);
    }
    // the same column as YTM's own entries, so ours line up with (and center under) theirs
    setVar(gFoot, 'left', gd.col.left.toFixed(1) + 'px');
    setVar(gFoot, 'width', gd.col.width.toFixed(1) + 'px');
    setVar(gFoot, 'bottom', SIDE_GAP + 'px');
  };

  // Left / right + Full: how far the search must move right to start clear of the logo (0 if it already is). Measured
  // without the move on it now (taken back out of its rect), so the value doesn't feed on itself.
  let searchShift = 0;
  const searchClear = nav => {
    const sb = searchBox(nav), lc = nav && nav.querySelector('#left-content, .left-content');
    if (!sb || !lc) return searchShift = 0;
    let end = 0;
    for (const c of lc.children) { const r = c.getBoundingClientRect(); if (r.width && r.height) end = Math.max(end, r.right); }
    const s = sb.getBoundingClientRect();
    if (!end || !s.width) return searchShift;
    const natural = s.left - (parseFloat(getComputedStyle(sb).translate) || 0);    // the move on it now, whatever it is
    searchShift = Math.max(0, Math.ceil(end + 16 - natural));
    return searchShift;
  };
  // left / right: the rail or the card, and the CSS for the space it needs. Returns that CSS.
  const placeSide = pos => {
    const dock = !settings.barFloat, gap = dock ? 0 : SIDE_GAP;
    const nav = navBar(), nr = nav && nav.getBoundingClientRect();
    const headBottom = nr && nr.height ? Math.round(nr.bottom) : 64;
    const full = layoutNow !== 'compact';                  // Classic counts as Full on the sides
    const gd = pos === 'left' && !full ? activeGuide() : null;
    setClass('am-side-full', full);
    setClass('am-side-in', !!gd);
    setClass('am-side-float', !gd && !full);
    let x, w, top, bottom, css = '', railH = 0;
    if (full) {
      // the whole height at the edge; YTM's header, sidebar, pages and player page move away from it
      vertForm = 'rail';
      w = RAIL_W;
      x = pos === 'left' ? gap : innerWidth - w - gap;
      top = gap;
      bottom = gap;
      railH = innerHeight - 2 * gap;
      const space = w + 2 * gap, on = 'html.am-side-full:not(.am-fs)';
      const side = pos === 'left' ? 'left' : 'right';
      // the narrower header: its left part (menu button + logo) keeps its size, and the search is moved right as far
      // as it needs to start clear of the logo (YTM places it for the full width; searchClear below measures it)
      css = `${on} :is(ytmusic-nav-bar, #nav-bar-background) { width: calc(100% - ${space}px) !important;
          ${pos === 'left' ? `translate: ${space}px 0 !important;` : ''} }
        ${on} ytmusic-nav-bar > :is(.left-content, #left-content) { flex-shrink: 0 !important; }`;
      const shift = searchClear(nav);
      if (shift) css += `\n${on} ytmusic-nav-bar ytmusic-search-box { translate: ${shift}px 0 !important; }`;
      css += `
        ${on} ytmusic-app-layout > :is([slot="content"], #content) { border-${side}: ${space}px solid transparent !important; }
        ${on} ytmusic-player-page { border-${side}: ${space}px solid transparent !important; box-sizing: border-box !important; }`;
      if (pos === 'left') css += `\n${on} :is(tp-yt-app-drawer#guide, #mini-guide) { translate: ${space}px 0 !important; }`;
      // right: YTM's account picture (signed in) goes into the rail; the original in the header is hidden
      const acct = pos === 'right' && document.querySelector('ytmusic-nav-bar ytmusic-settings-button');
      const pic = acct && [...acct.querySelectorAll('img')].find(i => /^https?:/.test(i.src));
      avatarBtn.classList.toggle('am-has', !!pic);
      if (pic) {
        if (avatarImg.src !== pic.src) avatarImg.src = pic.src;
        avatarBtn.onclick = e => { e.stopPropagation(); (acct.querySelector('button, tp-yt-paper-icon-button, yt-icon-button') || acct).click(); };
        css += `\n${on} ytmusic-nav-bar ytmusic-settings-button { visibility: hidden !important; }`;
      }
    } else if (gd) {
      syncFoot(gd);
      const footTop = gFoot.getBoundingClientRect().top || innerHeight - SIDE_GAP;
      bottom = Math.round(innerHeight - footTop + (dock ? 0 : SIDE_GAP));
      if (gd.collapsed) {
        vertForm = 'rail';
        // centered on YTM's entries above it (not on the guide, which can be wider than its column)
        w = dock ? gd.r.width : Math.min(RAIL_W, gd.r.width - 2 * SIDE_GAP);
        x = dock ? gd.r.left : gd.mid - w / 2;
        top = Math.round(gd.below + 12);
        railH = innerHeight - bottom - top;
      } else {
        // expanded: the card at the bottom; the list above it scrolls clear of the card and our entries
        vertForm = 'card';
        w = dock ? gd.r.width : gd.col.width - 2 * SIDE_GAP;
        x = dock ? gd.r.left : gd.col.left + SIDE_GAP;
        top = 'auto';
        const room = (bar.offsetHeight || 170) + (innerHeight - footTop) + 24;
        css = `html.am-side-in ytmusic-guide-renderer::after { content: ""; display: block; height: ${Math.round(room)}px; }`;
      }
    } else {
      // a floating rail at the edge, under the header; the page and the player page keep clear of it
      vertForm = 'rail';
      w = RAIL_W;
      x = pos === 'left' ? gap : innerWidth - w - gap;
      top = headBottom + gap;
      bottom = gap;
      railH = innerHeight - bottom - top;
      const space = w + 2 * gap, side = pos === 'left' ? 'left' : 'right';
      const on = 'html.am-side-float:not(.am-fs)';
      css = `${on} ytmusic-app-layout > :is([slot="content"], #content) { border-${side}: ${space}px solid transparent !important; }
        ${on} ytmusic-player-page { border-${side}: ${space}px solid transparent !important; box-sizing: border-box !important; }`;
    }
    syncLayoutDom();
    bar.classList.toggle('am-rshort', !!railH && railH < RAIL_SHORT);
    bar.classList.toggle('am-rshorter', !!railH && railH < RAIL_SHORTER);
    setVar(bar, '--am-vx', Math.round(x) + 'px');
    setVar(bar, '--am-vw', Math.round(w) + 'px');
    setVar(bar, '--am-vy', top === 'auto' ? 'auto' : top + 'px');
    setVar(bar, '--am-vb', bottom + 'px');
    // the rail's top padding: the art's distance to the rail's sides, so it is the same on three sides. Measured
    // (the art follows the bar size, the rail's width doesn't); kept as it is while the art is hidden (nothing playing)
    const aw = art.offsetWidth;
    if (vertForm === 'rail' && aw && bar.clientWidth > aw) setVar(bar, '--am-rpad', ((bar.clientWidth - aw) / 2).toFixed(1) + 'px');
    return css;
  };

  // where the bar goes now. Cheap (it measures only the header), so it runs on every tick, also while the settings
  // panel is open: the position is changed live there.
  const placeBar = () => {
    const pos = isMobile() ? 'bottom' : ['bottom', 'top', 'left', 'right'][settings.barPos] || 'bottom';
    const side = pos === 'left' || pos === 'right';
    if (!side) vertForm = '';
    syncLayoutDom();                                       // classic's / the rail's order, but not on a phone
    if (pos !== posNow) {
      html.classList.replace('am-pos-' + posNow, 'am-pos-' + pos);
      posNow = pos;
    }
    let header = false, pill = 0;
    const nav = pos === 'top' ? navBar() : null;
    const nr = nav && nav.getBoundingClientRect();
    if (nr && nr.height) {
      const room = bar.classList.contains('am-compact') && headerRoom(nav);
      if (room) {
        // in the header only if the bar fits beside the short pill. The widths come from our own numbers, not the
        // pill's measured width, so the bar and the pill move at the same time (the pill is mid-transition otherwise)
        const short = Math.min(searchNat, TOP_SEARCH_W);
        const end = room.right, startShort = room.search + short + TOP_GAP;
        header = end - startShort >= TOP_MIN_W + (inHeader ? 0 : TOP_SLACK);
        if (header) {
          // search in use: the pill grows toward its own width, as far as leaves TOP_MIN_W for the bar
          pill = searchOpen ? Math.max(short, Math.min(searchNat, end - TOP_MIN_W - TOP_GAP - room.search)) : short;
          const start = room.search + pill + TOP_GAP;
          // centered on the header if the room allows it, else centered in the room
          const mid = nr.left + nr.width / 2, half = Math.min(mid - start, end - mid);
          let w, x;
          if (2 * half >= TOP_MIN_W) { w = Math.min(TOP_MAX_W, 2 * half); x = mid - w / 2; }
          else { w = Math.min(TOP_MAX_W, end - start); x = start + (end - start - w) / 2; }
          setVar(bar, '--am-hx', Math.round(x) + 'px');
          setVar(bar, '--am-hw', Math.round(w) + 'px');
          // (nr.top - floatSpace: the header may still be moved down for the full bar, until the CSS below changes)
          setVar(bar, '--am-hy', Math.round(nr.top - floatSpace + (nr.height - headerBarH()) / 2) + 'px');
        }
      }
    }
    if (header !== inHeader) {
      inHeader = header;
      setClass('am-in-header', header);
      syncSearch();
    }
    const float = pos === 'top' && !header;
    setClass('am-top-float', float);

    // above the header: the bar at the top, and everything of YTM's that starts under the top moves down by the
    // bar's height plus its gaps.
    //  - the header: translate (it only moves it, YTM's layout doesn't see it). Its background stays at the top and
    //    gets taller instead, so one glass layer runs behind the bar and the header (no bare strip behind the bar)
    //  - the sidebar (full and mini): translate, and YTM's own bottom space for its player bar (which we otherwise
    //    set to 0) is the same amount, so its end stays on screen
    //  - pages and the player page: a top border, not padding: it adds to YTM's own padding instead of replacing it
    let css = header ? `html.am-in-header ytmusic-nav-bar ytmusic-search-box { max-width: ${Math.round(pill)}px !important; }` : '';
    floatSpace = 0;
    if (float) {
      const gap = settings.barFloat ? FLOAT_GAP : 0;         // a docked bar touches the top and the header
      const space = Math.round((bar.offsetHeight || 60) + 2 * gap);
      if (!isFullscreen()) floatSpace = space;
      const on = 'html.am-top-float:not(.am-fs)';
      css = `html.am-top-float .am-bar { --am-top: ${gap}px; }
        ${on} ytmusic-nav-bar { translate: 0 ${space}px !important; }
        ${on} #nav-bar-background { top: 0 !important; height: ${Math.round((nr && nr.height) || 64) + space}px !important; }
        ${on} :is(tp-yt-app-drawer#guide, #mini-guide) { translate: 0 ${space}px !important;
          --ytmusic-player-bar-height: ${space}px !important; }
        ${on} ytmusic-app-layout > :is([slot="content"], #content) {
          border-top: ${space}px solid transparent !important; }
        ${on} ytmusic-player-page {
          border-top: ${space}px solid transparent !important; box-sizing: border-box !important; }`;
    }
    setClass('am-side', side);
    if (side) css = placeSide(pos);
    else { setClass('am-side-in', false); setClass('am-side-float', false); bar.classList.remove('am-rshort', 'am-rshorter'); }
    if (posStyle.textContent !== css) posStyle.textContent = css;
    if (!railRaf) railSync();                              // left / right: the rail's shape follows it (title-links.js)
  };
  addEventListener('resize', placeBar);
  placeBar();                    // a saved Top position applies at once, not on the first tick

  /* the header's logo (setting "R1ytm logo"): YTM's logo is one picture, its red mark and then "Music". The picture
     stays, cropped to the mark (a square at its left, at its own size: nothing of it is redrawn or scaled), and our
     "R1ytm" follows it in the same link (a click still goes home), in the page's own font. */
  let brandEl = null, brandH = 24;
  const syncBrand = () => {
    const on = !!settings.brand;
    setClass('am-brand-on', on);
    if (!on) return;
    const img = document.querySelector('ytmusic-nav-bar img.logo') ||
      document.querySelector('ytmusic-nav-bar :is(.left-content, #left-content) a img');
    if (!img) return;
    const pic = img.closest('picture') || img;
    if (!img.classList.contains('am-brand-crop')) {        // measured before the crop: the mark is as tall as the picture
      const h = img.getBoundingClientRect().height;
      if (h) brandH = h;
      img.classList.add('am-brand-crop');
    }
    setVar(img, '--am-brand-h', brandH + 'px');
    if (!brandEl) {
      brandEl = el('span', 'am-brand');
      brandEl.textContent = 'R1ytm';
    }
    setVar(brandEl, '--am-brand-h', brandH + 'px');
    if (brandEl.previousElementSibling !== pic) pic.after(brandEl);
  };
  syncBrand();

  // amTopProbe(): what placeBar() sees in YTM's header, to paste back when the top bar sits wrong
  window.amTopProbe = () => {
    const nav = navBar();
    const rect = n => { if (!n) return null; const r = n.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(' '); };
    const out = {
      pos: posNow, inHeader, searchOpen, compact: bar.classList.contains('am-compact'), mobile: isMobile(),
      window: innerWidth + 'x' + innerHeight,
      nav: rect(nav),
      navChildren: nav ? [...nav.children].map(c => `${c.tagName.toLowerCase()}#${c.id}.${[...c.classList].join('.')} ${rect(c)}`) : null,
      search: rect(searchBox(nav)),
      searchAttrs: searchBox(nav) ? [...searchBox(nav).attributes].map(a => a.name).join(' ') : null,
      right: nav && nav.querySelector('#right-content, .right-content')
        ? [...nav.querySelector('#right-content, .right-content').children].map(c => `${c.tagName.toLowerCase()} ${rect(c)}`) : null,
      room: nav ? headerRoom(nav) : null,
      bar: rect(bar),
      content: (() => { const c = document.querySelector('ytmusic-app-layout > [slot="content"], ytmusic-app-layout > #content');
        if (!c) return null; const cs = getComputedStyle(c); return `${c.tagName.toLowerCase()}#${c.id} pad-top ${cs.paddingTop} border-top ${cs.borderTopWidth} ${rect(c)}`; })(),
      navBg: (() => { const b = document.querySelector('#nav-bar-background'); if (!b) return null; const cs = getComputedStyle(b);
        return `${cs.position} top ${cs.top} h ${cs.height} op ${cs.opacity} bg ${cs.backgroundColor} ${rect(b)}`; })(),
      side: (() => { const gd = activeGuide(); return gd ? { rect: rect(gd.items.closest('ytmusic-guide-renderer') || gd.items),
        collapsed: gd.collapsed, below: Math.round(gd.below), form: formNow,
        layoutAttrs: layout() ? [...layout().attributes].map(a => a.name).join(' ') : null } : 'no sidebar on screen'; })(),
      guide: ['tp-yt-app-drawer#guide', '#mini-guide', 'ytmusic-guide-renderer'].map(q => {
        const g = document.querySelector(q); if (!g) return q + ' none'; const cs = getComputedStyle(g);
        return `${q} ${cs.position} top ${cs.top} bottom ${cs.bottom} ${rect(g)}`; }),
      playerPage: (() => { const pp = playerPage(); if (!pp) return null; const cs = getComputedStyle(pp);
        return `pad-top ${cs.paddingTop} border-top ${cs.borderTopWidth} box ${cs.boxSizing} ${rect(pp)}`; })(),
    };
    console.log('[am-bar] top probe', out);
    return out;
  };
