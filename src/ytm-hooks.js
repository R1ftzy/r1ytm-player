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

