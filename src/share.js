  /* ---------- share: copy links that embed well (Discord and others), and a small note ("toast") at the bar ---------- */
  // A music.youtube.com link shows a poor preview in Discord. A www.youtube.com link plays inline there, and Koutube
  // (koutube.com, a third-party service) shows a richer preview: https://github.com/iGerman00/koutube
  // "Copy link" is in the bar's 3-dot menu and in YTM's song-row menus (songs, albums, playlists, artists).

  /* the toast: one line of text on the page side of the bar, for a moment */
  const toastEl = el('div', 'am-toast');
  toastEl.setAttribute('role', 'status');
  let toastT = 0;
  // act: { label, run } adds a button (e.g. YTM's "Undo"); the toast then stays longer and that button can be clicked
  const toast = (text, act) => {
    toastEl.textContent = text;
    if (act && act.label) {
      const b = el('button', 'am-toast-act', toastEl);
      b.textContent = act.label;
      b.addEventListener('click', e => { e.stopPropagation(); act.run(); toastEl.classList.remove('am-toast-in'); toastEl.classList.add('am-toast-out'); });
    }
    if (!toastEl.isConnected) document.body.append(toastEl);
    const e = barEdge();
    toastEl.style.cssText = '';
    if (!e || isMobile()) { toastEl.style.left = '50%'; toastEl.style.bottom = '24px'; toastEl.style.translate = '-50% 0'; }
    else if (e.side === 'bottom' || e.side === 'top') {
      const r = bar.getBoundingClientRect();
      toastEl.style.left = (r.left + r.width / 2) + 'px';
      toastEl.style.translate = '-50% 0';
      if (e.side === 'bottom') toastEl.style.bottom = (innerHeight - e.at + 10) + 'px'; else toastEl.style.top = (e.at + 10) + 'px';
    } else {
      toastEl.style.top = '50%';
      toastEl.style.translate = '0 -50%';
      if (e.side === 'left') toastEl.style.left = (e.at + 10) + 'px'; else toastEl.style.right = (innerWidth - e.at + 10) + 'px';
    }
    toastEl.classList.remove('am-toast-out');
    toastEl.classList.add('am-toast-in');
    clearTimeout(toastT);
    toastT = setTimeout(() => { toastEl.classList.remove('am-toast-in'); toastEl.classList.add('am-toast-out'); }, act ? 4500 : 1800);
  };

  /* YouTube Music's own toasts ("Saved to liked music", "Added to queue"...) are hidden. A like gets a small bounce of
     the heart instead; any other one is shown as our toast at the bar, with its button if it has one ("Undo"). */
  const bounceHeart = () => {
    likeBtn.classList.remove('am-bounce');
    void likeBtn.offsetWidth;                  // restart the animation
    likeBtn.classList.add('am-bounce');
  };
  let ytToastKey = '';
  const syncYtToast = () => {
    const t = [...document.querySelectorAll('tp-yt-paper-toast')].find(n => n.classList.contains('paper-toast-open') || n.opened);
    if (!t) { ytToastKey = ''; return; }
    const tx = n => n ? n.textContent.trim().replace(/\s+/g, ' ') : '';
    const text = [tx(t.querySelector('#text')), tx(t.querySelector('#sub-text'))].filter(Boolean).join(' · ') || tx(t.querySelector('#label'));
    if (!text || text === ytToastKey) return;
    ytToastKey = text;
    if (performance.now() - lastLikeAt < 4000) return;            // a like: the heart's bounce says it
    const ab = t.querySelector('#action-button button, #action-button tp-yt-paper-button');
    const label = ab && !ab.closest('[hidden]') ? tx(ab) : '';
    toast(text, label ? { label, run: () => ab.click() } : null);
  };

  /* the clipboard: the async API (works inside a click or a key press), else the old copy command */
  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const t = el('textarea');
    t.value = text;
    t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    t.remove();
    return ok;
  };

  /* what a link points at: { kind: 'song' | 'playlist' | 'album' | 'artist', id, list?, title, sub }
     song: id = the video id. playlist: id = the list id. album: id = the MPRE browse id, list = its OLAK5uy… playlist
     (YouTube has no album pages, so the YouTube link opens the album as a playlist). artist: id = the UC… channel id. */
  const deepFind = (o, test, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 14) return null;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && test(k, v)) return v;
      if (v && typeof v === 'object') { const r = deepFind(v, test, depth + 1); if (r) return r; }
    }
    return null;
  };
  const albumList = o => deepFind(o, (k, v) => k === 'playlistId' && /^OLAK5uy_/.test(v));
  // from a navigation endpoint (YTM's data for a link)
  const fromEndpoint = (ep, data) => {
    if (!ep) return null;
    const w = ep.watchEndpoint, b = ep.browseEndpoint, wp = ep.watchPlaylistEndpoint;
    if (w && w.videoId) return { kind: 'song', id: w.videoId };
    if (wp && wp.playlistId) return { kind: 'playlist', id: wp.playlistId };
    if (b && b.browseId) {
      const id = b.browseId;
      if (/^MPRE/.test(id)) return { kind: 'album', id, list: albumList(data) };
      if (/^VL/.test(id)) return { kind: 'playlist', id: id.slice(2) };
      if (/^UC/.test(id)) return { kind: 'artist', id };
    }
    return null;
  };
  const runText = t => t ? (t.runs ? t.runs.map(r => r.text).join('') : t.simpleText || '') : '';
  // the target of a song row / card / queue item, from YTM's data on it (links first, they say what the row opens)
  const rowTarget = row => {
    const d = row && row.data;
    if (!d) return null;
    const title = runText(d.title) ||
      runText(((d.flexColumns || [])[0] || {}).musicResponsiveListItemFlexColumnRenderer && d.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text);
    const sub = runText(d.shortBylineText || d.longBylineText || d.subtitle) ||
      runText(((d.flexColumns || [])[1] || {}).musicResponsiveListItemFlexColumnRenderer && d.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text);
    let t = null;
    if (d.videoId) t = { kind: 'song', id: d.videoId };
    if (!t) {
      const fc0 = d.flexColumns && d.flexColumns[0] && d.flexColumns[0].musicResponsiveListItemFlexColumnRenderer;
      const run0 = fc0 && fc0.text && fc0.text.runs && fc0.text.runs[0];
      t = fromEndpoint(run0 && run0.navigationEndpoint, d) || fromEndpoint(d.navigationEndpoint, d) ||
        fromEndpoint(d.title && d.title.runs && d.title.runs[0] && d.title.runs[0].navigationEndpoint, d);
    }
    if (!t && d.playlistItemData && d.playlistItemData.videoId) t = { kind: 'song', id: d.playlistItemData.videoId };
    if (!t) return null;
    return Object.assign(t, { title: title.trim(), sub: sub.trim() });
  };
  // a page header (album / playlist / artist page): from the address, with the album's playlist from the header data
  const pageTarget = header => {
    const p = location.pathname, qs = new URLSearchParams(location.search);
    const title = (document.title || '').replace(/\s*-\s*YouTube Music\s*$/, '');
    if (p === '/playlist' && qs.get('list')) return { kind: 'playlist', id: qs.get('list'), title, sub: '' };
    let m = p.match(/^\/browse\/(MPRE[\w-]+)/);
    if (m) return { kind: 'album', id: m[1], list: albumList(header && header.data) || albumList(document.querySelector('ytmusic-browse-response') && document.querySelector('ytmusic-browse-response').data), title, sub: '' };
    m = p.match(/^\/(?:channel|browse)\/(UC[\w-]+)/);
    if (m) return { kind: 'artist', id: m[1], title, sub: '' };
    return null;
  };
  // the target of one of YTM's menus, from the button (or right-click) that opened it
  const menuTarget = node => {
    const row = node && node.closest && node.closest(ROWS);
    if (!row) return null;
    if (/header|card-shelf/.test(row.tagName.toLowerCase())) return pageTarget(row) || rowTarget(row);
    return rowTarget(row);
  };
  // the song playing now (the bar's own menu)
  const nowTarget = () => {
    const id = curVideoId();
    if (!id) return null;
    const m = navigator.mediaSession.metadata;
    return { kind: 'song', id, title: (m && m.title) || '', sub: (m && m.artist) || '', img: art.src || '' };
  };

  /* the formats. at: seconds to start at (songs only), or 0 */
  const COPY_FORMATS = [
    { key: 'youtube', label: 'YouTube', note: 'Plays in Discord' },
    { key: 'music', label: 'YouTube Music', note: 'music.youtube.com' },
    { key: 'short', label: 'Short link', note: 'youtu.be' },
    { key: 'koutube', label: 'Koutube', note: 'Richer preview' },
    { key: 'markdown', label: 'Markdown', note: '[Title](link)' },
  ];
  const linkFor = (t, fmt, at = 0) => {
    const id = encodeURIComponent(t.id);
    const tq = at > 0 ? Math.floor(at) : 0;
    if (fmt === 'markdown') {
      const name = [t.title, t.sub].filter(Boolean).join(' – ').replace(/[[\]]/g, '') || 'Link';
      return `[${name}](${linkFor(t, 'youtube', at)})`;
    }
    if (t.kind === 'song') {
      const time = (sep) => tq ? `${sep}t=${tq}` : '';
      if (fmt === 'music') return `https://music.youtube.com/watch?v=${id}${time('&')}`;
      if (fmt === 'short') return `https://youtu.be/${id}${time('?')}`;
      if (fmt === 'koutube') return `https://music.koutube.com/watch?v=${id}${time('&')}`;
      return `https://www.youtube.com/watch?v=${id}${time('&')}`;
    }
    if (t.kind === 'playlist') {
      if (fmt === 'music') return `https://music.youtube.com/playlist?list=${id}`;
      if (fmt === 'koutube') return `https://music.koutube.com/playlist?list=${id}`;
      return `https://www.youtube.com/playlist?list=${id}`;
    }
    if (t.kind === 'album') {
      const list = t.list ? encodeURIComponent(t.list) : '';
      if (fmt === 'music' || !list) return `https://music.youtube.com/browse/${id}`;
      if (fmt === 'koutube') return `https://music.koutube.com/playlist?list=${list}`;
      return `https://www.youtube.com/playlist?list=${list}`;
    }
    if (t.kind === 'artist') {
      if (fmt === 'music') return `https://music.youtube.com/channel/${id}`;
      if (fmt === 'koutube') return `https://koutube.com/channel/${id}`;
      return `https://www.youtube.com/channel/${id}`;
    }
    return '';
  };
  const defaultFormat = () => (COPY_FORMATS[settings.copyFormat] || COPY_FORMATS[0]).key;
  const copyLink = async (t, fmt = defaultFormat(), at = 0) => {
    const link = t && linkFor(t, fmt, at);
    if (!link) { toast('No link for this'); return false; }
    // the first Koutube link: say it is a third-party service first (until "Don't show this again")
    if (fmt === 'koutube' && !settings.koutubeOk) return koutubeNotice(() => copyLink(t, fmt, at));
    const ok = await copyText(link);
    toast(ok ? 'Link copied' + (fmt === 'youtube' || fmt === 'markdown' ? '' : ' (' + (COPY_FORMATS.find(f => f.key === fmt) || {}).label + ')') : 'Could not copy the link');
    return ok;
  };
  /* the Koutube notice: a small dialog with the same look as the settings. Copy (inside its click, so the clipboard
     works) or Cancel; "Don't show this again" is kept in the settings (koutubeOk) */
  const KOUTUBE_REPO = 'https://github.com/iGerman00/koutube';
  let kNoticeEl = null;
  const koutubeNotice = onCopy => new Promise(res => {
    if (kNoticeEl) { res(false); return; }
    closeMenu();
    const back = el('div', 'am-set-back am-kn-back', document.body);
    const p = el('div', 'am-set am-kn', back);
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Koutube link');
    const head = el('div', 'am-set-head', p);
    const ic = el('div', 'am-kn-icon', head);
    ic.append(svg(FORMAT_ICONS.koutube));
    el('div', 'am-set-title', el('div', 'am-set-htext', head)).textContent = 'Koutube link';
    const tx = el('div', 'am-kn-text', p);
    tx.append('Koutube is a third-party service, not part of r1ytm or YouTube. It makes the link show a richer preview in Discord. Anyone who opens the link connects to Koutube. ');
    const a = el('a', 'am-kn-link', tx);
    a.href = KOUTUBE_REPO;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Koutube on GitHub';
    const lab = el('label', 'am-kn-check', p);
    const cb = el('input', null, lab);
    cb.type = 'checkbox';
    lab.append("Don't show this again");
    const foot = el('div', 'am-set-foot', p);
    const cancel = el('button', 'am-set-btn', foot);
    cancel.textContent = 'Cancel';
    const ok = el('button', 'am-set-btn am-set-primary', foot);
    ok.textContent = 'Copy link';
    const close = r => {
      if (!kNoticeEl) return;
      kNoticeEl = null;
      back.classList.add('am-set-out');
      setTimeout(() => back.remove(), dur(180));
      res(r);
    };
    ok.addEventListener('click', () => {
      if (cb.checked) { settings.koutubeOk = 1; saveSettings(); }
      close(true);
      onCopy();
    });
    cancel.addEventListener('click', () => close(false));
    back.addEventListener('click', e => { if (e.target === back) close(false); });
    back.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(false); });
    kNoticeEl = back;
    ok.focus({ preventScroll: true });
  });

  // the shortcut / command: the song playing now, in the default format
  const copyNowLink = () => copyLink(nowTarget());

  /* the menu row "Copy link": a click swaps the menu for a small popup of its own, a grid of icons, one per format
     (and "at <time>" for the song playing now), where the menu was. It stays on screen and scrolls if it must. */
  const P_LINK = 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z';
  const FORMAT_ICONS = {
    youtube: 'M21.58 7.19a2.5 2.5 0 00-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.5 2.5 0 00-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 001.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 001.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z',
    music: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM10 8.5v7l5.5-3.5L10 8.5z',
    short: P_LINK,
    // Koutube's links are for Discord: the Discord mark (Simple Icons, CC0)
    koutube: 'M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
    more: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    markdown: 'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
    time: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z',
  };
  // ytShare: YouTube Music's own share dialog (the "More" tile), when there is one
  const openCopyPopup = (t, withTime, ytShare) => {
    const old = menuEl, anchor = menuAnchor, trig = menuTrigger;
    const r0 = old ? old.getBoundingClientRect() : bar.getBoundingClientRect();
    closeMenu();
    if (!t) { toast('No link for this'); return; }
    // the song playing now: a "Start at <time>" switch under the grid (it applies to whichever link is copied), so
    // the grid is always the five formats + More: 3 x 2
    let at = 0;
    const st = withTime && songTime();
    const startAt = st && st.cur >= 1 ? Math.floor(st.cur) : 0;
    const tiles = COPY_FORMATS.map(f => ({ svg: svg(FORMAT_ICONS[f.key]), label: f.label === 'YouTube Music' ? 'YT Music' : f.label,
      run: () => copyLink(t, f.key, at) }));
    if (ytShare) tiles.push({ svg: svg(FORMAT_ICONS.more), label: 'More', run: () => ytShare() });
    const groups = [];
    if (startAt) {
      const row = { svg: svg(FORMAT_ICONS.time), label: 'Start at ' + mmss(startAt), keep: true };
      let sw = null;
      row.extra = b => { sw = el('span', 'am-set-switch am-menu-switch', b); };
      row.run = () => { at = at ? 0 : startAt; sw.classList.toggle('am-on', !!at); row.el.setAttribute('aria-checked', String(!!at)); };
      groups.push([row]);
    }
    const head = { title: 'Share', sub: [t.title, t.sub].filter(Boolean).join(' · '), img: t.img || '' };
    const place = m => {
      m.classList.add('am-copy-pop');
      m.style.maxHeight = (innerHeight - 16) + 'px';
      document.body.append(m);
      // the layout size (the popup opens from 92%, so its rect is smaller for a moment)
      const w = m.offsetWidth, h = m.offsetHeight;
      const left = Math.max(8, Math.min(innerWidth - w - 8, r0.left + r0.width / 2 - w / 2));
      const top = Math.max(8, Math.min(innerHeight - Math.min(h, innerHeight - 16) - 8, r0.top + r0.height / 2 - h / 2));
      m.style.left = left + 'px';
      m.style.top = top + 'px';
      m.style.transformOrigin = 'center';
    };
    buildMenu(anchor || moreBtn, { tiles, groups }, head, place);
    menuTrigger = trig;
    const row = menuEl && menuEl.querySelector('.am-menu-tiles');
    if (row) row.style.gridTemplateColumns = `repeat(${tiles.length > 4 ? 3 : tiles.length}, minmax(0, 1fr))`;
    const swRow = menuEl && menuEl.querySelector('.am-menu-switch');
    if (swRow) swRow.closest('.am-menu-item').setAttribute('role', 'menuitemcheckbox');
  };

  const shareStyle = el('style', null, document.head);
  shareStyle.textContent = `
    .am-toast { position: fixed; z-index: 100003; pointer-events: none; padding: 8px 14px; border-radius: 12px;
      font: 500 13px/1.3 var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif); color: #fff; white-space: nowrap;
      background: rgb(34 34 36 / .82); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgb(255 255 255 / .12); box-shadow: 0 10px 30px rgb(0 0 0 / .4); opacity: 0; }
    .am-toast.am-toast-in { animation: am-toast-in .22s cubic-bezier(.2, .9, .25, 1.05) forwards; }
    .am-toast.am-toast-out { opacity: 1; animation: am-toast-out .25s ease forwards; }
    @keyframes am-toast-in { from { opacity: 0; scale: .94; } to { opacity: 1; scale: 1; } }
    @keyframes am-toast-out { to { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .am-toast.am-toast-in { animation: none; opacity: 1; } }
    .am-copy-pop .am-menu-tiles { padding-bottom: 2px; }
    /* the Start at switch: the settings' switch, at the end of its row; the row isn't a quiet (last) group here */
    .am-menu-switch { margin-left: auto; pointer-events: none; scale: .85; }
    .am-copy-pop .am-menu-quiet .am-menu-row { height: calc(36px * var(--am-ms)); font-size: calc(13.5px * var(--am-ms)); color: rgb(255 255 255 / .92); }
    .am-kn-back { z-index: 100004; }
    .am-set.am-kn { width: min(380px, 100%); }
    .am-kn-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: #5865f2; }
    .am-kn-icon svg { width: 20px; height: 20px; fill: #fff; }
    .am-kn-text { font-size: 13.5px; line-height: 1.5; color: rgb(255 255 255 / .8); }
    .am-kn-link { color: #fa586a; text-decoration: none; font-weight: 600; white-space: nowrap; }
    .am-kn-link:hover { text-decoration: underline; }
    .am-kn-check { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: rgb(255 255 255 / .7); cursor: pointer; }
    .am-kn-check input { accent-color: #fa586a; width: 15px; height: 15px; margin: 0; }
    /* YTM's own toasts: ours instead (syncYtToast) */
    tp-yt-paper-toast { display: none !important; }
    .am-toast { display: flex; align-items: center; gap: 12px; }
    .am-toast-act { all: unset; pointer-events: auto; cursor: pointer; font-weight: 600; color: #fa586a; padding: 2px 4px; border-radius: 6px; }
    .am-toast-act:hover { background: rgb(255 255 255 / .1); }
    @keyframes am-bounce { 0% { scale: 1; } 35% { scale: 1.12; } 65% { scale: .97; } 100% { scale: 1; } }
    .am-like.am-bounce svg { animation: am-bounce .32s ease-out; }
    @media (prefers-reduced-motion: reduce) { .am-like.am-bounce svg { animation: none; } }
    .am-copy-pop .am-menu-tile .am-menu-label { white-space: nowrap; }
  `;
