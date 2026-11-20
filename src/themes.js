  /* ---------- theme presets (settings page "Look") ---------- */
  // A preset sets the glass (the bar and menu opacity / blur, refraction), the background and the font together. After
  // applying one, every value can be changed as usual. "Save current look" keeps the look as a preset of your own
  // (localStorage "am-presets"); its font, image or gradient file is copied into IndexedDB with it ("preset:<id>:<key>"),
  // so changing your background later doesn't change the preset. 2.0's color schemes are planned on this same format.
  const PRESET_SET = ['barAlpha', 'barBlur', 'menuAlpha', 'menuBlur', 'refract', 'refractStrength', 'barPos', 'barFloat'];
  const PRESET_LOOK = ['font', 'fontName', 'fontFile', 'fontScope', 'bg', 'bgColor', 'bgDim', 'bgBlur', 'bgImageName', 'grad'];
  const PRESET_FILES = ['font', 'bg-image', 'bg-gradient', 'grad-paint'];
  /* built-in presets: a whole setup each, the glass, the bar's place (pos 0 bottom, 1 top, 2 left, 3 right) and layout,
     a font, and a gradient. A gradient is kept as data, not as a picture: its base color, a few glows (dabs: x, y as
     a share of the screen, size as a share of its width, color, strength) and the gradient maker's effects. It is
     painted and rendered by the gradient maker's own engine (gmRender) when the preset is applied, and can then be
     edited in the maker like any gradient. pv: the font's kind, for the preview (nothing is downloaded for it). */
  const BUILTIN_PRESETS = [
    { id: 'aurora', name: 'Aurora', pos: 0, layout: 'compact', float: 1, font: 'Manrope', pv: 'system-ui, sans-serif',
      set: { barAlpha: 16, barBlur: 30, menuAlpha: 70, menuBlur: 44, refract: 0 },
      grad: { base: '#04060d', dabs: [[.18, .82, .75, '#00c7be', .55], [.55, .35, .6, '#34c759', .38], [.86, .18, .7, '#5856d6', .55], [.5, 1, .55, '#30b0ff', .35]],
        fx: { mix: 60, sat: 130, bri: 100, bloom: 35, grain: 12, vig: 30, glass: 'none' } } },
    { id: 'sunset', name: 'Sunset', pos: 1, layout: 'full', float: 1, font: 'Inter', pv: 'system-ui, sans-serif',   // Inter: the closest Google font to SF Pro
      set: { barAlpha: 22, barBlur: 34, menuAlpha: 72, menuBlur: 44, refract: 0 },
      grad: { base: '#120814', dabs: [[.15, .22, .65, '#ff9500', .55], [.5, .58, .7, '#ff2d55', .5], [.9, .82, .7, '#af52de', .5], [.78, .12, .4, '#ffcc00', .3]],
        fx: { mix: 55, sat: 125, bri: 100, bloom: 30, grain: 10, vig: 25, glass: 'reeded', glassSize: 35 } } },
    { id: 'nebula', name: 'Nebula', pos: 2, layout: 'compact', float: 1, font: 'Space Grotesk', pv: 'system-ui, sans-serif',
      set: { barAlpha: 24, barBlur: 36, menuAlpha: 76, menuBlur: 48, refract: 0 },
      grad: { base: '#04030c', dabs: [[.3, .3, .55, '#5856d6', .6], [.72, .62, .6, '#ff6ec7', .45], [.45, .88, .45, '#007aff', .45], [.88, .14, .35, '#af52de', .4]],
        fx: { mix: 45, sat: 140, bri: 100, bloom: 45, grain: 18, vig: 40, glass: 'none' } } },
    { id: 'candy', name: 'Candy', pos: 1, layout: 'compact', float: 1, font: 'Pixelify Sans', pv: 'ui-monospace, monospace',
      set: { barAlpha: 26, barBlur: 32, menuAlpha: 76, menuBlur: 44, refract: 0 },
      grad: { base: '#1a0f1f', dabs: [[.2, .3, .7, '#ff6ec7', .45], [.82, .38, .7, '#ff2d55', .35], [.5, .88, .7, '#ff8fab', .4], [.92, .92, .5, '#d6214f', .3]],
        fx: { mix: 65, sat: 105, bri: 110, bloom: 30, grain: 6, vig: 15, glass: 'frosted' } } },
    { id: 'ember', name: 'Ember', pos: 0, layout: 'classic', float: 0, font: 'JetBrains Mono', pv: 'ui-monospace, monospace',
      set: { barAlpha: 40, barBlur: 24, menuAlpha: 84, menuBlur: 32, refract: 0 },
      grad: { base: '#0a0303', dabs: [[.5, 1.02, .95, '#ff5e3a', .55], [.18, .92, .5, '#ff2d55', .4], [.82, .96, .5, '#ff9500', .4]],
        fx: { mix: 55, sat: 130, bri: 100, bloom: 40, grain: 20, vig: 45, glass: 'waves', glassSize: 40 } } },
    { id: 'default', name: 'Default', pos: 0, layout: 'full', float: 1, font: '', pv: '',
      set: { barAlpha: 28, barBlur: 28, menuAlpha: 72, menuBlur: 40, refract: 0 }, grad: null },
  ];
  // the glows of a built-in gradient, painted on a layer the size the gradient maker uses (1024 wide, the screen's shape)
  const glowDab = (ctx, x, y, size, color, alpha, hard = .2) => {
    const r = size / 2, [R, G, B] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${R},${G},${B},${alpha})`);
    gr.addColorStop(hard, `rgba(${R},${G},${B},${alpha})`);
    gr.addColorStop(hard + (1 - hard) * .5, `rgba(${R},${G},${B},${alpha * .35})`);
    gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const paintGrad = (gr, w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (const [px, py, sz, col, al] of gr.dabs) glowDab(x, px * w, py * h, sz * w, col, al);
    return c;
  };
  const gradOf = gr => Object.assign({}, GRAD_DEF, { base: gr.base }, gr.fx);
  const userPresets = (() => { try { const a = JSON.parse(store.get('am-presets', '[]')); return Array.isArray(a) ? a : []; } catch { return []; } })();
  const savePresets = () => store.set('am-presets', JSON.stringify(userPresets));
  const presetFileKey = (id, k) => `preset:${id}:${k}`;

  const applyPreset = async pr => {
    const builtin = !!pr.grad || pr.id === 'default';
    // a user preset's files first (into the slots the look reads), so the look can use them at once
    if (pr.files) for (const k of pr.files) {
      try { const v = await idb.get(presetFileKey(pr.id, k)); if (v) await idb.set(k, v); } catch {}
    }
    const was = Object.assign({}, settings);
    const set = Object.assign({}, pr.set, builtin ? { barPos: pr.pos, barFloat: pr.float } : {});
    for (const k of PRESET_SET) if (k in set) {
      const s = SETTINGS.find(x => x.key === k);
      settings[k] = Math.min(s.max, Math.max(s.min, Number(set[k]) || 0));
    }
    if (!canRefract) settings.refract = was.refract;      // refraction needs Chromium: leave it as it is elsewhere
    applySettings();
    saveSettings();
    for (const s of SETTINGS) if (s.change && was[s.key] !== settings[s.key]) { try { s.change(); } catch {} }
    if (LAYOUTS.includes(pr.layout)) { applyMode(pr.layout); placeBar(); hideBase(); }
    if (builtin) {
      Object.assign(look, pr.font ? { font: 'google', fontName: pr.font } : { font: 'default', fontName: '' });
      // the gradient presets hide the page banners, so the gradient shows at the top of pages too (Default: banners back)
      look.hideBanner = pr.grad ? 1 : 0;
      applyBanner();
      if (pr.grad) {
        const PW = 1024, PH = Math.max(1, Math.round(PW * innerHeight / innerWidth));
        try { await saveGradientBg(paintGrad(pr.grad, PW, PH), gradOf(pr.grad)); }
        catch (e) { console.warn('[am-bar] preset gradient failed', e); }
      } else { look.bg = 'default'; saveLook(); applyBg(); }
    } else {
      const lk = Object.assign({}, pr.look);
      if (!('fontScope' in lk)) lk.fontScope = look.fontScope;
      Object.assign(look, lk);
      applyBg();
    }
    saveLook();
    if (fileFace) { document.fonts.delete(fileFace); fileFace = null; }
    applyFont();
    toast('Look: ' + pr.name);
  };
  const saveCurrentPreset = async name => {
    const id = Date.now().toString(36);
    const pr = { id, name: name.trim().slice(0, 40) || 'My look', layout: layoutNow, set: {}, look: {}, files: [] };
    for (const k of PRESET_SET) pr.set[k] = settings[k];
    for (const k of PRESET_LOOK) pr.look[k] = JSON.parse(JSON.stringify(look[k] === undefined ? null : look[k]));
    const needs = [look.font === 'file' && 'font', look.bg === 'image' && 'bg-image', look.bg === 'gradient' && 'bg-gradient',
      look.bg === 'gradient' && 'grad-paint'].filter(Boolean);
    for (const k of needs) {
      try { const v = await idb.get(k); if (v) { await idb.set(presetFileKey(id, k), v); pr.files.push(k); } } catch {}
    }
    userPresets.push(pr);
    savePresets();
    return pr;
  };
  const deletePreset = async pr => {
    const i = userPresets.indexOf(pr);
    if (i >= 0) userPresets.splice(i, 1);
    savePresets();
    for (const k of pr.files || []) { try { await idb.set(presetFileKey(pr.id, k), null); } catch {} }
  };

  // the presets' gradient previews: drawn one per frame after the panel shows, not while it is built (drawing all 6 was
  // most of the time the panel took to open: 14-28 ms of 20-49)
  const thQueue = [];
  let thRaf = 0;
  const thPreview = (c, grad) => {
    thQueue.push([c, grad]);
    if (!thRaf) thRaf = requestAnimationFrame(thNext);
  };
  const thNext = () => {
    thRaf = 0;
    const job = thQueue.shift();
    if (!job) return;
    const [c, grad] = job;
    if (c.isConnected) { try { gmRender(c.getContext('2d'), 240, 150, paintGrad(grad, 240, 150), gradOf(grad)); } catch {} }
    if (thQueue.length) thRaf = requestAnimationFrame(thNext);
  };
  // the "Look" page of the settings (built by openSettings, before Font / Background)
  const buildThemeSettings = p => {
    el('div', 'am-set-group', p).textContent = 'Look';
    el('div', 'am-set-subhead', p).textContent = 'Presets';
    const card = el('div', 'am-set-card am-th-card', p);
    const grid = el('div', 'am-th-grid', card);
    const tile = (pr, mine) => {
      const t = el('button', 'am-th', grid);
      t.title = 'Apply “' + pr.name + '”';
      const pv = el('div', 'am-th-pv', t);
      if (pr.grad) {
        // the gradient itself, rendered small with the maker's engine (2x for sharp screens)
        const c = el('canvas', 'am-th-cv', pv);
        c.width = 240; c.height = 150;
        thPreview(c, pr.grad);
      } else if (mine && (pr.look.bg === 'image' || pr.look.bg === 'gradient')) {
        idb.get(presetFileKey(pr.id, pr.look.bg === 'image' ? 'bg-image' : 'bg-gradient')).then(b => {
          if (b) { const u = URL.createObjectURL(b); pv.style.backgroundImage = `url("${u}")`; setTimeout(() => URL.revokeObjectURL(u), 60000); }
        }).catch(() => {});
        pv.style.backgroundColor = '#2b2140';
      } else pv.style.backgroundColor = mine && pr.look.bg === 'color' ? pr.look.bgColor : '#0f0f0f';
      // the bar, where the preset puts it, in its layout and glass
      const pos = ['bottom', 'top', 'left', 'right'][pr.pos ?? (pr.set && pr.set.barPos) ?? 0] || 'bottom';
      const lay = pr.layout || 'full', fl = pr.float ?? (pr.set && pr.set.barFloat) ?? 1;
      const mb = el('div', `am-th-bar am-th-${pos} am-th-${lay}${fl ? '' : ' am-th-dock'}`, pv);
      mb.style.background = `rgb(40 40 40 / ${((pr.set && pr.set.barAlpha) ?? 28) / 100 + .1})`;
      const aa = el('span', 'am-th-aa', mb);
      aa.textContent = 'Aa';
      if (pr.pv) aa.style.fontFamily = pr.pv;
      el('div', 'am-th-name', t).textContent = pr.name;
      t.addEventListener('click', async () => {
        t.classList.add('am-th-busy');
        await applyPreset(pr);
        rebuildSettings();
      });
      if (mine) {
        const x = el('span', 'am-th-del', t);
        x.title = 'Delete this preset';
        x.append(svg(P_CLOSE));
        x.addEventListener('click', async e => { e.stopPropagation(); await deletePreset(pr); rebuildSettings(); });
      }
    };
    BUILTIN_PRESETS.forEach(pr => tile(pr, false));
    userPresets.forEach(pr => tile(pr, true));
    // save the current look
    const row = el('div', 'am-set-row am-set-inline am-th-save', card);
    const inp = el('input', 'am-set-input', row);
    inp.placeholder = 'Name for the current look';
    inp.maxLength = 40;
    const save = el('button', 'am-set-btn am-set-soft', row);
    save.textContent = 'Save current look';
    const doSave = async () => { await saveCurrentPreset(inp.value || 'My look ' + (userPresets.length + 1)); rebuildSettings(); };
    save.addEventListener('click', doSave);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });
    el('div', 'am-set-note am-th-note', card).textContent = "A preset sets the background, the bar's place and layout, the glass and the font. Change anything after applying it; a preset's gradient can be edited under Background.";
    // art
    el('div', 'am-set-subhead', p).textContent = 'Art';
    const aCard = el('div', 'am-set-card', p);
    ui.toggle(aCard, 'High-quality art', () => settings.hqArt, v => { settings.hqArt = v; saveSettings(); syncHqArt(); });
    const an = el('div', 'am-set-note', aCard);
    an.textContent = 'Sharper art on the player page, in the queue and in lists. Uses more data';
    an.style.margin = '-4px 0 10px';
    ui.toggle(aCard, 'Art circle', () => settings.artCircle, v => { settings.artCircle = v; saveSettings(); syncCircle(acSrc); });
    const cn = el('div', 'am-set-note', aCard);
    cn.textContent = 'Player page: the bar bounces, then the blurred art grows out of it in a circle, spins slowly and colors the whole window';
    cn.style.margin = '-4px 0 10px';
    // animations (helpers.js: motionK, dur(), motionCss(); applySettings sets them). The speed is dimmed while they are off
    el('div', 'am-set-subhead', p).textContent = 'Animations';
    const mCard = el('div', 'am-set-card', p);
    let speedRow = null, mRaf = 0;
    const dimSpeed = () => { if (speedRow) speedRow.classList.toggle('am-set-dim', !settings.anim); };
    // the notes go inside their rows, as the panel's own rows have them (the label and note in a text column beside the
    // switch; under a slider), so the rows keep the panel's spacing and the line between them
    const tRow = ui.toggle(mCard, 'Animations', () => settings.anim, v => { settings.anim = v; applySettings(); saveSettings(); dimSpeed(); });
    const lt = el('div', 'am-set-ltext');
    tRow.prepend(lt);
    lt.append(tRow.querySelector('.am-set-label'));
    el('div', 'am-set-note', lt).textContent = 'Off: menus, the player page and the bar change at once, and the spinning art stands still. Also off when your system is set to reduce motion';
    speedRow = ui.range(mCard, 'Animation speed', 50, 300, 10, '%', () => settings.animSpeed, v => {
      settings.animSpeed = v;
      saveSettings();
      if (!mRaf) mRaf = requestAnimationFrame(() => { mRaf = 0; applySettings(); });   // once a frame while dragging
    }, v => fmtSpeed(v / 100));
    el('div', 'am-set-note', speedRow).textContent = 'Higher is faster';
    dimSpeed();
  };

  const themeStyle = el('style', null, document.head);
  themeStyle.textContent = `
    .am-th-card { padding: 12px 14px; }
    .am-th-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .am-th { all: unset; position: relative; cursor: pointer; border-radius: 12px; padding: 6px; background: rgb(255 255 255 / .04);
      transition: background .15s; }
    .am-th:hover, .am-th:focus-visible { background: rgb(255 255 255 / .1); }
    .am-th-pv { position: relative; height: 75px; border-radius: 8px; overflow: hidden; background: center / cover no-repeat;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / .08); }
    .am-th-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    /* the mini bar */
    .am-th-bar { position: absolute; display: flex; align-items: center; justify-content: center; box-sizing: border-box;
      border: 1px solid rgb(255 255 255 / .16); border-radius: 6px; backdrop-filter: blur(4px); }
    .am-th-bottom, .am-th-top { left: 6px; right: 6px; height: 16px; }
    .am-th-bottom { bottom: 5px; } .am-th-top { top: 5px; }
    .am-th-bottom.am-th-compact, .am-th-top.am-th-compact { left: 22%; right: 22%; }
    .am-th-left, .am-th-right { top: 6px; bottom: 6px; width: 14px; }
    .am-th-left { left: 5px; } .am-th-right { right: 5px; }
    .am-th-left.am-th-compact, .am-th-right.am-th-compact { top: 20%; bottom: 8%; }
    .am-th-dock.am-th-bottom { left: 0; right: 0; bottom: 0; border-radius: 0; border-width: 1px 0 0; }
    .am-th-dock.am-th-top { left: 0; right: 0; top: 0; border-radius: 0; border-width: 0 0 1px; }
    .am-th-left .am-th-aa, .am-th-right .am-th-aa { display: none; }
    .am-th-aa { font-size: 10px; font-weight: 700; color: #fff; }
    .am-th.am-th-busy { opacity: .6; pointer-events: none; }
    .am-th-name { font-size: 12.5px; margin: 6px 2px 1px; color: rgb(255 255 255 / .85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-th-del { position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center;
      background: rgb(0 0 0 / .55); opacity: 0; transition: opacity .15s; }
    .am-th:hover .am-th-del { opacity: 1; }
    .am-th-del svg { width: 14px; height: 14px; fill: #fff; }
    .am-th-save { margin-top: 12px; border-top: 1px solid rgb(255 255 255 / .07); padding-top: 12px; }
    .am-th-save .am-set-input { flex: 1; min-width: 0; }
    .am-th-note { margin-top: 8px; }
  `;
