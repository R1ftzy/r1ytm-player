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

