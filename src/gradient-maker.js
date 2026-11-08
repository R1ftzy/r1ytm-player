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

