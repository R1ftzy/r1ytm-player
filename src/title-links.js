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

