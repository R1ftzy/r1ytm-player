// Apple Music-style bar for YouTube Music
// Browser extension content script (Chrome + Firefox).
// Injected on https://music.youtube.com/* only.
(() => {
  'use strict';

  /* ---------- settings ---------- */
  const PLAYER_PAGE_BAR_SPACE = '88px';          // space the player page keeps free at the bottom for the bar (not in fullscreen)
  const ANIM_MS = 700;                           // player page open / background fade-out duration
  const FADE_IN_MS = 280;                        // how fast the page comes back after closing the player
  const ANIM_EASE = 'cubic-bezier(.16, 1, .3, 1)'; // expo-out: fast start, long soft landing
  const SLIDE_FROM = '12vh';                     // how far below the player page starts its slide
  const MINI_ART_FADE_MS = 450;                  // mobile: fade-in of YTM's own mini art after the player page closes
  const MINI_ART_DELAY_MS = 400;                 // ...starting this long after the page reports closed

  /* ---------- icons & helpers ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const P = {
    rew: 'M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z',
    ff: 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
    shuffle: 'M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
    repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
    more: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    heart: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
    heartFill: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    lyrics: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM8 13h2l1-2V7H7v4h2zm5 0h2l1-2V7h-4v4h2z',
    queue: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
    vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    mute: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
    expand: 'M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z',
    shrink: 'M22 3.41 16.71 8.7 20 12h-8V4l3.29 3.29L20.59 2 22 3.41zM3.41 22l5.29-5.29L12 20v-8H4l3.29 3.29L2 20.59 3.41 22z',
  };
  const svg = d => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    s.append(p);
    return s;
  };
  // YouTube Music mark: filled circle, ring, play triangle
  const ytLogo = () => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    const add = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      s.append(e);
    };
    add('circle', { cx: 12, cy: 12, r: 11, class: 'am-logo-bg' });
    add('circle', { cx: 12, cy: 12, r: 6.2, fill: 'none', 'stroke-width': 1.4, class: 'am-logo-ring' });
    add('path', { d: 'M10.2 9.2v5.6L14.9 12z', class: 'am-logo-tri' });
    return s;
  };
  const el = (tag, cls, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.append(e);
    return e;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ---------- YT Music hooks ---------- */
  const MINI = 'ytmusic-miniplayer[slot="player-bar"]';
  // desktop uses the miniplayer slot; the mobile layout has no such element, so fall back to the player bar
  const ROOTS = [MINI, 'ytmusic-player-bar'];
  // once YTM has switched to its mobile UI it keeps that DOM even after the window is widened again,
  // so fall back to the player page and finally to the whole document
  const SCOPES = [...ROOTS, 'ytmusic-player-page', ''];
  const q = sel => { for (const r of SCOPES) { const e = document.querySelector(`${r} ${sel}`.trim()); if (e) return e; } return null; };
  const qa = sel => { for (const r of SCOPES) { const l = document.querySelectorAll(`${r} ${sel}`.trim()); if (l.length) return [...l]; } return []; };
  const CTRL = { PlayPause: '.play-pause-button', Next: '.next-button', Previous: '.previous-button', Repeat: '.repeat', Shuffle: '.shuffle' };
  const yt = name => q(`.ytmusicPlayerControls${name}Button button`) || q(`ytmusic-player-bar ${CTRL[name]}`) || q(CTRL[name]);
  const video = () => document.querySelector('video');
  const ytLinks = () => qa('.ytmusicTrackInfoByline a, .byline a');
  const ytLike = () =>
    q('like-button-view-model button') ||
    q('ytmusic-like-button-renderer #button-shape-like button') ||
    q('ytmusic-like-button-renderer button[aria-pressed]');
  const isLiked = lk => !!lk && (lk.getAttribute('aria-pressed') === 'true' ||
    (lk.closest('ytmusic-like-button-renderer') || {getAttribute: () => ''}).getAttribute('like-status') === 'LIKE');
  // YTM keyboard shortcuts, used when a button can't be found (Shift+N / Shift+P = next / previous)
  const key = (k, shift) => {
    const o = { key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, shiftKey: !!shift, bubbles: true, cancelable: true };
    const t = document.querySelector('ytmusic-app') || document.body;
    t.dispatchEvent(new KeyboardEvent('keydown', o));
    t.dispatchEvent(new KeyboardEvent('keyup', o));
  };
  window.amDebug = () => {      // run amDebug() in the console to see which hooks are found
    const r = {};
    for (const n of Object.keys(CTRL)) r[n] = yt(n);
    r.Like = ytLike();
    r.Links = ytLinks();
    r.Video = video();
    r.PlayerBar = document.querySelector('ytmusic-player-bar');
    r.Miniplayer = document.querySelector(MINI);
    r.PlayerUiState = uiState() || null;
    r.Store = ytStore();
    console.log('[am-bar] labelled page/bar buttons:', pageButtons().map(n => labelOf(n) + ' <' + n.tagName.toLowerCase() + '.' + n.className + '>'));
    r.OpenTargets = toggleTargets(false);
    r.CloseTargets = toggleTargets(true);
    console.table(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.length + ' found' : v ? 'found' : 'MISSING'])));
    console.log('[am-bar] hooks:', r);
  };

  // player page (lyrics / up next)
  const playerPage = () => document.querySelector('ytmusic-player-page');
  // YTM's own state ("PLAYER_BAR_ONLY" = player page closed). In the mobile UI the page element can stay
  // 'visible' while closed, so visibility alone is not enough.
  const layout = () => document.querySelector('ytmusic-app-layout');
  const uiState = () => {
    const l = layout();
    if (l && typeof l.playerUiState === 'string') return l.playerUiState;     // YTM's own state, same in every layout
    const n = document.querySelector('ytmusic-player[player-ui-state]') || document.querySelector('ytmusic-app-layout[player-ui-state]');
    return n ? n.getAttribute('player-ui-state') : '';
  };
  // YTM's Redux store (what its own buttons use to open / close the player page)
  const ytStore = () => {
    const l = layout(), a = document.querySelector('ytmusic-app');
    const s = (l && l.ytmusicReduxBehavior && l.ytmusicReduxBehavior.store) ||
              (l && l.polymerController && l.polymerController.store) ||
              (a && a.polymerController && a.polymerController.store);
    return s && typeof s.dispatch === 'function' ? s : null;
  };
  const pageOpen = () => {
    const p = playerPage();
    if (!p || getComputedStyle(p).visibility === 'hidden') return false;
    return !/BAR_ONLY|MINIPLAYER|INACTIVE/.test(uiState());
  };
  // open/closed straight from YTM's state attribute when it exists (it flips immediately); else from visibility
  const OPEN_STATES = ['PLAYER_PAGE_OPEN', 'MINIPLAYER_IN_PLAYER_PAGE', 'FULLSCREEN'];
  const stateOpen = () => uiState() ? OPEN_STATES.includes(uiState()) : pageOpen();
  const tabs = () => [...document.querySelectorAll('ytmusic-player-page tp-yt-paper-tab')];
  const findTab = (re, idx) => tabs().find(t => re.test(t.textContent)) || tabs()[idx];
  const tabActive = (re, idx) => {
    const t = findTab(re, idx);
    return pageOpen() && !!t && t.getAttribute('aria-selected') === 'true';
  };

  /* ---------- smooth player page open / background fade ---------- */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastOpen = null;
  let animatingUntil = 0;        // while the open animation runs, skip layout-heavy work
  let closingUntil = 0;          // while closing, ignore "still visible" until YTM finishes
  let observedPage = null;
  let observedLayout = null;

  const setBgHidden = hidden => document.documentElement.classList.toggle('am-player-open', hidden);

  // called the moment a close is requested, so the page fades back in while the player slides away
  const beginClose = () => {
    closingUntil = performance.now() + 2500;
    lastOpen = false;
    setBgHidden(false);
  };

  const onPageState = () => {
    const open = pageOpen();
    if (open && performance.now() < closingUntil) return;   // closing in progress
    if (!open) closingUntil = 0;
    if (open === lastOpen) return;
    const firstRun = lastOpen === null;
    lastOpen = open;

    setBgHidden(open);

    if (firstRun || !open || reduceMotion.matches) return;
    const pp = playerPage();
    if (!pp) return;

    // if YTM already slides the page with a transform transition, only add fade + slight scale
    const cs = getComputedStyle(pp);
    const ytmSlides = /\b(all|transform)\b/.test(cs.transitionProperty) && parseFloat(cs.transitionDuration) > 0;

    // prep layers, pause heavy work, then animate only compositor-friendly properties
    animatingUntil = performance.now() + ANIM_MS + 100;
    document.documentElement.classList.add('am-animating');
    pp.style.willChange = 'opacity, translate, scale';
    const anim = pp.animate(
      ytmSlides
        ? [{ opacity: 0, scale: '0.985' }, { opacity: 1, scale: '1' }]
        : [{ opacity: 0, translate: `0 ${SLIDE_FROM}`, scale: '0.97' }, { opacity: 1, translate: '0 0', scale: '1' }],
      { duration: ANIM_MS, easing: ANIM_EASE }
    );
    anim.finished.finally(() => {
      pp.style.willChange = '';
      document.documentElement.classList.remove('am-animating');
    });
  };

  const watchPage = () => {
    const pp = playerPage();
    if (pp && pp !== observedPage) {
      observedPage = pp;
      new MutationObserver(onPageState).observe(pp, { attributes: true });
    }
    const lay = document.querySelector('ytmusic-app-layout');
    if (lay && lay !== observedLayout) {
      observedLayout = lay;
      new MutationObserver(onPageState).observe(lay, { attributes: true });
    }
  };

  // What can open / close the player page, most specific first. One click on the first usable target only:
  // clicking a second one (e.g. after a timeout) toggles the page straight back, which looked like flicker.
  const usable = n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // labelled buttons of the player page / bar, e.g. to find the one that collapses the page
  const labelOf = n => (n.getAttribute('aria-label') || n.getAttribute('title') || '').trim();
  const pageButtons = () => [...document.querySelectorAll(
    'ytmusic-player-page button, ytmusic-player-page tp-yt-paper-icon-button, ytmusic-player-page yt-icon-button, ' +
    'ytmusic-player-bar button, ytmusic-player-bar tp-yt-paper-icon-button, ytmusic-player-bar yt-icon-button')]
    .filter(n => labelOf(n));
  // NOT "Open miniplayer" (.player-minimize-button): that launches YTM's floating miniplayer instead of collapsing the page
  const findCollapse = () => pageButtons().find(n => {
    const l = labelOf(n).toLowerCase();
    // whole words only: "back" must not match "Playback speed"
    return /\b(collapse|minimi[sz]e|close|dismiss|hide|back|down)\b/.test(l) &&
      !/mini ?player|playback|speed|settings|lyrics|queue|menu|more|video|like|volume|share|save|add|download|repeat|shuffle/.test(l);
  });
  // last resort for closing: the top-left button of the player page (the collapse chevron on mobile)
  const topLeftButton = () => [...document.querySelectorAll(
    'ytmusic-player-page button, ytmusic-player-page tp-yt-paper-icon-button, ytmusic-player-page yt-icon-button, ytmusic-player-page [role="button"]')]
    .map(n => ({ n, r: n.getBoundingClientRect() }))
    .filter(({ n, r }) => r.width > 0 && r.height > 0 && r.top < 110 && r.left < 110 &&
      !/mini ?player|playback|speed|menu|more/i.test(labelOf(n)))
    .sort((a, b) => (a.r.top + a.r.left) - (b.r.top + b.r.left))
    .map(x => x.n)[0];
  // `open` = the page is open now, so we want to close it. Known real elements (from YTM's own DOM):
  //   close: ytmusic-player-page #collapse-button  (aria-label "Minimise player page")
  //   open:  ytmusic-player .player-maximize-button ("Open player page")
  // NOT .player-minimize-button ("Open miniplayer"): that launches the floating miniplayer.
  const toggleTargets = open => {
    const first = open
      ? ['ytmusic-player-page #collapse-button button', 'ytmusic-player-page #collapse-button', 'ytmusic-player-page .collapse-button']
      : ['ytmusic-player .player-maximize-button button', 'ytmusic-player .player-maximize-button'];
    const desktop = [`${MINI} .ytmusicTrackInfoThumbnailWrapper`, `${MINI} ytmusic-track-info`]
      .map(sel => document.querySelector(sel)).filter(n => n && usable(n));
    const rest = open
      ? [findCollapse(), topLeftButton(), document.querySelector('ytmusic-player-bar .toggle-player-page-button')]
      : ['ytmusic-player-bar .toggle-player-page-button', 'ytmusic-player-bar .thumbnail-image-wrapper',
         'ytmusic-player-bar ytmusic-track-info', MINI, 'ytmusic-player-bar'].map(sel => document.querySelector(sel));
    return [...first.map(sel => document.querySelector(sel)), ...desktop, ...rest].filter(Boolean);
  };
  // Open / close the player page the way YTM itself does: dispatch to its store. Works in the desktop and the
  // mobile layout alike. Clicking YTM's (hidden) buttons is only the fallback when the store can't be found.
  const togglePage = () => {
    const open = stateOpen();
    const store = ytStore();
    console.log('[am-bar] toggle:', open ? 'close' : 'open', 'state=' + uiState(), store ? 'via store' : 'via click');
    if (open) beginClose();
    else document.documentElement.classList.add('am-mini-hidden');
    if (store) {
      store.dispatch({ type: 'SET_PLAYER_PAGE_INFO', payload: { open: !open } });
      store.dispatch({ type: 'SET_PLAYER_UI_STATE', payload: open ? 'PLAYER_BAR_ONLY' : 'PLAYER_PAGE_OPEN' });
      return;
    }
    const t = toggleTargets(open)[0];
    if (t) t.click();
    else console.warn('[am-bar] nothing to click to open/close the player page');
  };
  const showTab = async (re, idx) => {
    if (tabActive(re, idx)) { togglePage(); return; }
    if (!pageOpen()) { togglePage(); await sleep(450); }
    const t = findTab(re, idx);
    if (t) t.click();
    else console.warn('[am-bar] tab not found:', re);
  };
  const LYRICS = [/lyrics/i, 1];
  const UPNEXT = [/up next/i, 0];

  // fullscreen (browser fullscreen or YTM's fullscreen player)
  const isFullscreen = () => {
    if (document.fullscreenElement) return true;
    const p = playerPage();
    return !!p && p.hasAttribute('player-fullscreened');
  };

  // YTM's "more" menu, moved so it opens above our button
  const openMenu = async anchor => {
    const t = q('.ytMusicMiniPlayerMenuButton button') || q('ytmusic-menu-renderer button');
    if (!t) { console.warn('[am-bar] menu button not found'); return; }
    t.click();
    for (let i = 0; i < 20; i++) {
      await sleep(25);
      const dd = [...document.querySelectorAll('tp-yt-iron-dropdown')]
        .find(d => getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().height > 0);
      if (dd) {
        const b = anchor.getBoundingClientRect();
        const r = dd.getBoundingClientRect();
        dd.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, b.right - r.width)) + 'px';
        dd.style.top = Math.max(8, b.top - r.height - 10) + 'px';
        dd.style.bottom = 'auto';
        dd.style.right = 'auto';
        dd.style.zIndex = '100000';
        return;
      }
    }
  };

  // volume
  const ytVol = () => q('.ytMusicMiniPlayerVolumePopup input[type="range"]') || q('#volume-slider input[type="range"]');
  const getVolume = () => {
    const s = ytVol();
    if (s) return +s.value;
    const v = video();
    return v ? Math.round(v.volume * 100) : 100;
  };
  const setVolume = val => {
    const s = ytVol();
    if (s) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, String(val));
      s.dispatchEvent(new Event('input', { bubbles: true }));
      s.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const v = video();
      if (v) v.volume = val / 100;
    }
    const v = video();
    if (v && v.muted && val > 0) v.muted = false;
  };

  /* ---------- hide YTM's bar, gray strip, reserved space ---------- */
  const hideNode = n => {
    n.style.setProperty('opacity', '0', 'important');
    n.style.setProperty('pointer-events', 'none', 'important');
  };
  const clearBg = n => {
    n.style.setProperty('background', 'transparent', 'important');
    n.style.setProperty('box-shadow', 'none', 'important');
    n.style.setProperty('border-color', 'transparent', 'important');
  };
  const isOpaque = c => c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c);

  const hideBase = () => {
    const fs = isFullscreen();
    document.documentElement.classList.toggle('am-fs', fs);

    // normal pages: no reserved space, content scrolls under the floating bar
    for (const n of document.querySelectorAll('ytmusic-app, ytmusic-app-layout')) {
      n.style.setProperty('--ytmusic-player-bar-height', '0px', 'important');
    }
    // player page: keep YTM's own bottom space so its layout stays aligned (none in fullscreen)
    const pp = playerPage();
    if (pp) pp.style.setProperty('--ytmusic-player-bar-height', fs ? '0px' : PLAYER_PAGE_BAR_SPACE, 'important');

    document.querySelectorAll(`${MINI}, ytmusic-player-bar, #player-bar-background`).forEach(hideNode);

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

  /* ---------- styles ---------- */
  const styleEl = el('style', null, document.head);
  styleEl.textContent = `
    /* fixed space at the end of every page so content can scroll above the bar */
    ytmusic-section-list-renderer::after,
    ytmusic-search-page::after {
      content: "";
      display: block;
      height: 100px;
    }
    /* ...but not inside the player page, which keeps its own bottom space, and not in fullscreen */
    ytmusic-player-page ytmusic-section-list-renderer::after,
    html.am-fs ytmusic-section-list-renderer::after,
    html.am-fs ytmusic-search-page::after { display: none; }

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

    .am-bar { --am-inset: 16px; --am-h: 60px;
      /* idle logo colors (for the red brand logo: #ff0000, #fff, #fff) */
      --am-logo-bg: rgb(255 255 255 / .45);
      --am-logo-ring: rgb(20 20 20 / .85);
      --am-logo-tri: rgb(20 20 20 / .85);
      position: fixed; left: var(--am-inset); right: var(--am-inset); bottom: 14px; z-index: 99999;
      height: var(--am-h); cursor: pointer;
      display: grid; grid-template-columns: 1fr minmax(0, 540px) 1fr; align-items: center; gap: 16px;
      padding: 0 18px; border-radius: 22px; color: #fff;
      font-family: "Switzer", "SF Pro", system-ui, sans-serif;
      background: rgb(40 40 40 / .28);
      backdrop-filter: blur(28px) saturate(200%); -webkit-backdrop-filter: blur(28px) saturate(200%);
      border: 1px solid rgb(255 255 255 / .12);
      box-shadow: 0 8px 32px rgb(0 0 0 / .3), inset 0 1px 0 rgb(255 255 255 / .08);
      transition: left .35s cubic-bezier(.2,.8,.2,1), right .35s cubic-bezier(.2,.8,.2,1),
                  height .35s cubic-bezier(.2,.8,.2,1), border-radius .35s, padding .35s,
                  opacity .25s ease, transform .25s ease; }

    /* hidden in fullscreen */
    .am-bar.am-hidden { opacity: 0; transform: translateY(24px); pointer-events: none; }

    /* compact: centered pill, max 860px wide */
    .am-bar.am-compact { --am-inset: max(16px, calc(50% - 430px)); --am-h: 56px;
      grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; padding: 0 12px; border-radius: 18px; }
    .am-bar.am-compact .am-btn { width: 30px; height: 30px; }
    .am-bar.am-compact .am-group { gap: 2px; }

    .am-group { display: flex; align-items: center; gap: 4px; }
    .am-left  { justify-self: start; }
    .am-right { justify-self: end; }

    .am-btn { all: unset; position: relative; cursor: pointer; width: 34px; height: 34px;
      display: grid; place-items: center; border-radius: 9px; transition: background .15s; }
    .am-btn:hover { background: rgb(255 255 255 / .1); }
    .am-btn svg { width: 22px; height: 22px; fill: rgb(255 255 255 / .8); pointer-events: none; transition: fill .15s; }
    .am-btn.am-dim svg { width: 18px; height: 18px; fill: rgb(255 255 255 / .5); }
    .am-btn.am-big svg { width: 30px; height: 30px; fill: rgb(255 255 255 / .9); }
    .am-btn.am-mode svg { width: 16px; height: 16px; fill: rgb(255 255 255 / .45); }
    .am-btn.am-on svg { fill: #fa586a; }
    .am-btn.am-one::after { content: "1"; position: absolute; right: 4px; bottom: 4px;
      font: 700 8px/1 system-ui; color: #fa586a; }

    .am-lcd { position: relative; min-width: 0; height: 52px; display: flex; align-items: center; gap: 10px;
      padding: 0 12px 0 4px; border-radius: 11px; background: transparent; border: none; }
    .am-art { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
    .am-art:not([src]), .am-art[src=""] { visibility: hidden; }
    .am-info { min-width: 0; flex: 1; padding-bottom: 8px; }
    .am-title, .am-artist { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-title  { font-size: 13px; font-weight: 600; }
    .am-artist { font-size: 12px; color: rgb(255 255 255 / .55); }
    .am-sep { opacity: .6; }

    /* like + 3-dot buttons inside the now-playing area, same size as the other buttons, above the progress bar */
    .am-btn.am-lcd-btn { flex-shrink: 0; margin-bottom: 2px; }
    .am-btn.am-lcd-btn + .am-btn.am-lcd-btn { margin-left: -8px; }

    /* clickable names */
    .am-link { cursor: pointer; text-underline-offset: 2px; }
    .am-link:hover { text-decoration: underline; color: #fff; }
    .am-title.am-link { display: block; width: fit-content; max-width: 100%; }

    .am-track { position: absolute; left: 58px; right: 12px; bottom: 2px; height: 9px; cursor: pointer; }
    .am-track::before { content: ""; position: absolute; inset: 3px 0; border-radius: 2px;
      background: rgb(255 255 255 / .15); }
    .am-fill { position: absolute; left: 0; top: 3px; height: 3px; width: 0; border-radius: 2px;
      background: rgb(255 255 255 / .75); }

    /* idle state: nothing playing -> centered logo */
    .am-logo { display: none; margin: 0 auto; }
    .am-logo svg { width: 30px; height: 30px; display: block; }
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
      /* YTM's own mini art (player in its bar-only state): the sync loop sets --am-dx/--am-dy so it sits exactly under our bar's art */
      html:not(.am-fs) ytmusic-player[player-ui-state="PLAYER_BAR_ONLY"] { translate: var(--am-dx, 0px) var(--am-dy, 0px);
        transition: opacity ${MINI_ART_FADE_MS}ms ease; }
      /* gone while the player page is open / opening, fades back in once it has closed */
      html.am-mini-hidden ytmusic-player[player-ui-state="PLAYER_BAR_ONLY"] { opacity: 0; transition: none; }
    }
  `;

  /* ---------- build the bar ---------- */
  const bar = el('div', 'am-bar am-idle', document.body);
  bar.addEventListener('click', togglePage);

  const btn = (parent, icon, onClick, extra) => {
    const b = el('button', 'am-btn' + (extra ? ' ' + extra : ''), parent);
    b.append(svg(P[icon]));
    b.addEventListener('click', e => { e.stopPropagation(); onClick(b); });
    return b;
  };
  const clickYt = name => () => {
    const t = yt(name);
    if (t) { t.click(); return; }
    console.warn('[am-bar] YT button not found, using fallback:', name);
    const v = video();
    if (name === 'PlayPause' && v) v.paused ? v.play() : v.pause();
    else if (name === 'Next') key('N', true);
    else if (name === 'Previous') key('P', true);
  };

  // left: transport
  const left = el('div', 'am-group am-left', bar);
  const shuf = btn(left, 'shuffle', clickYt('Shuffle'), 'am-dim');
  btn(left, 'rew', clickYt('Previous'));
  const play = btn(left, 'play', clickYt('PlayPause'), 'am-big');
  btn(left, 'ff', clickYt('Next'));
  const rep = btn(left, 'repeat', clickYt('Repeat'), 'am-dim');

  // center: now playing (or logo when idle)
  const lcd = el('div', 'am-lcd', bar);
  const logo = el('div', 'am-logo', lcd);
  logo.append(ytLogo());
  const art = el('img', 'am-art', lcd);
  const info = el('div', 'am-info', lcd);
  const title = el('div', 'am-title', info);
  const artist = el('div', 'am-artist', info);
  const likeBtn = btn(lcd, 'heart', () => {
    const t = ytLike();
    if (t) t.click();
    else console.warn('[am-bar] like button not found');
  }, 'am-lcd-btn am-like');
  likeBtn.title = 'Like';
  btn(lcd, 'more', b => openMenu(b), 'am-lcd-btn am-lcd-more');
  const track = el('div', 'am-track', lcd);
  const fill = el('div', 'am-fill', track);
  track.addEventListener('click', e => {
    e.stopPropagation();
    const v = video();
    if (!v || !v.duration) return;
    const r = track.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  });

  /* ---------- clickable title / artists / album ---------- */
  let albumIdx = -1;      // index of the album link in YTM's byline, -1 if none
  let bylineKey = '';

  const openLink = i => {
    const a = ytLinks()[i];
    if (a) a.click();
    else console.warn('[am-bar] byline link not found:', i);
  };
  const linkSpan = (text, i) => {
    const s = el('span', 'am-link', artist);
    s.textContent = text;
    s.addEventListener('click', e => { e.stopPropagation(); openLink(i); });
  };
  const sep = () => {
    const s = el('span', 'am-sep', artist);
    s.textContent = ' | ';
  };

  title.addEventListener('click', e => {
    if (albumIdx < 0) return;           // no album -> let the bar open the player
    e.stopPropagation();
    openLink(albumIdx);
  });

  const renderByline = m => {
    const links = ytLinks();
    const texts = links.map(a => a.textContent.trim());
    const key = texts.join('|') + '§' + (m.artist || '') + '§' + (m.album || '');
    if (key === bylineKey) return;      // only rebuild when something changed
    bylineKey = key;

    artist.replaceChildren();
    if (!links.length) {                // fallback: plain text
      artist.textContent = (m.artist || '') + (m.album ? ' | ' + m.album : '');
      albumIdx = -1;
      title.classList.remove('am-link');
      return;
    }

    const album = (m.album || '').trim().toLowerCase();
    albumIdx = album ? texts.findIndex(t => t.toLowerCase() === album) : -1;

    let first = true;
    texts.forEach((t, i) => {
      if (i === albumIdx) return;
      if (!first) artist.append(', ');
      linkSpan(t, i);
      first = false;
    });
    if (albumIdx >= 0) {
      sep();
      linkSpan(texts[albumIdx], albumIdx);
    }
    title.classList.toggle('am-link', albumIdx >= 0);
  };

  // right: lyrics, queue, volume, mode toggle
  const right = el('div', 'am-group am-right', bar);
  const lyricsBtn = btn(right, 'lyrics', () => showTab(...LYRICS));
  const queueBtn = btn(right, 'queue', () => showTab(...UPNEXT));

  const volWrap = el('div', 'am-vol', right);
  const volRange = el('input', null, volWrap);
  volRange.type = 'range';
  volRange.min = '0';
  volRange.max = '100';
  volRange.value = String(getVolume());
  volRange.addEventListener('input', () => setVolume(+volRange.value));
  volRange.addEventListener('click', e => e.stopPropagation());
  const volBtn = btn(volWrap, 'vol', () => {
    const v = video();
    if (v) v.muted = !v.muted;
  });

  const applyMode = compact => {
    bar.classList.toggle('am-compact', compact);
    modeBtn.replaceChildren(svg(compact ? P.expand : P.shrink));
    modeBtn.title = compact ? 'Full bar' : 'Compact bar';
    store.set('am-bar-compact', compact ? '1' : '0');
  };
  const modeBtn = btn(right, 'shrink', () => applyMode(!bar.classList.contains('am-compact')), 'am-mode');
  applyMode(store.get('am-bar-compact', '0') === '1');

  // react to fullscreen immediately (the loop below also checks)
  document.addEventListener('fullscreenchange', () => {
    bar.classList.toggle('am-hidden', isFullscreen());
    hideBase();
  });

  /* ---------- sync loop ---------- */
  let wasPaused = null, wasMuted = null, wasLiked = null, miniShowAt = 0, wasOpen = false;
  const timer = setInterval(() => {
    if (performance.now() > animatingUntil) hideBase();   // skip layout-heavy work mid-animation
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
      fill.style.width = (v.duration ? (v.currentTime / v.duration) * 100 : 0) + '%';
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

    lyricsBtn.classList.toggle('am-on', tabActive(...LYRICS));
    queueBtn.classList.toggle('am-on', tabActive(...UPNEXT));
  }, 250);

  // amOff(): undo everything this script did to the page, so you can check whether a problem is ours or YTM's
  window.amOff = () => {
    clearInterval(timer);
    bar.remove();
    styleEl.remove();
    document.documentElement.classList.remove('am-player-open', 'am-animating', 'am-fs', 'am-mini-hidden');
    document.querySelectorAll(`${MINI}, ytmusic-player-bar, #player-bar-background`).forEach(n => {
      n.style.removeProperty('opacity'); n.style.removeProperty('pointer-events');
    });
    document.querySelectorAll('ytmusic-app, ytmusic-app-layout, ytmusic-player-page').forEach(n =>
      n.style.removeProperty('--ytmusic-player-bar-height'));
    document.querySelectorAll('ytmusic-player').forEach(n => { n.style.removeProperty('--am-dx'); n.style.removeProperty('--am-dy'); });
    console.log('[am-bar] off: bar, styles and inline overrides removed');
  };
})();
