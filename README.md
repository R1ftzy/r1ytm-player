# r1ytm: Cool Modernized YouTube Music I guess

**Now more than just** A floating, Apple Music style control bar for YouTube Music. Unofficial, and not affiliated with Google LLC or Apple Inc.

<p align="center">
  <img src="docs/custom-background.png" alt="Player page with a custom background image" width="77.2%">
  <img src="docs/menu.png" alt="The more menu: quick actions on top, grouped items below" width="21.8%">
  <br><b>Custom background</b> behind the whole app &nbsp;·&nbsp; <b>Menu</b>: one popup for every 3-dot menu
</p>

<p align="center">
  <img src="docs/settings.png" alt="The r1ytm settings panel: transparency, glass, size, font and background" width="20.2%">
  <img src="docs/gradient-maker.png" alt="Gradient maker: paint glowing strokes that blend into a gradient" width="78.8%">
  <br><b>Settings</b>: glass, size, font and background &nbsp;·&nbsp; <b>Gradient maker</b>: paint light, then add effects
</p>

<p align="center">
  <img src="docs/bar.png" alt="The floating bar with the easy progress bar: thicker with a knob while you point at it" width="99%">
  <br><b>The bar</b>: Usable ahh progress bar (on hover).
</p>

Runs only on `https://music.youtube.com/*`. Needs no permissions. Works in Chrome (and Edge/Brave) and Firefox 140+.

## Features

- A floating bar replaces YouTube Music's player bar, with playback, like, volume, lyrics and queue. Click it to open the player.
- Every 3-dot menu and right-click opens in one cleaner popup.
- You can change how see-through and blurred the bar and menus are, and turn on refraction in Chrome-based browsers.
- You can use any font from your device, from Google Fonts or from a font file.
- You can set your own background: a color, an image or GIF, or a gradient you make yourself!
- The gradient maker lets you paint with soft glowing brushes and add effects like grain, bloom and glass.

It is best used together with [Better Lyrics](https://github.com/better-lyrics/better-lyrics) for YouTube Music.

You find all the settings under **r1ytm** in the YouTube Music sidebar.

## Install

### Firefox (extension)

Install it from [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/r1ytm/) and click **Add to Firefox**. Needs Firefox 140 or newer (also works on Firefox for Android 142+).

### Developer mode (Chrome, Edge, Brave, or Firefox)

Get the code (`git clone` or **Code > Download ZIP** on GitHub). The `extension` folder loads as it is.

**Chrome / Edge / Brave** (version 111 or newer):

1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick the `extension` folder.

**Firefox** (version 140 or newer):

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick `extension/manifest.json`.
3. Firefox removes a temporary add-on when it closes, so repeat this after each restart. For a permanent install, use the Firefox Add-ons link above.

After you update the code, click **Reload** on the extension.

### Userscript (Any browser)

Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey), create a new script, replace its contents with the code below and save.

<details>
<summary>Userscript source</summary>

```js
// ==UserScript==
// @name         r1ytm
// @namespace    r1ytm
// @version      1.5.3
// @description  A floating, Apple Music-style control bar for YouTube Music.
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
// Apple Music-style bar for YouTube Music
// Browser extension content script (Chrome + Firefox).
// Injected on https://music.youtube.com/* only.
(() => {
  'use strict';

  /* ---------- settings ---------- */
  const PLAYER_PAGE_BAR_SPACE = '88px';          // space the player page keeps free for the bar until it's measured (follows the bar size)
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
    q('ytmusic-like-button-renderer button[aria-pressed]') ||
    // mobile / new layouts have no YTM like button at all; Better Lyrics' fullscreen controls have one (no liked state)
    document.querySelector('#blyrics-fs-controls button[aria-label="Like"], #blyrics-fs-controls button[aria-label="Unlike"]');
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
    r.SheetOpen = sheetOpen() ? 'yes' : null;
    console.log('[am-bar] labelled page/bar buttons:', pageButtons().map(n => labelOf(n) + ' <' + n.tagName.toLowerCase() + '.' + n.className + '>'));
    r.OpenTargets = toggleTargets(false);
    r.CloseTargets = toggleTargets(true);
    console.table(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.length + ' found' : v ? 'found' : 'MISSING'])));
    console.log('[am-bar] hooks:', r);
  };

  // amProbe(): dump what changes between player-page states (e.g. lyrics / up next sheet down vs pulled up),
  // and every like-ish button, so the right signals and selectors can be picked from real data
  window.amProbe = () => {
    const desc = n => {
      const r = n.getBoundingClientRect(), c = getComputedStyle(n);
      return `<${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''}> ` +
        [...n.attributes].filter(a => !/^(class|id|style)$/.test(a.name)).map(a => `${a.name}=${a.value}`).join(' ') +
        ` | rect top=${Math.round(r.top)} h=${Math.round(r.height)} | display=${c.display} vis=${c.visibility} op=${c.opacity}`;
    };
    const lines = [];
    for (const sel of ['ytmusic-app-layout', 'ytmusic-player-page', 'ytmusic-player-page #side-panel', 'ytmusic-player-page #main-panel',
      'ytmusic-player-page tp-yt-paper-tabs', 'ytmusic-player-page ytmusic-miniplayer', 'ytmusic-player-page #tab-renderer',
      'ytmusic-player-page ytmusic-tab-renderer', 'ytmusic-player-page .side-panel', 'ytmusic-player-page tp-yt-paper-tab[aria-selected="true"]']) {
      document.querySelectorAll(sel).forEach(n => lines.push(sel + ' => ' + desc(n)));
    }
    lines.push('--- like-ish buttons ---');
    document.querySelectorAll('button, [role="button"], yt-icon-button, tp-yt-paper-icon-button').forEach(n => {
      const l = (n.getAttribute('aria-label') || n.getAttribute('title') || '');
      if (/like|thumb/i.test(l) && !n.closest('.am-bar')) {
        const path = []; let p = n;
        for (let i = 0; p && i < 6; i++, p = p.parentElement) path.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : ''));
        lines.push(`"${l}" pressed=${n.getAttribute('aria-pressed')} | ${path.join(' < ')}`);
      }
    });
    console.log('[am-bar] probe:\n' + lines.join('\n'));
  };

  // amLikeProbe(): search YTM's own data for anything like-related (store state, the player page's current item and
  // menu), to find how the new layouts expose "like" for the current song
  window.amLikeProbe = () => {
    const hits = [], seen = new WeakSet();
    const walk = (o, path, depth) => {
      if (!o || typeof o !== 'object' || seen.has(o) || depth > 9 || hits.length > 80) return;
      seen.add(o);
      if (o instanceof Node || o === window) return;
      for (const k of Object.keys(o)) {
        let v; try { v = o[k]; } catch { continue; }
        if (/like/i.test(k)) hits.push(path + '.' + k + ' = ' + (typeof v === 'object' ? JSON.stringify(v)?.slice(0, 300) : String(v)));
        if (v && typeof v === 'object') walk(v, path + '.' + k, depth + 1);
      }
    };
    const st = ytStore();
    try { if (st && st.getState) walk(st.getState(), 'state', 0); } catch (e) { hits.push('state error: ' + e); }
    const pp = playerPage();
    try { if (pp && pp.currentItem) walk(pp.currentItem, 'playerPage.currentItem', 0); } catch (e) { hits.push('currentItem error: ' + e); }
    try { if (pp && pp.getMenuRenderer) walk(pp.getMenuRenderer(), 'playerPage.getMenuRenderer()', 0); } catch (e) { hits.push('menu error: ' + e); }
    console.log('[am-bar] like probe (store ' + (st ? 'found' : 'MISSING') + ', ' + hits.length + ' hits):\n' + hits.join('\n'));
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
      !/mini ?player|playback|speed|menu|more|play|pause|like|volume|shuffle|repeat|next|previous/i.test(labelOf(n)))
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
    // the miniplayer art / track info only ever opens the page; as a close target it can click play / pause instead
    const desktop = open ? [] : [`${MINI} .ytmusicTrackInfoThumbnailWrapper`, `${MINI} ytmusic-track-info`]
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
    if (t) { console.log('[am-bar] toggle click target:', t); t.click(); }
    else console.warn('[am-bar] nothing to click to open/close the player page');
  };
  const isMobile = () => matchMedia('(max-width: 700px)').matches;
  // mobile: is the lyrics / up next sheet pulled up? YTM keeps a tab "selected" even while the sheet is down, and the
  // tab strip doesn't move (measured: top 806 of 874 both ways). Down, YTM reports player-page-ui-state=FULL_PLAYER_VIEW
  // and keeps the tab content (#tab-renderer) at opacity 0 below the screen; any of these changing means "up".
  const sheetOpen = () => {
    const pp = playerPage();
    if (!pp) return false;
    const st = pp.getAttribute('player-page-ui-state');
    if (st && st !== 'FULL_PLAYER_VIEW') return true;
    const tr = pp.querySelector('#tab-renderer');
    if (tr) {
      const c = getComputedStyle(tr), r = tr.getBoundingClientRect();
      if (c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.5 && r.top < innerHeight - 60) return true;
    }
    return false;
  };
  const showTab = async (re, idx) => {
    // mobile: the buttons only ever open a tab (a selected tab doesn't mean its sheet is showing)
    if (tabActive(re, idx) && !isMobile()) { togglePage(); return; }
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

  /* ---------- "more" menu: our own popup ---------- */
  // Our own popup with a fixed layout (YTM's wording and icons). Liked songs / album / artist use the bar's hooks;
  // every other item runs the matching item of YTM's own menu, which is opened invisibly for that.
  const MI = {   // [viewBox size, path] — YTM's icons
    playNext: [24, 'M6 2.86V5H3a1 1 0 00-1 1v12a1 1 0 102 0V7h2v2.137a.5.5 0 00.748.434L13 5.998 6.748 2.426A.5.5 0 006 2.86ZM21 5h-5a1 1 0 100 2h5a1 1 0 100-2Zm0 6H9a1 1 0 000 2h12a1 1 0 000-2Zm0 6H9a1 1 0 000 2h12a1 1 0 000-2Z'],
    addQueue: [24, 'M21 6.998a1 1 0 100-2H9a1 1 0 000 2h12ZM6 21.138a.5.5 0 00.748.434L13 18l-6.252-3.573A.5.5 0 006 14.86V17H4V6a1 1 0 00-2 0v12a1 1 0 001 1h3v2.138Zm15-8.14a1 1 0 000-2H9a1 1 0 000 2h12Zm0 6a1 1 0 000-2h-5a1 1 0 000 2h5Z'],
    playlist: [18, 'M14.25 11.25A.75.75 0 0115 12v1.5h1.5a.75.75 0 010 1.5H15v1.5a.75.75 0 01-1.5 0V15H12a.75.75 0 010-1.5h1.5V12a.75.75 0 01.75-.75Zm-4.5 3H3a.75.75 0 010-1.5h6.75v1.5Zm5.25-6a.75.75 0 010 1.5H3a.75.75 0 010-1.5h12Zm0-4.5a.75.75 0 010 1.5H3a.75.75 0 010-1.5h12Z'],
    share: [18, 'M7.5 2.369v3.263c-4.394.18-6.529 3.25-6.733 9.795-.011.354.433.513.659.24 2.347-2.838 3.262-3.258 6.074-3.291v3.259a.75.75 0 001.235.572l8.515-7.205-8.515-7.205a.75.75 0 00-1.235.572ZM9 7.07V3.986l5.928 5.016L9 14.017v-3.159l-1.517.018c-1.452.017-2.69.127-3.898.768-.35.186-.683.41-1.01.67.266-1.46.687-2.543 1.222-3.32.797-1.156 1.956-1.789 3.765-1.863L9 7.07Z'],
    mix: [18, 'M3.166 3.161a.75.75 0 011.06 1.06 6.753 6.753 0 000 9.548.75.75 0 01-1.06 1.06 8.253 8.253 0 010-11.668Zm10.607 0a.75.75 0 011.061 0 8.251 8.251 0 010 11.668.75.75 0 01-1.06-1.06 6.752 6.752 0 000-9.547.75.75 0 010-1.06Zm-2.122 2.126a.75.75 0 011.06 0 5.25 5.25 0 010 7.424.75.75 0 01-1.06-1.06 3.75 3.75 0 000-5.303.75.75 0 010-1.06Zm-6.363-.004a.75.75 0 111.06 1.06 3.751 3.751 0 00-.813 4.088c.189.454.466.867.814 1.216a.75.75 0 01-1.06 1.06A5.253 5.253 0 013.75 8.995a5.252 5.252 0 011.538-3.712Zm5.962 3.712-3.75 2.25v-4.5l3.75 2.25Z'],
    album: [18, 'M9 .75a8.25 8.25 0 100 16.5A8.25 8.25 0 009 .75Zm0 1.5a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5Zm3.182 3.038a.375.375 0 00-.048.47l.048.06.202.216c.39.444.687.96.877 1.519l.086.282.027.071a.375.375 0 00.709-.19l-.012-.074-.1-.33a5.299 5.299 0 00-1.023-1.773l-.236-.25-.059-.05a.376.376 0 00-.471.049Zm-1.06 1.061a.376.376 0 00-.049.472l.048.059.135.143c.26.296.458.64.585 1.013l.057.189.027.07a.376.376 0 00.697-.265 3.75 3.75 0 00-.802-1.5l-.169-.18-.058-.048a.375.375 0 00-.472.048M9 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5Zm0 1.5a.75.75 0 110 1.5.75.75 0 010-1.5ZM5.643 9.512a.375.375 0 00-.278.384l.013.075.071.235c.158.466.407.896.73 1.266l.17.18.058.047a.376.376 0 00.52-.52l-.048-.058-.135-.144a3 3 0 01-.585-1.012l-.056-.189-.028-.07a.376.376 0 00-.432-.194Zm-1.449.387a.376.376 0 00-.265.46 5.25 5.25 0 001.123 2.102l.236.25.059.05a.376.376 0 00.52-.52l-.049-.06-.202-.215a4.5 4.5 0 01-.877-1.519l-.086-.282-.027-.071a.375.375 0 00-.432-.195Z'],
    artist: [18, 'M9 1.5A3.75 3.75 0 109 9a3.75 3.75 0 000-7.5ZM9 3a2.25 2.25 0 110 4.5A2.25 2.25 0 019 3Zm5.25 6.665v3.216a2.244 2.244 0 00-3 2.119 2.25 2.25 0 004.5 0v-3.226l1.96 1.177a.192.192 0 00.29-.164V11.48a.38.38 0 00-.18-.32l-3-1.815a.375.375 0 00-.57.32ZM9 9.75a6 6 0 00-6 6 .75.75 0 101.5 0 4.5 4.5 0 016.84-3.842l1.084-1.083A6 6 0 009 9.75Zm4.5 4.5a.75.75 0 110 1.5.75.75 0 010-1.5Z'],
    credits: [18, 'M13.5 2.249a3 3 0 00-2.435 1.253c.447.231.851.535 1.197.9A1.5 1.5 0 1113.5 6.75a.687.687 0 01-.065-.004 4.5 4.5 0 01.002 1.502l.063.002a3 3 0 000-6.001Zm-9 .002a3 3 0 100 6l.063-.002a4.5 4.5 0 010-1.502.913.913 0 01-.063.004 1.5 1.5 0 111.237-2.348 4.5 4.5 0 011.198-.9A3 3 0 004.5 2.251ZM9 4.5a3 3 0 100 6 3 3 0 000-6ZM9 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3Zm4.5 2.999c-.087 0-.173.003-.26.008a4.5 4.5 0 01-1.049 1.664l.115.077.046-.02a3.003 3.003 0 014.148 2.771.75.75 0 101.5 0 4.503 4.503 0 00-4.5-4.5Zm-8.741.009a4.49 4.49 0 00-4.416 2.77A4.5 4.5 0 000 13.5a.75.75 0 101.5 0 3 3 0 014.148-2.771l.04.018.12-.076a4.497 4.497 0 01-1.049-1.663ZM9 11.25a4.5 4.5 0 00-4.5 4.5.75.75 0 101.5 0 3.001 3.001 0 016 0 .75.75 0 101.5 0 4.5 4.5 0 00-4.5-4.5Z'],
    library: [18, 'M14.25 1.5H3.75A1.5 1.5 0 002.25 3v12.665c0 .95 1.037 1.538 1.852 1.049L9 13.774l4.898 2.94a1.223 1.223 0 001.852-1.049V3a1.5 1.5 0 00-1.5-1.5ZM3.75 15.175V3h10.5v12.175l-4.864-2.918L9 12.025l-.386.232-4.864 2.918Z'],
    like: [18, 'm7.748.854.779.13a3 3 0 012.44 3.588L10.5 6.75h3.046a2.748 2.748 0 012.204 4.387l.015.066A2.862 2.862 0 0115 13.874v.033c0 .227-.037.452-.109.668l-.08.21a2.815 2.815 0 01-2.59 1.715H9.516l-.294-.005a9.002 9.002 0 01-3.918-1.041l-.256-.142-.204-.116a1.502 1.502 0 00-.55-.186L4.102 15H2.625l-.116-.006a1.126 1.126 0 01-1.003-1.005l-.006-.114v-4.5c0-.62.504-1.124 1.125-1.124h1.342a.75.75 0 00.66-.395l.048-.107 2.24-6.403a.75.75 0 01.833-.491ZM6.09 8.243A2.25 2.25 0 013.967 9.75H3v3.749h1.1a3 3 0 011.49.395l.202.116a7.503 7.503 0 003.724.99h2.703c.566 0 1.07-.363 1.248-.9a.61.61 0 00.032-.193v-.655l.44-.439a1.36 1.36 0 00.363-1.272l-.014-.065-.157-.675.413-.556a1.248 1.248 0 00-.999-1.995H10.5a1.501 1.501 0 01-1.467-1.815L9.5 4.257a1.5 1.5 0 00-1.22-1.794l-.157-.026L6.09 8.243Z'],
    download: [24, 'M12 2a1 1 0 00-1 1v11.586l-4.293-4.293a1 1 0 10-1.414 1.414L12 18.414l6.707-6.707a1 1 0 10-1.414-1.414L13 14.586V3a1 1 0 00-1-1Zm7 18H5a1 1 0 000 2h14a1 1 0 000-2Z'],
    pin: [18, 'M15.755 4.724 8.775.694 8.655.64a.637.637 0 00-.623 1.08l.105.075.55.318-2.545 4.409-1.289.345a1.13 1.13 0 00-.683.525l-.758 1.313a.563.563 0 00.206.769l7.108 4.104c.27.155.613.063.77-.206l.757-1.313c.15-.259.19-.566.113-.854l-.345-1.289 2.545-4.409.551.319.118.053c.24.08.508.008.676-.182l.075-.104a.64.64 0 00-.128-.794l-.103-.075ZM7.442 7.272 9.874 3.06l3.28 1.894-2.43 4.212a1.5 1.5 0 00-.15 1.138l.304 1.138-.213.368-5.484-3.166.212-.368 1.138-.305a1.5 1.5 0 00.911-.699Zm-2.079 9.09 2.545-4.41-1.47-.848-2.545 4.409-.113 1.893 1.583-1.044Z'],
    removeQueue: [18, 'M9 .75a8.25 8.25 0 100 16.5A8.25 8.25 0 009 .75Zm0 1.5a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5Zm3 6H6a.75.75 0 000 1.5h6a.75.75 0 100-1.5Z'],
    dismissQueue: [18, 'M15.97 11.47a.75.75 0 111.06 1.06l-1.345 1.345 1.345 1.345a.75.75 0 11-1.06 1.06l-1.345-1.345-1.345 1.345a.75.75 0 11-1.06-1.06l1.345-1.345-1.345-1.345a.75.75 0 111.06-1.06l1.345 1.345 1.345-1.345Zm-5.47 2.78H3a.75.75 0 010-1.5h7.5v1.5Zm4.5-6a.75.75 0 010 1.5H3a.75.75 0 010-1.5h12Zm0-4.5a.75.75 0 010 1.5H3a.75.75 0 010-1.5h12Z'],
    report: [18, 'm3 2.25-.11.055c-.392.196-.64.597-.64 1.036v12.41a.75.75 0 101.5 0v-4.87a5.451 5.451 0 014.687.087L9 11.25l.357.166A6.701 6.701 0 0015 11.25l.11-.055c.343-.171.575-.5.628-.873l.012-.163V3.344a.908.908 0 00-1.313-.812 5.45 5.45 0 01-4.874 0L9 2.25a6.7 6.7 0 00-6 0Zm5.33 1.342.564.282a6.95 6.95 0 005.356.356v5.715a5.2 5.2 0 01-4.58-.037l-.564-.282A6.95 6.95 0 003.75 9.27V3.555a5.2 5.2 0 014.58.037Z'],
    stats: [18, 'M15.153 1.508 15 1.5H3A1.5 1.5 0 001.5 3v12l.008.153A1.5 1.5 0 003 16.5h12l.153-.008a1.5 1.5 0 001.34-1.339L16.5 15V3a1.5 1.5 0 00-1.347-1.492ZM3 15V3h12v12H3Zm6-9.75a.75.75 0 00-.75.75v6.75h1.5V6A.75.75 0 009 5.25ZM6 7.5a.75.75 0 00-.75.75v4.5h1.5v-4.5A.75.75 0 006 7.5ZM12 9a.75.75 0 00-.75.75v3h1.5v-3A.75.75 0 0012 9Z'],
  };
  const menuIcon = ([size, d]) => {
    const s = svg(d);
    s.setAttribute('viewBox', `0 0 ${size} ${size}`);
    return s;
  };

  /* YTM's own menu, used invisibly to run the actions (html.am-menu-proxy hides its dropdown while we use it).
     Every use goes through withYtMenu(), one at a time. */
  const shown = n => n.getClientRects().length > 0;
  const ytMenuButton = () => q('.ytMusicMiniPlayerMenuButton button') || q('ytmusic-menu-renderer button');
  const ytMenuList = () => [...document.querySelectorAll('ytmusic-menu-popup-renderer #items')]
    .find(l => shown(l) && l.getBoundingClientRect().height > 0);
  const ytMenuLabel = n => {
    const t = [...n.querySelectorAll('yt-formatted-string')].find(s => shown(s) && s.textContent.trim());
    return (t ? t.textContent : n.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
  };
  const ytMenuItems = list => [...list.children].filter(n => !n.hidden && shown(n))
    .map(n => ({ n, label: ytMenuLabel(n) })).filter(x => x.label);
  const waitYtMenuClosed = async () => { for (let i = 0; i < 30 && ytMenuList(); i++) await sleep(50); };
  // YTM gives focus back to its (hidden) menu button on close; drop it so Space doesn't reopen YTM's menu
  const dropYtFocus = () => {
    const a = document.activeElement;
    if (a && a !== document.body && a.closest('tp-yt-iron-dropdown, ytmusic-menu-renderer, .ytMusicMiniPlayerMenuButton, ytmusic-player-bar, ' + MINI)) a.blur();
  };
  const closeYtMenu = async () => { if (ytMenuList()) document.body.click(); await waitYtMenuClosed(); dropYtFocus(); };
  // our own synthetic clicks on YTM's menu buttons must not be caught by the interceptor below
  let replaying = false;
  const replay = fn => { replaying = true; try { fn(); } finally { replaying = false; } };
  // what opens a YTM menu: the bar's song (default), or a remembered 3-dot click / right-click elsewhere
  const barOpener = () => {
    const b = ytMenuButton();
    if (!b) { console.warn('[am-bar] menu: YTM menu button not found'); return false; }
    replay(() => b.click());
    return true;
  };
  const triggerOpener = t => () => {
    if (!t.el.isConnected) { console.warn('[am-bar] menu: the 3-dot button is gone (list re-rendered)'); return false; }
    replay(() => t.type === 'click' ? t.el.click() : t.el.dispatchEvent(new MouseEvent('contextmenu',
      { bubbles: true, cancelable: true, composed: true, button: 2, clientX: t.x, clientY: t.y })));
    return true;
  };
  // open YTM's menu and wait until its items stop changing; null if it didn't open
  const openYtMenu = async (opener = barOpener) => {
    if (ytMenuList()) await closeYtMenu();
    if (!opener()) return null;
    let list = null, count = -1, stable = 0;
    for (let i = 0; i < 60; i++) {
      await sleep(25);
      list = ytMenuList();
      if (!list) continue;
      const c = ytMenuItems(list).length;
      if (c && c === count) { if (++stable >= 3) break; } else { stable = 0; count = c; }
    }
    if (!list) console.warn('[am-bar] menu: YTM menu did not open');
    return list ? ytMenuItems(list) : null;
  };
  let ytLock = Promise.resolve();
  const withYtMenu = fn => {
    const run = async () => {
      document.documentElement.classList.add('am-menu-proxy');
      try { return await fn(); } finally { document.documentElement.classList.remove('am-menu-proxy'); }
    };
    return (ytLock = ytLock.then(run, run));
  };
  // run one of YTM's menu actions: find its item by label and click it
  const runYtItem = (re, label, opener) => withYtMenu(async () => {
    const items = await openYtMenu(opener);
    if (!items) return;
    const hit = items.find(x => re.test(x.label));
    if (!hit) {
      console.warn('[am-bar] menu: YTM has no "' + label + '" for this song; it has:', items.map(x => x.label).join(', '));
      await closeYtMenu();
      return;
    }
    const n = hit.n;
    // the visible paper-item (download), the endpoint link (navigation items), else the item itself
    (([...n.querySelectorAll('tp-yt-paper-item')].find(shown)) || n.querySelector('a#navigation-endpoint') || n).click();
    await waitYtMenuClosed();
    dropYtFocus();
  });

  // byline link indices: the album, and the first link that isn't the album (the artist)
  const artistIdx = () => ytLinks().findIndex((_, i) => i !== albumIdx);

  // tiles = quick actions on top; groups are separated by a line; the last group is shown quieter.
  // `re` items run YTM's own menu item with a matching label (and take over its wording, e.g. "Remove from library").
  const menuModel = () => {
    const liked = isLiked(ytLike());
    const item = (icon, label, run) => run instanceof RegExp
      ? { icon, label, re: run, run: () => runYtItem(run, label) }
      : { icon, label, run };
    return {
      tiles: [
        item('playNext', 'Play next', /play next/i),
        item('addQueue', 'Add to queue', /add to queue/i),
        item('playlist', 'Save to playlist', /(save|add) to playlist/i),
        item('share', 'Share', /^share/i),
      ],
      groups: [
        [
          item('mix', 'Start mix', /mix|radio/i),
          albumIdx >= 0 && item('album', 'Go to album', () => openLink(albumIdx)),
          artistIdx() >= 0 && item('artist', 'Go to artist', () => openLink(artistIdx())),
          item('credits', 'View song credits', /credits/i),
        ],
        [
          item('library', 'Save to library', /library/i),
          item('like', liked ? 'Remove from liked songs' : 'Add to liked songs', () => likeBtn.click()),
          item('download', 'Download', /download/i),
          item('pin', 'Pin to Listen again', /listen again/i),
        ],
        [
          item('removeQueue', 'Remove from queue', /remove from queue/i),
          item('dismissQueue', 'Dismiss queue', /dismiss queue|clear queue/i),
        ],
        [
          item('report', 'Report', /^report/i),
          item('stats', 'Stats for nerds', /stats for nerds/i),
        ],
      ].map(g => g.filter(Boolean)),
    };
  };
  // after the popup opens: read YTM's menu once (invisibly) to show its current wording for toggles and to dim
  // items it doesn't have for this song (e.g. "Remove from queue"). Skipped if YTM's labels don't match ours
  // (another language), so nothing gets dimmed by mistake.
  const syncMenuWithYt = (m, all) => withYtMenu(async () => {
    const items = await openYtMenu();
    await closeYtMenu();
    if (!items || menuEl !== m) return;
    const ours = all.filter(it => it.re);
    const hits = ours.map(it => items.find(x => it.re.test(x.label)));
    if (hits.filter(Boolean).length < 3) return;
    ours.forEach((it, i) => {
      if (hits[i]) it.labelEl.textContent = hits[i].label;
      else it.el.classList.add('am-menu-off');
    });
  });

  let menuEl = null, menuAnchor = null, menuTrigger = null;   // menuTrigger: YTM's 3-dot button of an open row menu
  const menuItemOf = new WeakMap();         // our item element -> its model entry

  const closeMenu = () => {
    if (!menuEl) return;
    const m = menuEl;
    menuEl = null;
    if (menuAnchor) menuAnchor.classList.remove('am-open');
    menuAnchor = null;
    menuTrigger = null;
    m.classList.add('am-menu-out');
    setTimeout(() => m.remove(), 160);
  };

  const pickMenuItem = it => {
    closeMenu();
    it.run();
  };

  // build and show a popup: model = { tiles, groups }, head = { title, sub, img } or null,
  // place(m) positions it; returns the list of rendered items
  const buildMenu = (anchor, model, head, place) => {
    const { tiles, groups } = model;
    const m = el('div', 'am-menu');
    m.setAttribute('role', 'menu');

    if (head && head.title) {
      const h = el('div', 'am-menu-head', m);
      const img = el('img', 'am-menu-art', h);
      img.alt = '';
      if (head.img) img.src = head.img;
      const tx = el('div', 'am-menu-meta', h);
      el('div', 'am-menu-title', tx).textContent = head.title;
      if (head.sub) el('div', 'am-menu-sub', tx).textContent = head.sub;
    }

    const all = [];
    const item = (parent, it, cls) => {
      const b = el('div', cls, parent);
      b.setAttribute('role', 'menuitem');
      el('span', 'am-menu-ic', b).append(it.svg ? it.svg.cloneNode(true) : menuIcon(MI[it.icon]));
      it.labelEl = el('span', 'am-menu-label', b);
      it.labelEl.textContent = it.label;
      it.el = b;
      menuItemOf.set(b, it);
      all.push(it);
    };
    if (tiles.length) {
      const row = el('div', 'am-menu-tiles', m);
      row.style.gridTemplateColumns = `repeat(${tiles.length}, minmax(0, 1fr))`;
      tiles.forEach(it => item(row, it, 'am-menu-item am-menu-tile'));
    }
    groups.forEach((g, gi) => {
      if (!g.length) return;
      if (m.querySelector('.am-menu-item')) el('div', 'am-menu-sep', m);
      const box = el('div', 'am-menu-group' + (gi === groups.length - 1 ? ' am-menu-quiet' : ''), m);
      g.forEach(it => item(box, it, 'am-menu-item am-menu-row'));
    });

    place(m);
    menuEl = m;
    menuAnchor = anchor;
    anchor.classList.add('am-open');
    return all;
  };

  // the bar's 3-dot: fixed layout, always above the bar, right edge at the button; too tall -> it scrolls
  const openMenu = anchor => {
    if (menuEl) { closeMenu(); return; }
    const meta = navigator.mediaSession.metadata;
    const head = meta && meta.title
      ? { title: meta.title, sub: [meta.artist, meta.album].filter(Boolean).join(' · '), img: art.src } : null;
    const place = m => {
      const barTop = bar.getBoundingClientRect().top;
      m.style.bottom = (innerHeight - barTop + 10) + 'px';
      m.style.maxHeight = Math.max(160, barTop - 10 - 8) + 'px';
      document.body.append(m);
      const b = anchor.getBoundingClientRect(), r = m.getBoundingClientRect();
      const left = Math.max(8, Math.min(innerWidth - r.width - 8, b.right - r.width + 8));
      m.style.left = left + 'px';
      m.style.transformOrigin = `${Math.round(b.left + b.width / 2 - left)}px 100%`;
    };
    const m0 = buildMenu(anchor, menuModel(), head, place);
    syncMenuWithYt(menuEl, m0);
  };

  /* ---------- YTM's own 3-dot menus everywhere else (song rows, cards, queue, headers) ---------- */
  // A click on one of YTM's 3-dot buttons (or a right-click on a row) is stopped before YTM sees it. We open that menu
  // invisibly, read its items, close it, and show them in our popup; picking one replays the same click and runs the
  // real item. Items are grouped like the bar's menu (English labels; anything unmatched goes in the middle).
  const GEN_TILES = [/play next/i, /add to queue/i, /(save|add) to playlist/i, /^share/i];
  const GEN_GROUPS = [
    [/mix|radio/i, /shuffle/i, /go to album/i, /go to artist/i, /credits/i],
    [/library/i, /liked/i, /download/i, /listen again/i],
    [/queue/i],
    [],                                                        // everything else
    [/not interested/i, /recommend/i, /report/i, /stats for nerds/i],   // quieter, at the end
  ];
  const GEN_OTHER = 3;
  const genModel = (items, opener) => {
    const tiles = [], groups = GEN_GROUPS.map(() => []);
    items.forEach((x, i) => {
      const exact = new RegExp('^' + x.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
      const it = { svg: x.svg, label: x.label, i, run: () => runYtItem(exact, x.label, opener) };
      const ti = GEN_TILES.findIndex(re => re.test(x.label));
      if (ti >= 0) { tiles.push({ ...it, rank: ti }); return; }
      let gi = GEN_GROUPS.findIndex(g => g.some(re => re.test(x.label)));
      const rank = gi >= 0 ? GEN_GROUPS[gi].findIndex(re => re.test(x.label)) : 0;
      if (gi < 0) gi = GEN_OTHER;
      groups[gi].push({ ...it, rank });
    });
    const byRank = (a, b) => a.rank - b.rank || a.i - b.i;
    return { tiles: tiles.sort(byRank), groups: groups.map(g => g.sort(byRank)) };
  };
  // title / subtitle / art of the row or card the menu belongs to (header of our popup)
  const ROWS = 'ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer, ytmusic-player-queue-item, ' +
    'ytmusic-responsive-header-renderer, ytmusic-detail-header-renderer, ytmusic-immersive-header-renderer, ytmusic-card-shelf-renderer';
  const rowHead = node => {
    const row = node.closest(ROWS);
    if (!row) return null;
    const txt = sel => { const n = row.querySelector(sel); return n ? n.textContent.trim().replace(/\s+/g, ' ') : ''; };
    const img = [...row.querySelectorAll('img')].find(i => /^https?:/.test(i.src));
    return { title: txt('.title, .song-title, h1, h2'), sub: txt('.secondary-flex-columns, .subtitle, .byline, .strapline'), img: img ? img.src : '' };
  };
  // read a menu's items (label + a copy of YTM's icon) by opening it invisibly
  const readYtMenu = opener => withYtMenu(async () => {
    const items = await openYtMenu(opener);
    const out = items && items.map(x => {
      const s = [...x.n.querySelectorAll('yt-icon svg')].find(shown);
      return { label: x.label, svg: s ? s.cloneNode(true) : null };
    });
    await closeYtMenu();
    return out;
  });

  let genToken = 0;
  const openGenMenu = async t => {
    const token = ++genToken;
    closeMenu();
    const opener = triggerOpener(t);
    const items = await readYtMenu(opener);
    if (token !== genToken || !items || !items.length) return;
    const head = rowHead(t.el);
    const anchor = t.type === 'click' ? t.el : el('span');   // a right-click has no button to highlight
    const place = m => {
      // next to the button (or the mouse): below if it fits above our bar, else above; scrolls if too tall
      const a = t.type === 'click' ? t.el.getBoundingClientRect() : { left: t.x, right: t.x, top: t.y, bottom: t.y, width: 0 };
      const floor = bar.isConnected && !bar.classList.contains('am-hidden') ? bar.getBoundingClientRect().top - 10 : innerHeight - 8;
      document.body.append(m);
      const r = m.getBoundingClientRect();
      const below = floor - (a.bottom + 6), above = a.top - 6 - 8;
      const down = r.height <= below || below >= above;
      m.style.maxHeight = Math.max(160, down ? below : above) + 'px';
      const h = Math.min(r.height, Math.max(160, down ? below : above));
      m.style.top = (down ? a.bottom + 6 : a.top - 6 - h) + 'px';
      const left = t.type === 'click' ? a.right - r.width : a.left;
      m.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, left)) + 'px';
      m.style.transformOrigin = `${t.type === 'click' ? '100%' : '0'} ${down ? '0' : '100%'}`;
    };
    buildMenu(anchor, genModel(items, opener), head, place);
    menuTrigger = t.el;
  };

  // the interceptor: YTM's 3-dot buttons (not the like / dislike buttons next to them) and right-clicks on rows
  const ytMenuTrigger = node => {
    if (!node || !node.closest || node.closest('.am-bar, .am-menu')) return null;
    const b = node.closest('button, yt-icon-button, tp-yt-paper-icon-button');
    if (!b || !b.closest('ytmusic-menu-renderer')) return null;
    if (b.closest('#top-level-buttons, ytmusic-like-button-renderer, like-button-view-model')) return null;
    if (b.closest('ytmusic-player-bar, ' + MINI)) return null;          // the hidden player bar: the bar's own menu covers it
    return b;
  };
  addEventListener('click', e => {
    if (replaying) return;
    const b = ytMenuTrigger(e.target);
    if (!b) return;
    e.stopPropagation();
    e.preventDefault();
    if (menuEl && menuTrigger === b) { closeMenu(); return; }   // same button again: just close
    openGenMenu({ type: 'click', el: b });
  }, true);
  addEventListener('contextmenu', e => {
    if (replaying || e.shiftKey) return;                       // Shift + right-click keeps the browser's own menu
    const row = e.target.closest && !e.target.closest('.am-bar, .am-menu') && e.target.closest(ROWS);
    // queue rows stamp their menu renderer only when playing / hovered, but YTM still opens a menu on right-click
    if (!row || !(row.matches('ytmusic-player-queue-item') || row.querySelector('ytmusic-menu-renderer'))) return;
    e.stopPropagation();
    e.preventDefault();
    openGenMenu({ type: 'contextmenu', el: e.target, x: e.clientX, y: e.clientY });
  }, true);

  // clicks inside the popup are handled here and kept from the page (and from the bar, which would open the player);
  // a press anywhere else closes it
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click']) {
    addEventListener(type, e => {
      if (!menuEl) return;
      if (menuEl.contains(e.target)) {
        e.stopPropagation();
        if (type === 'pointerdown' || type === 'mousedown') e.preventDefault();
        if (type === 'click') {
          const b = e.target.closest('.am-menu-item');
          if (b && menuItemOf.has(b) && !b.classList.contains('am-menu-off')) pickMenuItem(menuItemOf.get(b));
        }
        return;
      }
      if (type === 'pointerdown' && !(menuAnchor && menuAnchor.contains(e.target))) closeMenu();
    }, true);
  }
  // keyboard: Escape closes, arrows / Tab / Home / End move a highlight, Enter / Space pick;
  // all kept from YTM's own hotkeys while the popup is open
  addEventListener('keydown', e => {
    if (!menuEl) return;
    const list = [...menuEl.querySelectorAll('.am-menu-item:not(.am-menu-off)')];
    const i = list.findIndex(b => b.classList.contains('am-kb'));
    const go = n => { list.forEach(b => b.classList.remove('am-kb')); list[(n + list.length) % list.length].classList.add('am-kb'); };
    if (e.key === 'Escape') closeMenu();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) go(i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) go(i < 0 ? -1 : i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(-1);
    else if (e.key === 'Enter' || e.key === ' ') { if (i >= 0) pickMenuItem(menuItemOf.get(list[i])); }
    else return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

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
    const space = bar.offsetHeight ? (bar.offsetHeight + 28) + 'px' : PLAYER_PAGE_BAR_SPACE;   // bar + its margins
    if (pp) pp.style.setProperty('--ytmusic-player-bar-height', fs ? '0px' : space, 'important');

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
  // click or drag to seek. While dragging only the fill follows the pointer; the song seeks once, on release
  let seeking = null;            // the position (0..1) being dragged to, null when not dragging
  const trackPos = e => {
    const r = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  track.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const v = video();
    if (!v || !v.duration) return;
    e.stopPropagation();
    track.setPointerCapture(e.pointerId);
    track.classList.add('am-drag');
    seeking = trackPos(e);
    fill.style.width = seeking * 100 + '%';
  });
  track.addEventListener('pointermove', e => {
    if (seeking === null) return;
    seeking = trackPos(e);
    fill.style.width = seeking * 100 + '%';
  });
  const endSeek = commit => {
    if (seeking === null) return;
    const v = video();
    if (commit && v && v.duration) v.currentTime = seeking * v.duration;
    seeking = null;
    track.classList.remove('am-drag');
  };
  track.addEventListener('pointerup', () => endSeek(true));
  track.addEventListener('pointercancel', () => endSeek(false));
  track.addEventListener('click', e => e.stopPropagation());     // a click here must not open the player page

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

  /* ---------- settings (sidebar entry "r1ytm" -> panel) ---------- */
  // Values live in localStorage ("am-settings") and are applied as CSS variables on <html>; the bar layout
  // (full / compact) keeps its own key ("am-bar-compact") through applyMode().
  const SETTINGS = [
    { group: 'Transparency', key: 'barAlpha', label: 'Bar opacity', min: 0, max: 90, step: 1, def: 28, unit: '%',
      css: v => ['--am-bar-a', v / 100] },
    { group: 'Transparency', key: 'barBlur', label: 'Bar blur', min: 0, max: 60, step: 1, def: 28, unit: 'px',
      css: v => ['--am-bar-blur', v + 'px'] },
    { group: 'Transparency', key: 'menuAlpha', label: 'Menu opacity', min: 30, max: 98, step: 1, def: 72, unit: '%',
      css: v => ['--am-menu-a', v / 100] },
    { group: 'Transparency', key: 'menuBlur', label: 'Menu blur', min: 0, max: 80, step: 1, def: 40, unit: 'px',
      css: v => ['--am-menu-blur', v + 'px'] },
    { group: 'Glass', key: 'refract', type: 'toggle', label: 'Refraction', min: 0, max: 1, def: 0,
      note: () => canRefract ? 'Bends the background at the edges of the bar' : 'Needs Chrome, Edge or Brave',
      disabled: () => !canRefract },
    { group: 'Glass', key: 'refractStrength', label: 'Refraction strength', min: 10, max: 200, step: 1, def: 90, unit: 'px',
      dep: 'refract' },
    { group: 'Size', key: 'barSize', label: 'Bar size', min: 80, max: 130, step: 5, def: 100, unit: '%',
      css: v => ['--am-size', v / 100] },
    { group: 'Size', key: 'menuSize', label: 'Menu size', min: 85, max: 125, step: 5, def: 100, unit: '%',
      css: v => ['--am-menu-size', v / 100] },
    { group: 'Size', key: 'easyTrack', type: 'toggle', label: 'Easy progress bar', min: 0, max: 1, def: 1,
      note: () => 'Grows when you point at it, easier to drag' },
  ];
  /* refraction ("liquid glass"): an SVG displacement filter in the bar's backdrop-filter. The map is drawn for the bar's
     exact size and rounded shape: near the edge every pixel samples the background a little further inside, so it
     bends like the rim of a glass pane. Only Chromium supports url() filters in backdrop-filter; elsewhere the toggle is off. */
  // CSS.supports() can't tell: Firefox accepts url() in backdrop-filter but then drops the whole filter (no blur at all).
  // Only Chromium renders it, and Chromium is the engine that has navigator.userAgentData with a "Chromium" brand.
  const canRefract = !!(navigator.userAgentData && navigator.userAgentData.brands &&
    navigator.userAgentData.brands.some(b => /chromium/i.test(b.brand)));
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  };
  // no innerHTML: YTM enforces Trusted Types
  const refractDefs = svgEl('svg', { 'aria-hidden': 'true', width: 0, height: 0 });
  refractDefs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  // The whole look is done inside the filter (blur -> saturate -> displace), because Chrome drops CSS filter functions
  // chained after a url() in backdrop-filter. Red / green / blue are displaced by slightly different amounts and added
  // back together: the color split real glass shows at its rim.
  const refractFilter = svgEl('filter', { id: 'am-refract', x: 0, y: 0, width: 1, height: 1,
    'color-interpolation-filters': 'sRGB' }, svgEl('defs', {}, refractDefs));
  const refractBlur = svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 28, edgeMode: 'duplicate', result: 'blur' }, refractFilter);
  svgEl('feColorMatrix', { in: 'blur', type: 'saturate', values: 2, result: 'sat' }, refractFilter);
  const refractMap = svgEl('feImage', { x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: 'none', result: 'map' }, refractFilter);
  const CHANNELS = [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
                    ['g', 1.06, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
                    ['b', 1.12, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
  const refractDisps = CHANNELS.map(([c, k, m]) => {
    const dm = svgEl('feDisplacementMap', { in: 'sat', in2: 'map', scale: 90, xChannelSelector: 'R', yChannelSelector: 'G',
      result: 'd' + c }, refractFilter);
    svgEl('feColorMatrix', { in: 'd' + c, type: 'matrix', values: m, result: 'c' + c }, refractFilter);
    return [dm, k];
  });
  svgEl('feComposite', { in: 'cr', in2: 'cg', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'rg' }, refractFilter);
  svgEl('feComposite', { in: 'rg', in2: 'cb', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0 }, refractFilter);
  document.body.append(refractDefs);

  let refractKey = '';
  const updateRefractMap = () => {
    if (!settings.refract || !canRefract) return;
    const w = Math.round(bar.offsetWidth), h = Math.round(bar.offsetHeight);
    if (!w || !h) return;
    const rad = Math.min(parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 0, w / 2, h / 2);
    const key = w + 'x' + h + 'r' + rad;
    if (key === refractKey) return;                     // only redraw when the bar's shape changed
    refractKey = key;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), d = img.data;
    const edge = Math.max(8, Math.min(h * 0.6, 48));    // how far in from the rim the bending reaches
    const hw = w / 2, hh = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // distance to the rounded-rect edge and the outward normal there
        const px = x + 0.5 - hw, py = y + 0.5 - hh;
        const qx = Math.abs(px) - (hw - rad), qy = Math.abs(py) - (hh - rad);
        let dist, nx, ny;
        if (qx > 0 && qy > 0) {
          const l = Math.hypot(qx, qy) || 1;
          dist = rad - l; nx = Math.sign(px) * qx / l; ny = Math.sign(py) * qy / l;
        } else if (qx > qy) { dist = rad - qx; nx = Math.sign(px); ny = 0; }
        else { dist = rad - qy; nx = 0; ny = Math.sign(py); }
        const t = Math.max(0, 1 - Math.max(0, dist) / edge), f = Math.pow(t, 1.6);
        // rim bend (sample inward, toward the center) + a faint convex lens over the whole surface
        const lx = -px / hw * 0.12, ly = -py / hh * 0.22;
        const vx = Math.max(-1, Math.min(1, -nx * f * 0.88 + lx));
        const vy = Math.max(-1, Math.min(1, -ny * f * 0.88 + ly));
        const i = (y * w + x) * 4;
        d[i] = 128 + vx * 127;
        d[i + 1] = 128 + vy * 127;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    refractMap.setAttribute('width', w);
    refractMap.setAttribute('height', h);
    refractMap.setAttribute('href', c.toDataURL());
  };
  const applyRefraction = () => {
    const on = !!settings.refract && canRefract;
    document.documentElement.classList.toggle('am-refract', on);
    for (const [dm, k] of refractDisps) dm.setAttribute('scale', String(Math.round(settings.refractStrength * k)));
    refractBlur.setAttribute('stdDeviation', String(settings.barBlur));      // the bar blur, now done inside the filter
    if (on) updateRefractMap();
  };

  const loadSettings = () => {
    let saved = {};
    try { saved = JSON.parse(store.get('am-settings', '{}')) || {}; } catch {}
    const out = {};
    for (const s of SETTINGS) {
      const v = Number(saved[s.key]);
      out[s.key] = Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.def;
    }
    return out;
  };
  const settings = loadSettings();
  const applySettings = () => {
    for (const s of SETTINGS) {
      if (!s.css) continue;
      const [name, value] = s.css(settings[s.key]);
      document.documentElement.style.setProperty(name, String(value));
    }
    document.documentElement.classList.toggle('am-easy-track', !!settings.easyTrack);
    applyRefraction();
  };
  const saveSettings = () => store.set('am-settings', JSON.stringify(settings));
  applySettings();

  const P_TUNE = 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z';
  const P_CHEVRON = 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z';
  const P_CLOSE = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

  let setEl = null;
  const closeSettings = () => {
    if (!setEl) return;
    const s = setEl;
    setEl = null;
    s.classList.add('am-set-out');
    setTimeout(() => s.remove(), 180);
  };
  const openSettings = () => {
    if (setEl) return;
    closeMenu();
    const back = el('div', 'am-set-back', document.body);
    const p = el('div', 'am-set', back);
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'r1ytm settings');

    const head = el('div', 'am-set-head', p);
    const lg = el('div', 'am-set-logo', head);
    lg.append(ytLogo());
    const ht = el('div', 'am-set-htext', head);
    el('div', 'am-set-title', ht).textContent = 'r1ytm';
    el('div', 'am-set-sub', ht).textContent = 'Bar & menu settings';
    const x = el('button', 'am-set-x', head);
    x.title = 'Close';
    x.append(svg(P_CLOSE));
    x.addEventListener('click', closeSettings);

    const ranges = [], deps = [];
    const showDeps = () => deps.forEach(([row, dep]) => row.classList.toggle('am-set-dim', !settings[dep]));
    let section = null, lastGroup = '';
    for (const s of SETTINGS) {
      if (s.group !== lastGroup) {
        lastGroup = s.group;
        el('div', 'am-set-group', p).textContent = s.group;
        section = el('div', 'am-set-card', p);
      }
      if (s.type === 'toggle') {
        const row = el('div', 'am-set-row am-set-inline', section);
        const lt = el('div', 'am-set-ltext', row);
        el('div', 'am-set-label', lt).textContent = s.label;
        if (s.note) el('div', 'am-set-note', lt).textContent = s.note();
        const sw = el('button', 'am-set-switch', row);
        sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-label', s.label);
        const show = () => {
          sw.classList.toggle('am-on', !!settings[s.key]);
          sw.setAttribute('aria-checked', String(!!settings[s.key]));
          showDeps();
        };
        sw.addEventListener('click', () => {
          settings[s.key] = settings[s.key] ? 0 : 1;
          applySettings();
          saveSettings();
          show();
        });
        if (s.disabled && s.disabled()) { sw.disabled = true; sw.classList.add('am-set-off'); }
        show();
        ranges.push(show);
        continue;
      }
      const row = el('label', 'am-set-row', section);
      if (s.dep) deps.push([row, s.dep]);
      const top = el('div', 'am-set-rowtop', row);
      el('span', 'am-set-label', top).textContent = s.label;
      const val = el('span', 'am-set-val', top);
      const r = el('input', 'am-set-range', row);
      Object.assign(r, { type: 'range', min: s.min, max: s.max, step: s.step });
      const show = () => {
        r.value = String(settings[s.key]);
        val.textContent = settings[s.key] + s.unit;
        r.style.setProperty('--p', ((settings[s.key] - s.min) / (s.max - s.min) * 100) + '%');
      };
      r.addEventListener('input', () => {
        settings[s.key] = +r.value;
        applySettings();
        show();
        saveSettings();
      });
      show();
      ranges.push(show);
    }
    showDeps();
    // bar layout (full / compact), in the size card
    const lay = el('div', 'am-set-row am-set-inline', section);
    el('span', 'am-set-label', lay).textContent = 'Bar layout';
    const seg = el('div', 'am-set-seg', lay);
    const segBtns = [['Full', false], ['Compact', true]].map(([t, compact]) => {
      const b = el('button', 'am-set-segbtn', seg);
      b.textContent = t;
      b.addEventListener('click', () => { applyMode(compact); showSeg(); });
      return [b, compact];
    });
    const showSeg = () => segBtns.forEach(([b, c]) => b.classList.toggle('am-on', bar.classList.contains('am-compact') === c));
    showSeg();
    const lookRefresh = buildLookSettings(p);      // Font + Background groups

    const foot = el('div', 'am-set-foot', p);
    const reset = el('button', 'am-set-btn', foot);
    reset.textContent = 'Reset to defaults';
    reset.addEventListener('click', () => {
      for (const s of SETTINGS) settings[s.key] = s.def;
      applySettings();
      saveSettings();
      applyMode(false);
      ranges.forEach(f => f());
      showSeg();
      // font / background back to default; the saved font file, image and gradient stay and can be picked again
      Object.assign(look, { font: 'default', fontScope: 'all', bg: 'default', bgDim: 25, bgBlur: 0, bgPlayer: 1, dimPages: {}, blurPages: {}, hideBanner: 0, artistHead: 'banner', noArtistShade: 0 });
      applyBanner();
      applyArtist();
      saveLook();
      applyFont();
      applyBg();
      lookRefresh();
    });
    const done = el('button', 'am-set-btn am-set-primary', foot);
    done.textContent = 'Done';
    done.addEventListener('click', closeSettings);

    // close on a click on the dimmed backdrop or Escape; keys stay inside (no YTM hotkeys while adjusting)
    back.addEventListener('click', e => { if (e.target === back) closeSettings(); });
    back.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') closeSettings();
    });
    setEl = back;
    done.focus({ preventScroll: true });
  };
  window.amSettings = openSettings;      // also reachable from the console (e.g. when the sidebar is hidden)

  // the sidebar entry, after YTM's Home / Explore / Library. YTM's entries are Polymer elements we can't copy, so ours
  // is plain markup that copies the computed look of a real (inactive) entry next to it. YTM keeps more than one guide
  // (the expanded one and the collapsed / mini one, which can sit off-screen while "visible"), so every primary
  // section gets its own entry, each styled after its own neighbours.
  const makeGuideEntry = () => {
    const g = el('div', 'am-guide');
    g.setAttribute('role', 'link');
    g.tabIndex = 0;
    g.title = 'r1ytm settings';
    const item = el('div', 'am-guide-item', g);
    const icon = el('span', 'am-guide-icon', item);
    icon.append(svg(P_TUNE));
    const col = el('div', 'am-guide-col', item);
    const ttl = el('span', 'am-guide-title', col);
    ttl.textContent = 'r1ytm';
    g.addEventListener('click', e => { e.stopPropagation(); openSettings(); });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); } });
    return { g, item, icon, col, ttl };
  };
  const guideEntries = new Map();      // a guide section's #items -> our entry in it

  const copyCss = (from, to, props) => {
    if (!from) return;
    const cs = getComputedStyle(from);
    for (const pr of props) to.style.setProperty(pr, cs.getPropertyValue(pr));
  };
  const BOX = ['display', 'flex-direction', 'align-items', 'justify-content', 'box-sizing', 'width', 'height', 'min-height',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border-radius', 'column-gap', 'row-gap', 'flex-shrink'];
  const TEXT = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align',
    'white-space', 'overflow', 'text-overflow', 'display', 'margin-top', 'margin-left', 'max-width'];
  const syncGuideEntry = () => {
    for (const [items, e] of guideEntries) if (!items.isConnected) { e.g.remove(); guideEntries.delete(items); }
    for (const items of document.querySelectorAll('ytmusic-guide-section-renderer[is-primary] #items')) {
      const ref = items.querySelector('ytmusic-guide-entry-renderer:not([active])') ||
        items.querySelector('ytmusic-guide-entry-renderer');
      if (!ref) continue;
      let e = guideEntries.get(items);
      if (!e) { e = makeGuideEntry(); guideEntries.set(items, e); }
      if (e.g.parentNode !== items || e.g.nextElementSibling) items.append(e.g);   // keep it last
      // a hidden guide has nothing to copy (display: none all the way down); it is restyled once it shows
      if (!shown(ref)) continue;
      // collapsed sidebar: YTM stacks icon over label; its own layout doesn't carry over by copying, so ours is done in
      // CSS (.am-collapsed) and only sizes, font, colors and the icon-to-label gap are copied
      const collapsed = ref.hasAttribute('is-collapsed') || !!items.closest('[is-collapsed]');
      e.g.classList.toggle('am-collapsed', collapsed);
      for (const n of [e.g, e.item, e.icon, e.col, e.ttl]) n.style.cssText = '';     // nothing stale from the other mode
      const rItem = ref.querySelector('tp-yt-paper-item'), rIcon = ref.querySelector('yt-icon'), rTitle = ref.querySelector('.title');
      copyCss(ref, e.g, ['display', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-left', 'padding-right']);
      copyCss(rIcon, e.icon, ['width', 'height', 'color', 'flex-shrink'].concat(collapsed ? [] : ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']));
      if (collapsed) {
        copyCss(rItem, e.item, ['box-sizing', 'width', 'height', 'min-height', 'border-radius', 'padding-top', 'padding-bottom',
          'margin-top', 'margin-right', 'margin-bottom', 'margin-left']);
        copyCss(rTitle, e.ttl, ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color']);
        if (rIcon && rTitle) {
          const gap = rTitle.getBoundingClientRect().top - rIcon.getBoundingClientRect().bottom;
          e.item.style.rowGap = Math.max(0, Math.round(gap)) + 'px';
        }
      } else {
        copyCss(rItem, e.item, BOX);
        copyCss(ref.querySelector('.title-column'), e.col, BOX.filter(pr => !/^(width|height|min-height)$/.test(pr)));
        copyCss(rTitle, e.ttl, TEXT);
      }
    }
  };

  const setStyle = el('style', null, document.head);
  setStyle.textContent = `
    .am-guide { cursor: pointer; outline: none; }
    .am-guide-item { cursor: pointer; transition: background .15s; }
    .am-guide:hover .am-guide-item, .am-guide:focus-visible .am-guide-item { background: rgb(255 255 255 / .1); }
    .am-guide-icon { display: grid; place-items: center; }
    .am-guide-icon svg { width: 100%; height: 100%; fill: currentColor; }
    /* collapsed sidebar: icon centered above a small centered label, like YTM's own collapsed entries */
    .am-guide.am-collapsed .am-guide-item { display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding-left: 0; padding-right: 0; }
    .am-guide.am-collapsed .am-guide-icon { margin: 0; }
    .am-guide.am-collapsed .am-guide-col { display: block; width: 100%; margin: 0; padding: 0; text-align: center; }
    .am-guide.am-collapsed .am-guide-title { display: block; margin: 0; text-align: center;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .am-set-back { position: fixed; inset: 0; z-index: 100002; display: grid; place-items: center; padding: 16px;
      background: rgb(0 0 0 / .35); animation: am-set-fade .2s ease; }
    .am-set-back.am-set-out { opacity: 0; transition: opacity .16s ease; pointer-events: none; }
    .am-set { width: min(400px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box;
      padding: 18px; border-radius: 22px; color: #fff; scrollbar-width: none;
      font-family: var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif);
      background: rgb(30 30 32 / .78);
      backdrop-filter: blur(40px) saturate(190%); -webkit-backdrop-filter: blur(40px) saturate(190%);
      border: 1px solid rgb(255 255 255 / .12);
      box-shadow: 0 24px 70px rgb(0 0 0 / .5), inset 0 1px 0 rgb(255 255 255 / .07);
      animation: am-menu-in .24s cubic-bezier(.2, .9, .25, 1.05); }
    .am-set-out .am-set { scale: .97; transition: scale .16s ease; }
    @keyframes am-set-fade { from { opacity: 0; } }

    .am-set-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .am-set-logo svg { width: 34px; height: 34px; display: block; }
    .am-set-logo .am-logo-bg { fill: rgb(255 255 255 / .9); }
    .am-set-logo .am-logo-ring { stroke: rgb(20 20 20 / .85); }
    .am-set-logo .am-logo-tri { fill: rgb(20 20 20 / .85); }
    .am-set-htext { flex: 1; min-width: 0; }
    .am-set-title { font-size: 17px; font-weight: 700; }
    .am-set-sub { font-size: 12.5px; color: rgb(255 255 255 / .55); margin-top: 1px; }
    .am-set-x { all: unset; cursor: pointer; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px;
      transition: background .15s; }
    .am-set-x:hover, .am-set-x:focus-visible { background: rgb(255 255 255 / .1); }
    .am-set-x svg { width: 20px; height: 20px; fill: rgb(255 255 255 / .75); }

    .am-set-group { font-size: 11.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
      color: rgb(255 255 255 / .45); margin: 14px 6px 7px; }
    .am-set-card { border-radius: 14px; background: rgb(255 255 255 / .06); padding: 4px 14px; }
    .am-set-row { display: block; padding: 11px 0; cursor: default; }
    .am-set-row + .am-set-row { border-top: 1px solid rgb(255 255 255 / .07); }
    .am-set-rowtop { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 9px; }
    .am-set-label { font-size: 13.5px; }
    .am-set-val { font-size: 12.5px; color: rgb(255 255 255 / .55); font-variant-numeric: tabular-nums; }

    .am-set-range { -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 4px; margin: 0;
      border-radius: 2px; cursor: pointer; outline: none;
      background: linear-gradient(to right, rgb(255 255 255 / .85) var(--p, 50%), rgb(255 255 255 / .15) var(--p, 50%)); }
    .am-set-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 4px rgb(0 0 0 / .4); transition: scale .12s; }
    .am-set-range::-moz-range-thumb { width: 16px; height: 16px; border: none; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 4px rgb(0 0 0 / .4); }
    .am-set-range::-moz-range-track { background: transparent; }
    .am-set-range:hover::-webkit-slider-thumb, .am-set-range:focus-visible::-webkit-slider-thumb { scale: 1.15; }
    .am-set-range:focus-visible { box-shadow: 0 0 0 3px rgb(255 255 255 / .15); }

    .am-set-inline { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .am-set-ltext { min-width: 0; }
    .am-set-note { font-size: 11.5px; color: rgb(255 255 255 / .45); margin-top: 2px; }
    .am-set-dim { opacity: .4; pointer-events: none; transition: opacity .2s; }
    .am-set-switch { all: unset; position: relative; flex-shrink: 0; cursor: pointer; width: 40px; height: 24px; border-radius: 12px;
      background: rgb(255 255 255 / .18); transition: background .2s; }
    .am-set-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / .4); transition: translate .22s cubic-bezier(.2, .8, .2, 1); }
    .am-set-switch.am-on { background: #fa586a; }
    .am-set-switch.am-on::after { translate: 16px 0; }
    .am-set-switch:focus-visible { box-shadow: 0 0 0 3px rgb(255 255 255 / .2); }
    .am-set-switch.am-set-off { opacity: .4; cursor: default; }
    .am-set-seg { display: flex; padding: 3px; border-radius: 10px; background: rgb(0 0 0 / .25); }
    .am-set-segbtn { all: unset; cursor: pointer; padding: 5px 12px; border-radius: 8px; font-size: 12.5px;
      color: rgb(255 255 255 / .7); transition: background .15s, color .15s; }
    .am-set-segbtn:hover { color: #fff; }
    .am-set-segbtn.am-on { background: rgb(255 255 255 / .16); color: #fff; }
    .am-set-segbtn:focus-visible { box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / .4); }

    .am-set-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 16px; }
    .am-set-btn { all: unset; cursor: pointer; padding: 8px 14px; border-radius: 10px; font-size: 13px;
      color: rgb(255 255 255 / .7); transition: background .15s, color .15s; }
    .am-set-btn:hover, .am-set-btn:focus-visible { background: rgb(255 255 255 / .1); color: #fff; }
    .am-set-primary { background: #fff; color: #111; font-weight: 600; padding: 8px 20px; }
    .am-set-primary:hover, .am-set-primary:focus-visible { background: rgb(255 255 255 / .85); color: #111; }

    @media (prefers-reduced-motion: reduce) { .am-set-back, .am-set { animation: none; } }
  `;

  /* ---------- look: custom font + custom background (settings "Font" / "Background", gradient maker) ---------- */
  // Small values live in localStorage ("am-look"). Files (font, image, gradient) are too big for it (about 5 MB in
  // total), so they go to IndexedDB, the browser's on-device database for this site.
  const idb = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('r1ytm', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error); };
    }));
    const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
      const t = db.transaction('files', mode);
      const q = fn(t.objectStore('files'));
      t.oncomplete = () => res(q.result);
      t.onerror = t.onabort = () => rej(t.error);
    }));
    return {
      get: k => run('readonly', s => s.get(k)),
      set: (k, v) => run('readwrite', s => s.put(v, k)),
    };
  })();

  const LOOK_DEF = { font: 'default', fontName: '', fontFile: '', fontScope: 'all',
    bg: 'default', bgColor: '#1d1430', bgDim: 25, bgBlur: 0, bgPlayer: 1, bgImageName: '', grad: null,
    dimPages: {}, blurPages: {}, hideBanner: 0, artistHead: 'banner', noArtistShade: 0 };
  const look = (() => {
    let s = {};
    try { s = JSON.parse(store.get('am-look', '{}')) || {}; } catch {}
    return Object.assign({}, LOOK_DEF, s);
  })();
  const saveLook = () => store.set('am-look', JSON.stringify(look));
  const html = document.documentElement;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* font */
  const BASE_FONT = '"Switzer", "SF Pro", system-ui, sans-serif';
  const FILE_FONT = 'r1ytm file font';
  const GOOGLE_FONTS = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Manrope', 'DM Sans', 'Outfit', 'Plus Jakarta Sans',
    'Figtree', 'Urbanist', 'Sora', 'Lexend', 'Space Grotesk', 'Bricolage Grotesque', 'Rubik', 'Nunito', 'Quicksand',
    'Work Sans', 'Lato', 'Open Sans', 'Raleway', 'Josefin Sans', 'Syne', 'Unbounded', 'Oswald', 'Bebas Neue',
    'Playfair Display', 'Fraunces', 'Lora', 'Merriweather', 'JetBrains Mono', 'Space Mono', 'Comfortaa', 'Pacifico', 'Caveat'];
  const googleStyle = el('style');
  let fileFace = null, fontRun = 0;
  const cleanName = s => s.trim().replace(/["\\;{}]/g, '');
  // installed? Text measured in the font vs. the plain fallback: no difference for every fallback = not installed
  const fontCtx = document.createElement('canvas').getContext('2d');
  const fontInstalled = name => ['monospace', 'serif', 'sans-serif'].some(base => {
    const t = 'mmmmmmmmmlli1WQ@#&';
    fontCtx.font = `72px ${base}`;
    const w = fontCtx.measureText(t).width;
    fontCtx.font = `72px "${name}", ${base}`;
    return fontCtx.measureText(t).width !== w;
  });
  // Google Fonts: the CSS is fetched (not linked) so a wrong name can be reported. Static fonts reject weights they
  // don't have, so fewer weights are tried after a failure.
  const loadGoogle = async fam => {
    const f = encodeURIComponent(fam).replace(/%20/g, '+');
    for (const w of [':wght@300;400;500;600;700', ':wght@400;700', '']) {
      const r = await fetch(`https://fonts.googleapis.com/css2?family=${f}${w}&display=swap`);
      if (r.ok) return r.text();
    }
    return null;
  };
  // returns a short status line for the settings panel
  const applyFont = async () => {
    const run = ++fontRun;
    let fam = '', msg = '';
    if (look.font === 'device' && look.fontName) {
      fam = `"${look.fontName}"`;
      if (!fontInstalled(look.fontName)) msg = 'Not found on this device';
    } else if (look.font === 'google' && look.fontName) {
      try {
        const css = await loadGoogle(look.fontName);
        if (run !== fontRun) return '';
        if (css) { googleStyle.textContent = css; document.head.append(googleStyle); fam = `"${look.fontName}"`; msg = 'Loaded from Google Fonts'; }
        else msg = 'Not found on Google Fonts (check the spelling)';
      } catch { msg = 'Could not reach Google Fonts'; }
    } else if (look.font === 'file' && look.fontFile) {
      try {
        if (!fileFace) {
          const buf = await idb.get('font');
          if (buf) { fileFace = new FontFace(FILE_FONT, buf); await fileFace.load(); document.fonts.add(fileFace); }
        }
        if (fileFace) fam = `"${FILE_FONT}"`;
        else msg = 'The saved font file is gone, choose it again';
      } catch { msg = 'Could not load the saved font file'; }
    }
    if (run !== fontRun) return '';
    if (look.font !== 'google') googleStyle.remove();
    html.style.setProperty('--am-font', fam ? `${fam}, ${BASE_FONT}` : BASE_FONT);
    html.classList.toggle('am-font-all', !!fam && look.fontScope === 'all');
    return msg;
  };

  /* background: a fixed layer behind the page; YTM's own dark page backgrounds are made transparent */
  const bgLayer = el('div', 'am-bg', document.body);
  const bgImg = el('div', 'am-bg-img', bgLayer);
  let bgUrl = null, bgRun = 0;
  const cleared = new Set();
  // which kind of page is showing (from the address; the player page wins while it is open)
  const PAGES = [['home', 'Home'], ['explore', 'Explore'], ['library', 'Library'], ['album', 'Albums'],
    ['playlist', 'Playlists'], ['artist', 'Artists'], ['search', 'Search'], ['player', 'Player page']];
  const pageKey = () => {
    if (stateOpen()) return 'player';
    const p = location.pathname;
    if (p === '/' || p === '/home') return 'home';
    if (p.startsWith('/explore') || /FEmusic_(explore|moods|new_releases|charts)/.test(p)) return 'explore';
    if (p.startsWith('/library') || /FEmusic_(library|liked)/.test(p)) return 'library';
    if (/^\/browse\/MPRE/.test(p)) return 'album';
    if (p.startsWith('/playlist') || /^\/browse\/VL/.test(p)) return 'playlist';
    // artist pages: /channel/UC…, /browse/UC… or a handle like /@dojacat
    if (p.startsWith('/channel/') || p.startsWith('/@') || /^\/browse\/UC/.test(p)) return 'artist';
    if (p.startsWith('/search')) return 'search';
    return 'other';
  };
  let curPage = pageKey();
  // a page's own dim, or the main Dim when that page has none
  const dimFor = k => { const v = (look.dimPages || {})[k]; return Number.isFinite(v) ? v : look.bgDim; };
  const blurFor = k => { const v = (look.blurPages || {})[k]; return Number.isFinite(v) ? v : look.bgBlur; };
  const applyBanner = () => html.classList.toggle('am-hide-banner', !!look.hideBanner);
  const applyBgVars = () => {
    html.style.setProperty('--am-bg-dim', String(look.bg === 'color' ? 0 : dimFor(curPage) / 100));
    html.style.setProperty('--am-bg-blur', (look.bg === 'color' ? 0 : blurFor(curPage)) + 'px');
  };
  const restoreCleared = () => {
    for (const n of cleared) { n.style.removeProperty('background-color'); n.style.removeProperty('box-shadow'); }
    cleared.clear();
  };
  const darkOpaque = c => {
    const n = /^rgba?\(/.test(c) && c.match(/[\d.]+/g);
    if (!n || n.length < 3) return false;
    const a = n.length > 3 ? +n[3] : 1;
    return a > 0.05 && (+n[0] + +n[1] + +n[2]) / 3 < 48;
  };
  /* artist pages: the header can show the banner, a round profile picture above the name, both or neither,
     and its dark shadow can go */
  const artistHeader = () => document.querySelector('ytmusic-browse-response ytmusic-immersive-header-renderer, ' +
    'ytmusic-browse-response ytmusic-visual-header-renderer');
  // the artist's picture: from YTM's own data for the header, else from the banner image; asked square from Google's server
  const artistPicture = h => {
    let u = '';
    try {
      const d = h.data || (h.__data && h.__data.data) || {};
      const th = (((d.thumbnail || {}).musicThumbnailRenderer || {}).thumbnail || {}).thumbnails || [];
      if (th.length) u = th[th.length - 1].url;
    } catch {}
    if (!u) { const i = [...h.querySelectorAll('img')].find(i => /^https?:/.test(i.src)); if (i) u = i.src; }
    return u && u.replace(/=w\d+-h\d+[^/]*$/, '=w544-h544-p-l90-rj');
  };
  let pfpEl = null;
  const shaded = new Set();
  const clearShade = () => {
    for (const n of shaded) { n.classList.remove('am-noshade'); n.style.removeProperty('background-color'); }
    shaded.clear();
  };
  const syncArtist = () => {
    const onArtist = curPage === 'artist';
    const h = onArtist && artistHeader();
    // profile picture above the name
    const wantPic = h && (look.artistHead === 'picture' || look.artistHead === 'both');
    const titleEl = wantPic && (h.querySelector('h1') || h.querySelector('.title'));
    const src = titleEl && artistPicture(h);
    if (src) {
      if (!pfpEl) { pfpEl = el('img', 'am-artist-pfp'); pfpEl.alt = ''; }
      if (pfpEl.getAttribute('src') !== src) pfpEl.src = src;
      if (pfpEl.nextElementSibling !== titleEl) titleEl.before(pfpEl);
    } else if (pfpEl) { pfpEl.remove(); pfpEl = null; }
    // shadow: gradients and dark see-through fills on the header's big parts (not its buttons)
    if (!h || !look.noArtistShade) { if (shaded.size) clearShade(); return; }
    for (const n of [h, ...h.querySelectorAll('*')]) {
      if (shaded.has(n) || n === pfpEl || n.closest('button, a, yt-button-shape, yt-button-renderer, ytmusic-subscribe-button-renderer, svg')) continue;
      if (n.getBoundingClientRect().width < 300) continue;
      let hit = false;
      for (const ps of [null, '::before', '::after']) {
        const bi = getComputedStyle(n, ps).backgroundImage;
        if (/gradient\(/.test(bi) && !/url\(/.test(bi)) hit = true;
      }
      if (darkOpaque(getComputedStyle(n).backgroundColor)) { n.style.setProperty('background-color', 'transparent', 'important'); hit = true; }
      if (hit) { n.classList.add('am-noshade'); shaded.add(n); }
    }
  };
  const applyArtist = () => {
    html.classList.toggle('am-artist-nobanner', look.artistHead === 'picture' || look.artistHead === 'none');
    html.classList.toggle('am-artist-noshade', !!look.noArtistShade);
    clearShade();
    syncArtist();
  };
  // Every second: anything big with a dark fill or a shadow under a grid of points (page, sidebar, player page) goes transparent.
  // Measured instead of a fixed selector list because YTM's layouts differ between accounts.
  const sweepBg = () => {
    if (look.bg === 'default') return;
    const seen = new Set();
    for (const fx of [0.02, 0.3, 0.6, 0.98]) for (const fy of [0.04, 0.5, 0.92]) {
      for (const n of document.elementsFromPoint(innerWidth * fx, innerHeight * fy)) {
        if (seen.has(n) || n === html || n === document.body) continue;
        seen.add(n);
        if (cleared.has(n)) continue;
        if (n.closest('.am-bar, .am-menu, .am-set-back, .am-gm, .am-bg, ytmusic-player, tp-yt-iron-dropdown, tp-yt-paper-dialog')) continue;
        if (!look.bgPlayer && n.closest('ytmusic-player-page')) continue;
        const r = n.getBoundingClientRect();
        if (!(r.height >= innerHeight * 0.5 || (r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.25))) continue;
        const cs = getComputedStyle(n);
        let hit = false;
        // dark fills, solid or see-through (YTM tints its sections with translucent black)
        if (cs.backgroundImage === 'none' && darkOpaque(cs.backgroundColor)) {
          n.style.setProperty('background-color', 'transparent', 'important');
          hit = true;
        }
        // section shadows darken the picture around and behind them
        if (cs.boxShadow !== 'none') {
          n.style.setProperty('box-shadow', 'none', 'important');
          hit = true;
        }
        if (hit) cleared.add(n);
      }
    }
  };
  // amBgProbe(): then click a dark spot. Lists everything under that point that paints something: background,
  // shadow, filter, opacity, and the ::before / ::after layers (which the sweep can't see)
  window.amBgProbe = () => {
    console.log('[am-bar] bg probe: now click a dark spot');
    addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const name = n => n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
        (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
      const paints = cs => cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
        cs.filter !== 'none' || cs.backdropFilter && cs.backdropFilter !== 'none' || cs.opacity !== '1';
      const rows = [];
      for (const n of document.elementsFromPoint(e.clientX, e.clientY)) {
        const r = n.getBoundingClientRect();
        for (const pseudo of ['', '::before', '::after']) {
          const cs = getComputedStyle(n, pseudo || null);
          if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
          if (!paints(cs)) continue;
          rows.push({ el: name(n) + pseudo, size: Math.round(r.width) + 'x' + Math.round(r.height),
            bg: cs.backgroundColor, image: cs.backgroundImage.slice(0, 90), shadow: cs.boxShadow.slice(0, 60),
            filter: cs.filter, backdrop: cs.backdropFilter || '', opacity: cs.opacity, cleared: cleared.has(n) });
        }
      }
      console.table(rows);
    }, { capture: true, once: true });
  };
  const applyBg = async () => {
    const run = ++bgRun;
    let blob = null;
    if (look.bg === 'image' || look.bg === 'gradient') {
      try { blob = await idb.get(look.bg === 'image' ? 'bg-image' : 'bg-gradient'); } catch {}
      if (run !== bgRun) return;
    }
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    bgUrl = blob ? URL.createObjectURL(blob) : null;
    bgImg.style.backgroundImage = bgUrl ? `url("${bgUrl}")` : 'none';
    bgLayer.style.backgroundColor = look.bg === 'color' ? look.bgColor : '#000';
    applyBgVars();
    html.classList.toggle('am-bg-on', look.bg !== 'default');
    restoreCleared();
    sweepBg();
  };

  /* settings controls (shared by the settings panel and the gradient maker) */
  const ui = {
    row: (parent, cls) => el('div', 'am-set-row' + (cls ? ' ' + cls : ''), parent),
    range(parent, label, min, max, step, unit, get, set, fmt) {
      const row = el('label', 'am-set-row', parent);
      const top = el('div', 'am-set-rowtop', row);
      el('span', 'am-set-label', top).textContent = label;
      const val = el('span', 'am-set-val', top);
      const r = el('input', 'am-set-range', row);
      Object.assign(r, { type: 'range', min, max, step });
      const show = () => {
        const v = get();
        r.value = String(v);
        val.textContent = fmt ? fmt(v) : v + unit;
        r.style.setProperty('--p', ((v - min) / (max - min) * 100) + '%');
      };
      r.addEventListener('input', () => { set(+r.value); show(); });
      show();
      return row;
    },
    seg(parent, opts, get, set, cls) {
      const seg = el('div', 'am-set-seg' + (cls ? ' ' + cls : ''), parent);
      const bs = opts.map(([t, v]) => {
        const b = el('button', 'am-set-segbtn', seg);
        b.textContent = t;
        b.addEventListener('click', () => { set(v); show(); });
        return [b, v];
      });
      const show = () => bs.forEach(([b, v]) => b.classList.toggle('am-on', get() === v));
      show();
      return show;
    },
    toggle(parent, label, get, set) {
      const row = el('div', 'am-set-row am-set-inline', parent);
      el('div', 'am-set-label', row).textContent = label;
      const sw = el('button', 'am-set-switch', row);
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-label', label);
      const show = () => { sw.classList.toggle('am-on', !!get()); sw.setAttribute('aria-checked', String(!!get())); };
      sw.addEventListener('click', () => { set(get() ? 0 : 1); show(); });
      show();
      return row;
    },
    button(parent, text, fn, cls) {
      const b = el('button', 'am-set-btn am-set-soft' + (cls ? ' ' + cls : ''), parent);
      b.textContent = text;
      b.addEventListener('click', fn);
      return b;
    },
    color(parent, value, onInput, onChange) {
      const c = el('input', 'am-set-color', parent);
      c.type = 'color';
      c.value = value;
      c.addEventListener('input', () => onInput(c.value));
      if (onChange) c.addEventListener('change', () => onChange(c.value));
      return c;
    },
    file(accept, fn) {      // must run inside a click: browsers only open the file picker on a user action
      const i = el('input');
      i.type = 'file';
      i.accept = accept;
      i.addEventListener('change', () => { if (i.files && i.files[0]) fn(i.files[0]); });
      i.click();
    },
  };

  // the "Font" and "Background" groups of the settings panel; returns a function that redraws them (after a reset)
  const buildLookSettings = p => {
    /* font */
    el('div', 'am-set-group', p).textContent = 'Font';
    const fCard = el('div', 'am-set-card', p);
    let fNote = null;
    const runFont = async () => { const m = await applyFont(); if (fNote) fNote.textContent = m; };
    const pickFont = () => ui.file('.ttf,.otf,.woff,.woff2', async f => {
      try {
        const buf = await f.arrayBuffer();
        await new FontFace(FILE_FONT, buf).load();          // throws if it isn't a usable font
        await idb.set('font', buf);
        if (fileFace) document.fonts.delete(fileFace);
        fileFace = null;
        Object.assign(look, { font: 'file', fontFile: f.name });
        saveLook();
        fSeg();
        renderFont();
      } catch { if (fNote) fNote.textContent = 'Could not read that font file'; }
    });
    const fSeg = ui.seg(ui.row(fCard), [['Default', 'default'], ['Device', 'device'], ['Google', 'google'], ['File', 'file']],
      () => look.font, v => {
        if (v === 'file' && !look.fontFile) { pickFont(); return; }
        if (v !== look.font && (v === 'google' || look.font === 'google')) look.fontName = '';
        look.font = v;
        saveLook();
        renderFont();
      }, 'am-set-wide');
    const fBody = el('div', 'am-set-sub', fCard);
    const renderFont = () => {
      fBody.replaceChildren();
      fNote = null;
      if (look.font !== 'default') {
        const row = ui.row(fBody);
        const line = el('div', 'am-set-field', row);
        if (look.font === 'file') {
          el('span', 'am-set-label am-set-grow', line).textContent = look.fontFile;
          ui.button(line, 'Change', pickFont);
        } else {
          const inp = el('input', 'am-set-input', line);
          Object.assign(inp, { type: 'text', spellcheck: false, value: look.fontName,
            placeholder: look.font === 'google' ? 'Family, e.g. Inter' : 'Installed font, e.g. Helvetica' });
          const dl = el('datalist', null, row);
          dl.id = 'am-font-list';
          inp.setAttribute('list', dl.id);
          if (look.font === 'google') for (const f of GOOGLE_FONTS) el('option', null, dl).value = f;
          const commit = () => { const v = cleanName(inp.value); if (v === look.fontName) return; look.fontName = v; saveLook(); runFont(); };
          inp.addEventListener('change', commit);              // Enter or leaving the field
          inp.addEventListener('input', e => { if (!e.inputType || e.inputType === 'insertReplacementText') commit(); });   // picked from the list
          if (look.font === 'google') {
            const a = el('a', 'am-set-btn am-set-soft', line);
            Object.assign(a, { textContent: 'Browse', href: 'https://fonts.google.com/', target: '_blank', rel: 'noopener' });
          } else if (window.queryLocalFonts) {      // Chrome / Edge: list the installed fonts (asks for permission)
            ui.button(line, 'Browse', async () => {
              try {
                const fams = [...new Set((await window.queryLocalFonts()).map(f => f.family))].sort();
                dl.replaceChildren(...fams.map(f => { const o = el('option'); o.value = f; return o; }));
                fNote.textContent = fams.length + ' fonts found: type to pick one';
                inp.focus();
              } catch { fNote.textContent = 'The browser did not give access to your fonts'; }
            });
          }
        }
        fNote = el('div', 'am-set-note', row);
        const sc = ui.row(fBody, 'am-set-inline');
        el('span', 'am-set-label', sc).textContent = 'Use for';
        ui.seg(sc, [['All of YT Music', 'all'], ['r1ytm only', 'bar']], () => look.fontScope,
          v => { look.fontScope = v; saveLook(); runFont(); });
      }
      runFont();
    };
    renderFont();

    /* background */
    el('div', 'am-set-group', p).textContent = 'Background';
    const bCard = el('div', 'am-set-card', p);
    let bNote = null;
    const pickImage = () => ui.file('image/*', async f => {
      try {
        await idb.set('bg-image', f);
        Object.assign(look, { bg: 'image', bgImageName: f.name });
        saveLook();
        await applyBg();
        bSeg();
        renderBg();
      } catch { if (bNote) bNote.textContent = 'Could not save that image'; }
    });
    const afterGradient = () => { bSeg(); renderBg(); };
    const bSeg = ui.seg(ui.row(bCard), [['Default', 'default'], ['Color', 'color'], ['Image', 'image'], ['Gradient', 'gradient']],
      () => look.bg, v => {
        if (v === 'image' && !look.bgImageName) { pickImage(); return; }
        if (v === 'gradient' && !look.grad) { openGradientMaker(afterGradient); return; }
        look.bg = v;
        saveLook();
        applyBg();
        renderBg();
      }, 'am-set-wide');
    const bBody = el('div', 'am-set-sub', bCard);
    let perPageOpen = false, renderPerPage = () => {};
    const renderBg = () => {
      bBody.replaceChildren();
      bNote = null;
      if (look.bg === 'color') {
        const row = ui.row(bBody, 'am-set-inline');
        el('span', 'am-set-label', row).textContent = 'Color';
        ui.color(row, look.bgColor, v => { look.bgColor = v; bgLayer.style.backgroundColor = v; }, saveLook);
      } else {
        const row = ui.row(bBody);
        const line = el('div', 'am-set-field', row);
        if (look.bg === 'image') {
          el('span', 'am-set-label am-set-grow', line).textContent = look.bgImageName;
          ui.button(line, 'Change', pickImage);
        } else {
          el('span', 'am-set-label am-set-grow', line).textContent = 'Your gradient';
          ui.button(line, 'Edit', () => openGradientMaker(afterGradient));
        }
        bNote = el('div', 'am-set-note', row);
        if (look.bg === 'image' && /\.(gif|webp)$/i.test(look.bgImageName)) bNote.textContent = 'Animated images use more battery, more so with blur';
        ui.range(bBody, 'Dim', 0, 100, 1, '%', () => look.bgDim, v => { look.bgDim = v; applyBgVars(); saveLook(); renderPerPage(); });
        ui.range(bBody, 'Blur', 0, 40, 1, 'px', () => look.bgBlur, v => { look.bgBlur = v; applyBgVars(); saveLook(); renderPerPage(); });
        // dim and blur per kind of page, folded away by default
        const dRow = ui.row(bBody);
        const dHead = el('button', 'am-set-disclose', dRow);
        el('span', 'am-set-label', dHead).textContent = 'Dim and blur per page';
        dHead.append(svg(P_CHEVRON));
        const dBox = el('div', 'am-set-perpage', dRow);
        const showOpen = () => { dHead.setAttribute('aria-expanded', String(perPageOpen)); dBox.hidden = !perPageOpen; };
        dHead.addEventListener('click', () => { perPageOpen = !perPageOpen; showOpen(); });
        renderPerPage = () => {
          dBox.replaceChildren();
          el('div', 'am-set-note', dBox).textContent = 'Pages you leave alone use the main Dim and Blur.';
          for (const [k, label] of PAGES) {
            el('div', 'am-set-pagehead', dBox).textContent = label + (k === curPage ? ' (this page)' : '');
            ui.range(dBox, 'Dim', 0, 100, 1, '%', () => dimFor(k), v => {
              look.dimPages = Object.assign({}, look.dimPages, { [k]: v });
              if (k === curPage) applyBgVars();
              saveLook();
            }, v => (k in (look.dimPages || {}) ? '' : 'main · ') + v + '%');
            ui.range(dBox, 'Blur', 0, 40, 1, 'px', () => blurFor(k), v => {
              look.blurPages = Object.assign({}, look.blurPages, { [k]: v });
              if (k === curPage) applyBgVars();
              saveLook();
            }, v => (k in (look.blurPages || {}) ? '' : 'main · ') + v + 'px');
          }
          ui.button(el('div', 'am-set-row', dBox), 'Use the main Dim and Blur everywhere', () => {
            look.dimPages = {};
            look.blurPages = {};
            applyBgVars();
            saveLook();
            renderPerPage();
          });
        };
        renderPerPage();
        showOpen();
      }
      if (look.bg !== 'default') {
        ui.toggle(bBody, 'Behind the player page', () => look.bgPlayer, v => { look.bgPlayer = v; saveLook(); applyBg(); });
      }
      // works with any background, also YTM's own
      ui.toggle(bBody, 'Hide page banners', () => look.hideBanner, v => { look.hideBanner = v; saveLook(); applyBanner(); });
      // artist pages have their own header settings
      el('div', 'am-set-pagehead am-set-pagehead-card', bBody).textContent = 'Artist pages';
      const aRow = ui.row(bBody);
      el('div', 'am-set-label am-set-rowlabel', aRow).textContent = 'Header';
      ui.seg(aRow, [['Banner', 'banner'], ['Picture', 'picture'], ['Both', 'both'], ['None', 'none']], () => look.artistHead,
        v => { look.artistHead = v; saveLook(); applyArtist(); }, 'am-set-wide');
      ui.toggle(bBody, 'Remove header shadow', () => look.noArtistShade, v => { look.noArtistShade = v; saveLook(); applyArtist(); });
    };
    renderBg();
    return () => { fSeg(); renderFont(); bSeg(); renderBg(); };
  };

  /* ---------- gradient maker ---------- */
  // Paint light with soft brushes on a small canvas; effects run on top. "Apply" renders it once at screen size and
  // saves it as one WebP image, so the background is a plain picture afterwards (no live rendering, no battery cost).
  const GM_COLORS = ['#ff2d55', '#ff5e3a', '#ff9500', '#ffcc00', '#a8ff3e', '#34c759', '#00c7be',
    '#30b0ff', '#007aff', '#5856d6', '#af52de', '#ff6ec7', '#ffffff', '#101014'];
  const GRAD_DEF = { base: '#0b0a14', mix: 55, sat: 120, bri: 100, hue: 0, bloom: 25, grain: 10, vig: 25, glass: 'none', glassSize: 40 };
  const gmTmps = [];
  const gmTmp = (i, w, h) => {
    const c = gmTmps[i] || (gmTmps[i] = document.createElement('canvas'));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return c;
  };
  let gmNoise = null;
  const noiseTile = () => {
    if (gmNoise) return gmNoise;
    gmNoise = document.createElement('canvas');
    gmNoise.width = gmNoise.height = 256;
    const x = gmNoise.getContext('2d'), d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.random() * 255; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    return gmNoise;
  };
  // light / shade of one glass element (a rib or a tile), repeated as a pattern
  const shadePattern = (ctx, w, h, diag) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const g = diag ? x.createLinearGradient(0, 0, w, h) : x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,.16)');
    g.addColorStop(0.18, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.22)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    return ctx.createPattern(c, 'repeat');
  };
  // paint layer -> finished picture, w x h, on ctx. Same steps for the live preview and the saved image.
  const gmRender = (ctx, w, h, paint, g) => {
    // 1. mix: base color + strokes, blurred. Blurred light has no fine detail, so it is done at a lower resolution.
    const q = g.mix < 15 ? 1 : g.mix < 35 ? 2 : 4;
    const sw = Math.max(2, Math.round(w / q)), sh = Math.max(2, Math.round(h / q));
    const A = gmTmp(0, sw, sh), a = A.getContext('2d');
    a.filter = 'none';
    a.fillStyle = g.base;
    a.fillRect(0, 0, sw, sh);
    const blur = g.mix / 100 * sw * 0.12;
    if (blur > 0.3) a.filter = `blur(${blur.toFixed(2)}px)`;
    a.drawImage(paint, 0, 0, sw, sh);
    a.filter = 'none';
    // 2. color, scaled up to full size; 3. bloom: a wider, brighter blur of the same light, screened on top
    const B = gmTmp(1, w, h), b = B.getContext('2d');
    b.globalCompositeOperation = 'source-over';
    b.globalAlpha = 1;
    b.imageSmoothingQuality = 'high';
    b.filter = `saturate(${g.sat}%) brightness(${g.bri}%) hue-rotate(${g.hue}deg)`;
    b.drawImage(A, 0, 0, w, h);
    if (g.bloom > 0) {
      const C = gmTmp(2, sw, sh), c = C.getContext('2d');
      c.clearRect(0, 0, sw, sh);
      c.filter = `blur(${(sw * 0.05).toFixed(2)}px) brightness(150%)`;
      c.drawImage(A, 0, 0);
      c.filter = 'none';
      b.globalCompositeOperation = 'screen';
      b.globalAlpha = g.bloom / 100;
      b.drawImage(C, 0, 0, w, h);
      b.globalCompositeOperation = 'source-over';
      b.globalAlpha = 1;
    }
    b.filter = 'none';
    // 4. glass
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    const s = Math.max(4, Math.round(g.glassSize / 100 * w * 0.08));
    if (g.glass === 'reeded') {             // vertical ribs: each shows a wider slice, squeezed and mirrored
      const src = Math.min(w, s * 2.2);
      for (let x = 0; x < w; x += s) {
        ctx.save();
        ctx.translate(x + s, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(B, clamp(x + s / 2 - src / 2, 0, w - src), 0, src, h, 0, 0, s, h);
        ctx.restore();
      }
      ctx.fillStyle = shadePattern(ctx, s, 1, false);
      ctx.fillRect(0, 0, w, h);
    } else if (g.glass === 'tiles') {       // glass blocks: the same in both directions
      const t = s * 2, src = Math.min(w, h, t * 1.8);
      for (let y = 0; y < h; y += t) for (let x = 0; x < w; x += t) {
        ctx.save();
        ctx.translate(x + t, y + t);
        ctx.scale(-1, -1);
        ctx.drawImage(B, clamp(x + t / 2 - src / 2, 0, w - src), clamp(y + t / 2 - src / 2, 0, h - src), src, src, 0, 0, t, t);
        ctx.restore();
      }
      ctx.fillStyle = shadePattern(ctx, t, t, true);
      ctx.fillRect(0, 0, w, h);
    } else if (g.glass === 'waves') {       // rippled glass: rows shifted sideways along a sine, light on the crests
      const m = s * 0.5, per = s * 3;
      for (let y = 0; y < h; y += 2) {
        const k = Math.sin(y / per * Math.PI * 2);
        ctx.drawImage(B, m + k * m, y, w - 2 * m, 2, 0, y, w, 2);
      }
      for (let y = 0; y < h; y += 2) {
        const l = Math.cos(y / per * Math.PI * 2);
        if (l > 0) { ctx.fillStyle = `rgba(255,255,255,${(l * 0.06).toFixed(3)})`; ctx.fillRect(0, y, w, 2); }
      }
    } else if (g.glass === 'frosted') {     // frosted: a little extra blur, a soft sheen and more grain (below)
      ctx.filter = `blur(${(w * 0.006).toFixed(1)}px)`;
      ctx.drawImage(B, 0, 0);
      ctx.filter = 'none';
      const lg = ctx.createLinearGradient(0, 0, w, h);
      lg.addColorStop(0, 'rgba(255,255,255,.09)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0)');
      lg.addColorStop(1, 'rgba(255,255,255,.05)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
    } else ctx.drawImage(B, 0, 0);
    // 5. grain, 6. vignette
    const grain = g.grain + (g.glass === 'frosted' ? 14 : 0);
    if (grain > 0) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = Math.min(1, grain / 100 * 0.6);
      ctx.fillStyle = ctx.createPattern(noiseTile(), 'repeat');
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    if (g.vig > 0) {
      const r = Math.hypot(w, h) / 2;
      const rg = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
      rg.addColorStop(0, 'rgba(0,0,0,0)');
      rg.addColorStop(1, `rgba(0,0,0,${g.vig / 100})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  };

  let gmEl = null;
  const openGradientMaker = async onDone => {
    if (gmEl) return;
    const g = Object.assign({}, GRAD_DEF, look.grad || {});
    const brush = { color: GM_COLORS[7], size: 220, soft: 70, flow: 35, mode: 'glow' };
    const PW = 1024, PH = Math.max(1, Math.round(PW * innerHeight / innerWidth));
    const layer = document.createElement('canvas');
    layer.width = PW; layer.height = PH;
    const pc = layer.getContext('2d', { willReadFrequently: true });
    let painted = false;
    if (look.grad) {                           // editing: bring back the strokes
      try {
        const bm = await createImageBitmap(await idb.get('grad-paint'));
        pc.drawImage(bm, 0, 0, PW, PH);
        painted = true;
      } catch {}
    }

    const root = el('div', 'am-gm', document.body);
    gmEl = root;
    root.tabIndex = -1;
    const view = el('canvas', 'am-gm-view', root);
    const vctx = view.getContext('2d');
    const cursor = el('div', 'am-gm-cursor', root);
    const hint = el('div', 'am-gm-hint', root);
    hint.textContent = 'Click and drag to paint light. Strokes melt into a gradient.';
    hint.style.opacity = painted ? '0' : '1';

    let raf = 0;
    const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; gmRender(vctx, view.width, view.height, layer, g); }); };
    const sizeView = () => {      // the preview is rendered at most 1200 px wide and scaled up: fast enough to paint live
      const k = Math.min(1, 1200 / innerWidth);
      view.width = Math.max(1, Math.round(innerWidth * k));
      view.height = Math.max(1, Math.round(innerHeight * k));
      queue();
    };
    sizeView();
    addEventListener('resize', sizeView);

    /* painting */
    const undo = [];
    const pushUndo = () => { undo.push(pc.getImageData(0, 0, PW, PH)); if (undo.length > 20) undo.shift(); };
    const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const dab = (x, y, size, color, alpha, hard, mode) => {
      const r = size / 2, [R, G, B] = rgb(color);
      pc.globalCompositeOperation = mode === 'erase' ? 'destination-out' : mode === 'glow' ? 'lighter' : 'source-over';
      const gr = pc.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${R},${G},${B},${alpha})`);
      gr.addColorStop(hard, `rgba(${R},${G},${B},${alpha})`);
      gr.addColorStop(hard + (1 - hard) * 0.5, `rgba(${R},${G},${B},${alpha * 0.35})`);
      gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
      pc.fillStyle = gr;
      pc.beginPath();
      pc.arc(x, y, r, 0, Math.PI * 2);
      pc.fill();
    };
    const brushDab = (x, y, pr) => dab(x, y, brush.size, brush.color, brush.flow / 100 * 0.3 * pr,
      clamp(1 - brush.soft / 100, 0, 0.95), brush.mode);
    const toP = e => {
      const r = view.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * PW, (e.clientY - r.top) / r.height * PH];
    };
    const pressure = e => e.pointerType === 'pen' ? Math.max(0.1, e.pressure) : 1;
    const showCursor = e => {
      const k = view.getBoundingClientRect().width / PW;
      cursor.style.display = 'block';
      cursor.style.width = cursor.style.height = brush.size * k + 'px';
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    let last = null;
    view.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      view.setPointerCapture(e.pointerId);
      pushUndo();
      last = toP(e);
      brushDab(...last, pressure(e));
      root.classList.add('am-gm-drawing');
      painted = true;
      hint.style.opacity = '0';
      queue();
    });
    view.addEventListener('pointermove', e => {
      showCursor(e);
      if (!last) return;
      const p = toP(e), dx = p[0] - last[0], dy = p[1] - last[1], d = Math.hypot(dx, dy);
      const step = Math.max(1, brush.size * 0.1);
      if (d < step) return;
      const n = Math.floor(d / step);
      for (let i = 1; i <= n; i++) brushDab(last[0] + dx * i * step / d, last[1] + dy * i * step / d, pressure(e));
      last = [last[0] + dx * n * step / d, last[1] + dy * n * step / d];
      queue();
    });
    const endStroke = () => { last = null; root.classList.remove('am-gm-drawing'); };
    view.addEventListener('pointerup', endStroke);
    view.addEventListener('pointercancel', endStroke);
    view.addEventListener('pointerleave', () => { if (!last) cursor.style.display = 'none'; });

    const doUndo = () => { if (undo.length) { pc.putImageData(undo.pop(), 0, 0); queue(); } };
    const doClear = () => { pushUndo(); pc.clearRect(0, 0, PW, PH); queue(); };
    const surprise = () => {      // a few big random glows to start from
      pushUndo();
      pc.clearRect(0, 0, PW, PH);
      const cols = GM_COLORS.slice(0, 12).sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
      for (let i = 0; i < 7; i++) {
        dab(Math.random() * PW, Math.random() * PH, PW * (0.35 + Math.random() * 0.5), cols[i % cols.length], 0.55, 0.2, 'glow');
      }
      painted = true;
      hint.style.opacity = '0';
      queue();
    };

    /* panel */
    const panel = el('div', 'am-set am-gm-panel', root);
    const head = el('div', 'am-set-head', panel);
    const ht = el('div', 'am-set-htext', head);
    el('div', 'am-set-title', ht).textContent = 'Gradient maker';
    el('div', 'am-set-sub', ht).textContent = 'Paint, then add effects';
    const minBtn = el('button', 'am-set-x', head);
    minBtn.title = 'Hide panel';
    minBtn.append(svg(P.shrink));
    minBtn.addEventListener('click', () => {
      const min = panel.classList.toggle('am-gm-min');
      minBtn.replaceChildren(svg(min ? P.expand : P.shrink));
      minBtn.title = min ? 'Show panel' : 'Hide panel';
    });
    const body = el('div', 'am-gm-body', panel);

    el('div', 'am-set-group', body).textContent = 'Brush';
    const bc = el('div', 'am-set-card', body);
    ui.seg(ui.row(bc), [['Glow', 'glow'], ['Paint', 'paint'], ['Erase', 'erase']], () => brush.mode, v => { brush.mode = v; }, 'am-set-wide');
    const swRow = el('div', 'am-gm-sw', ui.row(bc));
    const dots = GM_COLORS.map(c => {
      const d = el('button', 'am-gm-dot', swRow);
      d.style.background = c;
      d.title = c;
      d.addEventListener('click', () => { brush.color = c; showDots(); });
      return [d, c];
    });
    const custom = ui.color(swRow, '#7cffcb', v => { brush.color = v; showDots(); });
    custom.classList.add('am-gm-custom');
    custom.title = 'Any color';
    const showDots = () => dots.forEach(([d, c]) => d.classList.toggle('am-on', c === brush.color));
    showDots();
    ui.range(bc, 'Size', 20, 700, 5, 'px', () => brush.size, v => { brush.size = v; });
    ui.range(bc, 'Softness', 0, 100, 1, '%', () => brush.soft, v => { brush.soft = v; });
    ui.range(bc, 'Strength', 1, 100, 1, '%', () => brush.flow, v => { brush.flow = v; });

    el('div', 'am-set-group', body).textContent = 'Canvas';
    const cc = el('div', 'am-set-card', body);
    const baseRow = ui.row(cc, 'am-set-inline');
    el('span', 'am-set-label', baseRow).textContent = 'Base color';
    ui.color(baseRow, g.base, v => { g.base = v; queue(); });
    const tools = el('div', 'am-gm-tools', ui.row(cc));
    ui.button(tools, 'Undo', doUndo);
    ui.button(tools, 'Clear', doClear);
    ui.button(tools, 'Surprise me', surprise);

    el('div', 'am-set-group', body).textContent = 'Effects';
    const ec = el('div', 'am-set-card', body);
    for (const [k, label, min, max, unit] of [['mix', 'Mix', 0, 100, '%'], ['sat', 'Saturation', 0, 250, '%'],
      ['bri', 'Brightness', 30, 170, '%'], ['hue', 'Hue', -180, 180, '°'], ['bloom', 'Bloom', 0, 100, '%'],
      ['grain', 'Grain', 0, 100, '%'], ['vig', 'Vignette', 0, 100, '%']]) {
      ui.range(ec, label, min, max, 1, unit, () => g[k], v => { g[k] = v; queue(); });
    }

    el('div', 'am-set-group', body).textContent = 'Glass';
    const gc = el('div', 'am-set-card', body);
    ui.seg(ui.row(gc), [['None', 'none'], ['Frosted', 'frosted'], ['Reeded', 'reeded'], ['Tiles', 'tiles'], ['Waves', 'waves']],
      () => g.glass, v => { g.glass = v; queue(); }, 'am-set-wide am-set-grid');
    ui.range(gc, 'Glass size', 5, 100, 1, '%', () => g.glassSize, v => { g.glassSize = v; queue(); });

    const foot = el('div', 'am-set-foot', body);
    const close = () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', sizeView);
      root.remove();
      gmEl = null;
      for (const c of gmTmps) c.width = c.height = 0;      // free the work canvases
    };
    ui.button(foot, 'Cancel', close, 'am-set-plain');
    const apply = el('button', 'am-set-btn am-set-primary', foot);
    apply.textContent = 'Apply';
    apply.addEventListener('click', async () => {
      apply.disabled = true;
      apply.textContent = 'Saving…';
      try {
        // final picture at the screen's real pixel size (at most 2560 px on the long side)
        const dpr = devicePixelRatio || 1;
        const k = Math.min(1, 2560 / (Math.max(innerWidth, innerHeight) * dpr));
        const F = document.createElement('canvas');
        F.width = Math.round(innerWidth * dpr * k);
        F.height = Math.round(innerHeight * dpr * k);
        gmRender(F.getContext('2d'), F.width, F.height, layer, g);
        const toBlob = (c, type, qual) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('toBlob')), type, qual));
        const img = await toBlob(F, 'image/webp', 0.9);
        F.width = F.height = 0;
        await idb.set('bg-gradient', img);
        await idb.set('grad-paint', await toBlob(layer, 'image/png'));
        look.grad = Object.assign({}, g);
        look.bg = 'gradient';
        saveLook();
        await applyBg();
        close();
        if (onDone) onDone();
      } catch (e) {
        console.warn('[am-bar] gradient: could not save', e);
        apply.textContent = 'Could not save';
        apply.disabled = false;
      }
    });

    // keys stay inside (no YTM hotkeys while painting); Ctrl/Cmd+Z undo, [ and ] change the brush size
    root.addEventListener('keydown', e => {
      e.stopPropagation();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
      else if (e.key === '[' || e.key === ']') brush.size = clamp(brush.size + (e.key === ']' ? 20 : -20), 20, 700);
    });
    root.focus({ preventScroll: true });
    queue();
  };

  const lookStyle = el('style', null, document.head);
  lookStyle.textContent = `
    /* custom font for all of YT Music (icons are SVG, so nothing else needs to keep its font) */
    html.am-font-all body, html.am-font-all body *:not(svg, svg *) { font-family: var(--am-font) !important; }

    /* custom background */
    .am-bg { position: fixed; inset: 0; z-index: -1; display: none; overflow: hidden; pointer-events: none; background: #000; }
    html.am-bg-on .am-bg { display: block; }
    .am-bg-img { position: absolute; inset: calc(var(--am-bg-blur, 0px) * -2); background: center / cover no-repeat;
      filter: blur(var(--am-bg-blur, 0px)); }
    .am-bg::after { content: ""; position: absolute; inset: 0; background: rgb(0 0 0 / var(--am-bg-dim, 0)); }
    html.am-bg-on, html.am-bg-on body { background: transparent !important; }
    /* YTM's page fade: a gradient from 60% black to solid #030303 over the whole page (Home, Explore, artist pages...) */
    html.am-bg-on ytmusic-browse-response .background-gradient { background: none !important; }
    /* YTM's page banner: the big picture (or blurred cover art) behind the top of Home, album and playlist pages.
       Artist pages follow their own setting (banner / picture / both / none). */
    html.am-hide-banner:not(.am-page-artist) ytmusic-browse-response #background,
    html.am-hide-banner:not(.am-page-artist) ytmusic-browse-response ytmusic-fullbleed-thumbnail-renderer,
    html.am-page-artist.am-artist-nobanner ytmusic-browse-response #background,
    html.am-page-artist.am-artist-nobanner ytmusic-browse-response ytmusic-fullbleed-thumbnail-renderer { display: none !important; }
    .am-noshade, .am-noshade::before, .am-noshade::after { background-image: none !important; box-shadow: none !important; }
    /* the artist header's shadow: YTM's .gradient-container (a dark fade behind the name and buttons) */
    html.am-artist-noshade ytmusic-immersive-header-renderer .gradient-container,
    html.am-artist-noshade ytmusic-immersive-header-renderer .gradient-container::before,
    html.am-artist-noshade ytmusic-immersive-header-renderer .gradient-container::after,
    html.am-artist-noshade ytmusic-immersive-header-renderer .content-container-wrapper {
      background: none !important; box-shadow: none !important; }
    .am-artist-pfp { display: block; width: 136px; height: 136px; margin: 0 0 18px; border-radius: 50%; object-fit: cover;
      box-shadow: 0 10px 34px rgb(0 0 0 / .45); background: rgb(255 255 255 / .08); }
    .am-bg::after { transition: background .35s ease; }
    .am-bg-img { transition: filter .35s ease, inset .35s ease; }
    html.am-bg-on #nav-bar-background { background: rgb(0 0 0 / .3) !important;
      backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); }
    /* search page tab strip (YT Music / Library / Uploads): see-through; glass like the top bar while it sticks */
    html.am-bg-on ytmusic-tabs { background: transparent !important; box-shadow: none !important; }
    html.am-bg-on ytmusic-tabs.stuck { background: rgb(0 0 0 / .3) !important;
      backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); }

    /* settings controls */
    .am-set-seg.am-set-wide { width: 100%; box-sizing: border-box; }
    .am-set-wide .am-set-segbtn { flex: 1; text-align: center; padding: 6px 4px; }
    .am-set-seg.am-set-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
    .am-set-sub > .am-set-row { border-top: 1px solid rgb(255 255 255 / .07); }
    .am-set-field { display: flex; align-items: center; gap: 8px; }
    .am-set-grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .am-set-input { all: unset; box-sizing: border-box; flex: 1; min-width: 0; height: 32px; padding: 0 10px;
      border-radius: 9px; background: rgb(0 0 0 / .25); font-size: 13px; color: #fff; cursor: text; }
    .am-set-input::placeholder { color: rgb(255 255 255 / .35); }
    .am-set-input:focus { box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / .35); }
    .am-set-btn.am-set-soft { flex-shrink: 0; background: rgb(255 255 255 / .1); color: #fff; text-decoration: none; }
    .am-set-btn.am-set-soft:hover { background: rgb(255 255 255 / .18); }
    .am-set-btn.am-set-plain { background: transparent; color: rgb(255 255 255 / .7); }
    .am-set-btn:disabled { opacity: .6; cursor: default; }
    .am-set-color { -webkit-appearance: none; appearance: none; flex-shrink: 0; width: 44px; height: 28px; padding: 0;
      border: none; border-radius: 8px; background: none; cursor: pointer; }
    .am-set-color::-webkit-color-swatch-wrapper { padding: 0; }
    .am-set-color::-webkit-color-swatch { border: none; border-radius: 8px; }
    .am-set-color::-moz-color-swatch { border: none; border-radius: 8px; }
    .am-set-note:empty { display: none; }
    .am-set-disclose { all: unset; box-sizing: border-box; cursor: pointer; display: flex; width: 100%;
      align-items: center; justify-content: space-between; }
    .am-set-disclose svg { width: 20px; height: 20px; fill: rgb(255 255 255 / .6); transition: rotate .2s ease; }
    .am-set-disclose[aria-expanded="true"] svg { rotate: 180deg; }
    .am-set-perpage { margin-top: 10px; padding: 4px 12px; border-radius: 10px; background: rgb(0 0 0 / .18); }
    .am-set-perpage[hidden] { display: none; }
    .am-set-perpage > .am-set-note { margin: 8px 0 2px; }
    .am-set-pagehead { margin: 14px 0 0; font-size: 11.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
      color: rgb(255 255 255 / .5); }
    .am-set-pagehead + .am-set-row { border-top: none; }
    .am-set-pagehead-card { padding-top: 12px; border-top: 1px solid rgb(255 255 255 / .07); margin-top: 0; }
    .am-set-rowlabel { margin-bottom: 9px; }
    .am-set-row > .am-set-note { margin-top: 6px; }

    /* gradient maker */
    .am-gm { position: fixed; inset: 0; z-index: 100003; background: #000; outline: none; color: #fff;
      font-family: var(--am-font, ${BASE_FONT}); animation: am-set-fade .2s ease; }
    .am-gm-view { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: none; touch-action: none; }
    .am-gm-cursor { position: absolute; left: 0; top: 0; display: none; pointer-events: none; border-radius: 50%;
      margin: 0; translate: -50% -50%; border: 1.5px solid rgb(255 255 255 / .8);
      box-shadow: 0 0 0 1px rgb(0 0 0 / .35), inset 0 0 0 1px rgb(0 0 0 / .35); }
    .am-gm-hint { position: absolute; left: 50%; top: 50%; translate: -50% -50%; pointer-events: none; text-align: center;
      font-size: 15px; color: rgb(255 255 255 / .5); transition: opacity .4s; }
    .am-set.am-gm-panel { position: absolute; top: 16px; right: 16px; width: min(300px, calc(100% - 32px));
      max-height: calc(100% - 32px); padding: 14px; transition: opacity .2s; }
    .am-gm.am-gm-drawing .am-gm-panel { opacity: .15; pointer-events: none; }
    .am-gm-panel.am-gm-min .am-gm-body { display: none; }
    .am-gm-panel .am-set-head { margin-bottom: 0; }
    .am-gm-sw { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .am-gm-dot { all: unset; aspect-ratio: 1; border-radius: 50%; cursor: pointer;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / .25); transition: scale .12s; }
    .am-gm-dot:hover { scale: 1.12; }
    .am-gm-dot.am-on { box-shadow: 0 0 0 2px rgb(30 30 32), 0 0 0 4px #fff; }
    .am-set-color.am-gm-custom { width: auto; height: auto; aspect-ratio: 1; border-radius: 50%; overflow: hidden; }
    .am-gm-tools { display: flex; flex-wrap: wrap; gap: 6px; }
  `;
  applyFont();
  applyBanner();
  html.classList.add('am-page-' + curPage);
  applyArtist();
  applyBg();

  // react to fullscreen immediately (the loop below also checks)
  document.addEventListener('fullscreenchange', () => {
    bar.classList.toggle('am-hidden', isFullscreen());
    hideBase();
  });

  /* the playing row's overlay sticks out 5px above / below; shelves clip it (they scroll sideways, which clips both
     ways). Walk up from the row to the shelf and mark every parent that clips (overflow or paint containment). */
  const PLAYING_ROW = 'ytmusic-responsive-list-item-renderer[play-button-state]:not([play-button-state="default"])';
  const ROOM_STOP = 'ytmusic-section-list-renderer, ytmusic-browse-response, ytmusic-tab-renderer, ytmusic-app-layout, body';
  // each marked parent keeps its own padding / margin: 6px is added to what it has (not replaced), and its original
  // inline values come back when the song stops
  const ROOM = 6, ROOM_PROPS = ['padding-top', 'padding-bottom', 'margin-top', 'margin-bottom'];
  const roomed = new Map();                               // element -> its inline values before we touched it
  const unroom = n => {
    const saved = roomed.get(n);
    for (const pr of ROOM_PROPS) {
      if (saved[pr].v) n.style.setProperty(pr, saved[pr].v, saved[pr].p);
      else n.style.removeProperty(pr);
    }
    roomed.delete(n);
  };
  const room = n => {
    const saved = {};
    for (const pr of ROOM_PROPS) saved[pr] = { v: n.style.getPropertyValue(pr), p: n.style.getPropertyPriority(pr) };
    const cs = getComputedStyle(n);
    for (const pr of ROOM_PROPS) {
      const add = pr.startsWith('padding') ? ROOM : -ROOM;
      n.style.setProperty(pr, (parseFloat(cs.getPropertyValue(pr)) || 0) + add + 'px', 'important');
    }
    roomed.set(n, saved);
  };
  const roomForPlaying = () => {
    const want = new Set();
    for (const row of document.querySelectorAll(PLAYING_ROW)) {
      const shelf = row.closest('ytmusic-carousel');           // only shelves clip; playlists, albums, the player page don't
      if (!shelf) continue;
      for (let n = row.parentElement; n && n !== shelf.parentElement && !n.matches(ROOM_STOP); n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || /paint|strict|content/.test(cs.contain)) want.add(n);
      }
    }
    for (const n of [...roomed.keys()]) if (!want.has(n) || !n.isConnected) unroom(n);
    for (const n of want) if (!roomed.has(n)) room(n);
  };
  window.amRoomProbe = () => console.table([...roomed.keys()].map(n => ({ el: n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
    (typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
    overflow: getComputedStyle(n).overflow, contain: getComputedStyle(n).contain })));

  /* ---------- sync loop ---------- */
  let wasPaused = null, wasMuted = null, wasLiked = null, miniShowAt = 0, wasOpen = false, tick = 0;
  const timer = setInterval(() => {
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
    for (const e of guideEntries.values()) e.g.remove();
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
})();
```

</details>

## Sign and install your own build (Firefox)

Release Firefox only installs signed add-ons. To sign your own copy:

1. Create API keys at [addons.mozilla.org/developers/addon/api/key](https://addons.mozilla.org/en-US/developers/addon/api/key/) (needs a free Firefox account).
2. Sign it as an unlisted add-on (needs Node.js):

   ```bash
   npx web-ext sign --channel=unlisted \
     --source-dir extension \
     --api-key=<JWT issuer> --api-secret=<JWT secret>
   ```

3. Take the signed `.xpi` from `web-ext-artifacts/`.
4. Install it: drag the `.xpi` into Firefox, or open `about:addons`, click the gear, choose **Install Add-on From File** and pick the file.

Each signing needs a new `version` in `extension/manifest.json`. AMO rejects a version it has already seen.
