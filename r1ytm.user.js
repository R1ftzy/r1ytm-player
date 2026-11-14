// ==UserScript==
// @name         r1ytm
// @namespace    r1ytm
// @version      1.9.3
// @description  A floating, Apple Music-style control bar for YouTube Music.
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/R1ftzy/r1ytm-player/main/r1ytm.user.js
// @updateURL    https://raw.githubusercontent.com/R1ftzy/r1ytm-player/main/r1ytm.user.js
// ==/UserScript==
// Apple Music-style bar for YouTube Music
// Browser extension content script (Chrome + Firefox).
// Injected on https://music.youtube.com/* only.
(() => {
  'use strict';
  const VERSION = '1.9.3';

  /* ---------- settings ---------- */
  const PLAYER_PAGE_BAR_SPACE = '88px';          // space the player page keeps free for the bar until it's measured (follows the bar size)
  const ANIM_MS = 700;                           // player page open / background fade-out duration
  const FADE_IN_MS = 280;                        // how fast the page comes back after closing the player
  const ANIM_EASE = 'cubic-bezier(.16, 1, .3, 1)'; // expo-out: fast start, long soft landing
  const SLIDE_FROM = '12vh';                     // how far from the bar's side the player page starts its slide
  const CLOSE_MS = 320;                          // player page close toward a top / left / right bar
  const CLOSE_EASE = 'cubic-bezier(.4, 0, 1, 1)'; // ease-in: leaves gently, then goes
  const MINI_ART_FADE_MS = 450;                  // mobile: fade-in of YTM's own mini art after the player page closes
  const MINI_ART_DELAY_MS = 400;                 // ...starting this long after the page reports closed
  const VINYL_SPIN = [0, 40, 16, 1.8];           // vinyl: seconds per turn for the Spin choice (0 = still; 1.8 s = 33⅓ rpm)

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
  /* the time of the song playing now. The <video> element's own currentTime / duration can count from an earlier
     song: YTM plays through MediaSource and can append the next song to the same stream (gapless), so the time and
     the length then include the songs before it. YTM's player API (#movie_player) and its own progress slider are
     per song, so they come first; the video element is the last fallback.
     Returns { cur, dur } in seconds (dur > 0), or null when nothing is playing. */
  const ytPlayer = () => {
    const p = document.getElementById('movie_player');
    return p && typeof p.getCurrentTime === 'function' && typeof p.getDuration === 'function' ? p : null;
  };
  const ytSlider = () => document.querySelector('ytmusic-player-bar #progress-bar');
  const songTime = () => {
    const p = ytPlayer();
    if (p) {
      try {
        const cur = +p.getCurrentTime(), dur = +p.getDuration();
        if (Number.isFinite(cur) && Number.isFinite(dur) && dur > 0) return { cur: Math.min(Math.max(0, cur), dur), dur };
      } catch {}
    }
    const s = ytSlider();
    if (s) {
      const dur = +(s.max || s.getAttribute('aria-valuemax')), cur = +(s.value || s.getAttribute('aria-valuenow'));
      if (Number.isFinite(cur) && Number.isFinite(dur) && dur > 0) return { cur: Math.min(Math.max(0, cur), dur), dur };
    }
    const v = video();
    if (v && Number.isFinite(v.duration) && v.duration > 0) return { cur: v.currentTime, dur: v.duration };
    return null;
  };
  // seek to a time (seconds) in the song playing now
  const seekSong = t => {
    const st = songTime();
    if (!st) return;
    t = Math.max(0, Math.min(st.dur, t));
    const p = ytPlayer();
    if (p && typeof p.seekTo === 'function') { try { p.seekTo(t, true); return; } catch {} }
    const v = video();
    if (v) v.currentTime = v.currentTime + (t - st.cur);      // keeps the offset if the video counts from an earlier song
  };
  // amTimeProbe(): log the time from each source at every song change (and 3 s later), to see which one goes wrong.
  // Run it again to stop.
  let timeProbe = 0;
  window.amTimeProbe = () => {
    if (timeProbe) { clearInterval(timeProbe); timeProbe = 0; console.log('[am-bar] time probe off'); return; }
    let last = '', at = 0;
    const dump = why => {
      const v = video(), p = ytPlayer(), s = ytSlider();
      let pc = null, pd = null;
      try { if (p) { pc = p.getCurrentTime(); pd = p.getDuration(); } } catch {}
      console.log(`[am-bar] time (${why}): "${last}"`, {
        video: v ? { cur: v.currentTime, dur: v.duration, src: (v.src || '').slice(0, 40) } : null,
        player: p ? { cur: pc, dur: pd } : null,
        slider: s ? { cur: s.value, dur: s.max } : null,
        used: songTime(),
      });
    };
    timeProbe = setInterval(() => {
      const m = navigator.mediaSession.metadata, t = m ? m.title : '';
      if (t !== last) { last = t; at = performance.now(); dump('song change'); }
      else if (at && performance.now() - at > 3000) { at = 0; dump('3 s later'); }
    }, 250);
    console.log('[am-bar] time probe on: play a few songs in a row. Run amTimeProbe() again to stop');
  };
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

  // The player page slides in from the side the bar is on, and slides back out toward it. YTM's own slide is always
  // from the bottom (a transform transition), so for the other sides it is switched off while our animation runs.
  const slideFrom = () => posNow === 'top' ? `0 -${SLIDE_FROM}` : posNow === 'left' ? `-${SLIDE_FROM} 0`
    : posNow === 'right' ? `${SLIDE_FROM} 0` : `0 ${SLIDE_FROM}`;
  const ytmSlides = pp => {
    const cs = getComputedStyle(pp);
    return /\b(all|transform)\b/.test(cs.transitionProperty) && parseFloat(cs.transitionDuration) > 0;
  };
  let pageAnim = null;           // the open / close animation now running, if any
  const animatePage = (pp, frames, opts, ownSlide) => {
    if (pageAnim) pageAnim.cancel();
    if (ownSlide) pp.style.setProperty('transition', 'none', 'important');   // YTM's slide jumps to its end
    animatingUntil = performance.now() + opts.duration + 100;
    document.documentElement.classList.add('am-animating');
    pp.style.willChange = 'opacity, translate, scale';
    const anim = pageAnim = pp.animate(frames, opts);
    const done = () => {
      if (pageAnim !== anim) return;                       // a newer animation took over
      pageAnim = null;
      pp.style.willChange = '';
      pp.style.removeProperty('transition');
      document.documentElement.classList.remove('am-animating');
    };
    anim.finished.then(done, done);
  };
  // close toward a bar that is not at the bottom (at the bottom, YTM's own slide down does it). The page's transform is
  // held at its open value and stays visible until the end, whatever YTM sets meanwhile.
  const animateClose = () => {
    const pp = playerPage();
    if (!pp || reduceMotion.matches || posNow === 'bottom' || !ytmSlides(pp)) return;
    const hold = { transform: 'none', visibility: 'visible' };
    animatePage(pp, [{ ...hold, opacity: 1, translate: '0 0', scale: '1' },
      { ...hold, opacity: 0, translate: slideFrom(), scale: '0.97' }],
      { duration: CLOSE_MS, easing: CLOSE_EASE }, true);
  };

  // called the moment a close is requested, so the page fades back in while the player slides away
  const beginClose = () => {
    closingUntil = performance.now() + 2500;
    if (lastOpen) animateClose();
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

    if (firstRun || reduceMotion.matches) return;
    if (!open) { animateClose(); return; }                  // closed by YTM itself (its own button, a key)
    const pp = playerPage();
    if (!pp) return;

    // YTM already slides the page up with a transform transition: at the bottom, only add fade + slight scale.
    // Elsewhere its slide is switched off and ours comes from the bar's side.
    const theirs = ytmSlides(pp);
    const keep = theirs && posNow === 'bottom';
    // prep layers, pause heavy work, then animate only compositor-friendly properties
    animatePage(pp,
      keep
        ? [{ opacity: 0, scale: '0.985' }, { opacity: 1, scale: '1' }]
        : [{ opacity: 0, translate: slideFrom(), scale: '0.97' }, { opacity: 1, translate: '0 0', scale: '1' }],
      { duration: ANIM_MS, easing: ANIM_EASE }, theirs && !keep);
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
    speed: [24, 'M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-10.44zm-9.79 6.84a2 2 0 002.83 0l5.66-8.49-8.49 5.66a2 2 0 000 2.83z'],
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
  // the speed row: − value + inside the row; the menu stays open. A click on the value goes back to 1×; a click
  // elsewhere on the row (or Enter) steps up and wraps around after 2×
  const SPEED_STEPS = [50, 75, 100, 125, 150, 175, 200];
  const speedItem = () => {
    const it = { icon: 'speed', label: 'Speed', keep: true };
    it.extra = b => {
      const box = el('span', 'am-menu-speed', b);
      const minus = el('span', 'am-menu-sbtn', box);
      minus.textContent = '−'; minus.dataset.d = '-1'; minus.title = 'Slower';
      const val = el('span', 'am-menu-sval', box);
      val.dataset.d = '0'; val.title = 'Normal speed';
      const plus = el('span', 'am-menu-sbtn', box);
      plus.textContent = '+'; plus.dataset.d = '1'; plus.title = 'Faster';
      it.show = () => { val.textContent = fmtSpeed(settings.speed / 100); b.classList.toggle('am-on', settings.speed !== 100); };
      it.show();
    };
    it.run = e => {
      const t = e && e.target && e.target.closest ? e.target.closest('[data-d]') : null;
      const d = t ? +t.dataset.d : 1, s = settings.speed;
      let n;
      if (d === 0) n = 100;
      else if (d > 0) { n = SPEED_STEPS.find(x => x > s); if (n === undefined) n = t ? 200 : SPEED_STEPS[0]; }
      else { n = [...SPEED_STEPS].reverse().find(x => x < s); if (n === undefined) n = SPEED_STEPS[0]; }
      setSpeed(n);
      if (it.show) it.show();
    };
    return it;
  };
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
          speedItem(),
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

  // an item with keep (the speed row) runs with the menu still open; it gets the click to see which part was hit
  const pickMenuItem = (it, e) => {
    if (!it.keep) closeMenu();
    it.run(e);
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
      if (it.extra) it.extra(b);
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

  // the bar's 3-dot: fixed layout, on the page side of the bar (above a bottom bar, below a top bar), right edge at
  // the button; too tall -> it scrolls
  const openMenu = anchor => {
    if (menuEl) { closeMenu(); return; }
    const meta = navigator.mediaSession.metadata;
    const head = meta && meta.title
      ? { title: meta.title, sub: [meta.artist, meta.album].filter(Boolean).join(' · '), img: art.src } : null;
    const place = m => {
      const br = bar.getBoundingClientRect(), down = posNow === 'top';
      if (posNow === 'left' || posNow === 'right') {
        // beside the rail / card, level with the button, kept on screen
        m.style.maxHeight = (innerHeight - 16) + 'px';
        document.body.append(m);
        const b = anchor.getBoundingClientRect(), r = m.getBoundingClientRect();
        const left = posNow === 'left' ? br.right + 10 : br.left - 10 - r.width;
        const top = Math.max(8, Math.min(innerHeight - r.height - 8, b.top - 8));
        m.style.left = Math.max(8, left) + 'px';
        m.style.top = top + 'px';
        m.style.transformOrigin = `${posNow === 'left' ? '0' : '100%'} ${Math.round(b.top + b.height / 2 - top)}px`;
        return;
      }
      if (down) {
        m.style.top = (br.bottom + 10) + 'px';
        m.style.maxHeight = Math.max(160, innerHeight - br.bottom - 10 - 8) + 'px';
        m.classList.add('am-menu-down');
      } else {
        m.style.bottom = (innerHeight - br.top + 10) + 'px';
        m.style.maxHeight = Math.max(160, br.top - 10 - 8) + 'px';
      }
      document.body.append(m);
      const b = anchor.getBoundingClientRect(), r = m.getBoundingClientRect();
      const left = Math.max(8, Math.min(innerWidth - r.width - 8, b.right - r.width + 8));
      m.style.left = left + 'px';
      m.style.transformOrigin = `${Math.round(b.left + b.width / 2 - left)}px ${down ? '0' : '100%'}`;
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
      // next to the button (or the mouse): below if it fits between it and our bar, else above; never over the bar
      // (a bottom bar is a floor, a top bar a ceiling); scrolls if too tall
      const a = t.type === 'click' ? t.el.getBoundingClientRect() : { left: t.x, right: t.x, top: t.y, bottom: t.y, width: 0 };
      const e = barEdge();
      const floor = e && e.side === 'bottom' ? e.at - 10 : innerHeight - 8;
      const ceil = e && e.side === 'top' ? e.at + 10 : 8;
      document.body.append(m);
      const r = m.getBoundingClientRect();
      const below = floor - (a.bottom + 6), above = a.top - 6 - ceil;
      const down = r.height <= below || below >= above;
      m.style.maxHeight = Math.max(160, down ? below : above) + 'px';
      const h = Math.min(r.height, Math.max(160, down ? below : above));
      m.style.top = (down ? a.bottom + 6 : a.top - 6 - h) + 'px';
      const left = t.type === 'click' ? a.right - r.width : a.left;
      // a side bar is a wall: the menu stays on the page side of it
      const minX = e && e.side === 'left' ? e.at + 10 : 8, maxX = e && e.side === 'right' ? e.at - 10 : innerWidth - 8;
      m.style.left = Math.max(minX, Math.min(maxX - r.width, left)) + 'px';
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
          if (b && menuItemOf.has(b) && !b.classList.contains('am-menu-off')) pickMenuItem(menuItemOf.get(b), e);
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
    // player page: keep YTM's own bottom space so its layout stays aligned (none in fullscreen, none with the bar at
    // the top: placeBar() gives it space at the start instead)
    const pp = playerPage();
    const space = bar.offsetHeight ? (bar.offsetHeight + (settings.barFloat ? 28 : 0)) + 'px' : PLAYER_PAGE_BAR_SPACE;   // bar + its margins
    if (pp) pp.style.setProperty('--ytmusic-player-bar-height', fs || posNow !== 'bottom' ? '0px' : space, 'important');

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
    /* the speed row: − value + on the right of the row */
    .am-menu-speed { display: flex; align-items: center; gap: 2px; margin-left: auto; padding-left: 8px; flex-shrink: 0; }
    .am-menu-sbtn, .am-menu-sval { display: grid; place-items: center; height: calc(26px * var(--am-ms)); border-radius: 8px;
      font-size: calc(13px * var(--am-ms)); font-variant-numeric: tabular-nums; transition: background .12s ease; }
    .am-menu-sbtn { width: calc(26px * var(--am-ms)); font-size: calc(16px * var(--am-ms)); color: rgb(255 255 255 / .8); }
    .am-menu-sval { min-width: calc(44px * var(--am-ms)); color: rgb(255 255 255 / .7); }
    .am-menu-item.am-on .am-menu-sval { color: #fa586a; font-weight: 600; }
    .am-menu-sbtn:hover, .am-menu-sval:hover { background: rgb(255 255 255 / .14); color: #fff; }
    /* the 3-dot button shows the speed while it is not 1× */
    .am-lcd-more[data-speed] { position: relative; overflow: visible; }
    .am-lcd-more[data-speed]::after { content: attr(data-speed); position: absolute; right: -2px; top: -3px; padding: 1px 4px;
      border-radius: 6px; font: 700 8.5px/1.3 system-ui, sans-serif; color: #fff; background: #fa586a; pointer-events: none; }

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
    .am-art { width: calc(44px * var(--am-s, 1)); height: calc(44px * var(--am-s, 1)); border-radius: var(--am-art-r, 8px); object-fit: cover; flex-shrink: 0; }
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
    .am-vol:hover input, .am-vol:focus-within input, .am-vol.am-vol-on input { width: 90px; opacity: 1; margin-right: 6px; }
    .am-compact .am-vol:hover input, .am-compact .am-vol:focus-within input, .am-compact .am-vol.am-vol-on input { width: 70px; }
    /* the volume in %, between the slider and the button, shown with the slider */
    .am-vol-pct { width: 0; opacity: 0; overflow: hidden; white-space: nowrap; text-align: right; flex-shrink: 0;
      font-size: calc(11.5px * var(--am-s, 1)); font-variant-numeric: tabular-nums; color: rgb(255 255 255 / .7);
      transition: width .2s ease, opacity .2s ease; }
    .am-vol:is(:hover, :focus-within, .am-vol-on) .am-vol-pct { width: 3.3em; opacity: 1; }

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
  const moreBtn = btn(lcd, 'more', b => openMenu(b), 'am-lcd-btn am-lcd-more');
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
    if (!songTime()) return;
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
    const st = songTime();
    if (commit && st) seekSong(seeking * st.dur);
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
  volRange.addEventListener('input', () => { setVolume(+volRange.value); showVolPct(); });
  volRange.addEventListener('click', e => e.stopPropagation());
  // the volume in %, shown with the slider (between the slider and the button)
  const volPct = el('span', 'am-vol-pct', volWrap);
  const showVolPct = () => {
    const v = video(), t = v && v.muted ? 'Muted' : getVolume() + '%';
    if (volPct.textContent !== t) volPct.textContent = t;
  };
  const volBtn = btn(volWrap, 'vol', () => {
    const v = video();
    if (v) v.muted = !v.muted;
    showVolPct();
  });
  /* scroll on the volume button or slider: 5% a step. A trackpad sends many small deltas, so they add up until they
     make a whole step. The slider stays open for a moment after the last step, and the page doesn't scroll. */
  let volAcc = 0, volShowT = 0;
  volWrap.addEventListener('wheel', e => {
    e.preventDefault();
    e.stopPropagation();
    const d = (e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY) || -e.deltaX;
    if (Math.sign(d) !== Math.sign(volAcc)) volAcc = 0;
    volAcc += d;
    const steps = Math.trunc(volAcc / 50);
    if (steps) {
      volAcc -= steps * 50;                                // keep the rest for the next step
      const v = video();
      if (v && v.muted && steps < 0) v.muted = false;     // scrolling up while muted: unmute first
      const now = Math.round(getVolume() / 5) * 5;
      const val = Math.max(0, Math.min(100, now - steps * 5));
      setVolume(val);
      volRange.value = String(val);
    }
    showVolPct();
    volWrap.classList.add('am-vol-on');
    clearTimeout(volShowT);
    volShowT = setTimeout(() => volWrap.classList.remove('am-vol-on'), 1200);
  }, { passive: false });

  /* bar layouts: full, compact (a centered pill) and classic (YouTube Music's own order: the song on the left, the
     transport in the middle, time / like / menu / volume on the right, the progress bar along the top edge).
     The bar's parts are put together in one of these forms (the same elements, only moved):
       normal   transport | now playing (art, names, like, menu, progress) | the rest      (full and compact)
       classic  song | transport | time, like, menu, the rest; progress along the top edge
       rail     upright, for the left / right positions: (account picture,) the art with the progress as an outline
                around it, like, transport, the rest, the menu at the bottom. Pointing at the art rolls a strip out
                of it onto the page, like tape: the names, the progress bar (horizontal, to drag) and the time
       card     a small card, for the left position in YTM's expanded sidebar: art + names + menu, progress,
                transport, like + the rest
     A phone always gets the normal form (its own CSS is built on it). */
  const LAYOUTS = ['full', 'compact', 'classic'];
  const LAYOUT_NAMES = { full: 'Full bar', compact: 'Compact bar', classic: 'Classic bar' };
  const clLeft = el('div', 'am-cl-left'), clRight = el('div', 'am-cl-right');
  const rTop = el('div', 'am-rtop');
  // the tape (rail only): its own glass blob in the page, joined to the rail's edge (see flyShow below)
  const fly = el('div', 'am-fly', document.body), flyIn = el('div', 'am-fly-in', fly);
  // the art's progress outline: a rope wound once around the art (a rounded square). It is drawn by ropeD() below,
  // the same as the rope that unwinds into the progress bar when the tape comes out, so the two match exactly
  const SVGNS = 'http://www.w3.org/2000/svg';
  const artBox = el('div', 'am-artbox');
  const ring = document.createElementNS(SVGNS, 'svg');
  ring.setAttribute('class', 'am-ring');
  const svgPath = (parent, cls) => {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('class', cls);
    p.setAttribute('pathLength', '100');          // the progress is a share of the whole rope, however long it is
    parent.append(p);
    return p;
  };
  const ringBg = svgPath(ring, 'am-ring-bg'), ringFg = svgPath(ring, 'am-ring-fg');
  // an empty fixed SVG with one path (the tape's outline / shadow)
  const mkSvg = cls => {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', cls);
    s.append(document.createElementNS(SVGNS, 'path'));
    document.body.append(s);
    return s;
  };
  // right + Full: YTM's account picture moves into the rail (a copy; a click opens YTM's own account menu)
  const avatarBtn = el('button', 'am-btn am-avatar');
  const avatarImg = el('img', null, avatarBtn);
  avatarImg.alt = '';
  avatarBtn.title = 'Account';
  const cTop = el('div', 'am-ctop'), cBot = el('div', 'am-cbot');
  const timeEl = el('span', 'am-time');
  let layoutNow = 'full', formNow = 'normal';
  let vertForm = '';             // set by placeBar(): 'rail' / 'card' while the bar is on the left or right
  const FORMS = ['classic', 'rail', 'card'];
  // Full <-> Classic: the parts glide from where they were to their new place (the bar keeps its width, so both ends
  // are known). Measured before and after the move; each part is then pulled back and let go (translate only).
  // The progress bar and the time change shape, so they fade in instead.
  const LAYOUT_MOVE_MS = 380, LAYOUT_EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const glide = move => {
    const parts = [art, info, logo, left, right, likeBtn, moreBtn];
    const before = parts.map(n => n.getBoundingClientRect());
    move();
    parts.forEach((n, i) => {
      const a = before[i], b = n.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      n.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: LAYOUT_MOVE_MS, easing: LAYOUT_EASE });
    });
    for (const n of [track, timeEl]) {
      if (n.isConnected) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LAYOUT_MOVE_MS, easing: 'ease-out', delay: 120, fill: 'backwards' });
    }
  };
  const syncLayoutDom = animate => {
    const form = isMobile() ? 'normal' : vertForm || (layoutNow === 'classic' ? 'classic' : 'normal');
    if (form === formNow) return;
    if (animate && !reduceMotion.matches && bar.offsetWidth) { glide(() => setForm(form)); return; }
    setForm(form);
  };
  const setForm = form => {
    flyHide(true);
    formNow = form;
    // the rail's volume slider stands upright (Firefox before writing-mode support needs the attribute)
    if (form === 'rail') volRange.setAttribute('orient', 'vertical'); else volRange.removeAttribute('orient');
    ring.dataset.key = '';                           // the outline is drawn again for the new place
    for (const f of FORMS) bar.classList.toggle('am-' + f, f === form);
    if (form === 'classic') {
      clLeft.replaceChildren(logo, art, info);
      clRight.replaceChildren(timeEl, likeBtn, moreBtn, right);
      bar.replaceChildren(clLeft, left, clRight, track);
    } else if (form === 'rail') {
      artBox.replaceChildren(art, ring);
      rTop.replaceChildren(avatarBtn, logo, artBox);
      flyIn.replaceChildren(track, info, timeEl);     // the progress bar on top: level with the art's low edge
      bar.replaceChildren(rTop, likeBtn, left, right, moreBtn);
    } else if (form === 'card') {
      cTop.replaceChildren(logo, art, info, moreBtn);
      cBot.replaceChildren(likeBtn, right);
      bar.replaceChildren(cTop, track, left, cBot);
    } else {
      lcd.replaceChildren(logo, art, info, likeBtn, moreBtn, track);
      bar.replaceChildren(left, lcd, right);
    }
  };

  /* the tape. Pointing at the rail's art makes a strip melt out of the rail onto the page.
     - One piece of glass: the rail's own background, border and shadow are switched off (always, not only while the
       tape is out), and one shape of our own (.am-fly) draws the rail and the strip together, with one outline
       (.am-fly-edge) and one shadow (.am-fly-shade). So there is no join to see, and no change when it opens.
     - The shape is redrawn on every frame from one number, t (0 = only the rail, 1 = the tape is out): the strip
       bulges out of the rail's edge as a soft drop (wide, round joins), stretches out with a small overshoot and
       settles (tighter joins). Closing runs t back to 0, so every in-between state is the same shape both ways.
     - The art's outline spins like a reel, and its low edge comes off as the progress bar: the bar starts as the
       outline's bottom edge under the art, then slides and stretches into its place in the strip. The names and
       the time fade in once the strip is out.
     Only the art and the strip itself open / keep it (not the rail's buttons); it stays a moment after the pointer
     leaves, and while dragging. */
  const FLY_W = 280, FLY_R = 14, FLY_RC = 16;     // the strip's width, its joins' radius, its far corners' radius
  const FLY_OPEN_MS = 680, FLY_CLOSE_MS = 420;
  const edge = mkSvg('am-fly-edge');
  // the shadow, the same as the bar's box-shadow (0 8px 32px black .3): the shape (.am-shade-s), moved down 8px and
  // blurred (.am-shade-b), and shown only outside the shape (.am-fly-shade's own clip, evenodd). Under the glass it
  // would show through and darken it (a box-shadow is only drawn outside the box too). Plain CSS, no SVG references:
  // those don't work on YouTube Music's page.
  const shade = el('div', 'am-fly-shade', document.body);
  const shadeS = el('div', 'am-shade-s', el('div', 'am-shade-b', shade));
  // the outline: like the rail's own 1px border, all of it inside the shape (shapePath's inset, below)
  const edgeP = edge.firstChild;
  // the rope while it unwinds: in window pixels, over everything of the bar and the tape
  const rope = mkSvg('am-rope');
  rope.firstChild.remove();
  const ropeBg = svgPath(rope, 'am-ring-bg'), ropeFg = svgPath(rope, 'am-ring-fg');
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeOut = v => 1 - Math.pow(1 - v, 3);
  const easeInOut = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
  const springy = v => 1 - Math.exp(-4 * v) * Math.cos(6 * v) * (1 - v);      // 0 -> 1, a little past 1 on the way
  // the outline of rail + strip, in the shape box's own pixels. Drawn for the left rail (the rail's outer edge at
  // x = 0), mirrored for the right one. Corners: the rail's R, the joins r (concave), the strip's far corners rc.
  // e: the same outline moved e px inward (the corners keep their centers: convex ones get e smaller, the concave
  // joins e bigger). The outline is a 1px line at e = .5, so it covers exactly the shape's first pixel inside, where
  // the rail's own CSS border is. (An SVG clip to keep a wider line inside did not work on YouTube Music's page.)
  // sides (the outline only): a docked rail has its border on some sides only, and square corners. Then the outline
  // is open: only those sides, plus the strip.
  const shapePath = (g, w, h, r, rc, e = 0, sides = null) => {
    const { Wr, rb, R } = g, rt = 0;
    const py0 = g.cy - h / 2, py1 = g.cy + h / 2;
    r = Math.max(0, Math.min(r, w / 2, py0 - rt - R, rb - R - py1));     // the joins stay clear of the rail's corners
    rc = Math.max(0, Math.min(rc, w - r, h / 2));
    const X = x => (g.right ? g.boxW - x : x).toFixed(2), Y = y => y.toFixed(2);
    const A = (rad, sweep, x, y) => { rad = Math.max(0, rad).toFixed(2); return `A${rad} ${rad} 0 0 ${g.right ? 1 - sweep : sweep} ${X(x)} ${Y(y)}`; };
    const rail = `M${X(e)} ${Y(rt + R)} ${A(R - e, 1, R, rt + e)} L${X(Wr - R)} ${Y(rt + e)} ${A(R - e, 1, Wr - e, rt + R)} `;
    const end = `L${X(Wr - e)} ${Y(rb - R)} ${A(R - e, 1, Wr - R, rb - e)} L${X(R)} ${Y(rb - e)} ${A(R - e, 1, e, rb - R)} Z`;
    const strip = w < 2 * e + 1 ? '' :                     // no strip yet: the rail alone
      `L${X(Wr - e)} ${Y(py0 - r)} ${A(r + e, 0, Wr + r, py0 + e)} L${X(Wr + w - rc)} ${Y(py0 + e)} ${A(rc - e, 1, Wr + w - e, py0 + rc)} ` +
      `L${X(Wr + w - e)} ${Y(py1 - rc)} ${A(rc - e, 1, Wr + w - rc, py1 - e)} L${X(Wr + r)} ${Y(py1 - e)} ${A(r + e, 0, Wr - e, py1 + r)} `;
    if (!sides) return rail + strip + end;
    // open outline: each side a 1px line; where two meet, the corner pixel belongs to one of them only
    const { top, bottom, outer, inner } = sides;
    let d = '';
    if (top) d += `M${X(outer ? 1 : 0)} ${Y(e)} L${X(Wr - (inner ? 1 : 0))} ${Y(e)} `;
    if (bottom) d += `M${X(outer ? 1 : 0)} ${Y(rb - e)} L${X(Wr - (inner ? 1 : 0))} ${Y(rb - e)} `;
    if (outer) d += `M${X(e)} ${Y(0)} L${X(e)} ${Y(rb)} `;
    if (inner) d += `M${X(Wr - e)} ${Y(top ? 1 : 0)} ${strip}L${X(Wr - e)} ${Y(rb - (bottom ? 1 : 0))}`;
    else if (strip) d += strip.replace(/^L/, 'M');
    return d;
  };
  /* the rope. The outline is a rope wound around a rounded square (box: x, y, size s, corner r) that doesn't turn,
     like a pulley that is fixed. Its free end leaves the square's low edge at D, going toward the page; pulling it
     drags the rest of the rope around the square and off at D, so the wound part gets shorter from its far end.
     ropeD(): the wound part (length `wound`, ending at D) and then a straight line to the point F. Drawn for the left
     rail (leaving to the right from the bottom-right corner), mirrored for the right one. */
  const pt = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const ropeBox = (b, right) => {
    const { x, y, s, r } = b, cx = x + s / 2, X = v => right ? 2 * cx - v : v;
    const Q = Math.PI / 2, side = s - 2 * r;
    const line = (x0, y0, x1, y1) => ({ len: side, at: f => [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f] });
    const arc = (ccx, ccy, a0) => ({ arc: true, len: Q * r, at: f => [ccx + r * Math.cos(a0 + Q * f), ccy + r * Math.sin(a0 + Q * f)] });
    // from D backward around the square (clockwise on screen): bottom, bottom-left, left, top-left, top, top-right,
    // right, bottom-right, back to D
    const segs = [line(x + s - r, y + s, x + r, y + s), arc(x + r, y + s - r, Q), line(x, y + s - r, x, y + r),
      arc(x + r, y + r, 2 * Q), line(x + r, y, x + s - r, y), arc(x + s - r, y + r, 3 * Q),
      line(x + s, y + r, x + s, y + s - r), arc(x + s - r, y + s - r, 0)];
    return { segs, X, len: segs.reduce((a, g) => a + g.len, 0), D: [X(x + s - r), y + s], r, right };
  };
  const ropeD = (rb, wound, F) => {
    if (wound <= .5) return null;
    const used = [];
    let left = Math.min(wound, rb.len);
    for (const g of rb.segs) {
      if (left <= 0) break;
      const f = Math.min(1, left / g.len);
      used.push([g, f]);
      left -= g.len * f;
    }
    // forward (from the rope's far end to D): each used piece backward, from its cut point to its start
    const [lg, lf] = used[used.length - 1];
    const c = lg.at(lf);
    let d = `M${pt(rb.X(c[0]), c[1])}`;
    const sweep = rb.right ? 1 : 0;              // forward is counterclockwise for the left rail
    for (let i = used.length - 1; i >= 0; i--) {
      const [g] = used[i], p0 = g.at(0);
      d += g.arc ? ` A${rb.r.toFixed(1)} ${rb.r.toFixed(1)} 0 0 ${sweep} ${pt(rb.X(p0[0]), p0[1])}` : ` L${pt(rb.X(p0[0]), p0[1])}`;
    }
    return d + (F ? ` L${pt(F[0], F[1])}` : '');
  };
  // the progress on the rope: the left rail fills from the rope's start, the right one from its end (so that once it
  // lies straight as the progress bar it fills from the left, like the bar itself). The end is placed with an offset,
  // not a zero-length dash: a zero-length dash still paints its line cap, a white dot at the rope's end.
  const setProgress = p => {
    p = Math.max(0, Math.min(100, p));
    for (const n of [ringFg, ropeFg]) {
      n.style.strokeDasharray = `${p} ${100 + p}`;
      n.style.strokeDashoffset = posNow === 'right' ? String(p - 100) : '0';
      n.style.visibility = p > .05 ? '' : 'hidden';
    }
  };
  // the outline's corner: around the art's corner (the line is 2.75px outside the art: the ring box is 4px bigger
  // all round, the line 1.25px inside it), so it runs parallel to the art's edge
  const ringR = () => (parseFloat(getComputedStyle(art).borderTopLeftRadius) || 8) + 2.75;
  // the outline at rest, in the ring's own pixels (the rope fully wound, nothing pulled out)
  const drawRing = () => {
    if (formNow !== 'rail') return;
    const s = artBox.offsetWidth + 8;                    // its own size (a rect would include the paused shrink)
    if (s <= 8) return;
    const key = s + (posNow === 'right' ? 'r' : 'l');
    if (ring.dataset.key === key) return;
    ring.dataset.key = key;
    ring.setAttribute('viewBox', `0 0 ${s} ${s}`);
    const rb = ropeBox({ x: 1.25, y: 1.25, s: s - 2.5, r: ringR() }, posNow === 'right');
    const d = ropeD(rb, rb.len, null);
    ringBg.setAttribute('d', d);
    ringFg.setAttribute('d', d);
  };

  let flyOn = false, flyTimer = 0, flyRaf = 0, flyT = 0, flyG = null;
  let railKey = '', railFollow = 0, railRaf = 0;
  // measure the rail, where the strip goes, where the progress bar starts (the art's low edge). Again whenever the
  // rail moves or changes size (railSync), and at the start of each opening.
  const flySetup = () => {
    const right = posNow === 'right', br = bar.getBoundingClientRect();
    const cs = getComputedStyle(bar), R = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, br.width / 2);
    const Wr = br.width, boxW = Wr + FLY_W + 40;             // 40: room for the overshoot
    flyIn.style.width = FLY_W + 'px';
    const H = flyIn.offsetHeight;
    // the ring (k: its shrink while paused, which its rect includes) and where the rope leaves it: its low edge
    const rr = ring.getBoundingClientRect(), k = rr.width / (artBox.offsetWidth + 8 || rr.width), s = rr.width - 2.5 * k;
    const ropeY = rr.top + 1.25 * k + s;
    // the strip placed so its progress bar's line is level with that edge (the rope goes straight across, no drop),
    // but clear of the rail's corners
    const lineOff = track.offsetTop + 4.5;                   // the bar's line is 3..6px of its 9px
    const cy = Math.max(R + FLY_R + H / 2, Math.min(br.height - R - FLY_R - H / 2, ropeY - br.top - lineOff + H / 2));
    // the sides with a border (all of them unless docked)
    const bw = k => parseFloat(cs['border' + k + 'Width']) > 0;
    const sides = { top: bw('Top'), bottom: bw('Bottom'), outer: bw(right ? 'Right' : 'Left'), inner: bw(right ? 'Left' : 'Right') };
    const g = { right, Wr, R, boxW, rb: br.height, W: FLY_W, H, h0: 18, cy,
      sides: sides.top && sides.bottom && sides.outer && sides.inner ? null : sides,
      shadow: !!settings.barFloat };                          // a docked rail has no shadow
    const box = { left: (right ? br.right - boxW : br.left) + 'px', top: br.top + 'px', width: boxW + 'px', height: br.height + 'px' };
    for (const n of [fly, shade, edge]) Object.assign(n.style, box);
    flyIn.style.left = (right ? boxW - Wr - FLY_W : Wr) + 'px';
    flyIn.style.top = (cy - H / 2) + 'px';
    // the rope: around the ring (the same box as drawRing), out to the progress bar's line (its far end first, then
    // the near end slides from the art to the bar's start)
    g.rope = ropeBox({ x: rr.left + 1.25 * k, y: rr.top + 1.25 * k, s, r: ringR() * k }, right);
    const tr = track.getBoundingClientRect(), ty = tr.top + 4.5;           // the bar's line is 3..6px of its 9px
    g.near = [right ? tr.right : tr.left, ty];
    g.far = [right ? tr.left : tr.right, ty];
    flyG = g;
  };
  const flyDraw = t => {
    const g = flyG;
    if (!g) return;
    const w = g.W * springy(t), h = g.h0 + (g.H - g.h0) * easeOut(clamp01(t * 1.4));
    // the strip's far corners: the rail's own (the art's), so the whole shape has one corner size
    const rc = g.R || FLY_RC, jr = FLY_R + 22 * (1 - easeOut(t));
    const d = shapePath(g, Math.max(0, w), h, jr, rc);
    fly.style.clipPath = `path('${d}')`;
    edgeP.setAttribute('d', shapePath(g, Math.max(0, w), h, jr, rc, .5, g.sides));
    if (g.shadow) {
      shadeS.style.clipPath = `path('${d}')`;
      shade.style.clipPath = `path(evenodd, 'M-100 -100 H${(g.boxW + 100).toFixed(0)} V${(g.rb + 140).toFixed(0)} H-100 Z ${d}')`;
    }
    // the rope: first pulled off the art (the wound part runs out while the free end goes to the bar's far end),
    // then its near end slides from the art to the bar's start; at the end the real progress bar takes its place
    // One motion, not two: a single gentle ease over the whole travel (the free end's way out, then the near end's
    // slide), shared out by distance, so the speed carries straight from one part into the next (two eased parts
    // each slowed to a stop at the join: a hold). It ends with the tape itself, when the real progress bar takes over.
    const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const L1 = Math.hypot(g.far[0] - g.rope.D[0], g.far[1] - g.rope.D[1]) || 1;
    const L2 = Math.hypot(g.near[0] - g.rope.D[0], g.near[1] - g.rope.D[1]);
    const x = clamp01((t - .04) / .96), dist = (.5 - Math.cos(Math.PI * x) / 2) * (L1 + L2);
    const u = Math.min(1, dist / L1), v = L2 ? clamp01((dist - L1) / L2) : 1;
    const F = lerp(g.rope.D, g.far, u);
    const wound = g.rope.len * (1 - u);
    const rd = ropeD(g.rope, wound, F) || `M${pt(...lerp(g.rope.D, g.near, v))} L${pt(F[0], F[1])}`;
    ropeBg.setAttribute('d', rd);
    ropeFg.setAttribute('d', rd);
    const done = t >= 1, moving = t > 0 && !done;
    rope.classList.toggle('am-fly-on', moving);
    rope.style.setProperty('--am-rope-w', (2.5 + .5 * t).toFixed(2) + 'px');
    ring.style.opacity = t > 0 ? '0' : '';
    track.style.opacity = done ? '' : '0';
    const a = String(clamp01((t - .45) / .35));
    info.style.opacity = a;
    timeEl.style.opacity = a;
  };
  const flyRun = (to, dur, done) => {
    cancelAnimationFrame(flyRaf);
    const from = flyT, t0 = performance.now();
    const step = now => {
      const k = clamp01((now - t0) / Math.max(1, dur));
      flyT = to > from ? from + (to - from) * k : from * (1 - easeInOut(k));
      flyDraw(flyT);
      if (k < 1) flyRaf = requestAnimationFrame(step);
      else { flyRaf = 0; if (done) done(); }
    };
    flyRaf = requestAnimationFrame(step);
  };
  // everything back to the bar's own look (another form, the bar hidden, amOff)
  const flyClear = () => {
    cancelAnimationFrame(flyRaf);
    cancelAnimationFrame(railRaf);
    flyRaf = 0; railRaf = 0; flyT = 0; flyG = null; railKey = '';
    bar.classList.remove('am-skinned');
    for (const n of [fly, shade, edge, rope]) n.classList.remove('am-fly-on');
    fly.style.clipPath = '';
    for (const n of [track, ring, info, timeEl]) n.style.opacity = '';
  };
  /* The rail always wears the shape, also while the tape is in (t = 0: the rail alone): one glass, outline and shadow
     in both states, so nothing changes when the tape comes out. The rail's own glass is off the whole time. */
  const railOn = () => formNow === 'rail' && bar.isConnected && !bar.classList.contains('am-hidden');
  const flyRest = () => {
    if (!railOn()) { flyOn = false; flyClear(); return; }
    // shown first (the strip can only be measured on screen), then shaped in the same frame, so the switch from the
    // rail's own glass to the shape can't be seen
    fly.classList.add('am-fly-on');
    edge.classList.add('am-fly-on');
    flySetup();
    shade.classList.toggle('am-fly-on', flyG.shadow);
    flyDraw(flyT);
    bar.classList.add('am-skinned');
  };
  // called by placeBar() (every tick, on resize, on a settings change): the shape follows the rail. After a change it
  // follows every frame for a moment, while the rail's own transitions (left, size) run.
  const railSync = () => {
    railRaf = 0;
    if (!railOn()) { if (flyG || flyOn) { flyOn = false; flyClear(); } return; }
    const r = bar.getBoundingClientRect(), cs = getComputedStyle(bar);
    const key = [r.left, r.top, r.width, r.height, cs.borderTopLeftRadius, cs.borderTopWidth, cs.borderRightWidth,
      cs.borderBottomWidth, cs.borderLeftWidth, posNow, settings.barFloat, bar.classList.contains('am-idle')].join();
    if (key !== railKey || !flyG) {
      railKey = key;
      railFollow = performance.now() + 450;
      flyRest();
    }
    if (performance.now() < railFollow) railRaf = requestAnimationFrame(railSync);
  };
  const flyShow = () => {
    clearTimeout(flyTimer);
    if (flyOn || formNow !== 'rail' || bar.classList.contains('am-idle') || bar.classList.contains('am-hidden')) return;
    flyOn = true;
    if (!flyG || flyT === 0) flyRest();                     // reopened while closing: carry on from where it is
    if (reduceMotion.matches) { flyT = 1; flyDraw(1); return; }
    flyRun(1, FLY_OPEN_MS * (1 - flyT * .6));
  };
  // now === true: at once and all the way back to the bar's own look (the form is changing)
  const flyHide = now => {
    clearTimeout(flyTimer);
    if (!flyOn) { if (now === true && flyG) flyClear(); return; }
    flyOn = false;
    if (now === true) { flyClear(); return; }
    if (reduceMotion.matches) { flyT = 0; flyRest(); return; }
    flyRun(0, FLY_CLOSE_MS * Math.max(.4, flyT), () => { if (!flyOn) flyRest(); });
  };
  const flyLater = () => {
    clearTimeout(flyTimer);
    flyTimer = setTimeout(() => { if (seeking === null) flyHide(); }, 240);
  };
  artBox.addEventListener('pointerenter', flyShow);
  artBox.addEventListener('pointerleave', flyLater);
  flyIn.addEventListener('pointerenter', () => clearTimeout(flyTimer));
  flyIn.addEventListener('pointerleave', flyLater);
  flyIn.addEventListener('click', e => e.stopPropagation());
  track.addEventListener('pointerup', () => { if (formNow === 'rail' && !flyIn.matches(':hover')) flyLater(); });

  const mmss = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const nextLayout = () => LAYOUTS[(LAYOUTS.indexOf(layoutNow) + 1) % LAYOUTS.length];
  const applyMode = mode => {
    const was = layoutNow;
    layoutNow = LAYOUTS.includes(mode) ? mode : 'full';
    bar.classList.toggle('am-compact', layoutNow === 'compact');
    // glide only between full and classic (with compact the bar's own width change carries it)
    syncLayoutDom([was, layoutNow].sort().join() === 'classic,full');
    // the bar's own button goes to the next layout: full -> compact -> classic -> full
    const next = nextLayout();
    modeBtn.replaceChildren(svg(next === 'compact' ? P.shrink : P.expand));
    modeBtn.title = LAYOUT_NAMES[next];
    store.set('am-bar-layout', layoutNow);
  };
  const modeBtn = btn(right, 'shrink', () => { applyMode(nextLayout()); placeBar(); }, 'am-mode');
  // the old key ("am-bar-compact": 1 / 0) still counts until a layout is picked
  applyMode(store.get('am-bar-layout', store.get('am-bar-compact', '0') === '1' ? 'compact' : 'full'));

  /* ---------- settings (sidebar entry "r1ytm" -> panel) ---------- */
  // Values live in localStorage ("am-settings") and are applied as CSS variables on <html>; the bar layout
  // (full / compact / classic) keeps its own key ("am-bar-layout") through applyMode().
  const ZEN_ENDS = [['None', 0], ['.', 1], [',', 2]];
  const SETTINGS = [
    { group: 'Bar & menus', sub: 'Transparency', key: 'barAlpha', label: 'Bar opacity', min: 0, max: 90, step: 1, def: 28, unit: '%',
      css: v => ['--am-bar-a', v / 100], scope: '.am-bar, .am-fly' },
    { group: 'Bar & menus', sub: 'Transparency', key: 'barBlur', label: 'Bar blur', min: 0, max: 60, step: 1, def: 28, unit: 'px',
      css: v => ['--am-bar-blur', v + 'px'], scope: '.am-bar, .am-fly' },
    { group: 'Bar & menus', sub: 'Transparency', key: 'menuAlpha', label: 'Menu opacity', min: 30, max: 98, step: 1, def: 72, unit: '%',
      css: v => ['--am-menu-a', v / 100], scope: '.am-menu' },
    { group: 'Bar & menus', sub: 'Transparency', key: 'menuBlur', label: 'Menu blur', min: 0, max: 80, step: 1, def: 40, unit: 'px',
      css: v => ['--am-menu-blur', v + 'px'], scope: '.am-menu' },
    { group: 'Bar & menus', sub: 'Glass', key: 'refract', type: 'toggle', label: 'Refraction', min: 0, max: 1, def: 0,
      note: () => canRefract ? 'Bends the background at the edges of the bar' : 'Needs Chrome, Edge or Brave',
      disabled: () => !canRefract },
    { group: 'Bar & menus', sub: 'Glass', key: 'refractStrength', label: 'Refraction strength', min: 10, max: 200, step: 1, def: 90, unit: 'px',
      dep: 'refract' },
    { group: 'Bar & menus', sub: 'Size & position', key: 'barSize', label: 'Bar size', min: 80, max: 130, step: 5, def: 100, unit: '%',
      css: v => ['--am-size', v / 100], scope: '.am-bar, ytmusic-section-list-renderer, ytmusic-search-page' },
    { group: 'Bar & menus', sub: 'Size & position', key: 'menuSize', label: 'Menu size', min: 85, max: 125, step: 5, def: 100, unit: '%',
      css: v => ['--am-menu-size', v / 100], scope: '.am-menu' },
    { group: 'Bar & menus', sub: 'Size & position', key: 'barPos', type: 'choice', label: 'Position',
      options: [['Bottom', 0], ['Top', 1], ['Left', 2], ['Right', 3]],
      min: 0, max: 3, def: 0, change: () => { placeBar(); hideBase(); },
      note: () => "Top + Compact sits in YouTube Music's header, Left in its sidebar. Phones always use the bottom" },
    { group: 'Bar & menus', sub: 'Size & position', key: 'barFloat', type: 'toggle', label: 'Floating', min: 0, max: 1, def: 1,
      change: () => { placeBar(); hideBase(); },
      note: () => "Off: the bar fills the width and sits on the edge of the window, like YouTube Music's own" },
    { group: 'Bar & menus', sub: 'Size & position', key: 'easyTrack', type: 'toggle', label: 'Easy progress bar', min: 0, max: 1, def: 1,
      note: () => 'Grows when you point at it, easier to drag' },
    // playback speed (syncSpeed below). Kept in % so the steps stay whole numbers; shown as 1.25×
    { group: 'Playback', sub: 'Speed', key: 'speed', label: 'Speed', min: 50, max: 200, step: 5, def: 100, unit: '%',
      fmt: v => fmtSpeed(v / 100) },
    { group: 'Playback', sub: 'Speed', key: 'keepPitch', type: 'toggle', label: 'Keep pitch', min: 0, max: 1, def: 1,
      note: () => 'Off: the pitch goes up and down with the speed (nightcore / slowed)' },
    // Misc, the last category of the panel (see LATE_GROUPS): YouTube Music's header, updates, experimental features.
    // Its cards show in this order (order of first appearance).
    { group: 'Misc', sub: 'Header', key: 'brand', type: 'toggle', label: 'R1ytm logo', min: 0, max: 1, def: 0,
      change: () => syncBrand(), note: () => "R1ytm in place of “Music” in YouTube Music's logo, top left" },
    // changelog.js: the "What's new" popup after an update. An 'action' row is a button, it has no value of its own
    { group: 'Misc', sub: 'Updates', key: 'whatsNew', type: 'toggle', label: "Show what's new after an update", min: 0, max: 1, def: 1,
      note: () => 'A short list of the changes, once per new version' },
    { group: 'Misc', sub: 'Updates', key: 'whatsNewOpen', type: 'action', label: "What's new", button: 'Open',
      min: 0, max: 0, def: 0, run: () => openChangelog('all'), note: () => 'Every version so far' },
    // backup.js: one file with every setting, to move them to another browser or device
    { group: 'Misc', sub: 'Backup', key: 'backupExport', type: 'action', label: 'Export settings', button: 'Export',
      min: 0, max: 0, def: 0, run: (b, note) => exportSettings(note),
      note: () => 'A file with every setting, the font and the background' },
    { group: 'Misc', sub: 'Backup', key: 'backupImport', type: 'action', label: 'Import settings', button: 'Import',
      min: 0, max: 0, def: 0, run: (b, note) => importSettings(note),
      note: () => { const m = backupMsg; backupMsg = ''; return m || 'Replaces every setting with the ones in the file'; } },
    // vinyl.js
    { group: 'Misc', sub: 'Experimental', key: 'vinyl', type: 'toggle', label: 'Vinyl', min: 0, max: 1, def: 0,
      note: () => 'The art turns into a spinning record, centered on the left edge. Not in video mode or on phones' },
    { group: 'Misc', sub: 'Experimental', key: 'vinylSpin', type: 'choice', label: 'Spin',
      options: [['Still', 0], ['Slow', 1], ['Medium', 2], ['33⅓ rpm', 3]], min: 0, max: 3, def: 1, dep: 'vinyl',
      css: v => ['--am-vinyl-dur', VINYL_SPIN[v] + 's'], scope: '.am-vinyl',
      note: () => 'Stops while the music is paused' },
    // zen screen (zen.js reads these when zen opens); shown after Font / Background (see LATE_GROUPS).
    // A 'choice' is a row of segment buttons; its value is the number next to each label.
    { group: 'Zen', sub: 'Look', key: 'zenLayout', type: 'choice', label: 'Layout', options: [['Auto', 0], ['Wide', 1], ['4:3', 2]],
      min: 0, max: 2, def: 0, note: () => 'Auto picks by the window shape' },
    { group: 'Zen', sub: 'Look', key: 'zenBigFont', type: 'choice', label: 'Title font', options: [['Serif', 0], ['Sans', 1], ['Yours', 2]],
      min: 0, max: 2, def: 0, note: () => 'Greeting, song title and artist. Yours: the font set under Font' },
    { group: 'Zen', sub: 'Look', key: 'zenSmallFont', type: 'choice', label: 'Text font', options: [['Sans', 0], ['Serif', 1], ['Yours', 2]],
      min: 0, max: 2, def: 0, note: () => 'Album, clock, lyrics and buttons' },
    { group: 'Zen', sub: 'Show', key: 'zenGreeting', type: 'toggle', label: 'Greeting', min: 0, max: 1, def: 1 },
    { group: 'Zen', sub: 'Show', key: 'zenAlbum', type: 'toggle', label: 'Album', min: 0, max: 1, def: 1 },
    { group: 'Zen', sub: 'Show', key: 'zenArtist', type: 'toggle', label: 'Artist', min: 0, max: 1, def: 1 },
    // what each line ends with: 0 nothing, 1 a full stop, 2 a comma (not added when the text already ends in one).
    // zenDot is the artist's (it was an on / off "full stop" before, so a saved 1 still means a full stop)
    { group: 'Zen', sub: 'Line endings', key: 'zenHeadEnd', type: 'choice', label: 'Greeting ends with', options: ZEN_ENDS, min: 0, max: 2, def: 0, dep: 'zenGreeting' },
    { group: 'Zen', sub: 'Line endings', key: 'zenTitleEnd', type: 'choice', label: 'Title ends with', options: ZEN_ENDS, min: 0, max: 2, def: 0 },
    { group: 'Zen', sub: 'Line endings', key: 'zenAlbumEnd', type: 'choice', label: 'Album ends with', options: ZEN_ENDS, min: 0, max: 2, def: 0, dep: 'zenAlbum' },
    { group: 'Zen', sub: 'Line endings', key: 'zenDot', type: 'choice', label: 'Artist ends with', options: ZEN_ENDS, min: 0, max: 2, def: 1, dep: 'zenArtist' },
    { group: 'Zen', sub: 'Show', key: 'zenClock', type: 'toggle', label: 'Clock', min: 0, max: 1, def: 1,
      note: () => 'The time left, or the time in zen with no limit' },
    { group: 'Zen', sub: 'Lyrics', key: 'zenLyrics', type: 'choice', label: 'Lyrics', options: [['Off', 0], ['1 line', 1], ['2 lines', 2]],
      min: 0, max: 2, def: 0,
      note: () => hasBetterLyrics() ? 'From Better Lyrics. 2 lines: the next line under the current one' : 'Needs the Better Lyrics extension',
      disabled: () => !hasBetterLyrics() },
    { group: 'Zen', sub: 'Lyrics', key: 'zenLyricsPos', type: 'choice', label: 'Lyrics position', options: [['Bottom', 0], ['Under title', 1]],
      min: 0, max: 1, def: 0, dep: 'zenLyrics', note: () => 'Above the buttons, or under the text at the top' },
    { group: 'Zen', sub: 'Lyrics', key: 'zenLyricsSmooth', type: 'toggle', label: 'Smooth lyrics', min: 0, max: 1, def: 0, dep: 'zenLyrics',
      note: () => 'Lines slide up and fade, instead of a hard cut' },
    // how this panel looks: categories on the side (1, Modern) or the original long list (0, Legacy). No group: it is
    // the switch in the panel's footer, not a row
    { key: 'setLayout', min: 0, max: 1, def: 1 },
  ];
  // A row's group is its category (a page in the Modern layout); sub splits a category into cards with a small
  // heading. Rows are gathered by group and sub wherever they are in the list, so order only matters inside a card.
  const LATE_GROUPS = ['Zen', 'Misc'];        // these groups go at the end of the panel, after the look groups
  // Better Lyrics (a separate extension) adds its stylesheet links and an empty overlay div to the page on load,
  // whether or not lyrics are shown. Its own scripts are in an isolated world, so the page is all we can see.
  const hasBetterLyrics = () => !!document.querySelector('link[id^="blyrics-style-"], #blyrics-ad-overlay, #blyrics-wrapper');
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
    const setAttr = (n, a, v) => { if (n.getAttribute(a) !== v) n.setAttribute(a, v); };   // a changed filter repaints the bar
    for (const [dm, k] of refractDisps) setAttr(dm, 'scale', String(Math.round(settings.refractStrength * k)));
    setAttr(refractBlur, 'stdDeviation', String(settings.barBlur));      // the bar blur, now done inside the filter
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
  /* playback speed and pitch, on YTM's <video>. YTM can set the rate back to 1 (a new song, a new video element), so
     the sync loop calls this every tick and sets it again. At 1× it lets go after setting 1 once, so it doesn't fight
     anything else that changes the speed. The 3-dot button shows the speed while it is not 1×. */
  const fmtSpeed = r => (Math.round(r * 100) / 100) + '×';
  let speedSet = 1;                      // the rate last put on the video
  const syncSpeed = () => {
    const want = settings.speed / 100;
    const v = video();
    if (v && (want !== 1 || speedSet !== 1)) {
      if (Math.abs(v.playbackRate - want) > .001) v.playbackRate = want;
      const pp = want === 1 || !!settings.keepPitch;
      if ('preservesPitch' in v && v.preservesPitch !== pp) v.preservesPitch = pp;
      speedSet = want;
    }
    const badge = want === 1 ? null : fmtSpeed(want);
    if (moreBtn.getAttribute('data-speed') !== badge) {
      if (badge) moreBtn.setAttribute('data-speed', badge); else moreBtn.removeAttribute('data-speed');
      moreBtn.title = badge ? 'More (speed ' + badge + ')' : '';
    }
  };
  const setSpeed = pct => {
    settings.speed = Math.max(50, Math.min(200, Math.round(pct / 5) * 5));
    saveSettings();
    syncSpeed();
  };
  /* speed: the values go in one small style sheet, each only on the elements that use it (s.scope), not on <html>.
     A custom property set on <html> is inherited by every element of YTM's very big page, so every change (each step
     of a slider) made the browser restyle all of it. The sheet is only rewritten when a value really changed. */
  const setVars = el('style', null, document.head);
  const applySettings = () => {
    const by = new Map();
    for (const s of SETTINGS) {
      if (!s.css) continue;
      const [name, value] = s.css(settings[s.key]);
      by.set(s.scope, (by.get(s.scope) || '') + `${name}: ${value}; `);
    }
    const css = [...by].map(([sel, decl]) => `${sel} { ${decl}}`).join('\n');
    if (setVars.textContent !== css) setVars.textContent = css;
    syncSpeed();
    document.documentElement.classList.toggle('am-easy-track', !!settings.easyTrack);
    document.documentElement.classList.toggle('am-dock', !settings.barFloat);
    applyRefraction();
  };
  const saveSettings = () => store.set('am-settings', JSON.stringify(settings));
  applySettings();

  const P_TUNE = 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z';
  const P_CHEVRON = 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z';
  const P_CLOSE = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

  let setEl = null;
  let setCat = '';                     // Modern layout: the category shown (kept between openings)
  // the panel built again in place (after the layout setting changes), without the open animation
  const rebuildSettings = () => {
    if (!setEl) return;
    const old = setEl;
    setEl = null;
    old.remove();
    openSettings(true);
  };
  const closeSettings = () => {
    if (!setEl) return;
    const s = setEl;
    setEl = null;
    s.classList.add('am-set-out');
    setTimeout(() => s.remove(), 180);
  };
  const openSettings = quiet => {
    if (setEl) return;
    closeMenu();
    const back = el('div', 'am-set-back' + (quiet === true ? ' am-set-quiet' : ''), document.body);
    const p = el('div', 'am-set', back);
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'r1ytm settings');

    const head = el('div', 'am-set-head', p);
    const lg = el('div', 'am-set-logo', head);
    lg.append(ytLogo());
    const ht = el('div', 'am-set-htext', head);
    el('div', 'am-set-title', ht).textContent = 'r1ytm';
    const x = el('button', 'am-set-x', head);
    x.title = 'Close';
    x.append(svg(P_CLOSE));
    x.addEventListener('click', closeSettings);

    const ranges = [], deps = [];
    // a row whose dep is off (or not available) is dimmed
    const depOff = key => { const d = SETTINGS.find(x => x.key === key); return !settings[key] || !!(d && d.disabled && d.disabled()); };
    const showDeps = () => deps.forEach(([row, dep]) => row.classList.toggle('am-set-dim', depOff(dep)));
    const addRow = (s, section) => {
      if (s.type === 'choice') {
        const off = !!(s.disabled && s.disabled());       // not available here: grayed out, first option shown
        const row = el('div', 'am-set-row am-set-inline' + (off ? ' am-set-na' : ''), section);
        if (s.dep) deps.push([row, s.dep]);
        const lt = el('div', 'am-set-ltext', row);
        el('div', 'am-set-label', lt).textContent = s.label;
        if (s.note) el('div', 'am-set-note', lt).textContent = s.note();
        const seg = el('div', 'am-set-seg', row);
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', s.label);
        const btns = s.options.map(([t, v]) => {
          const b = el('button', 'am-set-segbtn', seg);
          b.textContent = t;
          b.disabled = off;
          b.addEventListener('click', () => {
            const was = settings[s.key];
            settings[s.key] = v; applySettings(); saveSettings(); show();
            if (s.change && was !== v) s.change();
          });
          return [b, v];
        });
        const show = () => {
          const cur = off ? s.options[0][1] : settings[s.key];
          btns.forEach(([b, v]) => { b.classList.toggle('am-on', cur === v); b.setAttribute('aria-pressed', String(cur === v)); });
          showDeps();
        };
        show();
        ranges.push(show);
        return;
      }
      if (s.type === 'action') {                          // a button that does something (no value to keep)
        const row = el('div', 'am-set-row am-set-inline', section);
        const lt = el('div', 'am-set-ltext', row);
        el('div', 'am-set-label', lt).textContent = s.label;
        const note = el('div', 'am-set-note', lt);          // run() can write a result here
        if (s.note) note.textContent = s.note();
        const b = el('button', 'am-set-btn am-set-soft', row);
        b.textContent = s.button;
        b.addEventListener('click', () => s.run(b, note));
        return;
      }
      if (s.type === 'toggle') {
        const off = !!(s.disabled && s.disabled());       // not available here: grayed out and shown as off
        const row = el('div', 'am-set-row am-set-inline' + (off ? ' am-set-na' : ''), section);
        if (s.dep) deps.push([row, s.dep]);
        const lt = el('div', 'am-set-ltext', row);
        el('div', 'am-set-label', lt).textContent = s.label;
        if (s.note) el('div', 'am-set-note', lt).textContent = s.note();
        const sw = el('button', 'am-set-switch', row);
        sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-label', s.label);
        const show = () => {
          sw.classList.toggle('am-on', !off && !!settings[s.key]);
          sw.setAttribute('aria-checked', String(!off && !!settings[s.key]));
          showDeps();
        };
        sw.addEventListener('click', () => {
          settings[s.key] = settings[s.key] ? 0 : 1;
          applySettings();
          saveSettings();
          show();
          if (s.change) s.change();
        });
        if (off) { sw.disabled = true; sw.classList.add('am-set-off'); }
        show();
        ranges.push(show);
        return;
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
        val.textContent = s.fmt ? s.fmt(settings[s.key]) : settings[s.key] + s.unit;
        r.style.setProperty('--p', ((settings[s.key] - s.min) / (s.max - s.min) * 100) + '%');
      };
      // while dragging: the number follows at once, the look once per frame; saved when let go
      let raf = 0;
      r.addEventListener('input', () => {
        settings[s.key] = +r.value;
        show();
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; applySettings(); });
      });
      r.addEventListener('change', saveSettings);
      show();
      ranges.push(show);
    };
    let sizeCard = null;
    const addGroups = list => {
      const groups = new Map();                 // group -> sub -> rows, in order of first appearance
      for (const s of list) {
        if (!s.group) continue;
        if (!groups.has(s.group)) groups.set(s.group, new Map());
        const subs = groups.get(s.group), k = s.sub || '';
        if (!subs.has(k)) subs.set(k, []);
        subs.get(k).push(s);
      }
      for (const [g, subs] of groups) {
        el('div', 'am-set-group', p).textContent = g;
        for (const [sub, rows] of subs) {
          if (sub) el('div', 'am-set-subhead', p).textContent = sub;
          const card = el('div', 'am-set-card', p);
          if (sub === 'Size & position') sizeCard = card;
          rows.forEach(s => addRow(s, card));
        }
      }
    };
    addGroups(SETTINGS.filter(s => !LATE_GROUPS.includes(s.group)));
    // bar layout (full / compact / classic), in the size card
    const lay = el('div', 'am-set-row am-set-inline', sizeCard);
    el('span', 'am-set-label', lay).textContent = 'Bar layout';
    const seg = el('div', 'am-set-seg', lay);
    const segBtns = [['Full', 'full'], ['Compact', 'compact'], ['Classic', 'classic']].map(([t, mode]) => {
      const b = el('button', 'am-set-segbtn', seg);
      b.textContent = t;
      b.addEventListener('click', () => { applyMode(mode); placeBar(); hideBase(); showSeg(); });
      return [b, mode];
    });
    const showSeg = () => segBtns.forEach(([b, m]) => b.classList.toggle('am-on', layoutNow === m));
    showSeg();
    const lookRefresh = buildLookSettings(p);      // Font + Background groups
    addGroups(SETTINGS.filter(s => LATE_GROUPS.includes(s.group)));
    showDeps();

    const foot = el('div', 'am-set-foot', p);
    const reset = el('button', 'am-set-btn', foot);
    reset.textContent = 'Reset to defaults';
    reset.addEventListener('click', () => {
      const wasLayout = settings.setLayout;
      for (const s of SETTINGS) settings[s.key] = s.def;
      applySettings();
      saveSettings();
      applyMode('full');
      placeBar();
      hideBase();
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
      if (settings.setLayout !== wasLayout) rebuildSettings();
    });
    // the panel's own layout, between Reset and Done
    const fl = el('div', 'am-set-footlay', foot);
    el('span', 'am-set-note', fl).textContent = 'Layout';
    const flSeg = el('div', 'am-set-seg', fl);
    flSeg.setAttribute('role', 'group');
    flSeg.setAttribute('aria-label', 'Settings layout');
    for (const [t, v] of [['Modern', 1], ['Legacy', 0]]) {
      const b = el('button', 'am-set-segbtn' + (settings.setLayout === v ? ' am-on' : ''), flSeg);
      b.textContent = t;
      b.title = v ? 'Categories on the side' : 'One long list';
      b.addEventListener('click', () => {
        if (settings.setLayout === v) return;
        settings.setLayout = v;
        saveSettings();
        rebuildSettings();
      });
    }
    const done = el('button', 'am-set-btn am-set-primary', foot);
    done.textContent = 'Done';
    done.addEventListener('click', closeSettings);

    // Modern layout: the same groups, each moved into its own page; a sidebar picks the page. A group is its heading
    // (.am-set-group) and everything after it up to the next heading.
    if (settings.setLayout) {
      p.classList.add('am-set-modern');
      const nav = el('div', 'am-set-nav'), pane = el('div', 'am-set-pane');
      nav.setAttribute('role', 'tablist');
      const secs = [];
      let sec = null;
      for (const n of [...p.children]) {
        if (n === head || n === foot) continue;
        if (n.classList.contains('am-set-group')) { sec = el('div', 'am-set-section', pane); secs.push([n.textContent, sec]); }
        if (sec) sec.append(n);
      }
      head.after(nav, pane);
      const navBtns = secs.map(([t]) => {
        const b = el('button', 'am-set-navbtn', nav);
        b.textContent = t;
        b.setAttribute('role', 'tab');
        b.addEventListener('click', () => showCat(t));
        return [b, t];
      });
      const showCat = name => {
        setCat = name;
        secs.forEach(([t, s]) => { s.hidden = t !== name; });
        navBtns.forEach(([b, t]) => { b.classList.toggle('am-on', t === name); b.setAttribute('aria-selected', String(t === name)); });
        pane.scrollTop = 0;
      };
      if (secs.length) showCat(secs.some(([t]) => t === setCat) ? setCat : secs[0][0]);
    }

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
  // more entries (e.g. Zen) are added to GUIDE by later files; they show in this order, after YTM's own entries
  const GUIDE = [{ label: 'r1ytm', tip: 'r1ytm settings', icon: P_TUNE, open: () => openSettings() }];
  const makeGuideEntry = spec => {
    const g = el('div', 'am-guide');
    g.setAttribute('role', 'link');
    g.tabIndex = 0;
    g.title = spec.tip;
    const item = el('div', 'am-guide-item', g);
    const icon = el('span', 'am-guide-icon', item);
    icon.append(svg(spec.icon));
    const col = el('div', 'am-guide-col', item);
    const ttl = el('span', 'am-guide-title', col);
    ttl.textContent = spec.label;
    g.addEventListener('click', e => { e.stopPropagation(); spec.open(); });
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spec.open(); } });
    return { g, item, icon, col, ttl };
  };
  const guideEntries = new Map();      // a guide section's #items -> our entries in it (one per GUIDE item)

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
    for (const [items, list] of guideEntries) if (!items.isConnected) { list.forEach(e => e.g.remove()); guideEntries.delete(items); }
    for (const items of document.querySelectorAll('ytmusic-guide-section-renderer[is-primary] #items')) {
      const ref = items.querySelector('ytmusic-guide-entry-renderer:not([active])') ||
        items.querySelector('ytmusic-guide-entry-renderer');
      if (!ref) continue;
      let list = guideEntries.get(items);
      if (!list) { list = GUIDE.map(makeGuideEntry); guideEntries.set(items, list); }
      // keep ours last, in GUIDE order
      const tail = [...items.children].slice(-list.length);
      if (list.some((e, i) => tail[i] !== e.g)) items.append(...list.map(e => e.g));
      for (const e of list) styleGuideEntry(e, ref, items);
    }
  };
  const styleGuideEntry = (e, ref, items) => {
    // a hidden guide has nothing to copy (display: none all the way down); it is restyled once it shows
    if (!shown(ref)) return;
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
      animation: am-set-in .16s cubic-bezier(.2, .8, .2, 1); }
    .am-set-out .am-set { translate: 0 6px; transition: translate .14s ease; }
    @keyframes am-set-fade { from { opacity: 0; } }
    /* opening: a short fade and lift. Scaling a blurred panel re-blurs it on every frame, so it doesn't scale */
    @keyframes am-set-in { from { opacity: 0; translate: 0 8px; } }
    /* Legacy (one long list): cards out of view are not drawn until they are scrolled to */
    .am-set:not(.am-set-modern):not(.am-gm-panel) .am-set-card { content-visibility: auto; contain-intrinsic-size: auto 220px; }

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
    .am-set-na .am-set-label, .am-set-na .am-set-seg { opacity: .45; }
    /* a small heading over each card of a category (Transparency, Glass... inside Bar & menus) */
    .am-set-subhead { font-size: 12.5px; font-weight: 600; color: rgb(255 255 255 / .55); margin: 14px 8px 6px; }
    .am-set-group + .am-set-subhead { margin-top: 4px; }
    .am-set-footlay { display: flex; align-items: center; gap: 8px; margin-left: auto; }
    .am-set-footlay > .am-set-note { margin: 0; }
    .am-set-seg { flex-shrink: 0; }
    .am-set-segbtn:disabled { cursor: default; }
    .am-set-segbtn { min-width: 1.1em; text-align: center; }
    .am-set-segbtn:disabled:hover { color: rgb(255 255 255 / .7); }
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

    /* Modern layout: a wide dashboard, categories on the left, the picked category on the right */
    .am-set-quiet, .am-set-quiet .am-set { animation: none; }
    .am-set.am-set-modern { width: min(860px, 100%); height: min(620px, calc(100vh - 32px)); padding: 0; overflow: hidden;
      display: grid; grid-template-columns: 210px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; }
    .am-set-modern > .am-set-head { grid-column: 1 / -1; margin: 0; padding: 16px 18px 14px;
      border-bottom: 1px solid rgb(255 255 255 / .08); }
    .am-set-nav { display: flex; flex-direction: column; gap: 2px; padding: 10px; overflow-y: auto; scrollbar-width: none;
      border-right: 1px solid rgb(255 255 255 / .08); }
    .am-set-navbtn { all: unset; box-sizing: border-box; cursor: pointer; padding: 9px 12px; border-radius: 10px; font-size: 13.5px;
      color: rgb(255 255 255 / .65); white-space: nowrap; transition: background .15s, color .15s; }
    .am-set-navbtn:hover { color: #fff; background: rgb(255 255 255 / .06); }
    .am-set-navbtn.am-on { color: #fff; background: rgb(255 255 255 / .13); font-weight: 600; }
    .am-set-navbtn:focus-visible { box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / .4); }
    .am-set-pane { overflow-y: auto; padding: 4px 22px 22px; scrollbar-width: thin; }
    .am-set-section[hidden] { display: none; }
    .am-set-modern .am-set-section > .am-set-group { font-size: 20px; font-weight: 700; letter-spacing: 0; text-transform: none;
      color: #fff; margin: 16px 2px 12px; }
    .am-set-modern > .am-set-foot { grid-column: 1 / -1; margin: 0; padding: 12px 18px;
      border-top: 1px solid rgb(255 255 255 / .08); }
    /* narrow windows: the categories become a row of tabs above the page */
    @media (max-width: 640px) {
      .am-set.am-set-modern { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; }
      .am-set-nav { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid rgb(255 255 255 / .08); }
    }

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
  let fileFace = null, fontRun = 0, fontMsg = '';
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
    fontMsg = msg;
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
    // on the background layer itself, not <html> (see setVars in the settings): a Dim / Blur drag restyles only it
    bgLayer.style.setProperty('--am-bg-dim', String(look.bg === 'color' ? 0 : dimFor(curPage) / 100));
    bgLayer.style.setProperty('--am-bg-blur', (look.bg === 'color' ? 0 : blurFor(curPage)) + 'px');
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
        if (n.closest('.am-bar, .am-menu, .am-set-back, .am-gm, .am-bg, .am-zen, ytmusic-player, tp-yt-iron-dropdown, tp-yt-paper-dialog')) continue;
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
    // apply = false when the panel is only being drawn: the font is already applied (applying it again restyles the
    // whole page and, for a Google font, downloads it again), so only the last status line is shown
    const renderFont = (apply = true) => {
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
      if (apply) runFont();
      else if (fNote) fNote.textContent = fontMsg;
    };
    renderFont(false);

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
    return () => { fSeg(); renderFont(false); bSeg(); renderBg(); };
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
    html.am-font-all body, html.am-font-all body *:not(svg, svg *, .am-zen, .am-zen *) { font-family: var(--am-font) !important; }

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
  /* ---------- zen mode (sidebar entry "Zen") ---------- */
  // A black title-card screen that locks the music for a time picked before entering: the only controls are play /
  // pause, next (to skip a bad pick by YTM), a sleep timer and a close button that stays locked until the time is up. Everything behind it is inert,
  // YTM's hotkeys and the media keys for next / previous / seek are blocked. The end time is saved, so a reload goes
  // straight back into zen until it's over. "No limit" runs until closed, with close available from the start.
  // Power: while zen is up the page behind it isn't rendered at all (content-visibility), r1ytm's main loop pauses, the
  // zen clock ticks once a second, and a playing music video drops to its lowest picture quality (audio is untouched).
  // The Zen group in the settings picks the layout, the two fonts, which parts show, and up to two lines of lyrics
  // (read from the Better Lyrics extension when it is installed). They apply the next time zen opens.
  const P_ZEN = 'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 14v-2c-2.24 0-4.16-.96-5.6-2.68l-1.34-1.6A1.98 1.98 0 0 0 12.53 9h-1.05c-.59 0-1.15.26-1.53.71l-1.34 1.6C7.16 13.04 5.24 14 3 14v2c2.77 0 5.19-1.17 7-3.25V15l-3.88 1.55c-.67.27-1.12.93-1.12 1.66C5 19.2 5.8 20 6.79 20H9v-.5a2.5 2.5 0 0 1 2.5-2.5h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.83 0-1.5.67-1.5 1.5v.5h7.21c.99 0 1.79-.8 1.79-1.79 0-.73-.45-1.39-1.12-1.66L14 15v-2.25c1.81 2.08 4.23 3.25 7 3.25z';
  const ZEN_KEY = 'am-zen';                      // { until, start } (epoch ms) while a zen session runs; until 0 = no limit
  const ZEN_MIN_KEY = 'am-zen-mins';             // last picked length in minutes; 0 = no limit
  const ZEN_PRESETS = [15, 30, 45, 60];
  const ZEN_MAX_MIN = 600;
  const SLEEP_STEPS = [0, 15, 30, 45, 60, 90, 'end'];    // minutes; 'end' = pause when this song ends
  const ZEN_FADE_MS = 450;                       // fade to black; the text then cuts in hard, like a title card
  const ZEN_BLOCKED_ACTIONS = ['previoustrack', 'seekto', 'seekbackward', 'seekforward'];   // next stays allowed

  GUIDE.unshift({ label: 'Zen', tip: 'Zen mode: lock the music for a while', icon: P_ZEN, open: () => openZen() });

  /* fonts: a tall, tight, high-contrast heavy serif and a condensed bold grotesque. The condensed (wdth axis) serif is
     tried first, with a hairline stroke to thicken its thin strokes a little; if only a normal-width serif loads, the
     serif lines are squeezed with scaleX instead (--am-zsx). */
  const zenFontStyle = el('style');
  let zenFonts = null;
  const loadZenFonts = () => zenFonts || (zenFonts = (async () => {
    const get = async q => {
      try { const r = await fetch(`https://fonts.googleapis.com/css2?family=${q}&display=block`); return r.ok ? r.text() : null; }
      catch { return null; }
    };
    let css = '', serif = null, sx = .66, stroke = 0, wght = 800;
    for (const [q, fam, s, st, w] of [['Noto+Serif+Display:wdth,wght@62.5,900', 'Noto Serif Display', .92, .018, 900],
                                      ['Noto+Serif:wdth,wght@62.5,800', 'Noto Serif', .9, 0, 800],
                                      ['Noto+Serif:wght@800', 'Noto Serif', .66, 0, 800]]) {
      const t = await get(q);
      if (t) { css += t; serif = fam; sx = s; stroke = st; wght = w; break; }
    }
    let sans = null;
    for (const [q, fam] of [['Archivo:wdth,wght@62..125,700', 'Archivo'], ['Roboto+Condensed:wght@700', 'Roboto Condensed']]) {
      const t = await get(q);
      if (t) { css += t; sans = fam; break; }
    }
    zenFontStyle.textContent = css;
    document.head.append(zenFontStyle);
    html.style.setProperty('--am-zserif', `${serif ? `"${serif}", ` : ''}"Times New Roman", Times, serif`);
    html.style.setProperty('--am-zsans', `${sans ? `"${sans}", ` : ''}"Roboto Condensed", "Arial Narrow", Arial, sans-serif`);
    html.style.setProperty('--am-zsx', String(sx));
    html.style.setProperty('--am-zstroke', stroke + 'em');
    html.style.setProperty('--am-zwght', String(wght));
    try {
      await Promise.all([document.fonts.load(`${wght} 100px "${serif}"`), document.fonts.load(`700 100px "${sans}"`)]);
    } catch {}
  })());

  /* greeting (in place of a fixed header): good morning / afternoon / evening / night, with the account's first name
     when it can be found. The name comes from YTM's account menu (if it was opened) or its account switcher data, and
     is remembered. */
  const ZEN_NAME_KEY = 'am-zen-name';
  let zenName = store.get(ZEN_NAME_KEY, '');
  const firstName = s => (s || '').trim().replace(/^@/, '').split(/\s+/)[0] || '';
  const findZenName = async () => {
    const dom = document.querySelector('ytd-active-account-header-renderer #account-name, #account-name');
    let n = dom && dom.textContent.trim();
    if (!n) {
      try {
        const r = await fetch('/getAccountSwitcherEndpoint', { credentials: 'include' });
        if (r.ok) {
          const data = JSON.parse((await r.text()).replace(/^\)\]\}'\s*/, ''));
          const found = [];
          const walk = (o, d) => {
            if (!o || typeof o !== 'object' || d > 30) return;
            if (o.accountName && (o.accountName.simpleText || o.accountName.runs)) found.push(o);
            for (const k in o) walk(o[k], d + 1);
          };
          walk(data, 0);
          const pick = found.find(o => o.isSelected) || found[0];
          if (pick) n = pick.accountName.simpleText || pick.accountName.runs.map(x => x.text).join('');
        }
      } catch {}
    }
    n = firstName(n);
    if (n && n !== zenName) { zenName = n; store.set(ZEN_NAME_KEY, n); }
  };
  const greeting = () => {
    const h = new Date().getHours();
    const part = h >= 5 && h < 12 ? 'MORNING' : h >= 12 && h < 17 ? 'AFTERNOON' : h >= 17 && h < 22 ? 'EVENING' : 'NIGHT';
    const g = zenName ? [`GOOD ${part},`, zenName.toUpperCase()] : ['GOOD', part];
    g[g.length - 1] = endWith(g[g.length - 1], settings.zenHeadEnd);
    return g;
  };
  // the punctuation picked for a line in the settings (1 full stop, 2 comma), unless it already ends in some
  const endWith = (s, k) => !s || !k || /[.,!?…;:]$/.test(s) ? s : s + (k === 1 ? '.' : ',');
  const setHead = head => {
    const g = greeting(), key = g.join('\n');
    if (head.dataset.text === key) return false;
    head.dataset.text = key;
    head.replaceChildren();
    g.forEach(t => zline(head, 'am-zserif', t));
    return true;
  };

  /* state */
  let zenEl = null;              // the overlay (setup screen or session)
  let zenMode = null;            // 'setup' | 'on'
  let zenUntil = 0;              // session end (epoch ms); 0 = no limit (close is always available)
  let zenStart = 0;              // session start (epoch ms), for the count-up clock of a no-limit session
  let zenTick = 0;
  let zenShown = '';             // title + artist on screen now, to refit only when the song changes
  let sleepIdx = 0, sleepAt = 0, sleepTitle = '', sleepSkip = false;
  const inerted = new Set();     // page elements we made inert
  let zenUi = {};                // the live session elements

  const readZen = () => { try { return JSON.parse(store.get(ZEN_KEY, 'null')); } catch { return null; } };
  const zenMins = () => {
    const v = Math.round(Number(store.get(ZEN_MIN_KEY, 15)));
    return v === 0 ? 0 : clamp(v || 15, 1, ZEN_MAX_MIN);
  };
  const zenLocked = () => zenMode === 'on' && zenUntil > 0 && Date.now() < zenUntil;
  const fmtTime = ms => {
    const t = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    const pad = n => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // one line of title-card text: an inline-block span inside a nowrap line (the span is what gets squeezed)
  const zline = (parent, cls, text) => {
    const d = el('div', 'am-zl ' + cls, parent);
    const s = el('span', null, d);
    s.textContent = text;
    return s;
  };
  const zbtn = (parent, text, onClick, cls) => {
    const b = el('button', 'am-zbtn' + (cls ? ' ' + cls : ''), parent);
    b.textContent = text;
    b.addEventListener('click', e => { e.stopPropagation(); if (!b.disabled) onClick(b); });
    return b;
  };

  // words -> n lines of about the same length (greedy)
  const splitLines = (words, n) => {
    const total = words.join(' ').length, target = total / n, out = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (cur && out.length < n - 1 && next.length > target && Math.abs(next.length - target) > Math.abs(cur.length - target)) {
        out.push(cur); cur = w;
      } else cur = next;
    }
    out.push(cur);
    return out;
  };

  /* sizing: --zb is the base unit (about the size of a 10-letter title filling the width). The big lines are fitted to
     the width (never bigger than --zb, so a short title doesn't explode); a long title is split onto up to 3 lines when
     that makes it clearly bigger. The greeting is shrunk if a line would be wider than the card. If the whole card
     is too tall for the screen, everything shrinks and is fitted again. */
  const fitZen = () => {
    if (!zenEl) return;
    const c = zenEl.querySelector('.am-zc'), big = c && c.querySelector('.am-zbig'), head = c && c.querySelector('.am-zhead');
    if (!c || !big) return;
    // widescreen: title block top left over about two thirds of the width, the artist bottom right, empty space between
    // (like a 16:9 title card). Narrower screens (4:3, portrait): everything stacked and centered.
    const lay = settings.zenLayout;                    // 0 auto, 1 always wide, 2 always stacked
    const wide = lay === 1 || (lay !== 2 && innerWidth / innerHeight >= 1.45);
    zenEl.classList.toggle('am-zwide', wide);
    const sub = zenEl.querySelector('.am-zsub');
    if (sub && sub.parentNode !== (wide ? zenEl : c)) {
      if (wide) zenEl.append(sub);
      else c.insertBefore(sub, c.querySelector('.am-zclock'));      // back above the clock (null on the setup screen: last)
    }
    const subOn = !!sub && sub.getClientRects().length > 0;       // the artist can be hidden in the settings
    const lbox = zenUi.lyric && zenUi.lyric.parentNode === zenEl ? zenUi.lyric : null;   // under the title it's in the card
    const sx = parseFloat(getComputedStyle(zenEl).getPropertyValue('--zbx')) || .66;     // 1 when the title font isn't the serif
    const W = c.clientWidth, H = innerHeight;
    const widest = spans => Math.max(1, ...spans.map(s => s.offsetWidth * sx));
    let B = wide ? Math.min(W * .19, H * .21) : Math.min(W * .17, H * .19);
    for (let pass = 0; pass < 3; pass++) {
      zenEl.style.setProperty('--zb', B + 'px');
      if (head) {
        head.style.fontSize = '100px';
        head.style.fontSize = Math.min(B * .46, 100 * W / widest([...head.querySelectorAll('span')])) + 'px';
      }
      const words = (big.dataset.text || '').split(/\s+/).filter(Boolean);
      let best = null;
      for (let n = 1; n <= Math.min(3, Math.max(1, words.length)); n++) {
        const lines = splitLines(words.length ? words : [''], n);
        big.replaceChildren();
        big.style.fontSize = '100px';
        const spans = lines.map(t => zline(big, 'am-zserif', t));
        const size = Math.min(B, 100 * W / widest(spans));
        // one line unless it would be small; then more lines only when clearly bigger
        if (!best || size > best.size * 1.35) best = { lines, size };
        if (size >= B * (wide ? .8 : .6) || (n === 1 && lines[0].length <= 20)) break;   // short titles stay on one line
      }
      big.replaceChildren();
      best.lines.forEach(t => zline(big, 'am-zserif', t));
      big.style.fontSize = best.size + 'px';
      let ctlTop = zenUi.ctl ? zenUi.ctl.getBoundingClientRect().top : H;
      if (lbox) {
        // the lyric box (a fixed height, empty or not) sits just above the controls; the card stays above it, so a
        // new line never changes the size of the title. Widescreen: it stops short of the artist on the right.
        lbox.style.bottom = (H - ctlTop + Math.max(16, B * .22)) + 'px';
        lbox.style.right = '';
        if (wide && subOn) {
          const sr = sub.getBoundingClientRect();
          lbox.style.right = Math.max(0, innerWidth - sr.left + B * .3) + 'px';
        }
        ctlTop = lbox.getBoundingClientRect().top;
      }
      const h = c.offsetHeight;
      let room;
      if (wide) {
        // the block hangs from the top; it must stay above the controls, and above the artist where the two overlap
        const cr = c.getBoundingClientRect(), sr = subOn ? sub.getBoundingClientRect() : null;
        let bottom = ctlTop - 24;
        if (sr && sr.left < cr.right) bottom = Math.min(bottom, sr.top - B * .15);
        room = bottom - cr.top;
      } else {
        // the card is centered at 46% of the height: it must clear the top and stay above the controls
        room = Math.min(H * .92 - 32, (ctlTop - 24 - H * .46) * 2);
      }
      if (h <= room) break;
      B *= room / h * .98;
    }
  };

  /* the overlay */
  const zenShell = () => {
    const z = el('div', 'am-zen am-zen-black', document.body);
    z.classList.add('am-zbf-' + (['serif', 'sans', 'own'][settings.zenBigFont] || 'serif'),
                    'am-zsf-' + (['sans', 'serif', 'own'][settings.zenSmallFont] || 'sans'));
    z.tabIndex = -1;
    z.setAttribute('role', 'dialog');
    z.setAttribute('aria-modal', 'true');
    z.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
    return z;
  };
  // everything else on the page becomes inert (no clicks, no focus); re-checked every tick for new popups
  const inertPage = () => {
    for (const n of document.body.children) {
      if (n === zenEl || n.inert || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
      n.inert = true;
      inerted.add(n);
    }
  };
  const uninertPage = () => { for (const n of inerted) n.inert = false; inerted.clear(); };
  // show the card after the fade to black (hard cut in); from then on the page behind isn't rendered
  const cutIn = (z, delay) => setTimeout(() => {
    if (zenEl !== z) return;
    html.classList.add('am-zen-on');
    z.classList.remove('am-zen-black');
    fitZen();
  }, delay);

  const openZen = async () => {
    if (zenEl) return;
    closeMenu();
    closeSettings();
    zenMode = 'setup';
    zenUi = {};
    const z = zenEl = zenShell();
    inertPage();
    const c = el('div', 'am-zc', z);
    setHead(el('div', 'am-zhead', c));
    const big = el('div', 'am-zbig', c);
    big.dataset.text = 'ZEN MODE';

    const lockRow = el('div', 'am-zsans am-zlock', c);
    el('span', null, lockRow).textContent = 'LOCK:';
    const inp = el('input', 'am-zinp', lockRow);
    Object.assign(inp, { type: 'text', inputMode: 'numeric', maxLength: 3, value: String(zenMins()) });
    inp.setAttribute('aria-label', 'Minutes');
    const unit = el('span', 'am-zunit', lockRow);
    unit.textContent = 'MIN';
    const pres = el('div', 'am-zpre', c);
    // 0 = no limit: shown as ∞, and the session can be closed at any time
    const setMins = m => {
      m = m === 0 ? 0 : clamp(Math.round(m) || 1, 1, ZEN_MAX_MIN);
      inp.value = m ? String(m) : '∞';
      unit.style.visibility = m ? '' : 'hidden';
      store.set(ZEN_MIN_KEY, String(m));
      preBtns.forEach(([b, p]) => b.classList.toggle('am-on', p === m));
    };
    const cur = () => +inp.value || 15;                // ∞ counts as 15 for − / +
    zbtn(pres, '−', () => setMins(cur() - 5), 'am-zstep').setAttribute('aria-label', '5 minutes less');
    const preBtns = ZEN_PRESETS.map(p => [zbtn(pres, String(p), () => setMins(p)), p]);
    zbtn(pres, '+', () => setMins(cur() + 5), 'am-zstep').setAttribute('aria-label', '5 minutes more');
    preBtns.push([zbtn(pres, 'NO LIMIT', () => setMins(0), 'am-znolimit'), 0]);
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); });
    inp.addEventListener('change', () => setMins(Math.max(1, +inp.value || 1)));
    setMins(zenMins());

    el('div', 'am-zsub', c).textContent = 'Stay with the music.';

    const ctl = zenUi.ctl = el('div', 'am-zctl', z);
    const begin = zbtn(ctl, 'BEGIN', () => {
      if (inp.value !== '∞') setMins(Math.max(1, +inp.value || 1));
      const m = zenMins(), now = Date.now();
      startZen(m ? now + m * 60000 : 0, now);
    }, 'am-zmain');
    zbtn(ctl, 'NOT NOW', () => closeZen());

    await Promise.all([loadZenFonts(), findZenName().then(() => setHead(z.querySelector('.am-zhead')))]);
    cutIn(z, ZEN_FADE_MS);
    setTimeout(() => { if (zenEl === z) begin.focus({ preventScroll: true }); }, ZEN_FADE_MS);
  };

  const startZen = async (until, start = Date.now()) => {
    zenUntil = until;
    zenStart = start;
    store.set(ZEN_KEY, JSON.stringify({ until, start }));
    const old = zenEl;
    zenMode = 'on';
    zenShown = '';
    zenUi = {};
    sleepIdx = 0; sleepAt = 0;
    const z = zenEl = zenShell();
    if (old) { z.classList.add('am-zen-now'); old.remove(); }        // from setup: straight to black, no fade
    inertPage();
    // parts turned off in the settings (hidden with CSS, so the fitting just sees nothing there)
    if (!settings.zenGreeting) z.classList.add('am-zno-head');
    if (!settings.zenAlbum) z.classList.add('am-zno-album');
    if (!settings.zenArtist) z.classList.add('am-zno-artist');
    if (!settings.zenClock) z.classList.add('am-zno-clock');
    const c = el('div', 'am-zc', z);
    zenUi.head = el('div', 'am-zhead', c);
    setHead(zenUi.head);
    zenUi.big = el('div', 'am-zbig', c);
    zenUi.album = el('div', 'am-zalbum', c);
    zenUi.sub = el('div', 'am-zsub', c);          // stacked layout: artist under the album (widescreen: bottom right)
    zenUi.clock = el('div', 'am-zclock', c);
    // lyrics: the line being sung (wraps to 2 rows at most) and, with "2 lines", the next one dimmed under it (1 row)
    if (settings.zenLyrics) {
      const under = settings.zenLyricsPos === 1;
      const box = zenUi.lyric = el('div', 'am-zlyric' + (under ? ' am-zlyric-in' : '') + (settings.zenLyrics === 2 ? ' am-zly2' : ''), under ? c : z);
      zenUi.lyCur = el('span', 'am-zly-cur', box);
      if (settings.zenLyrics === 2) zenUi.lyNext = el('span', 'am-zly-next', box);
    }
    lyr.vid = ''; lyr.sig = ''; lyr.staleSig = null;

    const ctl = zenUi.ctl = el('div', 'am-zctl', z);
    zenUi.play = zbtn(ctl, 'PAUSE', clickYt('PlayPause'));
    zenUi.next = zbtn(ctl, 'NEXT', zenNext);
    zenUi.sleep = zbtn(ctl, 'SLEEP: OFF', () => {
      sleepIdx = (sleepIdx + 1) % SLEEP_STEPS.length;
      const st = SLEEP_STEPS[sleepIdx];
      sleepAt = typeof st === 'number' && st ? Date.now() + st * 60000 : 0;
      sleepTitle = (navigator.mediaSession.metadata || {}).title || '';
      zenUpdate();
      zenSchedule();
    });
    zenUi.close = zbtn(ctl, 'CLOSE', () => { if (!zenLocked()) closeZen(); }, 'am-zclose');

    zenUpdate();
    zenSchedule();
    await loadZenFonts();
    if (!zenName) findZenName().then(() => { if (zenEl === z && setHead(zenUi.head)) fitZen(); });
    cutIn(z, old ? 350 : ZEN_FADE_MS);
  };

  const closeZen = () => {
    if (!zenEl) return;
    const z = zenEl, wasOn = zenMode === 'on';
    zenEl = null; zenMode = null; zenUi = {};
    clearTimeout(zenTick);
    sleepIdx = 0; sleepAt = 0;
    html.classList.remove('am-zen-on');
    uninertPage();
    if (wasOn) {
      store.set(ZEN_KEY, 'null');
      restoreMediaKeys();
      restoreQuality();
      restoreLyricsTab();
    }
    z.classList.add('am-zen-out');
    setTimeout(() => z.remove(), 400);
  };

  // media keys / OS media controls: next, previous and seeking do nothing while in zen (YTM sets its handlers again
  // now and then, so they are cleared every tick). After zen they drive YTM through our own hooks.
  // skipping is allowed; "sleep at the end of this song" then follows the new song instead of pausing on the skip
  const zenNext = () => {
    if (SLEEP_STEPS[sleepIdx] === 'end') sleepSkip = true;
    clickYt('Next')();
  };
  const blockMediaKeys = () => {
    for (const a of ZEN_BLOCKED_ACTIONS) try { navigator.mediaSession.setActionHandler(a, null); } catch {}
    try { navigator.mediaSession.setActionHandler('nexttrack', zenNext); } catch {}
  };
  const restoreMediaKeys = () => {
    const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} };
    set('nexttrack', clickYt('Next'));
    set('previoustrack', clickYt('Previous'));
    // the OS gives song times; seekSong() keeps them right when the video counts from an earlier song
    set('seekto', d => { if (d && Number.isFinite(d.seekTime)) seekSong(d.seekTime); });
    set('seekbackward', d => { const st = songTime(); if (st) seekSong(st.cur - ((d && d.seekOffset) || 10)); });
    set('seekforward', d => { const st = songTime(); if (st) seekSong(st.cur + ((d && d.seekOffset) || 10)); });
  };

  /* the album. YTM often leaves the media session's album empty, so it is looked up in YTM's own data for the song
     playing now: the queue items (and the store behind them) carry a byline whose album run links to an album page
     (pageType MUSIC_PAGE_TYPE_ALBUM / browseId MPRE…). A music video has no album itself, but its queue entry usually
     points at the matching song ("counterpart"), which does. Last resorts: the media session, then an album link in
     the player bar. Found albums are remembered per video, and a miss is retried at most once a second. */
  const curVideoId = () => {
    try { const p = document.querySelector('#movie_player'); const d = p && p.getVideoData && p.getVideoData(); if (d && d.video_id) return d.video_id; } catch {}
    return new URLSearchParams(location.search).get('v') || '';
  };
  const isAlbumRun = r => {
    const be = r && r.navigationEndpoint && r.navigationEndpoint.browseEndpoint;
    if (!be) return false;
    const cfg = be.browseEndpointContextSupportedConfigs && be.browseEndpointContextSupportedConfigs.browseEndpointContextMusicConfig;
    return (cfg && cfg.pageType === 'MUSIC_PAGE_TYPE_ALBUM') || /^MPRE/.test(be.browseId || '');
  };
  // album text from one renderer (playlistPanelVideoRenderer and friends)
  const albumOf = rd => {
    for (const k of ['longBylineText', 'shortBylineText', 'subtitle', 'byline']) {
      const runs = rd && rd[k] && rd[k].runs;
      const hit = runs && runs.find(isAlbumRun);
      if (hit) return hit.text;
    }
    return '';
  };
  // every renderer for this video id, including the counterpart song of a music video
  const renderersFor = (root, id, out, seen, depth) => {
    if (!root || typeof root !== 'object' || depth > 12 || seen.has(root) || out.length > 6) return;
    seen.add(root);
    if (root instanceof Node) return;
    if (root.videoId === id && (root.longBylineText || root.shortBylineText)) out.push(root);
    const w = root.playlistPanelVideoWrapperRenderer;
    if (w) {
      const prim = w.primaryRenderer && (w.primaryRenderer.playlistPanelVideoRenderer || w.primaryRenderer);
      if (prim && prim.videoId === id) for (const c of w.counterpart || []) {
        const cr = c.counterpartRenderer && (c.counterpartRenderer.playlistPanelVideoRenderer || c.counterpartRenderer);
        if (cr) out.push(cr);
      }
    }
    for (const k in root) {
      let v; try { v = root[k]; } catch { continue; }
      if (v && typeof v === 'object') renderersFor(v, id, out, seen, depth + 1);
    }
  };
  const albumCache = new Map();
  let albumTryAt = 0, albumTryId = '';
  const zenAlbum = m => {
    const id = curVideoId();
    if (id && albumCache.has(id)) return albumCache.get(id);
    let al = '';
    if (id && (id !== albumTryId || performance.now() > albumTryAt)) {
      albumTryId = id;
      albumTryAt = performance.now() + 1000;
      const out = [], seen = new WeakSet();
      // queue items in the page first (small), then YTM's store
      for (const n of document.querySelectorAll('ytmusic-player-queue-item, ytmusic-playlist-panel-video-wrapper-renderer')) {
        renderersFor(n.data || (n.__data && n.__data.data), id, out, seen, 0);
      }
      if (!out.some(albumOf)) { try { const st = ytStore(); if (st) renderersFor(st.getState(), id, out, seen, 0); } catch {} }
      for (const rd of out) { al = albumOf(rd); if (al) break; }
    }
    if (!al && m && m.album) al = m.album;
    if (!al) {
      const link = ytLinks().find(l => /browse\/MPRE/.test(l.getAttribute('href') || ''));
      if (link) al = link.textContent.trim();
    }
    if (al && id) albumCache.set(id, al);
    return al;
  };
  // amAlbumProbe(): what the album lookup sees for the song playing now
  window.amAlbumProbe = () => {
    const id = curVideoId(), out = [], seen = new WeakSet();
    for (const n of document.querySelectorAll('ytmusic-player-queue-item, ytmusic-playlist-panel-video-wrapper-renderer'))
      renderersFor(n.data || (n.__data && n.__data.data), id, out, seen, 0);
    const fromQueue = out.length;
    try { const st = ytStore(); if (st) renderersFor(st.getState(), id, out, seen, 0); } catch {}
    console.log('[am-bar] album probe: video', id, '| renderers from queue:', fromQueue, 'total:', out.length,
      '| albums:', out.map(albumOf), '| media session:', (navigator.mediaSession.metadata || {}).album,
      '| byline links:', ytLinks().map(l => l.getAttribute('href')), '| cached:', albumCache.get(id));
  };

  /* power: a playing music video is still decoded (and downloaded) behind the black screen, so its picture drops to
     the lowest quality while zen is up and the previous setting comes back on close. Audio is a separate stream and
     doesn't change. These are YouTube player calls that may not exist in every version, so all of it is best effort. */
  let zenQuality = null, zenQualityVid = '';
  const moviePlayer = () => document.querySelector('#movie_player');
  const lowerQuality = () => {
    const id = curVideoId();
    if (!id || id === zenQualityVid) return;                // once per video (YTM may reset it on a new one)
    zenQualityVid = id;
    try {
      const p = moviePlayer();
      if (!p) return;
      if (zenQuality === null) zenQuality = (p.getPreferredQuality && p.getPreferredQuality()) || 'auto';
      if (p.setPlaybackQualityRange) p.setPlaybackQualityRange('tiny', 'tiny');
      else if (p.setPlaybackQuality) p.setPlaybackQuality('tiny');
    } catch {}
  };
  const restoreQuality = () => {
    const q = zenQuality || 'auto';
    zenQuality = null; zenQualityVid = '';
    try {
      const p = moviePlayer();
      if (!p) return;
      if (p.setPlaybackQualityRange) p.setPlaybackQualityRange(q, q);
      else if (p.setPlaybackQuality) p.setPlaybackQuality(q);
    } catch {}
  };

  /* one line of lyrics, from Better Lyrics (setting "Lyrics line"). Better Lyrics only loads lyrics while YTM's Lyrics
     tab is selected, so zen selects it (and puts the tab that was open back on close). It also stops animating its
     own view while that view is hidden, which it is behind zen, so its "active" class can't be trusted here: the
     line is picked from the start / length (seconds) it writes on every line (data-time / data-duration) against
     the video's own time. Its container doesn't say which song the lyrics belong to, so after a song change the
     old lines are ignored until they are replaced. */
  const LYRIC_LEAD = .15;                        // show a line this much early (s): reads as on time
  const lyr = { vid: '', sig: '', staleSig: null };
  const lyricTexts = new WeakMap();
  let lyricTabPrev = -1, lyricTabTry = 0;
  const lyricTabs = () => document.getElementsByClassName('tab-header style-scope ytmusic-player-page');   // Up next, Lyrics, Related
  const selectLyricsTab = () => {
    const tabs = lyricTabs(), lt = tabs[1];
    if (!lt || lt.getAttribute('aria-selected') === 'true' || performance.now() < lyricTabTry) return;
    lyricTabTry = performance.now() + 3000;
    if (lyricTabPrev < 0) lyricTabPrev = [...tabs].findIndex(t => t.getAttribute('aria-selected') === 'true');
    lt.click();
  };
  const restoreLyricsTab = () => {
    const t = lyricTabPrev >= 0 && lyricTabs()[lyricTabPrev];
    lyricTabPrev = -1; lyricTabTry = 0;
    if (t && t.getAttribute('aria-selected') !== 'true') t.click();
  };
  // the sung text of a line: its main row without the karaoke highlight copy, translation, romanization or
  // background vocals
  const lyricText = line => {
    let t = lyricTexts.get(line);
    if (t === undefined) {
      const c = (line.querySelector(':scope > .blyrics-line-main') || line).cloneNode(true);
      c.querySelectorAll('.blyrics-highlight-run, .blyrics--translated, .blyrics--romanized, .blyrics-background-line, .blyrics-background-lyric')
        .forEach(n => n.remove());
      t = c.textContent.replace(/\s+/g, ' ').trim();
      if (line.dataset.instrumental === 'true') t = '';
      lyricTexts.set(line, t);
    }
    return t;
  };
  // -> { text, nextText, next } (next: when the next line starts, s) or null
  const currentLyric = v => {
    const box = document.querySelector('#blyrics-wrapper .blyrics-container');
    const ok = box && box.dataset.noLyrics !== 'true' && box.dataset.sync !== 'none';
    const lines = ok ? [...box.querySelectorAll('.blyrics--line[data-time]')] : [];
    const last = lines[lines.length - 1];
    const sig = last ? lines.length + '|' + lines[0].dataset.time + '|' + lyricText(lines[0]) + '|' + last.dataset.time : '';
    // new song: the lines on screen now (if any) belong to the last one until they change
    const id = curVideoId();
    if (id !== lyr.vid) { lyr.staleSig = lyr.vid && lyr.sig ? lyr.sig : null; lyr.vid = id; }
    lyr.sig = sig;
    if (!sig) return null;
    if (lyr.staleSig !== null) { if (sig === lyr.staleSig) return null; lyr.staleSig = null; }
    const st = songTime();
    if (!st) return null;
    if (+last.dataset.time > st.dur + 1) return null;      // can't be this song's
    const t = st.cur + LYRIC_LEAD;
    let i = -1;
    for (let k = 0; k < lines.length && +lines[k].dataset.time <= t; k++) i = k;
    const nl = lines[i + 1], next = nl ? +nl.dataset.time : 0, nextText = nl ? lyricText(nl) : '';
    if (i < 0) return { text: '', nextText, next };
    const ln = lines[i], end = +ln.dataset.time + (+ln.dataset.duration || 0);
    // a long gap after a line (no instrumental line in between): the line goes when it's over
    return { text: +ln.dataset.duration > 0 && t > end + 1.5 ? '' : lyricText(ln), nextText, next };
  };

  /* "Smooth lyrics": the old line drifts up and fades out (a copy of it, so the new text can go in right away), the
     new one comes up into place. With 2 lines the next line is already on screen, so it slides up from where it was
     and brightens; the line after it fades in below. Only opacity and translate move (cheap for the browser). */
  const LYRIC_MOVE_MS = 420, LYRIC_EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const lyricMove = (curTxt, nextTxt) => {
    const box = zenUi.lyric, c = zenUi.lyCur, n = zenUi.lyNext;
    const curChanged = c.textContent !== curTxt;
    const fromNext = curChanged && !!n && !!curTxt && n.textContent === curTxt;
    const nextTop = n ? n.offsetTop : 0;
    if (curChanged && c.textContent) {
      const ghost = c.cloneNode(true);
      ghost.classList.add('am-zly-ghost');
      Object.assign(ghost.style, { left: c.offsetLeft + 'px', top: c.offsetTop + 'px', width: c.offsetWidth + 'px' });
      box.append(ghost);
      const a = ghost.animate([{ opacity: .85, translate: '0 0' }, { opacity: 0, translate: '0 -.6em' }],
        { duration: LYRIC_MOVE_MS, easing: LYRIC_EASE });
      a.onfinish = a.oncancel = () => ghost.remove();
    }
    const nextChanged = !!n && n.textContent !== nextTxt;
    c.textContent = curTxt;
    if (n) n.textContent = nextTxt;
    if (curChanged && curTxt) {
      c.animate(fromNext
        ? [{ opacity: .35, translate: `0 ${nextTop - c.offsetTop}px` }, { opacity: .85, translate: '0 0' }]
        : [{ opacity: 0, translate: '0 .5em' }, { opacity: .85, translate: '0 0' }],
        { duration: LYRIC_MOVE_MS, easing: LYRIC_EASE });
    }
    if (nextChanged && nextTxt) {
      n.animate([{ opacity: 0, translate: '0 .5em' }, { opacity: .35, translate: '0 0' }],
        { duration: LYRIC_MOVE_MS, easing: LYRIC_EASE, delay: 90, fill: 'backwards' });
    }
  };

  // the zen loop: once a second, just after each whole second so the clock never skips or doubles; every 250ms near
  // the end of a song while "sleep at the end of this song" is set (it pauses in the last 0.6s)
  const zenSchedule = () => {
    clearTimeout(zenTick);
    if (zenMode !== 'on') return;
    const v = video();
    const st = songTime();
    const nearEnd = SLEEP_STEPS[sleepIdx] === 'end' && st && st.dur - st.cur < 2;
    let wait = nearEnd ? 250 : 1000 - Date.now() % 1000 + 5;
    // a lyric line: wake right when the next one starts (not more often than that)
    if (zenUi.lyricNext && v && st && !v.paused && !document.hidden) {
      const ms = (zenUi.lyricNext - LYRIC_LEAD - st.cur) / (v.playbackRate || 1) * 1000 + 15;
      if (ms > 0) wait = Math.min(wait, Math.max(40, ms));
    }
    zenTick = setTimeout(() => { zenUpdate(); zenSchedule(); }, wait);
  };

  const zenUpdate = () => {
    if (zenMode !== 'on' || !zenUi.big) return;
    const now = Date.now(), noLimit = !zenUntil, left = zenUntil - now, locked = !noLimit && left > 0;
    const shownNow = !document.hidden;              // a hidden tab only needs the sleep timer and the key blocking
    blockMediaKeys();
    lowerQuality();
    if (shownNow) inertPage();

    // song
    const m = navigator.mediaSession.metadata;
    const t = (m && m.title) || '';
    const v = video();
    if (shownNow) {
      const a = (m && m.artist) || '', al = zenAlbum(m);
      const headChanged = setHead(zenUi.head);
      if (t + '\n' + a + '\n' + al !== zenShown || headChanged) {
        zenShown = t + '\n' + a + '\n' + al;
        // the album under the title (left out when there's none, or it's just the title again)
        zenUi.album.textContent = al && al.trim().toLowerCase() !== t.trim().toLowerCase() ? endWith(al.trim(), settings.zenAlbumEnd) : '';
        const clean = t.replace(/\s*[([][^)\]]*[)\]]/g, '').trim() || t;    // "(feat. …)", "[Official Video]" off the big line
        zenUi.big.dataset.text = clean ? endWith(clean.toUpperCase(), settings.zenTitleEnd) : 'SILENCE';
        // the artist ends with a full stop by default, like a title card line
        const who = a || 'Unknown artist';
        zenUi.sub.textContent = !t ? 'Nothing is playing.' : endWith(who, settings.zenDot);
        fitZen();
      }

      // lock
      zenUi.clock.textContent = noLimit ? `ZEN:${fmtTime(now - zenStart)}` : locked ? `LOCKED:${fmtTime(left)}` : 'UNLOCKED:';
      zenUi.close.disabled = locked;
      zenUi.close.textContent = locked ? 'CLOSE · LOCKED' : 'CLOSE';
      zenUi.close.title = locked ? `Unlocks in ${fmtTime(left)}` : 'Leave zen mode';
      zenUi.close.classList.toggle('am-on', !locked);

      // lyric line: a hard cut to the new line like the rest of the card, or (setting "Smooth lyrics") a slide
      if (zenUi.lyric) {
        const on = hasBetterLyrics();
        if (on) selectLyricsTab();
        const cur = on && v ? currentLyric(v) : null;
        const curTxt = cur ? cur.text : '', nextTxt = cur ? cur.nextText : '';
        if (zenUi.lyCur.textContent !== curTxt || (zenUi.lyNext && zenUi.lyNext.textContent !== nextTxt)) {
          if (settings.zenLyricsSmooth && !reduceMotion.matches) lyricMove(curTxt, nextTxt);
          else {
            zenUi.lyCur.textContent = curTxt;
            if (zenUi.lyNext) zenUi.lyNext.textContent = nextTxt;
          }
        }
        zenUi.lyricNext = cur ? cur.next : 0;
      }

      // play / pause
      zenUi.play.textContent = !v || v.paused ? 'PLAY' : 'PAUSE';
      zenUi.play.disabled = !t;
      zenUi.next.disabled = !t;
    }

    // sleep timer
    const st = SLEEP_STEPS[sleepIdx], song = st === 'end' ? songTime() : null;
    if (st === 'end' && v) {
      const changed = sleepTitle && t && t !== sleepTitle;
      if (changed && sleepSkip) { sleepTitle = t; sleepSkip = false; }
      else if (changed || (song && song.cur >= song.dur - .6)) { v.pause(); sleepIdx = 0; }
    } else if (sleepAt && now >= sleepAt) {
      if (v && !v.paused) v.pause();
      sleepIdx = 0; sleepAt = 0;
    }
    if (!shownNow) { zenUi.lyricNext = 0; return; }
    const st2 = SLEEP_STEPS[sleepIdx];
    zenUi.sleep.textContent = !st2 ? 'SLEEP: OFF' : st2 === 'end' ? 'SLEEP: END OF SONG' : `SLEEP:${fmtTime(sleepAt - now)}`;
    zenUi.sleep.classList.toggle('am-on', !!st2);
  };

  // keys: nothing reaches YTM while the overlay is up. Space / K play-pause and Shift+N skips in a session; Escape leaves the setup
  // screen, or the session once it's unlocked; Enter in the minutes box begins.
  const zenKeys = e => {
    if (!zenEl) return;
    e.stopImmediatePropagation();
    if (e.type !== 'keydown') return;
    const inInput = e.target && e.target.tagName === 'INPUT';
    if (e.key === 'Escape') { e.preventDefault(); if (zenMode === 'setup' || !zenLocked()) closeZen(); return; }
    if (zenMode === 'setup') {
      if (inInput && e.key === 'Enter') { e.preventDefault(); zenEl.querySelector('.am-zmain').click(); }
      return;
    }
    if (e.key.toLowerCase() === 'n' && e.shiftKey) { e.preventDefault(); if (!zenUi.next.disabled) zenNext(); return; }
    if ((e.key === ' ' && !(e.target && e.target.tagName === 'BUTTON')) || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (!zenUi.play.disabled) zenUi.play.click();
    }
  };
  for (const type of ['keydown', 'keyup', 'keypress']) addEventListener(type, zenKeys, true);
  // keep focus inside
  const zenFocus = e => { if (zenEl && !zenEl.contains(e.target)) zenEl.focus({ preventScroll: true }); };
  addEventListener('focusin', zenFocus, true);
  const zenResize = () => fitZen();
  addEventListener('resize', zenResize);
  const zenVisible = () => { if (!document.hidden && zenMode === 'on') zenUpdate(); };
  document.addEventListener('visibilitychange', zenVisible);

  const zenStyle = el('style', null, document.head);
  zenStyle.textContent = `
    .am-zen { position: fixed; inset: 0; z-index: 2147483000; background: #000 !important; color: #fff; outline: none;
      overflow: hidden; user-select: none; -webkit-user-select: none; animation: am-zen-in ${ZEN_FADE_MS}ms ease-out;
      -webkit-font-smoothing: antialiased; --zx: max(16px, 8vw); --zb: 120px;
      /* fonts (settings: Title font / Text font). Big lines: family, weight, stretch, squeeze (scaleX), stroke */
      --zbf: var(--am-zserif, "Times New Roman", Times, serif); --zbw: var(--am-zwght, 800); --zbs: 62.5%;
      --zbx: var(--am-zsx, .66); --zbk: var(--am-zstroke, 0em);
      --zsf: var(--am-zsans, "Roboto Condensed", "Arial Narrow", Arial, sans-serif); --zsw: 700; --zss: 72%; }
    .am-zen.am-zbf-sans { --zbf: var(--am-zsans, "Roboto Condensed", "Arial Narrow", Arial, sans-serif); --zbw: 700;
      --zbs: 62.5%; --zbx: 1; --zbk: 0em; }
    .am-zen.am-zbf-own { --zbf: var(--am-font, system-ui, sans-serif); --zbw: 800; --zbs: normal; --zbx: 1; --zbk: 0em; }
    .am-zen.am-zsf-serif { --zsf: var(--am-zserif, "Times New Roman", Times, serif); --zsw: var(--am-zwght, 800); --zss: 62.5%; }
    .am-zen.am-zsf-own { --zsf: var(--am-font, system-ui, sans-serif); --zsw: 700; --zss: normal; }
    .am-zno-head .am-zhead, .am-zno-album .am-zalbum, .am-zno-artist .am-zsub, .am-zno-clock .am-zclock { display: none !important; }
    .am-zen.am-zen-now { animation: none; }
    .am-zen.am-zen-out { opacity: 0; transition: opacity .35s ease; pointer-events: none; }
    @keyframes am-zen-in { from { opacity: 0; } }
    .am-zen.am-zen-black .am-zc, .am-zen.am-zen-black .am-zctl { visibility: hidden; }
    /* power: nothing behind zen is styled, laid out or painted (GIF backgrounds, blur, the video's picture...);
       the elements stay in the page, so playback and YTM's state carry on */
    html.am-zen-on body > :not(.am-zen) { content-visibility: hidden !important; }

    .am-zc { position: absolute; left: var(--zx); right: var(--zx); top: 46%; translate: 0 -50%; }
    .am-zl { white-space: nowrap; }
    .am-zl > span { display: inline-block; transform-origin: 0 50%; }
    .am-zserif > span { font-family: var(--zbf); font-weight: var(--zbw);
      font-stretch: var(--zbs); letter-spacing: -.012em; transform: scaleX(var(--zbx));
      -webkit-text-stroke: var(--zbk) #fff; paint-order: stroke fill; }
    .am-zhead { font-size: calc(var(--zb) * .46); line-height: .9; }
    .am-zbig { line-height: .92; margin-top: .03em; }
    .am-zsans { font-size: calc(var(--zb) * .3); line-height: 1; margin-top: calc(var(--zb) * .2);
      font-variant-numeric: tabular-nums; white-space: nowrap; }
    /* the album under the title: condensed grotesque, smaller than the title, wraps */
    .am-zalbum { font-size: calc(var(--zb) * .17); line-height: 1.04; margin-top: calc(var(--zb) * .14);
      white-space: normal; overflow-wrap: anywhere; text-wrap: balance; }
    .am-zalbum:empty { display: none; }
    /* the lock countdown: small and quiet, so it doesn't pull the eye */
    .am-zclock { font-size: clamp(14px, 1.3vw, 19px); line-height: 1; margin-top: calc(var(--zb) * .16);
      opacity: .5; letter-spacing: .02em; font-variant-numeric: tabular-nums; white-space: nowrap; }
    /* the artist (or a line of text) under the clock: same grotesque, a little smaller, wraps */
    .am-zsub { font-size: calc(var(--zb) * .27); line-height: 1.08; margin-top: calc(var(--zb) * .07);
      white-space: normal; overflow-wrap: anywhere; text-wrap: balance; max-width: 100%; }

    /* the lyric line: a box two lines high above the controls (placed by fitZen), the text sits on its bottom */
    .am-zlyric { position: absolute; left: var(--zx); right: var(--zx); display: flex; flex-direction: column;
      justify-content: flex-end; font-size: max(16px, calc(var(--zb) * .2)); line-height: 1.1; height: 2.2em; }
    .am-zlyric.am-zly2 { height: 3.3em; }
    .am-zlyric > span { flex-shrink: 0; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
      line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; text-wrap: balance; }
    .am-zly-cur { opacity: .85; min-height: 1.1em; }
    .am-zlyric > .am-zly-next { -webkit-line-clamp: 1; line-clamp: 1; opacity: .35; }
    /* "Under title": in the card, after the clock, its rows kept at a fixed height so the card doesn't jump */
    .am-zlyric.am-zlyric-in { position: relative; inset: auto; justify-content: flex-start; margin-top: calc(var(--zb) * .16); }
    .am-zlyric > .am-zly-ghost { position: absolute; margin: 0; pointer-events: none; }
    .am-zen-black .am-zlyric { visibility: hidden; }

    .am-zlock { display: flex; align-items: baseline; gap: .18em; }
    .am-zinp { all: unset; width: 2.3ch; text-align: center; font-size: 1em; color: #fff; cursor: text;
      border-bottom: .07em solid rgb(255 255 255 / .35); font-variant-numeric: tabular-nums; }
    .am-zinp:focus { border-bottom-color: #fff; }
    .am-zunit { margin-left: .1em; }
    .am-zpre { display: flex; flex-wrap: wrap; gap: .3em .9em; margin-top: calc(var(--zb) * .12);
      font-size: max(15px, calc(var(--zb) * .14)); }

    .am-zctl { position: absolute; left: var(--zx); right: var(--zx); bottom: max(20px, 6vh); display: flex; flex-wrap: wrap;
      gap: .5em 2.2em; font-size: clamp(14px, 1.5vw, 21px); }
    .am-zbtn { all: unset; cursor: pointer; color: #fff; opacity: .55; font-size: inherit; line-height: 1.2;
      font-variant-numeric: tabular-nums; transition: opacity .15s; }
    .am-zbtn:hover, .am-zbtn:focus-visible, .am-zbtn.am-on { opacity: 1; }
    .am-zbtn:focus-visible { text-decoration: underline; text-underline-offset: .2em; }
    .am-zbtn.am-zmain { opacity: 1; }
    .am-zbtn:disabled { opacity: .22; cursor: not-allowed; }
    .am-zstep { padding: 0 .2em; }
    .am-znolimit { margin-left: .4em; }
    /* after the all: unset resets above */
    .am-zsans, .am-zsub, .am-zalbum, .am-zclock, .am-zlyric, .am-zbtn, .am-zinp { font-family: var(--zsf);
      font-weight: var(--zsw); font-stretch: var(--zss); letter-spacing: -.01em; }

    /* widescreen layout */
    .am-zen.am-zwide { --zx: max(16px, 6vw); }
    .am-zwide .am-zc { top: 13vh; translate: none; right: auto; width: 64vw; }
    .am-zwide .am-zc > .am-zsans { font-size: calc(var(--zb) * .5); margin-top: calc(var(--zb) * .07); }
    .am-zwide .am-zalbum { font-size: calc(var(--zb) * .2); margin-top: calc(var(--zb) * .1); }
    .am-zwide .am-zpre { margin-top: calc(var(--zb) * .16); }
    .am-zwide > .am-zsub { position: absolute; right: var(--zx); bottom: 22vh; max-width: 46vw; margin: 0; text-align: right;
      font-family: var(--zbf); font-weight: var(--zbw); font-stretch: var(--zbs);
      -webkit-text-stroke: var(--zbk) #fff; paint-order: stroke fill;
      font-size: calc(var(--zb) * .38); line-height: .98; letter-spacing: -.01em; }
    .am-zen-black > .am-zsub { visibility: hidden; }

    @media (prefers-reduced-motion: reduce) { .am-zen { animation: none; } .am-zen.am-zen-out { transition: none; } }
  `;

  // undo everything (for amOff)
  const zenOff = () => {
    clearTimeout(zenTick);
    if (zenEl) zenEl.remove();
    if (zenMode === 'on') { restoreQuality(); restoreLyricsTab(); }
    zenEl = null; zenMode = null;
    html.classList.remove('am-zen-on');
    uninertPage();
    document.removeEventListener('visibilitychange', zenVisible);
    for (const type of ['keydown', 'keyup', 'keypress']) removeEventListener(type, zenKeys, true);
    removeEventListener('focusin', zenFocus, true);
    removeEventListener('resize', zenResize);
    zenStyle.remove();
    zenFontStyle.remove();
    html.style.removeProperty('--am-zserif');
    for (const v of ['--am-zsx', '--am-zsans', '--am-zstroke', '--am-zwght']) html.style.removeProperty(v);
  };
  window.amZen = openZen;

  // a session that was running when the page was reloaded comes straight back
  { const z = readZen(); if (z && (z.until === 0 || z.until > Date.now())) startZen(z.until, z.start || Date.now()); }
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
  /* ---------- "What's new": a popup with the changes, after an update ---------- */
  // The version last seen is kept in localStorage ("am-seen-version"). When the script's VERSION (put in by build.mjs
  // from the manifest) is newer, the popup lists every version since then, once, a moment after the page has loaded.
  // Setting "Show what's new after an update" (Misc) turns it off; Misc > What's new opens the whole list any time.
  // CHANGELOG: newest first. An entry newer than VERSION is the next update, still being made: it shows only in the
  // whole list (marked "Next update"), never as a popup.
  const CHANGELOG = [
    { v: '1.9.3', date: '2026-11-12', title: 'Speed, volume and a settings backup', items: [
      'Possibly fixed: the progress bar and the time sometimes counted the songs before this one, after a new song started. If it still happens, please report it on GitHub: github.com/R1ftzy/r1ytm-player/issues',
      'Speed: 0.5× to 2× in Playback settings or in the 3-dot menu. Turn off Keep pitch for a nightcore / slowed sound. The 3-dot button shows the speed while it is not 1×',
      'The volume shows in % next to its slider. Scroll on the volume button to change it',
      'Misc > Backup: export every setting (with your font and background) to a file, and import it on another browser',
    ] },
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
  /* ---------- backup: export / import every setting as one file (settings "Misc" -> "Backup") ---------- */
  // The file is JSON: the settings (am-settings), the bar layout, the look (am-look: font, background, page dims...),
  // zen's last length, and the files the look uses (font, background image, gradient and its strokes) from IndexedDB
  // as base64. Import checks all of it first and changes nothing when the file is not valid.
  const BACKUP_FORMAT = 1;
  const BACKUP_FILES = ['font', 'bg-image', 'bg-gradient', 'grad-paint'];      // IndexedDB keys (see look.js)
  const BACKUP_MAX = 60 * 1024 * 1024;                                         // a bigger file is not ours
  let backupMsg = '';                         // the import result, shown in the panel built again after an import

  const toB64 = buf => {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = s => {
    const bin = atob(s), b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  // a stored file -> { kind, type, data }: the font is kept as an ArrayBuffer, the pictures as Blobs
  const packFile = async v => {
    if (v instanceof Blob) return { kind: 'blob', type: v.type || '', data: toB64(await v.arrayBuffer()) };
    if (v instanceof ArrayBuffer) return { kind: 'buffer', type: '', data: toB64(v) };
    if (ArrayBuffer.isView(v)) return { kind: 'buffer', type: '', data: toB64(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)) };
    return null;
  };
  const unpackFile = f => {
    if (!f || typeof f !== 'object' || typeof f.data !== 'string' || !/^(blob|buffer)$/.test(f.kind)) throw new Error('a file in it is damaged');
    const b = fromB64(f.data);
    return f.kind === 'blob' ? new Blob([b], { type: typeof f.type === 'string' ? f.type : '' }) : b.buffer;
  };

  const exportSettings = async note => {
    try {
      const files = {};
      for (const k of BACKUP_FILES) {
        let v = null;
        try { v = await idb.get(k); } catch {}
        const p = v ? await packFile(v) : null;
        if (p) files[k] = p;
      }
      const data = {
        app: 'r1ytm', format: BACKUP_FORMAT, version: VERSION, exported: new Date().toISOString(),
        settings: Object.assign({}, settings),
        layout: layoutNow,
        look: JSON.parse(JSON.stringify(look)),
        zenMinutes: zenMins(),
        files,
      };
      const name = 'r1ytm-settings-' + new Date().toISOString().slice(0, 10) + '.json';
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      const a = el('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (note) note.textContent = 'Saved ' + name;
    } catch (e) {
      console.warn('[am-bar] export failed', e);
      if (note) note.textContent = 'Export failed: ' + (e && e.message || e);
    }
  };

  // check the file and turn it into the values to apply; throws with a short reason when it is not valid
  const readBackup = text => {
    let d;
    try { d = JSON.parse(text); } catch { throw new Error('not a JSON file'); }
    if (!d || typeof d !== 'object' || d.app !== 'r1ytm') throw new Error('not an r1ytm settings file');
    if (typeof d.format !== 'number' || d.format > BACKUP_FORMAT) throw new Error('made by a newer r1ytm, update first');
    if (!d.settings || typeof d.settings !== 'object') throw new Error('it has no settings');
    // settings: every known key, a number in its range; a missing one goes back to its default
    const s = {};
    for (const def of SETTINGS) {
      if (!(def.key in d.settings)) { s[def.key] = def.def; continue; }
      const v = Number(d.settings[def.key]);
      if (!Number.isFinite(v)) throw new Error('the value of "' + (def.label || def.key) + '" is not a number');
      s[def.key] = Math.min(def.max, Math.max(def.min, v));
    }
    const layout = LAYOUTS.includes(d.layout) ? d.layout : 'full';
    // look: only the known keys, each of the same type as its default
    const lk = JSON.parse(JSON.stringify(LOOK_DEF));
    if (d.look && typeof d.look === 'object') {
      for (const k of Object.keys(LOOK_DEF)) {
        if (!(k in d.look)) continue;
        const v = d.look[k], def = LOOK_DEF[k];
        const ok = def === null ? v === null || typeof v === 'object'
          : typeof def === 'object' ? v && typeof v === 'object' && !Array.isArray(v)
          : typeof v === typeof def && (typeof v !== 'number' || Number.isFinite(v));
        if (!ok) throw new Error('the look value "' + k + '" is not valid');
        lk[k] = v;
      }
    }
    const zm = Number(d.zenMinutes);
    const files = {};
    if (d.files && typeof d.files === 'object') {
      for (const k of BACKUP_FILES) if (d.files[k]) {
        try { files[k] = unpackFile(d.files[k]); } catch (e) { throw new Error((e && e.message) || 'a file in it is damaged'); }
      }
    }
    return { settings: s, layout, look: lk, zenMinutes: Number.isFinite(zm) ? zm : null, files };
  };

  const importSettings = note => ui.file('.json,application/json', async f => {
    const say = t => { if (note) note.textContent = t; };
    try {
      if (f.size > BACKUP_MAX) throw new Error('the file is too big');
      const b = readBackup(await f.text());
      // the files first: if one can't be saved, nothing else changes
      for (const [k, v] of Object.entries(b.files)) await idb.set(k, v);
      const was = Object.assign({}, settings);
      Object.assign(settings, b.settings);
      applySettings();
      saveSettings();
      for (const s of SETTINGS) if (s.change && was[s.key] !== settings[s.key]) { try { s.change(); } catch {} }
      applyMode(b.layout);
      placeBar();
      hideBase();
      for (const k of Object.keys(look)) delete look[k];
      Object.assign(look, b.look);
      saveLook();
      if (fileFace) { document.fonts.delete(fileFace); fileFace = null; }      // a new font file: load it again
      applyFont();
      applyBg();
      applyBanner();
      applyArtist();
      if (b.zenMinutes !== null) store.set(ZEN_MIN_KEY, String(b.zenMinutes));
      // the panel built again with the new values; the note says it worked
      if (setEl) { backupMsg = 'Imported ' + f.name; rebuildSettings(); }
      else say('Imported ' + f.name);
    } catch (e) {
      console.warn('[am-bar] import failed', e);
      say('Not imported: ' + ((e && e.message) || e) + '. Nothing was changed');
    }
  });
  /* ---------- sync loop ---------- */
  let wasPaused = null, wasMuted = null, wasLiked = null, miniShowAt = 0, wasOpen = false, tick = 0;
  const timer = setInterval(() => {
    syncSpeed();                                          // also in zen: the speed stays what it is set to
    if (zenEl) return;                                    // zen covers everything: nothing here is visible, save the work
    // the settings panel covers the page: the page checks below (they measure the page, which is slow) wait, so the
    // panel stays smooth. The bar keeps updating, it is the live preview for the bar settings.
    const busy = !!setEl;
    if (!busy && performance.now() > animatingUntil) hideBase();   // skip layout-heavy work mid-animation
    if (tick++ % 4 === 0 && !busy) { syncGuideEntry(); syncBrand(); }   // sidebar entry, header logo: once a second is plenty
    if (tick % 4 === 2 && !busy && performance.now() > animatingUntil) sweepBg();   // custom background: clear new page backgrounds
    const pk = pageKey();                                 // another kind of page: its own dim / blur / header
    if (pk !== curPage) {
      html.classList.remove('am-page-' + curPage);
      curPage = pk;
      html.classList.add('am-page-' + curPage);
      applyBgVars();
      clearShade();
    }
    if (tick % 4 === 1 && !busy && curPage === 'artist') syncArtist();
    if (tick % 4 === 3 && !busy) roomForPlaying();        // room for the playing row's overlay
    placeBar();                                           // bottom / top, in or under the header
    syncSearch();
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
    { const v = video(); syncVinyl(idle ? '' : (m.artwork && m.artwork.length ? m.artwork[m.artwork.length - 1].src : ''), !v || v.paused); }

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
      const st = songTime(), pct = st ? (st.cur / st.dur) * 100 : 0;
      if (seeking === null) fill.style.width = pct + '%';
      if (formNow === 'rail') { drawRing(); setProgress(pct); }
      if (formNow === 'classic' || formNow === 'rail') {
        const tt = st ? mmss(st.cur) + ' / ' + mmss(st.dur) : '0:00 / 0:00';
        if (timeEl.textContent !== tt) timeEl.textContent = tt;
      }
      if (v.paused !== wasPaused) {
        wasPaused = v.paused;
        bar.classList.toggle('am-paused', v.paused);
        play.replaceChildren(svg(v.paused ? P.play : P.pause));
      }
      const muted = v.muted || getVolume() === 0;
      if (muted !== wasMuted) {
        wasMuted = muted;
        volBtn.replaceChildren(svg(muted ? P.mute : P.vol));
      }
    }
    if (document.activeElement !== volRange) volRange.value = String(getVolume());
    showVolPct();

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
    setVars.remove();
    posBase.remove();
    posStyle.remove();
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
      'am-side', 'am-side-in', 'am-side-float', 'am-side-full', 'am-brand-on');
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
    vinylOff();
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
})();
