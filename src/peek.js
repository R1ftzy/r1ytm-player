  /* ---------- up-next peek: point at the next button and the bar flows out to show the next song ---------- */
  // The same motion as the rail's tape (title-links.js): a strip melts out of the bar's inner edge (toward the page),
  // level with the next button, as one piece of glass with the bar: one shape, one outline, one shadow, no join.
  // - The rail (left / right) already wears that shape all the time: the peek is a second strip of it (flowExtra).
  // - Every other bar (bottom, top, the sidebar card) wears its own copy of the shape only while the peek is out:
  //   the same path (flowPath), mapped onto that bar's side; the bar's own glass is off meanwhile (.am-skinned).
  // The next song comes from YTM's queue (it is in the page even while the player page is closed): the item after
  // the one marked "selected". YTM keeps the queue in play order, also with shuffle on. Repeat one: the same song.
  const PEEK_DELAY_MS = 300, PEEK_OPEN_MS = 600, PEEK_CLOSE_MS = 380;
  const PEEK_ALONG = 270, PEEK_OUT = 62;      // the strip: its size along the bar's edge, and how far it comes out
  const PEEK_ALONG_RAIL = 64, PEEK_OUT_RAIL = 270;   // on a rail it comes out sideways: long out, short along

  // the content: art, "Up next", title, artist; placed over the strip, faded in once the strip is out
  const peekEl = el('div', 'am-peek');
  peekEl.setAttribute('role', 'tooltip');
  const peekArt = el('img', 'am-peek-art', peekEl);
  peekArt.alt = '';
  const peekText = el('div', 'am-peek-text', peekEl);
  const peekHead = el('div', 'am-peek-head', peekText);
  const peekTitle = el('div', 'am-peek-title', peekText);
  const peekSub = el('div', 'am-peek-sub', peekText);
  // the shape for bars that aren't a rail (the same classes as the tape's, so the same glass, outline and shadow)
  const pFly = el('div', 'am-fly am-pfly', document.body);
  const pEdge = mkSvg('am-fly-edge');
  const pEdgeP = pEdge.firstChild;
  const pShade = el('div', 'am-fly-shade', document.body);
  const pShadeS = el('div', 'am-shade-s', el('div', 'am-shade-b', pShade));

  let peekT = 0, peekOn = false, peekRaf = 0, peekWait = 0, peekG = null;

  // the queue in play order, one row per entry: rows hidden inside the queue (the other version of a song / video
  // pair, which YTM keeps next to it) and rows not drawn are left out. Only a [hidden] inside the queue counts: on
  // the Lyrics / Related tab YTM hides the whole Up next panel (a [hidden] around the queue), and the rows are still
  // the queue, so the peek works on every tab
  const queueItems = () => {
    const page = playerPage();
    return [...(page || document).querySelectorAll('ytmusic-player-queue-item')].filter(n => {
      if (!n.data || getComputedStyle(n).display === 'none') return false;
      const h = n.closest('[hidden]'), q = n.closest('ytmusic-player-queue');
      return !h || !q || !q.contains(h);
    });
  };
  const itemInfo = n => {
    const d = n.data || {};
    const thumbs = (d.thumbnail && d.thumbnail.thumbnails) || [];
    return { title: runText(d.title), sub: runText(d.shortBylineText || d.longBylineText), img: thumbs.length ? thumbs[thumbs.length - 1].url : '' };
  };
  const nextSong = () => {
    const items = queueItems();
    // the row playing now: the one with the speaker icon (play state playing / paused); else the video playing now;
    // YTM's "selected" mark last (it can stay on another row, e.g. the one the queue was started from)
    const vid = curVideoId();
    let i = items.findIndex(n => /^(playing|paused|loading)$/.test(n.getAttribute('play-button-state') || ''));
    if (i < 0 && vid) i = items.findIndex(n => n.data.videoId === vid);
    if (i < 0) i = items.findIndex(n => n.hasAttribute('selected'));
    if (i < 0) return null;
    if (rep.classList.contains('am-one')) return Object.assign(itemInfo(items[i]), { head: 'Repeat one' });
    if (i + 1 < items.length) return Object.assign(itemInfo(items[i + 1]), { head: 'Up next' });
    if (rep.classList.contains('am-on') && items.length > 1) return Object.assign(itemInfo(items[0]), { head: 'Up next (repeat)' });
    return null;
  };

  // the strip in the shape's frame (x out from the bar's outer edge, y along it), at t (0 in, 1 out)
  const peekStrip = (g, t) => ({ cy: g.pcy, w: g.pOut * springy(t), h: g.h0p + (g.pAlong - g.h0p) * easeOut(clamp01(t * 1.4)),
    r: FLY_R + 22 * (1 - easeOut(t)), rc: g.R || FLY_RC });
  // where the strip goes along the edge: level with the next button, clear of the bar's corners
  const stripAt = (c, along, rb, R) => Math.max(R + FLY_R + along / 2, Math.min(rb - R - FLY_R - along / 2, c));

  // rail: the strip, in the rail's own shape (flyG's frame). Measured when the peek opens
  let railPeek = null;
  flowExtra = g => railPeek && peekT > 0 ? [peekStrip(Object.assign({}, railPeek, { R: g.R }), peekT)] : [];

  // other bars: measure the bar and set up the shape's box and map for its side
  const peekSetup = () => {
    const side = posNow, br = bar.getBoundingClientRect(), cs = getComputedStyle(bar);
    const vertical = side === 'left' || side === 'right';
    const Wr = vertical ? br.width : br.height, rb = vertical ? br.height : br.width;
    const R = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, Wr / 2);
    const pAlong = vertical ? PEEK_ALONG_RAIL : PEEK_ALONG, pOut = vertical ? PEEK_OUT_RAIL : PEEK_OUT;
    const depth = Wr + pOut + 40;                         // 40: room for the overshoot
    const nb = nextBtn.getBoundingClientRect();
    const c = vertical ? nb.top + nb.height / 2 - br.top : nb.left + nb.width / 2 - br.left;
    const pcy = stripAt(c, pAlong, rb, R);
    let box, map, flip;
    if (side === 'bottom') { box = { left: br.left, top: br.bottom - depth, width: br.width, height: depth }; map = (x, y) => [y, depth - x]; flip = false; }
    else if (side === 'top') { box = { left: br.left, top: br.top, width: br.width, height: depth }; map = (x, y) => [y, x]; flip = true; }
    else if (side === 'left') { box = { left: br.left, top: br.top, width: depth, height: br.height }; map = (x, y) => [x, y]; flip = false; }
    else { box = { left: br.right - depth, top: br.top, width: depth, height: br.height }; map = (x, y) => [depth - x, y]; flip = true; }
    // the sides with a border (a docked bar has them on some sides only, see flySetup)
    const bw = k => parseFloat(cs['border' + k + 'Width']) > 0;
    const S = { bottom: ['Bottom', 'Top', 'Left', 'Right'], top: ['Top', 'Bottom', 'Left', 'Right'],
      left: ['Left', 'Right', 'Top', 'Bottom'], right: ['Right', 'Left', 'Top', 'Bottom'] }[side];
    const sides = { outer: bw(S[0]), inner: bw(S[1]), top: bw(S[2]), bottom: bw(S[3]) };
    const g = { Wr, rb, R, map, flip, box, pcy, pAlong, pOut, h0p: 18, side,
      sides: sides.top && sides.bottom && sides.outer && sides.inner ? null : sides, shadow: !!settings.barFloat && !inHeader };
    for (const n of [pFly, pShade, pEdge]) Object.assign(n.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
    peekG = g;
  };
  // the content box: the strip's full size, in window pixels
  const placeContent = (g, ox, oy) => {
    const a = g.map(g.Wr, g.pcy - g.pAlong / 2), b = g.map(g.Wr + g.pOut, g.pcy + g.pAlong / 2);
    Object.assign(peekEl.style, { left: (ox + Math.min(a[0], b[0])) + 'px', top: (oy + Math.min(a[1], b[1])) + 'px',
      width: Math.abs(b[0] - a[0]) + 'px', height: Math.abs(b[1] - a[1]) + 'px' });
  };
  const peekDraw = t => {
    peekEl.style.opacity = String(clamp01((t - .45) / .35));
    if (formNow === 'rail') { if (flyG) flyDraw(flyT); return; }     // the rail's shape draws the strip (flowExtra)
    const g = peekG;
    if (!g) return;
    const st = peekStrip(g, t);
    const d = flowPath(g, [st]);
    pFly.style.clipPath = `path('${d}')`;
    pEdgeP.setAttribute('d', flowPath(g, [st], .5, g.sides));
    if (g.shadow) {
      pShadeS.style.clipPath = `path('${d}')`;
      pShade.style.clipPath = `path(evenodd, 'M-100 -100 H${(g.box.width + 100).toFixed(0)} V${(g.box.height + 140).toFixed(0)} H-100 Z ${d}')`;
    }
  };
  // the shape on / off (bars other than the rail): shown and shaped in the same frame as the bar's glass goes off
  const skinOn = on => {
    for (const n of [pFly, pEdge]) n.classList.toggle('am-fly-on', on);
    pShade.classList.toggle('am-fly-on', on && !!peekG && peekG.shadow);
    if (formNow !== 'rail') bar.classList.toggle('am-skinned', on);
  };
  const peekRun = (to, dur, done) => {
    cancelAnimationFrame(peekRaf);
    const from = peekT, t0 = performance.now();
    const step = now => {
      const k = clamp01((now - t0) / Math.max(1, dur));
      peekT = to > from ? from + (to - from) * k : from * (1 - easeInOut(k));
      peekDraw(peekT);
      if (k < 1) peekRaf = requestAnimationFrame(step);
      else { peekRaf = 0; if (done) done(); }
    };
    peekRaf = requestAnimationFrame(step);
  };
  const peekReset = () => {
    cancelAnimationFrame(peekRaf);
    peekRaf = 0; peekT = 0; peekOn = false; railPeek = null;
    skinOn(false);
    peekEl.remove();
    if (formNow === 'rail' && flyG) flyDraw(flyT);
  };
  const showPeek = () => {
    if (!settings.peek || peekOn || isMobile() || menuEl || bar.classList.contains('am-idle') ||
        bar.classList.contains('am-hidden') || bar.classList.contains('am-autohid')) return;
    const s = nextSong();
    if (!s || !s.title) return;
    peekHead.textContent = s.head;
    peekTitle.textContent = s.title;
    peekSub.textContent = s.sub;
    if (s.img) { peekArt.src = s.img; peekArt.hidden = false; } else peekArt.hidden = true;
    const rail = formNow === 'rail';
    if (rail && (!flyG || flyOn)) return;                // the tape is out: one strip at a time
    peekEl.classList.toggle('am-peek-side', rail || posNow === 'left' || posNow === 'right');
    if (!peekEl.isConnected) document.body.append(peekEl);
    peekEl.style.opacity = '0';
    if (peekT === 0) {
      if (rail) {
        const br = bar.getBoundingClientRect(), nb = nextBtn.getBoundingClientRect();
        railPeek = { pAlong: PEEK_ALONG_RAIL, pOut: PEEK_OUT_RAIL, h0p: 18,
          pcy: stripAt(nb.top + nb.height / 2 - br.top, PEEK_ALONG_RAIL, flyG.rb, flyG.R) };
        Object.assign(railPeek, { cy: railPeek.pcy });
        const fb = fly.getBoundingClientRect();
        placeContent(Object.assign({}, railPeek, { Wr: flyG.Wr, map: flyG.map }), fb.left, fb.top);
      } else {
        peekSetup();
        placeContent(peekG, peekG.box.left, peekG.box.top);
        skinOn(true);
      }
    }
    peekOn = true;
    peekDraw(peekT);
    if (reduceMotion.matches) { peekT = 1; peekDraw(1); return; }
    peekRun(1, dur(PEEK_OPEN_MS * (1 - peekT * .6)));
  };
  const hidePeek = now => {
    clearTimeout(peekWait);
    if (!peekOn && peekT === 0) return;
    peekOn = false;
    if (now === true || reduceMotion.matches) { peekReset(); return; }
    peekRun(0, dur(PEEK_CLOSE_MS * Math.max(.4, peekT)), () => { if (!peekOn) peekReset(); });
  };
  nextBtn.addEventListener('pointerenter', e => {
    if (e.pointerType === 'touch') return;
    clearTimeout(peekWait);
    peekWait = setTimeout(showPeek, PEEK_DELAY_MS);
  });
  nextBtn.addEventListener('pointerleave', () => hidePeek());
  // a click skips the song: the strip goes in, and comes back with the new next song if the pointer stays
  nextBtn.addEventListener('click', () => {
    hidePeek(true);
    peekWait = setTimeout(() => { if (nextBtn.matches(':hover')) showPeek(); }, 900);
  });
  // the bar moved, changed form or hid: the strip goes at once (it is measured for where the bar was)
  let peekKey = '';
  const syncPeek = () => {
    const r = bar.getBoundingClientRect();
    const key = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), posNow, formNow,
      bar.classList.contains('am-hidden'), bar.classList.contains('am-autohid')].join();
    if (key !== peekKey) { peekKey = key; if (peekOn || peekT > 0) hidePeek(true); }
  };

  const peekStyle = el('style', null, document.head);
  peekStyle.textContent = `
    .am-pfly { z-index: 99998; }
    .am-peek { position: fixed; z-index: 100000; box-sizing: border-box; display: flex; align-items: center; gap: 10px;
      padding: 0 16px; color: #fff; pointer-events: none; opacity: 0;
      font-family: var(--am-font, "Switzer", "SF Pro", system-ui, sans-serif); }
    .am-peek-art { width: 42px; height: 42px; border-radius: 7px; object-fit: cover; flex-shrink: 0; background: rgb(255 255 255 / .08); }
    .am-peek-art[hidden] { display: none; }
    .am-peek-text { min-width: 0; }
    .am-peek-head { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgb(255 255 255 / .5); }
    .am-peek-title, .am-peek-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .am-peek-title { font-size: 13px; font-weight: 600; margin-top: 1px; }
    .am-peek-sub { font-size: 12px; color: rgb(255 255 255 / .6); }
  `;
