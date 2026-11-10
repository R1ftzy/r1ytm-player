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

