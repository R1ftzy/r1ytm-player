  /* ---------- styles ---------- */
  const styleEl = el('style', null, document.head);
  styleEl.textContent = `
    /* fixed space at the end of every page so content can scroll above the bar */
    ytmusic-section-list-renderer::after,
    ytmusic-search-page::after {
      content: "";
      display: block;
      height: calc(40px + 60px * var(--am-size, 1));
    }
    /* ...but not inside the player page, which keeps its own bottom space, and not in fullscreen */
    ytmusic-player-page ytmusic-section-list-renderer::after,
    html.am-fs ytmusic-section-list-renderer::after,
    html.am-fs ytmusic-search-page::after { display: none; }

    /* the playing / paused song row: YTM's flat highlight is replaced by our own rounded overlay on top of the row,
       a little taller than the row */
    ytmusic-responsive-list-item-renderer[play-button-state]:not([play-button-state="default"]) {
      background: transparent !important; position: relative; }
    ytmusic-responsive-list-item-renderer[play-button-state]:not([play-button-state="default"])::after {
      content: ""; position: absolute; inset: -5px 0; z-index: 1; pointer-events: none;
      border-radius: 10px; background: rgb(255 255 255 / .08); }
    /* closing: page fades back in quickly */
    ytmusic-app-layout > [slot="content"],
    ytmusic-app-layout > #content {
      transition: opacity ${FADE_IN_MS}ms ease-out;
    }
    /* opening: page fades out on the slow soft curve */
    html.am-player-open ytmusic-app-layout > [slot="content"],
    html.am-player-open ytmusic-app-layout > #content {
      opacity: 0;
      transition: opacity ${ANIM_MS}ms ${ANIM_EASE};
    }

    @media (prefers-reduced-motion: reduce) {
      ytmusic-app-layout > [slot="content"], ytmusic-app-layout > #content,
      html.am-player-open ytmusic-app-layout > [slot="content"],
      html.am-player-open ytmusic-app-layout > #content { transition: none; }
    }

    .am-bar { --am-inset: 16px; --am-h: 60px; --am-s: var(--am-size, 1);
      /* idle logo colors (for the red brand logo: #ff0000, #fff, #fff) */
      --am-logo-bg: rgb(255 255 255 / .45);
      --am-logo-ring: rgb(20 20 20 / .85);
      --am-logo-tri: rgb(20 20 20 / .85);
      position: fixed; left: var(--am-inset); right: var(--am-inset); bottom: 14px; z-index: 99999;
      height: calc(var(--am-h) * var(--am-s)); cursor: pointer;
      display: grid; grid-template-columns: 1fr minmax(0, 540px) 1fr; align-items: center; gap: 16px;
      padding: 0 18px; border-radius: calc(22px * var(--am-s)); color: #fff;
      font-family: var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif);
      background: rgb(40 40 40 / var(--am-bar-a, .28));
      backdrop-filter: blur(var(--am-bar-blur, 28px)) saturate(200%); -webkit-backdrop-filter: blur(var(--am-bar-blur, 28px)) saturate(200%);
      border: 1px solid rgb(255 255 255 / .12);
      box-shadow: 0 8px 32px rgb(0 0 0 / .3), inset 0 1px 0 rgb(255 255 255 / .08);
      transition: left .35s cubic-bezier(.2,.8,.2,1), right .35s cubic-bezier(.2,.8,.2,1),
                  height .35s cubic-bezier(.2,.8,.2,1), border-radius .35s, padding .35s,
                  opacity .25s ease, transform .25s ease; }

    /* refraction: blur, saturation and displacement all come from the SVG filter */
    html.am-refract .am-bar { backdrop-filter: url(#am-refract); -webkit-backdrop-filter: url(#am-refract); }

    /* hidden in fullscreen */
    .am-bar.am-hidden { opacity: 0; transform: translateY(24px); pointer-events: none; }

    /* compact: centered pill, max 860px wide */
    .am-bar.am-compact { --am-inset: max(16px, calc(50% - 430px)); --am-h: 56px;
      grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; padding: 0 12px; border-radius: calc(18px * var(--am-s)); }
    .am-bar.am-compact .am-btn { width: calc(30px * var(--am-s)); height: calc(30px * var(--am-s)); }
    .am-bar.am-compact .am-group { gap: 2px; }

    /* classic: YouTube Music's own order. The song on the left, the transport centered (its play button a circle),
       time / like / menu / the rest on the right, the progress bar along the top edge */
    .am-bar.am-classic { --am-h: 64px; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 16px; padding: 0 14px; }
    .am-classic .am-lcd { display: none; }
    .am-cl-left { grid-column: 1; min-width: 0; display: flex; align-items: center; gap: 12px; }
    .am-cl-left .am-info { padding-bottom: 0; }
    .am-classic > .am-left { grid-column: 2; gap: 8px; }
    .am-cl-right { grid-column: 3; justify-self: end; min-width: 0; display: flex; align-items: center; gap: 4px; }
    .am-classic .am-btn.am-big { width: calc(44px * var(--am-s)); height: calc(44px * var(--am-s)); border-radius: 50%;
      background: rgb(255 255 255 / .1); }
    .am-classic .am-btn.am-big:hover { background: rgb(255 255 255 / .18); }
    .am-classic > .am-track { left: calc(22px * var(--am-s)); right: calc(22px * var(--am-s)); top: -4px; bottom: auto; }
    html.am-dock .am-classic > .am-track { left: 0; right: 0; }
    .am-time { font-size: calc(12px * var(--am-s)); color: rgb(255 255 255 / .6); font-variant-numeric: tabular-nums;
      white-space: nowrap; margin-right: 8px; }
    .am-idle .am-time { display: none; }

    .am-group { display: flex; align-items: center; gap: 4px; }
    .am-left  { justify-self: start; }
    .am-right { justify-self: end; }

    .am-btn { all: unset; position: relative; cursor: pointer; width: calc(34px * var(--am-s, 1)); height: calc(34px * var(--am-s, 1));
      display: grid; place-items: center; border-radius: 9px; transition: background .15s; }
    .am-btn:hover { background: rgb(255 255 255 / .1); }
    .am-btn svg { width: calc(22px * var(--am-s, 1)); height: calc(22px * var(--am-s, 1)); fill: rgb(255 255 255 / .8); pointer-events: none; transition: fill .15s; }
    .am-btn.am-dim svg { width: calc(18px * var(--am-s, 1)); height: calc(18px * var(--am-s, 1)); fill: rgb(255 255 255 / .5); }
    .am-btn.am-big svg { width: calc(30px * var(--am-s, 1)); height: calc(30px * var(--am-s, 1)); fill: rgb(255 255 255 / .9); }
    .am-btn.am-mode svg { width: calc(16px * var(--am-s, 1)); height: calc(16px * var(--am-s, 1)); fill: rgb(255 255 255 / .45); }
    .am-btn.am-on svg { fill: #fa586a; }
    .am-btn.am-one::after { content: "1"; position: absolute; right: 4px; bottom: 4px;
      font: 700 8px/1 system-ui; color: #fa586a; }
    .am-btn.am-open { background: rgb(255 255 255 / .14); }

    /* "more" menu; YTM's own dropdown stays invisible while we use it to run an action */
    html.am-menu-proxy tp-yt-iron-dropdown { opacity: 0 !important; pointer-events: none !important; }
    .am-menu-item.am-menu-off { opacity: .35; pointer-events: none; }
    .am-menu { --am-ms: var(--am-menu-size, 1);
      position: fixed; z-index: 100001; width: calc(288px * var(--am-ms)); max-height: calc(100vh - 16px); overflow-y: auto;
      box-sizing: border-box; padding: 6px; border-radius: 18px; color: #fff; outline: none;
      font-family: var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif); scrollbar-width: none;
      background: rgb(34 34 36 / var(--am-menu-a, .72));
      backdrop-filter: blur(var(--am-menu-blur, 40px)) saturate(190%); -webkit-backdrop-filter: blur(var(--am-menu-blur, 40px)) saturate(190%);
      border: 1px solid rgb(255 255 255 / .12);
      box-shadow: 0 18px 50px rgb(0 0 0 / .45), 0 2px 8px rgb(0 0 0 / .25), inset 0 1px 0 rgb(255 255 255 / .07);
      animation: am-menu-in .22s cubic-bezier(.2, .9, .25, 1.05); }
    .am-menu::-webkit-scrollbar { display: none; }
    .am-menu.am-menu-out { opacity: 0; scale: .97; pointer-events: none; transition: opacity .14s ease, scale .14s ease; }
    @keyframes am-menu-in { from { opacity: 0; scale: .92; translate: 0 6px; } to { opacity: 1; scale: 1; translate: 0 0; } }

    .am-menu-head { display: flex; align-items: center; gap: 11px; padding: 6px 8px 10px; }
    .am-menu-art { width: calc(42px * var(--am-ms)); height: calc(42px * var(--am-ms)); border-radius: 8px; object-fit: cover; flex-shrink: 0;
      background: rgb(255 255 255 / .08); box-shadow: 0 2px 8px rgb(0 0 0 / .3); }
    .am-menu-art:not([src]) { visibility: hidden; }
    .am-menu-meta { min-width: 0; }
    .am-menu-title, .am-menu-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-menu-title { font-size: calc(13.5px * var(--am-ms)); font-weight: 600; }
    .am-menu-sub { font-size: calc(12px * var(--am-ms)); color: rgb(255 255 255 / .55); margin-top: 1px; }

    .am-menu-item { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center;
      color: rgb(255 255 255 / .92); transition: background .12s ease, color .12s ease; }
    .am-menu-item { -webkit-user-select: none; user-select: none; }
    .am-menu-item:hover, .am-menu-item.am-kb { background: rgb(255 255 255 / .1); color: #fff; }
    .am-menu-item:active { background: rgb(255 255 255 / .16); }
    .am-menu-item.am-kb { box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / .35); }
    .am-menu-ic { width: calc(20px * var(--am-ms)); height: calc(20px * var(--am-ms)); flex-shrink: 0; display: grid; place-items: center; color: rgb(255 255 255 / .75); }
    .am-menu-ic svg { width: calc(20px * var(--am-ms)) !important; height: calc(20px * var(--am-ms)) !important; display: block; fill: currentColor; }
    .am-menu-item:hover .am-menu-ic { color: #fff; }
    .am-menu-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

    .am-menu-tiles { display: grid; gap: 6px; padding: 2px 2px 6px; }
    .am-menu-tile { flex-direction: column; justify-content: center; gap: 6px; min-height: calc(64px * var(--am-ms)); padding: 8px 4px;
      border-radius: 12px; background: rgb(255 255 255 / .07); font-size: calc(11px * var(--am-ms)); line-height: 1.2; text-align: center; }
    .am-menu-tile .am-menu-label { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; }
    .am-menu-tile .am-menu-ic, .am-menu-tile .am-menu-ic svg { width: calc(22px * var(--am-ms)) !important; height: calc(22px * var(--am-ms)) !important; }

    .am-menu-row { width: 100%; gap: 12px; height: calc(36px * var(--am-ms)); padding: 0 10px; border-radius: 10px; font-size: calc(13.5px * var(--am-ms)); white-space: nowrap; }
    .am-menu-sep { height: 1px; margin: 5px 10px; background: rgb(255 255 255 / .09); }
    .am-menu-quiet .am-menu-row { height: calc(32px * var(--am-ms)); font-size: calc(12.5px * var(--am-ms)); color: rgb(255 255 255 / .6); }
    .am-menu-quiet .am-menu-ic, .am-menu-quiet .am-menu-ic svg { width: calc(17px * var(--am-ms)) !important; height: calc(17px * var(--am-ms)) !important; }
    .am-menu-quiet .am-menu-ic { color: rgb(255 255 255 / .45); }

    @media (prefers-reduced-motion: reduce) { .am-menu { animation: none; } .am-menu.am-menu-out { transition: none; } }

    .am-lcd { position: relative; min-width: 0; height: calc(52px * var(--am-s, 1)); display: flex; align-items: center; gap: 10px;
      padding: 0 12px 0 4px; border-radius: 11px; background: transparent; border: none; }
    .am-art { width: calc(44px * var(--am-s, 1)); height: calc(44px * var(--am-s, 1)); border-radius: 8px; object-fit: cover; flex-shrink: 0; }
    .am-art:not([src]), .am-art[src=""] { visibility: hidden; }
    .am-info { min-width: 0; flex: 1; padding-bottom: 8px; }
    .am-title, .am-artist { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-title  { font-size: calc(13px * var(--am-s, 1)); font-weight: 600; }
    .am-artist { font-size: calc(12px * var(--am-s, 1)); color: rgb(255 255 255 / .55); }
    .am-sep { opacity: .6; }

    /* like + 3-dot buttons inside the now-playing area, same size as the other buttons, above the progress bar */
    .am-btn.am-lcd-btn { flex-shrink: 0; margin-bottom: 2px; }
    .am-btn.am-lcd-btn + .am-btn.am-lcd-btn { margin-left: -8px; }

    /* clickable names */
    .am-link { cursor: pointer; text-underline-offset: 2px; }
    .am-link:hover { text-decoration: underline; color: #fff; }
    .am-title.am-link { display: block; width: fit-content; max-width: 100%; }

    .am-track { position: absolute; left: calc(14px + 44px * var(--am-s, 1)); right: 12px; bottom: 2px; height: 9px; cursor: pointer; }
    .am-track::before { content: ""; position: absolute; inset: 3px 0; border-radius: 2px;
      background: rgb(255 255 255 / .15); }
    .am-fill { position: absolute; left: 0; top: 3px; height: 3px; width: 0; border-radius: 2px;
      background: rgb(255 255 255 / .75); }
    .am-track { touch-action: none; }

    /* easy progress bar: thicker with a knob while pointed at or dragged; a slightly taller (invisible) hover area */
    html.am-easy-track .am-track::after { content: ""; position: absolute; inset: -4px 0 -2px; }
    html.am-easy-track .am-track::before { transition: inset .18s ease, border-radius .18s ease, background .18s ease; }
    html.am-easy-track .am-fill { transition: top .18s ease, height .18s ease, border-radius .18s ease, background .18s ease; }
    html.am-easy-track .am-track:is(:hover, .am-drag)::before { inset: 0; border-radius: 5px; background: rgb(255 255 255 / .22); }
    html.am-easy-track .am-track:is(:hover, .am-drag) .am-fill { top: 0; height: 9px; border-radius: 5px; background: #fff; }
    html.am-easy-track .am-fill::after { content: ""; position: absolute; right: -7px; top: 50%; width: 14px; height: 14px;
      border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgb(0 0 0 / .45); translate: 0 -50%; scale: 0;
      transition: scale .18s ease; }
    html.am-easy-track .am-track:is(:hover, .am-drag) .am-fill::after { scale: 1; }

    /* idle state: nothing playing -> centered logo */
    .am-logo { display: none; margin: 0 auto; }
    .am-logo svg { width: calc(30px * var(--am-s, 1)); height: calc(30px * var(--am-s, 1)); display: block; }
    .am-logo .am-logo-bg   { fill: var(--am-logo-bg); }
    .am-logo .am-logo-ring { stroke: var(--am-logo-ring); }
    .am-logo .am-logo-tri  { fill: var(--am-logo-tri); }
    .am-idle .am-art, .am-idle .am-info, .am-idle .am-track, .am-idle .am-lcd-btn { display: none; }
    .am-idle .am-logo { display: block; }

    .am-vol { display: flex; align-items: center; }
    .am-vol input { width: 0; opacity: 0; margin: 0; accent-color: #fff; cursor: pointer;
      transition: width .2s ease, opacity .2s ease, margin .2s ease; }
    .am-vol:hover input, .am-vol:focus-within input { width: 90px; opacity: 1; margin-right: 6px; }
    .am-compact .am-vol:hover input, .am-compact .am-vol:focus-within input { width: 70px; }

    /* mobile / narrow: only art, names, progress and heart (no transport, volume, mode or menu buttons) */
    @media (max-width: 700px) {
      .am-bar, .am-bar.am-compact { --am-inset: 10px; grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0 8px; }
      .am-bar .am-left, .am-bar .am-right, .am-bar .am-lcd-more { display: none; }

      /* player page open (lyrics / up next sheet not pulled up): lyrics, queue and like instead of art / names / progress */
      .am-bar.am-page-mode { display: flex; justify-content: center; align-items: center; gap: 28px; }
      .am-bar.am-page-mode .am-right { display: flex; order: -1; gap: 28px; }
      .am-bar.am-page-mode .am-vol, .am-bar.am-page-mode .am-mode { display: none; }
      .am-bar.am-page-mode .am-art, .am-bar.am-page-mode .am-info,
      .am-bar.am-page-mode .am-track, .am-bar.am-page-mode .am-logo { display: none; }
      .am-bar.am-page-mode .am-lcd { flex: 0 0 auto; padding: 0; height: auto; }
      .am-bar.am-page-mode .am-lcd-btn { margin: 0; }
      /* YTM's own mini art (player in its bar-only state): the sync loop sets --am-dx/--am-dy so it sits exactly under our bar's art */
      html:not(.am-fs) ytmusic-player[player-ui-state="PLAYER_BAR_ONLY"] { translate: var(--am-dx, 0px) var(--am-dy, 0px);
        transition: opacity ${MINI_ART_FADE_MS}ms ease; }
      /* gone while the player page is open / opening, fades back in once it has closed */
      html.am-mini-hidden ytmusic-player[player-ui-state="PLAYER_BAR_ONLY"] { opacity: 0; transition: none; }
    }
  `;

