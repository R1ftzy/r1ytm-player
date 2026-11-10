  /* ---------- bar position: bottom / top ---------- */
  // settings.barPos: 0 bottom (as always), 1 top. (2 left / 3 right come later.) A phone always gets the bottom bar.
  // Top has two forms, picked again on every tick:
  //  - in the header: Compact bar and enough room. The bar sits in YTM's header, centered on it, between the search
  //    pill (made shorter) and the buttons on the right. Pages keep their full height. While the search has focus,
  //    the pill grows back toward its own width and the bar gets narrower to make room (never below TOP_MIN_W).
  //  - above the header: Full bar, or not enough room in the header. The full bar is at the very top of the window,
  //    and YTM's header (search, account), its sidebar, the pages and the player page move down to make room.
  // The bar stays our own fixed element in both forms. YTM rebuilds its header, so we only measure it.
  // All CSS hangs off html.am-pos-bottom / am-pos-top (+ am-in-header / am-top-float), so other code needs no ifs.
  const TOP_SEARCH_W = 260;      // the search pill's width while the bar is in the header (and the search is not in use)
  const TOP_MIN_W = 520;         // the narrowest compact bar that still has room for its buttons and a title
  const TOP_MAX_W = 760;         // wider than this looks lost in the header
  const TOP_GAP = 16;            // space on each side of the bar in the header
  const TOP_SLACK = 24;          // a little more room is needed to go into the header than to stay (no flapping)
  const HDR_S = 0.86;            // the bar's scale in the header: 56px compact bar -> 48px, in a 64px header
  const FLOAT_GAP = 8;           // the gap above the full top bar, and between it and YTM's header

  const posBase = el('style', null, document.head);
  posBase.textContent = `
    html.am-pos-top .am-bar { bottom: auto; top: var(--am-top, 72px); }
    /* floating off: the bar fills the width and sits on the edge of the window, like YTM's own */
    html.am-dock:not(.am-in-header) .am-bar { left: 0; right: 0; bottom: 0; border-radius: 0; border-width: 1px 0 0; box-shadow: none; }
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
    return posNow === 'bottom' ? { side: 'bottom', at: r.top } : { side: 'top', at: r.bottom };
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

  // where the bar goes now. Cheap (it measures only the header), so it runs on every tick, also while the settings
  // panel is open: the position is changed live there.
  const placeBar = () => {
    syncLayoutDom();                                       // classic's order, but not on a phone
    const pos = !isMobile() && settings.barPos === 1 ? 'top' : 'bottom';
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
    if (posStyle.textContent !== css) posStyle.textContent = css;
  };
  addEventListener('resize', placeBar);
  placeBar();                    // a saved Top position applies at once, not on the first tick

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
      guide: ['tp-yt-app-drawer#guide', '#mini-guide', 'ytmusic-guide-renderer'].map(q => {
        const g = document.querySelector(q); if (!g) return q + ' none'; const cs = getComputedStyle(g);
        return `${q} ${cs.position} top ${cs.top} bottom ${cs.bottom} ${rect(g)}`; }),
      playerPage: (() => { const pp = playerPage(); if (!pp) return null; const cs = getComputedStyle(pp);
        return `pad-top ${cs.paddingTop} border-top ${cs.borderTopWidth} box ${cs.boxSizing} ${rect(pp)}`; })(),
    };
    console.log('[am-bar] top probe', out);
    return out;
  };
