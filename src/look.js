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

